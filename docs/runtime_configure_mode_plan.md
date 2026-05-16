# Runtime / Configure Mode Plan

## Problem

Large opcbridge-suite systems are becoming expensive to configure because normal edits often trigger runtime reloads. With 10K+ tags, a full runtime rebuild can take several minutes. This makes routine setup work feel broken: adding a tag, changing a connection setting, or importing a list can repeatedly interrupt polling and block useful UI work.

The UI needs to separate configuration persistence from runtime application.

Core rule:

```text
Save changes config files.
Apply changes runtime.
```

## Proposed Modes

### Runtime Mode

Runtime Mode is the normal operating state.

- Polling, alarms, OPC UA, reporter, HMI, and live diagnostics continue running.
- Configuration editing is locked or limited to safe runtime tuning controls.
- Live Tags, Overview, alarms, logs, and test tools remain available.
- If saved config differs from active runtime, show a clear pending-change banner.

Example banner:

```text
Saved configuration changes are pending. Runtime is still using the last applied configuration.
```

### Configure Mode

Configure Mode allows setup work without repeatedly rebuilding runtime.

- Configuration editing is unlocked.
- Runtime continues using the last applied configuration.
- Saves write config files only.
- No automatic full runtime rebuild occurs after each edit.
- The UI clearly shows that the runtime is not yet using the edited config.

Primary actions:

- `Save Config`
- `Discard Changes`
- `Apply and Return to Runtime`
- `Full Rebuild` as an explicit fallback/recovery action

Example banner:

```text
Configure Mode: editing saved configuration. Runtime is still using the previously applied configuration.
```

## Change Impact Categories

Not all changes should have the same apply cost.

### Hot-Apply Tuning

These should be adjustable from Runtime Mode, without entering Configure Mode and without rebuilding tags:

- polling mode
- polling pacing
- batch size
- time budget
- max reads per cycle
- stale/degraded thresholds
- connection scan timing where safe
- connection enabled/disabled where safe

Expected apply behavior:

- update the affected connection runtime settings
- avoid rebuilding handles
- avoid touching unrelated connections
- avoid OPC UA rebuild

Possible UI action:

```text
Apply Tuning
```

### Connection-Scoped Apply

These require Configure Mode, but should only reload affected connection pollers:

- add tags to a connection
- delete tags from a connection
- edit PLC tag address
- edit datatype
- edit elem_count
- change connection gateway/path/plc type
- add/delete a connection

Expected apply behavior:

- stop only affected connection poller(s)
- rebuild handles only for affected connection(s)
- keep unrelated connections running
- report per-connection progress

### Alarm / Notification Apply

Alarm configuration changes should not rebuild polling.

Examples:

- add/edit/delete alarms
- change alarm group/site
- change notification policy/contact routing
- change alarm audio/speech settings

Expected apply behavior:

- reload alarm runtime only
- leave polling connections untouched
- leave reporter untouched

### Reporter / Data Logger Apply

Reporter configuration changes should not rebuild polling.

Examples:

- add/edit/delete database definitions
- add/edit/delete logger jobs
- add/edit/delete data checks
- change database monitor schedules

Expected apply behavior:

- reload reporter service/runtime only
- leave polling connections untouched
- update System/Reporter tags after reload

### OPC UA Sync / Rebuild

OPC UA is separate from polling.

Changes that may affect OPC UA:

- add/delete/rename tags
- change datatype
- add/delete connections
- change object model structure

Expected apply behavior:

- use targeted OPC UA sync when possible
- allow polling runtime to come up first
- perform full OPC UA rebuild only when targeted sync cannot safely apply the change
- clearly report when full rebuild is required

### Full Runtime Rebuild

Full rebuild should be rare and explicit.

Use cases:

- targeted apply fails and recovery is needed
- core runtime settings changed
- data model migration
- user explicitly requests a clean rebuild

The UI should not silently choose this for normal edits.

## Suggested UI Flow

Runtime Mode:

```text
Runtime Mode
Runtime is active. Configuration editing is locked.

[Enter Configure Mode]
```

Configure Mode:

```text
Configure Mode
Runtime is active using last applied configuration.

[Save Config] [Discard Changes] [Apply and Return to Runtime]
```

Pending apply summary:

```text
Pending changes:
GBT_Poly1
- 12 tags added
- 2 tags deleted
- batch size changed

Impact:
- restart GBT_Poly1 poller
- targeted OPC UA sync
- no full rebuild expected

[Apply Affected Runtime] [Full Rebuild]
```

## Implementation Phases

### Phase 1: Stop Automatic Rebuilds

- Make Save only write config files.
- Remove automatic runtime reload after normal config edits.
- Show pending runtime changes.
- Add explicit `Apply Runtime Changes`.

Expected value:

- immediate usability improvement for large systems
- users can make many edits and apply once

### Phase 2: Runtime / Configure Mode UI

- Add mode state to SCADA.
- Lock configuration editing in Runtime Mode.
- Unlock configuration editing in Configure Mode.
- Keep monitoring views live in both modes.
- Add clear banners and action buttons.

### Phase 3: Change Impact Detection

Track changed areas:

- polling tuning only
- connection/tag changes
- alarm changes
- reporter/logger changes
- OPC UA-visible changes
- changes requiring full rebuild

Display impact before apply.

### Phase 4: Targeted Apply

- Apply tuning without rebuilding handles.
- Restart only affected connection pollers.
- Reload alarm runtime independently.
- Reload reporter runtime independently.
- Run targeted OPC UA sync where possible.
- Fall back to full rebuild only when necessary.

### Phase 5: Background Apply Jobs

- Apply operations run as visible jobs.
- UI remains usable.
- Show status and progress:
  - queued
  - stopping affected connection
  - rebuilding handles
  - polling active
  - alarm runtime reloaded
  - OPC UA sync complete
- Preserve job history for troubleshooting.

## Notes

- Runtime/Configure should not mean the plant is offline.
- Configure Mode means configuration is offline from runtime until explicitly applied.
- Existing runtime should keep polling while edits are being staged.
- Hot tuning should remain possible from Runtime Mode because changing batch size or pacing should not require a full configure/apply cycle.
