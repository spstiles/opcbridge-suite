const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

test('report drafts stay private until publish and can be previewed or discarded', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scada-report-test-'));
  const definitions = path.join(dir, 'reports.json');
  const config = path.join(dir, 'scada.json');
  const generator = path.join(dir, 'preview');
  const listen = server => new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  const auth = http.createServer((req, res) => {
    const editor = req.headers.cookie === 'role=editor';
    res.end(JSON.stringify({ user: {
      username: editor ? 'editor' : 'viewer',
      groups: editor ? ['editors'] : ['viewers'],
      permissions: ['reports.access', ...(editor ? ['reports.create'] : [])]
    } }));
  });
  const corePort = await listen(auth);
  const reservation = http.createServer();
  const port = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  fs.writeFileSync(config, JSON.stringify({
    listen: { port, host: '127.0.0.1' }, opcbridge: { host: '127.0.0.1', port: corePort }
  }));
  fs.writeFileSync(generator, `#!${process.execPath}
const fs = require('node:fs');
const file = process.argv[process.argv.indexOf('--definitions') + 1];
console.log(JSON.stringify({ name: JSON.parse(fs.readFileSync(file)).reports[0].name }));
`, { mode: 0o700 });
  const server = spawn(process.execPath, [path.join(__dirname, '../server.js')], {
    env: { ...process.env, OPCBRIDGE_SCADA_CONFIG: config, OPCBRIDGE_REPORT_DEFINITIONS: definitions, OPCBRIDGE_REPORT_BIN: generator },
    stdio: 'ignore'
  });
  t.after(async () => {
    if (server.exitCode === null) {
      server.kill();
      await new Promise(resolve => server.once('exit', resolve));
    }
    auth.closeAllConnections();
    await new Promise(resolve => auth.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const api = async (route, data, role = 'editor') => {
    const response = await fetch(`http://127.0.0.1:${port}/api/reports${route}`, {
      method: data ? 'POST' : 'GET',
      headers: { cookie: `role=${role}`, 'Content-Type': 'application/json' },
      body: data && JSON.stringify(data)
    });
    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    return payload;
  };
  for (let i = 0; ; i++) {
    try { await api('/admin'); break; }
    catch (error) { if (i >= 50) throw error; await delay(40); }
  }
  const report = {
    name: 'Live report', hmi_enabled: true,
    access: [{ group_id: 'viewers', view: true }],
    columns: [{ source: 'historian', connection_id: 'PLC', tag_name: 'Value' }]
  };
  const draft = (await api('/admin', { report: { name: 'Work in progress' } })).report;
  assert.equal(draft.has_draft, true);
  assert.equal((await api('', null, 'viewer')).reports.length, 0);
  assert.equal((await api('/hmi')).reports.length, 0);

  const update = (action, fields) => api('/admin', { original_id: draft.id, action, report: fields });
  assert.equal((await update('publish', report)).report.published, true);
  const edited = { ...report, name: 'Draft change', hmi_enabled: false };
  assert.equal((await update('save_draft', edited)).report.has_draft, true);
  assert.equal((await api('/admin')).reports[0].name, 'Draft change');
  assert.equal((await api('', null, 'viewer')).reports[0].name, 'Live report');
  assert.equal((await api('/hmi')).reports[0].name, 'Live report');
  const preview = await api('/admin/preview', {
    id: draft.id, period_value: '2026-11', report: { ...edited, name: 'Unsaved change' }
  });
  assert.equal(preview.name, 'Unsaved change');
  assert.equal((await api('/admin')).reports[0].name, 'Draft change');
  assert.equal((await update('discard_draft')).report.name, 'Live report');

  await update('save_draft', edited);
  assert.equal((await update('publish', edited)).report.has_draft, false);
  assert.equal((await api('', null, 'viewer')).reports[0].name, 'Draft change');
  assert.equal((await api('/hmi')).reports.length, 0);
  assert.equal((await update('unpublish')).report.published, false);
  assert.equal((await api('', null, 'viewer')).reports.length, 0);
});
