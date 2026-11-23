const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { createLibrary, selection } = require('../backup-library');

test('automatic retention only prunes successful automatic archives', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-library-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const library = createLibrary(root);
  const options = selection({ preset: 'workspace' });
  for (const [day, kind] of [[1, 'manual'], [2, 'automatic'], [3, 'automatic'], [4, 'recovery']]) {
    const meta = library.save({ created_at: new Date(2026, 0, day).toISOString() }, options, kind);
    assert.equal(fs.statSync(library.get(meta.id).archive).mode & 0o777, 0o600);
  }
  library.prune(1);
  assert.deepEqual(library.list().map(item => item.kind), ['recovery', 'automatic', 'manual']);
  assert.equal(library.list()[1].created_at, new Date(2026, 0, 3).toISOString());
});

test('SCADA saves, downloads, previews, restores and deletes a scoped backup', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-api-'));
  const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  let allowed = false;
  const core = http.createServer((req, res) => res.end(JSON.stringify({
    user: { username: 'admin', permissions: [allowed ? 'suite.manage_server' : 'opcbridge.edit_config'] }
  })));
  const corePort = await listen(core);
  const reservation = http.createServer();
  const port = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  const config = path.join(root, 'config.json');
  const data = path.join(root, 'data');
  const alarms = path.join(data, 'alarms_config.db');
  fs.mkdirSync(data);
  fs.mkdirSync(path.join(root, 'tags'));
  const tagFile = path.join(root, 'tags', 'workspace.json');
  fs.writeFileSync(tagFile, 'workspace before');
  const setAlarm = value => execFileSync('python3', ['-c',
    'import sqlite3,sys; d=sqlite3.connect(sys.argv[1]); d.execute("CREATE TABLE IF NOT EXISTS alarms_config(id INTEGER PRIMARY KEY,updated_ms INTEGER,json TEXT)"); d.execute("INSERT OR REPLACE INTO alarms_config VALUES (1,1,?)",(sys.argv[2],)); d.commit()',
    alarms, JSON.stringify({ alarms: [value] })]);
  setAlarm('original');
  fs.writeFileSync(path.join(root, 'alarms.json'), JSON.stringify({ alarms: ['stale'] }));
  fs.writeFileSync(config, JSON.stringify({ listen: { port, host: '127.0.0.1' }, opcbridge: { host: '127.0.0.1', port: corePort } }));
  const child = spawn(process.execPath, [path.join(__dirname, '../server.js')], {
    env: {
      ...process.env, OPCBRIDGE_SCADA_CONFIG: config, OPCBRIDGE_SCADA_OPCBRIDGE_CONFIG_DIR: root,
      OPCBRIDGE_BACKUP_DIR: path.join(root, 'backups'), OPCBRIDGE_HMI_ROOT: path.join(root, 'hmi')
    },
    stdio: 'ignore'
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
    core.closeAllConnections();
    await new Promise(resolve => core.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const api = (route = '', opts) => fetch(`http://127.0.0.1:${port}/api/backups${route}`, opts);
  let ready;
  for (let i = 0; i < 100 && !ready; i++) {
    try { ready = await api(); } catch { await delay(30); }
  }
  assert.equal(ready?.status, 403);
  allowed = true;
  const started = await api('/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preset: 'alarms' }) });
  assert.equal(started.status, 202);
  const { job } = await started.json();
  let library;
  for (let i = 0; i < 100; i++) {
    library = await (await api()).json();
    if (library.job?.state !== 'running') break;
    await delay(30);
  }
  assert.equal(library.job.state, 'done', library.job.error);
  assert.equal(library.backups[0].preset, 'alarms');
  const query = '?id=' + job.id;
  const archive = await (await api('/download' + query)).json();
  assert.deepEqual(archive.files.map(file => file.section), ['alarm_config']);
  assert.deepEqual(JSON.parse(Buffer.from(archive.files[0].content_b64, 'base64')), { alarms: ['original'] });
  archive.files[0].path = '../outside.json';
  const rejected = await api('/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(archive) });
  assert.equal(rejected.status, 400);
  setAlarm('different');
  fs.writeFileSync(tagFile, 'workspace edited');
  const preview = await api('/preview' + query, { method: 'POST' });
  assert.equal(preview.status, 200);
  const restored = await api('/restore' + query, { method: 'POST' });
  const result = await restored.json();
  assert.equal(restored.status, 200, result.error);
  assert.equal(fs.readFileSync(tagFile, 'utf8'), 'workspace edited');
  const canonical = execFileSync('python3', ['-c',
    'import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute("SELECT json FROM alarms_config").fetchone()[0])', alarms]);
  assert.deepEqual(JSON.parse(canonical), { alarms: ['original'] });
  assert.equal((await api(query, { method: 'DELETE' })).status, 200);
  assert.deepEqual((await (await api()).json()).backups.map(item => item.kind), ['recovery']);
  const saved = await api('/schedule', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true, time: '00:00', keep: 1, preset: 'workspace' })
  });
  assert.equal(saved.status, 200);
  for (let i = 0; i < 170; i++) {
    library = await (await api()).json();
    if (library.automatic?.state === 'done' || library.automatic?.state === 'error') break;
    await delay(100);
  }
  assert.equal(library.automatic?.state, 'done', library.automatic?.error);
  const automatic = library.backups.find(item => item.kind === 'automatic');
  assert.equal(automatic.preset, 'workspace');
  const scheduledArchive = await (await api('/download?id=' + automatic.id)).json();
  assert.deepEqual(scheduledArchive.files.map(file => file.path), ['tags/workspace.json']);
});
