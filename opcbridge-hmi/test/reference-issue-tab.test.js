const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function navigate(issue, occurrences = []) {
  const obj = { importId: 'target', type: 'ellipse' };
  const ctx = vm.createContext({ currentScreenObj: { objects: [obj] }, isEditMode: true,
    selectedIndices: [], groupEditStack: [], clickActionSelection: new WeakMap(),
    collectScreenReferenceMappings: () => [{ occurrences }], referenceAutomationMatches: (a, b) => a === b,
    getColorDynamicTabKey: index => `color-${index}`, getVisibilityDynamicTabKey: index => `visibility-${index}`,
    ensureScreenLayers: () => [], clearSelectedPolygonVertex() {}, renderScreen() {}, updateSelectionOverlays() {},
    setEditorTab() {}, updatePropertiesPanel() {}, updateGroupBreadcrumb() {}, closeReferenceHealth() {}, requestAnimationFrame() {},
    issue: { objectImportId: 'target', source: { value: 'PLC::Missing' }, ...issue }, obj });
  for (const name of ['referenceAutomationLabel', 'selectReferenceIssueObject']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  }
  vm.runInContext('selectReferenceIssueObject(issue)', ctx);
  return ctx;
}

test('reference issue navigation selects the specific visibility and color rule', () => {
  assert.equal(navigate({ automation: 'visibility', bindingPath: 'objects.0.visibility.rules.2.expression.0' }).currentObjectDynamicTab, 'visibility-2');
  assert.equal(navigate({ automation: 'color', bindingPath: 'objects.0.colorAutomationRules.1' }).currentObjectDynamicTab, 'color-1');
  assert.equal(navigate({ automation: 'color', bindingPath: 'objects.0.fillAutomation.rules.2' }).currentObjectDynamicTab, 'color-2');
});

test('click references select Click and the failing action within a sequence', () => {
  const ctx = navigate({ automation: 'action', bindingPath: 'objects.0.action.actions.2.tag' });
  assert.equal(ctx.currentObjectDynamicTab, 'click');
  assert.equal(ctx.clickActionSelection.get(ctx.obj), 2);
  const alias = navigate({ category: 'alias', bindingPath: 'objects.0.action.actions.1.aliases.Color' });
  assert.equal(alias.currentObjectDynamicTab, 'click');
  assert.equal(alias.clickActionSelection.get(alias.obj), 1);
});

test('motion and state references open their automation tabs while text bindings stay in Properties', () => {
  for (const [automation, tab] of [['motion','motion'],['states','states'],['level','level'],['rotation','rotation'],['text','properties'],['viewport','properties']]) {
    assert.equal(navigate({ automation }).currentObjectDynamicTab, tab);
  }
});

test('legacy issues without field paths find the current binding location', () => {
  const ctx = navigate({ automation: 'visibility' }, [{ objectId: 'target', automation: 'visibility', current: 'PLC::Missing', path: 'objects.0.visibility.rules.3' }]);
  assert.equal(ctx.currentObjectDynamicTab, 'visibility-3');
});
