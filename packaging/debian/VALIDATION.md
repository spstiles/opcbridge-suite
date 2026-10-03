# Debian package validation — 2026-10-03

Version: opcbridge-suite 0.5.35-1, Debian 13 amd64.

Built from suite source in an isolated Debian 13 filesystem using GCC 14,
libplctag v2.6.12, IXWebSocket v11.4.6, and locked npm/Composer dependencies.
No binaries, live settings, or credentials from the host's installed suite were
used in the package. libplctag is private to the package; runtime system library
dependencies are derived from the built ELF binaries.

Validated in a fresh official Debian 13 generic cloud VM under QEMU/KVM:

- Apt resolves runtime dependencies and configures the full package.
- All five native binaries report their versions; shared libraries resolve.
- Python olefile, HMI Node modules, and PHP spreadsheet/PDF classes load.
- Bridge websocket, HMI HTTP, and SCADA HTTP start as the real service account.
- Reinstall preserves credential/config hashes, screens, uploads, and data.
- Removal and purge retain operator data and credentials.
- Source installer detects package ownership and refuses conflicting writes.
- Six systemd services start: bridge, alarms, SCADA, HMI, logger, and flow.
- Reinstall while services are active keeps all six running and preserves data.
- All six return after a VM reboot with zero restarts; test data is retained.

Application regression checks: 122 HMI tests, 35 SCADA tests, and 80 GraphWorX32
recovery tests pass. Shell syntax, Python source parsing, and whitespace checks pass.

The historian executable and report runtime are included. Historian database
provisioning/migration and TimescaleDB installation are deliberately separate.
Report dependency loading/listing is verified, but no real historian-backed report
was generated. Alarm hardware, live PLC protocols, and optional SIP/ODBC drivers
are not exercised by this package validation. The first package omits PJSUA2/pjsua;
Baresip is a recommended optional runtime. This is an experimental prerelease,
not a claim of complete production or hardware compatibility.
