'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('installer ships audit support, initializes disabled config, and preserves enrolled credentials', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-shared-audit-install-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.resolve(__dirname, '../../..');
  const script = `source ./install.sh
PREFIX="$AUDIT_TEST_ROOT/prefix"
CONFIG_ROOT="$AUDIT_TEST_ROOT/config"
DATA_ROOT="$AUDIT_TEST_ROOT/data"
ENV_FILE="$AUDIT_TEST_ROOT/missing-env"
SERVICE_USER="$(id -un)"
SERVICE_GROUP="$(id -gn)"
install_audit_support
fix_config_permissions
`;
  const run = () => {
    const result = spawnSync('bash', ['-c', script], { cwd: repo, env: { ...process.env, AUDIT_TEST_ROOT: root }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  run();
  const file = path.join(root, 'config/audit/config.json');
  const config = JSON.parse(fs.readFileSync(file));
  assert.equal(config.forwarding.enabled, false); assert.equal(config.collector.enabled, false);
  assert.equal(config.forwarding.queue_dir, path.join(root, 'data/audit/outbox'));
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const runtime = require(path.join(root, 'prefix/shared/audit/runtime.js')).createRuntime('scada', file);
  assert.equal(runtime.status().config_error, ''); assert.equal(runtime.collector.enabled, false);
  config.forwarding.token = 'preserve-this-enrolled-credential-'.repeat(2);
  fs.writeFileSync(file, JSON.stringify(config)); run();
  assert.equal(JSON.parse(fs.readFileSync(file)).forwarding.token, config.forwarding.token);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});
