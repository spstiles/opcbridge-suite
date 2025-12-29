#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

SUITE_VERSION="$(cat "$ROOT/../VERSION" 2>/dev/null | tr -d '\r\n' || true)"
COMPONENT_VERSION="$(cat "$ROOT/VERSION" 2>/dev/null | tr -d '\r\n' || true)"
: "${SUITE_VERSION:=dev}"
: "${COMPONENT_VERSION:=${SUITE_VERSION}}"

CXX_FLAGS="-std=c++17 -Wall -Wextra -O2"
CC_FLAGS="-std=c99 -O2"
INCLUDES="-I. -I./src -I.. -I/usr/local/include"
LIBS="-L/usr/local/lib -lixwebsocket -lssl -lcrypto -lz -lsqlite3 -pthread -ldl -lm"

OUT="./opcbridge-alarms"
UA_OBJ="./build/open62541.o"

UA_DIR="$ROOT/../opcbridge"

echo "Building opcbridge-alarms version ${COMPONENT_VERSION} (suite ${SUITE_VERSION})"

mkdir -p build
cc ${CC_FLAGS} -I"${UA_DIR}" -c "${UA_DIR}/open62541.c" -o ${UA_OBJ}

g++ ${CXX_FLAGS} ${INCLUDES} src/main.cpp ${UA_OBJ} -o ${OUT} \
  -DOPCBRIDGE_ALARMS_VERSION=\"${COMPONENT_VERSION}\" \
  -DOPCBRIDGE_SUITE_VERSION=\"${SUITE_VERSION}\" \
  -I"${UA_DIR}" \
  ${LIBS}

echo "Build complete."
echo "  Binary:  ${OUT}"
echo "  Version: ${COMPONENT_VERSION}"
echo "  Suite:   ${SUITE_VERSION}"
