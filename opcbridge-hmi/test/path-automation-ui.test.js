const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function declaration(name, next) {
  const start = source.indexOf(`const ${name} =`);
  const end = source.indexOf(`const ${next} =`, start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

test('path objects use standard visibility, color and state selectors', () => {
  const context = { selected: null };
  context.getAutomationObject = () => context.selected;
  vm.createContext(context);
  vm.runInContext(declaration('AUTOMATION_OBJECT_TYPES', 'isPathDynamicObject') + declaration('isPathDynamicObject', 'runtimeBtn') +
    declaration('getSelectedVisibilityDynamicObject', 'hasVisibilityDynamic') +
    declaration('getDefaultColorRuleForObject', 'normalizeStoredColorRule'), context);
  for (const type of ['polyline', 'spline', 'curve']) {
    for (const closed of [false, true]) {
      context.selected = { type, closed };
      vm.runInContext(`result = {
        visibility: getSelectedVisibilityDynamicObject(),
        color: getSelectedColorDynamicObject(),
        states: getSelectedMultiStateDynamicObject(),
        defaults: getDefaultColorRuleForObject(selected)
      };`, context);
      assert.equal(context.result.visibility, context.selected);
      assert.equal(context.result.color, context.selected);
      assert.equal(context.result.states, context.selected);
      const filled = closed && type !== 'curve';
      assert.equal(context.result.defaults.fillEnabled, filled);
      assert.equal(context.result.defaults.strokeEnabled, !filled);
    }
  }
});

test('separate automation window is removed, shared control store remains', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/css/main.css'), 'utf8');
  assert.doesNotMatch(source, /automationLaunch|openAutomationPanel|closeAutomationPanel|automationPanelOpen/);
  assert.doesNotMatch(html, /id="automationPanel"|id="automationLaunchBtn"/);
  assert.doesNotMatch(css, /\.automation-panel/);
  assert.match(html, /id="automationControlStore"/);
  assert.match(source, /isPathDynamicObject\(obj\) \|\| obj.type === "pipe"/);
});
test('color tag edits reach open and closed path rules instead of silently returning', () => {
  const context=vm.createContext({selected:null,currentObjectDynamicTab:'color',rectColorDraft:null,
    getSelectedColorDynamicObject:()=>context.selected,
    isColorDynamicTab:()=>true,hasEditableColorDynamic:()=>true,
    isPathDynamicObject:obj=>['line','polyline','spline','curve'].includes(obj.type),
    ensureRectColorDraft:()=>{},normalizeRectColorDraft:(_obj,draft)=>draft,
    getColorDynamicTabIndex:()=>0,getDefaultColorRuleForObject:()=>({}),
    syncRectColorUiFromDraft:()=>{},applyRectColorDraftToObject:()=>{context.selected.saved=context.rectColorDraft;}});
  vm.runInContext(source.slice(source.indexOf('const isEditingRectColorDynamic ='),source.indexOf('const isEditingRectRotationDynamic =')),context);
  vm.runInContext(source.slice(source.indexOf('const isEditingAnyColorDynamic ='),source.indexOf('const applyRectColorDraftToObject =')),context);
  for(const type of ['line','polyline','spline','curve'])for(const closed of [false,true]){
    context.selected={type,closed};
    context.rectColorDraft={rules:[{connection_id:'old',tag:'Old',sourceReference:'imported',status:'unresolved'}],selectedRuleIndex:0};
    vm.runInContext('updateRectColorDraft({connection_id:"new",tag:"New",enabled:true})',context);
    assert.equal(context.selected.saved.rules[0].tag,'New',`${type}, closed=${closed}`);
    assert.equal(context.selected.saved.rules[0].connection_id,'new');
    assert.equal(context.selected.saved.rules[0].status,undefined);
  }
});
