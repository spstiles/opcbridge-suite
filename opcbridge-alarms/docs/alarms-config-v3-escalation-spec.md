# Alarms Config v3: Schedules + Escalation Plans

## Goal

Separate alarm detection from notification delivery:

- `alarm_rules`: what is an alarm
- `schedules`: when delivery is active
- `escalation_plans`: who/how/when to notify
- `assignments`: which plan applies to which alarm scope

## Root shape

```json
{
  "schema_version": 3,
  "timezone": "America/Chicago",
  "alarm_rules": [],
  "schedules": [],
  "targets": [],
  "routes": [],
  "escalation_plans": [],
  "assignments": []
}
```

## `alarm_rules[]`

Defines condition and metadata only (no routing behavior).

Required:
- `id`
- `source.connection_id`
- `source.tag`
- `condition`
- `severity`

Optional:
- `name`, `group`, `site`, `enabled`
- `message_on_active`, `message_on_return`
- `audio` override (`audible_enabled`, `audio_file`, `speech_text`)

## `schedules[]`

Types:
- `always`
- `weekly` with `windows[]` (`days`, `start`, `end`)
- `inverse_of` with `schedule_id`

Example:

```json
{ "id": "after_hours", "type": "inverse_of", "schedule_id": "business_hours" }
```

## `targets[]`

Types:
- `phone` (`value`)
- `sip_uri` (`value`)
- `audio_zone` (`value`)
- `group` (`members[]`)

## `routes[]`

Types:
- `voice_modem`
- `audio_command`
- `sip`

Each route has:
- `id`, `type`, `enabled`, `config`

## `escalation_plans[]`

Defines delivery behavior.

Required:
- `id`
- `schedule_id`
- `triggers` (`active|ack|return`)
- `steps[]`

Repeat block:
- `enabled`
- `initial_delay_ms`
- `interval_ms`
- `max_repeats` (`0` = no repeat sends)
- `stop_on` (`acked|returned|acked_or_returned|manual`)

Steps:
- `after_ms`
- `route_id`
- `targets[]`

## `assignments[]`

Binds scope to plan.

Required:
- `id`
- `plan_id`
- one `scope`

Scope options:
- `{ "alarm_id": "..." }`
- `{ "group": "...", "site": "..." }`
- `{ "group": "..." }`
- `{ "severity_min": 700, "severity_max": 999 }`

Optional:
- `enabled` (default true)
- `priority` (lower number = higher precedence)

## Deterministic plan resolution

When multiple assignments match, choose in this order:
1. exact `alarm_id`
2. `group + site`
3. `group`
4. `severity` range
5. priority (lowest first)

If still tied, lexical `id` ascending.

## Escalation semantics

- Initial send = trigger event + steps with `after_ms`.
- Repeat sends follow `repeat` rules.
- `max_repeats` counts repeat sends only (not initial send).
- Disabled element in chain (`assignment`, `plan`, `schedule`, `route`, `target`) blocks delivery.
