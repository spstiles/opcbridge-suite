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
./opcbridge-alarms \
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
