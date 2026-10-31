const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/app.js'), 'utf8');

test('saving deleted or renamed connections cannot recreate empty tag files', async () => {
  const writes = [];
  const context = vm.createContext({
    state: { workspaceDeletedTagConnectionIds: new Set(['Old']) },
    computeChangedTagConnectionIds: () => new Set(['Old', 'New']),
    computeEmptiedTagConnectionIds: () => ['Old', 'KeepEmpty'],
    apiPostJson: async (url, body) => writes.push({ url, body }),
    prettyJson: JSON.stringify, invalidateLoggerTagPickerCache() {}
  });
  vm.runInContext(source.slice(source.indexOf('async function saveTagsForChangedConnections('),
    source.indexOf('function getEffectiveTagsAll(')), context);
  await context.saveTagsForChangedConnections([], [{ connection_id: 'New', name: 'Value' }]);
  assert.equal(writes.length, 2);
  assert.equal(writes[0].url, '/api/opcbridge/config/tags');
  assert.equal(writes[1].body.path, 'tags/KeepEmpty.json');
});

test('device deletion lets the backend clean tag stores without rewriting them', async () => {
  const calls = [];
  const context = vm.createContext({
    state: { connObjCache: new Map() }, window: { confirm: () => true, alert: assert.fail },
    apiPostJson: async (url, body) => calls.push({ url, body }),
    loadTagsConfig: async () => {}, loadConnectionsList: async () => {}, renderWorkspaceTree() {}
  });
  vm.runInContext(source.slice(source.indexOf('async function deleteDeviceById('),
    source.indexOf('async function addAlarmGroupInteractive(')), context);
  await context.deleteDeviceById('Old', 'connections/old.json');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/opcbridge/config/delete');
});
