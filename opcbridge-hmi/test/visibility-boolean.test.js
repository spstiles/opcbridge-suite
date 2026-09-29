const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

test('visibility Equals 1 follows numeric, native and text Boolean toggles', () => {
  const values = new Map();
  const context = vm.createContext({
    tagValueCache: values, runtimeAutomationStateCache: new WeakMap(),
    normalizeTagCacheKey: (c, t) => `${c}/${t}`,
    activeTagInfoCache: new Map(),
  });
  for (const name of ['coerceTagBoolean', 'coerceTagNumber', 'getAutomationState', 'evaluateVisibilityRule']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), context);
  }
  context.binding = { enabled: true, connection_id: '_memory', tag: 'Test', mode: 'equals', match: '1' };
  for (const [on, off] of [[true, false], [1, 0], ['1', '0'], ['true', 'false'], ['ON', 'OFF'], [' yes ', ' no ']]) {
    for (const invert of [false, true]) {
      context.binding.invert = invert;
      for (const [value, expected] of [[on, true], [off, false], [on, true]]) {
        values.set('_memory/Test', value);
        assert.equal(vm.runInContext('evaluateVisibilityRule(binding)', context), invert ? !expected : expected, String(value));
      }
    }
  }
  context.binding.invert = false;
  for (const value of ['unknown', 2, -1]) {
    values.set('_memory/Test', value);
    assert.equal(vm.runInContext('evaluateVisibilityRule(binding)', context), false);
  }
});
