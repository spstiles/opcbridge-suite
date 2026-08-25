#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PREFIX="/opt/opcbridge-suite"
CONFIG_ROOT="/etc/opcbridge"
DATA_ROOT="/var/lib/opcbridge"
LOG_ROOT="/var/log/opcbridge"
ENV_FILE="${CONFIG_ROOT}/opcbridge.env"
LICENSES_ROOT_REL="share/licenses"

SERVICE_USER="opcbridge"
SERVICE_GROUP="opcbridge"

BUILD=1
WITH_NODE_DEPS=0
INSTALL_DEPS=0
ASSUME_YES=0
START_SERVICES=1
ENABLE_SERVICES=1
SCADA_SYSTEMD_SUDO=0
INSTALL_HAD_ERRORS=0
LOGGER_LEGACY_PRESENT=0
LOGGER_LEGACY_WAS_ENABLED=0
WITH_ODBC=0
ODBC_DRIVER=""
WITH_PJSIP=0
WITH_PJSIP_EXPLICIT=0

LIBPLCTAG_VERSION="${OPCBRIDGE_LIBPLCTAG_VERSION:-v2.6.12}"
IXWEBSOCKET_VERSION="${OPCBRIDGE_IXWEBSOCKET_VERSION:-v11.4.6}"
FORCE_SOURCE_DEPS="${OPCBRIDGE_FORCE_SOURCE_DEPS:-0}"

PROFILE=""
COMPONENTS=()
INIT_HISTORIAN_DB=0

usage() {
  cat <<USAGE
Usage: sudo ./install.sh [options]

Profiles:
  --opcbridge-only        Install only opcbridge (communication layer)
  --alarms-only           Install only opcbridge-alarms
  --scada-only            Install only opcbridge-scada
  --hmi-only              Install only opcbridge-hmi
  --logger-only           Install only opcbridge-logger
  --flow-only             Install only opcbridge-flow
  --report-only           Install only opcbridge-report
  --full                  Install opcbridge + alarms + scada + hmi + logger + historian + report + flow

Component selection (overrides profiles):
  --components LIST       Comma-separated: opcbridge,alarms,scada,hmi,logger,historian,report,flow
                          (legacy name "reporter" is accepted as an alias for "logger")

Options:
  --prefix DIR            Install prefix (default: ${PREFIX})
  --config DIR            Config root (default: ${CONFIG_ROOT})
  --data DIR              Data root (default: ${DATA_ROOT})
  --logs DIR              Log root (default: ${LOG_ROOT})
  --user USER             Service user (default: ${SERVICE_USER})
  --group GROUP           Service group (default: ${SERVICE_GROUP})
  --no-build              Do not build; use existing binaries
  --deps                  Install dependencies via apt (includes Node deps for Node services)
  --with-odbc             Install ODBC deps (SQL Server support for logger)
  --odbc-driver NAME      ODBC driver: freetds | ms (default: freetds)
  --with-node-deps        Run npm install for Node services (requires network; useful for --hmi-only/--scada-only)
  --with-pjsip            Build/install pjproject (pjsua) for SIP callouts
  --no-pjsip              Do not build/install pjproject (pjsua)
  --init-historian-db     Create local Postgres role/db and load historian schema
  --no-start              Do not start services
  --no-enable             Do not enable services at boot
  --scada-systemd-sudo    Configure sudoers so opcbridge-scada can manage opcbridge.service
  -y, --yes               Non-interactive defaults
  -h, --help              Show help

Notes:
- This script targets Debian 12+ and Debian-like derivatives using systemd.
- It never writes secrets into the repo; tokens live in ${ENV_FILE}.
- --deps uses apt plus source builds for libplctag/IXWebSocket and needs network access.
- Source dependency versions can be overridden with OPCBRIDGE_LIBPLCTAG_VERSION and
  OPCBRIDGE_IXWEBSOCKET_VERSION; set OPCBRIDGE_FORCE_SOURCE_DEPS=1 to rebuild them.
USAGE
}

need_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root (use sudo)." >&2
    exit 1
  fi
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

download_file() {
  local url="$1"
  local dst="$2"
  if [[ -z "$url" || -z "$dst" ]]; then
    echo "download_file: missing url/dst" >&2
    return 1
  fi
  mkdir -p "$(dirname "$dst")"
  if have_cmd curl; then
    curl -fsSL "$url" -o "$dst"
  elif have_cmd wget; then
    wget -qO "$dst" "$url"
  else
    echo "Neither curl nor wget is available to download: $url" >&2
    return 1
  fi
}

install_report_composer_dependencies() {
  local report_dir="$ROOT_DIR/opcbridge-report"
  local -a install_args=(
    install
    --working-dir "$report_dir"
    --no-dev
    --classmap-authoritative
    --no-interaction
  )

  if have_cmd composer; then
    echo "Installing report dependencies with system Composer..."
    if COMPOSER_ALLOW_SUPERUSER=1 composer "${install_args[@]}"; then
      return 0
    fi
    echo "System Composer failed; trying a verified current Composer PHAR." >&2
  else
    echo "System Composer is unavailable; downloading a verified current Composer PHAR."
  fi

  have_cmd php || {
    echo "PHP CLI is required to install opcbridge-report dependencies." >&2
    return 1
  }

  local workdir installer signature expected actual phar
  workdir="$(mktemp -d -t opcbridge-composer.XXXXXX)"
  installer="$workdir/composer-setup.php"
  signature="$workdir/installer.sig"
  phar="$workdir/composer.phar"

  if ! download_file "https://composer.github.io/installer.sig" "$signature" ||
     ! download_file "https://getcomposer.org/installer" "$installer"; then
    rm -rf "$workdir" || true
    echo "Failed to download the official Composer installer or signature." >&2
    return 1
  fi

  expected="$(tr -d '[:space:]' < "$signature")"
  actual="$(php -r 'echo hash_file("sha384", $argv[1]);' "$installer")"
  if [[ ! "$expected" =~ ^[a-fA-F0-9]{96}$ || "$actual" != "$expected" ]]; then
    rm -rf "$workdir" || true
    echo "Composer installer checksum verification failed; refusing to execute it." >&2
    return 1
  fi

  if ! php "$installer" --quiet --install-dir="$workdir" --filename="composer.phar" ||
     [[ ! -f "$phar" ]]; then
    rm -rf "$workdir" || true
    echo "Official Composer installer failed." >&2
    return 1
  fi

  echo "Installing report dependencies with verified temporary Composer..."
  if ! COMPOSER_ALLOW_SUPERUSER=1 php "$phar" "${install_args[@]}"; then
    rm -rf "$workdir" || true
    echo "Temporary Composer failed to install opcbridge-report dependencies." >&2
    return 1
  fi
  rm -rf "$workdir" || true
}

install_pjproject() {
  local ver="2.15.1"
  local prefix_dir="${PREFIX}/third_party/pjproject"
  local marker="${prefix_dir}/.installed-${ver}"

  local need_rebuild=0
  if [[ -f "$marker" && -x "${PREFIX}/bin/pjsua" ]]; then
    echo "pjproject ${ver} already installed at ${prefix_dir}"
    # Ensure shared libs are discoverable (idempotent).
    local ldconf="/etc/ld.so.conf.d/opcbridge-pjproject.conf"
    mkdir -p "$(dirname "$ldconf")"
    printf '%s\n' "${prefix_dir}/lib" >"$ldconf"
    if have_cmd ldconfig; then
      ldconfig >/dev/null 2>&1 || true
    fi
    return 0
  fi
  if [[ -f "$marker" && ! -x "${PREFIX}/bin/pjsua" ]]; then
    echo "pjproject ${ver} marker exists but pjsua is missing; rebuilding."
    need_rebuild=1
  fi

  echo "Installing pjproject ${ver} (pjsua)..."
  rm -rf "${prefix_dir}"
  mkdir -p "${prefix_dir}"

  local workdir=""
  workdir="$(mktemp -d -t opcbridge-pjproject.XXXXXX)"

  local tar="${workdir}/pjproject-${ver}.tar.gz"
  download_file "https://github.com/pjsip/pjproject/archive/refs/tags/${ver}.tar.gz" "$tar"
  tar -xzf "$tar" -C "$workdir"

  local src="${workdir}/pjproject-${ver}"
  if [[ ! -d "$src" ]]; then
    src="$(find "$workdir" -maxdepth 1 -type d -name 'pjproject-*' | head -n 1 || true)"
  fi
  if [[ -z "$src" || ! -d "$src" ]]; then
    echo "Failed to locate extracted pjproject source in $workdir" >&2
    return 1
  fi

  pushd "$src" >/dev/null

  export CFLAGS="${CFLAGS:-} -O2"
  export CXXFLAGS="${CXXFLAGS:-} -O2"

  ./configure --prefix="$prefix_dir" --enable-shared >/dev/null
  make dep >/dev/null
  make -j"$(nproc)" >/dev/null
  make install >/dev/null

  # Build the pjsua CLI app (not installed by `make install`).
  if [[ -f "pjsip-apps/src/pjsua/Makefile" ]]; then
    make -C pjsip-apps/src/pjsua >/dev/null
  elif [[ -f "pjsip-apps/build/Makefile" ]]; then
    make -C pjsip-apps/build pjsua >/dev/null
  else
    echo "ERROR: Could not locate pjsua Makefile in pjproject source." >&2
    popd >/dev/null
    return 1
  fi

  # Locate the built pjsua binary (in-tree). On Linux it is commonly named:
  #   pjsip-apps/bin/pjsua-<triplet>
  local pjsua_bin=""
  if [[ -d "pjsip-apps/bin" ]]; then
    # pjproject commonly names it pjsua-<triplet>. Some environments may not preserve exec bits
    # when building as root with restrictive umask, so don't require -perm -111.
    pjsua_bin="$(find "pjsip-apps/bin" -maxdepth 1 -type f -name 'pjsua*' 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "$pjsua_bin" ]]; then
    pjsua_bin="$(find . -maxdepth 8 -type f -name 'pjsua*' 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "$pjsua_bin" || ! -f "$pjsua_bin" ]]; then
    echo "ERROR: pjproject build did not produce a pjsua binary." >&2
    if [[ -d "pjsip-apps/bin" ]]; then
      echo "Debug: contents of pjsip-apps/bin:" >&2
      ls -la "pjsip-apps/bin" >&2 || true
    fi
    popd >/dev/null
    return 1
  fi

  mkdir -p "${prefix_dir}/bin" "${PREFIX}/bin"
  chmod +x "$pjsua_bin" 2>/dev/null || true
  install -m 0755 "$pjsua_bin" "${prefix_dir}/bin/pjsua"
  install -m 0755 "$pjsua_bin" "${PREFIX}/bin/pjsua"

  popd >/dev/null

  # Make pjproject shared libs discoverable at runtime.
  local ldconf="/etc/ld.so.conf.d/opcbridge-pjproject.conf"
  mkdir -p "$(dirname "$ldconf")"
  printf '%s\n' "${prefix_dir}/lib" >"$ldconf"
  if have_cmd ldconfig; then
    ldconfig >/dev/null 2>&1 || true
  fi

  date >"$marker"
  echo "pjproject ${ver} installed."

  rm -rf "$workdir" || true
}

ensure_local_ldconfig_path() {
  local ldconf="/etc/ld.so.conf.d/opcbridge-local.conf"
  mkdir -p "$(dirname "$ldconf")"
  if [[ ! -f "$ldconf" ]] || ! grep -Fxq "/usr/local/lib" "$ldconf" 2>/dev/null; then
    printf '%s\n' "/usr/local/lib" >"$ldconf"
  fi
  if have_cmd ldconfig; then
    ldconfig >/dev/null 2>&1 || true
  fi
}

clone_source_dep() {
  local repo="$1"
  local ref="$2"
  local dst="$3"
  if [[ -n "$ref" ]]; then
    if git clone --depth 1 --branch "$ref" "$repo" "$dst"; then
      return 0
    fi
    echo "Warning: failed to clone ${repo} at ${ref}; falling back to default branch." >&2
  fi
  git clone --depth 1 "$repo" "$dst"
}

install_libplctag_source() {
  local have_libplctag=0
  if [[ -f /usr/local/include/libplctag.h ]] &&
     { [[ -e /usr/local/lib/libplctag.so ]] || [[ -e /usr/local/lib/libplctag_static.a ]]; }; then
    have_libplctag=1
  fi
  if [[ "$FORCE_SOURCE_DEPS" != "1" && "$have_libplctag" -eq 1 ]]; then
    echo "libplctag already installed under /usr/local"
    ensure_local_ldconfig_path
    return 0
  fi

  echo "Installing libplctag ${LIBPLCTAG_VERSION} from source..."
  local workdir
  workdir="$(mktemp -d -t opcbridge-libplctag.XXXXXX)"
  clone_source_dep "https://github.com/libplctag/libplctag.git" "$LIBPLCTAG_VERSION" "${workdir}/src"

  cmake -S "${workdir}/src" -B "${workdir}/build" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DBUILD_EXAMPLES=OFF \
    -DBUILD_TESTS=OFF \
    -DUSE_SANITIZERS=OFF
  cmake --build "${workdir}/build" --target install -j"$(nproc)"

  ensure_local_ldconfig_path
  rm -rf "$workdir" || true
  echo "libplctag installed."
}

install_ixwebsocket_source() {
  local have_ixwebsocket=0
  if [[ -f /usr/local/include/ixwebsocket/IXWebSocketServer.h ]] &&
     { [[ -e /usr/local/lib/libixwebsocket.a ]] || [[ -e /usr/local/lib/libixwebsocket.so ]]; }; then
    have_ixwebsocket=1
  fi
  if [[ "$FORCE_SOURCE_DEPS" != "1" && "$have_ixwebsocket" -eq 1 ]]; then
    echo "IXWebSocket already installed under /usr/local"
    ensure_local_ldconfig_path
    return 0
  fi

  echo "Installing IXWebSocket ${IXWEBSOCKET_VERSION} from source..."
  local workdir
  workdir="$(mktemp -d -t opcbridge-ixwebsocket.XXXXXX)"
  clone_source_dep "https://github.com/machinezone/IXWebSocket.git" "$IXWEBSOCKET_VERSION" "${workdir}/src"

  cmake -S "${workdir}/src" -B "${workdir}/build" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DBUILD_SHARED_LIBS=OFF \
    -DUSE_TLS=ON \
    -DUSE_OPEN_SSL=ON \
    -DUSE_ZLIB=ON \
    -DIXWEBSOCKET_INSTALL=ON \
    -DBUILD_DEMO=OFF
  cmake --build "${workdir}/build" --target install -j"$(nproc)"

  ensure_local_ldconfig_path
  rm -rf "$workdir" || true
  echo "IXWebSocket installed."
}

install_source_deps() {
  local needs_plctag=0
  local needs_ixwebsocket=0

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
    needs_plctag=1
    needs_ixwebsocket=1
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -Eqx '(alarms|historian)'; then
    needs_ixwebsocket=1
  fi

  if [[ "$needs_plctag" -eq 1 ]]; then
    install_libplctag_source
  fi
  if [[ "$needs_ixwebsocket" -eq 1 ]]; then
    install_ixwebsocket_source
  fi
}

install_licenses() {
  # Keep the installed suite self-contained for license compliance.
  local dst="${PREFIX}/${LICENSES_ROOT_REL}"
  mkdir -p "$dst"

  if [[ -f "$ROOT_DIR/THIRD_PARTY_NOTICES.md" ]]; then
    install -m 0644 "$ROOT_DIR/THIRD_PARTY_NOTICES.md" "$dst/THIRD_PARTY_NOTICES.md" 2>/dev/null || true
  fi

  if [[ -d "$ROOT_DIR/third_party/licenses" ]]; then
    mkdir -p "$dst/third_party"
    if have_cmd rsync; then
      rsync -a "$ROOT_DIR/third_party/licenses/" "$dst/third_party/licenses/"
    else
      mkdir -p "$dst/third_party/licenses"
      (cd "$ROOT_DIR/third_party/licenses" && tar -cf - .) | (cd "$dst/third_party/licenses" && tar -xf -)
    fi
  fi
}


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

apt_has_pkg() {
  local pkg="$1"
  apt_update_once
  apt-cache show "$pkg" >/dev/null 2>&1
}

apt_install_first_available() {
  # Usage: apt_install_first_available pkg1 pkg2 ...
  local pkg
  for pkg in "$@"; do
    if apt_has_pkg "$pkg"; then
      apt_install "$pkg"
      return 0
    fi
  done
  return 1
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

  # Common build/runtime dependencies.
  #
  # Note: even when using --no-build, we still install the dev packages because:
  # - They pull in the correct runtime libs on Debian derivatives (including t64 transitions).
  # - It avoids "missing *.so" surprises for users.
  pkgs+=(build-essential pkg-config git cmake)
  pkgs+=(libssl-dev zlib1g-dev libsqlite3-dev)
  # JSON header-only library used across components (e.g., opcbridge-alarms).
  pkgs+=(nlohmann-json3-dev)
  # MQTT client dev (opcbridge links mosquitto)
  pkgs+=(libmosquitto-dev)
  # Handy for quick inspection/debugging on servers.
  pkgs+=(sqlite3)

  # Local text-to-speech for voice modem test calls and alarm speech playback.
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    pkgs+=(alsa-utils espeak-ng)
    # SIP callouts may need to normalize user audio files to a consistent format.
    # Installing sox avoids confusing "formats must match" failures for multi-file sequences.
    pkgs+=(sox)
    # Optional, but recommended: handle MP3 sources if users upload them (common in the field).
    pkgs+=(libsox-fmt-mp3)
    # SIP test/policy callout uses baresip as a simple headless SIP UA.
    pkgs+=(baresip baresip-core)
    # Optional: build/install pjproject for wideband SIP callouts.
    if [[ "$WITH_PJSIP" -eq 1 ]]; then
      pkgs+=(libasound2-dev)
      pkgs+=(libopus-dev)
      pkgs+=(libsrtp2-dev)
      pkgs+=(libspeexdsp-dev)
    fi
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

  # Data logger deps
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'logger'; then
    pkgs+=(libcurl4-openssl-dev)
    if [[ "$WITH_ODBC" -eq 1 ]]; then
      pkgs+=(unixodbc unixodbc-dev odbcinst)
      if [[ -z "$ODBC_DRIVER" || "$ODBC_DRIVER" == "freetds" ]]; then
        pkgs+=(tdsodbc freetds-bin)
      fi
    fi
  fi

  # Historian deps (Postgres + libpq headers)
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'historian'; then
    pkgs+=(postgresql postgresql-contrib)
    pkgs+=(libpq-dev)
  fi

  # Published report generator and spreadsheet/PDF renderers.
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'report'; then
    pkgs+=(php-cli php-common php-curl php-gd php-intl php-mbstring php-xml php-zip composer)
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

  # Optional DB client headers for opcbridge-logger.
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'logger'; then
    if ! apt_install_first_available default-libmysqlclient-dev libmariadb-dev libmariadb-dev-compat; then
      echo "Warning: could not find a MySQL/MariaDB client dev package; opcbridge-logger build may fail." >&2
    fi
    if [[ ! -f /usr/include/mysql/mysql.h && ! -f /usr/include/mariadb/mysql.h ]]; then
      echo "Warning: mysql headers not found after deps install; opcbridge-logger build may fail." >&2
    fi

    if [[ "$WITH_ODBC" -eq 1 && "$ODBC_DRIVER" == "ms" ]]; then
      echo ""
      echo "SQL Server (Microsoft ODBC driver) requested."
      echo "Note: msodbcsql18 is typically not in Debian default repos and may require adding Microsoft's apt repo."
      if apt-cache show msodbcsql18 >/dev/null 2>&1; then
        echo "Installing msodbcsql18 from configured repos..."
        apt_install msodbcsql18 || true
      else
        echo "msodbcsql18 not found in current apt sources."
        echo "Recommendation: choose FreeTDS (ODBC) instead, or follow Microsoft's install docs:"
        echo "  https://learn.microsoft.com/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server"
      fi
    fi
  fi

  # Libraries we build from source below because Debian packages are not reliable/available
  # across the target systems for the versions and headers opcbridge expects.
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
    echo ""
    echo "Source dependencies will be checked/installed under /usr/local:"
    echo "  - libplctag (${LIBPLCTAG_VERSION})"
    echo "  - IXWebSocket (${IXWEBSOCKET_VERSION})"
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    echo ""
    echo "Source dependency will be checked/installed under /usr/local:"
    echo "  - IXWebSocket (${IXWEBSOCKET_VERSION})"
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

prompt_choice() {
  local title="$1"
  shift
  local -a opts=("$@")

  if [[ "${#opts[@]}" -eq 0 ]]; then
    echo "prompt_choice called with no options" >&2
    return 1
  fi

  if [[ "${ASSUME_YES}" -eq 1 ]]; then
    echo "${opts[0]}"
    return 0
  fi

  # IMPORTANT: this function is often called via command-substitution like:
  #   choice="$(prompt_choice ...)"
  # In that case, anything printed to stdout is captured and won't be shown.
  # Print the menu to stderr and only print the selected value to stdout.
  echo "$title" >&2
  local i=1
  for o in "${opts[@]}"; do
    echo "  $i) $o" >&2
    i=$((i + 1))
  done
  while true; do
    read -r -p "Choice [1-${#opts[@]}]: " REPLY >&2
    local n
    n="$(echo "$REPLY" | tr -cd '0-9')"
    if [[ -n "$n" && "$n" -ge 1 && "$n" -le "${#opts[@]}" ]]; then
      echo "${opts[$((n-1))]}"
      return 0
    fi
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
  echo "  2) full suite (opcbridge + alarms + scada + hmi + logger + historian + report + flow)"
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
      prompt_yn "Install data logger?" n && COMPONENTS+=(logger)
      prompt_yn "Install historian?" n && COMPONENTS+=(historian)
      prompt_yn "Install report generator?" n && COMPONENTS+=(report)
      prompt_yn "Install visual flow service?" n && COMPONENTS+=(flow)
      ;;
    *)
      echo "Invalid choice." >&2
      exit 1
      ;;
  esac
}

validate_components() {
  local ok=1
  local i
  for i in "${!COMPONENTS[@]}"; do
    if [[ "${COMPONENTS[$i]}" == "reporter" ]]; then
      echo "Note: component name 'reporter' is deprecated; using 'logger'."
      COMPONENTS[$i]="logger"
    fi
  done
  for c in "${COMPONENTS[@]}"; do
    case "$c" in
      opcbridge|alarms|scada|hmi|logger|historian|report|flow) : ;;
      *) echo "Unknown component: $c" >&2; ok=0;;
    esac
  done
  [[ "$ok" -eq 1 ]] || exit 1

  # Implicit dependencies
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'historian'; then
    if ! printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
      COMPONENTS+=(opcbridge)
    fi
  fi

  # Unique
  mapfile -t COMPONENTS < <(printf '%s\n' "${COMPONENTS[@]}" | awk '!seen[$0]++')
}

maybe_prompt_install_deps() {
  if [[ "$INSTALL_DEPS" -ne 0 ]]; then
    return 0
  fi
  if ! have_cmd apt-get || ! is_debian_like; then
    return 0
  fi

  local -a missing
  missing=()

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    have_cmd aplay || missing+=("alsa-utils (aplay)")
    if ! have_cmd espeak-ng && ! have_cmd espeak && ! have_cmd flite; then
      missing+=("espeak-ng (or espeak/flite) for TTS")
    fi
    if [[ "$WITH_PJSIP" -eq 1 ]]; then
      have_cmd pjsua || missing+=("pjproject/pjsua (re-run installer with --deps, or disable with --no-pjsip)")
    fi
  fi

  if [[ "${#missing[@]}" -eq 0 ]]; then
    return 0
  fi

  echo ""
  echo "Warning: required OS dependencies appear to be missing:"
  printf '  - %s\n' "${missing[@]}"
  echo ""
  echo "Tip: re-run with --deps to install dependencies via apt."
  echo ""
  if [[ "$ASSUME_YES" -eq 1 ]]; then
    # Non-interactive mode: treat missing deps as an implicit "yes" to install deps.
    INSTALL_DEPS=1
    return 0
  fi
  if prompt_yn "Install dependencies now (recommended)?" y; then
    INSTALL_DEPS=1
  fi
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

ensure_logs_group_access() {
  # For the SCADA "Logs" tab we read systemd journal via journalctl.
  # On Debian/systemd, non-root access typically requires membership in systemd-journal (or adm).
  # This is set-and-forget: installer adds the service user to the group automatically.
  if ! have_cmd usermod; then
    return 0
  fi
  if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    return 0
  fi
  if getent group systemd-journal >/dev/null 2>&1; then
    usermod -aG systemd-journal "$SERVICE_USER" >/dev/null 2>&1 || true
  fi
}

ensure_audio_group_access() {
  # Alarm annunciation may run aplay/paplay from the service user. On ALSA systems,
  # access to /dev/snd/* is commonly granted through the audio group.
  if ! have_cmd usermod; then
    return 0
  fi
  if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    return 0
  fi
  if getent group audio >/dev/null 2>&1; then
    usermod -aG audio "$SERVICE_USER" >/dev/null 2>&1 || true
  fi
}

ensure_dialout_group_access() {
  # Voice modem alarm dial-out uses USB/serial devices such as /dev/ttyACM* or /dev/ttyUSB*.
  # Linux distributions commonly grant access to those device nodes through the dialout group.
  if ! have_cmd usermod; then
    return 0
  fi
  if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    return 0
  fi
  if getent group dialout >/dev/null 2>&1; then
    usermod -aG dialout "$SERVICE_USER" >/dev/null 2>&1 || true
  fi
}

ensure_dirs() {
  mkdir -p "$PREFIX/bin" "$CONFIG_ROOT" "$DATA_ROOT" "$LOG_ROOT" "$DATA_ROOT/report/templates"
  install -m 0644 "$ROOT_DIR/VERSION" "$PREFIX/VERSION"

  # Core config layout
  mkdir -p "$CONFIG_ROOT/connections" "$CONFIG_ROOT/tags"

  # Prefer data in /var, but keep config path stable via symlink.
  if [[ ! -e "$CONFIG_ROOT/data" ]]; then
    ln -s "$DATA_ROOT" "$CONFIG_ROOT/data"
  fi

  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT" "$LOG_ROOT" || true
}

fix_config_permissions() {
  # The services run as $SERVICE_USER. They must be able to write config files
  # (connections, tags, alarms, admin_auth.json, etc). Keep secrets file locked down.
  chgrp -R "$SERVICE_GROUP" "$CONFIG_ROOT" 2>/dev/null || true
  find "$CONFIG_ROOT" -type d -exec chmod 770 {} + 2>/dev/null || true
  find "$CONFIG_ROOT" -type f -exec chmod 660 {} + 2>/dev/null || true

  # Keep the env file root-owned and not group/world readable.
  if [[ -f "$ENV_FILE" ]]; then
    chown root:root "$ENV_FILE" 2>/dev/null || true
    chmod 600 "$ENV_FILE" 2>/dev/null || true
  fi
}

write_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    echo "Keeping existing env file: $ENV_FILE"
    # Ensure historian-related keys exist without overwriting existing values.
    if ! grep -Eq '^HISTORIAN_PGHOST=' "$ENV_FILE" 2>/dev/null; then echo "HISTORIAN_PGHOST=127.0.0.1" >>"$ENV_FILE"; fi
    if ! grep -Eq '^HISTORIAN_PGPORT=' "$ENV_FILE" 2>/dev/null; then echo "HISTORIAN_PGPORT=5432" >>"$ENV_FILE"; fi
    if ! grep -Eq '^HISTORIAN_PGDB=' "$ENV_FILE" 2>/dev/null; then echo "HISTORIAN_PGDB=opcbridge_historian" >>"$ENV_FILE"; fi
    if ! grep -Eq '^HISTORIAN_PGUSER=' "$ENV_FILE" 2>/dev/null; then echo "HISTORIAN_PGUSER=opcbridge_historian" >>"$ENV_FILE"; fi
    if ! grep -Eq '^HISTORIAN_PGPASSWORD=' "$ENV_FILE" 2>/dev/null; then echo "HISTORIAN_PGPASSWORD=" >>"$ENV_FILE"; fi
    chmod 600 "$ENV_FILE" 2>/dev/null || true
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

# Historian (Postgres)
HISTORIAN_PGHOST=127.0.0.1
HISTORIAN_PGPORT=5432
HISTORIAN_PGDB=opcbridge_historian
HISTORIAN_PGUSER=opcbridge_historian
HISTORIAN_PGPASSWORD=
ENV

  chmod 600 "$ENV_FILE"
}

build_if_needed() {
  [[ "$BUILD" -eq 1 ]] || return 0

  if ! printf '%s\n' "${COMPONENTS[@]}" | grep -Eqx '(opcbridge|alarms|logger|historian|report|flow)'; then
    return 0
  fi

  echo "Building C++ components..."

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'opcbridge'; then
    (cd "$ROOT_DIR/opcbridge" && ./build.sh)
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    (cd "$ROOT_DIR/opcbridge-alarms" && ./build.sh)
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'logger'; then
    if [[ -f "$ROOT_DIR/opcbridge-logger/Makefile" ]]; then
      # Version values are compiled into the binary. Force the build so a suite
      # version-only update cannot leave an otherwise unchanged binary stale.
      (cd "$ROOT_DIR/opcbridge-logger" && make -B)
    fi
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'flow'; then
    if [[ -f "$ROOT_DIR/opcbridge-flow/Makefile" ]]; then
      (cd "$ROOT_DIR/opcbridge-flow" && make -B)
    fi
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'historian'; then
    if [[ -f "$ROOT_DIR/opcbridge-historian/build.sh" ]]; then
      (cd "$ROOT_DIR/opcbridge-historian" && ./build.sh)
    fi
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'report'; then
    install_report_composer_dependencies || exit 1
  fi
}

install_opcbridge() {
  echo "Installing opcbridge..."
  local src="$ROOT_DIR/opcbridge/opcbridge"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }

  install -m 0755 "$src" "$PREFIX/bin/opcbridge"

  # Per-connection MQTT TLS material is managed by the SCADA service and read
  # by OPCBridge. Private keys receive stricter permissions when uploaded.
  mkdir -p "$CONFIG_ROOT/certs/mqtt"
  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/certs" 2>/dev/null || true
  chmod 0750 "$CONFIG_ROOT/certs" "$CONFIG_ROOT/certs/mqtt" 2>/dev/null || true

  # Install example configs (non-sensitive)
  install -m 0644 "$ROOT_DIR/opcbridge/config/admin_auth.json.example" "$CONFIG_ROOT/admin_auth.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge/config/alarms.json.example" "$CONFIG_ROOT/alarms.json.example" 2>/dev/null || true

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
  local src="$ROOT_DIR/opcbridge-alarms/build/opcbridge-alarms"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }

  install -m 0755 "$src" "$PREFIX/bin/opcbridge-alarms"

  mkdir -p "$CONFIG_ROOT"
  if [[ ! -e "$CONFIG_ROOT/data" ]]; then
    mkdir -p "$DATA_ROOT/opcbridge-alarms"
    ln -s "$DATA_ROOT/opcbridge-alarms" "$CONFIG_ROOT/data"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT/opcbridge-alarms" || true
  fi

  install -m 0644 "$ROOT_DIR/opcbridge-alarms/config/alarms.json.example" \
    "$CONFIG_ROOT/alarms.json.example" 2>/dev/null || true
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
  mkdir -p "$CONFIG_ROOT/certs/mqtt"
  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/certs" 2>/dev/null || true
  chmod 0750 "$CONFIG_ROOT/certs" "$CONFIG_ROOT/certs/mqtt" 2>/dev/null || true
  mkdir -p "$CONFIG_ROOT/data-entry"
  if [[ ! -f "$CONFIG_ROOT/data-entry/forms.json" ]]; then
    install -m 0660 /dev/null "$CONFIG_ROOT/data-entry/forms.json"
    echo '{"targets":[],"forms":[]}' >"$CONFIG_ROOT/data-entry/forms.json"
  fi
  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/data-entry" 2>/dev/null || true
  chmod 750 "$CONFIG_ROOT/data-entry" 2>/dev/null || true
  chmod 660 "$CONFIG_ROOT/data-entry/forms.json" 2>/dev/null || true
  mkdir -p "$DATA_ROOT/data-entry"
  chown "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT/data-entry" 2>/dev/null || true
  chmod 750 "$DATA_ROOT/data-entry" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-scada/config.json.example" "$CONFIG_ROOT/scada/config.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-scada/config.secrets.json.example" "$CONFIG_ROOT/scada/config.secrets.json.example" 2>/dev/null || true
}

install_scada_systemd_sudoers() {
  have_cmd sudo || { echo "sudo not found; cannot configure SCADA systemd sudoers." >&2; return 1; }

  local sudoers_path="/etc/sudoers.d/opcbridge-scada-systemd"
  echo "Configuring sudoers for opcbridge-scada systemd management: ${sudoers_path}"

  umask 027
  cat >"$sudoers_path" <<EOF
# Managed by opcbridge-suite install.sh
# Allow opcbridge-scada (running as ${SERVICE_USER}) to update a limited set of systemd units via sudo.

${SERVICE_USER} ALL=(root) NOPASSWD: /bin/systemctl daemon-reload
${SERVICE_USER} ALL=(root) NOPASSWD: /bin/systemctl restart opcbridge.service
${SERVICE_USER} ALL=(root) NOPASSWD: /usr/bin/install -D -m 0644 /tmp/opcbridge-scada-dropin-*.conf /etc/systemd/system/opcbridge.service.d/20-opcbridge-scada.conf
EOF

  chmod 440 "$sudoers_path"

  mkdir -p "/etc/systemd/system/opcbridge.service.d"
  chmod 755 "/etc/systemd/system/opcbridge.service.d" 2>/dev/null || true
}

install_hmi() {
  echo "Installing opcbridge-hmi..."
  mkdir -p "$PREFIX/hmi"

  # Preserve user-uploaded images across installs. The HMI upload feature writes into
  # $PREFIX/hmi/public/img, so a clean rsync install would otherwise delete them.
  local hmi_img_dir="$PREFIX/hmi/public/img"
  local hmi_img_backup=""
  if [[ -d "$hmi_img_dir" ]]; then
    hmi_img_backup="$(mktemp -d)"
    if have_cmd rsync; then
      rsync -a "$hmi_img_dir/" "$hmi_img_backup/" || true
    else
      mkdir -p "$hmi_img_backup"
      (cd "$hmi_img_dir" && tar -cf - .) | (cd "$hmi_img_backup" && tar -xf -) || true
    fi
  fi

  if have_cmd rsync; then
    rsync -a --delete \
      --exclude 'node_modules' \
      --exclude 'screens/*.jsonc' \
      --exclude 'screens/*.jsonc.example' \
      --exclude 'public/js/config.jsonc' \
      --exclude 'passwords.jsonc' \
      --exclude 'audit.jsonl' \
      "$ROOT_DIR/opcbridge-hmi/" "$PREFIX/hmi/"
  elif have_cmd tar; then
    # Copy without shipping demo screens. (Also do not delete any existing screens in $PREFIX/hmi.)
    (
      cd "$ROOT_DIR/opcbridge-hmi" || exit 1
      tar -cf - \
        --exclude='node_modules' \
        --exclude='screens/*.jsonc' \
        --exclude='screens/*.jsonc.example' \
        --exclude='public/js/config.jsonc' \
        --exclude='passwords.jsonc' \
        --exclude='audit.jsonl' \
        .
    ) | (cd "$PREFIX/hmi" && tar -xf -)
  else
    echo "ERROR: install_hmi requires either rsync or tar." >&2
    echo "Install rsync (recommended) or tar, then rerun the installer." >&2
    exit 1
  fi

  if [[ -n "$hmi_img_backup" ]]; then
    mkdir -p "$hmi_img_dir"
    if have_cmd rsync; then
      rsync -a "$hmi_img_backup/" "$hmi_img_dir/" || true
    else
      (cd "$hmi_img_backup" && tar -cf - .) | (cd "$hmi_img_dir" && tar -xf -) || true
    fi
    rm -rf "$hmi_img_backup" || true
  fi

  if [[ "$WITH_NODE_DEPS" -eq 1 ]]; then
    if ! have_cmd npm; then
      echo "npm not found; install Node.js/npm first, or rerun without --with-node-deps." >&2
      exit 1
    fi
    echo "Installing HMI Node dependencies (npm ci)..."
    # Ensure service user can create node_modules and has a writable HOME for npm cache/logs.
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$PREFIX/hmi" || true
    mkdir -p "$DATA_ROOT/.npm"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT/.npm" || true
    (cd "$PREFIX/hmi" && runuser -u "$SERVICE_USER" -- env HOME="$DATA_ROOT" NPM_CONFIG_CACHE="$DATA_ROOT/.npm" npm ci --omit=dev)
  else
    echo "Note: HMI requires Node deps. Either rerun the installer with --with-node-deps,"
    echo "or run:"
    echo "  sudo -u ${SERVICE_USER} env HOME=\"${DATA_ROOT}\" NPM_CONFIG_CACHE=\"${DATA_ROOT}/.npm\" bash -lc 'cd \"${PREFIX}/hmi\" && npm ci --omit=dev'"
  fi

  # Ensure runtime can write node_modules (if installed later) and any local cache.
  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$PREFIX/hmi" || true

  # If config.jsonc is not present (we only commit the example), create a usable default.
  local hmi_config_path="$PREFIX/hmi/public/js/config.jsonc"
  if [[ ! -f "$hmi_config_path" ]]; then
    local write_token=""
    if [[ -f "$ENV_FILE" ]]; then
      # shellcheck disable=SC1090
      set +u
      source "$ENV_FILE" || true
      set -u
      write_token="${OPCBRIDGE_WRITE_TOKEN:-}"
    fi

    cat >"$hmi_config_path" <<EOF
{
  // opcbridge connection settings used by the HMI server (proxy) + client (websocket)
  "opcbridge": {
    "host": "127.0.0.1",
    "httpPort": 8080,
    "wsPort": 8090,
    "writeToken": "${write_token}"
  },
  // opcbridge-alarms connection settings (optional)
  "alarms": {
    "host": "127.0.0.1",
    "httpPort": 8085,
    "wsPort": 8086
  },
  // HMI runtime settings
  "hmi": {
    "defaultScreen": "console_background",
    "touchscreenMode": false,
    "viewOnlyMode": false
  }
}
EOF
    chown "$SERVICE_USER:$SERVICE_GROUP" "$hmi_config_path" 2>/dev/null || true
    chmod 660 "$hmi_config_path" 2>/dev/null || true
  else
    echo "Preserved existing HMI config: ${hmi_config_path}"
  fi
}

install_logger() {
  echo "Installing opcbridge-logger..."
  local src="$ROOT_DIR/opcbridge-logger/opcbridge-logger"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }
  if [[ -x "$PREFIX/bin/opcbridge-reporter" ]] || systemctl cat opcbridge-reporter.service >/dev/null 2>&1; then
    LOGGER_LEGACY_PRESENT=1
    if systemctl is-enabled --quiet opcbridge-reporter.service 2>/dev/null; then
      LOGGER_LEGACY_WAS_ENABLED=1
    fi
  fi
  install -m 0755 "$src" "$PREFIX/bin/opcbridge-logger"

  # Preserve an existing installation by copying its configuration and runtime
  # state only when the new logger locations do not exist yet.
  if [[ -d "$CONFIG_ROOT/reporter" && ! -e "$CONFIG_ROOT/logger" ]]; then
    cp -a "$CONFIG_ROOT/reporter" "$CONFIG_ROOT/logger"
    echo "Migrated $CONFIG_ROOT/reporter to $CONFIG_ROOT/logger"
  fi
  if [[ -d "$DATA_ROOT/reporter" && ! -e "$DATA_ROOT/logger" ]]; then
    cp -a "$DATA_ROOT/reporter" "$DATA_ROOT/logger"
    echo "Migrated $DATA_ROOT/reporter to $DATA_ROOT/logger"
  fi

  mkdir -p "$CONFIG_ROOT/logger" "$DATA_ROOT/logger"
  chown "$SERVICE_USER:$SERVICE_GROUP" "$DATA_ROOT/logger" 2>/dev/null || true
  chmod 750 "$DATA_ROOT/logger" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-logger/config.json.example" "$CONFIG_ROOT/logger/config.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-logger/database_sync.json.example" "$CONFIG_ROOT/logger/database_sync.json.example" 2>/dev/null || true
  if [[ ! -f "$CONFIG_ROOT/logger/config.json" ]]; then
    umask 027
    cat >"$CONFIG_ROOT/logger/config.json" <<'JSON'
{
  "listen_host": "127.0.0.1",
  "listen_port": 8095,
  "opcbridge_base_url": "http://127.0.0.1:8080"
}
JSON
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/logger/config.json" 2>/dev/null || true
    chmod 660 "$CONFIG_ROOT/logger/config.json" 2>/dev/null || true
  fi
  if [[ ! -f "$CONFIG_ROOT/logger/databases.json" ]]; then
    umask 027
    cat >"$CONFIG_ROOT/logger/databases.json" <<'JSON'
{
  "databases": []
}
JSON
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/logger/databases.json" 2>/dev/null || true
    chmod 660 "$CONFIG_ROOT/logger/databases.json" 2>/dev/null || true
  fi
  if [[ ! -f "$CONFIG_ROOT/logger/reports.json" ]]; then
    umask 027
    cat >"$CONFIG_ROOT/logger/reports.json" <<'JSON'
{
  "reports": []
}
JSON
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/logger/reports.json" 2>/dev/null || true
    chmod 660 "$CONFIG_ROOT/logger/reports.json" 2>/dev/null || true
  fi
  if [[ ! -f "$CONFIG_ROOT/logger/data_checks.json" ]]; then
    umask 027
    cat >"$CONFIG_ROOT/logger/data_checks.json" <<'JSON'
{
  "data_checks": []
}
JSON
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/logger/data_checks.json" 2>/dev/null || true
    chmod 660 "$CONFIG_ROOT/logger/data_checks.json" 2>/dev/null || true
  fi
  if [[ ! -f "$CONFIG_ROOT/logger/database_sync.json" ]]; then
    umask 027
    cat >"$CONFIG_ROOT/logger/database_sync.json" <<'JSON'
{
  "sync_jobs": []
}
JSON
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/logger/database_sync.json" 2>/dev/null || true
    chmod 660 "$CONFIG_ROOT/logger/database_sync.json" 2>/dev/null || true
  fi
}

install_report() {
  echo "Installing opcbridge-report..."
  local src_dir="$ROOT_DIR/opcbridge-report"
  [[ -f "$src_dir/opcbridge-report" ]] || { echo "Missing opcbridge-report source" >&2; exit 1; }
  [[ -f "$src_dir/vendor/autoload.php" ]] || {
    echo "Missing opcbridge-report Composer dependencies (build first or omit --no-build)." >&2
    exit 1
  }

  mkdir -p "$PREFIX/report" "$CONFIG_ROOT/report" "$DATA_ROOT/report/templates"
  install -m 0755 "$src_dir/opcbridge-report" "$PREFIX/report/opcbridge-report"
  install -m 0644 "$src_dir/VERSION" "$PREFIX/report/VERSION"
  install -m 0644 "$src_dir/composer.json" "$PREFIX/report/composer.json"
  [[ ! -f "$src_dir/composer.lock" ]] || install -m 0644 "$src_dir/composer.lock" "$PREFIX/report/composer.lock"
  cp -a "$src_dir/vendor" "$PREFIX/report/"
  ln -sfn ../report/opcbridge-report "$PREFIX/bin/opcbridge-report"

  install -m 0644 "$src_dir/reports.json.example" "$CONFIG_ROOT/report/reports.json.example"
  if [[ ! -f "$CONFIG_ROOT/report/reports.json" ]]; then
    install -m 0660 "$src_dir/reports.json.example" "$CONFIG_ROOT/report/reports.json"
  fi
  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/report" "$DATA_ROOT/report" 2>/dev/null || true
  chmod 750 "$DATA_ROOT/report" 2>/dev/null || true

  # Report is invoked by SCADA on demand instead of running as a systemd
  # service, so verify its installed runtime while this failure is actionable.
  verify_component_installation report || {
    echo "opcbridge-report installation did not produce a usable generator." >&2
    exit 1
  }
}

install_flow() {
  echo "Installing opcbridge-flow..."
  local src="$ROOT_DIR/opcbridge-flow/opcbridge-flow"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }
  install -m 0755 "$src" "$PREFIX/bin/opcbridge-flow"

  mkdir -p "$CONFIG_ROOT/flow" "$DATA_ROOT/flow"
  install -m 0644 "$ROOT_DIR/opcbridge-flow/config.json.example" "$CONFIG_ROOT/flow/config.json.example"
  install -m 0644 "$ROOT_DIR/opcbridge-flow/flows.json.example" "$CONFIG_ROOT/flow/flows.json.example"
  if [[ ! -f "$CONFIG_ROOT/flow/config.json" ]]; then
    install -m 0660 "$ROOT_DIR/opcbridge-flow/config.json.example" "$CONFIG_ROOT/flow/config.json"
  fi
  if [[ ! -f "$CONFIG_ROOT/flow/flows.json" ]]; then
    install -m 0660 "$ROOT_DIR/opcbridge-flow/flows.json.example" "$CONFIG_ROOT/flow/flows.json"
  fi
  if [[ ! -f "$DATA_ROOT/flow/deployed.json" ]]; then
    install -m 0660 "$ROOT_DIR/opcbridge-flow/flows.json.example" "$DATA_ROOT/flow/deployed.json"
  fi
  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_ROOT/flow" "$DATA_ROOT/flow" 2>/dev/null || true
  chmod 750 "$DATA_ROOT/flow" 2>/dev/null || true
  chmod 660 "$CONFIG_ROOT/flow/config.json" "$CONFIG_ROOT/flow/flows.json" "$DATA_ROOT/flow/deployed.json" 2>/dev/null || true
}

install_historian() {
  echo "Installing opcbridge-historian..."
  local src="$ROOT_DIR/opcbridge-historian/opcbridge-historian"
  [[ -x "$src" ]] || { echo "Missing $src (build first)" >&2; exit 1; }
  install -m 0755 "$src" "$PREFIX/bin/opcbridge-historian"

  mkdir -p "$PREFIX/share/opcbridge-historian" "$CONFIG_ROOT/historian"
  install -m 0644 "$ROOT_DIR/opcbridge-historian/schema.sql" "$PREFIX/share/opcbridge-historian/schema.sql" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-historian/schema.sql" "$CONFIG_ROOT/historian/schema.sql" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-historian/config.json.example" "$CONFIG_ROOT/historian/config.json.example" 2>/dev/null || true
  install -m 0644 "$ROOT_DIR/opcbridge-historian/README.md" "$PREFIX/share/opcbridge-historian/README.md" 2>/dev/null || true

  # Create a non-secret default config (Postgres creds are provided via systemd env vars).
  if [[ ! -f "$CONFIG_ROOT/historian/config.json" ]]; then
    umask 027
    cat >"$CONFIG_ROOT/historian/config.json" <<'JSON'
{
  // opcbridge-historian default config (managed by installer)
  "subscribe_mode": "all",

  "change_only": {
    "enabled": true,
    "deadband": 0.0,
    "min_interval_ms": 250,
    "max_interval_ms": 60000
  },

  "snapshot": {
    "enabled": false,
    "interval_ms": 60000
  },

  "postgres": {
    "conninfo": "",
    "table": "tag_samples",
    "batch_size": 500,
    "flush_interval_ms": 250
  }
}
JSON
  fi
}

init_historian_db() {
  # Creates a local Postgres role/db and loads the historian schema.
  have_cmd systemctl || { echo "systemctl not found; cannot init Postgres automatically." >&2; return 1; }
  have_cmd psql || { echo "psql not found; install Postgres packages (use --deps)." >&2; return 1; }

  # shellcheck disable=SC1090
  set +u
  [[ -f "$ENV_FILE" ]] && . "$ENV_FILE"
  set -u

  local db="${HISTORIAN_PGDB:-opcbridge_historian}"
  local user="${HISTORIAN_PGUSER:-opcbridge_historian}"
  local pass="${HISTORIAN_PGPASSWORD:-}"
  local schema_path="${CONFIG_ROOT}/historian/schema.sql"

  if [[ ! -f "$schema_path" ]]; then
    schema_path="$PREFIX/share/opcbridge-historian/schema.sql"
  fi
  [[ -f "$schema_path" ]] || { echo "Historian schema not found (expected ${CONFIG_ROOT}/historian/schema.sql)." >&2; return 1; }

  systemctl enable --now postgresql >/dev/null 2>&1 || true
  systemctl start postgresql >/dev/null 2>&1 || true

  if [[ -z "$pass" ]]; then
    pass="$(gen_token)"
    if grep -Eq '^HISTORIAN_PGPASSWORD=' "$ENV_FILE" 2>/dev/null; then
      sed -i "s/^HISTORIAN_PGPASSWORD=.*/HISTORIAN_PGPASSWORD=${pass}/" "$ENV_FILE"
    else
      echo "HISTORIAN_PGPASSWORD=${pass}" >>"$ENV_FILE"
    fi
    chmod 600 "$ENV_FILE" 2>/dev/null || true
  fi

  local -a as_pg
  if have_cmd runuser; then
    as_pg=(runuser -u postgres --)
  else
    as_pg=(su -s /bin/sh postgres -c)
  fi

  if have_cmd runuser; then
    if ! "${as_pg[@]}" psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${user}'" | grep -q 1; then
      "${as_pg[@]}" psql -v ON_ERROR_STOP=1 -c "CREATE ROLE \"${user}\" LOGIN PASSWORD '${pass}';"
    fi
    if ! "${as_pg[@]}" psql -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
      "${as_pg[@]}" psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${db}\" OWNER \"${user}\";"
    fi
    "${as_pg[@]}" psql -v ON_ERROR_STOP=1 -d "${db}" -f "${schema_path}"
  else
    "${as_pg[@]}" "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='${user}'\" | grep -q 1 || psql -v ON_ERROR_STOP=1 -c \"CREATE ROLE \\\"${user}\\\" LOGIN PASSWORD '${pass}';\""
    "${as_pg[@]}" "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${db}'\" | grep -q 1 || psql -v ON_ERROR_STOP=1 -c \"CREATE DATABASE \\\"${db}\\\" OWNER \\\"${user}\\\";\""
    "${as_pg[@]}" "psql -v ON_ERROR_STOP=1 -d \"${db}\" -f \"${schema_path}\""
  fi

  echo "Initialized Postgres for historian:"
  echo "  db=${db}"
  echo "  user=${user}"
  echo "  password stored in ${ENV_FILE} as HISTORIAN_PGPASSWORD"
}

node_deps_installed() {
  local dir="$1"
  [[ -d "$dir/node_modules" ]] || return 1
  [[ -f "$dir/package.json" ]] || return 1
  # Validate every declared production dependency. Checking only one known
  # package lets an upgraded service start with stale node_modules.
  have_cmd npm || return 1
  (cd "$dir" && npm ls --omit=dev --depth=0 >/dev/null 2>&1) || return 1
  return 0
}

print_node_deps_install_instructions() {
  local service_name="$1" # human label
  local dir="$2"          # install dir
  echo "To install ${service_name} Node dependencies:"
  echo "  sudo -u ${SERVICE_USER} env HOME=\"${DATA_ROOT}\" NPM_CONFIG_CACHE=\"${DATA_ROOT}/.npm\" bash -lc 'cd \"${dir}\" && npm ci --omit=dev'"
  echo "Then enable/start:"
  if [[ "$service_name" == "opcbridge-hmi" ]]; then
    echo "  sudo systemctl enable --now opcbridge-hmi"
  elif [[ "$service_name" == "opcbridge-scada" ]]; then
    echo "  sudo systemctl enable --now opcbridge-scada"
  else
    echo "  sudo systemctl enable --now ${service_name}"
  fi
}

mark_install_error() {
  INSTALL_HAD_ERRORS=1
}

verify_component_installation() {
  local component="$1"
  local -a required=()

  case "$component" in
    opcbridge) required=("$PREFIX/bin/opcbridge" "$PREFIX/VERSION");;
    alarms) required=("$PREFIX/bin/opcbridge-alarms");;
    scada) required=("$PREFIX/scada/server.js" "$PREFIX/scada/VERSION");;
    hmi) required=("$PREFIX/hmi/server.js" "$PREFIX/hmi/VERSION");;
    logger) required=("$PREFIX/bin/opcbridge-logger");;
    historian) required=("$PREFIX/bin/opcbridge-historian");;
    report) required=(
      "$PREFIX/report/opcbridge-report"
      "$PREFIX/report/VERSION"
      "$PREFIX/report/vendor/autoload.php"
      "$PREFIX/bin/opcbridge-report"
    );;
    flow) required=("$PREFIX/bin/opcbridge-flow");;
    *)
      echo "ERROR: Cannot verify unknown component: $component" >&2
      return 1
      ;;
  esac

  local missing=0
  local artifact
  for artifact in "${required[@]}"; do
    if [[ ! -e "$artifact" ]]; then
      echo "ERROR: $component installation is missing: $artifact" >&2
      missing=1
    fi
  done

  if [[ "$component" == "report" ]]; then
    if [[ ! -x "$PREFIX/report/opcbridge-report" ]]; then
      echo "ERROR: Report generator is not executable: $PREFIX/report/opcbridge-report" >&2
      missing=1
    fi
    if [[ ! -x "$PREFIX/bin/opcbridge-report" ]]; then
      echo "ERROR: Report launcher is missing or not executable: $PREFIX/bin/opcbridge-report" >&2
      missing=1
    fi
  fi

  [[ "$missing" -eq 0 ]]
}

verify_selected_installation() {
  echo "Verifying installed components..."
  local component
  local failed=0
  for component in "${COMPONENTS[@]}"; do
    if verify_component_installation "$component"; then
      echo "  ✓ $component artifacts verified"
    else
      echo "  ✗ $component installation is incomplete" >&2
      failed=1
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    echo "ERROR: One or more selected components were not installed completely." >&2
    return 1
  fi
}

logger_health_ok() {
  local host port
  host="$(sed -nE 's/.*"listen_host"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$CONFIG_ROOT/logger/config.json" 2>/dev/null | head -n 1)"
  [[ -n "$host" ]] || host="127.0.0.1"
  if [[ "$host" == "0.0.0.0" || "$host" == "::" || "$host" == "[::]" ]]; then
    host="127.0.0.1"
  fi
  port="$(sed -nE 's/.*"listen_port"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$CONFIG_ROOT/logger/config.json" 2>/dev/null | head -n 1)"
  [[ -n "$port" ]] || port=8095
  local url="http://${host}:${port}/health"

  if have_cmd curl; then
    curl -fsS --max-time 2 "$url" 2>/dev/null | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'
    return
  fi
  if have_cmd wget; then
    wget -qO- --timeout=2 "$url" 2>/dev/null | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'
    return
  fi

  echo "Warning: curl/wget is unavailable; cannot verify opcbridge-logger health." >&2
  return 1
}

wait_for_logger_health() {
  local attempt
  for attempt in {1..10}; do
    if logger_health_ok; then
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback_logger_migration() {
  [[ "$LOGGER_LEGACY_PRESENT" -eq 1 ]] || return 0
  echo "Rolling back to opcbridge-reporter..."
  systemctl disable --now opcbridge-logger.service >/dev/null 2>&1 || true
  systemctl daemon-reload >/dev/null 2>&1 || true
  if [[ "$LOGGER_LEGACY_WAS_ENABLED" -eq 1 ]]; then
    systemctl enable opcbridge-reporter.service >/dev/null 2>&1 || true
  fi
  if systemctl start opcbridge-reporter.service >/dev/null 2>&1; then
    echo "  ✓ Restored opcbridge-reporter"
  else
    echo "  ✗ Could not restart opcbridge-reporter; inspect its journal immediately." >&2
  fi
}

finalize_logger_migration() {
  [[ "$LOGGER_LEGACY_PRESENT" -eq 1 ]] || return 0
  echo "Removing superseded opcbridge-reporter executable and systemd units..."
  rm -f "$PREFIX/bin/opcbridge-reporter"
  rm -f /etc/systemd/system/opcbridge-reporter.service

  local unit_file
  for unit_file in \
    /etc/systemd/system/opcbridge-reporter-*.timer \
    /etc/systemd/system/opcbridge-reporter-*.service
  do
    [[ -e "$unit_file" ]] || continue
    rm -f "$unit_file"
  done
  systemctl daemon-reload >/dev/null 2>&1 || true
  systemctl reset-failed opcbridge-reporter.service >/dev/null 2>&1 || true
  echo "  Preserved legacy config/data as rollback copies."
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
	ExecStart=/bin/sh -c 'exec ${PREFIX}/bin/opcbridge --config ${CONFIG_ROOT} --http --ws --ws-port \"\${OPCBRIDGE_WS_PORT:-8090}\" --opcua --opcua-port \"\${OPCBRIDGE_OPCUA_PORT:-4840}\"'
	User=${SERVICE_USER}
	Group=${SERVICE_GROUP}
	LimitNOFILE=65536
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
	ExecStart=/bin/sh -c 'exec ${PREFIX}/bin/opcbridge-alarms --config ${CONFIG_ROOT} --opcbridge-host 127.0.0.1 --opcbridge-http-port \"\${OPCBRIDGE_HTTP_PORT:-8080}\" --opcbridge-ws-port \"\${OPCBRIDGE_WS_PORT:-8090}\" --http-port \"\${ALARMS_HTTP_PORT:-8085}\" --ws-port \"\${ALARMS_WS_PORT:-8086}\" --opcua --admin-token \"\${OPCBRIDGE_ADMIN_SERVICE_TOKEN}\"'
	User=${SERVICE_USER}
	Group=${SERVICE_GROUP}
	SupplementaryGroups=audio dialout
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
	WorkingDirectory=${PREFIX}/scada
	ExecStart=/bin/sh -c 'PORT=\"\${SCADA_PORT:-3010}\" exec /usr/bin/node ${PREFIX}/scada/server.js'
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
	Environment=HOME=${DATA_ROOT}
	Environment=NPM_CONFIG_CACHE=${DATA_ROOT}/.npm
	WorkingDirectory=${PREFIX}/hmi
	ExecStart=/bin/sh -c 'PORT=\"\${HMI_PORT:-3000}\" exec /usr/bin/node ${PREFIX}/hmi/server.js'
	User=${SERVICE_USER}
	Group=${SERVICE_GROUP}
	Restart=always
RestartSec=2

	[Install]
	WantedBy=multi-user.target
	"
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'historian'; then
      write_unit "opcbridge-historian.service" "[Unit]
Description=opcbridge historian
After=network.target opcbridge.service
Wants=opcbridge.service

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${PREFIX}
ExecStart=/bin/sh -c 'export PGPASSWORD=\"\${HISTORIAN_PGPASSWORD:-}\"; exec ${PREFIX}/bin/opcbridge-historian --config ${CONFIG_ROOT}/historian/config.json --opcbridge-host 127.0.0.1 --opcbridge-http-port \"\${OPCBRIDGE_HTTP_PORT:-8080}\" --opcbridge-ws-port \"\${OPCBRIDGE_WS_PORT:-8090}\" --pg-conninfo \"host=\${HISTORIAN_PGHOST:-127.0.0.1} port=\${HISTORIAN_PGPORT:-5432} dbname=\${HISTORIAN_PGDB:-opcbridge_historian} user=\${HISTORIAN_PGUSER:-opcbridge_historian}\"'
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'logger'; then
      write_unit "opcbridge-logger.service" "[Unit]
Description=OPCBridge data logger
After=network.target opcbridge.service
Wants=opcbridge.service

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${PREFIX}
ExecStart=${PREFIX}/bin/opcbridge-logger --service --config ${CONFIG_ROOT}/logger/config.json --databases ${CONFIG_ROOT}/logger/databases.json --reports ${CONFIG_ROOT}/logger/reports.json --data-checks ${CONFIG_ROOT}/logger/data_checks.json --sync-jobs ${CONFIG_ROOT}/logger/database_sync.json --state ${DATA_ROOT}/logger/runtime_state.json
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"

    # Prevent the old unit from returning at boot. When services are being
    # started now, it remains available for rollback until logger is healthy.
    systemctl disable opcbridge-reporter.service >/dev/null 2>&1 || true
    while read -r unit _rest; do
      [[ -n "${unit:-}" ]] || continue
      systemctl disable --now "$unit" >/dev/null 2>&1 || true
    done < <(systemctl list-unit-files 'opcbridge-reporter-*.timer' --no-legend 2>/dev/null || true)
  fi

  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'flow'; then
      write_unit "opcbridge-flow.service" "[Unit]
Description=OPCBridge visual flow runtime
After=network.target opcbridge.service
Wants=opcbridge.service

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${PREFIX}
ExecStart=${PREFIX}/bin/opcbridge-flow --config ${CONFIG_ROOT}/flow/config.json --flows ${CONFIG_ROOT}/flow/flows.json --deployed ${DATA_ROOT}/flow/deployed.json --state ${DATA_ROOT}/flow/runtime_state.json
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
    for svc in opcbridge opcbridge-alarms opcbridge-scada opcbridge-hmi opcbridge-logger opcbridge-historian opcbridge-flow; do
      if systemctl cat "$svc" >/dev/null 2>&1; then
        if [[ "$svc" == "opcbridge-hmi" ]]; then
          if ! node_deps_installed "$PREFIX/hmi"; then
            echo "ERROR: opcbridge-hmi selected but Node dependencies are not installed."
            print_node_deps_install_instructions "opcbridge-hmi" "$PREFIX/hmi"
            mark_install_error
            continue
          fi
        fi
        if [[ "$svc" == "opcbridge-historian" ]]; then
          # Keep the unit installed but skip enable unless initialized.
          if ! grep -Eq '^HISTORIAN_PGPASSWORD=.+$' "$ENV_FILE" 2>/dev/null; then
            echo "NOTE: opcbridge-historian installed but HISTORIAN_PGPASSWORD is not set in ${ENV_FILE}."
            echo "      Set HISTORIAN_* vars (or re-run with --init-historian-db), then:"
            echo "        sudo systemctl enable --now opcbridge-historian"
            continue
          fi
        fi
        systemctl enable "$svc" >/dev/null 2>&1 || true
      fi
    done
  fi

  # Service restart is now handled per-component in main() for better feedback.
}

main() {
  # Allow help without sudo/root.
  for arg in "$@"; do
    case "$arg" in
      -h|--help) usage; exit 0;;
    esac
  done

  need_root

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --opcbridge-only) PROFILE="opcbridge-only"; shift;;
      --alarms-only) PROFILE="alarms-only"; shift;;
      --scada-only) PROFILE="scada-only"; shift;;
      --hmi-only) PROFILE="hmi-only"; shift;;
      --logger-only) PROFILE="logger-only"; shift;;
      --flow-only) PROFILE="flow-only"; shift;;
      --report-only) PROFILE="report-only"; shift;;
      --full|--suite) PROFILE="full"; shift;;
      --components) split_csv "${2:-}"; shift 2;;
      --prefix) PREFIX="${2:-}"; shift 2;;
      --config) CONFIG_ROOT="${2:-}"; ENV_FILE="${CONFIG_ROOT}/opcbridge.env"; shift 2;;
      --data) DATA_ROOT="${2:-}"; shift 2;;
      --logs) LOG_ROOT="${2:-}"; shift 2;;
      --user) SERVICE_USER="${2:-}"; shift 2;;
      --group) SERVICE_GROUP="${2:-}"; shift 2;;
      --no-build) BUILD=0; shift;;
      --with-node-deps) WITH_NODE_DEPS=1; shift;;
      --deps) INSTALL_DEPS=1; shift;;
      --init-historian-db) INIT_HISTORIAN_DB=1; shift;;
      --with-odbc) WITH_ODBC=1; shift;;
      --odbc-driver) ODBC_DRIVER="${2:-}"; shift 2;;
      --with-pjsip) WITH_PJSIP=1; WITH_PJSIP_EXPLICIT=1; shift;;
      --no-pjsip) WITH_PJSIP=0; WITH_PJSIP_EXPLICIT=1; shift;;
      --scada-systemd-sudo) SCADA_SYSTEMD_SUDO=1; shift;;
      --no-start) START_SERVICES=0; shift;;
      --no-enable) ENABLE_SERVICES=0; shift;;
      -y|--yes) ASSUME_YES=1; shift;;
      -h|--help) usage; exit 0;;
      *) echo "Unknown arg: $1" >&2; usage; exit 1;;
    esac
  done

  if [[ "${#COMPONENTS[@]}" -eq 0 ]]; then
    # Allow `--deps` to be used as a standalone "install dependencies" action without
    # forcing an interactive component selection prompt (useful for headless/server installs).
    if [[ -z "$PROFILE" && "$INSTALL_DEPS" -eq 1 ]]; then
      PROFILE="full"
    fi
    if [[ -n "$PROFILE" ]]; then
      :
    else
      choose_interactive
    fi
  fi

  if [[ "${#COMPONENTS[@]}" -eq 0 ]]; then
    case "$PROFILE" in
      opcbridge-only) COMPONENTS=(opcbridge);;
      alarms-only) COMPONENTS=(alarms);;
      scada-only) COMPONENTS=(scada);;
      hmi-only) COMPONENTS=(hmi);;
      logger-only) COMPONENTS=(logger);;
      flow-only) COMPONENTS=(flow);;
      report-only) COMPONENTS=(report);;
      full|"") COMPONENTS=(opcbridge alarms scada hmi logger historian report flow);;
      *) echo "Unknown profile: $PROFILE" >&2; exit 1;;
    esac
  fi

  validate_components

  # Treat Node deps like a dependency when doing a deps install.
  # Keep --with-node-deps for cases where users want to install Node deps without --deps (e.g. --hmi-only).
  if [[ "$INSTALL_DEPS" -eq 1 ]]; then
    WITH_NODE_DEPS=1
  fi

  # Default SIP UA behavior:
  # - Do NOT build/install pjsua unless the user asked for it (--with-pjsip), or they are doing a full deps install (--deps).
  # - Treat pjproject/pjsua like a "dependency" only when --deps is used (opt-out with --no-pjsip).
  if [[ "$WITH_PJSIP_EXPLICIT" -eq 0 ]] && [[ "$INSTALL_DEPS" -eq 1 ]] && printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    WITH_PJSIP=1
  fi

  maybe_prompt_install_deps

  # Optional: SQL Server support for opcbridge-logger via ODBC (wizard-style).
  if [[ "$INSTALL_DEPS" -eq 1 ]] && printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'logger'; then
    if [[ "$WITH_ODBC" -eq 0 ]]; then
      if prompt_yn "Enable SQL Server logging support (ODBC) for opcbridge-logger?" n; then
        WITH_ODBC=1
      fi
    fi

    if [[ "$WITH_ODBC" -eq 1 ]]; then
      local driver
      driver="$(echo "${ODBC_DRIVER:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
      if [[ -z "$driver" ]]; then
        local choice
        choice="$(prompt_choice "Select ODBC driver:" "FreeTDS (recommended on Debian)" "Microsoft ODBC driver (msodbcsql18)")"
        case "$choice" in
          FreeTDS*) driver="freetds";;
          Microsoft*) driver="ms";;
          *) driver="freetds";;
        esac
      fi
      if [[ "$driver" != "freetds" && "$driver" != "ms" ]]; then
        echo "Unknown --odbc-driver '$driver'; defaulting to freetds."
        driver="freetds"
      fi
      ODBC_DRIVER="$driver"
      echo "ODBC enabled for logger (driver=${ODBC_DRIVER})."
    fi
  fi

  if [[ "$INSTALL_DEPS" -eq 1 ]]; then
    install_deps
    install_source_deps
    echo ""
    echo "Dependencies installed."
    echo ""
  fi

  # Optional: install pjproject (pjsua) for SIP callouts.
  if [[ "$WITH_PJSIP" -eq 1 ]]; then
    install_pjproject
    echo ""
    echo "pjproject installed."
    echo ""
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
  if printf '%s\n' "${COMPONENTS[@]}" | grep -Eqx '(alarms|scada)'; then
    ensure_audio_group_access
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'alarms'; then
    ensure_dialout_group_access
  fi
  # If SCADA is installed, grant the service user journal access so the Logs tab works by default.
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'scada'; then
    ensure_logs_group_access
  fi
  ensure_dirs
  install_licenses
  write_env_file
  fix_config_permissions
  build_if_needed

  for c in "${COMPONENTS[@]}"; do
    case "$c" in
      opcbridge) install_opcbridge;;
      alarms) install_alarms;;
      scada) install_scada;;
      hmi) install_hmi;;
      logger) install_logger;;
      historian) install_historian;;
      report) install_report;;
      flow) install_flow;;
    esac
  done
  verify_selected_installation || mark_install_error
  fix_config_permissions

  # Option A: keep opcbridge-scada unprivileged but allow limited systemd control via sudoers.
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'scada'; then
    if [[ "$SCADA_SYSTEMD_SUDO" -eq 1 ]]; then
      install_scada_systemd_sudoers || true
    else
      if prompt_yn "Allow opcbridge-scada to manage opcbridge.service via sudoers (recommended)?" y; then
        install_scada_systemd_sudoers || true
      fi
    fi
  fi

  install_systemd_units

  # Optional: initialize local Postgres and load schema after install (so service can start).
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'historian'; then
    if have_cmd psql; then
      if [[ "$INIT_HISTORIAN_DB" -eq 0 ]]; then
        if prompt_yn "Initialize local Postgres DB for historian now (create role/db + load schema)?" y; then
          INIT_HISTORIAN_DB=1
        fi
      fi
      if [[ "$INIT_HISTORIAN_DB" -eq 1 ]]; then
        init_historian_db || mark_install_error
        systemctl daemon-reload >/dev/null 2>&1 || true
        if [[ "$ENABLE_SERVICES" -eq 1 ]] && systemctl cat "opcbridge-historian" >/dev/null 2>&1; then
          systemctl enable "opcbridge-historian" >/dev/null 2>&1 || true
        fi
      fi
    else
      echo "Note: Postgres client (psql) not found; skipping historian DB initialization."
      echo "      Re-run with --deps and/or --init-historian-db to auto-create the DB and load schema."
    fi
  fi

  # Restart services individually for better feedback.
  if [[ "$START_SERVICES" -eq 1 ]]; then
    for c in "${COMPONENTS[@]}"; do
      local svc=""
      case "$c" in
        opcbridge) svc="opcbridge";;
        alarms) svc="opcbridge-alarms";;
        scada) svc="opcbridge-scada";;
        hmi) svc="opcbridge-hmi";;
        logger) svc="opcbridge-logger";;
        historian) svc="opcbridge-historian";;
        flow) svc="opcbridge-flow";;
      esac

      if [[ -n "$svc" ]] && systemctl cat "$svc" >/dev/null 2>&1; then
        # Special check for HMI: ensure Node deps are installed.
        if [[ "$svc" == "opcbridge-hmi" ]]; then
          if ! node_deps_installed "$PREFIX/hmi"; then
            echo "ERROR: opcbridge-hmi selected but Node dependencies are not installed."
            print_node_deps_install_instructions "opcbridge-hmi" "$PREFIX/hmi"
            mark_install_error
            continue
          fi
        fi
        if [[ "$svc" == "opcbridge-historian" ]]; then
          if ! grep -Eq '^HISTORIAN_PGPASSWORD=.+$' "$ENV_FILE" 2>/dev/null; then
            echo "Skipping start of opcbridge-historian (HISTORIAN_PGPASSWORD is not set in ${ENV_FILE})."
            echo "After configuring Postgres, start with:"
            echo "  sudo systemctl restart opcbridge-historian"
            continue
          fi
        fi

        if [[ "$svc" == "opcbridge-logger" && "$LOGGER_LEGACY_PRESENT" -eq 1 ]]; then
          echo "Stopping opcbridge-reporter for logger migration..."
          systemctl stop opcbridge-reporter.service >/dev/null 2>&1 || true
        fi

        local service_started=0
        if systemctl is-active --quiet "$svc"; then
          echo "Restarting $svc (currently running)..."
          if systemctl restart "$svc" 2>/dev/null; then
            echo "  ✓ $svc restarted successfully"
            service_started=1
          else
            echo "  ✗ Failed to restart $svc (check: journalctl -u $svc -n 50)"
          fi
        else
          echo "Starting $svc..."
          if systemctl start "$svc" 2>/dev/null; then
            echo "  ✓ $svc started successfully"
            service_started=1
          else
            echo "  ✗ Failed to start $svc (check: journalctl -u $svc -n 50)"
          fi
        fi

        if [[ "$svc" == "opcbridge-logger" && "$service_started" -eq 1 ]]; then
          echo "Verifying opcbridge-logger health..."
          if wait_for_logger_health; then
            echo "  ✓ opcbridge-logger health check passed"
            finalize_logger_migration
          else
            echo "  ✗ opcbridge-logger did not become healthy" >&2
            service_started=0
          fi
        fi

        if [[ "$service_started" -ne 1 ]]; then
          if [[ "$svc" == "opcbridge-logger" ]]; then
            rollback_logger_migration
          fi
          mark_install_error
        fi
      fi
    done
  fi

  if [[ "$INSTALL_HAD_ERRORS" -eq 1 ]]; then
    echo ""
    echo "Install finished with errors. Fix the issues above and re-run enable/start."
    exit 1
  fi

  echo ""
  echo "Installed."
  echo "Env file: ${ENV_FILE}"
  echo "opcbridge: http://<host>:8080"
  echo "alarms:    http://<host>:8085/alarm/api/status"
  echo "scada:     http://<host>:3010"
  echo "reports:   http://<host>:3010/reports"
  echo "hmi:       http://<host>:3000"
  echo "flow API:  http://127.0.0.1:8098/health"
  echo ""
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'scada'; then
    echo "Note: SCADA Logs tab uses journalctl; installer grants access via systemd-journal group when available."
  fi
  echo "Logs:"
  echo "  journalctl -u opcbridge -f"
  echo "  journalctl -u opcbridge-alarms -f"
  echo "  journalctl -u opcbridge-scada -f"
  echo "  journalctl -u opcbridge-hmi -f"
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'logger'; then
    echo "  journalctl -u opcbridge-logger -f"
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'historian'; then
    echo "  journalctl -u opcbridge-historian -f"
  fi
  if printf '%s\n' "${COMPONENTS[@]}" | grep -qx 'flow'; then
    echo "  journalctl -u opcbridge-flow -f"
  fi
}

main "$@"
