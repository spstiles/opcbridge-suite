const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/app.js'), 'utf8');
const fn = source.slice(source.indexOf('async function reloadEditedRemoteOpcuaTags()'), source.indexOf('async function browseEditedRemoteOpcbridge()'));
function setup(dirty = false) {
  const messages = [], calls = [];
  const context = vm.createContext({
    state: {}, els: { editDevOpcuaReloadBtn: {}, editDevOpcuaBrowseBtn: {} },
    editedRemoteOpcuaConnectionId: () => 'Client', workspaceIsDirty: () => dirty,
    setEditDevStatus: s => messages.push(s),
    opcbridgeReloadConnection: async id => calls.push(id)
  });
  vm.runInContext(fn, context);
  return { context, messages, calls };
}
test('reload immediately targets the saved connection without saving configuration', async () => {
  const { context, messages, calls } = setup();
  await context.reloadEditedRemoteOpcuaTags();
  assert.deepEqual(calls, ['Client']);
  assert.match(messages.at(-1), /No Save is needed/);
  assert.equal(context.els.editDevOpcuaReloadBtn.disabled, false);
});
test('reload protects pending configuration and reports failures', async () => {
  for (const dirty of [true, false]) {
    const { context, messages, calls } = setup(dirty);
    context.state.runtimeSavedChangesPending = !dirty;
    await context.reloadEditedRemoteOpcuaTags();
    assert.equal(calls.length, 0);
    assert.match(messages.at(-1), /pending Workspace changes/);
  }
  const { context, messages } = setup();
  context.opcbridgeReloadConnection = async () => { throw new Error('Unavailable'); };
  await context.reloadEditedRemoteOpcuaTags();
  assert.equal(messages.at(-1), 'Reload failed: Unavailable');
  assert.equal(context.els.editDevOpcuaBrowseBtn.disabled, false);
});
