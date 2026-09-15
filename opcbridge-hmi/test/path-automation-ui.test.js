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
  vm.runInContext(declaration('isPathDynamicObject', 'runtimeBtn') +
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
