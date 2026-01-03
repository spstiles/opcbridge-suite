#!/usr/bin/env bash
set -euo pipefail

PREFIX="/opt/opcbridge-suite"
CONFIG_ROOT="/etc/opcbridge"
DATA_ROOT="/var/lib/opcbridge"
LOG_ROOT="/var/log/opcbridge"
PURGE=0

usage() {
  echo "Usage: sudo ./uninstall.sh [--purge] [--prefix DIR] [--config DIR] [--data DIR] [--logs DIR]"
}

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge) PURGE=1; shift;;
    --prefix) PREFIX="${2:-}"; shift 2;;
    --config) CONFIG_ROOT="${2:-}"; shift 2;;
    --data) DATA_ROOT="${2:-}"; shift 2;;
    --logs) LOG_ROOT="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

have_cmd() { command -v "$1" >/dev/null 2>&1; }

if have_cmd systemctl; then
  for svc in opcbridge-hmi opcbridge-scada opcbridge-alarms opcbridge; do
    if systemctl cat "$svc" >/dev/null 2>&1; then
      systemctl stop "$svc" >/dev/null 2>&1 || true
      systemctl disable "$svc" >/dev/null 2>&1 || true
      rm -f "/etc/systemd/system/${svc}.service"
    fi
  done

  # Reporter per-report timers/services are managed by opcbridge-scada. Keep them unless --purge.
  if [[ "$PURGE" -eq 1 ]]; then
    for tmr in /etc/systemd/system/opcbridge-reporter-*.timer; do
      [[ -e "$tmr" ]] || continue
      unit="$(basename "$tmr")"
      systemctl disable --now "$unit" >/dev/null 2>&1 || true
      rm -f "$tmr" || true
      rm -f "/etc/systemd/system/${unit%.timer}.service" || true
    done

    # Remove scada sudoers drop-in (created by installer option A).
    rm -f "/etc/sudoers.d/opcbridge-scada-systemd" || true
  fi
  systemctl daemon-reload || true
fi

rm -rf "$PREFIX" || true

echo "Removed installed files under $PREFIX."

if [[ "$PURGE" -eq 1 ]]; then
  rm -rf "$CONFIG_ROOT" "$DATA_ROOT" "$LOG_ROOT" || true
  echo "Purged $CONFIG_ROOT $DATA_ROOT $LOG_ROOT."
else
  echo "Kept config/data/logs. Re-run with --purge to delete them."
fi
