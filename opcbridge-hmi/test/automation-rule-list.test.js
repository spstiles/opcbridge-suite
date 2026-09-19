const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

test('one Color and Visibility tab represents all rules without creating extra tabs', () => {
  const makeTab = () => ({hidden:false, classList:{toggle(){}}});
  const calls = [];
  const rules = [{tag:'A'}, {tag:'B'}, {tag:'C'}];
  const obj = {visibility:{rules}};
  const context = vm.createContext({
    objectDynamicTabVisibilityBtn:makeTab(), objectDynamicTabColorBtn:makeTab(),
    rectVisibilityDraftObject:null, rectVisibilityDraft:null,
    hasVisibilityDynamic:()=>true, normalizeVisibilityState:x=>x,
    hasEditableColorDynamic:()=>true, getCurrentColorRulesForObject:()=>rules,
    isVisibilityDynamicTab:()=>true, isColorDynamicTab:()=>false,
    renderAutomationRuleList:(kind, owner, values)=>calls.push({kind, owner, values}), obj
  });
  const start = source.indexOf('const syncObjectDynamicVisibilityTabs =');
  const end = source.indexOf('const getPropertiesPaneTitle =', start);
  vm.runInContext(source.slice(start,end), context);
  vm.runInContext('syncObjectDynamicVisibilityTabs(obj); syncObjectDynamicColorTabs(obj);', context);
  assert.deepEqual(calls.map(x=>x.kind), ['visibility','color']);
  assert.ok(calls.every(x=>x.values === rules));
  assert.deepEqual(rules.map(x=>x.tag), ['A','B','C']);
});

test('obsolete extra-tab and hidden Color rule controls are removed', () => {
  assert.equal(source.includes('draggedColorRuleIndex'), false);
  assert.equal(source.includes('rectColorRuleSelect'), false);
  assert.equal(source.includes('data-visibility-tab-index'), false);
  assert.equal(source.includes('data-color-tab-index'), false);
});
