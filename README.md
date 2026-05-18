# opcbridge-suite

Monorepo for the opcbridge ecosystem:

- `opcbridge/` (core industrial data bridge)
- `opcbridge-alarms/` (alarm server)
- `opcbridge-historian/` (tag historian to Postgres/TimescaleDB)
- `opcbridge-scada/` (SCADA configuration/console UI)
- `opcbridge-hmi/` (HMI)
- `opcbridge-reporter/` (optional reporter)

## Documentation

- Core engine manual: `opcbridge/docs/manual.md`
- Suite architecture: `docs/architecture.md`
- SCADA app readme: `opcbridge-scada/README.md`
- System tags: `docs/system_tags.md`
- Data Logger / reporter service: `opcbridge-scada/README.md#data-logger`

## HMI Shortcuts

- Toggle screen editor: `Ctrl+E` (Windows/Linux) or `Cmd+E` (macOS)
- Open login/account panel: `Ctrl+Shift+L` or `Cmd+Shift+L`
- Logout: `Ctrl+L` or `Cmd+L`

Full HMI details live in `opcbridge/docs/manual.md`.

## Tag Features (Highlights)

- Array/block reads: configure one tag with `elem_count`, and use `TagName[0]` style element names for derived tags.
- Derived tags:
  - `derived_bit`: `source_tag` + `bit` (bool) with optional `invert`.
  - `derived_alias`: `source_tag` (no `bit`) with full datatype + optional scaling.
- Scaling: linear scaling via `scaling: "linear"` and bounds (`raw_*`, `scaled_*`, clamps, output datatype).

## Data Logger Highlights

The SCADA **Data Logger** tab configures `opcbridge-reporter`.

- `Databases`: saved database connections plus connection monitor settings.
- `Logger`: scheduled tag logging jobs that write selected opcbridge tags to a database table.
- `Data Checks`: scheduled SQL checks that return one value, compare it to optional thresholds, and expose the result through system tags for alarms.

Common alarmable data-check tags include:

- `System/Reporter/DataChecks/<check_id>/Ok`
- `System/Reporter/DataChecks/<check_id>/BelowLow`
- `System/Reporter/DataChecks/<check_id>/AboveHigh`
- `System/Reporter/DataChecks/<check_id>/NumericValue`

## Install (Debian 12+)

Most development and testing has been on Debian 12. Debian 13 derivatives are
also supported.

The installer lets you install only `opcbridge` (as a comms layer), or install the full suite.

From the repo root:

- Interactive: `sudo ./install.sh`
- Core bridge only: `sudo ./install.sh --opcbridge-only`
- Full suite: `sudo ./install.sh --full`
- Full suite with OS dependencies and Node dependencies:
  `sudo ./install.sh --full --deps --with-node-deps -y`
- Full suite with dependencies, Node dependencies, and SIP `pjsua` callout support:
  `sudo ./install.sh --full --deps --with-node-deps --with-pjsip -y`

### Install Flags

Profiles:

- `--opcbridge-only`: install only `opcbridge`.
- `--alarms-only`: install only `opcbridge-alarms`.
- `--scada-only`: install only `opcbridge-scada`.
- `--hmi-only`: install only `opcbridge-hmi`.
- `--full` / `--suite`: install `opcbridge`, alarms, SCADA, HMI, reporter, and historian.

Component selection:

- `--components LIST`: comma-separated list from `opcbridge,alarms,scada,hmi,reporter,historian`.

Paths and service account:

- `--prefix DIR`: install prefix. Default: `/opt/opcbridge-suite`.
- `--config DIR`: config root. Default: `/etc/opcbridge`.
- `--data DIR`: data/state root. Default: `/var/lib/opcbridge`.
- `--logs DIR`: log root. Default: `/var/log/opcbridge`.
- `--user USER`: service user. Default: `opcbridge`.
- `--group GROUP`: service group. Default: `opcbridge`.

Build and dependency options:

- `--no-build`: skip builds and install existing binaries.
- `--deps`: install OS dependencies with `apt` and build required source dependencies.
- `--with-node-deps`: run `npm install` for Node services such as SCADA and HMI.
- `--with-odbc`: install ODBC dependencies for SQL Server reporter/Data Logger support.
- `--odbc-driver NAME`: choose `freetds` or `ms`; default is `freetds`.
- `--with-pjsip`: build/install pjproject `pjsua` for SIP alarm notification callouts.
- `--no-pjsip`: skip pjproject/`pjsua`.
- `--init-historian-db`: create a local Postgres role/database and load historian schema.

Service options:

- `--no-start`: install but do not start services.
- `--no-enable`: install but do not enable services at boot.
- `--scada-systemd-sudo`: configure sudoers so SCADA can manage `opcbridge.service`.
- `-y`, `--yes`: non-interactive defaults.
- `-h`, `--help`: show installer help.

Notes:

- Config root defaults to `/etc/opcbridge`.
- Shared tokens and ports live in `/etc/opcbridge/opcbridge.env`.
- Data defaults to `/var/lib/opcbridge` (SQLite/state).
- Alarms and notifications:
  - `--full` installs `opcbridge-alarms`.
  - SIP callouts require pjproject `pjsua`. Use `--with-pjsip` explicitly when you want SIP callout support. A full dependency install with `--deps` also builds `pjsua` unless `--no-pjsip` is passed.
  - Alarm configuration lives under `/etc/opcbridge/alarms` and runtime data under `/var/lib/opcbridge/alarms`.
- Data Logger / reporter:
  - `--full` installs `opcbridge-reporter`.
  - Reporter config defaults to `/etc/opcbridge/reporter`.
  - Reporter runtime state defaults to `/var/lib/opcbridge/reporter`.
  - The installer creates `databases.json`, `reports.json`, and `data_checks.json` when missing.
- Node-based components (`opcbridge-hmi`, `opcbridge-scada`) need `npm` packages:
  - Automatic (requires network): `sudo ./install.sh --with-node-deps`
  - Manual: `cd /opt/opcbridge-suite/hmi && sudo -u opcbridge env HOME=/var/lib/opcbridge NPM_CONFIG_CACHE=/var/lib/opcbridge/.npm npm ci --omit=dev`

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
