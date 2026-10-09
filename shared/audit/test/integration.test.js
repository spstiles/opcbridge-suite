'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const repo = path.resolve(__dirname, '../../..');
const token = 'integration-node-token-'.repeat(3);
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data));

async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return server.address().port; }
async function availablePort() { const server = http.createServer(); const port = await listen(server); await new Promise(resolve => server.close(resolve)); return port; }
function runChild(args, env, children) {
  const child = spawn(process.execPath, args, { cwd: repo, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  const ready = new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 10000);
    child.stdout.on('data', chunk => { output += chunk; if (/Listening on|TEST_HMI_READY/.test(output)) { clearTimeout(timer); resolve(output); } });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
  });
  return ready;
}
async function until(callback) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) { if (await callback()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
  throw new Error('Timed out waiting for audit delivery');
}

test('SCADA collector receives actual HMI and data-entry events; viewer/status enforce permissions', { timeout: 25000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-shared-audit-integration-')); const children = []; const servers = [];
  t.after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill('SIGTERM'); await exit; }
    for (const server of servers) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const upstream = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/auth/status') return res.end(JSON.stringify({ user: { username: 'operator', permissions: req.headers.cookie === 'session=operator' ? ['suite.view_logs', 'data_entry.access'] : [] } }));
    if (req.url === '/databases/test-db/data-entry') return res.end(JSON.stringify({ ok: true, inserted: 1 }));
    res.end(JSON.stringify({ ok: true }));
  }); servers.push(upstream); const upstreamPort = await listen(upstream); const scadaPort = await availablePort();
  const url = `http://127.0.0.1:${scadaPort}`;
  const centralConfig = path.join(root, 'audit-central.json'); const remoteConfig = path.join(root, 'audit-remote.json'); const scadaConfig = path.join(root, 'scada.json');
  const localNode = { site_id: 'plant', node_id: 'central' }; const remoteNode = { site_id: 'plant', node_id: 'panel' };
  const localToken = 'local-node-credential-'.repeat(3);
  const collector = { enabled: true, data_dir: path.join(root, 'central'), allow_http: true, nodes: [{ ...remoteNode, token }, { ...localNode, token: localToken }] };
  const forwarding = { enabled: true, url: `${url}/api/audit/ingest`, queue_dir: path.join(root, 'outbox-central'), token: localToken, interval_ms: 1000, allow_http: true };
  write(centralConfig, { node: localNode, forwarding, collector });
  write(remoteConfig, { node: remoteNode, forwarding: { ...forwarding, token, queue_dir: path.join(root, 'outbox-remote') } });
  write(scadaConfig, { listen: { host: '127.0.0.1', port: scadaPort }, opcbridge: { scheme: 'http', host: '127.0.0.1', port: upstreamPort } });
  const forms = path.join(root, 'forms.json');
  write(forms, { targets: [{ id: 'target', database_id: 'test-db', table: 'readings', record_time: '00:00:00', columns: [{ column: 'time', source: 'record_datetime' }, { column: 'item', source: 'item_name' }, { column: 'value', source: 'numeric_value' }] }], forms: [{ id: 'test-form', target_id: 'target', require_login: true, fields: [{ id: 'field', item: 'Flow', value_type: 'numeric', min: null, max: null }] }] });
  await runChild(['opcbridge-scada/server.js'], {
    OPCBRIDGE_SCADA_CONFIG: scadaConfig, OPCBRIDGE_SCADA_SECRETS: path.join(root, 'secrets.json'), OPCBRIDGE_IDENTITY_SYNC_CONFIG: path.join(root, 'identity.json'),
    OPCBRIDGE_AUDIT_CONFIG: centralConfig, OPCBRIDGE_LOGGER_API_HOST: '127.0.0.1', OPCBRIDGE_LOGGER_API_PORT: String(upstreamPort),
    OPCBRIDGE_DATA_ENTRY_DEFINITIONS: forms, OPCBRIDGE_DATA_ENTRY_AUDIT: path.join(root, 'data-entry.jsonl')
  }, children);
  const query = `${url}/api/logs/query?source=central_audit`;
  assert.equal((await fetch(query)).status, 403);
  assert.equal((await fetch(`${url}/api/audit/status`)).status, 403);
  assert.equal((await fetch(`${url}/api/audit/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' }, body: '{}' })).status, 401);
  const hmiOutput = await runChild(['-e', 'const {createApp}=require("./opcbridge-hmi/server/app"); const server=createApp().listen(0,"127.0.0.1",()=>console.log("TEST_HMI_READY "+server.address().port));'], {
    OPCBRIDGE_AUDIT_CONFIG: remoteConfig, OPCBRIDGE_HMI_FILES_ROOT: path.join(root, 'screens'), OPCBRIDGE_HMI_AUDIT_PATH: path.join(root, 'hmi.jsonl')
  }, children);
  const hmiPort = Number(/TEST_HMI_READY (\d+)/.exec(hmiOutput)[1]);
  const response = await fetch(`http://127.0.0.1:${hmiPort}/api/screens/file?path=test.screen`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-opcbridge-hmi-user': 'claimed-user' }, body: JSON.stringify({ raw: '{"name":"Test"}' }) });
  assert.equal(response.status, 200);
  const saved = await fetch(`${url}/api/data-entry/save`, { method: 'POST', headers: { Cookie: 'session=operator', 'Content-Type': 'application/json' }, body: JSON.stringify({ form_id: 'test-form', record_date: '2026-10-05', changes: [{ field_id: 'field', value: 10 }] }) });
  assert.equal(saved.status, 200); assert.equal((await saved.json()).ok, true);
  let data;
  await until(async () => { data = await (await fetch(query, { headers: { Cookie: 'session=operator' } })).json(); return data.ok && data.records.length === 2; });
  const hmi = data.records.find(record => record.type === 'screen.save'); const entry = data.records.find(record => record.type === 'data_entry.save');
  assert.equal(hmi.raw.node_id, 'panel'); assert.equal(hmi.raw.actor.attribution, 'client_reported');
  assert.equal(entry.actor, 'operator'); assert.equal(entry.raw.actor.attribution, 'authenticated');
  assert.ok(entry.raw.received_ms >= entry.raw.timestamp_ms); assert.ok(hmi.station);
  const filtered = await (await fetch(`${query}&node_id=panel&user=claimed-user&action=screen.save`, { headers: { Cookie: 'session=operator' } })).json();
  assert.equal(filtered.records.length, 1);
  const status = await (await fetch(`${url}/api/audit/status`, { headers: { Cookie: 'session=operator' } })).json();
  assert.equal(status.collector.nodes.length, 2); assert.ok(!JSON.stringify(status).includes(token));
  assert.equal(fs.readFileSync(path.join(root, 'hmi.jsonl'), 'utf8').trim().split('\n').length, 1);
  assert.equal(fs.readFileSync(path.join(root, 'data-entry.jsonl'), 'utf8').trim().split('\n').length, 1);
});
