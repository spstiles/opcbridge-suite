'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);

function validateNames(values) {
  if (!Array.isArray(values) || !values.length || values.length > 64) throw new Error('Provide between 1 and 64 hostnames or IP addresses.');
  return [...new Set(values.map(value => {
    const name = String(value).trim();
    if (!net.isIP(name) && !(name.length <= 253 && name.split('.').every(label => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label)))) {
      throw new Error('Invalid hostname or IP address: ' + name);
    }
    return name;
  }))];
}

function certificatePaths(root) {
  const own = path.join(root, 'pki', 'ApplCerts', 'own');
  return {
    pem: path.join(own, 'certs', 'opcbridge-application.pem'),
    der: path.join(own, 'certs', 'opcbridge-application.der'),
    key: path.join(own, 'private', 'opcbridge-application-key.pem')
  };
}

function defaults(root) {
  const cert = new crypto.X509Certificate(fs.readFileSync(certificatePaths(root).pem));
  const existing = String(cert.subjectAltName || '').split(/,\s*/).flatMap(value =>
    value.startsWith('DNS:') ? [value.slice(4)] : value.startsWith('IP Address:') ? [value.slice(11)] : []);
  const detected = Object.values(os.networkInterfaces()).flat().filter(item => item && !item.internal && !item.address.includes('%')).map(item => item.address);
  return { hostname: os.hostname(), names: [...new Set([os.hostname(), ...existing, ...detected])], fingerprint: cert.fingerprint256 };
}

let busy = false;
async function regenerate(root, request, service) {
  if (busy) throw new Error('Certificate regeneration is already in progress.');
  busy = true;
  let temporary;
  try {
    const names = validateNames(request.names);
    const files = certificatePaths(root);
    const oldPem = fs.readFileSync(files.pem);
    const oldDer = fs.readFileSync(files.der);
    const oldCert = new crypto.X509Certificate(oldPem);
    if (request.fingerprint !== oldCert.fingerprint256) throw new Error('The certificate changed. Reopen the dialog and try again.');
    const uri = String(oldCert.subjectAltName || '').match(/(?:^|,\s*)URI:([^,]+)/)?.[1];
    if (!uri || !/^[a-zA-Z0-9:._~%/+-]+$/.test(uri)) throw new Error('The existing application URI cannot be safely preserved.');
    const privateKey = crypto.createPrivateKey(fs.readFileSync(files.key));
    if (!oldCert.checkPrivateKey(privateKey)) throw new Error('Existing certificate and private key do not match.');
    temporary = fs.mkdtempSync(path.join(root, '.regenerate-'));
    fs.chmodSync(temporary, 0o700);
    const output = path.join(temporary, 'certificate.pem');
    await execFile('openssl', ['req', '-x509', '-new', '-key', files.key, '-sha256', '-days', '3650',
      '-subj', '/CN=OPCBridge/O=OPCBridge',
      '-addext', 'subjectAltName=URI:' + uri + ',' + names.map(name => (net.isIP(name) ? 'IP:' : 'DNS:') + name).join(','),
      '-addext', 'basicConstraints=critical,CA:FALSE',
      '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment,dataEncipherment',
      '-addext', 'extendedKeyUsage=serverAuth,clientAuth', '-out', output], { timeout: 30000 });
    const pem = fs.readFileSync(output);
    const cert = new crypto.X509Certificate(pem);
    if (!cert.checkPrivateKey(privateKey) || !cert.verify(cert.publicKey) ||
        names.some(name => !(net.isIP(name) ? cert.checkIP(name) : cert.checkHost(name)))) throw new Error('Replacement certificate validation failed.');
    const backup = fs.mkdtempSync(path.join(root, 'certificate-backup-'));
    fs.chmodSync(backup, 0o700);
    fs.writeFileSync(path.join(backup, 'opcbridge-application.pem'), oldPem, { mode: 0o600 });
    fs.writeFileSync(path.join(backup, 'opcbridge-application.der'), oldDer, { mode: 0o600 });
    const write = (destination, contents) => {
      const staged = path.join(temporary, path.basename(destination));
      fs.writeFileSync(staged, contents, { mode: 0o640 });
      fs.chmodSync(staged, 0o640);
      fs.renameSync(staged, destination);
    };
    await service('stop');
    try {
      write(files.pem, pem);
      write(files.der, cert.raw);
      await service('start');
    } catch (error) {
      try {
        await service('stop');
        write(files.pem, oldPem);
        write(files.der, oldDer);
        await service('start');
      } catch (rollback) {
        throw new Error('Activation and recovery failed. Backup: ' + backup + '. ' + rollback.message);
      }
      throw new Error('Activation failed; previous certificate restored. ' + error.message);
    }
    return { fingerprint: cert.fingerprint256, backup };
  } finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
    busy = false;
  }
}

module.exports = { defaults, regenerate, validateNames };
