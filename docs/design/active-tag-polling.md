# Active-tag polling: implementation history

Current behavior: active polling defaults on for eligible connections and is selectable
in the Workspace connection editor. The dated sections below record earlier phases;
see the final per-connection configuration section for the current policy.

Branch: `feature/active-tag-polling`.

## What exists now

`GET /polling/demand` reports per-tag observed reasons and per-connection configured,
enabled, enabled-with-observed-demand, and enabled-without-observed-demand counts.
Use `?connection_id=B180` to limit output; `include_tags=0` returns summaries only.
Reading this endpoint creates no demand. It is diagnostic data, not a scheduler input.

Observers:

- OPC UA Value MonitoredItem registration/removal and effective monitoring-mode/interval
  changes, keyed by subscription/item IDs and stable tag NodeId. Disabled items remain
  counted but do not request polling; Sampling and Reporting items do. Publishing
  disabled on a subscription does not disable sampling.
- Explicit OPC UA Value Reads create a 30-second read-intent lease. MaxAge = 0 also
  records fresh-read intent; subscription sampling does not create these leases.
  Existing cached-value behavior is unchanged; fresh PLC reads are not enforced.
- Live WebSocket explicit subscriptions and all-tags subscriptions, including the
  existing default of all tags when a client has not supplied a subscription.
  Subscription replacement and disconnect immediately change the snapshot.
- Valid runtime tags returned by POST `/tags/query`, exact filtered GET `/tags`,
  and GET `/tags/<connection>/<tag>` receive a 30-second recent-read observation.
  This is an anonymous diagnostic lease, not an agreed client polling contract.
- Core internal enabled alarms, event logging, and scheduled periodic logging.
- Demand on an enabled derived tag propagates to its source, including chains;
  traversal terminates for cycles. Disabled tags do not propagate demand.

`observed_demand` is deliberately not named `active`: coverage and lifecycle
validation are incomplete, and observations do not yet control polling.
The endpoint always reports `coverage_complete=false` and
`safe_to_suspend_unobserved=false`. Do not interpret an unobserved tag as unused.
Disabled tags are counted separately from enabled tags, even when requested.

## Consumer audit

| Consumer | Current path | Work before demand may control polling |
| --- | --- | --- |
| OPC UA clients | Effective monitored-item modes/intervals, explicit reads, array/root demand and opt-in deferred read verification | Validate uncovered sources, transfer/expiry, node replacement and activation policy before gating |
| Workspace Live Tags | Explicit per-tab viewport lease; full index then visible-row query | Validate browser lifecycle and stale in-flight navigation responses before gating; index fetches are discovery, not demand |
| HMI | Explicit viewer registration accompanying current screen/popup/loaded viewport WS subscriptions; HTTP seeding | Finish nested viewport/dynamic expression coverage and browser testing before gating |
| Alarm service | Explicit owner registration plus WebSocket `subscribe` keys and targeted HTTP seeding | Validate service integration on a test installation; verify complete alarm inputs/conditions |
| Historian | Explicit owner registration from enabled recording rules; delivery uses existing all/list/pattern stream | Opt-in explicit demand separates delivery from polling intent; pattern refresh and WS endpoint changes need further work |
| Flow | Explicit HTTP leases for enabled deployed `opc_tag_input` nodes, plus targeted reads | Validate dynamic/indirect inputs and one-shot execution before gating; drafts and write-only nodes do not request reads |
| SCADA Automation/core logic | Literal reads across setup/loop/conditions plus captured executing configurations; conservative all-tags fallback for uncertain expressions | Validate actual reload during execution and demand/freshness before evaluation before gating |
| Logger live-tag jobs | Explicit HTTP leases for enabled job selections and captured running jobs, plus `/tags` snapshots | Before gating, synchronize one-shot jobs with demand/freshness; verify config churn during execution |
| Generated reports, historian-only logger fields, SQL checks/sync | Historian/database queries | No direct live PLC demand; recording rules are owned by historian |
| MQTT publish/subscribe | Flow MQTT nodes; enabled deployed OPC tag inputs already declare demand | Validate end-to-end publication dependencies and reconnect behavior before gating; incoming writes alone do not imply read demand |
| Core logging/alarms | In-process configuration | Already reported; verify config reload lifecycle and disabled dependencies |

A network connection or open browser alone does not identify the application that
owns a subscription. WebSocket observations report transport-level reasons, not
an invented distinction between alarms, historian, and UI.

## Next phases

1. Add explicit owner-based, renewable demand registration for background services
   and viewers; keep polling everything while comparing observations on `.45`.
2. Cover UA monitoring modes, read freshness, requested intervals, node replacement,
   and subscription transfer. Existing public callback alone does not provide all
   of this information; audit the bundled open62541 version before selecting hooks.
3. Define disabled source handling, dynamic scripts, stale cached value quality,
   HTTP lease expiry, grace periods, startup and reconnect behavior.
4. Only after coverage is demonstrated, add opt-in connection mode `active tags only`.
   Default remains all enabled tags. Preserve connection/handle reuse and existing
   cancellation/write gates. Test with identical TOP Server workloads separately.

## Validation

`test_tag_demand.cpp` checks reference counts, expiry/renewal, teardown, and concurrent
registration. `scripts/test-demand-observation.py` exercises a disposable running
server using asyncua and websockets, with a declared `_memory` connection and
three tags: Source (int32),
Derived (alias of Source), and Unused (int32). Use isolated ports/configuration;
never run the scenario against a production server. The test adds subscriptions.


The integration fixture was built from the production source with only its HTTP
listen address changed to `127.0.0.1:18080`, avoiding the installed server on 8080.
UA used port 14840 and WebSocket used 18090. The disposable connection used
`driver=ab_eip`, `gateway=127.0.0.1`, `plc_type=lgx`, `path=1,0`; all root values
were memory tags and the derived alias required no PLC traffic. No production
service, configuration, or polling was modified.

For the subsequent implementation, separate these decisions:

- Monitoring registration is not equivalent to active sampling. Tests deliberately
  set a registered item to Disabled and verify it remains classified as registered.
- OPC UA sampling intervals do not automatically change PLC scan rates today.
- Array element demand must resolve to the physical array/root handle, just as
  derived tags must resolve to their sources; the first diagnostic reports runtime
  tag definitions; generated array element monitors now propagate demand to their roots.
- Writes, alarm conditions, expressions, MQTT publishing and reconnect recovery
  must remain safe even when no screen is open.


## Explicit connected-consumer registrations

WebSocket messages now support independent demand registration:

```json
{"type":"register_demand","owner":"opcbridge-alarms","tags":["B180:Pressure"]}
{"type":"register_demand","owner":"opcbridge-historian","all_tags":true}
{"type":"release_demand","owner":"opcbridge-historian"}
```

A valid registration replaces that owner's previous scope on this connection.
An empty `tags` array is valid (no demand). Invalid replacements preserve the
previous scope. A release only removes the named owner on that connection.
Multiple connections using the same owner label retain independent registrations.
Disconnect/closed sockets remove their registrations. These are declarations,
not authenticated service identities. Old cores ignore these new message types.
They do not alter `subscribe`/`subscribe_all` delivery behavior.

`consumer_registrations` reports aggregate owner scopes; per-tag reasons include
`consumer:<owner>`. Alarm registrations are sent on initial connection, reconnect,
and the existing subscription-generation changes. Historian registrations include
all enabled rules, including periodic tags whose intervals exceed HTTP leases.
With no explicit rules, legacy snapshot settings determine all/list/pattern scope.
Disabling historian or all its rules registers an empty scope. Successful historian
config reloads refresh registration on its main loop; reconnect refreshes it too.
A config copy and generation are captured under the same lock. Stream subscription
selection is unchanged, so conservative WebSocket interest can still exceed the
explicit recording demand.

No disconnected-owner grace period, scheduler gating,
or requested scan-rate negotiation is enabled yet. Pattern matches currently
refresh on config reload/reconnect, not automatically on namespace changes. Existing
historian WebSocket endpoint changes still require restart to change its transport;
that preexisting behavior is outside this observation change.

Validation of the connected-consumer step:

- Built core, alarm service, and historian into temporary binaries.
- `test_consumer_demand.cpp` covers deduplication, replacement, invalid-message
  preservation, all-tags/empty scopes, owner release and connection isolation.
- Historian `src/test_demand.cpp` covers explicit rules versus broad transport,
  disabled rules/service, periodic inputs, and legacy all/list/pattern scopes.
- The isolated live protocol test additionally verifies two simultaneous connections
  with the same owner label, independent stream/demand scopes, release and reconnect.
- `scripts/test-service-demand.py` launches the actual alarm/historian binaries with
  disposable config and TimescaleDB. It verifies alarm reload and restart, historian
  rule replacement and disabling via reload, independent owners, and disconnect
  cleanup. The fixture clears inherited alarm service credentials so local test
  rules cannot be overridden by a core configuration fetch.

Next: extend explicit registrations to viewers and core dynamic dependencies. Keep conservative transport interest and the
incomplete-coverage flags until all required consumers have been audited. No service
versions have been bumped and no installed services have been modified.


## HTTP background consumers: Flow and logger

The core now accepts observation registrations on the existing HTTP endpoint:

```json
POST /polling/demand/register
{"client_id":"unique-process-instance","owner":"opcbridge-logger",
 "all_tags":false,"tags":["B180:Pressure"],
 "patterns":[{"connection_id":"B180","name":"Pump?.*"}]}
```

The response reports `lease_ms=60000`. Renewing replaces that instance/owner's
scope and extends its lifetime by 60 seconds. POST `/polling/demand/release` with
`client_id` and `owner` releases only that registration. Invalid replacements leave
previous demand intact. Another instance using the same owner label is independent.
Expired leases are pruned on observation/registration. These declarations are
observational labels, not authenticated service identity or authority to poll/write.

Flow and logger share a libcurl heartbeat client (no new library dependency).
It snapshots desired scopes once per second and renews every ten seconds, on a
separate thread so a slow job cannot block renewal. Removed/reconfigured endpoints
are released, as are known scopes on orderly shutdown. Abrupt termination or failed
release leaves at most the remaining lease lifetime; a restarted core receives the
next renewal. Failed posts retry on the renewal cadence. Provider/request failures
and successful requests are exposed under service health `demand_observation`.
Old cores may reject the registration; existing execution and polling are unchanged.

Flow registers read inputs from **enabled deployed** flows. Merely editing a draft
has no effect; deploy/disable updates the next observation. A tag input scheduled
once every ten minutes therefore remains declared between its actual HTTP reads.
Write nodes alone do not introduce read demand.

Logger registers live selections from enabled log jobs independently of their next
run time. Exact keys are translated from logger's internal separator to wire keys.
Wildcard selection uses the same `*` and `?` semantics and exact connection IDs as
logger, and is evaluated against current runtime definitions in the core. ALL jobs
register all tags. Jobs target their database's OPCBridge URL override when supplied,
otherwise the service default URL. Requests for different cores remain separate.
A captured running-job scope retains its original endpoint/selection while config
changes; disabled idle jobs are omitted. Duplicate selectors are normalized before
renewal. Historian-only fields, SQL checks, database sync/backfill and generated
reports query stored data and add no direct live PLC demand.

Before enabling scheduler gating, short manual executions must synchronously
establish demand and fresh data; a once-per-second observer is not that guarantee.
Also validate more complex config churn/parallel job lifecycle and all existing
incomplete-coverage cases. No tags are suspended by this implementation.

Validation: lease unit tests cover renewal/expiry, replacement, invalid updates,
independent instances, wildcard and all-tag selectors. Live core tests cover HTTP
registration/release and invalid replacements alongside UA/WS observations.
`test-flow-logger-demand.py` uses disposable services and an HTTP collector for a
second endpoint; no real database writes or PLC traffic are required. It checks a
ten-minute Flow input past the 30-second recent-read expiry, draft/deploy/disable,
logger exact/wildcard/ALL selections, disabled and historical-only jobs, config
reload and remote endpoint override/release. Logger's direct scope test is included
in its `make test` target, alongside existing column-mapping regression coverage.


## Automations are background consumers

SCADA's Automation tab uses the core `logic.json` script/block scheduler. It runs
independently of connected screens and OPC UA subscriptions. Scripts have periodic
execution intervals; blocks have retained setup state and loop code. `tag()` and
`quality()` can read PLC values in setup, conditions or branch bodies. `hasTag()`
checks existence, and write helpers alone are not evidence of a read dependency.
HMI object animations/visual automation bindings remain part of the viewer audit.

The demand endpoint reports an `automation` section listing enabled automation
IDs, names, kind and engine, plus literal `read_tags`. A restricted lexical analyzer
collects literal `tag()` and `quality()` calls across every configured branch,
setup and loop, without executing them or depending on the last run. Comments and
ordinary strings are tokenized, so code-like text inside them does not add demand.
Literal `hasTag()` calls check namespace existence only. Literal `setTag()` targets
are write-only, but reads nested in their value expressions still count. System
values are generated internally and do not add PLC tag demand.

Known literal reads register an explicit `consumer:opcbridge-automation` tag scope.
All enabled scripts contribute their union; script/block metadata identifies each
item's inputs. Disabled items are omitted. Setup dependencies remain declared after
setup has run, and untaken branches remain represented. Missing literal targets are
retained in declarations, so they can match if added to the namespace later.

Any unresolved item retains an all-tags scope for the engine, with the reason shown
on that item. Dynamic or escaped tag arguments, indirect helpers, member/index
access, templates, regex/division syntax, unknown calls, unsupported engines/kinds,
and malformed comments/strings/delimiters remain conservative. This is not a full
JavaScript parser and does not claim to prove arbitrary JavaScript. It applies to
the current restricted core helper language and whitelisted pure functions only.
The analysis runs on a config copy outside the logic mutex, then observations are
matched under the driver lock. It never reads or writes a PLC value.

Executing scripts now retain captured dependency configurations across reloads. Before gating polls,
and refine remaining conservative cases only with corresponding proofs/tests.
Tests cover disabled/enabled scripts and blocks, exact literal dependencies,
comments/string false positives, write-only and metadata/system references, nested
reads, unresolved/unsupported code, setup and conditional inputs, unrelated-tag
exclusion, persistence between runs, and release after config reload.
`test-automation-demand.py` starts its own disposable memory-only core fixture using
the test binary bound to localhost:18080. Production services are untouched.


## SCADA/HMI viewer observations

SCADA Live Tags now owns a distinct random client ID for each browser tab. Its
viewport lease includes displayed rows, excluding disabled tags, browser-local
session rows and generated system tags. Rendering and viewport reset update/release
the scope; an independent one-second tick renews at ten-second intervals. The proxy
allows only the three explicit demand routes. Registrations do not require a config
write token and do not change server polling. Index/catalog browsing adds no demand.

Requests are serialized so an older registration cannot finish after a queued
release and overwrite it. Posts use the existing five-second fetch timeout. Failures
are swallowed for compatibility with older cores and retried by the timer. Hidden
pages and non-Workspace tabs release demand; hidden Workspace pages skip value
queries as well. Closing/pagehide uses best-effort keepalive release; abrupt loss or
page suspension is bounded by the core's 60-second lease expiry. Restore/pageshow
repopulates the last viewport and normal reads refresh it. Release is best effort,
not a guarantee that no temporary demand remains after a browser disappears.

HMI uses its existing screen subscription collector, including resolved aliases,
loaded viewport targets and the current popup. Each subscription update also sends
an independent `opcbridge-hmi-viewer` demand registration, excluding generated system
clock tags from PLC demand while retaining clock subscriptions. Hidden documents
send empty demand and empty stream subscriptions; they also skip HTTP value seeds.
A visibility-prefixed fingerprint ensures a newly connected hidden or empty screen
sends an explicit empty subscription rather than remaining on the server's default
subscribe-all scope. Visibility restoration/pageshow refreshes subscriptions and value
seeding. WebSocket closure removes that viewer's registration without releasing other
clients' interests.

This does not claim complete HMI dependency coverage: nested/indirect viewports,
dynamic expressions and unresolved bindings still need review before gating. Other
legacy HTTP reads remain conservative/incomplete. Navigation races must also be
validated in a browser with realistic server latency. All polling remains enabled.

Node tests cover SCADA viewport replacement/renewal, independent tab IDs, hidden and
restored viewers, in-flight registration followed by release, old-core failures,
helper script order/proxy route allowlisting and hidden-read suppression. HMI tests
cover explicit demand versus system clock subscriptions, hidden reconnects and
value-seed suppression. Relevant existing Workspace tests also pass. These are
logic-level tests; a full browser/multi-client exercise on `.45` is still pending.

## UA observer hooks and MQTT audit (2026-11-01)

The bundled open62541 C/header pair has optional OPCBridge observation callbacks
for monitored-item state changes and explicit Read service operations. Callbacks
only update the demand registry; they do not acquire the driver lock or re-enter
UA. Both files and every consumer must be rebuilt together because UA_ServerConfig
layout changes. Preserve or port these local hooks when upgrading open62541.

Diagnostics report total and active monitored-item counts and the minimum observed
explicit sampling interval. The interval is diagnostic only; it does not change
PLC scan rates. Explicit reads and fresh-read requests are separate finite leases.

Validation: registry unit tests and a real asyncua/WebSocket client against an
isolated memory-tag server passed. Cases include duplicate subscriptions, Disabled/
Sampling transitions, interval modification, publishing disabled, removal/session
cleanup, derived sources, explicit cached/fresh reads, non-Value reads, HTTP leases
and WebSocket owner lifecycle. Core and alarm-service builds passed with the
modified bundled library. Transfer, abrupt session expiry, array nodes and actual
fresh PLC reads remain to be validated or implemented before gating.

The legacy core MQTT publisher is not started by the current CLI; its configuration
must not create phantom demand. Current MQTT publications use Flow, whose enabled
deployed OPC tag inputs already register independently of broker connectivity.
No retired publisher was re-enabled. An end-to-end MQTT broker outage/reconnect test
remains outstanding.

## Separate WebSocket delivery from demand (2026-11-01)

SCADA's core WebSocket is used for `opcua_trust_changed` notifications, not Live
Tags values. On every open it sends `subscribe` with an empty tag list. Non-tag
events still arrive; Live Tags continues viewport HTTP queries and per-tab demand.

A successful WebSocket `register_demand` may include `demand_mode: "explicit"`.
This opts that connection out of inferred subscription demand without changing
which updates it receives. All owners on that connection remain accounted for.
`demand_mode: "subscription"` restores legacy inference. Invalid modes or invalid
registrations preserve the previous mode and scope. Releasing an owner leaves
explicit mode in effect; disconnect clears both, and reconnect defaults to legacy
subscription inference until the client registers again. Older clients and cores
retain their existing behavior. HTTP lease registrations do not set socket modes.

Historian sends explicit mode with its recording-rule registration. Its broad
delivery stream no longer pins unrelated PLC tags; enabled legacy all-snapshot
configurations still explicitly request all tags. Disabled recording rules request
no tags. Polling itself remains unchanged.

Validation: browser tests cover empty subscriptions on open/reconnect and continued
trust notifications. Real WebSocket clients against the disposable core cover
explicit-mode accounting, invalid registration preservation, release, restore and
reconnect behavior. A separate disposable transport fixture confirms explicit-mode
clients still receive broad tag updates, while empty tag subscriptions suppress
values and continue receiving trust events. Historian scope tests cover explicit
mode with recording rules and legacy all-snapshot configuration.

## Automation execution lifetime (2026-11-01)

The automation runner retains an immutable copy of the configuration it is about
to execute while holding the logic configuration mutex. Demand snapshots copy both
configured and currently executing versions under that same mutex, then analyze
the union outside it. Reload or disable therefore cannot erase the dependencies
of a version that is still running. Scripts disabled before capture are skipped.
The execution pin is released by scope exit, including early return/continue or
exception unwinding. Dynamic executing sources keep the all-tags fallback.

`automation.executing_automations` reports captured running versions separately
from `enabled_automations`. Both contribute to `tags`, `all_tags_required` and
coverage. Identical configured/running reads are deduplicated in the union.

`test_execution_demand.cpp` verifies overlapping versions, disable/replacement,
normal and exception cleanup, conservative dynamic dependencies, and concurrent
retain/snapshot activity. Existing automation analyzer tests and core compile
validation are also run. This is still observation only and has not been installed.
Before scheduling can use these observations, execution must establish demand
before collecting input snapshots and check freshness; retaining an executing
configuration does not make previously cached values fresh. End-to-end reload
execution and stale-result ownership remain separate lifecycle checks.

## Explicit fresh-read prerequisite (2026-11-01)

`POST /polling/fresh-read` is an opt-in, bounded verification path. Existing HTTP,
UA and background consumer reads are unchanged; active-only scheduling is still
disabled. It supports configured, enabled physical `ab_eip` scalar tags and generated
array elements and supported poll-derived aliases/bits. Memory-backed, whole-array and remote-UA inputs return
`unsupported_source`; disabled
and missing definitions return `disabled` and `not_found`. Unsupported cases never
silently fall back to cached GOOD values.

Example body:

```json
{"tags":[{"connection_id":"PLC","name":"ScalarA"}],"max_age_ms":0,"timeout_ms":1000}
```

Requests accept 1..64 references, integer max_age_ms 0..60000 (default zero), and
integer timeout_ms 0..5000 (default 1000). Successful transport returns HTTP 200;
`ok` is true only when every requested row is verified fresh. Each row has `fresh`
and `reason`; only fresh rows include a `sample` in the existing tag-row format.
Invalid request syntax/ranges return 400. Timeout rows include no stale sample.

Actual libplctag reads stamp their monotonic start/completion times on published
scalar snapshots, including the existing asynchronous Logix batching path. Each
loaded driver has a distinct evidence epoch; snapshots from a replaced driver
cannot satisfy requests against its replacement, even if cached rows survive. Cache
wall-clock timestamps, unchanged values and writes cannot create a new read stamp.
Zero max-age requires a read started at or after request arrival. A read already
in progress at arrival cannot satisfy that requirement merely by finishing later.
Positive max-age accepts a GOOD physical sample completed within that age budget.
Bad current quality fails even if an older successful read was recent. Read evidence
is copied with the returned sample while holding the driver mutex.

The request declares a 30-second HTTP demand lease for each supported input before
waiting for normal polling. Waiting releases the driver mutex; it checks at most
every 20 ms and uses the bounded request deadline. It does not initiate concurrent
PLC reads, change scan schedules, create new connections, or suspend any tags.
Full consumer integration and wake-up scheduling remain pending. In particular,
this endpoint does not yet change OPC UA MaxAge behavior or automation evaluation.

Validation uses `test_read_freshness.cpp` for deterministic timing boundaries,
including old, in-flight, bad-quality, mismatched-driver-epoch and invalid stamps, and
`scripts/test-fresh-read.py` with a disposable core on HTTP 18080 and libplctag's
ControlLogix simulator on port 14418. The simulator test covers batched/unbatched
polling, accepted cache age, zero-age/no-wait failure, invalid requests, unsupported
inputs, and outage timeout without stale samples. The installed system is untouched.

## Flow freshness consumer (2026-11-01)

Flow `opc_tag_input` configurations may opt in with `require_fresh_read: true`.
The optional integer fields `fresh_max_age_ms` (default zero, max 60000) and
`fresh_timeout_ms` (default 1000, max 5000) map to the verified core read endpoint.
Unchanged node definitions still use the existing cached GET path. No UI or
installed configuration is changed automatically during this development stage.

Verified mode rejects HTTP errors (including an older core's 404), timeout or
unsupported results, absent verification, mismatched sample identity, BAD quality
and null values. These failures set the input node error and emit no event. There
is no fallback to an unverified cached sample. Existing initial-value/change-only
behavior is preserved for successful verified inputs.

Each queued poll captures a per-Flow deployment epoch and retains its input
configuration. Explicit background demand includes both deployed and captured
input references until those polls finish. Successful or failed HTTP responses
from replaced/disabled deployments cannot update the new input's runtime. Events
emitted from tag inputs carry their epoch downstream, including delayed/rate/
trigger paths, and are discarded if a deployment changes before processing. This
does not retroactively cancel an output operation already executing when a deploy
occurs; broader one-shot execution/freshness contracts remain pending.

The real Flow binary is tested against a disposable HTTP source using
`scripts/test-flow-freshness.py`, including success, failed verification without
fallback, response identity/quality/null validation, redeploy/disable during a
pending request and legacy cached behavior. Existing Flow/logger demand tests
remain relevant for long-interval registration. Polling stays unchanged.

The end-to-end simulator test also accepts `--flow-binary`: it starts the real
Flow process against the disposable core, confirms one verified input event, then
stops the simulated PLC and verifies the redeployed input reports an error with
zero emitted events. This complements controlled-response tests with actual
libplctag polling. Verification applies at input acquisition; it does not redefine
Flow's existing cached combine values or intentionally delayed event semantics.

## Logger freshness consumer (2026-11-01)

Logger live jobs may opt in with `require_fresh_read: true`, using integer
`fresh_max_age_ms` (default zero, max 60000) and `fresh_timeout_ms` (default 1000,
max 5000). Existing cached jobs and historian-only jobs retain their behavior.
Captured running jobs already retain their demand and database/service endpoint
configuration across reloads; verification uses that same captured configuration.

Exact selections are always requested, including references absent from discovery.
Patterns/all resolve discovery rows to exact identities; discovery values are never
used as verified samples. The deduplicated selection is verified in batches of at
most 64, all before opening a database connection. Every batch must return complete,
unique, matching identities with verified, non-null GOOD samples and valid timestamps.
A failure clears the entire collected set; no fallback or partial verified-input
insertion occurs. This guarantees acquisition verification, not simultaneous reads
across batches or SQL transactionality. Original sample timestamps are retained.

`test/freshness.cpp` and `scripts/test-logger-freshness.py` test exact/colon-containing
names, wildcard/all selection, multiple batches, late-batch failure, response
identity/completeness/quality/timestamp validation, old-core failures, option ranges,
endpoint overrides and the real service's ordering before database connection.
The fixture uses an unreachable database port, so no live database is required or
written. Existing demand and column-mapping unit tests are also run. `make test-freshness` reproduces the HTTP fixture test on ports 18182/18195. Nothing is
installed or enabled automatically; active-only scheduling remains disabled.

## Array element demand and freshness (2026-11-01)

Generated runtime elements now retain an explicit `poll_source` naming their array
root. This is set when the loader generates those elements, not inferred by parsing
brackets in arbitrary tag names. Independently configured tags such as `Array[01]`
therefore retain their own handle and demand behavior.

Demand propagates from an element to its root with reason `array_source:<element>`.
Aliases referring to an element propagate through both edges. The existing visited
set still terminates cycles, and disabled dependencies are not traversed for further
polling demand. Diagnostics expose each generated element's `poll_source`; other
rows report null. Read observation still does not gate polling.

Fresh scalar reads now also support generated physical Allen-Bradley array elements.
The element snapshot carries the monotonic read stamp and driver epoch of the actual
root read. Requests verify the element's GOOD quality and timing, and check that its
root remains available/enabled. A failed array read cannot return an older GOOD
sample. Whole-array roots, derived aliases and memory/remote sources remain unsupported
by this experimental scalar verification endpoint. Flow and Logger use the same
endpoint without needing another consumer-specific array path.

Generated elements also qualify for UA variable creation and incremental sync despite
having no individual PLC handle. Previously those namespace paths skipped them as
invalid handles. Their namespace identity uses the existing escaped stable NodeId;
no new per-element PLC connections or reads are introduced.

The disposable simulator fixture covers element/root demand registration/release,
alias-to-element dependency chains, an independent bracketed tag, verified array
element samples, whole-root rejection and outage behavior in both polling modes.
`--ua-array` additionally uses asyncua to validate element subscriptions, Disabled/
Sampling changes and removal against root demand. The Flow integration test can run
alongside it. No installed service or configuration is changed.

## Derived sample freshness (2026-11-01)

The existing physical-poll alias and bit transformations now preserve the source's
monotonic read stamp and driver epoch, including the array-element transformation
paths. Scaling and inversion continue to run in the existing poll pipeline. Cached
reads do not recompute values or manufacture read evidence.

Before waiting, the verified endpoint traverses the requested input's configured
dependency path and declares demand for every validated reference. It requires
enabled definitions in the same connection, rejects missing/disabled dependencies
(`source_unavailable`), cycles (`source_cycle`), paths exceeding 64 nodes
(`dependency_too_deep`), and unsupported physical backing sources. Whole-array roots
are accepted only as backing handles of generated scalar elements, not as scalar
samples themselves. An accepted response must still contain a GOOD target snapshot
with qualifying physical-read evidence from the current driver instance.

This extends verification to direct aliases, scaled aliases, and bits derived from
physical scalars or generated array elements. It does not add recursive evaluation
to the existing transformation engine. A longer derived chain that the engine has
not actually produced cannot pass verification and times out without a sample.
Memory-backed values remain outside the physical freshness contract. Native UA
Read freshness enforcement is still pending; observing MaxAge intent is separate
from this opt-in HTTP path.

The disposable simulator verifies actual transformed values, array-derived inputs,
missing/disabled/memory sources, cycles, and rejection of formerly GOOD derived
samples after PLC failure. Both batched and ordinary polling are exercised. Flow's
end-to-end fixture now uses a verified scaled alias and confirms no event after a
PLC outage. Clients already using the verification endpoint need no separate
alias/bit read implementation. No installed services or polling schedules change.

## Native OPC UA deferred verification (2026-11-01)

The core supports experimental native read verification when started with
`OPCBRIDGE_UA_VERIFY_READS=1`. It is off by default and has not been enabled in the
installed service. `/health` reports `capabilities.opcua_verified_reads`. This does
not enable active-only polling, change subscriptions, or change PLC scan schedules.

Explicit tag Value Reads are deferred through the bundled open62541 async response
manager. Each operation has a unique token. The main loop checks its input using
the same dependency/freshness checker as HTTP, outside the UA service lock, without
waiting for the PLC inside a UA callback. It completes a verified scalar value or
an explicit error using a one-second verification deadline. Normal server/system
nodes retain their native source. Direct memory values are authoritative local
state and can be returned without PLC evidence; memory-backed derived values and
unsupported physical backends fail explicitly in this opt-in mode.

MaxAge zero requires a physical read started after the operation was queued.
Positive MaxAge accepts a qualifying current-driver sample within that age. The
shared checker compares double age budgets without overflowing chrono conversions,
including very large finite UA MaxAge values. Source/server timestamp selection is
preserved. Unsupported index ranges/data encodings fail explicitly. Missing nodes
retain normal UA errors; disabled/missing dependencies return BadOutOfService,
unsupported/cyclic sources return BadNotSupported, and unmet verification returns
BadTimeout with no stale value. A limit of 128 pending operations returns
BadTooManyOperations for excess operations while allowing valid siblings to finish.

The local library patch copies completion data only after checking the operation
is still live and its token matches, while holding the server lock. The application
never dereferences an outstanding output pointer. Cancellation removes the queued
request. Late completions cannot overwrite a newer operation at a reused address.
Shutdown clears queued requests after the library cancels its async operations.
Rebuild the bundled C file and every C++ caller together when installing these
changes; both the core and alarm-service builds are checked.

Validation:

- `test_ua_async_read.cpp` uses a real UA server/client to reject wrong, expired and
  duplicate completion tokens while allowing the correct token to complete.
- `scripts/test-fresh-read.py --native-ua` exercises physical/array/derived/local
  memory values, MaxAge, all timestamp selections, non-Value reads, explicit source
  errors, queue saturation/recovery, outage timeout, responsive browsing while a
  read is pending, disconnect cancellation and reconnect.
- Batched and ordinary polling, default mode, existing HTTP verification and Flow
  integration are regression checked against disposable fixtures.

Subscription sampling still uses the existing cached update path; it is not
misclassified as an explicit client read or made to request a new read for every
sample. Freshness/quality behavior for suspended subscriptions, startup/wake-up,
unsupported backends, automation acquisition and production activation still need
validation before any tag suspension can be enabled.

## Automation reload ownership (2026-11-01)

Each automation scheduler pass now captures the logic configuration revision.
Every configuration replacement advances that revision, including removal of
`logic.json` and the loader's existing invalid-configuration replacement path.
Before starting another due item and before saving an execution's diagnostics or
retained variables, the scheduler checks that its captured revision still owns
the configuration. A reload ends the old pass; the next pass schedules the current
configuration. This prevents an old run from overwriting a reordered, edited or
disabled automation's state merely because it occupies the same vector slot.

The exact executing configuration remains demand-pinned until the old execution
returns. This change does not cancel writes already executing or queued, and does
not provide an atomic transaction across automation outputs and configuration
reloads. Input acquisition freshness and startup/wake quality remain separate work.
Polling schedules and the installed services remain unchanged.

`test_automation_reload.cpp` exercises the actual scheduler and loader with an
in-process write callback instead of PLC I/O. It reloads during execution and
checks reorder, edit, disable, file removal and malformed configuration cases:
old results are discarded, remaining old due items do not execute, and captured
demand survives until the run exits. A normal two-item pass still saves its results.

## Automation verified input acquisition (2026-11-01)

Individual scripts and blocks can opt in through `logic.json`:

```json
{"require_fresh_read": true, "fresh_max_age_ms": 0, "fresh_timeout_ms": 1000}
```

Defaults preserve cached evaluation. Age accepts integer 0–60000 ms and timeout
accepts integer 0–5000 ms. The config-save validator and runtime loader use the
same validation. There are no new UI controls or installed configuration changes.

After capturing and demand-pinning the executable configuration, a verified run
collects all literal reads from the script or both block phases, including untaken
branches and retained setup code. It checks the complete set against current driver
instances and the shared physical-read evidence. Zero age requires a read started
after acquisition began; a positive age permits sufficiently recent physical
samples. Direct memory is authoritative local state, and system values use the
scheduler's separately collected process snapshot. Memory-backed derived values,
unsupported drivers, incomplete/dynamic dependency analysis, missing or disabled
inputs fail explicitly. Verification requires GOOD inputs even for `quality()`;
leave this option off for logic deliberately handling bad-quality values.

Every attempt copies the entire successful input set under one driver lock. The
execution evaluates these copies, never the scheduler's older tag cache. Failure
runs neither setup nor loop nor writes, records the ordinary execution error, and
keeps previous retained variables. Waiting releases runtime locks between checks;
it uses normal polling and does not force extra PLC reads. The execution demand
pin remains alive throughout acquisition and evaluation. A configuration revision
change cancels acquisition and prevents the obsolete run from evaluating outputs.

The scheduler remains serial: an opted-in run can delay other automations up to
its configured timeout, and different inputs are not a simultaneous PLC snapshot.
This is experimental opt-in behavior, not the final active-only scheduler policy.
Startup/wake handling and subscription quality still precede any polling suspension.

Validation uses `test_automation_freshness.cpp` against the actual scheduler with
synthetic physical completions: cached versus verified values, zero-age waiting,
positive age, bad/disabled/missing inputs, dynamic dependencies, partial-set
rejection, driver replacement, direct memory, setup suppression, reload during a
wait, and configuration bounds. `scripts/test-fresh-read.py --automation` also
runs the real scheduler against the libplctag simulator, verifies a scaled alias
before writing memory, and checks that a PLC outage prevents output evaluation.

## UA startup/reload quality and wake boundary (2026-11-01)

Live UA update messages now carry complete snapshots rather than bare values.
The main thread writes DataValues with quality and physical source timestamps,
using owned typed variants. Poll failures propagate to UA for scalars, generated
array elements and derived values instead of leaving the last successful value
marked GOOD indefinitely. Bad communication values contain no payload; the server
adds its normal read timestamps when returning an empty value.

New and incrementally refreshed nodes start BadWaitingForInitialData (direct memory
starts with its authoritative initial value; disabled nodes are out of service).
For Allen-Bradley physical inputs, each binding has a `PollReadGate` tied to its
driver epoch and a monotonic read-start boundary. A cached or in-flight completion
from before startup/reload cannot turn the node GOOD. A successful current-driver
read started after the boundary can. Failure produces BadNoCommunication.

The same gate supports suspension (BadOutOfService) and resume (new boundary,
BadWaitingForInitialData until a qualifying read). Those transitions are exercised
against actual UA node DataValues in `test_ua_poll_quality.cpp`; the scheduler does
not call suspension/resume yet and no tag polling is skipped. Repeated demand while
already active does not reset the boundary. Unsupported physical drivers retain
normal successful-read quality without making a claim about verified poll evidence.

`test-fresh-read.py --ua-quality --ua-array --automation` tests the cached UA
subscription path with explicit read verification disabled: scalar/alias/array
monitoring, PLC outage, recovery, another live outage and recovery, null bad values,
and source/server timestamps. Native verified reads and automation acquisition are
regression checked separately. open62541 may represent an empty attribute read as
`hasValue=true` with a Null Variant; tests check the actual payload as well as status.

This change is limited to the UA publication path. Before activating suspension,
the coordinator still needs to update HTTP/WS cache quality, propagate lifecycle
transitions to bindings, and account for UA client write acknowledgements (which
currently use the library's normal write path). A write acknowledgement must not
be treated as proof of a post-wake physical read. No installed services changed.

## Shared cache lifecycle and scheduler publication (2026-11-01)

The shared snapshot now distinguishes active, waiting and inactive cache states;
failed active reads serialize as `polling_state: "error"`. Existing quality remains
0/1. HTTP tag listings/query samples and WebSocket tag updates expose
`polling_state`; waiting/inactive rows carry an explanatory reason, and non-GOOD
payloads are null. Quality/state-only changes now trigger WS updates even when the
numeric value is unchanged. Value-change event logging retains its existing
comparison semantics.

Starting/restarting Allen-Bradley pollers invalidates the selected connection's
physical cache entries (including aliases and generated array elements) under the
runtime lock, using a driver-owned monotonic gate. It publishes transition messages
after releasing that lock. Existing memory and unsupported driver behavior stays
outside this physical lifecycle policy. Invalidation retains an existing source
timestamp instead of presenting the transition time as a new measurement.

Every scalar/array/derived poll commit applies the current driver-owned gate before
cache assignment and downstream publication. The poller resolves the driver by
connection ID under the lock: targeted removal can move other vector entries, so a
captured vector index would not be stable. Existing generation/stop checks still
reject obsolete pollers. Transition messages preserve waiting/inactive status in UA
as well as HTTP/WS. A new driver's or resumed tag's old in-flight completion cannot
restore GOOD.

`transition_poll_cache` provides suspend/resume with idempotent active renewals.
The runtime scheduler currently uses only restart transitions; no demand-driven
suspension or scan skipping is enabled. Before activating it, the coordinator must
connect consumer-demand decisions to both scan selection (including batch prefetch)
and lifecycle publication, and account for writes. Observation coverage flags remain
false. No installed services or configuration were changed.

Validation: `test_poll_cache_lifecycle.cpp` checks retained timestamps, startup,
suspension, repeated active demand, resume, pre-resume completions, epoch mismatch,
quality/state-only updates, and restoration by a current physical read.
`test-cache-lifecycle.py` checks real HTTP/WS scalar, alias and array quality
transitions through a simulator outage and recovery with unchanged numeric values.

Array roots remain transport/metadata nodes without a synthetic scalar cache row;
only their generated elements receive lifecycle cache entries. The wire fixture
checks this to avoid introducing a root that waits forever for a scalar sample.

## Shared runtime demand and scheduler preview (2026-11-01)

Demand collection is now a common function used by diagnostics and the runtime.
The main loop refreshes a scheduler preview once per second independently of HTTP
requests. Consumer/automation observation locks are released before acquiring the
runtime lock. The shared snapshot continues propagating alias/element demand to
physical roots and includes driver epoch and actual poll-work metadata; the
planner does not infer physical requests from logical tag counts or name syntax.

`GET /polling/demand` includes `scheduler_preview`, optionally filtered by
connection and honoring `include_tags=0`. The preview covers enabled physical read
work, with 30-second startup grace and 10-second idle grace. Returning demand
identifies a wake request; driver epoch replacement restarts grace. Writable tags
remain polled, and unsupported drivers remain polled. Removed work is pruned.
Snapshots older than 2.5 seconds fail open in the preview. No HTTP request is needed
to advance the preview, and viewing it creates no demand.

This is planning only: `reads_skipped` is zero and `polling_unchanged` is true.
Neither the heap nor Logix prefetch consumes these decisions yet. The existing
coverage/safe-to-suspend flags remain false. Writable-tag protection is conservative
planning behavior, not completion of write/readback lifecycle coverage.

`test_demand_scheduler_preview.cpp` uses a controlled clock for startup/idle grace,
returning demand, writable/unsupported protection, stale fail-open, epoch change,
removal/re-addition and filtered/summary output. The disposable simulator fixture
`test-cache-lifecycle.py --scheduler-preview` waits through real startup grace
without reading demand diagnostics, confirms idle candidates while read counters
continue increasing, and verifies that explicit alias demand changes the physical
source plan without activating polling suspension.

## Controlled scan/prefetch activation (2026-11-01)

An experimental process-start allowlist enables demand-driven scan selection:

```sh
OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS='["PLC"]'
```

It defaults off. The value must be a JSON array of exact, nonempty connection IDs;
invalid input enables no connections. No installer, service environment, installed
configuration or version was changed. This is a controlled test path, not a general
production activation or a claim that consumer coverage is complete.

Only selected Allen-Bradley connections without any writable tags are eligible.
MQTT operation disables this test path. An entire connection containing a writable
tag continues polling, including read-only siblings; this avoids treating a write
acknowledgement as physical read evidence. Unsupported/unselected connections also
continue normally. Diagnostics report each configured connection's eligibility.

Eligible pollers consult the shared demand plan before selecting a read and before
including other due work in Logix batch prefetch. Stale/uninitialized plans, missing
work and driver-epoch mismatch fail open. Startup/idle grace remain 30/10 seconds.
While configured, demand planning refreshes every 200 ms; inactive heap entries
recheck at 100 ms. This is bounded wake latency, not a hard real-time deadline.
Requests already launched before a decision changes may finish.

Suspension invalidates source/alias/element cache quality and publishes inactive
states to HTTP/WS/UA. Wake publishes waiting states and resets the read boundary.
Old prefetched samples are discarded, and batch candidates awaiting their own wake
transition are excluded. Read handles remain open. A new physical completion must
pass the shared gate before GOOD returns. Array roots remain transport work while
their elements carry cache lifecycle states.

`/polling/demand` reports mode `active_poll_test`, `polling_unchanged: false`, the
configured allowlist, connection eligibility, skipped scan selections and actual
polling `plc_tag_read` request counts by logical physical root. These request counts
are test instrumentation; skipped heap selections are not an estimate of reads
saved. The scheduler preview remains a separate planning view. Coverage and
safe-to-suspend flags remain false. Existing sweep metrics retain their configured
work denominator; use request counts and lifecycle state for these tests rather
than interpreting a partial active sweep as a full configured sweep benchmark.

`test-active-polling.py` starts only disposable simulator/core configurations. It
checks startup polling, quiescent idle request counts, inactive null payloads,
waiting-before-GOOD notifications, alias-to-source wake, array-element verified
read wake, and exclusion of other inactive work from actual batch read requests.
Unselected and writable control connections must keep polling. Batched and ordinary
polling are exercised, with native UA zero-age wake/read verification in the latter.
Default-off behavior is regression tested separately.

Remaining rollout work includes live consumer lifecycle coverage, active-work health
and sweep presentation, long-run churn/reload tests, and representative local
consumer tests. The experiment does not resolve anonymous broad HTTP consumers or
change the conservative defaults for production.

## Demand-aware health and sweep presentation (2026-11-01)

Eligible test-mode connections now report applied logical lifecycle counts and
physical work counts in `/health` and `/metrics`. Physical array roots count once;
aliases/elements remain logical values. Array root activity is derived from its
actual element cache states, with missing elements treated as active work. Counting
uses an index of element states instead of scanning the whole namespace per array.

Intentionally inactive tags are excluded from `tags_seen`, `stale_or_bad` and the
active stale ratio. Their count is reported separately. Waiting tags remain visible
and do not receive an indefinite health exemption. When all physical work is idle,
connection status describes intentional idle rather than a stalled poller, explicitly
saying that PLC availability is not verified. The overall watchdog handles the
all-idle case and excludes idle connections from its active-read age aggregation.
Existing runtime issues and real active read failures retain ordinary health logic,
including existing recovery grace; the idle policy does not clear those failures.

Full configured-sweep timings, estimated sweep, cursor and progress are unavailable
(null) throughout demand-driven mode. Historical full sweeps and idle gaps cannot
be compared with active-only work. This change does not invent a new active-sweep
duration. Diagnostics expose configured/active/inactive physical work, and the SCADA
overview displays these counts, inactive/waiting tags and the unavailable full sweep.
All fields and timing behavior remain unchanged for ordinary polling, unselected
connections, writable fallback connections and unsupported backends.

`test_poll_cache_lifecycle.cpp` covers logical versus physical array counts, idle and
waiting states, missing element fallback, and sweep suppression. The simulator test
checks healthy all-idle status/watchdog, partially active ratios, a real active array
failure alongside inactive tags, and default/unselected connection behavior.
UI JavaScript syntax is checked; installed services and configuration remain unchanged.

## Reload/removal ownership checks (2026-11-02)

Targeted reload now handles deliberate removal of a previously configured physical
connection when its file is gone. Unknown IDs remain errors. A missing match after
any connection-file parse failure is not interpreted as removal, so malformed
configuration cannot silently delete the live driver. Disabled connections retain
their existing removal behavior. Cache purge uses stored connection identity.

After stopping/joining the affected pollers, reload clears their queued UA updates;
full reload clears all such queued updates. Each UA publication additionally carries
a driver epoch, independent of physical-read evidence. Publication checks the
current driver epoch before touching a binding, including memory values and bad
statuses. This rejects old updates that arrive after queue cleanup or after a stable
node ID is reused. Immediate automation-write publications capture the cache value
and its current owner under the same runtime lock.

Removing a connection now actually retires all its UA bindings rather than only
reporting a retirement. Retired nodes return BadDataUnavailable. A datatype conflict
also retires the old incompatible value instead of leaving it GOOD; the existing
full namespace rebuild requirement is preserved. Empty folders/nodes can remain
until that rebuild, but their old values are unusable. Restoring a compatible schema
can reactivate a binding through the normal fresh-read boundary.

Applied targeted reload resets that connection's experimental request telemetry;
full reload resets all experimental telemetry. Removed work is pruned from the next
shared demand snapshot. Other connections retain pollers, driver epochs, metrics and
queued updates. A replacement driver gets startup grace even if its predecessor was
inactive; a writable replacement conservatively returns to ordinary polling.

`scripts/test-active-reload.py` exercises pending reads during active tag replacement,
inactive replacement, malformed and unknown reloads, datatype conflict, removal,
stable-node re-addition, preview/telemetry cleanup, and writable fallback. A later
connection in the driver vector must keep polling with its original epoch as the
earlier connection is removed. `test_ua_poll_quality.cpp` checks old/current/missing
publisher epochs, including bad-status publications. These are disposable simulator
checks; no installed services or configuration were changed.

## Live consumer lifecycle and Flow cold inputs (2026-11-02)

`scripts/test-active-consumers.py` runs real UA and WebSocket clients and a real
Flow service against the disposable active-polling core and PLC simulator. Two UA
subscriptions and two WebSocket scopes share sources. Changing one scope, closing
one client, disabling monitoring, and disabling a Flow must not remove another
consumer's interest. Sampling remains demand while subscription publishing is off;
Disabled monitoring releases it. The last consumer's departure eventually stops
physical reads, verified using actual request counters and idle health.

The fixture gives a Flow input a ten-minute read interval. Its background demand
keeps the physical source active after the anonymous HTTP lease expires. A draft
edit does not move that demand. Deployment onto an already inactive source does
move demand, wakes the source and initializes the new input. Disable removes Flow's
registration, while a still-valid last HTTP read lease and idle grace expire normally;
Flow disable cannot revoke another anonymous reader's conservative lease.

Testing identified a cached-input cold-start gap: the first GET after deployment
could see an inactive/waiting value, then defer the next attempt for the full input
interval. Flow now schedules a 250-ms retry only for a matching requested tag with
explicit inactive/waiting metadata and non-GOOD quality. The retry window is bounded
by five seconds on a monotonic clock. Exhaustion and ordinary errors return to the
configured interval. A GOOD value clears the window and initializes downstream
logic normally. No null/bad event is emitted, no verification requirement is
bypassed, and older cores without lifecycle metadata keep their existing behavior.

Retry state is guarded by the deployed input epoch, cleared on deployment/success,
and discarded on ordinary failure. An old response cannot reschedule a replacement
input. `test-flow-freshness.py` additionally covers inactive-to-waiting-to-GOOD,
permanent waiting, wrong identities, ordinary errors and a transport failure during
a wake, alongside the existing verified-read and redeploy/disable tests.
No installed services, configuration or versions were changed.

## Alarm and automation lifetime validation (2026-11-02)

`scripts/test-active-background.py` runs the actual alarm service, core and PLC
simulator in a disposable configuration with controlled active polling. Alarm-only
inputs keep polling after startup grace, while unused inputs stop. A verified
automation with a ten-minute interval wakes an idle source, obtains a fresh value
and writes its memory output. Its configured demand keeps that source polling
after the anonymous HTTP read lease expires, without requiring a second execution.

Reloading an alarm rule replaces its registered input. Disabling the automation
does not stop a source still required by that alarm. After the alarm disconnects,
all inputs eventually idle and their physical read counters stop increasing.
Baseline reads made by the alarm service create ordinary 30-second HTTP leases;
those leases and idle grace can legitimately outlive a rule change or disconnect.
The test checks owner release separately from eventual polling suspension.

An automation whose dependencies cannot be resolved conservatively wakes all
inputs. Removing it allows them to idle again. This validates alarm and automation
consumer lifetimes; active-mode historian integration remains a separate check.
No installed services, configuration or versions were changed.

## Periodic historian cold inputs (2026-11-02)

The actual historian/TimescaleDB fixture reproduced a cold-start gap: a selected
periodic rule scheduled its next collection before reading a source that was still
inactive or waiting. Even after demand woke the PLC source, its first recording
could wait for the full configured interval.

Selected periodic rules now retry explicit non-GOOD inactive/waiting states every
250 ms, bounded by five seconds on a monotonic clock. Ordinary faults retain the
configured schedule. Successful or ordinary non-lifecycle responses clear the
per-source retry window. This does not turn a cached sample into a verified read.

Configuration generations reset periodic schedules, deadband baselines and retry
windows. Snapshot enqueue checks the captured generation under the configuration
lock, so responses started before reload cannot enqueue samples afterward. Samples
already queued are not withdrawn.

`scripts/test-active-historian.py` creates a private Unix-socket-only PostgreSQL
cluster with TimescaleDB, a PLC simulator and disposable core/historian services.
It checks cold-start recording with a ten-minute interval, continued physical reads
between recordings, unused-tag suspension, rule replacement, disable/re-enable and
active disconnect cleanup. `src/test_snapshot_lifecycle.cpp` checks retry deadlines,
independent keys, ordinary-response reset and configuration reset.
No installed services, databases, configuration or versions were changed.

## Logger active polling and crash leases (2026-11-02)

`scripts/test-active-logger.py` runs the actual Logger service against disposable
core and PLC simulator instances. Jobs are scheduled twelve hours ahead and point
to an unused database port; the test requires zero job executions and performs no
database writes. An exact live selection wakes only its source. Disabled and
historical-only jobs do not add live PLC demand. Changing the live selection to a
wildcard wakes matching sources; ALL wakes the whole configured connection.
Actual per-tag physical read counters distinguish polling from cached visibility.

Reloading with the live job disabled removes its registration and allows sources
to idle. Re-enabling it restores demand, retained by heartbeats between scheduled
runs. Abrupt process termination cannot send an HTTP release, so the server must
expire its 60-second lease and then allow idle grace before physical reads stop.
This intentionally differs from an orderly disable, which releases immediately
while still respecting idle grace.

SCADA/HMI logic-level demand tests also pass for independent viewer IDs, scope
replacement, hidden-view release/restore and reconnect behavior. Full browser
integration and namespace changes while wildcard consumers are attached remain
separate rollout checks. No installed services, configuration or versions changed.

## Wildcard namespace changes and browser checkpoint (2026-11-02)

The Logger fixture accepts `--namespace-churn` to exercise an unchanged wildcard
registration across a connection reload. It removes an old matching tag, renames
another logical tag so it no longer matches (retaining its physical PLC address),
and adds a new matching tag. After the replacement driver's startup grace, only
the newly matching source must remain active. Removed logical names must disappear
from request telemetry, and nonmatching sources' physical read counters must stop.
The fixture then repeats ALL, disable, heartbeat retention and crash-expiry checks
against the replacement namespace.

The live browser check could not run in this session: browser inventory returned
no surfaces and reported `The browser access host is unavailable`. Existing
SCADA/HMI logic tests pass, but they do not establish real scrolling, overscan,
hidden-tab throttling or multi-tab behavior in a browser. That integration check
remains required before expanding the controlled rollout. Experimental active
polling remains opt-in and restricted to eligible read-only AB connections.

## Live Tags polling-state presentation (2026-11-02)

Live Tags now displays `INACTIVE` for suspended polling and `WAITING` while a
source waits for its first usable sample, using the existing warning styling.
These states previously fell through to `BAD`. Disabled tags and invalid handles
retain precedence, while actual error states continue to display `BAD`. Ordinary
GOOD, missing, array-root and MQTT-disabled presentation is unchanged.

The viewer tests exercise the actual status function, including lifecycle states
without snapshots and precedence against disabled tags and invalid handles. All
nine SCADA/HMI demand tests and the app syntax check pass. Browser access was
checked again and remains unavailable, so live viewport/visibility validation is
still outstanding. No installed services or configuration changed.

## Live Tags asynchronous request ownership (2026-11-02)

Live Tags index and value requests now capture a per-page request generation.
Viewport resets invalidate outstanding work, and a newer request supersedes an
older one. After each network response, ownership and document visibility are
checked before changing the index or value cache. A superseded response returns
current viewport data instead of restoring its former filter or old values. An
already-sent HTTP read can still retain its normal conservative read lease; this
change does not cancel server work or revoke that lease.

The actual loader functions are tested with deliberately reordered index/value
responses, a reset during an index fetch and a tab hidden during a value fetch.
All eleven SCADA/HMI viewer tests, syntax validation and diff checks pass.
Live browser validation remains outstanding. Installed services are unchanged.

## Large-list viewport verification (2026-11-02)

A regression fixture now loads 5,123 configured tags through the actual Live Tags
range calculation and value loader. With a ten-row viewport it reads 40 rows at
the top, 40 around a middle scroll position, and the remaining 13 near the bottom.
The actual ViewerDemand helper registers precisely those queried keys, replacing
its prior scope. An untouched middle tag is never fetched into the value cache,
and release removes the viewport registration. Index metadata stays available for
scrolling without registering the entire list as demand.

Core `/tags` inspection confirms broad index requests do not create HTTP read
leases; exact connection-and-tag reads do. Existing active fixtures repeatedly
fetch broad tag lists while unused inputs become inactive, providing the runtime
counterpart to that distinction. All twelve viewer tests pass. This is a local
loader/helper integration test with simulated viewport geometry, not a real-browser
scrolling or performance benchmark. Live-browser validation and a limited installed
read-only connection trial remain rollout work; activation remains opt-in.

## Local installed-trial preparation (2026-11-02)

The local installed service is still observation-only. B125
(`connection_01a7cfe71540e5ad`) has 1,479 listed tags and no writable tags; the other
local PLC connections contain writable tags and are not selected. Its pre-trial
60-second sweep average was about 5.9 seconds, with existing tag/handle errors.
Health, metrics and demand baselines are saved under
`/tmp/opcbridge-active-installed-trial/`.

Activation is prepared as a separate systemd EnvironmentFile drop-in for this
connection only; it does not edit the main service environment. The matching
rollback script removes only those trial files and restarts ordinary polling.
Installation/activation requires the user to run sudo commands because the current
session cannot elevate. Preparation does not mean the installed trial has run or
that real-browser validation has passed.

## First local installed trial (2026-11-02)

After user installation and activation, the installed core reports
`active_poll_test` with only B125 eligible. At rest, all its inputs became inactive
and physical request counters remained unchanged during a five-second observation.
Other PLC connections continued increasing their ordinary read counters.

A temporary explicit demand registration for `Barometric_Pressure` and
`CALL_MT_PLEASANT_CALL_ACTIVE` woke both inputs to GOOD. Over the next five seconds,
only those two physical request counters increased (six requests each). Releasing
the registration returned all B125 inputs to inactive after grace, and a further
five-second observation confirmed frozen counters. Overall health stayed `ok`.
The temporary test registration was released; B125's opt-in trial remains enabled.

This validates the installed core and PLC wake/release path, not the live browser
viewport. Trial snapshots and the check log are retained in
`/tmp/opcbridge-active-installed-trial/`. Broad tag-list observations did not wake
unrequested sources. No tag values or connection/tag configuration were changed
by the check.

## UA connection folder labels (2026-11-02)

UA connection folders now use the configured connection name, falling back to the
ID only when no name exists. Memory retains its `Memory` label. Startup and
incremental synchronization share the same folder creation path. Folder NodeIds
remain `Connections/<escaped internal ID>` and tag NodeIds remain unchanged, so
friendly-name changes and duplicate friendly names do not merge identities.

An existing folder's DisplayName is refreshed during synchronization. The bundled
UA server does not support writing BrowseName after node creation, so a renamed
folder retains its original BrowseName until recreation while its visible label
updates. New folders receive the friendly BrowseName at creation.
`test_ua_poll_quality.cpp` covers creation, rename, duplicate names, ID fallback and
Memory alongside the existing polling quality checks. Installation/restart is
required for the running service to use the new labels.

## User-confirmed installed clients and release checkpoint (2026-11-02)

The user confirmed Live Tags scrolling wakes rows promptly, UA Expert demand
increases one monitored tag at a time, disconnect removes that demand and reconnect
restores three items. The overlapping-consumer check also passed: another client
retains a shared tag when one leaves. Friendly UA connection labels were confirmed
after installing the naming fix. These are manual installed observations rather
than browser automation. See `active-tag-polling-release-checkpoint.md` for the
current validation summary and opt-in rollout boundaries.


## Per-connection UI setting and default activation (2026-11-02)

The Workspace new/edit connection forms now expose Tag polling: Poll active tags
(default) or Poll all enabled tags. Save and Poll persists `poll_active_only` and
applies it through the existing connection reload; no service restart is needed.
Missing fields default true for both existing and new configurations. Explicit
false keeps ordinary polling. CSV exports include the setting; imports without
that column preserve an existing explicit false instead of silently resetting it.

Eligibility remains restricted to read-only AB connections, with the existing
writable/unsupported-driver/MQTT fallbacks. Explicit per-connection choices take
precedence over the legacy trial environment allowlist. That allowlist remains
compatible for untouched legacy trial configurations; new installations need no
environment setting. Diagnostics now derive enabled connections from applied
connection policy rather than requiring a nonempty environment allowlist.

`test-active-settings.py` uses no allowlist and verifies default suspension,
explicit all-tags polling, writable fallback, and switching both directions via
connection reload. It then verifies normal consumer wake/release under the saved
active setting. UI tests cover defaults, explicit false, preserving a choice when
unrelated polling fields are applied, and both editor save paths. Existing native
UA quality/folder tests also check the eligibility policy. This supersedes the
opt-in-only release checkpoint; installed services are not modified by these tests.

## Writable demand, readback boundaries and idle communication (2026-11-02)

Writable is now a permission rather than a demand reason. Both connection-level
and physical-work writable fallbacks are removed; the per-connection active/all
choice, unsupported-driver fallback and MQTT-mode fallback remain. An unobserved
writable source suspends normally. Read-modify-write operations retain their
existing prerequisite PLC reads; no background full-connection polling is needed
to keep a write possible.

The shared AB write routine covers HTTP/SCADA/Flow, native UA, queued automation,
MQTT and CLI entry points. It briefly leases the physical source and invalidates
its root/dependents at entry and completion, including failed attempts. Requested
write values are not committed as physical measurements. Ordinary poller readback
must cross the new read boundary before restoring GOOD. Existing derived-bit
verification stays in place. Memory writes remain immediate/authoritative, including
aliases backed by a memory source. Physical write event logging comes from confirmed
poller samples rather than assumed requested values.

Write configuration epochs are checked before PLC I/O; alias recursion carries
its captured epoch. Readback invalidation ignores replaced drivers. UA callback
restores cache evidence before returning instead of retaining the library's
optimistic client-written value. Queued physical GOOD publications are checked
against current driver read gates; superseded waiting publications do not replace
an already confirmed GOOD cache value. Write acknowledgement means the write
operation succeeded, not that readback has completed or the controller retained
that value. A bounded ordinary read lease (30 seconds plus idle grace) handles
readback/retry without a permanent writable demand pin.

Idle connections use one previously successful physical source for a communication
probe about every 30 seconds after regular reads stop. A shared connection tracker
coordinates lanes, remembers candidates, rotates away from tag-specific failures
and keeps probe counters separate from normal polling. The probe holds lifecycle
and connection I/O locks and checks the running generation. It never creates tag
demand or publishes a tag snapshot, so tags remain inactive. No known successful
source means communication cannot yet be confirmed; no successful measurement is
invented. The check confirms read communication, not controller RUN state or process
health.

Health separates `polling idle (no active demand)` from `communication` state,
last-success age, check count and consecutive failures. A failed probe is visible;
three consecutive communication failures make idle connection health an error.
A tag-specific failure alone does not declare the PLC unavailable. A successful
probe clears failures. Overview shows recent communication evidence rather than
old poll sample ages while idle, and removes the alarming availability disclaimer.

`test-idle-writes-health.py` uses actual simulator/core/UA services to check writable
suspension, an idle heartbeat without tag activation, scalar/alias/bit/array writes,
unrelated writable suspension, native UA and queued automation outputs, failed
writes and idle communication loss/recovery. Clock-controlled probe tests cover
cadence, shared claims, tag fallback and failure reset; scheduler tests assert
writable work suspends. Native UA quality tests cover post-write sample boundaries
and rejection of replaced-driver invalidation/write epochs. Installed services and
versions are unchanged by these development checks.
