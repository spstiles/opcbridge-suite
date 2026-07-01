# opcbridge-alarms

Standalone alarm server for the opcbridge ecosystem.

- Subscribes to tag updates from `opcbridge` (WebSocket).
- Evaluates alarm rules.
- Exposes alarm REST API.

## Build

```bash
cd opcbridge-alarms
./build.sh
```

Requires (system packages / local installs):
- `libixwebsocket` (and its deps)
- `sqlite3`
- OpenSSL/zlib (for ixwebsocket)

## Run (dev)

```bash
./build/opcbridge-alarms \
  --config ./config \
  --opcbridge-host 127.0.0.1 \
  --opcbridge-http-port 8080 \
  --opcbridge-ws-port 8090 \
  --http-port 8085 \
  --ws-port 8086 \
  --opcua \
  --opcua-port 4841
```

Then open:
- `http://127.0.0.1:8085/alarm/api/status`

## Notes

- This is an MVP scaffold:
  - Rules support only `condition.type == "equals"` right now.
  - Alarm history/events are stored in sqlite at `config/data/alarms.db`.
  - Alarm WebSocket output is next.
- For "one bundle" config: set `OPCBRIDGE_ADMIN_SERVICE_TOKEN` in both services and opcbridge-alarms will pull `alarms.json` via `GET /config/alarms`.

## Config

- `config/alarms.json` (ignored; commit only examples)
- `config/alarms.json.example`

## Alarm History

- `GET /alarm/api/alarms/history?limit=500`

## Alarm WebSocket

- Server: `ws://127.0.0.1:8086`
- Sends:
  - `{"type":"snapshot","ts_ms":...,"alarms":[...]}`
  - `{"type":"alarm_event","event":{...}}`
  - `{"type":"alarm_state","ts_ms":...,"alarm":{...}}`

## OPC UA

- Server: `opc.tcp://127.0.0.1:4841`
- Nodes:
  - `Objects/Alarms/<alarm_id>/...` (Active, Acked, Message, etc)
- Methods:
  - `Ack(actor, note) -> ok`
  - `Shelve(duration_ms, actor, note) -> ok`
  - `Unshelve(actor, note) -> ok`

## Notifications / Annunciation

`alarms.json` can include a top-level `notifications` object. Supported notification paths are
local `audio_command` annunciation and serial voice modem dial-out.

Example:

```json
{
  "notifications": {
    "enabled": true,
    "routes": [
      {
        "name": "plant_pa",
        "type": "audio_command",
        "min_severity": 500,
        "on": ["active"],
        "command": "/usr/bin/aplay",
        "args": ["{audio_path}"],
        "repeat_ms": 30000,
        "until": "acked_or_returned"
      }
    ]
  }
}
```

Audio routes only run for alarms whose effective `audible_enabled` setting is true. The
effective audio file resolves from global `audio.default_file`, then group, site, and alarm
overrides. Use `{audio_path}` in route arguments to play the resolved file; if an
`audio_command` route has no `args`, the resolved audio path is supplied automatically.

Voice modem dial-out uses `notifications.voice_modem`, `notifications.contacts`,
`notifications.contact_groups`, and `notifications.policies`. An alarm rule must reference a
policy with `notification_policy`. When the alarm event matches that policy, enabled contacts are
dialed sequentially on the notification worker.

If the alarm has a resolved `audio_file`/`audio_path`, opcbridge-alarms attempts to play that WAV
over the modem after dialing. Uncompressed 8-bit or 16-bit PCM WAV files are converted
automatically to modem-compatible 8000 Hz mono audio before transmit.

```json
{
  "notifications": {
    "enabled": true,
    "voice_modem": {
      "enabled": true,
      "device": "/dev/ttyUSB0",
      "baud": 115200,
      "voice_init": false,
      "dial_seconds": 30
    },
    "contacts": [
      { "id": "operator_1", "name": "Operator 1", "phone": "5551212", "enabled": true }
    ],
    "contact_groups": [
      { "id": "operators", "name": "Operators", "enabled": true, "contacts": ["operator_1"] }
    ],
    "policies": [
      {
        "id": "critical_calls",
        "name": "Critical Calls",
        "enabled": true,
        "min_severity": 700,
        "on": ["active"],
        "contacts": [],
        "contact_groups": ["operators"]
      }
    ]
  },
  "alarms": [
    {
      "id": "example_alarm",
      "notification_policy": "critical_calls"
    }
  ]
}
```

The command runs asynchronously and does not block alarm evaluation. Attempts are recorded in
SQLite in the `notification_attempts` table, and current notification health appears in
`GET /alarm/api/status`.

## Voice Modem Testing

Use the standalone `voice-modem-test` utility to confirm that Linux can see the modem, that it
responds to AT commands, and that it can place a voice call.

```bash
./build-modem-test.sh
./voice-modem-test --list
./voice-modem-test --device /dev/ttyUSB0
./voice-modem-test --device /dev/ttyUSB0 --number 5551212 --dial-seconds 20
```

See `docs/voice-modem-test.md` for details and troubleshooting notes.
