const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sync = require('../public/js/screen-save-sync');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

test('screen save notifications cross tabs once and focus catches missed saves', async () => {
  const stored = new Map(); const tabs = [];
  function tab() {
    const listeners = {}; const received = [];
    const host = { console, addEventListener: (type, fn) => { listeners[type] = fn; },
      localStorage: { get length() { return stored.size; }, key: index => [...stored.keys()][index], getItem: key => stored.get(key),
        setItem(key, value) { stored.set(key, value); tabs.filter(t => t.host !== host).forEach(t => t.listeners.storage?.({ key, newValue: value })); } } };
    const service = sync.create({ host, onSaved: notice => received.push(notice) });
    const result = { host, listeners, received, service }; tabs.push(result); return result;
  }
  const target = tab(); const caller = tab();
  assert.equal(caller.received.length, 0, 'unsaved edits emit nothing');
  target.service.notify({ ref: 'Detail', path: 'Detail.screen' }); await tick();
  assert.equal(caller.received.length, 1);
  assert.equal(target.received.length, 0);
  caller.listeners.focus(); await tick();
  assert.equal(caller.received.length, 1, 'focus does not duplicate a delivered save');
  const later = tab(); later.listeners.focus(); await tick();
  assert.equal(later.received[0].ref, 'Detail');
});

function editor({ focused = false, before = [{ name: 'Old', type: 'text' }], after = [{ name: 'Old', type: 'text' }, { name: 'New', type: 'tag' }] } = {}) {
  const obj = { type: 'button', action: { type: 'popup', screenId: 'Detail', aliases: { Old: { value: 'Unsaved mapping' } } } };
  const root = { objects: [obj], unsaved: true };
  let pendingFocus = focused;
  const calls = [];
  const ctx = vm.createContext({ currentScreenId: 'Caller', currentScreenPath: 'Caller.screen', currentScreenObj: root,
    isEditMode: true, isDirty: true, screenCache: new Map([['Detail', { aliases: before }]]), screenAliasDefinitionPromises: new Map(),
    document: { activeElement: {} }, buttonTargetAliases: { contains: () => pendingFocus }, groupTargetAliases: { contains: () => false },
    getAutomationObject: () => obj, getEditedClickAction: owner => owner?.action || {}, usesFullClickEditor: () => true,
    getEffectiveScreenAliases: screen => screen?.aliases || [], getScreenForAliases: async () => ({ aliases: after }),
    renderTargetAliasEditor: async (...args) => calls.push(args), showHmiToast: text => calls.push(text) });
  vm.runInContext(source.slice(source.indexOf('const savedAliasScreenRevisions ='), source.indexOf('const screenSaveSync =')), ctx);
  return { ctx, obj, root, calls, blur: () => { pendingFocus = false; } };
}

test('saved target definitions refresh only alias fields and preserve unsaved calling edits', async () => {
  const fixture = editor();
  const action = fixture.obj.action;
  await vm.runInContext('handleSavedScreenAliases({ref:"Detail",path:"Detail.screen",revision:"one"})', fixture.ctx);
  assert.equal(fixture.calls[0][0], 'button');
  assert.equal(fixture.calls[0][1], 'Detail');
  assert.equal(fixture.calls[0][2], action);
  assert.equal(fixture.ctx.currentScreenObj, fixture.root);
  assert.equal(fixture.ctx.isDirty, true);
  assert.equal(fixture.obj.action.aliases.Old.value, 'Unsaved mapping');
  assert.equal(fixture.obj.action.aliases.New, undefined, 'new aliases stay unassigned until user input');
});

test('refresh waits for a focused alias field to commit and then uses its latest mapping', async () => {
  const fixture = editor({ focused: true });
  await vm.runInContext('handleSavedScreenAliases({ref:"Detail",path:"Detail.screen",revision:"one"})', fixture.ctx);
  assert.equal(fixture.calls.length, 0);
  fixture.obj.action.aliases.Old.value = 'Just typed'; fixture.blur();
  await vm.runInContext('refreshSavedTargetAliasEditor()', fixture.ctx);
  assert.equal(fixture.calls[0][2].aliases.Old.value, 'Just typed');
});

test('removed aliases and changed types are marked for review without deleting mappings', async () => {
  const fixture = editor({ before: [{name:'Old',type:'text'}, {name:'Changed',type:'text'}], after: [{name:'Changed',type:'tag'}] });
  await vm.runInContext('handleSavedScreenAliases({ref:"Detail",path:"Detail.screen",revision:"one"})', fixture.ctx);
  const changes = vm.runInContext('savedAliasDefinitionChanges.get("Detail")', fixture.ctx);
  assert.deepEqual(Array.from(changes.removed), ['Old']);
  assert.deepEqual(Array.from(changes.changed), ['Changed']);
  assert.equal(fixture.obj.action.aliases.Old.value, 'Unsaved mapping');
});

test('own-screen and unrelated saves do not reload the current properties', async () => {
  const fixture = editor();
  await vm.runInContext('handleSavedScreenAliases({ref:"Caller",path:"Caller.screen",revision:"one"})', fixture.ctx);
  await vm.runInContext('handleSavedScreenAliases({ref:"Other",path:"Other.screen",revision:"two"})', fixture.ctx);
  assert.equal(fixture.calls.length, 0);
});

test('screen save helper announces only after a successful server save', async () => {
  for (const ok of [true, false]) {
    const notifications = [];
    const ctx = vm.createContext({ fetch: async () => ({ ok, status: 500, json: async () => ({ ref: 'Detail', path: 'Detail.screen' }) }),
      invalidateSystemReferenceHealth() {}, screenSaveSync: { notify: notice => notifications.push(notice) } });
    const start = source.indexOf('const saveScreenToPath =');
    vm.runInContext(source.slice(start, source.indexOf('const getCurrentScreenRawForSave =', start)), ctx);
    const result = vm.runInContext('saveScreenToPath("Detail.screen", "{}")', ctx);
    if (ok) { await result; assert.equal(notifications[0].ref, 'Detail'); }
    else { await assert.rejects(result, /HTTP 500/); assert.equal(notifications.length, 0); }
  }
});

test('fresh alias definitions bypass cached screen content without replacing the runtime screen', async () => {
  const old = { aliases: [{name:'Old',type:'text'}], objects: [] };
  const latest = { aliases: [{name:'New',type:'tag'}], objects: [] };
  let requests = 0;
  const ctx = vm.createContext({ savedAliasScreenRevisions: new Map([['Detail','one']]), savedAliasScreenCache: new Map(),
    screenAliasDefinitionPromises: new Map(), screenCache: new Map([['Detail', old]]), availableScreens: [{ref:'Detail',path:'Detail.screen'}],
    fetch: async (url, options) => { requests++; assert.equal(options.cache, 'no-store'); return {ok:true,json:async()=>({parsed:latest,ref:'Detail'})}; },
    repairDuplicateImportIds() {}, repairScreenTagConnections() {} });
  const start = source.indexOf('const getScreenForAliases =');
  vm.runInContext(source.slice(start, source.indexOf('let nextNumberInputId', start)), ctx);
  assert.equal(await vm.runInContext('getScreenForAliases("Detail")', ctx), latest);
  assert.equal(await vm.runInContext('getScreenForAliases("Detail")', ctx), latest);
  assert.equal(requests, 1);
  assert.equal(ctx.screenCache.get('Detail'), old);
});

test('a save arriving during a definition fetch cannot restore stale definitions', async () => {
  let resolveOld;
  const latest = { aliases: [{name:'New',type:'tag'}] };
  let requests = 0;
  const ctx = vm.createContext({ savedAliasScreenRevisions: new Map([['Detail','one']]), savedAliasScreenCache: new Map(),
    screenAliasDefinitionPromises: new Map(), screenCache: new Map(), availableScreens: [],
    fetch: () => ++requests === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ok:true,json:async()=>({parsed:latest})}),
    repairDuplicateImportIds() {}, repairScreenTagConnections() {} });
  const start = source.indexOf('const getScreenForAliases =');
  vm.runInContext(source.slice(start, source.indexOf('let nextNumberInputId', start)), ctx);
  const first = vm.runInContext('getScreenForAliases("Detail")', ctx);
  ctx.savedAliasScreenRevisions.set('Detail','two'); ctx.screenAliasDefinitionPromises.delete('Detail');
  assert.equal(await vm.runInContext('getScreenForAliases("Detail")', ctx), latest);
  resolveOld({ok:true,json:async()=>({parsed:{aliases:[{name:'Stale'}]}})});
  assert.equal(await first, latest);
  assert.equal(ctx.savedAliasScreenCache.get('Detail').screen, latest);
});
