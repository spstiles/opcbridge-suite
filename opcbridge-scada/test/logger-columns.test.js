const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../public/logger-columns');
test('default and selected columns support typed static values', () => {
  validate({ table: 'tag_log' });
  validate({ table: 'custom_log', field_map: { timestamp_dt: 'time', value_numeric: 'reading' }, static_fields: { site: 'Plant', line: 1, active: true, extra: null } });
  validate({ table: 'custom_log', field_map: {}, static_fields: { site: 'Plant' } });
});
test('reject unknown sources, unsafe names, collisions, empty and malformed mapping', () => {
  for (const config of [
    { field_map: { value_float: 'reading' } }, { field_map: { tag_name: 'x`' } },
    { field_map: { quality: 'x', tag_name: 'X' } }, { field_map: {} }, { field_map: [] },
    { field_map: { quality: 'x' }, static_fields: { X: 1 } }, { static_fields: { quality: 3 } },
    { static_fields: { site: {} } }, { static_fields: null }, { field_map: null },
    { field_map: { quality: 1 } }, { table: 'table;drop' }
  ]) assert.throws(() => validate({ table: 'tag_log', ...config }));
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
test('table saves selected destinations and restores defaults when customization is off', () => {
  const rows = [
    { source: 'timestamp_ms', include: { checked: true }, destination: { value: ' sample_time ' } },
    { source: 'value_numeric', include: { checked: true }, destination: { value: 'reading' } },
    { source: 'quality', include: { checked: false }, destination: { value: 'ignored' } }
  ].map(row => ({ ...row, dataset: { source: row.source }, querySelector: selector => selector === '[data-column-include]' ? row.include : row.destination }));
  const els = { loggerReportCustomColumns: { checked: true }, loggerReportColumnsBody: { querySelectorAll: () => rows }, loggerReportColumnsHint: {} };
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const context = vm.createContext({ els });
  vm.runInContext(source.slice(source.indexOf('function updateLoggerReportColumns('), source.indexOf('function openLoggerReportModal(')), context);
  context.updateLoggerReportColumns();
  assert.equal(rows[0].destination.disabled, false);
  assert.equal(rows[2].destination.disabled, true);
  assert.deepEqual(JSON.parse(JSON.stringify(context.loggerReportColumnMapping())), { field_map: { timestamp_ms: 'sample_time', value_numeric: 'reading' } });
  els.loggerReportCustomColumns.checked = false;
  context.updateLoggerReportColumns();
  assert.ok(rows.every(row => row.include.disabled && row.destination.disabled));
  assert.deepEqual(JSON.parse(JSON.stringify(context.loggerReportColumnMapping())), {});
});
