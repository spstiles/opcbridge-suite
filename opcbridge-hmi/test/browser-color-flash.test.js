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
