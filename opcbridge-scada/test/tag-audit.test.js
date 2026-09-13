const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../public/tag-audit');
const tags = [
  { connection_id: 'c', name: 'Running', plc_tag_name: 'Data[9]' },
  { connection_id: 'c', name: 'Failed', plc_tag_name: 'Data[137]' },
  { connection_id: 'c', name: 'Unused', plc_tag_name: 'Data[20]' }
];

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
