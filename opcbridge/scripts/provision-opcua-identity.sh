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
PKI_ROOT="$OPCUA_ROOT/pki"
APPLICATION_STORE="$PKI_ROOT/ApplCerts"
USER_STORE="$PKI_ROOT/UserTokenCerts"
OWN_CERTS="$APPLICATION_STORE/own/certs"
OWN_PRIVATE="$APPLICATION_STORE/own/private"
TRUSTED_CERTS="$APPLICATION_STORE/trusted/certs"
ISSUER_CERTS="$APPLICATION_STORE/issuer/certs"
REJECTED_CERTS="$APPLICATION_STORE/rejected/certs"
CERT_PEM="$OWN_CERTS/opcbridge-application.pem"
CERT_DER="$OWN_CERTS/opcbridge-application.der"
KEY_PEM="$OWN_PRIVATE/opcbridge-application-key.pem"
KEY_DER="$OWN_PRIVATE/opcbridge-application-key.der"
IDENTITY_JSON="$OPCUA_ROOT/identity.json"

install -d -m 0750 -o "$OWNER" -g "$GROUP" \
  "$OPCUA_ROOT" "$PKI_ROOT" "$APPLICATION_STORE" \
  "$APPLICATION_STORE/own" "$OWN_CERTS" \
  "$APPLICATION_STORE/trusted" "$TRUSTED_CERTS" "$APPLICATION_STORE/trusted/crl" \
  "$APPLICATION_STORE/issuer" "$ISSUER_CERTS" "$APPLICATION_STORE/issuer/crl" \
  "$APPLICATION_STORE/rejected" "$REJECTED_CERTS" \
  "$USER_STORE" "$USER_STORE/own" "$USER_STORE/own/certs" \
  "$USER_STORE/trusted" "$USER_STORE/trusted/certs" "$USER_STORE/trusted/crl" \
  "$USER_STORE/issuer" "$USER_STORE/issuer/certs" "$USER_STORE/issuer/crl" \
  "$USER_STORE/rejected" "$USER_STORE/rejected/certs"
install -d -m 0700 -o "$OWNER" -g "$GROUP" "$OWN_PRIVATE"
install -d -m 0700 -o "$OWNER" -g "$GROUP" "$USER_STORE/own/private"

# The first security milestone used a simpler pre-filestore layout. Move that
# identity forward without generating a new certificate or changing trust.
LEGACY_CERT_PEM="$OPCUA_ROOT/own/certs/opcbridge-application.pem"
LEGACY_CERT_DER="$OPCUA_ROOT/own/certs/opcbridge-application.der"
LEGACY_KEY_PEM="$OPCUA_ROOT/own/private/opcbridge-application-key.pem"
LEGACY_KEY_DER="$OPCUA_ROOT/own/private/opcbridge-application-key.der"
if [[ ! -e "$CERT_PEM" && ! -e "$KEY_PEM" && -f "$LEGACY_CERT_PEM" && -f "$LEGACY_KEY_PEM" ]]; then
  echo "Moving existing OPC UA identity into the standard PKI filestore layout..."
  mv "$LEGACY_CERT_PEM" "$CERT_PEM"
  mv "$LEGACY_KEY_PEM" "$KEY_PEM"
  [[ ! -f "$LEGACY_CERT_DER" ]] || mv "$LEGACY_CERT_DER" "$CERT_DER"
  [[ ! -f "$LEGACY_KEY_DER" ]] || mv "$LEGACY_KEY_DER" "$KEY_DER"
fi

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

HOST_NAME="$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo opcbridge)"
HOST_NAME="${HOST_NAME:-opcbridge}"
# The OPC UA ApplicationURI is part of the certificate identity. Read it back
# from the certificate so reinstalling after a hostname change cannot make the
# metadata disagree with the preserved certificate.
APPLICATION_URI="$(
  openssl x509 -in "$CERT_PEM" -noout -ext subjectAltName 2>/dev/null |
    sed -n 's/.*URI:\([^,[:space:]]*\).*/\1/p' |
    head -n 1
)"
if [[ -z "$APPLICATION_URI" ]]; then
  echo "OPC UA certificate has no ApplicationURI in subjectAltName: $CERT_PEM" >&2
  exit 1
fi
cat >"$IDENTITY_JSON" <<JSON
{
  "application_name": "OPCBridge",
  "application_uri": "${APPLICATION_URI}",
  "host_name": "${HOST_NAME}",
  "pki_store": "certs/opcua/pki",
  "certificate": "certs/opcua/pki/ApplCerts/own/certs/opcbridge-application.der",
  "private_key": "certs/opcua/pki/ApplCerts/own/private/opcbridge-application-key.der"
}
JSON
chown "$OWNER:$GROUP" "$IDENTITY_JSON"
chmod 0640 "$IDENTITY_JSON"

FINGERPRINT="$(openssl x509 -in "$CERT_PEM" -noout -fingerprint -sha256 | sed 's/^sha256 Fingerprint=//I')"
EXPIRES="$(openssl x509 -in "$CERT_PEM" -noout -enddate | sed 's/^notAfter=//')"
echo "OPC UA application identity is ready."
echo "  Certificate: $CERT_PEM"
echo "  SHA-256:     $FINGERPRINT"
echo "  Expires:     $EXPIRES"
