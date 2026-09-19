const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

test('Add Color stores a first rule before refreshing the properties pane', () => {
  for (const type of ['circle', 'rect', 'ellipse', 'button', 'pipe']) {
    const obj = {type};
    let dirty = false;
    let history = 0;
    const context = vm.createContext({
      getActiveObjects:()=>[obj], getSelectedColorDynamicObject:()=>obj,
      selectedIndices:[0], rectColorDraftObject:null, rectColorDraft:null,
      currentObjectDynamicTab:'properties',
      buildColorRulesFromObject:o=>o.colorAutomationRules || [],
      getStoredColorRulesForObject:o=>o.colorAutomationRules || [],
      getDefaultColorRuleForObject:()=>({enabled:true, sourceType:'tag', fillEnabled:true}),
      normalizeRectColorDraft:(o,d)=>({...d, rules:d.rules.map(r=>({...r}))}),
      ensureRectColorDraft:()=>{
        if (context.rectColorDraftObject !== obj) {
          context.rectColorDraftObject = obj;
          context.rectColorDraft = {rules:[{enabled:true, sourceType:'tag', fillEnabled:true}]};
        }
      },
      getColorDynamicTabKey:i=>i ? `color-${i}` : 'color',
      recordHistory:()=>history++, setDirty:value=>{dirty=value;},
      renderScreen:()=>{}, syncEditorFromScreen:()=>{},
      updatePropertiesPanel:()=>assert.ok(obj.colorAutomationRules.length > 0)
    });
    const start = source.indexOf('const ensureRectColorDynamic =');
    vm.runInContext(source.slice(start,source.indexOf('\n};',start)+3),context);
    assert.equal(vm.runInContext('ensureRectColorDynamic()',context),true);
    assert.equal(obj.colorAutomationRules.length,1,type);
    assert.equal(dirty,true);
    obj.colorAutomationRules[0].tag='PumpRunning';
    context.rectColorDraft.rules[0].tag='PumpRunning';
    vm.runInContext('ensureRectColorDynamic()',context);
    assert.equal(obj.colorAutomationRules.length,2);
    assert.equal(obj.colorAutomationRules[0].tag,'PumpRunning');
    assert.equal(history,2);
    assert.equal(JSON.parse(JSON.stringify(obj)).colorAutomationRules.length,2);
  }
});
