const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/app.js'), 'utf8');

test('refreshing a remote selection keeps block shape and removes no-longer-published tags within that source', () => {
  const state = { tagConfigAll: [
    { connection_id: 'Client', name: 'My Block', plc_tag_name: 'ns=1;s=Tags/Kraft/Block', datatype: 'int16', scan_ms: 250, enabled: false },
    { connection_id: 'Client', name: 'ECU', plc_tag_name: 'ns=1;s=Tags/Kraft/Disabled' },
    { connection_id: 'Client', name: 'Other source', plc_tag_name: 'ns=1;s=Tags/Kraft2/Keep' },
    { connection_id: 'OtherClient', name: 'Keep', plc_tag_name: 'ns=1;s=Tags/Kraft/Disabled' }
  ] };
  state.tagConfigEdited = new Map([['Client::My Block', { ...state.tagConfigAll[0], scan_ms: 999 }]]);
  const container = {
    _opcuaConnections: [{ name: 'Kraft', node_id: 'ns=1;s=Connections/Kraft', tags: [
      { name: 'Block', node_id: 'ns=1;s=Tags/Kraft/Block', datatype: 'uint16', elem_count: 200, writable: false }
    ] }],
    querySelectorAll: () => [{ checked: true, dataset: { opcuaTag: '0:0' } }]
  };
  const context = vm.createContext({ state, els: { editDevOpcuaBrowseResults: container },
    getEffectiveTagsAll: () => state.tagConfigAll.map(tag => state.tagConfigEdited.get(`${tag.connection_id}::${tag.name}`) || tag),
    editedRemoteOpcuaConnectionId: () => 'Client', markTagsDirty: value => { state.dirty = value; } });
  vm.runInContext(source.slice(source.indexOf('function applyEditedRemoteOpcuaTagSelection('), source.indexOf('function fillConnForm(')), context);
  context.applyEditedRemoteOpcuaTagSelection();
  const block = state.tagConfigAll.find(tag => tag.name === 'My Block');
  assert.equal(block.elem_count, 200);
  assert.equal(block.datatype, 'uint16');
  assert.equal(block.scan_ms, 999);
  assert.equal(state.tagConfigEdited.size, 0);
  assert.equal(block.enabled, false);
  assert.equal(state.tagConfigAll.some(tag => tag.name === 'ECU'), false);
  assert.equal(state.tagConfigAll.length, 3);
  assert.equal(state.dirty, true);
});
