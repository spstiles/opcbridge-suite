const test = require('node:test');
const assert = require('node:assert/strict');
const { create, connectionInfo, filterRows } = require('../public/tag-audit');
const tags = [
  { connection_id: 'c', name: 'Running', plc_tag_name: 'Data[9]' },
  { connection_id: 'c', name: 'Failed', plc_tag_name: 'Data[137]' },
  { connection_id: 'c', name: 'Unused', plc_tag_name: 'Data[20]' }
];

test('details trace aliases and enumerate array assignments numerically without mixing connections', () => {
  const audit = create([
    { connection_id: 'c', name: 'Array', plc_tag_name: 'HMI_Dints_400' },
    { connection_id: 'c', name: 'Low', plc_tag_name: 'HMI_Dints_400[9]' },
    { connection_id: 'c', name: 'High', plc_tag_name: 'HMI_Dints_400[137]' },
    { connection_id: 'c', name: 'Alias', source_tag: 'High', bit: 2 },
    { connection_id: 'c', name: 'Duplicate', plc_tag_name: 'HMI_Dints_400[137]', enabled: false },
    { connection_id: 'c', name: 'Indexed', source_tag: 'Array[20]' },
    { connection_id: 'other', name: 'Foreign', plc_tag_name: 'HMI_Dints_400[199]' }
  ], { c: 'Field Ops' });
  const info = audit.details(audit.rows().find(row => row[1] === 'Array').recordId);
  assert.equal(info.array.highest, 137);
  assert.deepEqual(info.array.elements.map(element => element.index), [9, 20, 137]);
  assert.equal(info.array.elements[2].assignments.length, 3);
  const alias = audit.details(audit.rows().find(row => row[1] === 'Alias').recordId);
  assert.equal(alias.source, 'HMI_Dints_400[137]');
  assert.equal(alias.connection, 'Field Ops');
  assert.deepEqual(alias.chain.map(tag => tag.name), ['Alias', 'High']);
  assert.equal(alias.related.find(tag => tag.name === 'Alias').bit, 2);
});

test('details report missing sources and cycles instead of claiming resolved assignments', () => {
  const audit = create([
    { connection_id: 'c', name: 'A', source_tag: 'B' },
    { connection_id: 'c', name: 'B', source_tag: 'A' },
    { connection_id: 'c', name: 'Missing', source_tag: 'Unknown' }
  ]);
  for (const row of audit.rows()) {
    const info = audit.details(row.recordId);
    assert.ok(info.error);
    assert.equal(info.array, null);
  }
});

test('multiple search terms match across columns and quoted phrases stay together', () => {
  const rows = [
    ['Field Ops', 'Running', 'Data[137]', 1, 'HMI'],
    ['Field Ops', 'Failed', 'Data[138]', 0, ''],
    ['Plant', 'Running', 'Data[137]', 1, 'HMI']
  ];
  assert.deepEqual(filterRows(rows, 'field running'), [rows[0]]);
  assert.deepEqual(filterRows(rows, '"Field Ops" Data[138]'), [rows[1]]);
  assert.deepEqual(filterRows(rows, 'running hmi'), [rows[0], rows[2]]);
  assert.equal(filterRows(rows, '   ').length, 3);
});

test('connection names retain readable legacy IDs when description is empty', () => {
  assert.deepEqual(connectionInfo({ id: 'Field_Ops', description: '' }), { id: 'Field_Ops', name: 'Field_Ops' });
  assert.deepEqual(connectionInfo({ id: 'connection_123', description: 'Field Ops' }), { id: 'connection_123', name: 'Field Ops' });
  assert.equal(connectionInfo({ description: '  ' }, 'TestPLC').name, 'TestPLC');
  const info = connectionInfo({ id: 'Field_Ops' });
  const audit = create([{ connection_id: info.id, name: 'Running' }], { [info.id]: info.name });
  assert.equal(audit.rows()[0][0], 'Field_Ops');
  assert.match(audit.csv(), /Field_Ops/);
  assert.doesNotMatch(audit.csv(), /Unnamed connection/);
});

test('lists every configured tag with numeric source ordering and zero-use rows', () => {
  const audit = create(tags, { c: 'Field_Ops' });
  audit.scan({ connection_id: 'c', tag: 'Running' }, 'HMI', 'Overview');
  const rows = audit.rows();
  assert.deepEqual(rows.map(row => row[2]), ['Data[9]', 'Data[20]', 'Data[137]']);
  assert.equal(rows[0][0], 'Field_Ops');
  assert.equal(rows[0][3], 1);
  assert.equal(rows[1][3], 0);
  assert.equal(rows[1][4], '');
});

test('expression uses resolve friendly names and do not double-count repeats', () => {
  const audit = create(tags, { c: 'Field_Ops' });
  audit.scan({ id: 'text1', sourceType: 'expression', connection_id: 'c', tag: 'Failed',
    expression: 'tag("Field_Ops", "Running") + tag("Field_Ops", "Running")' }, 'HMI', 'Overview.screen');
  assert.equal(audit.rows().find(row => row[1] === 'Running')[3], 1);
  assert.equal(audit.rows().find(row => row[1] === 'Failed')[3], 0);
});

test('logger patterns and string selections expand against the catalog', () => {
  const audit = create(tags);
  audit.scan({ jobs: { hourly: { tags: [{ connection_id: 'c', name: '*ing' }, 'c:Failed'] } } }, 'Data Logger', 'jobs', true);
  assert.equal(audit.rows().find(row => row[1] === 'Running')[3], 1);
  assert.equal(audit.rows().find(row => row[1] === 'Failed')[3], 1);
});

test('derived aliases and disabled references are included', () => {
  const audit = create([...tags, { connection_id: 'c', name: 'Alias', source_tag: 'Running' }]);
  audit.scan({ historian_tags: [{ connection_id: 'c', tag_name: 'Running', enabled: false }] }, 'Historian', 'config');
  const rows = audit.rows().filter(row => row[1] === 'Running');
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row[3] === 2));
  assert.ok(rows.some(row => row[6].includes('disabled')));
});

test('unresolved expressions and service failures are carried into CSV coverage', () => {
  const audit = create(tags);
  audit.scan({ sourceType: 'expression', expression: '{{ac:Plant/Flow}} + tag(connection, name)' }, 'HMI', 'Imported');
  audit.warnings.add('Flows could not be inspected');
  assert.ok(audit.rows().every(row => row[7].startsWith('Incomplete')));
  assert.match(audit.csv(), /Flows could not be inspected/);
});

test('CSV quotes delimiters and prevents spreadsheet formula evaluation', () => {
  const audit = create([{ connection_id: 'c', name: '=TEST', plc_tag_name: 'Data[1]' }], { c: 'A,"B' });
  assert.match(audit.csv(), /"A,""B"/);
  assert.match(audit.csv(), /"'=TEST"/);
});
