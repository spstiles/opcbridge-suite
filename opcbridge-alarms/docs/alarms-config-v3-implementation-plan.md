# v3 Implementation Plan (Backend + SCADA UI)

## Phase 1: Backend data model + loader

1. Add internal v3 model (`alarm_rules`, `schedules`, `escalation_plans`, `assignments`).
2. Add normalization paths:
   - v1 -> internal v3
   - v2 -> internal v3
   - v3 -> internal v3
3. Keep runtime behavior backward compatible during transition.

Exit criteria:
- Service can run with v1/v2/v3 configs.
- `/alarm/api/status` reports effective config mode and normalization notes.

## Phase 2: Runtime resolution + execution

1. Implement assignment resolution priority:
   - alarm_id -> group+site -> group -> severity range -> priority -> id
2. Execute selected `escalation_plan`:
   - schedule gating
   - step timing (`after_ms`)
   - repeat behavior (`max_repeats`, `stop_on`)
3. Extend diagnostics for skipped/blocked notifications.

Exit criteria:
- Deterministic plan selection for every alarm event.
- Repeat and step timing verified with integration tests.

## Phase 3: SCADA UI model switch

1. Add editors for:
   - `schedules`
   - `escalation_plans` (steps, repeat, schedule)
   - `assignments`
2. Keep legacy panels read-only or hidden once v3 active.
3. Add migration action and post-migration summary in UI.

Exit criteria:
- User can configure end-to-end scheduling/targets in UI without raw JSON.

## Phase 4: hardening

1. Add strict validation errors with actionable messages.
2. Add import/export checks and schema lint endpoint.
3. Add docs/examples for common patterns:
   - day shift + after-hours escalation
   - per-alarm override + group default

Exit criteria:
- Stable operator workflow and clear error recovery.
