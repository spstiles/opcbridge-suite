const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const load = (ctx, name) => {
  const start = source.indexOf(`const ${name} =`);
  vm.runInContext(source.slice(start, source.indexOf('\n};', start)+3), ctx);
};

test('color phases use original priority and base paint without blink subscriptions', () => {
  const ctx = vm.createContext({
    browserColorFlashPhase: { rate: 'slow', on: true }, isEditMode: false,
    getColorAutomationRules: c => c ? c.rules || [c] : [],
    evaluateAutomationExpression: e => e === 'on', coerceTagBoolean: Boolean,
    normalizeWsTagKey: (c,t) => `${c}:${t}`, extractAutomationExpressionTagKeys: () => {},
    keys: new Set(), base: 'linear-gradient(90deg, red, blue)',
    config: { rules: [
      { enabled: true, sourceType: 'expression', expression: 'off', onColor: 'green' },
      { enabled: true, sourceType: 'expression', expression: 'on', onColor: 'red', flashEnabled: true }
    ] }
  });
  for (const name of ['getBrowserColorFlashRate', 'isColorRuleFlashActive', 'getAutomationColor', 'collectTagKeysFromValue']) load(ctx, name);
  assert.equal(vm.runInContext('getAutomationColor(config, base)', ctx), 'red');
  ctx.browserColorFlashPhase.on = false;
  assert.equal(vm.runInContext('getAutomationColor(config, base)', ctx), ctx.base);
  ctx.config.rules[1].flashWhen = false;
  assert.equal(vm.runInContext('getAutomationColor(config, base)', ctx), 'red');
  vm.runInContext('collectTagKeysFromValue({type:"rect", fillAutomation:config}, keys)', ctx);
  assert.equal(ctx.keys.size, 0);
  ctx.config.rules[0].flashEnabled = true;
  ctx.config.rules[0].flashRate = 'fast';
  assert.equal(vm.runInContext('getBrowserColorFlashRate({type:"rect", fillAutomation:config})', ctx), null);
});

test('both prepared color states share the browser timeline and restore render context', () => {
  const phases = [];
  const animations = [];
  const ctx = vm.createContext({
    isEditMode: false, browserColorFlashPhase: null,
    getBrowserColorFlashRate: () => 'slow',
    document: { createElementNS: () => ({}) },
    parent: { appendChild() {} },
    renderObjectContentInto: () => phases.push(ctx.browserColorFlashPhase.on),
    animateVisibilityFlash: (_, flash) => animations.push(flash)
  });
  load(ctx, 'renderObjectInto');
  vm.runInContext('renderObjectInto(parent, {})', ctx);
  assert.deepEqual(phases, [true, false]);
  assert.equal(animations[0].on, true);
  assert.equal(animations[1].on, false);
  assert.equal(ctx.browserColorFlashPhase, null);
});

test('flashing alarm falls through to running or base color for tag and expression rules', () => {
  for (const sourceType of ['tag','expression']) {
    const ctx=vm.createContext({isEditMode:false,browserColorFlashPhase:{rate:'slow',on:true},
      getColorAutomationRules:c=>c?.rules||[],tagValueCache:new Map(),normalizeTagCacheKey:(c,t)=>`${c}:${t}`,
      coerceTagBoolean:Boolean,getStableAutomationState:value=>Boolean(value),getMultiStateVisualOverrides:()=>null,
      evaluateAutomationExpression:name=>ctx.tagValueCache.get(`PLC:${name}`)});
    for(const name of ['isColorRuleFlashActive','getAutomationColor','getActiveAutomationOverrideColor','getGroupColorOverrides'])load(ctx,name);
    ctx.config={rules:[
      {enabled:true,sourceType,connection_id:'PLC',tag:'Alarm',expression:'Alarm',onColor:'red',flashEnabled:true,flashRate:'slow'},
      {enabled:true,sourceType,connection_id:'PLC',tag:'Running',expression:'Running',onColor:'green'}
    ]};
    const color=()=>vm.runInContext('getAutomationColor(config,"gray")',ctx);
    const override=()=>vm.runInContext('getActiveAutomationOverrideColor(config)',ctx);
    ctx.tagValueCache.set('PLC:Alarm',true);ctx.tagValueCache.set('PLC:Running',true);
    assert.equal(color(),'red');assert.equal(override(),'red');
    ctx.browserColorFlashPhase.on=false;
    assert.equal(color(),'green');assert.equal(override(),'green');
    assert.equal(vm.runInContext('getGroupColorOverrides({type:"group",fillAutomation:config,strokeAutomation:config,textColorAutomation:config,backgroundAutomation:config,borderColorAutomation:config}).fillColor',ctx),'green');
    ctx.tagValueCache.set('PLC:Running',false);
    assert.equal(color(),'gray');assert.equal(override(),null);
    ctx.browserColorFlashPhase.on=true;
    assert.equal(color(),'red');assert.equal(override(),'red');
    ctx.tagValueCache.set('PLC:Alarm',false);ctx.tagValueCache.set('PLC:Running',true);
    assert.equal(color(),'green');assert.equal(override(),'green');
    // A steady higher-priority alarm keeps priority in either flash phase.
    ctx.tagValueCache.set('PLC:Alarm',true);ctx.config.rules[0].flashEnabled=false;
    ctx.browserColorFlashPhase.on=false;
    assert.equal(color(),'red');assert.equal(override(),'red');
    ctx.config.rules[0].enabled=false;
    assert.equal(color(),'green');assert.equal(override(),'green');
    // The configured inverse flash phase also falls through correctly.
    Object.assign(ctx.config.rules[0],{enabled:true,flashEnabled:true,flashWhen:false});
    assert.equal(color(),'red');assert.equal(override(),'red');
    ctx.browserColorFlashPhase.on=true;
    assert.equal(color(),'green');assert.equal(override(),'green');
  }
});
