# opcbridge-suite

Monorepo for the opcbridge ecosystem:

- `opcbridge/` (core industrial data bridge)
- `opcbridge-alarms/` (alarm server)
- `opcbridge-scada/` (SCADA configuration/console UI)
- `opcbridge-hmi/` (HMI)
- `opcbridge-reporter/` (optional reporter)

## Documentation

- Core engine manual: `opcbridge/docs/manual.md`
- Suite architecture: `docs/architecture.md`
- SCADA app readme: `opcbridge-scada/README.md`

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
