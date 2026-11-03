const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

function waiter(responses) {
  const context = vm.createContext({
    state: { workspaceApplyInFlight: true }, setTimeout,
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

function workspace({ pending = false } = {}) {
  const server = { pending };
  const events = [];
  const messages = [];
  const state = {
    workspaceConnDirty: new Map(), workspaceDeletePaths: new Set(),
    workspaceDeletedTagConnectionIds: new Set(), connObjCache: new Map(),
    tagConfigEdited: new Map(), tagConfigAll: [], connFiles: [], runtimeSavedChangesPending: pending
  };
  const els = { workspaceSaveBtn: {}, workspaceSaveApplyBtn: {}, workspaceApplyBtn: {}, workspaceDiscardBtn: {} };
  const context = vm.createContext({
    state, els, window: { setTimeout, confirm: () => true }, setTimeout,
    canEditConfig: () => true, openLoginModal: () => events.push('login'),
    workspaceIsDirty: () => state.workspaceConnDirty.size > 0 || state.workspaceDeletePaths.size > 0 || state.tagConfigDirty,
    setWorkspaceSaveStatus: value => messages.push(value), setWorkspaceLoading() {},
    connectionIdForConnFilePath: rel => rel.split('/').pop().replace(/\.json$/, ''),
    displayConnectionName: id => id, saveWorkspaceDraft() {},
    prettyJson: JSON.stringify, apiPostJson: async (url, body) => { server.pending = true; events.push({ url, body }); },
    apiGet: async () => ({ saved_changes_pending: server.pending }),
    opcbridgeReload: async () => { events.push('apply'); server.pending = false; },
    getEffectiveTagsAll: () => [], historianTagRulesFromWorkspaceTags: () => [],
    saveTagsForChangedConnections: async () => [], saveHistorianConfigFromWorkspaceTags: async () => 0,
    markTagsDirty: value => { state.tagConfigDirty = value; }, clearWorkspaceDraft() {},
    loadConnectionsList: async () => {}, loadTagsConfig: async () => {},
    loadOpcbridgeAlarmsConfig: async () => {}, loadWorkspaceConnectionObjects: async () => {},
    renderWorkspaceTree() {}
  });
  vm.runInContext(source.slice(source.indexOf('function renderWorkspaceSaveBar('), source.indexOf('const OPCBRIDGE_SCADA_DRAFT_KEY')), context);
  vm.runInContext(source.slice(source.indexOf('function renderRuntimeRebuildStatus('), source.indexOf('function wireOverviewRuntimeUi(')), context);
  vm.runInContext(source.slice(source.indexOf('async function saveWorkspaceAll('), source.indexOf('async function discardWorkspaceChanges(')), context);
  vm.runInContext(source.slice(source.indexOf('async function deleteDeviceById('), source.indexOf('async function addAlarmGroupInteractive(')), context);
  vm.runInContext(source.slice(source.indexOf('async function discardWorkspaceChanges('), source.indexOf('function updateWorkspaceLiveTagFilterLabel(')), context);
  const edit = id => state.workspaceConnDirty.set(`connections/${id}.json`, { id });
  return { context, state, els, events, messages, edit, server };
}

test('multiple saves leave Apply available and apply saved changes only when requested', async () => {
  const w = workspace();
  for (const id of ['First', 'Second']) {
    w.edit(id);
    await w.context.saveWorkspaceAll({ apply: false });
    assert.equal(w.els.workspaceSaveBtn.disabled, true);
    assert.equal(w.els.workspaceSaveApplyBtn.disabled, true);
    assert.equal(w.els.workspaceApplyBtn.disabled, false);
  }
  assert.equal(w.events.filter(e => e === 'apply').length, 0);
  assert.equal(w.events.filter(e => e.url).length, 2);
  await w.context.applyWorkspaceChanges();
  assert.equal(w.events.filter(e => e === 'apply').length, 1);
  assert.equal(w.messages.at(-1), 'Saved configuration applied.');
});

test('Apply restores server pending state after reopening the page', async () => {
  const w = workspace();
  w.server.pending = true;
  await w.context.refreshWorkspaceApplyStatus();
  assert.equal(w.els.workspaceApplyBtn.disabled, false);
  await w.context.applyWorkspaceChanges();
  assert.deepEqual(w.events, ['apply']);
});

test('Save & Apply is the default action and waits for persistence before applying', async () => {
  const w = workspace();
  w.edit('First');
  await w.context.saveWorkspaceAll();
  assert.equal(w.events[0].url, '/api/opcbridge/config/file');
  assert.equal(w.events[1], 'apply');
  assert.equal(w.messages.at(-1), 'Saved configuration applied.');
});

test('a failed save keeps changes staged and never applies', async () => {
  const w = workspace();
  w.edit('First');
  w.context.apiPostJson = async () => { throw new Error('Disk full'); };
  await w.context.saveWorkspaceAll();
  assert.match(w.messages.at(-1), /Save failed: Disk full/);
  assert.equal(w.state.workspaceConnDirty.size, 1);
  assert.equal(w.events.includes('apply'), false);
  assert.equal(w.state.workspaceSaveInFlight, false);
});

test('Apply preserves unsaved edits and directs the user to Save & Apply', async () => {
  const w = workspace();
  w.edit('First');
  await w.context.applyWorkspaceChanges();
  assert.equal(w.events.length, 0);
  assert.equal(w.state.workspaceConnDirty.size, 1);
  assert.match(w.messages.at(-1), /Save & Apply/);
});

test('Apply waits for reload completion and prevents overlapping actions', async () => {
  const w = workspace({ pending: true });
  let finish;
  w.context.opcbridgeReload = () => { w.events.push('apply'); return new Promise(resolve => { finish = resolve; }); };
  const work = w.context.applyWorkspaceChanges();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(w.state.workspaceApplyInFlight, true);
  assert.equal(w.els.workspaceApplyBtn.disabled, true);
  await w.context.applyWorkspaceChanges();
  await w.context.saveWorkspaceAll();
  assert.deepEqual(w.events, ['apply']);
  finish();
  await work;
  assert.equal(w.state.workspaceApplyInFlight, false);
  assert.equal(w.els.workspaceApplyBtn.disabled, false);
});

test('failed Apply can be retried with no edits and does not claim success', async () => {
  const w = workspace({ pending: true });
  w.context.opcbridgeReload = async () => { throw new Error('Invalid configuration'); };
  await w.context.applyWorkspaceChanges();
  assert.equal(w.messages.at(-1), 'Apply failed: Invalid configuration');
  assert.equal(w.els.workspaceApplyBtn.disabled, false);
  w.context.opcbridgeReload = async () => { w.events.push('apply'); w.server.pending = false; };
  await w.context.applyWorkspaceChanges();
  assert.equal(w.messages.at(-1), 'Saved configuration applied.');
});

test('refresh errors after a successful Apply report that configuration was applied', async () => {
  const w = workspace({ pending: true });
  w.context.loadConnectionsList = async () => { throw new Error('Network error'); };
  await w.context.applyWorkspaceChanges();
  assert.deepEqual(w.events, ['apply']);
  assert.match(w.messages.at(-1), /Configuration applied, but Workspace refresh failed/);
});

test('Save & Apply blocks a concurrent Apply while saving', async () => {
  const w = workspace();
  w.edit('First');
  let finish;
  w.context.apiPostJson = async () => new Promise(resolve => { finish = resolve; });
  const work = w.context.saveWorkspaceAll();
  await new Promise(resolve => setTimeout(resolve, 5));
  await w.context.applyWorkspaceChanges();
  assert.equal(w.events.includes('apply'), false);
  w.server.pending = true;
  finish();
  await work;
  assert.deepEqual(w.events, ['apply']);
});

test('Workspace exposes Save & Apply as primary, Save separately, and Apply without the old rebuild button', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.match(html, /class="btn primary" id="workspaceSaveApplyBtn"[^>]*>Save &amp; Apply<\/button>/);
  assert.match(html, /id="workspaceSaveBtn"[^>]*>Save<\/button>/);
  assert.match(html, /id="workspaceApplyBtn"[^>]*>Apply<\/button>/);
  assert.doesNotMatch(html, /id="workspaceRebuildOpcuaBtn"|id="workspaceApplyPollingBtn"/);
});

test('rapid clicks after staging a tag deletion cannot apply changes', async () => {
  const w = workspace();
  w.edit('First');
  w.context.blockWorkspaceApplyBriefly();
  assert.equal(w.els.workspaceSaveApplyBtn.disabled, true);
  await w.context.saveWorkspaceAll();
  await w.context.applyWorkspaceChanges();
  assert.equal(w.events.length, 0);
  assert.equal(w.state.workspaceConnDirty.size, 1);
});

test('deleting a saved connection enables Save and Discard; Save persists deletion and leaves Apply available', async () => {
  const w = workspace();
  w.state.connFiles = [{ path: 'connections/Old.json' }];
  await w.context.deleteDeviceById('Old', 'connections/Old.json');
  assert.equal(w.els.workspaceSaveBtn.disabled, false);
  assert.equal(w.els.workspaceDiscardBtn.disabled, false);
  assert.equal(w.events.length, 0);
  w.state.workspaceApplyBlockUntil = 0;
  w.context.renderWorkspaceSaveBar();
  assert.equal(w.els.workspaceSaveApplyBtn.disabled, false);
  await w.context.saveWorkspaceAll({ apply: false });
  assert.equal(w.events.length, 1);
  assert.equal(w.events[0].url, '/api/opcbridge/config/delete');
  assert.equal(w.events[0].body.path, 'connections/Old.json');
  assert.equal(w.els.workspaceApplyBtn.disabled, false);
  await w.context.applyWorkspaceChanges();
  assert.equal(w.events[1], 'apply');
});

test('discarding a connection deletion restores saved configuration without deleting anything', async () => {
  const w = workspace();
  const saved = [{ path: 'connections/Old.json' }];
  w.state.connFiles = saved.slice();
  w.context.loadConnectionsList = async () => { w.state.connFiles = saved.slice(); };
  await w.context.deleteDeviceById('Old', 'connections/Old.json');
  assert.equal(w.state.connFiles.length, 0);
  await w.context.discardWorkspaceChanges();
  assert.equal(w.state.connFiles.length, 1);
  assert.equal(w.state.workspaceDeletePaths.size, 0);
  assert.equal(w.state.workspaceDeletedTagConnectionIds.size, 0);
  assert.equal(w.state.tagConfigDirty, false);
  assert.equal(w.events.length, 0);
});

test('Apply is disabled when saved configuration matches the runtime', async () => {
  const w = workspace();
  await w.context.refreshWorkspaceApplyStatus();
  assert.equal(w.els.workspaceApplyBtn.disabled, true);
  await w.context.applyWorkspaceChanges();
  assert.equal(w.events.length, 0);
});

test('a successful Apply disables Apply after the server confirms no pending changes', async () => {
  const w = workspace({ pending: true });
  await w.context.applyWorkspaceChanges();
  assert.equal(w.state.runtimeSavedChangesPending, false);
  assert.equal(w.els.workspaceApplyBtn.disabled, true);
});

test('a save made during Apply stays pending when that Apply completes', async () => {
  const w = workspace({ pending: true });
  w.context.opcbridgeReload = async () => { w.events.push('apply'); }; // Newer save remains on server.
  await w.context.applyWorkspaceChanges();
  assert.equal(w.state.runtimeSavedChangesPending, true);
  assert.equal(w.els.workspaceApplyBtn.disabled, false);
  assert.match(w.messages.at(-1), /Newer saved changes/);
});
