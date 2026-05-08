# `alarms.json` Migration Plan: v1 -> v2

This document defines how to migrate existing `opcbridge-alarms` config into the proposed v2 model.

## Scope

- Input: current mixed schema (`rules`, optional `notifications`, optional voice modem blocks).
- Output: strict v2 shape with top-level `schema_version: 2`.
- Goal: preserve behavior first, then improve structure.

## Migration Checklist

1. Set required root fields:
   - Add `schema_version: 2`.
   - Add `timezone` (default from site; fallback `America/Chicago`).
   - Initialize empty arrays for `schedules`, `targets`, `routes`, `policies`, `alarms`.
2. Convert each existing alarm rule/alarms entry into `alarms[]`.
3. Convert notification transport config into reusable `routes[]`.
4. Convert contacts/contact_groups into `targets[]`.
5. Convert policy-like notification settings into `policies[]`.
6. Bind alarms to policies with `policy_id`/`policy_ids`.
7. Validate references (`schedule_id`, `route_id`, target ids, policy ids).
8. Validate semantics (`repeat.enabled`, `interval_ms`, `max_repeats`).

## Field Mapping

### Root / Defaults

- `notifications.enabled` -> policy/route `enabled` gates.
- Existing route-level `repeat_ms` + `until` -> `policy.repeat`.
- New default container:

```json
"defaults": {
  "notification": {
    "repeat": {
      "enabled": false,
      "initial_delay_ms": 0,
      "interval_ms": 60000,
      "max_repeats": 0,
      "stop_on": "acked_or_returned"
    }
  }
}
```

### Alarm Definitions

- Existing `rules[]` map 1:1 to `alarms[]`:
  - `id`, `name`, `group`, `site`, `enabled`, `severity`, messages, `source`, `condition`.
- Existing per-alarm notification override:
  - `notification_policy` -> `policy_id`.
- Existing audio settings:
  - `audible_enabled`, `audio_file`, `speech_text` -> `alarm.audio`.

### Routes

- Existing `notifications.routes[]` (audio_command) -> v2 `routes[]` entries:
  - `name` -> `id`
  - `type` preserved (`audio_command`)
  - `command`/`args` -> `config.command`/`config.args`
  - `enabled` preserved
- Existing `notifications.voice_modem` -> one `routes[]` entry with `type: "voice_modem"`.
- Future SIP transport uses `type: "sip"` with SIP-specific `config` keys.

### Targets

- Existing `notifications.contacts[]` -> `targets[]` type `phone`.
- Existing `notifications.contact_groups[]` -> `targets[]` type `group` with `members`.
- Existing in-policy literals can be migrated as direct `phone`/`sip_uri` targets.

### Policies

- Existing `notifications.policies[]` -> `policies[]`:
  - `id`, `name`, `enabled`, `min_severity`, `on`
  - `on` -> `triggers`
  - targets/contact_groups -> `steps[].targets`
- Escalation:
  - Build `steps[]` with `after_ms` timeline order.
- Repeat:
  - `repeat.enabled = true` when legacy repeat behavior exists.
  - `repeat.interval_ms` from legacy `repeat_ms`.
  - `repeat.max_repeats`: default `0` unless explicitly configured.
  - `repeat.stop_on` from legacy `until`.

## Semantics (v2)

- Initial send is based on trigger event + matching step(s).
- Repeats are controlled only by `repeat` block.
- `max_repeats` counts repeat sends only.
- `max_repeats: 0` means no repeat sends.
- Any disabled element in chain (`alarm`, `policy`, `route`, `target`, or schedule miss) blocks delivery.

## Backward Compatibility Strategy

1. Loader accepts both v1 and v2.
2. If v1 detected:
   - normalize to internal v2 object model in memory.
   - emit warnings for ambiguous mappings.
3. Status API exposes detected config mode (`v1` or `v2`).
4. After stability period, optionally remove direct v1 write support.

## Validation Checklist (runtime)

- Unique IDs inside each collection (`schedules`, `targets`, `routes`, `policies`, `alarms`).
- All references exist:
  - alarm policy id(s)
  - policy `schedule_id`
  - policy step `route_id` and target ids
- `repeat.interval_ms > 0` when `repeat.enabled = true` and `max_repeats > 0`.
- `condition` fields valid for each condition type.
- Timezone resolves to a known IANA zone.

## Suggested Rollout

1. Add v2 schema file and docs (this step).
2. Add loader normalization path `v1 -> internal-v2`.
3. Add strict validation errors with line-of-ownership messages.
4. Update UI editor to emit v2 only.
5. Keep import of v1 for transition period.
