# Migration: v1/v2 -> v3 (`escalation_plans` + `assignments`)

## v1 -> v3

- `rules[]` -> `alarm_rules[]`
- `notifications.contacts[]` -> `targets[]` type `phone`
- `notifications.contact_groups[]` -> `targets[]` type `group`
- `notifications.routes[]` + `notifications.voice_modem` -> `routes[]`
- `notifications.policies[]` -> `escalation_plans[]`
- `alarm.notification_policy` -> `assignments[]` with scope `alarm_id`

## v2 -> v3

- `alarms[]` -> `alarm_rules[]`
- `policies[]` -> `escalation_plans[]`
- `policy_id`/`policy_ids` on alarm -> `assignments[]`
- `schedules[]`, `targets[]`, `routes[]` carried forward directly

## Assignment synthesis rules

- If alarm has plan reference, create assignment:
  - `id`: `asg_alarm_<alarm_id>`
  - `scope`: `{ "alarm_id": "<alarm_id>" }`
  - `plan_id`: referenced plan
  - `priority`: 100

- Optional auto-created group-level assignment (only if explicitly requested by migration flag):
  - `scope`: `{ "group": "...", "site": "..." }` or `{ "group": "..." }`

## Validation checklist after migration

- All `plan_id` references resolve.
- All `schedule_id` references resolve.
- All step `route_id` and `targets` references resolve.
- No duplicate IDs in each collection.
- `max_repeats` is integer >= 0.

## Non-goals in migration pass

- No automatic behavioral changes to alarm conditions.
- No automatic route retries beyond existing repeat semantics.
- No implicit SIP provisioning.
