# Alarm Server API (opcbridge-alarms)

Status: Draft  
Scope: Public interface for an optional alarm server module that integrates with `opcbridge` but is not required by it.

## 1. Goals

- Provide a clean, documented API for alarms that:
  - `opcbridge-console` / `opcbridge-scada` can use for alarm views and acknowledgements.
  - External systems can integrate with (email/SMS notifiers, ticketing, etc).
- Keep `opcbridge` independent:
  - Alarm evaluation runs in a separate process.
  - Alarm server talks to `opcbridge` only through documented `opcbridge` APIs (HTTP/WS).
- Support common SCADA needs:
  - Active alarms, alarm history/events.
  - Acknowledge, shelve, disable.
  - Basic health/status for module presence detection.

Base URL (behind proxy, example):

- `/alarm/api/...`
- WebSocket: `/alarm/ws`

## 2. Authentication

TBD. Recommended options:

- Shared token header (simple): `X-API-Key: <token>`
- Or reuse the console’s session via reverse-proxy auth

For now, assume:
- Read-only endpoints may be unauthenticated in lab/dev.
- Write endpoints (ack/shelve/disable) should require auth.

## 3. Data Model

### 3.1 Alarm Rule (configuration)

Alarm rules are typically authored by an engineering UI and stored in a config source (TBD: either alarm server config, or in `opcbridge` config bundle under an `alarms.json` file).

Minimal rule shape:

```json
{
  "id": "pump1_fail",
  "name": "Pump 1 Fail",
  "enabled": true,
  "severity": 800,
  "source": { "connection_id": "b030", "tag": "Pump1.Fail" },
  "condition": { "type": "equals", "value": true },
  "deadband_ms": 0,
  "auto_ack": false,
  "auto_return": true,
  "message_on_active": "Pump 1 Fail is ON",
  "message_on_return": "Pump 1 Fail returned to normal"
}
```

Notes:
- `severity` is a number where higher means more severe (common SCADA pattern).
- A rule may optionally include limit/threshold-based conditions (`high`, `low`, `high_high`, etc.).

### 3.2 Alarm State (runtime)

Alarm state transitions are driven by live tag updates + rule evaluation.

```json
{
  "alarm_id": "pump1_fail",
  "name": "Pump 1 Fail",
  "severity": 800,
  "enabled": true,
  "active": true,
  "acked": false,
  "shelved_until_ms": null,
  "active_since_ms": 1735340000000,
  "last_change_ms": 1735340005000,
  "source": { "connection_id": "b030", "tag": "Pump1.Fail" },
  "last_value": true,
  "message": "Pump 1 Fail is ON"
}
```

### 3.3 Alarm Event (history)

Alarm events are append-only records that document transitions and operator actions.

```json
{
  "event_id": "evt_01JH....",
  "ts_ms": 1735340005000,
  "alarm_id": "pump1_fail",
  "type": "active",
  "severity": 800,
  "source": { "connection_id": "b030", "tag": "Pump1.Fail" },
  "value": true,
  "message": "Pump 1 Fail is ON",
  "actor": null,
  "note": null
}
```

Event `type` values (suggested):
- `active` (entered alarm)
- `return` (returned to normal)
- `ack` (operator ack)
- `unack` (optional)
- `shelve`
- `unshelve`
- `disable`
- `enable`
- `config_reload` (rule set changed)

## 4. REST API

### 4.1 GET `/alarm/api/status`

Used by the console to detect whether the alarm module is present.

Response:

```json
{
  "ok": true,
  "service": "opcbridge-alarms",
  "version": "0.1.0",
  "uptime_ms": 123456,
  "opcbridge": {
    "connected": true,
    "base_url": "http://127.0.0.1:8080",
    "ws_connected": true,
    "last_tag_update_ms": 1735340005000
  },
  "counts": {
    "active": 3,
    "unacked": 2,
    "shelved": 1,
    "disabled": 0
  }
}
```

### 4.2 GET `/alarm/api/alarms/active`

Return current alarm states (active and/or latched alarms depending on implementation).

Query parameters (optional):
- `q`: search by id/name/message
- `min_severity`
- `only_unacked` (`true|false`)
- `include_returned` (`true|false`) (default `false`)

Response:

```json
{
  "ok": true,
  "alarms": [ /* Alarm State[] */ ]
}
```

### 4.3 GET `/alarm/api/alarms/history`

Query alarm events.

Query parameters (optional):
- `since_ms`
- `until_ms`
- `limit` (default 500, max 5000)
- `alarm_id`
- `connection_id`
- `tag`
- `types` (comma-separated list)

Response:

```json
{
  "ok": true,
  "events": [ /* Alarm Event[] */ ],
  "next_since_ms": 1735340005001
}
```

### 4.4 POST `/alarm/api/alarms/:alarm_id/ack`

Acknowledge an alarm.

Body:

```json
{ "note": "Checked pump; restarting", "actor": "steve" }
```

Response:

```json
{ "ok": true }
```

### 4.5 POST `/alarm/api/alarms/:alarm_id/shelve`

Shelve (temporarily suppress) an alarm.

Body (one of):

```json
{ "duration_ms": 3600000, "note": "Maintenance", "actor": "steve" }
```

or

```json
{ "until_ms": 1735343600000, "note": "Maintenance", "actor": "steve" }
```

Response:

```json
{ "ok": true, "shelved_until_ms": 1735343600000 }
```

### 4.6 POST `/alarm/api/alarms/:alarm_id/unshelve`

Unshelve an alarm immediately.

Body (optional):

```json
{ "note": "Back in service", "actor": "steve" }
```

### 4.7 POST `/alarm/api/alarms/:alarm_id/disable`

Disable an alarm rule (stop evaluating / generating new events).

Body (optional):

```json
{ "note": "Tag removed", "actor": "steve" }
```

### 4.8 POST `/alarm/api/alarms/:alarm_id/enable`

Re-enable a disabled alarm rule.

## 5. WebSocket API

### 5.1 Connection

- URL: `/alarm/ws`
- Server sends JSON frames.

### 5.2 Events

#### `alarm_state`

Sent when an alarm’s runtime state changes (active/return/ack/shelve/etc).

```json
{
  "type": "alarm_state",
  "ts_ms": 1735340005000,
  "alarm": { /* Alarm State */ }
}
```

#### `alarm_event`

Sent for each appended history event.

```json
{
  "type": "alarm_event",
  "event": { /* Alarm Event */ }
}
```

#### `snapshot` (optional)

Sent on connect so clients don’t have to immediately call the REST API.

```json
{
  "type": "snapshot",
  "ts_ms": 1735340005000,
  "alarms": [ /* Alarm State[] */ ]
}
```

### 5.3 Subscriptions (optional)

Support client filtering if needed:

```json
{ "type": "subscribe", "min_severity": 500, "only_unacked": true }
```

## 6. Error Model

All error responses should be JSON:

```json
{ "ok": false, "error": "Human readable message" }
```

Suggested HTTP status usage:
- `200` success
- `400` bad request
- `401/403` auth required/denied
- `404` unknown alarm id
- `409` conflict (e.g., already acked)
- `500` internal error

## 7. Integration with opcbridge (recommended behavior)

To keep module boundaries clean:

- Alarm server reads tag values from `opcbridge`:
  - Initial snapshot: `GET /opcbridge/api/...` (exact endpoint TBD)
  - Streaming: subscribe via `opcbridge` WebSocket updates
- Alarm server should tolerate opcbridge restarts/reloads:
  - Auto-reconnect and re-subscribe
  - Rebuild internal tag subscriptions after reconnect

## 8. Open Questions / TODOs

- Finalize exact source of alarm rule configuration:
  - Stored and edited in `opcbridge` config bundle (`alarms.json`) vs alarm server config.
- Decide whether alarm state is “latched until ack” vs “active-only” by default.
- Define standard severities and sorting rules in console UI.

