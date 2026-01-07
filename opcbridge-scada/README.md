# opcbridge-scada

SCADA **control center** UI that configures the system through **opcbridge’s HTTP config API**.

Design goals:
- Desktop-like workflow (forms + tables, not “edit JSON files”).
- Secrets stay on the SCADA server (browser never sees tokens).
- Talks to opcbridge / opcbridge-alarms only via public HTTP APIs.

## Run

From the `opcbridge-scada` folder:

```bash
cp config.json.example config.json

# opcbridge admin token (used for /config/* reads + admin-gated writes)
export OPCBRIDGE_ADMIN_SERVICE_TOKEN='...'

# opcbridge write token (required by /config/file, /config/tags, /reload, etc.)
export OPCBRIDGE_WRITE_TOKEN='...'

node ./server.js
```

Then open:
- `http://127.0.0.1:3010`


## Dev convenience (no more exporting tokens)

Create a local secrets file (gitignored) so you don’t have to remember/export tokens in every terminal:

```bash
cp config.secrets.json.example config.secrets.json
# edit config.secrets.json

node ./server.js
```

`opcbridge-scada` loads tokens from environment variables first, then falls back to `config.secrets.json`.

## Configure (UI)

Use the **Configure** tab to set:
- SCADA refresh interval
- opcbridge host/port
- alarms host/port
- HMI host/port

If you change the SCADA listen host/port, restart `opcbridge-scada`.

## Configuration file

Edit `config.json` manually if needed:
- `listen.host` / `listen.port`: where SCADA listens
- `refresh_ms`: UI refresh interval (250–30000)
- `opcbridge.*`: opcbridge address
- `alarms.*`: alarm server address
- `hmi.*`: opcbridge-hmi address


## Headless / remote access

If `opcbridge-scada` runs on a headless server and you access it from another machine, enable UI auth:

```bash
export OPCBRIDGE_SCADA_UI_PASSWORD='choose-a-password'
# optional
export OPCBRIDGE_SCADA_UI_USER='admin'

node ./server.js
```

This uses HTTP Basic Auth and allows remote channel/config changes without requiring localhost.

## Security

- Tokens are read from environment variables and are injected server-side:
  - Admin token header: `X-Admin-Token`
  - Write token field: JSON body `token`
- SCADA config updates (`POST /api/scada/config`) are localhost-only by default.
  - To allow remote updates, set `OPCBRIDGE_SCADA_ALLOW_REMOTE_CONFIG=true`.

Notes:
- You can still force remote config updates without auth by setting `OPCBRIDGE_SCADA_ALLOW_REMOTE_CONFIG=true` (not recommended).

## Tag Schema Notes

`opcbridge-scada` supports the core tag features supported by `opcbridge`, including:
- Array/block reads via `elem_count` (element values appear as `TagName[0]`, `TagName[1]`, ...)
- Derived tags:
  - Derived Bit: `source_tag` + `bit`
  - Derived Alias: `source_tag` (no `bit`) with optional scaling

For the canonical tag schema and examples, see `opcbridge/docs/manual.md`.
