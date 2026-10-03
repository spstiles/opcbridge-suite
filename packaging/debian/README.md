# Experimental Debian package

The first binary package targets Debian 13 (trixie), amd64. It contains all eight
suite components. The source installer remains supported for selecting individual
components; this package is an additional distribution method, not its replacement.

Install with `sudo apt install ./opcbridge-suite_0.5.35-1_amd64.deb`.
Fresh installation creates the opcbridge service account and seeds missing settings.
It does not enable services, change PostgreSQL, add third-party apt repositories,
download dependencies through npm/Composer, or migrate databases during configuration.
Start only the desired services, for example:

    sudo systemctl enable --now opcbridge opcbridge-scada opcbridge-hmi

Ports are configured in `/etc/opcbridge/opcbridge.env`. HMI is on port 3000 and
SCADA on 3010 by default. Their settings and credentials must be reviewed before
exposing either interface to a network. Optional SIP uses Baresip; bundled PJSUA2
support and the pjsua helper are not provided by this first package.
Historian requires a separately configured PostgreSQL/TimescaleDB installation.
Use the source installer's documented database workflow on script-managed systems,
or configure the database before enabling the packaged historian. No database is
created or migrated by the package.

## Existing installations and ownership

Standard script installations at `/opt/opcbridge-suite` can be adopted by installing
the package: binaries are replaced, but existing settings, screens, uploads, data,
and systemd overrides are retained. Back up these locations before adoption:
`/etc/opcbridge`, `/var/lib/opcbridge`, and mutable HMI files beneath
`/opt/opcbridge-suite/hmi`. Custom-prefix/user installations require manual review.
Existing `/etc/systemd/system` units override the packaged `/usr/lib/systemd/system`
units; inspect them with `systemctl cat` and retain intentional customizations.
Only already active services are restarted on upgrades.

Do not run the source installer or uninstaller against the package-managed prefix.
They detect the installed package and direct you to apt. For component-specific
script upgrades, keep a script-managed installation. To return from apt to the
script, first run `sudo apt remove opcbridge-suite`, then use install.sh normally.
It will reuse preserved settings/data. Avoid running script and package-managed
installations against the same configuration/data concurrently.

Both removal and purge preserve site settings, credentials, screens, uploads,
databases, logs and the service account. Data deletion is a separate explicit
administrator action. Built-in application/assets are package-owned and removed;
user-created HMI files are not archive members and remain.

## Building

Use a disposable Debian 13 amd64 container/VM, with a clean source checkout and
an output directory at `/out`. Run `packaging/debian/build-in-debian.sh /out` as
root inside that environment. It installs build dependencies there, builds pinned
libplctag v2.6.12 and IXWebSocket v11.4.6, compiles the native components, installs
locked npm/Composer dependencies, and assembles the archive with private libplctag
and derived Debian shared-library dependencies. Do not run this builder on a
production installation. It creates a local `debian/control` build-only file.

Publish the `.deb`, dependency-source archive, checksums, and validation notes
alongside a source tag. Suite source includes the vendored open62541 source.
The first release remains experimental; broad field testing and database/SIP validation
are required before treating it as production-ready.

## Automated validation

The manual GitHub workflow builds in `debian:trixie-slim` and uses a second clean
Debian container to run `test-package.sh`. That test verifies ELF library resolution,
component version commands, Python/Node/PHP dependency loading, preservation of
credentials/screens/uploads across reinstall and removal/purge, and installer
ownership guards. Service-account startup is checked by the script; the initial prerelease is also
validated in a disposable Debian VM. Existing production database migration and
optional hardware/SIP testing remain separate requirements for a stable release.
