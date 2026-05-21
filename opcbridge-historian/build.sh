#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

CXX="${CXX:-g++}"
SUITE_VERSION="$(tr -d '\r\n' < ../VERSION 2>/dev/null || echo dev)"
COMPONENT_VERSION="$(tr -d '\r\n' < VERSION 2>/dev/null || echo dev)"

# We reuse the vendored cpp-httplib header from opcbridge.
INCLUDES=(
  -I../opcbridge
)

EXTRA_CFLAGS=()
EXTRA_LIBS=()

# Try to locate libpq headers/libs (most distros install headers under /usr/include/postgresql).
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists libpq; then
  # shellcheck disable=SC2207
  EXTRA_CFLAGS+=($(pkg-config --cflags libpq))
  # shellcheck disable=SC2207
  EXTRA_LIBS+=($(pkg-config --libs libpq))
elif [[ -f /usr/include/postgresql/libpq-fe.h ]]; then
  EXTRA_CFLAGS+=(-I/usr/include/postgresql)
  EXTRA_LIBS+=(-lpq)
else
  echo "error: libpq headers not found (missing libpq development package)." >&2
  echo "install: Debian/Ubuntu: libpq-dev; RHEL/Fedora: libpq-devel/postgresql-devel" >&2
  exit 1
fi

CXXFLAGS=(
  -O2
  -std=c++17
  -Wall
  -Wextra
  -Wpedantic
  -DOPCBRIDGE_SUITE_VERSION="\"${SUITE_VERSION}\""
  -DOPCBRIDGE_HISTORIAN_VERSION="\"${COMPONENT_VERSION}\""
  "${INCLUDES[@]}"
  "${EXTRA_CFLAGS[@]}"
)

LIBS=(
  -lixwebsocket
  -lssl
  -lcrypto
  -lz
  -pthread
  "${EXTRA_LIBS[@]}"
)

"$CXX" "${CXXFLAGS[@]}" -o opcbridge-historian src/main.cpp "${LIBS[@]}"

echo "Built ./opcbridge-historian"
