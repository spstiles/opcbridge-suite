const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

function waiter(responses) {
  const context = vm.createContext({
    state: { workspaceRebuildInFlight: true }, setTimeout,
    apiGet: async () => {
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    }, renderRuntimeRebuildStatus() {}, setWorkspaceSaveStatus() {}
  });
  vm.runInContext(source.slice(source.indexOf('async function waitForOpcbridgeReloadDone('), source.indexOf('function stripJsonComments(')), context);
  return context.waitForOpcbridgeReloadDone;
}

test('rebuild waits through old generations, running state, and temporary status errors', async () => {
  const wait = waiter([
    { gen: 3, done: true, ok: true }, new Error('upstream timeout'),
    { gen: 4, in_progress: true }, { gen: 4, done: true, ok: true }
  ]);
  const result = await wait({ gen: 4, intervalMs: 0 });
  assert.equal(result.gen, 4);
  assert.equal(result.ok, true);
});

test('server rebuild failure is reported immediately instead of swallowed', async () => {
  const wait = waiter([{ gen: 4, done: true, ok: false, error: 'Invalid configuration' }]);
  await assert.rejects(wait({ gen: 4, intervalMs: 0 }), /Invalid configuration/);
});

test('a wait deadline cannot be mistaken for successful completion', async () => {
  await assert.rejects(waiter([])({ maxWaitMs: 0 }), /could not be confirmed/);
});

test('Workspace rebuild shows immediate feedback and blocks duplicate requests', async () => {
  let finish;
  let saves = 0;
  let overlay = '';
  const work = new Promise(resolve => { finish = resolve; });
  const state = {};
  const context = vm.createContext({
    state, window: { setTimeout, confirm: () => true }, workspaceIsDirty: () => true,
    setWorkspaceSaveStatus: message => { overlay = message; },
    setWorkspaceLoading: message => { overlay = message || ''; }, renderWorkspaceSaveBar() {},
    saveWorkspaceAllImpl: async () => { saves++; await work; }
  });
  vm.runInContext(source.slice(source.indexOf('async function saveWorkspaceAll('), source.indexOf('async function saveWorkspaceAllImpl(')), context);
  const first = context.saveWorkspaceAll({ rebuildOpcua: true });
  assert.match(overlay, /Saving changes before rebuilding/);
  assert.equal(state.workspaceRebuildInFlight, true);
  await context.saveWorkspaceAll({ rebuildOpcua: true });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(saves, 1);
  finish();
  await first;
  assert.equal(state.workspaceRebuildInFlight, false);
  assert.equal(overlay, '');
});

for (const applyPolling of [false, true]) {
  test(`Workspace ${applyPolling ? 'Save & Apply' : 'Save'} shows feedback and prevents overlapping saves`, async () => {
    let finish;
    let calls = 0;
    let message = '';
    const work = new Promise(resolve => { finish = resolve; });
    const state = {};
    const context = vm.createContext({
      state, window: { setTimeout }, workspaceIsDirty: () => true,
      setWorkspaceSaveStatus: value => { message = value; },
      setWorkspaceLoading: value => { message = value || ''; }, renderWorkspaceSaveBar() {},
      saveWorkspaceAllImpl: async options => { calls++; assert.equal(options.applyPolling, applyPolling); await work; }
    });
    vm.runInContext(source.slice(source.indexOf('async function saveWorkspaceAll('), source.indexOf('async function saveWorkspaceAllImpl(')), context);
    const first = context.saveWorkspaceAll({ applyPolling });
    assert.match(message, /Saving Workspace/);
    assert.equal(state.workspaceSaveInFlight, true);
    await context.saveWorkspaceAll({ applyPolling });
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(calls, 1);
    finish();
    await first;
    assert.equal(state.workspaceSaveInFlight, false);
    assert.equal(message, '');
  });
}
