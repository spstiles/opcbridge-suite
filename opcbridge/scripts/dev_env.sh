#!/usr/bin/env bash
set -euo pipefail

# Helper for development: loads the generated token env file from _run/ so you
# can simply run:  source ./scripts/dev_env.sh
#
# This file is safe to commit because it contains no secrets.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/_run/dev_env.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Run ./scripts/dev_run.sh first (it generates the dev env file)."
  return 1 2>/dev/null || exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

echo "Loaded dev env from $ENV_FILE"
