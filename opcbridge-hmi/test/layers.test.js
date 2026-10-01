const test = require('node:test');
const assert = require('node:assert/strict');
const layers = require('../public/js/layers');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('legacy screens acquire one ordinary layer without moving objects', () => {
  const screen = { objects: [{ id: 'a', x: 10 }, { id: 'b', x: 20 }] };
  const [layer] = layers.ensure(screen);
  assert.equal(layer.name, 'Default');
  assert.ok(screen.objects.every(obj => obj.layerId === layer.id));
  layers.rename(screen, layer.id, 'Equipment');
  layers.ensure(screen);
  assert.equal(screen.layers[0].name, 'Equipment');
  assert.deepEqual(screen.objects.map(obj => obj.x), [10, 20]);
});

test('layer order overrides names, retains object identity and within-layer order', () => {
  const screen = {
    layers: [{ id: 'z', name: 'Z' }, { id: 'a', name: 'A' }],
    objects: [{ id: 1, layerId: 'a' }, { id: 2, layerId: 'z' }, { id: 3, layerId: 'z' }]
  };
  assert.deepEqual(layers.entries(screen).map(entry => entry.index), [1, 2, 0]);
  layers.reorder(screen, 'z', 1);
  assert.deepEqual(layers.entries(screen).map(entry => entry.index), [0, 1, 2]);
  assert.equal(screen.objects[1].layerId, 'z');
  assert.deepEqual(layers.entries(JSON.parse(JSON.stringify(screen))).map(entry => entry.index), [0, 1, 2]);
});

test('new objects use active layer, existing assignments remain; delete moves or removes', () => {
  const screen = { layers: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], objects: [{ layerId: 'a' }, {}] };
  layers.ensure(screen, 'b');
  assert.deepEqual(screen.objects.map(obj => obj.layerId), ['a', 'b']);
  assert.throws(() => layers.rename(screen, 'b', 'a'));
  assert.throws(() => layers.remove(screen, 'a', 'a'));
  layers.remove(screen, 'a', 'b');
  assert.deepEqual(screen.objects.map(obj => obj.layerId), ['b', 'b']);
  assert.throws(() => layers.remove(screen, 'b'));
  screen.layers.push({ id: 'c', name: 'C' });
  layers.remove(screen, 'b');
  assert.equal(screen.objects.length, 0);
  assert.equal(screen.layers[0].id, 'c');
});

test('editor hide and lock do not remove runtime drawing entries', () => {
  const screen = { layers: [{ id: 'a', name: 'A', editorVisible: false, locked: true }], objects: [{ layerId: 'a' }] };
  assert.equal(layers.entries(screen).length, 1);
});

test('editor selection respects active layer, group ownership, hide and lock', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
  const screen = { layers: [{ id: 'a' }, { id: 'b' }], objects: [] };
  const ctx = vm.createContext({ currentScreenObj: screen, activeLayerId: 'a', isEditMode: true, groupEditStack: [] });
  for (const name of ['activeLayerEditable', 'objectOnEditableLayer']) {
    const start = source.indexOf('const ' + name + ' =');
    vm.runInContext(source.slice(start, source.indexOf('\n};', start)+3), ctx);
  }
  assert.equal(vm.runInContext('objectOnEditableLayer({layerId:"a"})', ctx), true);
  assert.equal(vm.runInContext('objectOnEditableLayer({layerId:"b"})', ctx), false);
  ctx.groupEditStack.push({ layerId: 'a' });
  assert.equal(vm.runInContext('objectOnEditableLayer({})', ctx), true);
  screen.layers[0].locked = true;
  assert.equal(vm.runInContext('objectOnEditableLayer({})', ctx), false);
  screen.layers[0].locked = false;
  screen.layers[0].editorVisible = false;
  assert.equal(vm.runInContext('objectOnEditableLayer({})', ctx), false);
  ctx.isEditMode = false;
  assert.equal(vm.runInContext('objectOnEditableLayer({})', ctx), true);
});
