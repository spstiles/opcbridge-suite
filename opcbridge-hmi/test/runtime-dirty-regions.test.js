const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const load = (ctx, name) => {
  const start = source.indexOf(`const ${name} =`);
  vm.runInContext(source.slice(start, source.indexOf('\n};', start)+3), ctx);
};

test('visibility uses browser timing while color flash retains its clock dependency', () => {
  const ctx = vm.createContext({
    getBrowserColorFlashRate: () => null,
    normalizeWsTagKey: (connection, tag) => `${connection}:${tag}`,
    extractAutomationExpressionTagKeys: (expression, out) => out.add('plant:ExpressionTag'),
    result: new Set(),
    object: { type: 'group', children: [
      { visibility: { connection_id: '_memory', tag: 'Test bit 1', flashEnabled: true, flashRate: 'slow' } },
      { fillAutomation: { sourceType: 'expression', expression: 'test', flashEnabled: true, flashRate: 'fast' } }
    ] }
  });
  load(ctx, 'collectTagKeysFromValue');
  vm.runInContext('collectTagKeysFromValue(object, result)', ctx);
  assert.deepEqual([...ctx.result].sort(), ['_memory:Test bit 1', '_system:System/Clock/FastBlink', 'plant:ExpressionTag'].sort());
  assert.match(source, /scheduleRuntimeRender\(\[normalizeWsTagKey\(payload.connection_id, payload.name\)\]\)/);
});

test('changed tags repaint only dependent regions, once per frame', () => {
  const screen = {};
  const a = { host: { isConnected: true }, source: { id: 'a' } };
  const b = { host: { isConnected: true }, source: { id: 'b' } };
  const painted = [];
  const ctx = vm.createContext({
    currentScreenObj: screen, currentPopupScreenId: null, isEditMode: false,
    currentScreenAliasContext: {}, console,
    runtimeRenderIndex: { safe: true, screen, byTag: new Map([['c:one', new Set([a])], ['c:two', new Set([a,b])]]) },
    resolveAliasObject: o => o, getDisplayObject: o => o,
    paintRuntimeRegion: (host, obj) => painted.push(obj.id)
  });
  load(ctx, 'updateRuntimeObjects');
  ctx.keys = new Set(['c:one']);
  assert.equal(vm.runInContext('updateRuntimeObjects(keys)', ctx), true);
  assert.deepEqual(painted, ['a']);
  painted.length = 0;
  ctx.keys = new Set(['c:one', 'c:two']);
  vm.runInContext('updateRuntimeObjects(keys)', ctx);
  assert.deepEqual(painted, ['a','b']);
  painted.length = 0;
  ctx.keys = new Set(['unrelated']);
  vm.runInContext('updateRuntimeObjects(keys)', ctx);
  assert.deepEqual(painted, []);
  ctx.currentPopupScreenId = 'popup';
  assert.equal(vm.runInContext('updateRuntimeObjects(keys)', ctx), false);
  ctx.currentPopupScreenId = null;
  ctx.currentScreenObj = {};
  assert.equal(vm.runInContext('updateRuntimeObjects(keys)', ctx), false);
});

test('region painting replaces its own definitions and keeps old content on failure', () => {
  class Node {
    constructor() { this.children = []; }
    appendChild(n) { this.children.push(n); n.parent = this; }
    replaceChildren(n) { this.children = [n]; }
    remove() { this.parent.children = this.parent.children.filter(n => n !== this); }
  }
  const host = new Node();
  const ctx = vm.createContext({ runtimeObjectDefs: null,
    document: { createElementNS: () => new Node() }, host,
    renderObjectInto: (node) => node.appendChild(new Node())
  });
  load(ctx, 'paintRuntimeRegion');
  vm.runInContext('paintRuntimeRegion(host, {}); paintRuntimeRegion(host, {});', ctx);
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].children.length, 2);
  const previous = host.children[0];
  ctx.renderObjectInto = () => { throw new Error('failed'); };
  assert.throws(() => vm.runInContext('paintRuntimeRegion(host, {})', ctx));
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0], previous);
  assert.equal(ctx.runtimeObjectDefs, null);
});


test('a hidden layer source triggers rebuilding while unrelated tags remain incremental', () => {
  const screen = {};
  const painted = [];
  const ctx = vm.createContext({currentScreenObj:screen,currentPopupScreenId:null,isEditMode:false,
    runtimeRenderIndex:{screen,safe:true,byTag:new Map(),layerTagKeys:new Set(['test:Visible'])},
    paintRuntimeRegion:obj=>painted.push(obj),currentScreenAliasContext:{},console});
  load(ctx,'updateRuntimeObjects');
  assert.equal(vm.runInContext('updateRuntimeObjects(["test:Visible"])',ctx),false);
  assert.equal(vm.runInContext('updateRuntimeObjects(["test:Other"])',ctx),true);
  assert.deepEqual(painted,[]);
});
