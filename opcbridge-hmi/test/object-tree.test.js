const test = require('node:test');
const assert = require('node:assert/strict');
const tree = require('../public/js/object-tree');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const nested = () => [{ type: 'group', name: 'Pump', children: [{ type: 'ellipse', name: 'Running',
  visibility: { rules: [{ tag: '{alias:Running}' }, { tag: 'PLC.Hidden' }] },
  action: { type: 'sequence', actions: [{ type: 'set-write', tag: '{alias:Start}' }, { type: 'popup', screenId: 'Pump Detail' }] } }] }];

test('object tree searches nested tags and linked screens without changing screen data', () => {
  const objects = nested(); const before = JSON.stringify(objects);
  const result = tree.model(objects, 'Pump Detail');
  assert.equal(result[0].label, 'Pump');
  assert.deepEqual(result[0].children[0].path, [0, 0]);
  const entries = result[0].children[0].automations;
  assert.ok(entries.some(entry => entry.tab === 'visibility-1'));
  assert.ok(entries.some(entry => entry.tab === 'click' && entry.actionIndex === 1));
  assert.equal(tree.model(objects, '{alias:Running}').length, 1);
  assert.equal(tree.model(objects, 'Not found').length, 0);
  assert.equal(JSON.stringify(objects), before);
  assert.deepEqual(tree.findPath(objects, objects[0].children[0]), [0, 0]);
});

test('nested tree selection opens its automation and leaves screen data untouched', () => {
  const objects = nested(); const root = { objects }; const before = JSON.stringify(root);
  const calls = [];
  const ctx = vm.createContext({ currentScreenObj: root, groupEditStack: [], selectedIndices: [],
    ensureScreenLayers: () => [], blurActiveFormControl() {}, clickActionSelection: new WeakMap(),
    clearSelectedPolygonVertex() {}, renderScreen() {}, updateSelectionOverlays() {}, updatePropertiesPanel() {}, updateGroupBreadcrumb() {},
    setEditorTab: tab => calls.push(tab), requestAnimationFrame() {} });
  vm.runInContext('let objectTreeSelectionActive = false;', ctx);
  const start = source.indexOf('const selectObjectTreeEntry =');
  vm.runInContext(source.slice(start, source.indexOf('const refreshObjectExplorer =', start)), ctx);
  vm.runInContext('selectObjectTreeEntry([0,0], {tab:"click", actionIndex:1})', ctx);
  assert.equal(ctx.groupEditStack[0], objects[0]);
  assert.deepEqual(Array.from(ctx.selectedIndices), [0]);
  assert.equal(ctx.currentObjectDynamicTab, 'click');
  assert.equal(ctx.clickActionSelection.get(objects[0].children[0]), 1);
  assert.deepEqual(calls, ['properties']);
  assert.equal(JSON.stringify(root), before);
});

test('tree selection respects locked layers', () => {
  const obj = { type: 'ellipse', layerId: 'locked' }; let message;
  const ctx = vm.createContext({ currentScreenObj: { objects: [obj] },
    ensureScreenLayers: () => [{ id: 'locked', name: 'Locked', locked: true }], showHmiToast: text => { message = text; } });
  const start = source.indexOf('const selectObjectTreeEntry =');
  vm.runInContext(source.slice(start, source.indexOf('const refreshObjectExplorer =', start)), ctx);
  vm.runInContext('selectObjectTreeEntry([0])', ctx);
  assert.match(message, /unlock layer Locked/);
});

test('separate explorer renders expandable rows and selects objects without replacing its window', () => {
  const doc = { createElement(tag) {
    const node = { tag, ownerDocument: doc, children: [], attributes: {}, className: '',
      setAttribute(key,value) { this.attributes[key] = value; },
      appendChild(child) { this.children.push(child); }, append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; }, addEventListener(event,handler) { this[event] = handler; },
      querySelectorAll(selector) {
        const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
        return selector === '[aria-selected]' ? all.filter(child => 'aria-selected' in child.attributes)
          : selector === '.object-tree-row' ? all.filter(child => child.className.includes('object-tree-row')) : all;
      } };
    node.classList = { toggle(name,on) { const set = new Set(node.className.split(' ')); if (on) set.add(name); else set.delete(name); node.className = [...set].join(' '); } };
    return node;
  } };
  const container = doc.createElement('div'); const expanded = new Set(); const calls = [];
  tree.render({ container, objects: nested(), selectedPath: [0,0], expanded, onSelect: (...args) => { calls.push(args); } });
  assert.ok(expanded.has('0'), 'selected object ancestors expand automatically');
  const buttons = container.querySelectorAll('*').filter(node => node.tag === 'button');
  const object = buttons.find(node => node.className === 'object-tree-object' && node.textContent.startsWith('Running'));
  object.click();
  assert.deepEqual(calls[0], [[0,0]]);
  object.dblclick();
  assert.deepEqual(calls[1], [[0,0], {tab:'properties'}]);
  const automation = buttons.find(node => node.className === 'object-tree-automation' && node.textContent.startsWith('Click: popup'));
  automation.click();
  assert.equal(calls[2][1].tab, 'click'); assert.equal(calls[2][1].actionIndex, 1);
});


test('single-click explorer selection opens the existing Properties panel', () => {
  const obj = { type: 'ellipse', x: 10, y: 20 };
  const calls = [];
  const ctx = vm.createContext({ currentScreenObj: {objects:[obj]}, groupEditStack: [], selectedIndices: [],
    ensureScreenLayers: () => [], blurActiveFormControl() {}, clearSelectedPolygonVertex() {}, renderScreen() {},
    updateSelectionOverlays() {}, updatePropertiesPanel: () => calls.push('properties refreshed'), updateGroupBreadcrumb() {},
    setEditorTab: tab => calls.push(tab), requestAnimationFrame() {} });
  vm.runInContext('let objectTreeSelectionActive = false;', ctx);
  const start = source.indexOf('const selectObjectTreeEntry =');
  vm.runInContext(source.slice(start, source.indexOf('const refreshObjectExplorer =',start)),ctx);
  vm.runInContext('selectObjectTreeEntry([0])',ctx);
  assert.deepEqual(Array.from(ctx.selectedIndices),[0]);
  assert.equal(ctx.currentObjectDynamicTab,'properties');
  assert.deepEqual(calls,['properties','properties refreshed']);
});

test('Object Explorer is separate from Properties and the workspace keeps its original controls', () => {
  const html = fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  const explorer = html.indexOf('<aside id="objectExplorer"');
  const explorerEnd = html.indexOf('</aside>',explorer);
  const properties = html.indexOf('<aside id="editor-pane"');
  assert.ok(explorer >= 0 && explorerEnd < properties);
  assert.ok(html.includes('id="objectExplorerToggleBtn"'));
  assert.ok(html.includes('id="objectExplorerCloseBtn"'));
  assert.doesNotMatch(html,/editor-main-tabs|data-panel="objects"|id="editorFitBtn"|id="editorPanelToggleBtn"/);
});
