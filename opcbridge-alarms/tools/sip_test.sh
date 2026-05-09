#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  sip_test.sh --server <ip[:port]> --ext <user> --pass <password> --to <number|sip_uri> [--transport udp|tcp|tls] [--duration <sec>]
  sip_test.sh --server <ip[:port]> --ext <user> --to <number|sip_uri> [--transport udp|tcp|tls] [--duration <sec>]
  sip_test.sh --server <ip[:port]> --ext <user> --to <number|sip_uri> --keep-log [--transport udp|tcp|tls] [--duration <sec>]
  sip_test.sh --server <ip[:port]> --ext <user> --to <number|sip_uri> --net-if <iface> [--transport udp|tcp|tls] [--duration <sec>]

Examples:
  SIP_PASS='mypass' ./sip_test.sh --server 10.0.0.10:5060 --ext 1000 --to 15555551212 --duration 20
  SIP_PASS='mypass' ./sip_test.sh --server 10.0.0.10:5060 --ext 1000 --pass 'mypass' --to 15555551212 --duration 20
  SIP_PASS='mypass' ./sip_test.sh --server 10.0.0.10:5060 --ext 1000 --pass "$SIP_PASS" --to sip:15555551212@10.0.0.10:5060

Notes:
  - Requires a SIP UA binary. This script prefers `pjsua` (when available) and falls back to `baresip`.
  - Headless-friendly: uses `--null-audio` so it does not require ALSA/Pulse devices.
  - Exit codes:
      0  call ran (best-effort) and did not obviously fail
      2  missing dependency (pjsua)
      3  argument error
      4  registration/auth failure (best-effort parse)
      5  call failure (best-effort parse)
EOF
}

SERVER=""
EXT=""
PASS=""
TO=""
TRANSPORT="udp"
DURATION="20"
KEEP_LOG=0
NET_IF=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server) SERVER="${2:-}"; shift 2;;
    --ext|--user|--username) EXT="${2:-}"; shift 2;;
    --pass|--password) PASS="${2:-}"; shift 2;;
    --to) TO="${2:-}"; shift 2;;
    --transport) TRANSPORT="$(echo "${2:-}" | tr '[:upper:]' '[:lower:]')"; shift 2;;
    --duration) DURATION="${2:-}"; shift 2;;
    --net-if) NET_IF="${2:-}"; shift 2;;
    --keep-log) KEEP_LOG=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 3;;
  esac
done

if [[ -z "$PASS" ]]; then
  PASS="${SIP_PASS:-}"
fi

if [[ -z "$SERVER" || -z "$EXT" || -z "$PASS" || -z "$TO" ]]; then
  echo "Missing required args." >&2
  usage >&2
  exit 3
fi

if [[ "$TRANSPORT" != "udp" && "$TRANSPORT" != "tcp" && "$TRANSPORT" != "tls" ]]; then
  echo "Invalid --transport '$TRANSPORT' (expected udp|tcp|tls)" >&2
  exit 3
fi

have_pjsua=0
have_baresip=0
command -v pjsua >/dev/null 2>&1 && have_pjsua=1
command -v baresip >/dev/null 2>&1 && have_baresip=1
if [[ "$have_pjsua" -eq 0 && "$have_baresip" -eq 0 ]]; then
  echo "Missing dependency: SIP user-agent (pjsua or baresip)" >&2
  echo "Install (recommended): sudo apt-get install -y baresip" >&2
  exit 2
fi

hostport="$SERVER"
server_host="${hostport%%:*}"
server_port="${hostport#*:}"
if [[ "$server_port" == "$server_host" ]]; then
  server_port="5060"
fi

detect_net_if() {
  local host="$1"
  local ip="$host"
  if [[ -z "$ip" ]]; then
    return 1
  fi
  if [[ "$ip" != *.* && "$ip" != *:* ]]; then
    if command -v getent >/dev/null 2>&1; then
      ip="$(getent hosts "$host" | awk '{print $1}' | head -n 1)"
    fi
  fi
  if [[ -z "$ip" ]]; then
    return 1
  fi
  if ! command -v ip >/dev/null 2>&1; then
    return 1
  fi
  # Example: "10.20.30.162 via 172.22.44.60 dev tun1 src 172.18.0.65 uid 1000"
  ip route get "$ip" 2>/dev/null | awk '{
    for (i=1; i<=NF; i++) if ($i=="dev" && (i+1)<=NF) {print $(i+1); exit}
  }'
}

if [[ -z "$NET_IF" ]]; then
  NET_IF="$(detect_net_if "$server_host" || true)"
fi

registrar="sip:${server_host}:${server_port};transport=${TRANSPORT}"
account_id="sip:${EXT}@${server_host}"
dest="$TO"
if [[ "$dest" != sip:* ]]; then
  # Let the account decide transport/route; keep the request URI simple.
  dest="sip:${dest}@${server_host}:${server_port}"
fi

tmp="$(mktemp -t opcbridge-sip-test.XXXXXX.log)"
cleanup() {
  if [[ "$KEEP_LOG" -eq 1 ]]; then
    echo "Log kept at: $tmp" >&2
    return 0
  fi
  rm -f "$tmp"
}
trap cleanup EXIT

echo "Registering as ${EXT} to ${registrar}"
echo "Calling ${dest} (duration=${DURATION}s, transport=${TRANSPORT})"
if [[ -n "${NET_IF:-}" ]]; then
  echo "Using network interface: ${NET_IF}"
fi

rc=0
if [[ "$have_pjsua" -eq 1 ]]; then
  set +e
  pjsua \
    --null-audio \
    --log-level 4 \
    --app-log-level 4 \
    --id "$account_id" \
    --registrar "$registrar" \
    --username "$EXT" \
    --password "$PASS" \
    --realm '*' \
    --use-srtp 0 \
    --rtp-port 40000 \
    --no-vad \
    --auto-update-nat 1 \
    --duration "$DURATION" \
    --make-call "$dest" \
    >"$tmp" 2>&1
  rc=$?
  set -e
else
  # baresip fallback (package: baresip)
  # We run it headless with a minimal config directory. We prefer copying an existing
  # config from /etc/baresip or ~/.baresip. If neither exists, we bootstrap a minimal
  # config from the packaged example.
  cfgsrc=""
  if [[ -d /etc/baresip ]]; then
    cfgsrc="/etc/baresip"
  elif [[ -d "${HOME}/.baresip" ]]; then
    cfgsrc="${HOME}/.baresip"
  fi

  cfgdir="$(mktemp -d -t opcbridge-baresip.XXXXXX)"
  if [[ -n "$cfgsrc" ]]; then
    cp -a "$cfgsrc/." "$cfgdir/" 2>/dev/null || true
  fi
  if [[ ! -f "$cfgdir/config" ]]; then
    if [[ -r /usr/share/doc/baresip-core/examples/config ]]; then
      cp -f /usr/share/doc/baresip-core/examples/config "$cfgdir/config"
    elif [[ -r /usr/share/doc/baresip-core/examples/config.gz ]]; then
      zcat -f /usr/share/doc/baresip-core/examples/config.gz >"$cfgdir/config"
    else
      echo "baresip is installed but no default config found and packaged example is missing." >&2
      echo "Run `baresip` once to generate ~/.baresip, then re-run this script." >&2
      exit 2
    fi

    # Make the example config headless-friendly by stripping GUI/video modules.
    # Keep SIP + audio codecs + ALSA driver + stdio UI.
    grep -v -E '(^module\\s+v4l2\\.so$|^module\\s+x11\\.so$|^module\\s+avcodec\\.so$|^module_app\\s+gtk\\.so$|^module\\s+directfb\\.so$|^module\\s+sdl\\.so$)' \
      "$cfgdir/config" >"$cfgdir/config.tmp" || true
    mv "$cfgdir/config.tmp" "$cfgdir/config"

    # Ensure module_path points to the packaged module directory.
    if ! grep -q '^module_path' "$cfgdir/config"; then
      printf '%s\n' 'module_path\t\t/usr/lib/baresip/modules' >>"$cfgdir/config"
    fi
  fi

  # Override accounts for this test.
  # Account URI format (common baresip style):
  #   <sip:user@host[:port]>;auth_user=user;auth_pass=pass;regint=600;transport=udp
  cat >"$cfgdir/accounts" <<EOF
<sip:${EXT}@${server_host}:${server_port}>;auth_user=${EXT};auth_pass=${PASS};regint=600;transport=${TRANSPORT}
EOF

  # Minimal required file for many setups; can be empty.
  : >"$cfgdir/contacts"

  set +e
  # Keep stdin open while the call is up; stdio.so may quit on EOF otherwise.
  (
    echo "/dial ${dest}"
    sleep "${DURATION}"
    echo "/hangup"
    echo "/quit"
  ) | baresip -f "$cfgdir" ${NET_IF:+-n "$NET_IF"} -v -s >"$tmp" 2>&1
  rc=$?
  set -e
fi

if [[ "$rc" -ne 0 ]]; then
  echo "SIP UA exited non-zero: $rc" >&2
  tail -n 80 "$tmp" >&2 || true
  exit 5
fi

# Best-effort parse for common auth failures (response lines only).
if grep -E "^SIP/2\\.0[[:space:]]+401\\b|Unauthorized" "$tmp" >/dev/null 2>&1; then
  echo "Registration/auth may have failed (401/Unauthorized detected)." >&2
  echo "SIP response codes seen:" >&2
  grep -Eo "^SIP/2\\.0[[:space:]]+[0-9]{3}" "$tmp" | tail -n 20 >&2 || true
  tail -n 160 "$tmp" >&2 || true
  exit 4
fi

if ! grep -Eo "^SIP/2\\.0[[:space:]]+[0-9]{3}" "$tmp" >/dev/null 2>&1; then
  echo "No SIP responses detected in log (REGISTER/INVITE may not be reaching the server, or replies are blocked)." >&2
  echo "Tip: verify you can reach ${server_host}:${server_port} over your VPN and that UDP/${server_port} is allowed." >&2
  echo "Tip: if you're on a VPN, try `--net-if tun0` (or your VPN interface) so the SIP stack binds to the VPN path." >&2
  echo "Tip: try `--transport tcp` if UDP is blocked across the VPN." >&2
  tail -n 160 "$tmp" >&2 || true
  exit 5
fi

if grep -E "Call.*DISCONNECTED" "$tmp" >/dev/null 2>&1; then
  echo "Call completed (disconnected)."
  exit 0
fi

# If it ran to completion without obvious signals, treat as OK but show tail.
echo "Call attempt finished. Review log tail for details:"
tail -n 120 "$tmp" || true
exit 0
