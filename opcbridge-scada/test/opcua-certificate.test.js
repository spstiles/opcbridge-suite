const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { defaults, regenerate, validateNames } = require('../opcua-certificate');

test('SAN validation rejects configuration injection and accepts DNS/IPv4/IPv6', () => {
  assert.deepEqual(validateNames(['plant.local', '192.168.1.10', '::1']), ['plant.local', '192.168.1.10', '::1']);
  for (const value of ['x,DNS:evil', 'x\nCA:TRUE', '*.local', '', '-bad', 'http://server']) {
    assert.throws(() => validateNames([value]));
  }
});

test('replacement preserves key, URI, trust and backs up certificate; failed activation rolls back', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcua-cert-test-'));
  try {
    const own = path.join(root, 'pki/ApplCerts/own');
    fs.mkdirSync(path.join(own, 'certs'), { recursive: true });
    fs.mkdirSync(path.join(own, 'private'), { recursive: true });
    const key = path.join(own, 'private/opcbridge-application-key.pem');
    const pem = path.join(own, 'certs/opcbridge-application.pem');
    const der = path.join(own, 'certs/opcbridge-application.der');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=test', '-addext', 'subjectAltName=URI:urn:test:OPCBridge,DNS:old.local',
      '-keyout', key, '-out', pem], { stdio: 'ignore' });
    const old = fs.readFileSync(pem);
    fs.writeFileSync(der, new crypto.X509Certificate(old).raw);
    const oldKey = fs.readFileSync(key);
    fs.writeFileSync(path.join(root, 'identity.json'), '{"application_uri":"urn:test:OPCBridge"}');
    const trusted = path.join(root, 'pki/ApplCerts/trusted/certs');
    fs.mkdirSync(trusted, { recursive: true });
    fs.writeFileSync(path.join(trusted, 'client.der'), 'unchanged');
    const request = { names: ['new.local', '192.168.101.27', '::1'], fingerprint: defaults(root).fingerprint };
    const actions = [];
    const result = await regenerate(root, request, async action => actions.push(action));
    assert.deepEqual(actions, ['stop', 'start']);
    assert.deepEqual(fs.readFileSync(key), oldKey);
    assert.deepEqual(fs.readFileSync(path.join(result.backup, 'opcbridge-application.pem')), old);
    const current = fs.readFileSync(pem);
    const certificate = new crypto.X509Certificate(current);
    assert.equal(certificate.checkIP('192.168.101.27'), '192.168.101.27');
    assert.equal(certificate.checkHost('new.local'), 'new.local');
    assert.match(certificate.subjectAltName, /URI:urn:test:OPCBridge/);
    assert.deepEqual(fs.readFileSync(der), certificate.raw);
    assert.equal(fs.readFileSync(path.join(trusted, 'client.der'), 'utf8'), 'unchanged');
    assert.equal(fs.readFileSync(path.join(root, 'identity.json'), 'utf8'), '{"application_uri":"urn:test:OPCBridge"}');
    assert.equal(fs.statSync(pem).mode & 0o777, 0o640);
    await assert.rejects(regenerate(root, request, async () => assert.fail('must not stop')), /certificate changed/);
    let starts = 0;
    await assert.rejects(regenerate(root, { ...request, fingerprint: certificate.fingerprint256 }, async action => {
      if (action === 'start' && ++starts === 1) throw new Error('simulated start failure');
    }), /previous certificate restored/);
    assert.deepEqual(fs.readFileSync(pem), current);
    assert.deepEqual(fs.readFileSync(der), certificate.raw);
    assert.equal(starts, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
