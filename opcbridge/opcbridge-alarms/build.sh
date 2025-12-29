#!/bin/bash
set -e

VERSION="0.1.0"

CXX_FLAGS="-std=c++17 -Wall -Wextra -O2"
CC_FLAGS="-std=c99 -O2"
INCLUDES="-I. -I./src -I.. -I/usr/local/include"
LIBS="-L/usr/local/lib -lixwebsocket -lssl -lcrypto -lz -lsqlite3 -pthread -ldl -lm"

OUT="./opcbridge-alarms"
UA_OBJ="./build/open62541.o"

echo "Building opcbridge-alarms version ${VERSION}"

mkdir -p build
cc ${CC_FLAGS} -I.. -c ../open62541.c -o ${UA_OBJ}

g++ ${CXX_FLAGS} ${INCLUDES} src/main.cpp ${UA_OBJ} -o ${OUT} \
  -DOPCBRIDGE_ALARMS_VERSION=\"${VERSION}\" \
  ${LIBS}

echo "Build complete."
echo "  Binary:  ${OUT}"
echo "  Version: ${VERSION}"
