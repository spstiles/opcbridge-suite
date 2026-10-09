const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('central viewer sends origin filters and displays station/user context and collection gaps', async () => {
  const rows = []; const health = []; let request;
  const field = value => ({ value });
  const els = {
    logsSource: field('central_audit'), logsLines: field('400'), logsSite: field('plant'), logsNode: field('panel'), logsStation: field('station'),
    logsComponent: field('hmi'), logsAction: field('screen.save'), logsUser: field('operator'), logsResult: field('recorded'), logsSearch: field(''),
    logsTbody: { textContent: '', appendChild: row => rows.push(row) },
    centralAuditStatus: { textContent: '' }, centralAuditHealthBody: { textContent: '', appendChild: row => health.push(row) }
  };
  const state = { logsRequestSeq: 0 };
  const context = vm.createContext({ els, state, URLSearchParams, Date,
    datetimeLocalToEpochMs: () => null, fmtLogTime: String, logsSetStatus() {}, logsSetOutput() {},
    appendTextCell: (row, text) => row.cells.push(text),
    document: { createElement: () => ({ cells: [], addEventListener() {} }) },
    apiGet: async url => {
      request = url;
      return { ok: true, records: [{ timestamp_ms: 1000, source: 'plant / panel / hmi', type: 'screen.save', station: 'station', actor: 'operator', attribution: 'client_reported' }],
        audit_status: { collector: { nodes: [{ site_id: 'plant', node_id: 'panel', components: [{ component: 'hmi', last_received_ms: Date.now() - 180000, reported_pending_count: 5, reported_capture_failures: 2, reported_capture_error: 'Queue full' }] }, { site_id: 'plant', node_id: 'unseen', components: [] }] } } };
    }
  });
  vm.runInContext(source.slice(source.indexOf('function renderCentralAuditHealth('), source.indexOf('function applyLogsRange(')), context);
  await context.refreshLogs();
  const params = new URL(`http://local${request}`).searchParams;
  for (const [key, value] of Object.entries({ source: 'central_audit', site: 'plant', node_id: 'panel', station_id: 'station', component: 'hmi', action: 'screen.save', user: 'operator', result: 'recorded' })) assert.equal(params.get(key), value);
  assert.equal(rows[0].cells.length, 8); assert.equal(rows[0].cells[5], 'station'); assert.equal(rows[0].cells[6], 'operator'); assert.equal(rows[0].cells[7], 'Unverified');
  assert.equal(health[0].cells[4], 'Stale'); assert.equal(health[0].cells[5], 5); assert.equal(health[0].cells[6], 2); assert.equal(health[0].cells[7], 'Queue full');
  assert.equal(health[1].cells[3], 'No contact yet'); assert.equal(health[1].cells[4], 'Unknown');
  assert.match(els.centralAuditStatus.textContent, /unreceived events/);
});

test('CSV retains central station and actor context', () => {
  let output;
  const context = vm.createContext({
    state: { logsLast: [{ station: 'panel-touchscreen', actor: 'operator', details: { attribution: 'client_reported' } }] },
    els: { logsSource: { value: 'central_audit' } }, fmtLogTime: String,
    toCsv: (rows, columns) => { output = { rows, columns }; return ''; }, downloadTextFile() {}
  });
  vm.runInContext(source.slice(source.indexOf('function downloadLogsCsv('), source.indexOf('function wireLogsUi(')), context);
  context.downloadLogsCsv();
  assert.equal(output.rows[0].station, 'panel-touchscreen'); assert.equal(output.rows[0].actor, 'operator');
  assert.ok(output.columns.includes('station') && output.columns.includes('actor'));
});
