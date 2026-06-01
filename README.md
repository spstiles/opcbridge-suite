# OPCBridge Suite

OPCBridge Suite is a complete SCADA stack for industrial automation:

- **OPCBridge**: communications core (PLC/RTU drivers, tags, REST, WebSockets, OPC UA)
- **OPCBridge-SCADA**: configuration / control-center UI
- **OPCBridge-Alarms**: alarm evaluation + routing + notifications (SIP/voice modem + email)
- **OPCBridge-Reporter**: data logger / data checks
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
