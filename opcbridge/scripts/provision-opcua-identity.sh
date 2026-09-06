#!/bin/bash
set -euo pipefail

CONFIG_ROOT="${1:-/etc/opcbridge}"
OWNER="${2:-opcbridge}"
GROUP="${3:-opcbridge}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "OpenSSL is required to provision the OPC UA application identity." >&2
  exit 1
fi

OPCUA_ROOT="$CONFIG_ROOT/certs/opcua"
OWN_CERTS="$OPCUA_ROOT/own/certs"
OWN_PRIVATE="$OPCUA_ROOT/own/private"
TRUSTED_CERTS="$OPCUA_ROOT/trusted/certs"
ISSUER_CERTS="$OPCUA_ROOT/issuers/certs"
REJECTED_CERTS="$OPCUA_ROOT/rejected/certs"
CERT_PEM="$OWN_CERTS/opcbridge-application.pem"
CERT_DER="$OWN_CERTS/opcbridge-application.der"
KEY_PEM="$OWN_PRIVATE/opcbridge-application-key.pem"
KEY_DER="$OWN_PRIVATE/opcbridge-application-key.der"
IDENTITY_JSON="$OPCUA_ROOT/identity.json"

install -d -m 0750 -o "$OWNER" -g "$GROUP" \
  "$OPCUA_ROOT" "$OPCUA_ROOT/own" "$OWN_CERTS" \
  "$OPCUA_ROOT/trusted" "$TRUSTED_CERTS" \
  "$OPCUA_ROOT/issuers" "$ISSUER_CERTS" \
  "$OPCUA_ROOT/rejected" "$REJECTED_CERTS"
install -d -m 0700 -o "$OWNER" -g "$GROUP" "$OWN_PRIVATE"

validate_existing_identity() {
  openssl x509 -in "$CERT_PEM" -noout >/dev/null 2>&1 || {
    echo "Existing OPC UA certificate is invalid: $CERT_PEM" >&2
    return 1
  }
  openssl pkey -in "$KEY_PEM" -check -noout >/dev/null 2>&1 || {
    echo "Existing OPC UA private key is invalid: $KEY_PEM" >&2
    return 1
  }
  local cert_public key_public
  cert_public="$(openssl x509 -in "$CERT_PEM" -pubkey -noout | openssl pkey -pubin -outform DER 2>/dev/null | openssl dgst -sha256)"
  key_public="$(openssl pkey -in "$KEY_PEM" -pubout -outform DER 2>/dev/null | openssl dgst -sha256)"
  if [[ -z "$cert_public" || "$cert_public" != "$key_public" ]]; then
    echo "Existing OPC UA certificate and private key do not match; refusing to replace them." >&2
    return 1
  fi
}

if [[ -e "$CERT_PEM" || -e "$KEY_PEM" ]]; then
  if [[ ! -f "$CERT_PEM" || ! -f "$KEY_PEM" ]]; then
    echo "Incomplete OPC UA identity found. Preserve or remove it manually before retrying:" >&2
    echo "  $CERT_PEM" >&2
    echo "  $KEY_PEM" >&2
    exit 1
  fi
  validate_existing_identity
  echo "Preserving existing OPC UA application certificate and private key."
else
  HOST_NAME="$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo opcbridge)"
  HOST_NAME="${HOST_NAME:-opcbridge}"
  URI_HOST="$(printf '%s' "$HOST_NAME" | tr -c 'A-Za-z0-9._-' '-')"
  APPLICATION_URI="urn:${URI_HOST}:OPCBridge"
  CERT_NEW="$OWN_CERTS/.opcbridge-application.pem.new.$$"
  KEY_NEW="$OWN_PRIVATE/.opcbridge-application-key.pem.new.$$"

  echo "Generating OPC UA application identity for ${HOST_NAME}..."
  umask 077
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 3650 \
    -subj "/CN=OPCBridge ${HOST_NAME}/O=OPCBridge" \
    -addext "subjectAltName=URI:${APPLICATION_URI},DNS:${HOST_NAME}" \
    -addext "keyUsage=critical,digitalSignature,keyEncipherment,dataEncipherment" \
    -addext "extendedKeyUsage=serverAuth,clientAuth" \
    -keyout "$KEY_NEW" -out "$CERT_NEW" >/dev/null 2>&1
  mv "$KEY_NEW" "$KEY_PEM"
  mv "$CERT_NEW" "$CERT_PEM"
fi

# DER copies are consumed directly by open62541. They are derived artifacts and
# may be safely recreated without changing the installation's identity.
openssl x509 -in "$CERT_PEM" -outform DER -out "$CERT_DER"
openssl pkey -in "$KEY_PEM" -outform DER -out "$KEY_DER"

chown "$OWNER:$GROUP" "$CERT_PEM" "$CERT_DER" "$KEY_PEM" "$KEY_DER"
chmod 0640 "$CERT_PEM" "$CERT_DER"
chmod 0600 "$KEY_PEM" "$KEY_DER"

if [[ ! -f "$IDENTITY_JSON" ]]; then
  HOST_NAME="$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo opcbridge)"
  HOST_NAME="${HOST_NAME:-opcbridge}"
  URI_HOST="$(printf '%s' "$HOST_NAME" | tr -c 'A-Za-z0-9._-' '-')"
  APPLICATION_URI="urn:${URI_HOST}:OPCBridge"
  cat >"$IDENTITY_JSON" <<JSON
{
  "application_name": "OPCBridge",
  "application_uri": "${APPLICATION_URI}",
  "host_name": "${HOST_NAME}",
  "certificate": "certs/opcua/own/certs/opcbridge-application.der",
  "private_key": "certs/opcua/own/private/opcbridge-application-key.der"
}
JSON
fi
chown "$OWNER:$GROUP" "$IDENTITY_JSON"
chmod 0640 "$IDENTITY_JSON"

FINGERPRINT="$(openssl x509 -in "$CERT_PEM" -noout -fingerprint -sha256 | sed 's/^sha256 Fingerprint=//I')"
EXPIRES="$(openssl x509 -in "$CERT_PEM" -noout -enddate | sed 's/^notAfter=//')"
echo "OPC UA application identity is ready."
echo "  Certificate: $CERT_PEM"
echo "  SHA-256:     $FINGERPRINT"
echo "  Expires:     $EXPIRES"
