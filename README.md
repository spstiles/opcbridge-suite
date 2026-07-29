# OPCBridge Suite

OPCBridge Suite is a complete SCADA stack for industrial automation:

- **OPCBridge**: communications core (PLC/RTU drivers, tags, REST, WebSockets, OPC UA)
- **OPCBridge-SCADA**: configuration / control-center UI
- **OPCBridge-Alarms**: alarm evaluation + routing + notifications (SIP/voice modem + email)
- **OPCBridge-Logger**: scheduled data logging and data checks
- **OPCBridge-Report**: published historian reports and spreadsheet downloads
- **OPCBridge-Historian**: time-series storage to Postgres/TimescaleDB
- **OPCBridge-HMI**: HMI runtime + editor

![OPCBridge-SCADA landing page](docs/manual/screenshots/opcbridge-scada-landing-page.png)

## Quick Start (Debian 12+)

Requirements:

- Debian 12+ (or derivative: Ubuntu, Linux Mint, etc.)
- `sudo` access
- Network access (deps + Node packages)

Install:

```bash
sudo apt update
sudo apt install -y git

git clone https://github.com/spstiles/opcbridge-suite.git
cd opcbridge-suite

# full suite + deps (includes Node deps for SCADA/HMI)
sudo ./install.sh --full --deps -y
```

If you want SIP callout support (build/install pjproject `pjsua`):

```bash
sudo ./install.sh --full --deps --with-pjsip -y
```

First login:

1. Open the OPCBridge dashboard: `http://<host>:8080/`
2. Click `Initialize users` (first-time setup) and create the initial admin account
3. Open SCADA: `http://<host>:3010/`

## Manual (Recommended)

The full suite manual (screenshots + workflows) lives here:

- `docs/manual/OPCBridge-Suite-Manual.md`

## Local Development

Install the native build dependencies once (Debian/Ubuntu/Linux Mint):

```bash
sudo ./install.sh --full --deps --no-pjsip --no-start --no-enable -y
```

`--no-pjsip` keeps the optional SIP/voice dependency out of the normal
development setup. Omit it when developing SIP callouts.

Build the native services and install the HMI packages:

```bash
./opcbridge/build.sh
./opcbridge-alarms/build.sh
./opcbridge-historian/build.sh
make -B -C opcbridge-logger
npm ci --prefix opcbridge-hmi
```

When upgrading an installation that still uses `opcbridge-reporter`, the
installer copies its configuration and runtime state to the logger locations,
starts `opcbridge-logger`, and verifies its health before removing the old
executable and systemd units. If verification fails, it restarts the former
reporter service. Legacy config/data directories are retained for rollback and
are removed by `uninstall.sh --purge`.

Start the core and alarm services for development:

```bash
./opcbridge/scripts/dev_run.sh
```

In separate terminals, start the web applications:

```bash
node opcbridge-scada/server.js
npm start --prefix opcbridge-hmi
```

Stop the native development services with
`./opcbridge/scripts/dev_stop.sh`. Local configuration, tokens, logs, and
runtime data are gitignored.

### Versioning

Every component release bumps that component's `VERSION` file and the suite's
top-level `VERSION` file. Components not included in the change keep their
current versions.

## Updating

```bash
cd /opt/opcbridge-suite
sudo git pull
sudo ./install.sh --full --deps -y
```

Verify versions in **SCADA → Configure Server**.

## Additional Docs

- Suite architecture: `docs/architecture.md`
- System tags: `docs/system_tags.md`
- SCADA developer notes: `opcbridge-scada/README.md`
