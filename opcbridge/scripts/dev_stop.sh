#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stop_one() {
  local name="$1"
  local pidfile="$2"

  if [[ ! -f "$pidfile" ]]; then
    echo "$name: not running (no pidfile)."
    return 0
  fi

  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    echo "$name: empty pidfile; removing."
    rm -f "$pidfile"
    return 0
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    echo "$name: stale pid $pid; removing pidfile."
    rm -f "$pidfile"
    return 0
  fi

  echo "Stopping $name (pid $pid)..."
  kill "$pid" 2>/dev/null || true

  for _ in $(seq 1 30); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pidfile"
      echo "$name: stopped."
      return 0
    fi
    sleep 0.1
  done

  echo "$name: did not exit quickly; sending SIGKILL."
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pidfile"
}

stop_one "opcbridge-alarms" "$ROOT/_run/opcbridge-alarms.pid"
stop_one "opcbridge" "$ROOT/_run/opcbridge.pid"
