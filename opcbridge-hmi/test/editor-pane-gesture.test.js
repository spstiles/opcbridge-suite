const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const gesture = source.slice(source.indexOf('const isEditingGestureActive ='), source.indexOf('// Read state after canvas/tool handlers'));
const flags = [...new Set(gesture.match(/\bis(?:Drawing\w+|Dragging|DragPending|Rotating|Resizing|Selecting)\b/g))];
flags.push('arcEndpointDrag');

test('floating panel gesture state follows every canvas gesture and runtime mode', () => {
  let active;
  const context = { isEditMode: true, editorPane: { classList: { toggle(name, value) {
    assert.equal(name, 'canvas-gesture-active');
    active = value;
  } } } };
  flags.forEach(flag => { context[flag] = false; });
  vm.createContext(context);
  vm.runInContext(gesture, context);
  const sync = () => vm.runInContext('syncEditorPaneCanvasGesture()', context);
  sync();
  assert.equal(active, false);
  for (const flag of flags) {
    context[flag] = true;
    sync();
    assert.equal(active, true, flag);
    // Multi-click drawing stays active without a held mouse button.
    sync();
    assert.equal(active, true);
    context.isEditMode = false;
    sync();
    assert.equal(active, false);
    context.isEditMode = true;
    context[flag] = false;
    sync();
    assert.equal(active, false);
  }
});

test('pass-through CSS is restricted to floating panels and covers descendants', () => {
  const css = fs.readFileSync(path.join(__dirname, '../public/css/main.css'), 'utf8');
  assert.match(css, /\.editor-pane\[data-dock="float"\]\.canvas-gesture-active \*\s*\{\s*pointer-events: none !important;/);
});
