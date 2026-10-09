# Central audit and installation coordination plan

Status: agreed deployment scope with an initial opt-in implementation on
`feature/centralized-audit-log`. Full audit coverage and redundancy remain planned.

## Objective

Provide one place to investigate activity across OPCBridge installations,
remote stations, and touchscreens while preserving local operation during
network outages. Develop this alongside active/standby redundancy, using shared
node identities and health reporting.

## Agreed network scope

Assume a closed SCADA system. The central location is hosted on the local
SCADA network and is accessible from authorized computers on that network.
Remote installations means other installations or stations connected through
this internal network; public Internet access is not assumed.

- Central identity, audit storage, and the SCADA audit viewer run locally.
  No cloud service, external identity provider, or Internet connection is
  required for runtime operation.
- Nodes forward events to a configured internal hostname or address. Browsers
  access the central viewer through an internal SCADA URL.
- Provide local name resolution (or configured addresses), a local time source,
  and locally managed certificates/trust. Do not depend on public DNS, external
  time servers, or public certificate services being reachable.
- Keep authenticated node ingestion and authenticated user access within the
  closed network. Network membership alone does not establish actor identity
  or authorization.
- Backups and recovery copies remain on approved local storage. A central
  service or network outage leaves local control and audit buffering operational.
- Pilot acceptance includes operation with Internet access unavailable and
  recovery after internal network disconnection.

## Initial implementation

The first increment adds an authenticated collector to SCADA and durable
forwarding for new HMI audit events and successful SCADA data-entry saves.
SCADA Logs has a Central audit source with origin/action/user filters and
collection health. Forwarding and collection are disabled until configured.
See `shared/audit/README.md` for setup, APIs, tests, and current limitations.

The initial store uses synced event files for a small pilot. Indexed database
storage, retention/backups, station enrollment, attribution for other HMI actions,
additional audit producers, and redundant collector deployment are next steps.

## Existing foundation

- Central Directory mode synchronizes users into a local cache. Authentication
  continues from the last valid cache when the central system is unavailable.
  See `opcbridge/docs/manual.md`, Identity source modes.
- HMI records local events in `opcbridge-hmi/audit.jsonl`, including tag writes
  and their reported outcomes. SCADA proxies the HMI audit query/export APIs.
- Successful data-entry saves have a separate local JSONL audit in
  `/var/lib/opcbridge/data-entry/audit.jsonl`.
- SCADA Logs reads multiple configured sources, but is not a durable multi-node
  audit collector. Collecting existing records will not by itself fill gaps in
  event coverage or establish trustworthy actor attribution.
- `docs/feature_ideas.md` describes configuration distribution and active/standby
  redundancy, including stable node/cluster identities and write fencing.

## Proposed deployment model

Each installation records its own events durably and sends batches to a central
audit service on the local SCADA network. The central service stores accepted
records and provides search,
export, and station health to SCADA. One central-server selection in Configure Server will enable both central
user-directory synchronization and audit forwarding. They will not have
independent enable switches. Local cached authentication and durable audit
buffering preserve operation during a central-server outage. Configure Server now provides this shared configuration, three installation
roles, enrollment credentials, and connection health. Advanced storage and proxy
settings remain in the private configuration file.

A browser touchscreen served by a shared HMI server is a station attached to
that server, not automatically a separate OPCBridge node. A panel running its
own suite is a node. Record both the server handling an action and the station
that initiated it. Identify physical redundant nodes separately from their
shared logical control system.

## Event contract

Define a versioned envelope before implementing transports:

- Stable event ID, installation/site ID, physical node ID, logical system or
  cluster ID where applicable, and source component.
- Station ID and display name, authenticated actor ID/name, and actor type
  (user, service, or unauthenticated).
- Event time in UTC, central receipt time, and a persistent per-source sequence
  scoped by an explicit stream identity. Preserve sequence continuity across
  restarts or start a new stream explicitly.
- Action, target, outcome, request/correlation ID, and relevant change details.
- Configuration revision and redundancy role/leadership term where applicable.
- Optional before/after values only when actually known. Distinguish an accepted
  command from confirmed device execution; never infer an old value from stale
  client data without labeling its source.

Authenticate actors on the server. Existing HMI audit user/role headers are
client-supplied context and should not become authoritative actor identity.
Interactive HMI tag writes now check the existing local session and permission
in the core write request and use the returned actor. Token-only service clients
retain `/write`; HMI uses `/write/interactive`. No extra authentication request
or central availability dependency is introduced. Core must be upgraded before
or together with HMI. Preserve legacy records with their attribution limitations
clearly marked.
Exclude credentials, tokens, session cookies, and password hashes from events.
Use node credentials restricted to ingestion, rather than user-admin credentials.

## Reliable collection

1. Persist an event locally before treating it as ready for transmission.
2. Forward authenticated batches over encrypted connections; support bounded
   batches, retry backoff, and automatic recovery after disconnection.
3. Acknowledge only records committed durably at the collector. Retries are
   expected; event IDs provide deduplication rather than relying on clocks.
4. Retain unacknowledged events independently of ordinary local log pruning.
   Define disk limits, maximum supported outage duration, and overflow behavior.
5. Show pending count, oldest pending event, last successful delivery, storage
   pressure, and collection errors. Surface known gaps and legacy-history limits.
6. Retain local records for a defined period even after central delivery.

Do not make a successful remote upload a prerequisite for ordinary local control.
Choose local audit-storage failure policy explicitly per action class: a failed
upload and an inability to record locally are different failures. Audited
configuration changes can be blocked before execution when required; completed
PLC actions must not be repeated because their audit delivery failed. Correlate
intent and outcome records to show uncertain outcomes after crashes.

## Central experience

Extend SCADA Logs with an All Sites audit view and filters for site, node,
station, user, component, action, result, target, and time range. Show action
context and correlated events, export results, and display collection status.

Explain freshness: a disconnected node can have unreceived records. Present
source and receipt times separately and flag clock discrepancies. Central
records should be append-only through normal APIs, with restricted reading and
export, explicit retention/backup procedures, and audited administrative actions.
A single query endpoint is not evidence that the record set is complete.

## Redundancy relationship

Use the same node and cluster identity model for both efforts. Active and
standby nodes each forward their own records; lease changes, promotion,
demotion, fencing, synchronization failures, and rejected writes are audit
subjects. An ingestion acknowledgment must remain valid after collector
failover: replication durability and acknowledgment policy must be designed
together. Retrying against another collector must preserve event IDs.

The audit collector is not the control-system witness and does not grant write
authority. Losing audit connectivity must not promote a standby. Collector
redundancy and control-runtime redundancy are separately deployable milestones.

## Delivery phases and exit criteria

1. **Inventory and identity:** register sites, logical systems, physical nodes,
   and stations; inventory all action paths and existing logs. Exit when two
   installations and their touchscreens can be identified unambiguously.
2. **Central audit MVP:** durable forwarding of existing HMI and data-entry
   audit events, central ingestion/search/export, deduplication, and delivery
   health. Pilot one local central server and two internally connected
   installations with Internet access unavailable. Legacy import
   is explicit and limited to retained history. Exit when events survive sender
   and collector restarts and an agreed network outage without missing or
   duplicate central records.
3. **Complete audit coverage:** authenticated actor attribution; login/logout
   and failed login, user/permission changes, configuration save/apply/restore,
   alarm acknowledgments/shelving, direct API writes, HMI writes, data-entry
   changes, and automation/service actions. Inventory determines what is new
   instrumentation versus existing coverage. Exit when each action path has
   documented expected records and correlation/outcome behavior.
4. **Core redundancy:** advance the existing witness, lease, fencing, and
   active/standby plan using these identities; audit role transitions from the
   outset. Exit with partition, failover, reconnect, and single-owner tests.
5. **Central service resilience:** resilient audit storage/collector and central
   identity recovery, backup/restore, retention, capacity alarms, and operational
   procedures. Exit when collector failover preserves all acknowledged events
   and a restore can be demonstrated.

Phases 1–2 establish the shared foundation. Core redundancy remains a parallel
priority; it need not wait for complete audit coverage or collector redundancy.

## Decisions to make before implementation

- Which installations belong to this closed SCADA system, and how are their
  internal network segments connected? Start with one local collector serving
  the selected installations; retain site IDs for filtering and future growth.
- Which machines host central services, and which are full nodes versus browser
  stations? Decide how station enrollment and identity are maintained.
- Required outage buffer, local and central retention, event volume, and recovery
  objectives. These determine storage sizing and central database selection.
- Which roles can view which sites, and who can export audit records?
- Expected behavior when local audit storage is full or unavailable, and whether
  stronger tamper evidence is required beyond append-only application APIs.

First implementation scope should be central audit collection and a cross-site
viewer. Defer remote configuration publication, historian data centralization,
and shared control commands to their own designs.
