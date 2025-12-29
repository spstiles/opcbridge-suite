# opcbridge-suite

Monorepo for the opcbridge ecosystem:

- `opcbridge/` (core industrial data bridge)
- `opcbridge-alarms/` (alarm server)
- `opcbridge-scada/` (SCADA configuration/console UI)
- `opcbridge-hmi/` (HMI)
- `opcbridge-reporter/` (optional reporter)

## Install (Debian 13 derivatives)

- Install OS deps first (recommended):
  - `sudo ./install.sh --deps`

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

## Versioning

This repo uses a `suite_version` + `component_version` scheme:

- Suite version: `VERSION` (repo root)
- Component versions:
  - `opcbridge/VERSION`
  - `opcbridge-alarms/VERSION`
  - `opcbridge-scada/VERSION`
  - `opcbridge-hmi/VERSION`
  - `opcbridge-reporter/VERSION`

`opcbridge`, `opcbridge-alarms`, and `opcbridge-reporter` embed both versions into their `--version` output, and services expose them via their status/info endpoints.

## Uninstall

- Keep config/data/logs:
  - `sudo ./uninstall.sh`

- Purge everything:
  - `sudo ./uninstall.sh --purge`
