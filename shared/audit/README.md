# Central audit pilot

Shared Node.js audit support for SCADA and HMI. The SCADA service hosts the
collector; HMI and SCADA each maintain their own forwarding queue. No additional
package or Internet service is required. This first increment targets a small
closed-network pilot, with one collector and selected OPCBridge installations.

## Included

- Versioned event envelopes with stable UUID event IDs, event and receipt times,
  site/node/component identity, station context, actor attribution, action,
  target, result, and details.
- Durable local queues and collector files: synced data, atomic publication, and
  directory sync before acknowledgment. Retry/backoff, restart recovery, and
  central deduplication. Conflicting reuse of an event ID is rejected.
- Enrollment through per-node ingestion credentials bound to a site/node pair.
  These credentials cannot query audit records or modify OPCBridge users.
- Secret-key redaction and bounded event and batch sizes.
- SCADA Logs source **Central audit (all enrolled nodes)**, exact origin/user/
  action/result filters, text/time filters, CSV export, and receipt/attribution
  details. Viewing and collection status require `suite.view_logs`.
- Collector heartbeat and queue/capture-error reporting per node/component.

## Setup on the local SCADA network

The installer ships shared code at `/opt/opcbridge-suite/shared/audit` and a
secret-bearing config at `/etc/opcbridge/audit/config.json`. Both forwarding and
collection start disabled. Reinstalling preserves this config and credentials.
For a source checkout, copy `config.json.example` to a private config and set
`OPCBRIDGE_AUDIT_CONFIG` to its absolute path. The same config is used by HMI and
SCADA on a machine. Both services reload changes automatically; no restart is
needed for central settings.

1. On the central machine, open **Configure Server → Central server**, choose
   **Central server**, and enter a stable site and installation ID. Save. Its own
   HMI and SCADA events are enrolled automatically and use the local collector.
2. Add each remote installation to **Enrolled installations**. Enter its site
   and unique installation ID, generate a credential, copy it, and save. Existing
   credentials are never returned to the browser; blank fields preserve them.
   Generating a replacement revokes the old credential when saved.
3. On each remote installation choose **Connected to central server**. Enter
   the central name and SCADA URL (including its port when needed), the matching
   site/installation IDs and enrollment credential, and the central directory
   account/password. This account needs permission to export the user directory.
   Save: both user synchronization and audit forwarding use the same address.
4. Use **Connection health** to check user synchronization, SCADA/HMI delivery,
   queued records, and enrolled component heartbeats. Open central **Logs** and
   select **Central audit (all enrolled nodes)** to investigate events.
5. Use **Standalone** to restore the preserved local user directory and stop
   forwarding/collection. Queued records and central history are retained.
   Installation IDs cannot change while either component has queued events.

Changing these settings requires both `suite.manage_server` and
`auth.manage_users`. Reading settings/health requires `suite.manage_server`.
Connection settings have moved out of Users; that tab retains account management.
Existing file-based configurations are detected and become coupled when saved
through this section. Managed identity synchronization settings are stored in
`central.identity_sync` in the same private audit configuration, so both features
are saved together. Legacy `identity-sync.json` remains untouched and is ignored
for managed installations. The legacy identity-setting API cannot independently
change a managed connection.

HTTPS is the default. Terminate it at an internal reverse proxy in front of
SCADA and provision the local CA (`NODE_EXTRA_CA_CERTS` supports a PEM CA file).
The central server accepts its own loopback HTTP traffic; this also supports
HTTPS proxy termination on loopback. For a proxy on another host, set
`collector.trusted_proxy_addresses` to its source addresses and ensure it
replaces `X-Forwarded-Proto`. Clients cannot disable certificate validation.
For a deliberately unencrypted closed network, check **Allow HTTP** on both
installations and use an HTTP central URL. The UI does not provision certificates
or configure your reverse proxy.

Advanced queue paths, capacity, and collector storage paths remain in the
configuration file. The installer seeds them for the selected data root.

Keep the config service-owned and mode `0600`. The installer initializes the
local data directory; use service-writable paths if you change locations. A
custom `--data` path is reflected in newly seeded configurations when Node is
available; existing configurations are preserved. Back up the complete collector
store and node configuration through approved local procedures. Standard project backups
omit audit credentials unless secrets are explicitly included; the collector
event store is not part of those project backups. Do not copy a
running store and assume it is a consistent backup.

## Recorded sources and attribution

New events reaching the HMI's existing audit writer are forwarded, including
HMI tag-write outcomes, screen changes, and image actions already instrumented
there. Successful SCADA data-entry saves are forwarded separately. Existing
local audit records continue to be written. Local log pruning cannot remove
unacknowledged forwarding records because the queue is independent.

HMI tag writes use the local core’s `/write/interactive` endpoint, which requires
the existing write token and a valid user session with `opcbridge.write_tags`.
The core returns the checked actor for `authenticated` attribution; requests
without a checked actor are `unknown`. Other HMI screen/image audit usernames
remain `client_reported` (shown as **Unverified** in the central table). SCADA
successful data-entry actors are derived from the upstream authenticated user
and labeled `authenticated`, or `unknown` for allowed unauthenticated saves.
Station context currently uses the request's network address. The node ID is
stable, but browser station enrollment and stable touchscreen IDs are future
work. Through a proxy, network addresses may identify the proxy rather than
individual stations.

Tag-write success is the upstream request outcome, not proof that a device
physically executed the command. Before-values are existing client context,
not independently verified measurements.

## API and delivery behavior

- `GET/PUT /api/central-server`: shared role/connection/enrollment configuration.
  Responses omit all passwords and ingestion credentials.
- `POST /api/audit/ingest`: `Authorization: Bearer <node credential>`; JSON
  `{ "component": "hmi", "events": [...], "health": {...} }`. At most 50
  events and 2 MiB per request; events are at most 64 KiB. Returns
  `{ "ok": true, "accepted": ["event-id", ...] }` after durable storage.
  The sender retains any unacknowledged event. Empty batches update heartbeat.
- `GET /api/logs/query?source=central_audit`: existing SCADA authenticated query
  API. Supports `site`, `node_id`, `station_id`, `component`, `action`, `user`,
  `result`, `since_ms`, `until_ms`, `connection_id`, `tag`, `q`, and `limit`.
  Event details contain collector receipt time and attribution.
- `GET /api/audit/status` on SCADA: forwarding/collector status without secrets,
  including enrolled nodes that have never contacted the collector.
- Existing HMI `GET /api/audit/status` includes local forwarding status.

Default forwarding interval is 5 seconds, with failure backoff capped at
60 seconds. A heartbeat older than two minutes is labeled stale in the viewer.
Queue counts at the collector are sender snapshots at batch submission, not
live measurements. Querying updates the status display; it does not establish
that disconnected nodes have sent all events. Source clocks should use a local
SCADA time service. Event and receipt times are preserved separately.

Pending storage defaults to 64 MiB per component. A full queue retains existing
records, exposes capture failures, and rejects additional captures; it does not
delete unacknowledged events to make room. Collection/storage failures do not
repeat an already completed PLC or data-entry action. Capture-failure counters
persist when storage permits. Local disk failure can prevent new recording and
must be addressed operationally.

## Current limits and next increments

- Opt-in setup in Configure Server; storage paths and proxy trust remain advanced
  file settings. Browser touchscreen enrollment remains future work.
- New events only. No legacy-history import or promise of complete audit coverage.
  Core/API writes, login and user changes, alarm acknowledgment, and other
  server changes need separate instrumentation.
- Small-pilot event-file store; queries scan retained records. No indexed
  database, automatic central retention, capacity dashboard, tamper-evident
  signatures, durable per-source sequence, or redundant collector yet. Central
  records are never removed through this API. Plan retention/storage sizing
  before a long-running or high-volume deployment.
- Only one sender process per component queue and one collector per store.
  Use persistent local filesystems supporting hard links, atomic rename, and
  directory fsync. This implementation has been tested on Linux.
- The operation and its audit outcome are not committed together. A crash
  between them can leave an audit gap; correlated intent/outcome records and
  action-specific local-storage failure policy are later work.
- Event deduplication IDs must be retained with the central records. Deleting
  central data while a sender is retrying can reintroduce old records.
- Collector redundancy is separate from control-system witness/leadership.
  An audit outage does not authorize a standby promotion.

Upgrade the core before or together with HMI: an older core lacks
`/write/interactive`, so interactive writes are blocked with an update message.
There is no fallback that bypasses the session check. Existing token-only
clients continue using `/write`. The session check runs within the same local
write request and does not contact the central server.

Next: trusted attribution for other HMI actions and station enrollment, more audit producers,
then indexed storage with retention/backup and redundancy integration. See the
[coordination plan](../../docs/central_audit_and_installation_plan.md).

## Tests

```bash
node --test shared/audit/test/*.test.js
node --test opcbridge-scada/test/*.test.js
npm test --prefix opcbridge-hmi
```

Tests cover network outages, lost acknowledgments, sender/collector restart,
disk failure, full/corrupt queues, spoofed node identity, conflicting event IDs,
redaction, transport defaults, actual HMI/data-entry delivery, and query access.
All integration tests use temporary local storage and loopback HTTP test servers.

The core interactive-write fixture requires `g++` and compiles the actual route
handler with test session/driver implementations. HMI route tests cover session
expiry, denied permission, checked actor attribution, and older-core rejection.
