const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

function harness(records, connections = [{ id: 'connection_random', description: 'Field Ops PLC0' }]) {
  const cfg = { alarms: [] };
  const alerts = [];
  const tags = [{ connection_id: 'connection_random', name: 'Pump.Run' }];
  let exported;
  const context = vm.createContext({
    state: { alarmsConfig: cfg, tagConfigLoadedAll: [{ connection_id: 'stale', name: 'Wrong' }] },
    window: { alert: message => alerts.push(message), confirm: () => false },
    canEditConfig: () => true, pickCsvText: async () => 'csv', parseCsv: () => ({ records }),
    csvGet: (row, key) => row[key] || '', apiGet: async () => ({ ok: true, connections, tags }),
    loadOpcbridgeAlarmsConfig: async () => cfg, saveOpcbridgeAlarmsConfig: async () => {},
    normalizeAlarmGroupName: value => String(value || ''), normalizeAlarmSiteName: value => String(value || ''),
    ensureAlarmGroupsTree() {}, isDeleteAction: value => value === 'delete',
    parseBoolLoose: (_, fallback) => fallback, parseIntLoose: (_, fallback) => fallback,
    parseFloatLoose: (_, fallback) => fallback, renderWorkspaceTree() {}, renderAlarmsEventsTree() {},
    setWorkspaceSaveStatus() {}, displayConnectionName: id => id,
    toCsv: (rows, headers) => { exported = { rows, headers }; return 'csv'; }, downloadTextFile() {},
    alarmCsvValueText: alarm => String(alarm.value || '')
  });
  vm.runInContext(source.slice(source.indexOf('function alarmCsvConnectionResolver('), source.indexOf('const TAG_DATATYPE_OPTIONS')), context);
  vm.runInContext(source.slice(source.indexOf('const ALARM_CSV_HEADERS'), source.indexOf('function alarmCsvValueText(')), context);
  vm.runInContext(source.slice(source.indexOf('async function downloadAlarmsCsv('), source.indexOf('function parseCsv(')), context);
  return { context, cfg, alerts, tags, exported: () => exported };
}

for (const column of ['connection_name', 'connection_id', 'connection']) {
  test(`alarm import resolves friendly names in ${column} to internal IDs`, async () => {
    const h = harness([{ id: 'Alarm', [column]: 'field ops plc0', tag_name: 'Pump.Run', type: 'change' }]);
    await h.context.importAlarmsCsv();
    assert.equal(h.cfg.alarms.length, 1);
    assert.equal(h.cfg.alarms[0].connection_id, 'connection_random');
    assert.equal(h.cfg.alarms[0].tag_name, 'Pump.Run');
  });
}

test('old CSV connection IDs remain supported', async () => {
  const h = harness([{ id: 'Alarm', connection_id: 'connection_random', tag_name: 'Pump.Run', type: 'change' }]);
  await h.context.importAlarmsCsv();
  assert.equal(h.cfg.alarms.length, 1);
});

test('duplicate connection names are rejected instead of choosing a target', async () => {
  const h = harness([{ id: 'Alarm', connection_name: 'Field Ops PLC0', tag_name: 'Pump.Run', type: 'change' }], [
    { id: 'connection_random', description: 'Field Ops PLC0' }, { id: 'Other', description: 'FIELD OPS PLC0' }
  ]);
  await h.context.importAlarmsCsv();
  assert.equal(h.cfg.alarms.length, 0);
  assert.match(h.alerts.join('\n'), /ambiguous connection name/);
});

test('resolving a connection does not bypass tag validation', async () => {
  const h = harness([{ id: 'Alarm', connection_name: 'Field Ops PLC0', tag_name: 'Missing', type: 'change' }]);
  await h.context.importAlarmsCsv();
  assert.equal(h.cfg.alarms.length, 0);
  assert.match(h.alerts.join('\n'), /unknown tag 'Field Ops PLC0:Missing'/);
});

test('export uses friendly connection names and a connection_name column', async () => {
  const h = harness([]);
  h.cfg.alarms.push({ id: 'Alarm', connection_id: 'connection_random', tag_name: 'Pump.Run', type: 'change' });
  await h.context.downloadAlarmsCsv();
  assert.equal(h.exported().rows[0].connection_name, 'Field Ops PLC0');
  assert.equal(h.exported().headers.includes('connection_name'), true);
  assert.equal(h.exported().headers.includes('connection_id'), false);
  assert.equal(Object.hasOwn(h.exported().rows[0], 'connection_id'), false);
});
