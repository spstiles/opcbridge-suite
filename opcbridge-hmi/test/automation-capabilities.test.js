const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function context() {
  const ctx = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('const AUTOMATION_OBJECT_TYPES ='), source.indexOf('const isPathDynamicObject =')), ctx);
  return ctx;
}
test('unsupported automation features are determined by a shared object capability table', () => {
  const ctx = context();
  for (const [type, feature, expected] of [
    ['ellipse','click',true], ['group','color',true], ['group','visibility',true],
    ['image','visibility',false], ['image','rotation',false], ['image','click',true],
    ['polygon','rotation',false], ['circle','rotation',false], ['circle','motion',true],
    ['pipe','states',false], ['curve','states',true], ['viewport','box-shadow',false],
    ['alarms-panel','drop-shadow',false], ['ellipse','animator',false], ['group','animator',true]
  ]) {
    ctx.obj = { type }; ctx.feature = feature;
    assert.equal(vm.runInContext('supportsObjectAutomation(obj, feature)', ctx), expected, `${type} / ${feature}`);
  }
  assert.equal(vm.runInContext('supportsObjectAutomation(null, "click")', ctx), false);
  assert.equal(vm.runInContext('supportsObjectAutomation({type:"ellipse"}, "unknown")', ctx), false);
});
test('automation selectors use the same capabilities as the menus', () => {
  const ctx = context();
  ctx.getAutomationObject = () => ctx.obj;
  vm.runInContext(source.slice(source.indexOf('const getSelectedVisibilityDynamicObject ='), source.indexOf('const hasVisibilityDynamic =')), ctx);
  for (const type of ['group','ellipse','image','pipe','curve','circle','polygon','viewport']) {
    ctx.obj = { type };
    for (const [selector, feature] of [['Visibility','visibility'], ['Color','color'], ['Rotation','rotation'], ['MultiState','states'], ['Motion','motion']]) {
      const actual = vm.runInContext(`getSelected${selector}DynamicObject()`, ctx);
      ctx.feature = feature;
      assert.equal(Boolean(actual), vm.runInContext('supportsObjectAutomation(obj, feature)', ctx));
    }
  }
});
test('unavailable menu items are visibly and accessibly disabled and reenable on selection changes', () => {
  const ctx = context();
  const classes = new Set(); const attributes = {};
  ctx.item = { classList: { toggle: (name, value) => value ? classes.add(name) : classes.delete(name) }, setAttribute: (name, value) => { attributes[name] = value; } };
  vm.runInContext('setAutomationMenuItemEnabled(item, supportsObjectAutomation({type:"image"}, "color"))', ctx);
  assert.equal(ctx.item.disabled, true); assert.ok(classes.has('is-disabled')); assert.equal(attributes['aria-disabled'], 'true');
  vm.runInContext('setAutomationMenuItemEnabled(item, supportsObjectAutomation({type:"group"}, "color"))', ctx);
  assert.equal(ctx.item.disabled, false); assert.equal(classes.has('is-disabled'), false); assert.equal(attributes['aria-disabled'], 'false');
});
