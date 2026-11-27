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
    if (!req.headers.cookie) return res.end('{}');
    const editor = req.headers.cookie === 'role=editor';
    const admin = req.headers.cookie === 'role=admin';
    res.end(JSON.stringify({ user: {
      username: editor ? 'editor' : admin ? 'admin' : 'viewer',
      groups: editor ? ['editors'] : ['viewers'],
      permissions: ['reports.access', ...(editor ? ['reports.create'] : []), ...(admin ? ['reports.administer'] : [])]
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
if (process.argv[2] === 'template-preview') {
  console.log(JSON.stringify({ worksheet: 'Template' }));
} else {
  const report = JSON.parse(fs.readFileSync(file)).reports[0];
  if (process.argv[2] === 'generate') fs.writeFileSync(process.argv[process.argv.indexOf('--output') + 1], report.name);
  console.log(JSON.stringify({ name: report.name, columns: [{ heading: 'Total', connection_id: 'PLC', tag_name: 'Internal.Tag' }] }));
}
`, { mode: 0o700 });
  const server = spawn(process.execPath, [path.join(__dirname, '../server.js')], {
    env: { ...process.env, OPCBRIDGE_SCADA_CONFIG: config, OPCBRIDGE_REPORT_DEFINITIONS: definitions,
      OPCBRIDGE_REPORT_BIN: generator, OPCBRIDGE_REPORT_TEMPLATE_DIR: path.join(dir, 'templates') },
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
    columns: [{ source: 'historian', connection_id: 'PLC', tag_name: 'Value' }],
    summaries: [{ label: 'Summary', calculations: ['text'], texts: ['005'] }]
  };
  const draft = (await api('/admin', { report: { name: 'Work in progress' } })).report;
  assert.equal(draft.has_draft, true);
  assert.equal((await api('', null, 'viewer')).reports.length, 0);
  assert.equal((await api('/hmi')).reports.length, 0);

  const update = (action, fields) => api('/admin', { original_id: draft.id, action, report: fields });
  const published = (await update('publish', report)).report;
  assert.equal(published.published, true);
  assert.deepEqual(published.summaries[0].calculations, ['text']);
  assert.deepEqual(published.summaries[0].texts, ['005']);
  const draftLayout = {
    worksheet: 'Draft Layout', table_start_row: 12, table_start_column: 'C',
    include_header_row: false, date_column_format: 'mm/dd',
    summary_placement: 'fixed', summary_start_row: 55, summary_gap_rows: 2,
    placed_cells: [{ target: 'A1', type: 'text', text: 'Draft heading' }]
  };
  const edited = { ...report, name: 'Draft change', hmi_enabled: false, layout: draftLayout };
  assert.equal((await update('save_draft', edited)).report.has_draft, true);
  const reopened = (await api('/admin')).reports[0];
  assert.equal(reopened.name, 'Draft change');
  assert.deepEqual(reopened.layout, draftLayout);
  assert.equal(JSON.parse(fs.readFileSync(definitions)).reports[0].layout.worksheet, 'Report');
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

  const databaseColumn = { source: 'database', table: 'runtime', time_column: 'time', field: 'total' };
  const mixed = {
    ...report,
    data_source: { type: 'database', database_id: 'replacement' },
    columns: [databaseColumn, { ...databaseColumn, database_id: 'legacy' }]
  };
  const draftSources = (await update('save_draft', mixed)).report;
  assert.equal(draftSources.data_source.database_id, 'replacement');
  assert.equal(draftSources.columns[0].database_id, undefined);
  assert.equal(draftSources.columns[1].database_id, 'legacy');
  assert.equal(draftSources.columns[1].database_mode, 'override');
  const updatedSources = (await update('publish', {
    ...draftSources, data_source: { ...draftSources.data_source, database_id: 'another' }
  })).report;
  assert.equal(updatedSources.data_source.database_id, 'another');
  assert.equal(updatedSources.columns[0].database_id, undefined);
  assert.equal(updatedSources.columns[1].database_id, 'legacy');

  const uploaded = await fetch(`http://127.0.0.1:${port}/api/reports/admin/template/upload`, {
    method: 'POST', headers: { cookie: 'role=editor', 'X-File-Name': 'Runtime%20Template.xlsx' },
    body: Buffer.from('PK mock spreadsheet')
  });
  assert.equal(uploaded.status, 200);
  const { template } = await uploaded.json();
  const library = await api(`/admin/templates?id=${draft.id}`);
  assert.equal(library.templates[0].filename, 'Runtime Template.xlsx');
  assert.equal(library.templates[0].stored_id, template.stored_id);
  const legacyId = 'a'.repeat(64);
  fs.writeFileSync(path.join(dir, 'templates', `${legacyId}.ods`), 'legacy template');
  assert(!(await api('/admin/templates')).templates.some((item) => item.stored_id === legacyId));
  assert((await api('/admin/templates', null, 'admin')).templates.some((item) =>
    item.stored_id === legacyId && item.filename === 'Uploaded aaaaaaaaaa.ods'));
  assert.equal((await api('/admin')).reports[0].template, null);
  const templateDraft = await update('save_draft', { ...updatedSources, template: { ...library.templates[0], enabled: true } });
  assert.equal(templateDraft.report.template.stored_id, template.stored_id);
  assert.equal((await api('/admin')).reports[0].template.enabled, true);
  assert.equal(JSON.parse(fs.readFileSync(definitions)).reports[0].template, null);

  const guest = (route, opts) => fetch(`http://127.0.0.1:${port}/api/reports${route}`, opts);
  const link = `/public?id=${draft.id}`;
  const period = { id: draft.id, period_value: '2026-11' };
  const previewGuest = () => guest('/public/preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(period)
  });
  const downloadGuest = () => guest(`/public/download?${new URLSearchParams({ ...period, format: 'xlsx' })}`);
  assert.equal((await guest(link)).status, 404);
  assert.equal((await previewGuest()).status, 404);
  assert.equal((await downloadGuest()).status, 404);
  await update('save_draft', { ...updatedSources, public_access: true, name: 'Draft public' });
  assert.equal((await guest(link)).status, 404);
  await update('publish', { ...updatedSources, public_access: true, name: 'Public report' });
  await update('save_draft', { ...updatedSources, public_access: false, name: 'Private draft' });
  assert.equal((await (await guest(link)).json()).reports[0].name, 'Public report');
  assert.equal((await guest('/admin')).status, 403);
  const guestPreview = await (await previewGuest()).json();
  assert.equal(guestPreview.name, 'Public report');
  assert.deepEqual(guestPreview.columns[0], { heading: 'Total' });
  assert.equal(await (await downloadGuest()).text(), 'Public report');

  const privateReport = (await api('/admin', {
    action: 'publish', report: { ...report, name: 'Private report', period: 'rolling', rolling_days: 30 }
  })).report;
  assert.equal(privateReport.period, 'rolling');
  assert.equal(privateReport.rolling_days, 30);
  const listedForHmi = (await api('/hmi')).reports.find((item) => item.id === privateReport.id);
  assert.equal(listedForHmi.rolling_days, 30);
  const guestList = await (await guest('')).json();
  assert.deepEqual(guestList.reports.map((item) => item.name), ['Public report']);
  assert.deepEqual((await api('', null, 'viewer')).reports.map((item) => item.name), ['Public report', 'Private report']);
  const standardPreview = (id) => guest('/preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...period, id })
  });
  const standardDownload = (id) => guest(`/download?${new URLSearchParams({ ...period, id, format: 'xlsx' })}`);
  assert.equal((await (await standardPreview(draft.id)).json()).name, 'Public report');
  assert.equal(await (await standardDownload(draft.id)).text(), 'Public report');
  assert.equal((await standardPreview(privateReport.id)).status, 403);
  assert.equal((await standardDownload(privateReport.id)).status, 403);
  await update('publish', { ...updatedSources, public_access: false });
  assert.deepEqual((await (await guest('')).json()).reports, []);
  assert.equal((await guest(link)).status, 404);
  assert.equal((await previewGuest()).status, 404);
  assert.equal((await downloadGuest()).status, 404);
});
