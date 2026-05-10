#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

SUITE_VERSION="$(cat "$ROOT/../VERSION" 2>/dev/null | tr -d '\r\n' || true)"
COMPONENT_VERSION="$(cat "$ROOT/VERSION" 2>/dev/null | tr -d '\r\n' || true)"
: "${SUITE_VERSION:=dev}"
: "${COMPONENT_VERSION:=${SUITE_VERSION}}"

CXX_FLAGS="-std=c++17 -Wall -Wextra -Wno-cpp -O2"
CC_FLAGS="-std=c99 -O2"
INCLUDES="-I. -I./src -I.. -I/usr/local/include"
LIBS="-L/usr/local/lib -lixwebsocket -lssl -lcrypto -lz -lsqlite3 -pthread -ldl -lm"

OUT="./build/opcbridge-alarms"
UA_OBJ="./build/open62541.o"

UA_DIR="$ROOT/../opcbridge"

echo "Building opcbridge-alarms version ${COMPONENT_VERSION} (suite ${SUITE_VERSION})"

mkdir -p build
cc ${CC_FLAGS} -I"${UA_DIR}" -c "${UA_DIR}/open62541.c" -o ${UA_OBJ}

# Optional: link against pjproject (PJSUA2) when installed (enables dependable SIP with DTMF callbacks).
PJSIP_PREFIX="${OPCBRIDGE_PREFIX:-/opt/opcbridge-suite}/third_party/pjproject"
PJSIP_DEFINES=""
PJSIP_INCLUDES=""
PJSIP_LIBS=""
if [[ -f "${PJSIP_PREFIX}/include/pjsua2.hpp" && -f "${PJSIP_PREFIX}/lib/libpjsua2.so" ]]; then
  echo "  + Detected pjproject at ${PJSIP_PREFIX} (enabling PJSUA2)"
  PJSIP_DEFINES="-DOPCBRIDGE_HAVE_PJSUA2=1"
  PJSIP_INCLUDES="-I${PJSIP_PREFIX}/include"
  # Link directly to shared libs in the pjproject prefix.
  PJSIP_LIBS="-L${PJSIP_PREFIX}/lib -lpjsua2 -lpjsua -lpjsip-ua -lpjsip-simple -lpjsip -lpjmedia-codec -lpjmedia-videodev -lpjmedia-audiodev -lpjmedia -lpjnath -lpjlib-util -lpj -lsrtp -lresample -lg7221codec -lgsmcodec -lspeex -lilbccodec -lyuv -lwebrtc"
  # Ensure runtime can find pjproject shared libs (we also install an ld.so conf file in install.sh).
  PJSIP_LIBS+=" -Wl,-rpath,${PJSIP_PREFIX}/lib"
fi

g++ ${CXX_FLAGS} ${INCLUDES} src/main.cpp ${UA_OBJ} -o ${OUT} \
  -DOPCBRIDGE_ALARMS_VERSION=\"${COMPONENT_VERSION}\" \
  -DOPCBRIDGE_SUITE_VERSION=\"${SUITE_VERSION}\" \
  -I"${UA_DIR}" \
  ${PJSIP_DEFINES} ${PJSIP_INCLUDES} \
  ${LIBS} ${PJSIP_LIBS}

echo "Build complete."
echo "  Binary:  ${OUT}"
echo "  Version: ${COMPONENT_VERSION}"
echo "  Suite:   ${SUITE_VERSION}"
