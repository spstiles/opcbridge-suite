#!/bin/bash
# Run inside a disposable Debian 13 amd64 build environment, never on a production server.
set -euo pipefail
cd "$(dirname "$0")/../.."
[[ $(. /etc/os-release; echo "$ID:$VERSION_ID") == debian:13 ]] || { echo 'Requires Debian 13 build environment' >&2; exit 1; }
[[ $(dpkg --print-architecture) == amd64 ]] || exit 1
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends build-essential cmake pkg-config git ca-certificates \
  libssl-dev zlib1g-dev libsqlite3-dev nlohmann-json3-dev libmosquitto-dev libcurl4-openssl-dev \
  libpq-dev default-libmysqlclient-dev unixodbc-dev nodejs npm python3 python3-olefile \
  php-cli php-gd php-mbstring php-xml php-zip php-curl php-intl composer patchelf dpkg-dev
# Avoid inheriting optional host-built SIP libraries. Baresip remains an optional runtime.
export OPCBRIDGE_PREFIX=/nonexistent
third=$(mktemp -d)
trap 'rm -rf "$third"' EXIT
git clone --depth 1 --branch v2.6.12 https://github.com/libplctag/libplctag.git "$third/libplctag"
cmake -S "$third/libplctag" -B "$third/libplctag-build" -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local
cmake --build "$third/libplctag-build" -j2
cmake --install "$third/libplctag-build"
git clone --depth 1 --branch v11.4.6 https://github.com/machinezone/IXWebSocket.git "$third/ixwebsocket"
cmake -S "$third/ixwebsocket" -B "$third/ix-build" -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DUSE_TLS=ON -DUSE_OPEN_SSL=ON -DBUILD_SHARED_LIBS=OFF
cmake --build "$third/ix-build" -j2
cmake --install "$third/ix-build"
(cd opcbridge && ./build.sh)
(cd opcbridge-alarms && ./build.sh)
make -C opcbridge-logger -B
make -C opcbridge-flow -B
(cd opcbridge-historian && ./build.sh)
(cd opcbridge-hmi && npm ci --omit=dev)
(cd opcbridge-report && COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --prefer-dist --no-interaction)
export OPCBRIDGE_THIRD_PARTY_SOURCE="$third"
python3 packaging/debian/build-package.py "${1:-/out}"
