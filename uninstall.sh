#!/usr/bin/env bash
set -euo pipefail

PREFIX="/opt/opcbridge-suite"
CONFIG_ROOT="/etc/opcbridge"
DATA_ROOT="/var/lib/opcbridge"
LOG_ROOT="/var/log/opcbridge"
SERVICE_USER="opcbridge"
SERVICE_GROUP="opcbridge"
PURGE=0
DRY_RUN=0
REMOVE_USER=0

usage() {
  cat <<EOF
Usage: sudo ./uninstall.sh [options]

Options:
  --dry-run              Print actions without changing the system
  --purge                Delete config, data, and logs in addition to installed files
  --remove-user          Remove the service user/group if unused elsewhere
  --prefix DIR           Install prefix (default: ${PREFIX})
  --config DIR           Config root (default: ${CONFIG_ROOT})
  --data DIR             Data root (default: ${DATA_ROOT})
  --logs DIR             Log root (default: ${LOG_ROOT})
  --user USER            Service user (default: ${SERVICE_USER})
  --group GROUP          Service group (default: ${SERVICE_GROUP})
  -h, --help             Show this help

Default behavior removes services and ${PREFIX}, but preserves config/data/logs.
Use --purge only when you intentionally want to delete production data/config.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
    --purge) PURGE=1; shift;;
    --remove-user) REMOVE_USER=1; shift;;
    --prefix) PREFIX="${2:-}"; shift 2;;
    --config) CONFIG_ROOT="${2:-}"; shift 2;;
    --data) DATA_ROOT="${2:-}"; shift 2;;
    --logs) LOG_ROOT="${2:-}"; shift 2;;
    --user) SERVICE_USER="${2:-}"; shift 2;;
    --group) SERVICE_GROUP="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

if [[ "${EUID}" -ne 0 && "$DRY_RUN" -ne 1 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

have_cmd() { command -v "$1" >/dev/null 2>&1; }

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

remove_file() {
  local path="$1"
  if [[ -e "$path" || -L "$path" ]]; then
    run rm -f "$path"
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: skip missing file $path"
  fi
}

remove_dir() {
  local path="$1"
  if [[ -e "$path" || -L "$path" ]]; then
    run rm -rf "$path"
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: skip missing directory $path"
  fi
}

systemd_unit_exists() {
  local unit="$1"
  systemctl cat "$unit" >/dev/null 2>&1 || systemctl list-unit-files "$unit" --no-legend 2>/dev/null | grep -q .
}

stop_disable_unit() {
  local unit="$1"
  if ! have_cmd systemctl; then
    return 0
  fi
  if systemd_unit_exists "$unit"; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      run systemctl stop "$unit"
      run systemctl disable "$unit"
    else
      systemctl stop "$unit" >/dev/null 2>&1 || true
      systemctl disable "$unit" >/dev/null 2>&1 || true
    fi
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: systemd unit not present: $unit"
  fi
}

remove_unit_file_and_dropins() {
  local unit="$1"
  remove_file "/etc/systemd/system/${unit}"
  remove_dir "/etc/systemd/system/${unit}.d"
}

echo "Uninstalling opcbridge-suite"
echo "  Prefix:  $PREFIX"
echo "  Config:  $CONFIG_ROOT $([[ "$PURGE" -eq 1 ]] && echo '(purge)' || echo '(preserve)')"
echo "  Data:    $DATA_ROOT $([[ "$PURGE" -eq 1 ]] && echo '(purge)' || echo '(preserve)')"
echo "  Logs:    $LOG_ROOT $([[ "$PURGE" -eq 1 ]] && echo '(purge)' || echo '(preserve)')"
[[ "$DRY_RUN" -eq 1 ]] && echo "  Mode:    dry-run"

if have_cmd systemctl; then
  # Stop dependents first, core last.
  for svc in \
    opcbridge-hmi.service \
    opcbridge-scada.service \
    opcbridge-historian.service \
    opcbridge-reporter.service \
    opcbridge-alarms.service \
    opcbridge.service
  do
    stop_disable_unit "$svc"
  done

  # Legacy/per-report reporter units. These are runtime-generated and can keep
  # firing after the main install is gone if not explicitly disabled.
  while read -r unit _rest; do
    [[ -n "${unit:-}" ]] || continue
    stop_disable_unit "$unit"
  done < <(systemctl list-unit-files 'opcbridge-reporter-*.timer' --no-legend 2>/dev/null || true)
  while read -r unit _rest; do
    [[ -n "${unit:-}" ]] || continue
    stop_disable_unit "$unit"
  done < <(systemctl list-unit-files 'opcbridge-reporter-*.service' --no-legend 2>/dev/null || true)

  for svc in \
    opcbridge.service \
    opcbridge-alarms.service \
    opcbridge-scada.service \
    opcbridge-hmi.service \
    opcbridge-reporter.service \
    opcbridge-historian.service
  do
    remove_unit_file_and_dropins "$svc"
  done

  for unit_file in /etc/systemd/system/opcbridge-reporter-*.timer /etc/systemd/system/opcbridge-reporter-*.service; do
    [[ -e "$unit_file" ]] || continue
    remove_file "$unit_file"
    remove_dir "${unit_file}.d"
  done

  if [[ "$DRY_RUN" -eq 1 ]]; then
    run systemctl daemon-reload
    run systemctl reset-failed
  else
    systemctl daemon-reload >/dev/null 2>&1 || true
    systemctl reset-failed >/dev/null 2>&1 || true
  fi
fi

# Installer-created sudoers/drop-in files.
remove_file "/etc/sudoers.d/opcbridge-scada-systemd"

# Installer-created linker config for bundled/source-built local libs.
local_ldconfig_changed=0
for conf in /etc/ld.so.conf.d/opcbridge-local.conf /etc/ld.so.conf.d/opcbridge-pjproject.conf; do
  if [[ -e "$conf" || -L "$conf" ]]; then
    remove_file "$conf"
    local_ldconfig_changed=1
  fi
done
if [[ "$local_ldconfig_changed" -eq 1 ]] && have_cmd ldconfig; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    run ldconfig
  else
    ldconfig >/dev/null 2>&1 || true
  fi
fi

remove_dir "$PREFIX"
echo "Removed installed files under $PREFIX."

if [[ "$PURGE" -eq 1 ]]; then
  remove_dir "$CONFIG_ROOT"
  remove_dir "$DATA_ROOT"
  remove_dir "$LOG_ROOT"
  echo "Purged config/data/logs."
else
  echo "Kept config/data/logs. Re-run with --purge to delete them."
fi

if [[ "$REMOVE_USER" -eq 1 ]]; then
  if id -u "$SERVICE_USER" >/dev/null 2>&1; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      run userdel "$SERVICE_USER"
    else
      userdel "$SERVICE_USER" >/dev/null 2>&1 || true
    fi
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: service user not present: $SERVICE_USER"
  fi
  if getent group "$SERVICE_GROUP" >/dev/null 2>&1; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      run groupdel "$SERVICE_GROUP"
    else
      groupdel "$SERVICE_GROUP" >/dev/null 2>&1 || true
    fi
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: service group not present: $SERVICE_GROUP"
  fi
else
  echo "Kept service user/group (${SERVICE_USER}:${SERVICE_GROUP}). Use --remove-user to remove them."
fi

echo "Uninstall complete."
