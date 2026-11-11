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
  vm.runInContext(source.slice(start, source.indexOf('const refreshObjectTree =', start)), ctx);
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
  vm.runInContext(source.slice(start, source.indexOf('const refreshObjectTree =', start)), ctx);
  vm.runInContext('selectObjectTreeEntry([0])', ctx);
  assert.match(message, /unlock layer Locked/);
});

test('Fit uses the available workspace and retains scrollable manual zoom', () => {
  const properties = {};
  const ctx = vm.createContext({ screen: { style: {} }, screenWrapper: { clientWidth: 800, clientHeight: 600 },
    getScreenSize: () => ({ width: 1920, height: 1080 }), hmiSvg: { setAttribute() {} },
    document: { documentElement: { style: { setProperty: (key,value) => { properties[key] = value; } } } },
    isEditMode: true, editorFitToWorkspace: true, editorScreenZoom: 1, updateEditorZoomUi() {} });
  const start = source.indexOf('const applyScale =');
  vm.runInContext(source.slice(start, source.indexOf('const stripJsonComments =', start)), ctx);
  vm.runInContext('applyScale()', ctx);
  assert.ok(parseInt(ctx.screen.style.width) <= 800);
  assert.ok(parseInt(ctx.screen.style.height) <= 600);
  ctx.screenWrapper.clientWidth = 500;
  vm.runInContext('applyScale()', ctx);
  assert.ok(parseInt(ctx.screen.style.width) <= 500);
  ctx.editorFitToWorkspace = false; ctx.editorScreenZoom = 1;
  vm.runInContext('applyScale()', ctx);
  assert.equal(ctx.screen.style.width, '1920px');
});

test('docking publishes the actual reserved width; floating keeps separate coordinates', () => {
  const values = {};
  const ctx = vm.createContext({ editorPane: { dataset: {}, style: {} }, document: { body: { dataset: {} }, documentElement: { style: { setProperty: (key,value) => { values[key] = value; } } } },
    getComputedStyle: () => ({ getPropertyValue: key => ({ '--toolbar-height': '48px', '--left-toolbar-width': '38px', '--editor-pane-width': '320px' })[key] || '' }),
    window: { innerWidth: 1200, innerHeight: 900 }, clamp: (value,min,max) => Math.max(min,Math.min(value,max)) });
  const start = source.indexOf('const applyEditorPaneState =');
  vm.runInContext(source.slice(start, source.indexOf('const setEditorPaneDock =', start)), ctx);
  vm.runInContext('applyEditorPaneState({dock:"left",w:320})', ctx);
  assert.equal(ctx.document.body.dataset.editorDock, 'left');
  assert.equal(values['--editor-dock-space'], '340px');
  assert.equal(ctx.editorPane.style.width, '320px');
  vm.runInContext('applyEditorPaneState({dock:"right",w:400})', ctx);
  assert.equal(values['--editor-dock-space'], '420px');
  vm.runInContext('applyEditorPaneState({dock:"float",w:400,h:600,x:100,y:100})', ctx);
  assert.equal(ctx.document.body.dataset.editorDock, 'float');
  assert.equal(ctx.editorPane.style.left, '100px');
});

test('tree renders compact expandable rows and keeps selection distinct from opening Properties', () => {
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
