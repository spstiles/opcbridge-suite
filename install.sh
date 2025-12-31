#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PREFIX="/opt/opcbridge-suite"
CONFIG_ROOT="/etc/opcbridge"
DATA_ROOT="/var/lib/opcbridge"
LOG_ROOT="/var/log/opcbridge"
ENV_FILE="${CONFIG_ROOT}/opcbridge.env"

SERVICE_USER="opcbridge"
SERVICE_GROUP="opcbridge"

BUILD=1
WITH_NODE_DEPS=0
INSTALL_DEPS=0
ASSUME_YES=0
START_SERVICES=1
ENABLE_SERVICES=1

PROFILE=""
COMPONENTS=()

usage() {
  cat <<USAGE
Usage: sudo ./install.sh [options]

Profiles:
  --opcbridge-only        Install only opcbridge (communication layer)
  --full                  Install opcbridge + alarms + scada + hmi + reporter

Component selection (overrides profiles):
  --components LIST       Comma-separated: opcbridge,alarms,scada,hmi,reporter

Options:
  --prefix DIR            Install prefix (default: ${PREFIX})
  --config DIR            Config root (default: ${CONFIG_ROOT})
  --data DIR              Data root (default: ${DATA_ROOT})
  --logs DIR              Log root (default: ${LOG_ROOT})
  --user USER             Service user (default: ${SERVICE_USER})
  --group GROUP           Service group (default: ${SERVICE_GROUP})
  --no-build              Do not build; use existing binaries
  --deps                  Install OS dependencies via apt
  --with-node-deps        Run npm install for Node services (requires network)
  --no-start              Do not start services
  --no-enable             Do not enable services at boot
  -y, --yes               Non-interactive defaults
  -h, --help              Show help

Notes:
- This script targets Debian 13 derivatives (systemd).
- It never writes secrets into the repo; tokens live in ${ENV_FILE}.
- --deps uses apt and needs package repo access.
USAGE
}

need_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root (use sudo)." >&2
    exit 1
  fi
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }


is_debian_like() {
  # shellcheck disable=SC1091
  if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    local id="${ID:-}"
    local like="${ID_LIKE:-}"
    if [[ "$id" == "debian" ]]; then
      return 0
    fi
    if echo "$like" | grep -Eq '(^|[[:space:]])debian([[:space:]]|$)'; then
      return 0
    fi
  fi
  return 1
}

APT_UPDATED=0
apt_update_once() {
  [[ "$APT_UPDATED" == "1" ]] && return 0
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  APT_UPDATED=1
}

apt_install() {
  if [[ "$#" -eq 0 ]]; then
    return 0
  fi
  export DEBIAN_FRONTEND=noninteractive
  apt_update_once
  apt-get install -y --no-install-recommends "$@"
}

install_deps() {
  if ! have_cmd apt-get; then
    echo "apt-get not found; cannot install dependencies automatically." >&2
    exit 1
  fi
  if ! is_debian_like; then
    echo "This installer currently supports --deps only on Debian-like systems." >&2
    exit 1
  fi

  local -a pkgs
  # Base runtime tools used by this installer.
  pkgs=(ca-certificates curl rsync)

  # For generating tokens if openssl is available.
  pkgs+=(openssl)

  # If we are building, install build tooling and common libs.
  if [[ "$BUILD" -eq 1 ]]; then
    pkgs+=(build-essential pkg-config)
    pkgs+=(libssl-dev zlib1g-dev libsqlite3-dev)
    # MQTT client dev (opcbridge links mosquitto)
    pkgs+=(libmosquitto-dev)
  fi

  # Node runtime for scada/hmi services.
  for c in "${COMPONENTS[@]}"; do
    if [[ "$c" == "scada" || "$c" == "hmi" ]]; then
      pkgs+=(nodejs)
      # npm is needed for installing deps; include it when asked.
      if [[ "$WITH_NODE_DEPS" -eq 1 ]]; then
        pkgs+=(npm)
      fi
      break
    fi
  done

  # Reporter deps
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'reporter'; then
    if [[ "$BUILD" -eq 1 ]]; then
      pkgs+=(libcurl4-openssl-dev default-libmysqlclient-dev)
    fi
  fi

  # De-dupe
  local -a uniq
  uniq=()
  for p in "${pkgs[@]}"; do
    if [[ -z "$p" ]]; then
      continue
    fi
    if [[ " ${uniq[*]} " != *" $p "* ]]; then
      uniq+=("$p")
    fi
  done

  echo "Installing OS dependencies via apt:" 
  printf '  %s\n' "${uniq[@]}"

  apt_install "${uniq[@]}"

  # Libraries we cannot reliably install from apt (often built from source into /usr/local).
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
    echo ""
    echo "Note: opcbridge build expects these libs (often installed to /usr/local):"
    echo "  - libplctag (libplctag.so)"
    echo "  - libixwebsocket (libixwebsocket.so)"
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    echo ""
    echo "Note: opcbridge-alarms build expects libixwebsocket (often installed to /usr/local)."
  fi
}

prompt() {
  local msg="$1"
  if [[ "${ASSUME_YES}" -eq 1 ]]; then
    return 0
  fi
  read -r -p "${msg}" REPLY
}

prompt_yn() {
  local msg="$1"
  local def="${2:-y}"

  if [[ "${ASSUME_YES}" -eq 1 ]]; then
    [[ "$def" == "y" ]] && return 0 || return 1
  fi

  local suffix="[y/N]"
  [[ "$def" == "y" ]] && suffix="[Y/n]"

  while true; do
    read -r -p "${msg} ${suffix} " REPLY
    local ans="${REPLY:-$def}"
    ans="$(echo "$ans" | tr '[:upper:]' '[:lower:]')"
    case "$ans" in
      y|yes) return 0;;
      n|no) return 1;;
    esac
  done
}

split_csv() {
  local csv="$1"
  IFS=',' read -r -a _out <<< "$csv"
  for i in "${_out[@]}"; do
    local trimmed
    trimmed="$(echo "$i" | xargs)"
    [[ -n "$trimmed" ]] && COMPONENTS+=("$trimmed")
  done
}

choose_interactive() {
  echo "Select what to install:"
  echo "  1) opcbridge only"
  echo "  2) full suite (opcbridge + alarms + scada + hmi + reporter)"
  echo "  3) custom"

  local choice
  if [[ "${ASSUME_YES}" -eq 1 ]]; then
    choice=2
  else
    read -r -p "Choice [1-3]: " choice
  fi

  case "$choice" in
    1) PROFILE="opcbridge-only";;
    2|"") PROFILE="full";;
    3)
      COMPONENTS=()
      prompt_yn "Install opcbridge?" y && COMPONENTS+=(opcbridge)
      prompt_yn "Install alarms server?" y && COMPONENTS+=(alarms)
      prompt_yn "Install scada app?" y && COMPONENTS+=(scada)
      prompt_yn "Install hmi app?" y && COMPONENTS+=(hmi)
      prompt_yn "Install reporter?" n && COMPONENTS+=(reporter)
      ;;
    *)
      echo "Invalid choice." >&2
      exit 1
      ;;
  esac
}

validate_components() {
  local ok=1
  for c in "${COMPONENTS[@]}"; do
    case "$c" in
      opcbridge|alarms|scada|hmi|reporter) : ;;
      *) echo "Unknown component: $c" >&2; ok=0;;
    esac
  done
  [[ "$ok" -eq 1 ]] || exit 1

  # Implicit dependencies
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    if ! printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
      COMPONENTS+=(opcbridge)
    fi
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'scada'; then
    if ! printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
      COMPONENTS+=(opcbridge)
    fi
  fi

  # Unique
  mapfile -t COMPONENTS < <(printf '%s\n' "${COMPONENTS[@]}" | awk '!seen[$0]++')
}

gen_token() {
  if have_cmd openssl; then
    openssl rand -hex 16
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

ensure_user() {
  if id -u "$SERVICE_USER" >/dev/null 2>&1; then
    return 0
  fi

  echo "Creating user/group: ${SERVICE_USER}:${SERVICE_GROUP}"
  if ! getent group "$SERVICE_GROUP" >/dev/null 2>&1; then
    groupadd --system "$SERVICE_GROUP"
  fi
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin \
    --gid "$SERVICE_GROUP" "$SERVICE_USER"
}

ensure_dirs() {
  mkdir -p "$PREFIX/bin" "$CONFIG_ROOT" "$DATA_ROOT" "$LOG_ROOT"

  # Core config layout
  mkdir -p "$CONFIG_ROOT/connections" "$CONFIG_ROOT/tags"

  # Prefer data in /var, but keep config path stable via symlink.
  if [[ ! -e "$CONFIG_ROOT/data" ]]; then
    ln -s "$DATA_ROOT" "$CONFIG_ROOT/data"
  fi

  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT" "$LOG_ROOT" || true
}

write_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    echo "Keeping existing env file: $ENV_FILE"
    return 0
  fi

  echo "Creating env file: $ENV_FILE"
  umask 077
  local admin_token
  admin_token="${OPCBRIDGE_ADMIN_SERVICE_TOKEN:-$(gen_token)}"

  cat >"$ENV_FILE" <<ENV
# Shared env for opcbridge-suite systemd services
OPCBRIDGE_ADMIN_SERVICE_TOKEN=${admin_token}
OPCBRIDGE_WRITE_TOKEN=${OPCBRIDGE_WRITE_TOKEN:-$admin_token}

# Ports
OPCBRIDGE_HTTP_PORT=8080
OPCBRIDGE_WS_PORT=8090
OPCBRIDGE_OPCUA_PORT=4840

ALARMS_HTTP_PORT=8085
ALARMS_WS_PORT=8086
ALARMS_OPCUA_PORT=4841

SCADA_PORT=3010
HMI_PORT=3000
ENV

  chmod 600 "$ENV_FILE"
}

build_if_needed() {
  [[ "$BUILD" -eq 1 ]] || return 0

  echo "Building C++ components..."
  (cd "$ROOT_DIR/opcbridge" && ./build.sh)
  (cd "$ROOT_DIR/opcbridge-alarms" && ./build.sh)

  if [[ -f "$ROOT_DIR/opcbridge-reporter/Makefile" ]]; then
    (cd "$ROOT_DIR/opcbridge-reporter" && make)
  fi
}

install_opcbridge() {
  echo "Installing opcbridge..."
  local src="$ROOT_DIR/opcbridge/opcbridge"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }

  install -m 0755 "$src" "$PREFIX/bin/opcbridge"

  # Install example configs (non-sensitive)
  install -m 0644 "$ROOT_DIR/opcbridge/config/admin_auth.json.example" "$CONFIG_ROOT/admin_auth.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge/config/alarms.json.example" "$CONFIG_ROOT/alarms.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge/config/mqtt.json.example" "$CONFIG_ROOT/mqtt.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge/config/mqtt_inputs.json.example" "$CONFIG_ROOT/mqtt_inputs.json.example" 2>/dev/null || true

  if [[ -d "$ROOT_DIR/opcbridge/config/connections" ]]; then
    mkdir -p "$CONFIG_ROOT/connections"
    find "$ROOT_DIR/opcbridge/config/connections" -maxdepth 1 -type f -name '*.example' -print0 | \
      xargs -0 -I{} install -m 0644 "{}" "$CONFIG_ROOT/connections/" 2>/dev/null || true
  fi

  if [[ -d "$ROOT_DIR/opcbridge/config/tags" ]]; then
    mkdir -p "$CONFIG_ROOT/tags"
    find "$ROOT_DIR/opcbridge/config/tags" -maxdepth 1 -type f -name '*.example' -print0 | \
      xargs -0 -I{} install -m 0644 "{}" "$CONFIG_ROOT/tags/" 2>/dev/null || true
  fi
}

install_alarms() {
  echo "Installing opcbridge-alarms..."
  local src="$ROOT_DIR/opcbridge-alarms/opcbridge-alarms"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }

  install -m 0755 "$src" "$PREFIX/bin/opcbridge-alarms"

  mkdir -p "$CONFIG_ROOT/alarms"
  if [[ ! -e "$CONFIG_ROOT/alarms/data" ]]; then
    mkdir -p "$DATA_ROOT/opcbridge-alarms"
    ln -s "$DATA_ROOT/opcbridge-alarms" "$CONFIG_ROOT/alarms/data"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT/opcbridge-alarms" || true
  fi

  install -m 0644 "$ROOT_DIR/opcbridge-alarms/config/alarms.json.example" \
    "$CONFIG_ROOT/alarms/alarms.json.example" 2>/dev/null || true
}


copy_tree() {
  local src="$1"
  local dst="$2"

  if have_cmd rsync; then
    rsync -a --delete "$src" "$dst"
    return 0
  fi

  mkdir -p "$dst"
  (cd "$src" && tar -cf - .) | (cd "$dst" && tar -xf -)
}

install_scada() {
  echo "Installing opcbridge-scada..."
  mkdir -p "$PREFIX/scada"
  if have_cmd rsync; then
    rsync -a --delete \
      --exclude 'config.json' \
      --exclude 'config.secrets.json' \
      "$ROOT_DIR/opcbridge-scada/" "$PREFIX/scada/"
  else
    copy_tree "$ROOT_DIR/opcbridge-scada/" "$PREFIX/scada/"
    rm -f "$PREFIX/scada/config.json" "$PREFIX/scada/config.secrets.json" || true
  fi

  mkdir -p "$CONFIG_ROOT/scada"
  install -m 0644 "$ROOT_DIR/opcbridge-scada/config.json.example" "$CONFIG_ROOT/scada/config.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-scada/config.secrets.json.example" "$CONFIG_ROOT/scada/config.secrets.json.example" 2>/dev/null || true
}

install_hmi() {
  echo "Installing opcbridge-hmi..."
  mkdir -p "$PREFIX/hmi"
  if have_cmd rsync; then
    rsync -a --delete \
      --exclude 'node_modules' \
      --exclude 'passwords.jsonc' \
      --exclude 'audit.jsonl' \
      "$ROOT_DIR/opcbridge-hmi/" "$PREFIX/hmi/"
  else
    copy_tree "$ROOT_DIR/opcbridge-hmi/" "$PREFIX/hmi/"
    rm -rf "$PREFIX/hmi/node_modules" || true
    rm -f "$PREFIX/hmi/passwords.jsonc" "$PREFIX/hmi/audit.jsonl" || true
  fi

  if [[ "$WITH_NODE_DEPS" -eq 1 ]]; then
    if ! have_cmd npm; then
      echo "npm not found; install Node.js/npm first, or rerun without --with-node-deps." >&2
      exit 1
    fi
    echo "Installing HMI Node dependencies (npm ci)..."
    (cd "$PREFIX/hmi" && npm ci --omit=dev)
  else
    echo "Note: HMI requires Node deps. Run: (cd $PREFIX/hmi && npm ci --omit=dev)"
  fi
}

install_reporter() {
  echo "Installing opcbridge-reporter..."
  local src="$ROOT_DIR/opcbridge-reporter/opcbridge-reporter"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }
  install -m 0755 "$src" "$PREFIX/bin/opcbridge-reporter"

  mkdir -p "$CONFIG_ROOT/reporter"
  install -m 0644 "$ROOT_DIR/opcbridge-reporter/config.json.example" "$CONFIG_ROOT/reporter/config.json.example" 2>/dev/null || true
}

write_unit() {
  local unit_name="$1"
  local content="$2"

  local unit_path="/etc/systemd/system/${unit_name}"
  echo "Writing systemd unit: ${unit_path}"
  umask 022
  cat >"$unit_path" <<<"$content"
}

install_systemd_units() {
  have_cmd systemctl || { echo "systemctl not found; skipping service install."; return 0; }

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
    write_unit "opcbridge.service" "[Unit]
Description=opcbridge industrial data bridge
After=network.target

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${PREFIX}
ExecStart=${PREFIX}/bin/opcbridge --config ${CONFIG_ROOT} --http --ws --ws-port \${OPCBRIDGE_WS_PORT} --opcua --opcua-port \${OPCBRIDGE_OPCUA_PORT}
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    write_unit "opcbridge-alarms.service" "[Unit]
Description=opcbridge alarms server
After=network.target opcbridge.service

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${PREFIX}
ExecStart=${PREFIX}/bin/opcbridge-alarms --config ${CONFIG_ROOT}/alarms --opcbridge-host 127.0.0.1 --opcbridge-http-port \${OPCBRIDGE_HTTP_PORT} --opcbridge-ws-port \${OPCBRIDGE_WS_PORT} --http-port \${ALARMS_HTTP_PORT} --ws-port \${ALARMS_WS_PORT} --opcua --admin-token \${OPCBRIDGE_ADMIN_SERVICE_TOKEN}
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'scada'; then
    write_unit "opcbridge-scada.service" "[Unit]
Description=opcbridge SCADA console
After=network.target

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
Environment=OPCBRIDGE_SCADA_CONFIG=${CONFIG_ROOT}/scada/config.json
Environment=OPCBRIDGE_SCADA_SECRETS=${CONFIG_ROOT}/scada/config.secrets.json
Environment=PORT=\${SCADA_PORT}
WorkingDirectory=${PREFIX}/scada
ExecStart=/usr/bin/node ${PREFIX}/scada/server.js
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'hmi'; then
    write_unit "opcbridge-hmi.service" "[Unit]
Description=opcbridge HMI
After=network.target

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
Environment=PORT=\${HMI_PORT}
WorkingDirectory=${PREFIX}/hmi
ExecStart=/usr/bin/node ${PREFIX}/hmi/server.js
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"
  fi

  systemctl daemon-reload

  if [[ "$ENABLE_SERVICES" -eq 1 ]]; then
    for svc in opcbridge opcbridge-alarms opcbridge-scada opcbridge-hmi; do
      if systemctl cat "$svc" >/dev/null 2>&1; then
        systemctl enable "$svc" >/dev/null 2>&1 || true
      fi
    done
  fi

  if [[ "$START_SERVICES" -eq 1 ]]; then
    for svc in opcbridge opcbridge-alarms opcbridge-scada opcbridge-hmi; do
      if systemctl cat "$svc" >/dev/null 2>&1; then
        systemctl restart "$svc" >/dev/null 2>&1 || true
      fi
    done
  fi
}

main() {
  need_root

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --opcbridge-only) PROFILE="opcbridge-only"; shift;;
      --full|--suite) PROFILE="full"; shift;;
      --components) split_csv "${2:-}"; shift 2;;
      --prefix) PREFIX="${2:-}"; shift 2;;
      --config) CONFIG_ROOT="${2:-}"; ENV_FILE="${CONFIG_ROOT}/opcbridge.env"; shift 2;;
      --data) DATA_ROOT="${2:-}"; shift 2;;
      --logs) LOG_ROOT="${2:-}"; shift 2;;
      --user) SERVICE_USER="${2:-}"; shift 2;;
      --group) SERVICE_GROUP="${2:-}"; shift 2;;
      --no-build) BUILD=0; shift;;      --with-node-deps) WITH_NODE_DEPS=1; shift;;
      --deps) INSTALL_DEPS=1; shift;;
      --no-start) START_SERVICES=0; shift;;
      --no-enable) ENABLE_SERVICES=0; shift;;
      -y|--yes) ASSUME_YES=1; shift;;
      -h|--help) usage; exit 0;;
      *) echo "Unknown arg: $1" >&2; usage; exit 1;;
    esac
  done

  if [[ "${#COMPONENTS[@]}" -eq 0 ]]; then
    if [[ -n "$PROFILE" ]]; then
      :
    else
      choose_interactive
    fi
  fi

  if [[ "${#COMPONENTS[@]}" -eq 0 ]]; then
    case "$PROFILE" in
      opcbridge-only) COMPONENTS=(opcbridge);;
      full|"") COMPONENTS=(opcbridge alarms scada hmi reporter);;
      *) echo "Unknown profile: $PROFILE" >&2; exit 1;;
    esac
  fi

  validate_components

  if [[ "$INSTALL_DEPS" -eq 1 ]]; then
    install_deps
  fi

  echo "Installing components: ${COMPONENTS[*]}"
  echo "Prefix:  $PREFIX"
  echo "Config:   $CONFIG_ROOT"
  echo "Data:     $DATA_ROOT"
  echo "Logs:     $LOG_ROOT"

  if ! prompt_yn "Proceed?" y; then
    echo "Canceled."
    exit 0
  fi

  ensure_user
  ensure_dirs
  write_env_file
  build_if_needed

  for c in "${COMPONENTS[@]}"; do
    case "$c" in
      opcbridge) install_opcbridge;;
      alarms) install_alarms;;
      scada) install_scada;;
      hmi) install_hmi;;
      reporter) install_reporter;;
    esac
  done

  install_systemd_units

  echo ""
  echo "Installed."
  echo "Env file: ${ENV_FILE}"
  echo "opcbridge: http://<host>:8080"
  echo "alarms:    http://<host>:8085/alarm/api/status"
  echo "scada:     http://<host>:3010"
  echo "hmi:       http://<host>:3000"
  echo ""
  echo "Logs:"
  echo "  journalctl -u opcbridge -f"
  echo "  journalctl -u opcbridge-alarms -f"
  echo "  journalctl -u opcbridge-scada -f"
  echo "  journalctl -u opcbridge-hmi -f"
}

main "$@"
