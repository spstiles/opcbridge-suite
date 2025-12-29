# opcbridge-suite

Monorepo for the opcbridge ecosystem:

- `opcbridge/` (core industrial data bridge)
- `opcbridge-alarms/` (alarm server)
- `opcbridge-scada/` (SCADA configuration/console UI)
- `opcbridge-hmi/` (HMI)
- `opcbridge_reporter/` (optional reporter)

## Install (Debian 13 derivatives)

The installer lets you install only `opcbridge` (as a comms layer), or install the full suite.

From the repo root:

- Interactive:
  - `sudo ./install.sh`

- opcbridge only:
  - `sudo ./install.sh --opcbridge-only`

- Full suite:
  - `sudo ./install.sh --full`

Notes:

- Config root defaults to `/etc/opcbridge`.
- Shared tokens and ports live in `/etc/opcbridge/opcbridge.env`.
- Data defaults to `/var/lib/opcbridge` (SQLite/state).

## Uninstall

- Keep config/data/logs:
  - `sudo ./uninstall.sh`

- Purge everything:
  - `sudo ./uninstall.sh --purge`
