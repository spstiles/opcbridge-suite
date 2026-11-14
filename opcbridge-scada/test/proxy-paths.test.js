const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../server.js`, 'utf8');
const ctx = vm.createContext({});
const start = source.indexOf('function isAllowedOpcbridgePath(');
vm.runInContext(source.slice(start, source.indexOf('function needsWriteToken(', start)), ctx);

test('alarm CSV can read the saved workspace connection/tag snapshot through the proxy', () => {
  assert.equal(ctx.isAllowedOpcbridgePath('/workspace/config'), true);
  const client = fs.readFileSync(`${__dirname}/../public/app.js`, 'utf8');
  for (const [startMarker, endMarker] of [
    ['async function downloadAlarmsCsv(', 'function parseCsv('],
    ['async function importAlarmsCsv(', 'const TAG_DATATYPE_OPTIONS']
  ]) {
    const start = client.indexOf(startMarker);
    const calls = client.slice(start, client.indexOf(endMarker, start)).matchAll(/apiGet\('\/api\/opcbridge([^']+)'\)/g);
    let snapshotFound = false;
    for (const [, endpoint] of calls) {
      assert.equal(ctx.isAllowedOpcbridgePath(endpoint), true, endpoint);
      if (endpoint === '/workspace/config') snapshotFound = true;
    }
    assert.equal(snapshotFound, true, startMarker);
  }
});

test('permitting the snapshot does not open other workspace or arbitrary proxy paths', () => {
  for (const endpoint of ['/workspace', '/workspace/config/delete', '/workspace/save', '/admin', '/etc/passwd']) {
    assert.equal(ctx.isAllowedOpcbridgePath(endpoint), false, endpoint);
  }
});
