#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OPCBRIDGE_HTTP_PORT="${OPCBRIDGE_HTTP_PORT:-8080}"
OPCBRIDGE_WS_PORT="${OPCBRIDGE_WS_PORT:-8090}"
OPCBRIDGE_OPCUA_PORT="${OPCBRIDGE_OPCUA_PORT:-4840}"
ALARMS_HTTP_PORT="${ALARMS_HTTP_PORT:-8085}"
ALARMS_WS_PORT="${ALARMS_WS_PORT:-8086}"
OPCBRIDGE_STARTUP_WAIT_SECS="${OPCBRIDGE_STARTUP_WAIT_SECS:-600}"

mkdir -p "$ROOT/_run" "$ROOT/_logs"
TOKEN_FILE="$ROOT/_run/admin_service_token.txt"
WRITE_TOKEN_FILE="$ROOT/_run/write_token.txt"
ENV_FILE="$ROOT/_run/dev_env.sh"

OPCBRIDGE_BIN="$ROOT/opcbridge"
ALARMS_ROOT="$ROOT/../opcbridge-alarms"
ALARMS_BIN="$ALARMS_ROOT/opcbridge-alarms"

if [[ ! -x "$OPCBRIDGE_BIN" ]]; then
  echo "Missing binary: $OPCBRIDGE_BIN"
  echo "Build with: ./build.sh"
  exit 1
fi

if [[ ! -x "$ALARMS_BIN" ]]; then
  echo "Missing binary: $ALARMS_BIN"
  echo "Build with: (cd \"$ALARMS_ROOT\" && ./build.sh)"
  exit 1
fi

# Pick a service token:
# - Prefer caller-provided env var
# - Else reuse saved token from _run
# - Else generate a new token and save it
if [[ -n "${OPCBRIDGE_ADMIN_SERVICE_TOKEN:-}" ]]; then
  :
elif [[ -f "$TOKEN_FILE" ]]; then
  OPCBRIDGE_ADMIN_SERVICE_TOKEN="$(cat "$TOKEN_FILE" 2>/dev/null || true)"
fi

if [[ -z "${OPCBRIDGE_ADMIN_SERVICE_TOKEN:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    OPCBRIDGE_ADMIN_SERVICE_TOKEN="$(openssl rand -hex 16)"
  else
    OPCBRIDGE_ADMIN_SERVICE_TOKEN="dev-$(date +%s)-$$"
  fi
  umask 077
  printf "%s" "$OPCBRIDGE_ADMIN_SERVICE_TOKEN" >"$TOKEN_FILE"
fi

export OPCBRIDGE_ADMIN_SERVICE_TOKEN

# For development: default the write token to the admin service token (can be overridden by caller).
if [[ -z "${OPCBRIDGE_WRITE_TOKEN:-}" ]]; then
  OPCBRIDGE_WRITE_TOKEN="${OPCBRIDGE_ADMIN_SERVICE_TOKEN}"
fi
export OPCBRIDGE_WRITE_TOKEN

umask 077
printf "%s" "$OPCBRIDGE_WRITE_TOKEN" >"$WRITE_TOKEN_FILE"

echo "Restarting dev services (using pid files in $ROOT/_run)..."
"$ROOT/scripts/dev_stop.sh" >/dev/null 2>&1 || true

umask 077
cat >"$ENV_FILE" <<EOF
#!/usr/bin/env bash
export OPCBRIDGE_ADMIN_SERVICE_TOKEN="${OPCBRIDGE_ADMIN_SERVICE_TOKEN}"
export OPCBRIDGE_WRITE_TOKEN="${OPCBRIDGE_WRITE_TOKEN}"
EOF
chmod +x "$ENV_FILE"

if [[ -f "$ROOT/_run/opcbridge.pid" ]] && kill -0 "$(cat "$ROOT/_run/opcbridge.pid")" 2>/dev/null; then
  echo "opcbridge already running (pid $(cat "$ROOT/_run/opcbridge.pid"))."
else
  echo "Starting opcbridge..."
  : >"$ROOT/_logs/opcbridge.log"
  "$OPCBRIDGE_BIN" --config "$ROOT/config" --http --ws --ws-port "$OPCBRIDGE_WS_PORT" --opcua --opcua-port "$OPCBRIDGE_OPCUA_PORT" \
    >"$ROOT/_logs/opcbridge.log" 2>&1 &
  echo $! >"$ROOT/_run/opcbridge.pid"
fi

echo "Waiting for opcbridge HTTP on :$OPCBRIDGE_HTTP_PORT ..."
ready_http=0
for _ in $(seq 1 $((OPCBRIDGE_STARTUP_WAIT_SECS * 4))); do
  if curl -sS "http://127.0.0.1:${OPCBRIDGE_HTTP_PORT}/auth/status" >/dev/null 2>&1; then
    ready_http=1
    break
  fi
  sleep 0.25
done
if [[ "$ready_http" != "1" ]]; then
  echo "Warning: opcbridge HTTP did not respond within ${OPCBRIDGE_STARTUP_WAIT_SECS}s."
fi

echo "Waiting for opcbridge WS on :$OPCBRIDGE_WS_PORT ..."
ready_ws=0
for _ in $(seq 1 $((OPCBRIDGE_STARTUP_WAIT_SECS * 4))); do
  if command -v wscat >/dev/null 2>&1; then
    if wscat --no-color -c "ws://127.0.0.1:${OPCBRIDGE_WS_PORT}" -x "{\"type\":\"subscribe\",\"tags\":[]}" -w 1 >/dev/null 2>&1; then
      ready_ws=1
      break
    fi
  else
    if (echo >/dev/tcp/127.0.0.1/"$OPCBRIDGE_WS_PORT") >/dev/null 2>&1; then
      ready_ws=1
      break
    fi
  fi
  sleep 0.25
done
if [[ "$ready_ws" != "1" ]]; then
  echo "Warning: opcbridge WS did not accept connections within ${OPCBRIDGE_STARTUP_WAIT_SECS}s."
fi

if [[ -f "$ROOT/_run/opcbridge-alarms.pid" ]] && kill -0 "$(cat "$ROOT/_run/opcbridge-alarms.pid")" 2>/dev/null; then
  echo "opcbridge-alarms already running (pid $(cat "$ROOT/_run/opcbridge-alarms.pid"))."
else
  echo "Starting opcbridge-alarms..."
  : >"$ROOT/_logs/opcbridge-alarms.log"
  "$ALARMS_BIN" \
    --config "$ALARMS_ROOT/config" \
    --opcbridge-host 127.0.0.1 \
    --opcbridge-http-port "$OPCBRIDGE_HTTP_PORT" \
    --opcbridge-ws-port "$OPCBRIDGE_WS_PORT" \
    --http-port "$ALARMS_HTTP_PORT" \
    --ws-port "$ALARMS_WS_PORT" \
    --opcua \
    --admin-token "$OPCBRIDGE_ADMIN_SERVICE_TOKEN" \
    >"$ROOT/_logs/opcbridge-alarms.log" 2>&1 &
  echo $! >"$ROOT/_run/opcbridge-alarms.pid"
fi

echo ""
echo "Admin service token:"
echo "  len: $(echo -n "$OPCBRIDGE_ADMIN_SERVICE_TOKEN" | wc -c | tr -d ' ')"
echo "  file: $TOKEN_FILE"
echo "  source for curl: source \"$ENV_FILE\""
echo ""
echo "Write token:"
echo "  len: $(echo -n "$OPCBRIDGE_WRITE_TOKEN" | wc -c | tr -d ' ')"
echo "  file: $WRITE_TOKEN_FILE"
echo ""
echo "PIDs:"
echo "  opcbridge:        $(cat "$ROOT/_run/opcbridge.pid")"
echo "  opcbridge-alarms: $(cat "$ROOT/_run/opcbridge-alarms.pid")"
echo ""
echo "Logs:"
echo "  tail -f \"$ROOT/_logs/opcbridge.log\""
echo "  tail -f \"$ROOT/_logs/opcbridge-alarms.log\""
echo ""
echo "Health checks:"
echo "  curl -sS http://127.0.0.1:${OPCBRIDGE_HTTP_PORT}/auth/status"
echo "  curl -sS -H \"X-Admin-Token: ${OPCBRIDGE_ADMIN_SERVICE_TOKEN}\" http://127.0.0.1:${OPCBRIDGE_HTTP_PORT}/config/alarms | head"
echo "  curl -sS http://127.0.0.1:${ALARMS_HTTP_PORT}/alarm/api/status | head"
echo "  wscat --no-color -c ws://127.0.0.1:${ALARMS_WS_PORT} -w 1"
echo "  opcua opcbridge:      opc.tcp://127.0.0.1:${OPCBRIDGE_OPCUA_PORT}"
echo "  opcua opcbridge-alarms: opc.tcp://127.0.0.1:4841"
echo ""
echo "Stop:"
echo "  \"$ROOT/scripts/dev_stop.sh\""
