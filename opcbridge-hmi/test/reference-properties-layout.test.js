const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function element() {
  return { children: [], classList: { toggle() {} }, attributes: {},
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    setAttribute(key, value) { this.attributes[key] = value; },
    set textContent(value) { this.children = []; this.text = value; },
    get textContent() { return this.text; } };
}
test('large reference lists are collapsed and contained without dropping issues', () => {
  const container = element();
  const ctx = vm.createContext({ selectedReferenceHealthProps: container,
    document: { createElement: element },
    getReferenceHealthIssues: () => Array.from({ length: 100 }, (_, index) => ({ objectImportId: 'group', category: 'tag', source: `Tag ${index}` })),
    getReferenceHealthIssueDisplay: issue => ({ source: issue.source }) });
  const start = source.indexOf('const renderSelectedReferenceProperties =');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  vm.runInContext('renderSelectedReferenceProperties({id:"group"})', ctx);
  const details = container.children[0];
  assert.equal(details.open, false);
  assert.equal(details.children[0].textContent, 'References Needing Attention (100)');
  const list = details.children[1];
  assert.equal(list.className, 'reference-property-list');
  assert.equal(list.children.length, 101);
  assert.equal(list.tabIndex, 0);
  ctx.getReferenceHealthIssues = () => [{ objectImportId: 'group', category: 'tag', source: 'One' }];
  vm.runInContext('renderSelectedReferenceProperties({id:"group"})', ctx);
  assert.equal(container.children[0].open, true);
});

test('group properties include nested references and select their owning object', () => {
  const container = element();
  const first = { importId: 'gwx_60', type: 'group', children: [] };
  const second = { importId: 'gwx_74', type: 'text' };
  const group = { importId: 'gwx_65', type: 'group', children: [first, { type: 'group', children: [second] }] };
  const issues = [first, second].map(owner => ({ objectImportId: owner.importId,
    category: 'screen', automation: 'action', source: '30-Bar Screen Buttons' }));
  let selected;
  const ctx = vm.createContext({ selectedReferenceHealthProps: container,
    document: { createElement: () => ({ ...element(), addEventListener(event, handler) { this[event] = handler; } }) },
    getReferenceHealthIssues: () => issues,
    getReferenceHealthIssueDisplay: issue => ({ source: issue.source }),
    selectReferenceIssueObject: issue => { selected = issue; }, group });
  const start = source.indexOf('const renderSelectedReferenceProperties =');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  vm.runInContext('renderSelectedReferenceProperties(group)', ctx);
  const details = container.children[0];
  assert.equal(details.children[0].textContent, 'References Needing Attention (2)');
  const rows = details.children[1].children;
  assert.equal(rows[0].children[0].textContent, 'gwx_60: action');
  assert.equal(rows[1].children[0].textContent, 'gwx_74: action');
  rows[1].children[2].click();
  assert.equal(selected, issues[1]);
  vm.runInContext('renderSelectedReferenceProperties(group.children[0])', ctx);
  assert.equal(container.children[0].children[0].textContent, 'References Needing Attention (1)');
});

test('health navigation opens Properties for the nested owner before refreshing fields', () => {
  const child = { importId: 'gwx_60', type: 'group', children: [] };
  const parent = { importId: 'gwx_65', type: 'group', children: [child] };
  const calls = [];
  const ctx = vm.createContext({ currentScreenObj: { objects: [parent] }, isEditMode: true,
    groupEditStack: [], selectedIndices: [], ensureScreenLayers: () => [],
    collectScreenReferenceMappings: () => [], clickActionSelection: new WeakMap(),
    clearSelectedPolygonVertex() {}, renderScreen() {}, updateSelectionOverlays() {},
    setEditorTab: tab => calls.push(tab), updatePropertiesPanel: () => calls.push('refresh'),
    updateGroupBreadcrumb() {}, closeReferenceHealth() {}, requestAnimationFrame() {},
    issue: { objectImportId: 'gwx_60', category: 'screen', automation: 'action' } });
  const start = source.indexOf('const selectReferenceIssueObject =');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  vm.runInContext('selectReferenceIssueObject(issue)', ctx);
  assert.deepEqual(calls, ['properties', 'refresh']);
  assert.equal(ctx.groupEditStack[0], parent);
  assert.equal(ctx.selectedIndices[0], 0);
  assert.equal(ctx.currentObjectDynamicTab, 'click');
});
