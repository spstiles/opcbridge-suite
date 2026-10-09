'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { AuditClient, postBatch } = require('../client');
const { AuditCollector } = require('../collector');
const { createEvent } = require('../events');
const { createRuntime } = require('../runtime');
const { handleIngest } = require('../http');
const { files, readJson } = require('../storage');
const token = 'test-node-credential-'.repeat(3);
const identity = { site_id: 'plant', node_id: 'panel-1' };
const input = { action: 'hmi.tag_write', target: 'Pump.Run', result: 'success', station_id: 'screen-1', actor: { name: 'operator', attribution: 'client_reported' }, details: { connection_id: 'plc', tag: 'Pump.Run', new_value: 1 } };
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-shared-audit-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const config = { node: identity, forwarding: { enabled: true, queue_dir: path.join(root, 'queue'), url: 'http://127.0.0.1/api/audit/ingest', token, allow_http: true }, collector: { enabled: true, data_dir: path.join(root, 'central'), allow_http: true, nodes: [{ ...identity, token }] } };
  return { root, config, collector: new AuditCollector(config.collector) };
}
const direct = collector => async (url, credential, body) => collector.ingest(collector.authenticate(credential), body);

test('outage preserves queue across restart; lost acknowledgment replay is deduplicated', async t => {
  const f = fixture(t);
  const client = new AuditClient(f.config, 'hmi', async () => { throw new Error('network unavailable'); });
  const event = client.record(input); await client.flush();
  assert.equal(client.status().pending_count, 1); assert.match(client.status().last_error, /network/);
  const restarted = new AuditClient(f.config, 'hmi', async (url, credential, body) => { f.collector.ingest(f.collector.authenticate(credential), body); throw new Error('acknowledgment lost'); });
  await restarted.flush();
  assert.equal(restarted.status().pending_count, 1); assert.equal(f.collector.query().matched, 1);
  const collector = new AuditCollector(f.config.collector); restarted.transport = direct(collector); await restarted.flush();
  assert.equal(restarted.status().pending_count, 0); assert.equal(collector.query().matched, 1);
  assert.equal(collector.query().events[0].event.event_id, event.event_id); assert.equal(restarted.status().last_error, '');
});

test('node spoofing, unsafe IDs, conflicting IDs and invalid whole batches are rejected', t => {
  const { collector } = fixture(t); const node = collector.authenticate(token); const event = createEvent(identity, 'hmi', input);
  assert.equal(collector.authenticate('wrong credential'), null);
  assert.throws(() => collector.ingest(node, { component: 'hmi', events: [{ ...event, node_id: 'other' }] }), /identity/);
  assert.throws(() => collector.ingest(node, { component: 'hmi', events: [{ ...event, event_id: '../../escape' }] }), /envelope/);
  assert.throws(() => collector.ingest(node, { component: 'hmi', events: [event, { ...event, event_id: 'bad' }] }), /envelope/);
  assert.equal(collector.query().matched, 0);
  collector.ingest(node, { component: 'hmi', events: [event] });
  assert.throws(() => collector.ingest(node, { component: 'hmi', events: [{ ...event, target: 'Different' }] }), /conflicts/);
  assert.throws(() => collector.ingest(node, { component: 'scada', events: [event] }), /component/);
  assert.throws(() => collector.ingest(node, { component: 'hmi', events: [event, event] }), /Duplicate/);
  assert.equal(collector.query().matched, 1);
});

test('redaction and queries preserve origin, attribution and action context', t => {
  const { config, collector } = fixture(t); const client = new AuditClient(config, 'hmi');
  const event = client.record({ ...input, timestamp_ms: 1000, details: { ...input.details, nested: { password: 'secret-value', cookie: 'session-value', ok: 'visible' }, tokens: ['secret-token'] } });
  collector.ingest(collector.authenticate(token), { component: 'hmi', events: [event] });
  const json = JSON.stringify(collector.query());
  assert.ok(!json.includes('secret-value') && !json.includes('session-value') && !json.includes('secret-token')); assert.ok(json.includes('visible'));
  assert.equal(collector.query({ site_id: 'plant', node_id: 'panel-1', station_id: 'screen-1', component: 'hmi', user: 'operator', action: 'hmi.tag_write', result: 'success', since_ms: 500, until_ms: 1500, connection_id: 'plc', tag: 'Pump.Run', q: 'pump' }).matched, 1);
  for (const filter of [{ site_id: 'other' }, { user: 'other' }, { until_ms: 999 }, { since_ms: 1001 }, { result: 'failure' }]) assert.equal(collector.query(filter).matched, 0);
});

test('queue cap retains existing records; invalid acknowledgments delete nothing', async t => {
  const { config } = fixture(t); config.forwarding.max_pending_bytes = 65536;
  const client = new AuditClient(config, 'hmi', async () => ({ ok: true, accepted: ['not-sent'] }));
  const first = client.record({ ...input, details: { text: 'x'.repeat(40000) } }); assert.ok(first);
  assert.equal(client.record({ ...input, details: { text: 'x'.repeat(40000) } }), null);
  assert.equal(client.status().capture_failures, 1); assert.match(client.status().last_capture_error, /full/);
  await client.flush(); assert.equal(client.status().pending_count, 1); assert.match(client.status().last_error, /acknowledgment/);
  assert.equal(readJson(files(client.pendingDirectory)[0]).event_id, first.event_id);
  assert.equal(new AuditClient(config, 'hmi').status().capture_failures, 1);
});

test('collector disk failure cannot acknowledge or delete sender records', async t => {
  const f = fixture(t); const client = new AuditClient(f.config, 'scada', direct(f.collector)); client.record(input);
  const original = fs.openSync;
  try {
    fs.openSync = function (filename, ...args) {
      if (typeof filename === 'string' && filename.startsWith(f.config.collector.data_dir) && filename.endsWith('.tmp')) { const error = new Error('disk full'); error.code = 'ENOSPC'; throw error; }
      return original.call(this, filename, ...args);
    };
    await client.flush(); assert.equal(client.status().pending_count, 1); assert.match(client.status().last_error, /disk full/);
  } finally { fs.openSync = original; }
  await client.flush(); assert.equal(client.status().pending_count, 0); assert.equal(f.collector.query().matched, 1);
});

test('empty batches persist per-component heartbeat without exposing credentials', async t => {
  const f = fixture(t); const client = new AuditClient(f.config, 'hmi', direct(f.collector)); await client.flush();
  const status = new AuditCollector(f.config.collector).status();
  assert.equal(status.nodes[0].components[0].reported_pending_count, 0); assert.ok(status.nodes[0].components[0].last_received_ms);
  assert.equal(f.collector.query().matched, 0); assert.ok(!JSON.stringify(status).includes(token));
});

test('HTTPS defaults and explicit trusted proxy boundaries are enforced', t => {
  const f = fixture(t); const secure = new AuditCollector({ ...f.config.collector, allow_http: false, trusted_proxy_addresses: ['127.0.0.1'] });
  assert.equal(secure.acceptsTransport({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }), false);
  assert.equal(secure.acceptsTransport({ headers: { 'x-forwarded-proto': 'https' }, socket: { remoteAddress: '10.0.0.1' } }), false);
  assert.equal(secure.acceptsTransport({ headers: { 'x-forwarded-proto': 'https' }, socket: { remoteAddress: '::ffff:127.0.0.1' } }), true);
  assert.throws(() => new AuditClient({ ...f.config, forwarding: { ...f.config.forwarding, allow_http: false } }, 'hmi'), /HTTPS/);
  assert.throws(() => new AuditClient({ ...f.config, forwarding: { ...f.config.forwarding, url: 'https://user:password@internal/api/audit/ingest' } }, 'hmi'), /credentials/);
});

test('identity changes with pending records are blocked; corrupt queued files are retained', async t => {
  const f = fixture(t); const client = new AuditClient(f.config, 'hmi'); client.record(input);
  assert.throws(() => new AuditClient({ ...f.config, node: { ...identity, node_id: 'other' } }, 'hmi'), /identity/);
  const file = files(client.pendingDirectory)[0]; fs.writeFileSync(file, '{incomplete'); await client.flush();
  assert.ok(fs.existsSync(file)); assert.equal(client.status().pending_count, null);
});

test('disabled runtime has no queue side effects; malformed configuration fails closed', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-shared-audit-disabled-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const runtime = createRuntime('hmi', path.join(root, 'missing')); assert.equal(runtime.record(input), null);
  assert.equal(runtime.status().forwarding.enabled, false); assert.deepEqual(fs.readdirSync(root), []);
  fs.writeFileSync(path.join(root, 'bad'), '{'); const previous = console.error; console.error = () => {};
  try { const bad = createRuntime('scada', path.join(root, 'bad')); assert.match(bad.status().config_error, /loaded/); assert.equal(bad.collector.enabled, false); }
  finally { console.error = previous; }
});

test('real HTTP ingestion authenticates node batches independently of browser sessions', async t => {
  const f = fixture(t);
  const readBody = req => new Promise((resolve, reject) => { const chunks = []; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });
  const sendJson = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const server = http.createServer((req, res) => handleIngest(req, res, { collector: f.collector }, readBody, sendJson));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = new URL(`http://127.0.0.1:${server.address().port}/api/audit/ingest`);
  await assert.rejects(postBatch(url, 'bad', { component: 'hmi', events: [] }), /401/);
  const client = new AuditClient({ ...f.config, forwarding: { ...f.config.forwarding, url: url.href } }, 'hmi'); client.record(input); await client.flush();
  assert.equal(client.status().pending_count, 0); assert.equal(f.collector.query().matched, 1);
  assert.equal((await fetch(url, { method: 'GET' })).status, 405);
});
