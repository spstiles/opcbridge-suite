#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

SUITE_VERSION="$(cat "$ROOT/../VERSION" 2>/dev/null | tr -d '\r\n' || true)"
COMPONENT_VERSION="$(cat "$ROOT/VERSION" 2>/dev/null | tr -d '\r\n' || true)"
: "${SUITE_VERSION:=dev}"
: "${COMPONENT_VERSION:=${SUITE_VERSION}}"

CXX_FLAGS="-std=c++17 -Wall -Wextra -O2"
C_FLAGS="-std=c99 -O2"

# Include current dir + ixwebsocket headers
INCLUDES="-I. -I/usr/local/include"

# Library search paths + libs
LIBS="-L/usr/local/lib \
      -lplctag -lmosquitto -lsqlite3 -pthread \
      -lixwebsocket -lssl -lcrypto -lz"

OUT="./opcbridge"

echo "Building opcbridge version ${COMPONENT_VERSION} (suite ${SUITE_VERSION})"

# Compile open62541.c as C
gcc ${C_FLAGS} ${INCLUDES} -c open62541.c -o open62541.o

# Compile & link main.cpp + ws.cpp as C++
g++ ${CXX_FLAGS} ${INCLUDES} main.cpp ws.cpp open62541.o -o ${OUT} \
    -DOPCBRIDGE_VERSION=\"${COMPONENT_VERSION}\" \
    -DOPCBRIDGE_SUITE_VERSION=\"${SUITE_VERSION}\" \
    ${LIBS}

echo "Build complete."
echo "  Binary:  ${OUT}"
echo "  Version: ${COMPONENT_VERSION}"
echo "  Suite:   ${SUITE_VERSION}"
