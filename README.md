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

## Why OPCBridge Exists

I have worked with SCADA and industrial control systems for a very long time,
and I love Linux. But OPCBridge exists for a more important reason.

Commercial SCADA platforms are built for the customers who can afford them.
Licensing, tag-count tiers, and mandatory support contracts add up fast—and for
a small utility or rural water district, that cost can be the difference
between modernizing and limping along on whatever was installed twenty years
ago. These systems are often monolithic and designed around the needs and
budgets of large customers, leaving smaller users with limited choices.

OPCBridge Suite exists because critical infrastructure should not be gated
behind a price tag. It is a free and open-source alternative that can support a
municipal water or wastewater system, a small industrial facility, a
laboratory, or even a home automation project. There are no licensing fees,
tag-count tiers, feature restrictions, or limits based on the size of the
system. The only real cost of entry should be the hardware used to run it.

This is not a theoretical concern. After a year and a half spent trying to get
a commercial alarm server to do what we actually needed—configuring it,
working with vendor support, and eventually hitting a wall—the answer turned
out to be software that already existed, built for exactly this problem. It is
now running in production, handling alarm callouts and data logging, and has
since been proposed for other applications after proving itself in daily use.

### A concrete example: data that quietly stops recording

Commercial historian services can silently stop logging because of a dropped
connection, crashed service, or stalled write. The first sign is often a gap
discovered days later, when someone runs a report and notices missing hours.

OPCBridge does more than log data; it watches the health of the process. It can
raise an alarm when a database connection drops or when a configurable data
check does not find the expected number of data points within a defined time
window. The interval and query are user-defined. What once required someone to
rerun a query after a report “looked off” can now run continuously in the
background, with an email sent as soon as something is wrong—before it becomes
a data gap that must be reconstructed later.

If a task has to be done repeatedly, it should be automated. That principle
runs throughout the suite.

### Built for Linux, on purpose

Most software in this industry is written for Windows, and that is a real
adoption barrier for a project like this. But running on Linux is not just a
preference. It means no forced operating-system reboots on a system that must
run around the clock, no update nagging on a closed network, and no operating-
system licensing cost stacked on top of everything else.

Whether you are a utility running OPCBridge in production or a hobbyist
experimenting with home automation, the barrier to trying it should be as
close to zero as possible. Everything should remain open, accessible, and
available without artificial limitation.

**Small utilities deserve modern tools too.**

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
