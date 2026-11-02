# Active polling release checkpoint — 2026-11-02

Branch: `feature/active-tag-polling`. Suite release: `0.5.46`.

## Release scope

Prepare an **opt-in experimental release**, retaining ordinary polling by default.
Only explicitly selected `ab_eip` connections with no writable tags can suspend
unneeded reads. MQTT mode disables this gating. Missing, stale or mismatched
scheduler state permits ordinary polling rather than suspending work.

Demand includes OPC UA monitored items, scoped viewers, alarms, automations,
Flow inputs, historian rules and Logger live selections. Unknown automation
read dependencies conservatively retain all tags. HTTP reads retain temporary
leases. Startup and idle grace prevent rapid suspend/resume churn.

Inactive and waiting samples have explicit quality/state handling. Fresh-read
verification is separately opt-in, and failure does not silently use old data.
Full configured sweep times are unavailable while experimental gating is active;
activity counts and physical request counters are the relevant diagnostics.
UA folders display configured connection names while NodeIds stay stable.

## Validation

Fresh checkpoint checks:

- All 52 SCADA/HMI tests pass, including the 5,123-tag viewport, reordered network
  responses, hidden viewers and independent viewer registrations.
- Core header tests cover UA demand, explicit consumer registrations and leases,
  automation dependency analysis, execution ownership, read freshness and scheduler
  grace/fail-open decisions.
- Latest UA folder/quality test passes creation, rename, duplicate names, fallback,
  memory labels and cache-quality behavior. The communication release build passes.

Earlier disposable integration checks passed active polling, scalar/array/derived
fresh reads, reload/removal, actual UA/WS/Flow consumers, alarms and automation,
actual TimescaleDB historian recording, and Logger wildcard/ALL/crash leases.
These were staged checks throughout development, not one fresh full-suite run at
this checkpoint. Detailed scope and limitations are in `active-tag-polling.md`.

## Installed trial

B125 (`connection_01a7cfe71540e5ad`) is the only selected local connection, with
1,479 listed read-only tags. Its previous full sweep averaged about 5.9 seconds.
Installed checks demonstrated frozen physical read counters while idle, fresh GOOD
samples for two requested tags, and a return to idle after release. Other PLC
connections continued polling and overall health remained OK.

User-observed checks also passed:

- Scrolling Live Tags wakes displayed tags promptly; recent polling follows rows.
- Adding three UA Expert monitored items individually increases observed demand.
- Disconnect removes that demand; reconnect restores all three.
- Shared interest survives one client's departure when another still needs a tag.
- Friendly connection folder labels are visible in UA Expert after installation.

These are manual observations, supplemented by counter checks; browser automation
remains unavailable because the browser access host is unavailable.

## Rollout limits and next steps

- Retain the B125-only trial and collect longer-term stability evidence.
- Verify hidden-tab and multi-tab viewport behavior explicitly in the installed UI;
  local logic tests cover it, but that is not a complete browser exercise.
- No general activation for writable connections, other drivers or MQTT mode.
- No full-load production benchmark or default-on readiness claim.
- Preserve the bundled open62541 C/header changes together on rebuild and upgrade.
- Keep benchmark artifacts in `output/` and Python bytecode out of the change set.

The trial uses a separate systemd EnvironmentFile/drop-in. Removing it and
restarting restores ordinary polling without changing tag definitions. The prepared
local scripts and baseline snapshots reside under
`/tmp/opcbridge-active-installed-trial/`; they are local operational artifacts,
not release contents. This checkpoint accompanies the versioned branch release;
active polling remains opt-in.
