const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const loader = source.slice(source.indexOf('function setWorkspaceLoading('), source.indexOf('async function saveWorkspaceAll('));

function harness() {
  const elements = Object.fromEntries(['tab-workspace', 'workspaceLoadingOverlay', 'workspaceLoadingMessage', 'workspaceLoadingSpinner', 'workspaceLoadingRetryBtn'].map(id => [id, {
    hidden: true, setAttribute() {}, addEventListener(type, fn) { this[type] = fn; }
  }]));
  const content = { inert: false };
  elements['tab-workspace'].children = [elements.workspaceLoadingOverlay, content];
  const calls = { tags: 0, connections: 0, renders: 0 };
  let dirty = false;
  let fail = false;
  let details = Promise.resolve({});
  const state = { connFiles: [{ path: 'test.json' }], connObjCache: new Map(), workspaceConfigLoaded: false };
  const context = vm.createContext({
    state, window: { setTimeout }, document: { getElementById: id => elements[id] },
    els: { statusLine: {} }, workspaceIsDirty: () => dirty,
    loadConnectionsList: async () => { calls.connections++; },
    loadTagsConfig: async () => { calls.tags++; if (fail) throw new Error('Tags unavailable'); },
    getConnObjForPath: () => details,
    renderWorkspaceTree: () => { calls.renders++; }, renderLiveTags() {},
    isPanelActive: () => true, refreshVisible: async () => {}, setWorkspaceSaveStatus() {}
  });
  vm.runInContext(loader, context);
  return { context, elements, content, calls, state,
    setDirty: value => { dirty = value; }, setFailure: value => { fail = value; },
    setDetails: value => { details = value; } };
}

test('returning to Workspace reuses configuration; explicit refresh reloads it', async () => {
  const h = harness();
  await h.context.refreshWorkspaceTab();
  await h.context.refreshWorkspaceTab();
  assert.equal(h.calls.tags, 1);
  assert.equal(h.calls.connections, 1);
  h.state.connObjCache.set('old', {});
  await h.context.refreshWorkspaceConfigViews();
  assert.equal(h.calls.tags, 2);
  assert.equal(h.state.connObjCache.size, 0);
});

test('overlapping loads share work and keep the overlay until details are ready', async () => {
  const h = harness();
  let finish;
  h.setDetails(new Promise(resolve => { finish = resolve; }));
  const first = h.context.refreshWorkspaceTab();
  const second = h.context.refreshWorkspaceTab();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(h.calls.tags, 1);
  assert.equal(h.elements.workspaceLoadingOverlay.hidden, false);
  assert.equal(h.content.inert, true);
  assert.equal(h.state.workspaceConfigLoaded, false);
  finish({});
  await Promise.all([first, second]);
  assert.equal(h.elements.workspaceLoadingOverlay.hidden, true);
  assert.equal(h.content.inert, false);
  assert.equal(h.state.workspaceConfigLoaded, true);
});

test('failed loading exposes retry and a successful retry clears the error', async () => {
  const h = harness();
  h.setFailure(true);
  await h.context.refreshWorkspaceTab();
  assert.equal(h.state.workspaceConfigLoaded, false);
  assert.equal(h.elements.workspaceLoadingRetryBtn.hidden, false);
  assert.match(h.elements.workspaceLoadingMessage.textContent, /Tags unavailable/);
  h.setFailure(false);
  h.elements.workspaceLoadingRetryBtn.click();
  await h.state.workspaceLoadPromise;
  assert.equal(h.state.workspaceConfigLoaded, true);
  assert.equal(h.elements.workspaceLoadingOverlay.hidden, true);
});

test('tab entry and explicit refresh preserve unsaved configuration', async () => {
  const h = harness();
  h.setDirty(true);
  await h.context.refreshWorkspaceTab();
  await h.context.refreshWorkspaceConfigViews();
  assert.equal(h.calls.tags, 0);
  assert.equal(h.calls.connections, 0);
});
