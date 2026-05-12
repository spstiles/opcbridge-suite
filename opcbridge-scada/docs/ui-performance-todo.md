# SCADA UI Performance Notes

Date: 2026-05-12

## Completed

### Phase 1: Scope the recurring refresh loop

- The periodic UI refresh now updates only the currently visible high-cost views.
- Workspace live tag data is fetched only while the Workspace tab is visible.
- Workspace config/tree rendering is no longer done on every timer tick.
- Hidden live tag tables are not re-rendered.
- Entering Workspace triggers a one-time config/tree refresh so Connectivity renders correctly.
- Entering Overview, Workspace, or Alarms & Events triggers one scoped refresh immediately instead of waiting for the next timer tick.

### Phase 2: Replace avoidable full refreshes

- Alarm runtime refresh/restart now refreshes alarm runtime/status views only.
- Alarm create/delete/duplicate/site/group operations now refresh Alarms & Events only after runtime reload.
- Workspace tag CSV import and Workspace context refresh now refresh Workspace only.
- The Overview "Rebuild Full Runtime" button still intentionally uses the full refresh path because that action is global.

## Watch Items

- Watch for stale panels after editing alarms, notification policies, contacts, groups, tags, or connections.
- If a panel does not update immediately after a save, prefer adding a scoped refresh for that specific panel rather than returning to `refreshAll()`.
- Keep the recurring timer lightweight. It should not rebuild large trees or redraw hidden tables.

## Future Work

- Add virtualization or paging for very large Workspace tag lists and Alarms & Events child lists.
- Add server-side filtering/search for large tag lists so the browser does not need to render thousands of rows at once.
- Add cheap config version, mtime, or hash checks before reloading and rendering config trees.
- Defer or queue live table updates while a modal or properties editor is open.
- Consider splitting large save/import operations into visible progress steps so the UI remains responsive during server-side work.

## Guiding Rule

Use the smallest refresh that makes the current user action visible. `refreshAll()` should be reserved for explicitly global actions, such as full runtime rebuilds.
