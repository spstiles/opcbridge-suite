#!/bin/bash
# Destructive only to a disposable Debian 13 test filesystem. Never use on a server.
set -euo pipefail
[[ "${OPCBRIDGE_DISPOSABLE_TEST:-}" == 1 ]] || { echo 'Set OPCBRIDGE_DISPOSABLE_TEST=1 inside a disposable Debian environment.' >&2; exit 1; }
package=$(realpath "$1")
export DEBIAN_FRONTEND=noninteractive
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d
chmod +x /usr/sbin/policy-rc.d
apt-get install -y --no-install-recommends "$package"
# Check all ELF libraries resolve and shipped application code stays readable.
for binary in /opt/opcbridge-suite/bin/opcbridge{,-alarms,-logger,-flow,-historian}; do
    if ldd "$binary" | grep -q 'not found'; then exit 1; fi
    timeout 15 "$binary" --version > /tmp/"$(basename "$binary")"-help.txt 2>&1
 done
python3 -c 'import olefile'
(cd /opt/opcbridge-suite/hmi && node -e 'require("express");require("fast-xml-parser")')
php -r 'require "/opt/opcbridge-suite/report/vendor/autoload.php"; if (!class_exists("PhpOffice\\PhpSpreadsheet\\Spreadsheet") || !class_exists("Mpdf\\Mpdf")) exit(1);'
php /opt/opcbridge-suite/report/opcbridge-report list > /tmp/report-help.txt
# Direct startup probes as the actual service account; no production endpoints.
cat > /tmp/opcbridge-scada-test.json <<'JSON'
{"listen":{"host":"127.0.0.1","port":13010},"opcbridge":{"host":"127.0.0.1","port":19080},"alarms":{"host":"127.0.0.1","port":19085}}
JSON
runuser -u opcbridge -- /opt/opcbridge-suite/bin/opcbridge --config /etc/opcbridge --ws --ws-port 19090 > /tmp/bridge-startup.log 2>&1 &
bridge_pid=$!
runuser -u opcbridge -- env PORT=13000 node /opt/opcbridge-suite/hmi/server.js > /tmp/hmi-startup.log 2>&1 &
hmi_pid=$!
runuser -u opcbridge -- env OPCBRIDGE_SCADA_CONFIG=/tmp/opcbridge-scada-test.json node /opt/opcbridge-suite/scada/server.js > /tmp/scada-startup.log 2>&1 &
scada_pid=$!
cleanup() { kill "$bridge_pid" "$hmi_pid" "$scada_pid" 2>/dev/null || true; wait "$bridge_pid" "$hmi_pid" "$scada_pid" 2>/dev/null || true; }
trap cleanup EXIT
python3 - <<'PYPROBE'
import socket,time,urllib.request
for port in (19090,13000,13010):
    for attempt in range(30):
        try:
            with socket.create_connection(('127.0.0.1',port),timeout=1): pass
            break
        except OSError:
            if attempt == 29: raise
            time.sleep(0.2)
for port in (13000,13010):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/',timeout=5) as response:
        assert response.status == 200
print('Bridge websocket, HMI HTTP, and SCADA HTTP service-account startup passed.')
PYPROBE
cleanup
trap - EXIT
mkdir -p /opt/opcbridge-suite/hmi/screens /var/lib/opcbridge/package-test
printf 'persistent-screen\n' > /opt/opcbridge-suite/hmi/screens/package-test.screen
printf 'persistent-upload\n' > /opt/opcbridge-suite/hmi/public/img/package-test.txt
printf 'persistent-data\n' > /var/lib/opcbridge/package-test/marker
before=$(sha256sum /etc/opcbridge/opcbridge.env /opt/opcbridge-suite/hmi/public/js/config.jsonc)
dpkg -i "$package"
[[ "$before" == "$(sha256sum /etc/opcbridge/opcbridge.env /opt/opcbridge-suite/hmi/public/js/config.jsonc)" ]]
grep -q persistent-screen /opt/opcbridge-suite/hmi/screens/package-test.screen
# The source installer must refuse to replace apt-owned files.
if bash /usr/lib/opcbridge-suite/installer-functions.sh --hmi-only --no-build -y > /tmp/installer-guard.txt 2>&1; then exit 1; fi
grep -q 'managed by' /tmp/installer-guard.txt
dpkg --remove opcbridge-suite
grep -q persistent-upload /opt/opcbridge-suite/hmi/public/img/package-test.txt
grep -q persistent-data /var/lib/opcbridge/package-test/marker
[[ -f /etc/opcbridge/opcbridge.env ]]
apt-get install -y --no-install-recommends "$package"
[[ "$before" == "$(sha256sum /etc/opcbridge/opcbridge.env /opt/opcbridge-suite/hmi/public/js/config.jsonc)" ]]
dpkg --purge opcbridge-suite
grep -q persistent-screen /opt/opcbridge-suite/hmi/screens/package-test.screen
grep -q persistent-data /var/lib/opcbridge/package-test/marker
[[ -f /etc/opcbridge/opcbridge.env ]]
echo 'Package dependency, reinstall, removal, purge, and state-preservation tests passed.'
