'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const token = 'enrolled-installation-token-'.repeat(2);
async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return server.address().port; }

test('Configure Server saves coupled roles, enforces permissions, reloads enrollment, and restores standalone', { timeout: 25000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-central-server-api-'));
  let child; let identityMode = 'local';
  const upstream = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    const endpoint = req.url.replace(/^\/api\/opcbridge/, '');
    if (endpoint === '/auth/status') {
      const admin = req.headers.cookie === 'session=admin'; const serverOnly = req.headers.cookie === 'session=server';
      return res.end(JSON.stringify({ ok: true, user_logged_in: admin || serverOnly, user: { username: 'admin', permissions: admin ? ['suite.manage_server', 'auth.manage_users', 'suite.view_logs'] : serverOnly ? ['suite.manage_server'] : [] } }));
    }
    if (endpoint === '/auth/identity') {
      if (body.central_name === 'Reject') { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: 'Identity switch rejected' })); }
      identityMode = body.mode;
    }
    if (endpoint === '/auth/login') res.setHeader('Set-Cookie', 'central=session; HttpOnly');
    if (endpoint === '/auth/directory/export') return res.end(JSON.stringify({ ok: true, file: { fixture: true } }));
    if (req.url === '/api/audit/ingest') return res.end(JSON.stringify({ ok: true, accepted: body.events.map(event => event.event_id) }));
    res.end(JSON.stringify({ ok: true }));
  });
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill(); await exit; }
    await new Promise(resolve => { upstream.close(resolve); upstream.closeAllConnections(); }); fs.rmSync(root, { recursive: true, force: true });
  });
  const upstreamPort = await listen(upstream); const reservation = http.createServer(); const port = await listen(reservation); await new Promise(resolve => reservation.close(resolve));
  const auditPath = path.join(root, 'audit.json'); const syncPath = path.join(root, 'identity.json'); const configPath = path.join(root, 'scada.json');
  fs.writeFileSync(auditPath, JSON.stringify({ forwarding: { queue_dir: path.join(root, 'outbox') }, collector: { data_dir: path.join(root, 'events') } }));
  fs.writeFileSync(configPath, JSON.stringify({ listen: { host: '127.0.0.1', port }, opcbridge: { host: '127.0.0.1', port: upstreamPort, scheme: 'http' } }));
  child = spawn(process.execPath, [path.join(__dirname, '../server.js')], { env: { ...process.env, OPCBRIDGE_SCADA_CONFIG: configPath, OPCBRIDGE_SCADA_SECRETS: path.join(root, 'secrets.json'), OPCBRIDGE_AUDIT_CONFIG: auditPath, OPCBRIDGE_IDENTITY_SYNC_CONFIG: syncPath }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error(output)), 8000);
    child.stdout.on('data', chunk => { output += chunk; if (output.includes('Listening on')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', chunk => { output += chunk; }); child.once('exit', code => { clearTimeout(timer); reject(new Error(`Exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const request = async (method = 'GET', body, cookie = 'session=admin', endpoint = '/api/central-server') => {
    const response = await fetch(base + endpoint, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await request('GET', null, '')).status, 403);
  assert.equal((await request()).data.settings.role, 'standalone');
  assert.equal((await request('PUT', { role: 'central' }, 'session=server')).status, 403);
  const connected = { role: 'connected', site_id: 'plant', node_id: 'panel', name: 'Plant', address: `http://127.0.0.1:${upstreamPort}`, username: 'sync', password: 'directory-secret', token, allow_http: true };
  const before = fs.readFileSync(auditPath, 'utf8');
  assert.equal((await request('PUT', { ...connected, name: 'Reject' })).status, 400);
  assert.equal(fs.readFileSync(auditPath, 'utf8'), before);
  const saved = await request('PUT', connected); assert.equal(saved.status, 200); assert.equal(saved.data.sync.ok, true); assert.equal(identityMode, 'central');
  const config = JSON.parse(fs.readFileSync(auditPath)); assert.equal(config.forwarding.enabled, true); assert.equal(config.central.identity_sync.mode, 'central'); assert.equal(fs.existsSync(syncPath), false);
  assert.equal(fs.statSync(auditPath).mode & 0o777, 0o600);
  const fetched = await request(); assert.equal(fetched.data.health.audit.forwarding.enabled, true); assert.ok(fetched.data.health.identity.last_sync_ms);
  assert.ok(!JSON.stringify(fetched.data).includes(token) && !JSON.stringify(fetched.data).includes('directory-secret'));
  assert.equal((await request('PUT', { mode: 'local' }, 'session=admin', '/api/users/identity-settings')).status, 409);
  const central = { role: 'central', site_id: 'plant', node_id: 'central', allow_http: true, nodes: [{ site_id: 'plant', node_id: 'remote', token }] };
  assert.equal((await request('PUT', central)).status, 200); assert.equal(identityMode, 'local');
  const ingest = async credential => fetch(`${base}/api/audit/ingest`, { method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ component: 'hmi', events: [] }) });
  assert.equal((await ingest(token)).status, 200);
  const health = (await request()).data.health.audit.collector.nodes.find(node => node.node_id === 'remote'); assert.equal(health.components[0].component, 'hmi');
  const replaced = 'replacement-credential-'.repeat(3);
  assert.equal((await request('PUT', { ...central, nodes: [{ site_id: 'plant', node_id: 'remote', token: replaced }] })).status, 200);
  // Reload waits for an in-flight local batch to finish before swapping clients.
  const deadline = Date.now() + 3000;
  while ((await ingest(token)).status !== 401 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal((await ingest(token)).status, 401); assert.equal((await ingest(replaced)).status, 200);
  assert.equal((await request('PUT', { role: 'standalone' })).status, 200);
  const standalone = (await request()).data; assert.equal(standalone.settings.role, 'standalone'); assert.equal(standalone.health.audit.forwarding.enabled, false); assert.equal(standalone.health.audit.collector.enabled, false); assert.equal(identityMode, 'local');
});
