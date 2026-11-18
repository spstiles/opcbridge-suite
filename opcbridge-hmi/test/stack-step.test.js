const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../public/js/hmi.js`, 'utf8');

function fixture(ids, selected, grouped = false) {
  let objects = ids.map(value => typeof value === 'string' ? { id: value } : value);
  const before = JSON.stringify(objects);
  let history = 0, dirty = 0, renders = 0;
  const ctx = vm.createContext({
    selectedIndices: selected, groupEditStack: grouped ? [{}] : [], isEditMode: true, canEdit: () => true,
    getActiveObjects: () => objects, setActiveObjects: next => { objects = next; },
    recordHistory: () => { assert.equal(JSON.stringify(objects), before); history++; },
    setDirty: () => dirty++, renderScreen: () => renders++,
    syncEditorFromScreen() {}, updateSelectionOverlays() {}, updatePropertiesPanel() {}
  });
  const start = source.indexOf('const getSelectionStackStep =');
  vm.runInContext(source.slice(start, source.indexOf('const updateMenuState =', start)), ctx);
  return {
    ctx, run: code => vm.runInContext(code, ctx),
    ids: () => Array.from(objects, object => object.id),
    selected: () => Array.from(ctx.selectedIndices, index => objects[index].id),
    counts: () => ({ history, dirty, renders })
  };
}

test('single objects move one stack position in either direction and stay selected', () => {
  for (const [direction, expected] of [[1, ['A', 'C', 'B', 'D']], [-1, ['B', 'A', 'C', 'D']]]) {
    const f = fixture(['A', 'B', 'C', 'D'], [1]);
    f.run(`moveSelectionOneStep(${direction})`);
    assert.deepEqual(f.ids(), expected);
    assert.deepEqual(f.selected(), ['B']);
    assert.deepEqual(f.counts(), { history: 1, dirty: 1, renders: 1 });
  }
});

test('adjacent and separate selections preserve relative order', () => {
  for (const [selection, direction, expected] of [
    [[0, 1], 1, ['C', 'A', 'B', 'D']],
    [[2, 3], -1, ['A', 'C', 'D', 'B']],
    [[0, 2], 1, ['B', 'A', 'D', 'C']],
    [[1, 3], -1, ['B', 'A', 'D', 'C']],
    [[0, 3], 1, ['B', 'A', 'C', 'D']]
  ]) {
    const f = fixture(['A', 'B', 'C', 'D'], selection);
    const selected = f.selected();
    f.run(`moveSelectionOneStep(${direction})`);
    assert.deepEqual(f.ids(), expected);
    assert.deepEqual(f.selected(), selected);
  }
});

test('front/back limits and an empty selection do not create undo or dirty entries', () => {
  for (const [selection, direction] of [[[2], 1], [[0], -1], [[0, 1, 2], 1], [[], -1]]) {
    const f = fixture(['A', 'B', 'C'], selection);
    assert.equal(f.run(`getSelectionStackStep(${direction}).swaps.length`), 0);
    f.run(`moveSelectionOneStep(${direction})`);
    assert.deepEqual(f.ids(), ['A', 'B', 'C']);
    assert.deepEqual(f.counts(), { history: 0, dirty: 0, renders: 0 });
  }
});

test('screen stacking steps over other layers without moving objects between layers', () => {
  const f = fixture([{ id: 'A', layerId: 'one' }, { id: 'X', layerId: 'two' }, { id: 'B', layerId: 'one' }], [0]);
  f.run('moveSelectionOneStep(1)');
  assert.deepEqual(f.ids(), ['B', 'X', 'A']);
  assert.deepEqual(f.selected(), ['A']);
  assert.equal(f.run('getSelectionStackStep(1).swaps.length'), 0);
});

test('group children use their own stack rather than imported layer metadata', () => {
  const f = fixture([{ id: 'A', layerId: 'one' }, { id: 'B', layerId: 'two' }], [0], true);
  f.run('moveSelectionOneStep(1)');
  assert.deepEqual(f.ids(), ['B', 'A']);
});

test('stack commands do not modify runtime screens or bypass editing permission', () => {
  const f = fixture(['A', 'B'], [0]);
  f.ctx.isEditMode = false;
  f.run('moveSelectionOneStep(1)');
  f.ctx.isEditMode = true;
  f.ctx.canEdit = () => false;
  f.run('moveSelectionOneStep(1)');
  assert.deepEqual(f.ids(), ['A', 'B']);
  assert.deepEqual(f.counts(), { history: 0, dirty: 0, renders: 0 });
});
