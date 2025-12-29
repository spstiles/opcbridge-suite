# Dev/test launcher.
# In production, set `OPCBRIDGE_WRITE_TOKEN` in the service environment.
export OPCBRIDGE_WRITE_TOKEN="${OPCBRIDGE_WRITE_TOKEN:-dev-testing-token-change-me}"

./opcbridge --ws --http --mqtt
