const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/hmi.js'), 'utf8');
const start = source.indexOf('const previewEditorDrag =');
const helper = source.slice(start, source.indexOf('\n};', start) + 3);
test('drag preview moves existing nodes with snapped positions and preserves rotation', () => {
  let transform, overlays = 0;
  const origin = { index: 0, mode: 'xy', x: 100, y: 200, previewTransform: 'rotate(45)',
    previewElement: { isConnected: true, setAttribute: (key, value) => { transform = value; } } };
  const ctx = vm.createContext({ groupEditStack: [], getActiveObjects: () => [{ x: 125, y: 190 }],
    updateSelectionOverlays: () => overlays++, origins: [origin] });
  vm.runInContext(helper, ctx);
  assert.equal(vm.runInContext('previewEditorDrag(origins)', ctx), true);
  assert.equal(transform, 'translate(25 -10) rotate(45)');
  assert.equal(overlays, 1);
  origin.previewElement.isConnected = false;
  assert.equal(vm.runInContext('previewEditorDrag(origins)', ctx), false);
});
test('nested groups and nontranslation shapes use the existing renderer', () => {
  const ctx = vm.createContext({ groupEditStack: [{}], origins: [{ mode: 'xy' }] });
  vm.runInContext(helper, ctx);
  assert.equal(vm.runInContext('previewEditorDrag(origins)', ctx), false);
  ctx.groupEditStack = [];
  ctx.origins = [{ mode: 'points' }];
  assert.equal(vm.runInContext('previewEditorDrag(origins)', ctx), false);
});

test('repeated arrow nudges update the model and SVG without a full-screen redraw', () => {
  const objects = Array.from({ length: 2000 }, () => ({ type: 'rect', x: 100, y: 200 }));
  let transform = 'rotate(15)', handler, renders = 0, histories = 0, refreshes = 0;
  const element = { isConnected: true, getAttribute: () => transform,
    setAttribute: (name, value) => { transform = value; } };
  const context = vm.createContext({
    window: { addEventListener: (event, fn) => { handler = fn; } },
    document: { activeElement: null }, isEditMode: true, selectedIndices: [0],
    selectedPolygonVertex: null, groupEditStack: [],
    renderedElementMeta: [{ index: 0, el: element }],
    getActiveObjects: () => objects, syncSelectedPolygonVertex: () => {},
    recordHistory: () => histories++, snapValue: value => value,
    updateSelectionOverlays: () => {}, renderScreen: () => renders++,
    syncEditorFromScreen: () => {}, updatePropertiesPanel: () => {}, setDirty: () => {}
  });
  vm.runInContext(helper, context);
  const captureStart = source.indexOf('const captureNudgePreviewOrigins =');
  vm.runInContext(source.slice(captureStart, source.indexOf('\n});', captureStart) + 4), context);
  context.scheduleNudgePropertiesRefresh = () => refreshes++;
  const handlerStart = source.indexOf('\twindow.addEventListener("keydown", (evt) => {\n\t  if (!isEditMode) return;\n\t  if (!["ArrowUp"');
  vm.runInContext(source.slice(handlerStart, source.indexOf('\nconst bindEnterToApply', handlerStart)), context);
  handler({ key: 'ArrowRight', preventDefault() {} });
  handler({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(objects[0].x, 102);
  assert.equal(objects[1].x, 100);
  assert.equal(renders, 0);
  assert.equal(histories, 2);
  assert.equal(refreshes, 2);
  assert.equal(transform, 'translate(1 0) translate(1 0) rotate(15)');
});
