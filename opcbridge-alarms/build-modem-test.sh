#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

CXX_FLAGS="-std=c++17 -Wall -Wextra -O2"
OUT="./voice-modem-test"

echo "Building voice modem test utility"
g++ ${CXX_FLAGS} -I./src tools/voice_modem_test.cpp -o "${OUT}"

echo "Build complete."
echo "  Binary: ${OUT}"
