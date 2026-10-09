'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSettings, publicSettings } = require('../settings');
const { createRuntime } = require('../runtime');
const { AuditClient } = require('../client');
const { writeJson } = require('../storage');
const token = 'remote-installation-credential-'.repeat(2);
function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-central-settings-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, config: { forwarding: { queue_dir: path.join(root, 'outbox') }, collector: { data_dir: path.join(root, 'central') } } };
}
test('one role couples cached identity and forwarding; public settings never return credentials', t => {
  const { config, root } = setup(t);
  const connected = buildSettings({ role: 'connected', site_id: 'plant', node_id: 'panel', name: 'Plant', address: 'http://central:3010', username: 'sync', password: 'private-password', token, allow_http: true }, config);
  assert.equal(connected.central.identity_sync.mode, 'central'); assert.equal(connected.forwarding.enabled, true); assert.equal(connected.collector.enabled, false);
  assert.equal(connected.central.identity_sync.central_url, 'http://central:3010');
  assert.equal(connected.forwarding.url, 'http://central:3010/api/audit/ingest');
  assert.deepEqual(fs.readdirSync(root), []); // Validation must not create queues.
  const visible = JSON.stringify(publicSettings(connected)); assert.ok(!visible.includes(token) && !visible.includes('private-password'));
  const preserved = buildSettings({ ...publicSettings(connected), password: '', token: '' }, connected);
  assert.equal(preserved.forwarding.token, token); assert.equal(preserved.central.identity_sync.password, 'private-password');
  assert.throws(() => buildSettings({ ...publicSettings(connected), address: 'http://other:3010', password: '', token: '' }, connected), /password/);
  const standalone = buildSettings({ role: 'standalone' }, connected);
  assert.equal(standalone.central.identity_sync.mode, 'local'); assert.equal(standalone.forwarding.enabled, false); assert.equal(standalone.collector.enabled, false);
});
test('central server enrolls itself, rejects duplicate credentials, and restricts plain local transport', t => {
  const { config } = setup(t);
  const central = buildSettings({ role: 'central', site_id: 'plant', node_id: 'central', nodes: [{ site_id: 'plant', node_id: 'panel', token }] }, config, {}, 3999);
  assert.equal(central.central.identity_sync.mode, 'local'); assert.equal(central.forwarding.enabled, true); assert.equal(central.collector.enabled, true);
  assert.equal(central.forwarding.url, 'http://127.0.0.1:3999/api/audit/ingest');
  assert.equal(central.collector.nodes.length, 2); assert.equal(publicSettings(central).nodes.length, 1);
  const { AuditCollector } = require('../collector'); const collector = new AuditCollector(central.collector);
  assert.equal(collector.acceptsTransport({ socket: { remoteAddress: '127.0.0.1' }, headers: {} }), true);
  assert.equal(collector.acceptsTransport({ socket: { remoteAddress: '10.0.0.2' }, headers: {} }), false);
  assert.throws(() => buildSettings({ ...publicSettings(central), nodes: [{ site_id: 'plant', node_id: 'a', token }, { site_id: 'plant', node_id: 'b', token }] }, central), /Duplicate/);
});
test('live configuration reload preserves queued events and checks both component identities', t => {
  const { config, root } = setup(t); const file = path.join(root, 'audit.json');
  const connected = buildSettings({ role: 'connected', site_id: 'plant', node_id: 'panel', name: 'Plant', address: 'http://127.0.0.1:1', username: 'sync', password: 'password', token, allow_http: true }, config);
  const runtime = createRuntime('hmi', file); t.after(() => runtime.stop());
  assert.equal(runtime.status().forwarding.enabled, false);
  writeJson(file, connected); runtime.reload();
  assert.equal(runtime.status().forwarding.enabled, true);
  const event = runtime.record({ action: 'test.write', result: 'success' }); assert.ok(event);
  assert.throws(() => buildSettings({ ...publicSettings(connected), node_id: 'other' }, connected), /identity/);
  assert.ok(!fs.existsSync(path.join(root, 'outbox/scada/identity.json')));
  const standalone = buildSettings({ role: 'standalone' }, connected); writeJson(file, standalone); runtime.reload();
  assert.equal(runtime.status().forwarding.enabled, false);
  writeJson(file, connected); runtime.reload(); assert.equal(runtime.status().forwarding.pending_count, 1);
  assert.equal(new AuditClient(connected, 'hmi').status().pending_count, 1);
});
