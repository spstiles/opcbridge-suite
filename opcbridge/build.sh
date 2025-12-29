#!/bin/bash
set -e

VERSION="0.2.1"

CXX_FLAGS="-std=c++17 -Wall -Wextra -O2"
C_FLAGS="-std=c99 -O2"

# Include current dir + ixwebsocket headers
INCLUDES="-I. -I/usr/local/include"

# Library search paths + libs
LIBS="-L/usr/local/lib \
      -lplctag -lmosquitto -lsqlite3 -pthread \
      -lixwebsocket -lssl -lcrypto -lz"

OUT="./opcbridge"

echo "Building opcbridge version ${VERSION}"

# Compile open62541.c as C
gcc ${C_FLAGS} ${INCLUDES} -c open62541.c -o open62541.o

# Compile & link main.cpp + ws.cpp as C++
g++ ${CXX_FLAGS} ${INCLUDES} main.cpp ws.cpp open62541.o -o ${OUT} \
    -DOPCBRIDGE_VERSION=\"${VERSION}\" \
    ${LIBS}

echo "Build complete."
echo "  Binary:  ${OUT}"
echo "  Version: ${VERSION}"
