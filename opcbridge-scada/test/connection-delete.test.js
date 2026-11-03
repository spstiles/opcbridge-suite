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

test('device deletion stages changes without writing files or reloading other edits', async () => {
  const calls = [];
  const state = {
    connObjCache: new Map(), workspaceDeletePaths: new Set(), workspaceDeletedTagConnectionIds: new Set(),
    workspaceConnDirty: new Map([['connections/old.json', { id: 'Old' }], ['connections/keep.json', { id: 'Keep' }]]),
    connFiles: [{ path: 'connections/old.json' }, { path: 'connections/keep.json' }],
    tagConfigAll: [{ connection_id: 'Old', name: 'Value' }, { connection_id: 'Keep', name: 'Other' }],
    tagConfigEdited: new Map([['Old::Value', {}], ['Keep::Other', { name: 'Other', scan_ms: 500 }]])
  };
  const context = vm.createContext({
    state, window: { confirm: () => true, alert: assert.fail }, canEditConfig: () => true,
    displayConnectionName: id => id, markTagsDirty: value => { state.tagConfigDirty = value; },
    apiPostJson: async () => assert.fail('Deletion must wait for Save'),
    loadTagsConfig: async () => assert.fail('Staged edits must not be reloaded'),
    blockWorkspaceApplyBriefly() {}, saveWorkspaceDraft: () => calls.push('draft'),
    renderWorkspaceTree() {}, renderWorkspaceSaveBar: () => calls.push('buttons'), setWorkspaceSaveStatus() {}
  });
  vm.runInContext(source.slice(source.indexOf('async function deleteDeviceById('),
    source.indexOf('async function addAlarmGroupInteractive(')), context);
  await context.deleteDeviceById('Old', 'connections/old.json');
  assert.equal(state.workspaceDeletePaths.has('connections/old.json'), true);
  assert.equal(state.workspaceDeletedTagConnectionIds.has('Old'), true);
  assert.equal(state.workspaceConnDirty.has('connections/old.json'), false);
  assert.equal(state.workspaceConnDirty.has('connections/keep.json'), true);
  assert.equal(state.tagConfigEdited.has('Old::Value'), false);
  assert.equal(state.tagConfigEdited.has('Keep::Other'), true);
  assert.equal(state.tagConfigAll.length, 1);
  assert.equal(state.tagConfigAll[0].connection_id, 'Keep');
  assert.equal(state.connFiles.length, 1);
  assert.equal(state.tagConfigDirty, true);
  assert.deepEqual(calls, ['draft', 'buttons']);
});

test('restoring a draft keeps staged connection deletions hidden', () => {
  const state = { connFiles: [{ path: 'connections/Old.json' }, { path: 'connections/Keep.json' }], connObjCache: new Map() };
  const draft = { conn_delete: ['connections/Old.json'], deleted_tag_connections: ['Old'], tag_all: [], tag_dirty: true };
  const context = vm.createContext({
    state, window: { localStorage: { getItem: () => JSON.stringify(draft) } },
    markTagsDirty: value => { state.tagConfigDirty = value; },
    renderWorkspaceTree() {}, renderWorkspaceSaveBar() {}, setWorkspaceSaveStatus() {}
  });
  vm.runInContext(source.slice(source.indexOf('const OPCBRIDGE_SCADA_DRAFT_KEY'),
    source.indexOf("window.addEventListener('beforeunload'")), context);
  context.restoreWorkspaceDraft();
  assert.equal(state.connFiles.length, 1);
  assert.equal(state.connFiles[0].path, 'connections/Keep.json');
  assert.equal(state.workspaceDeletePaths.has('connections/Old.json'), true);
  assert.equal(state.workspaceDeletedTagConnectionIds.has('Old'), true);
  assert.equal(state.tagConfigDirty, true);
});
