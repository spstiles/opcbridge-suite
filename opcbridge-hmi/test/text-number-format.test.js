const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const ctx = vm.createContext({});
for (const name of ['formatBoundNumber', 'normalizeTextBinding']) {
  const start = source.indexOf(`const ${name} =`);
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
}
const format = (value, binding = {}) => {
  ctx.value = value; ctx.binding = binding;
  return vm.runInContext('formatBoundNumber(value, binding)', ctx);
};
test('optional grouping preserves decimals, signs, scaling and rounding', () => {
  assert.equal(format(1234567.89, { thousandsSeparator: true, decimals: 2 }), '1,234,567.89');
  assert.equal(format(-1234567.89, { thousandsSeparator: true, decimals: 2 }), '-1,234,567.89');
  assert.equal(format(999.999, { thousandsSeparator: true, decimals: 2 }), '1,000.00');
  assert.equal(format(1234.5, { thousandsSeparator: true, multiplier: 1000 }), '1,234,500');
  assert.equal(format(12, { thousandsSeparator: true, decimals: 2 }), '12.00');
});
test('existing digit limits and zero padding are applied before grouping', () => {
  assert.equal(format(1234567, { thousandsSeparator: true, digits: 5 }), '34,567');
  assert.equal(format(12, { thousandsSeparator: true, digits: 6, padZeros: true }), '000,012');
  assert.equal(format(1234567.89, { decimals: 2 }), '1234567.89');
  assert.equal(format('text', { thousandsSeparator: true }), null);
});
test('tag and expression bindings retain the separator setting through normalization', () => {
  for (const binding of [
    { connection_id: 'PLC', tag: 'Total', thousandsSeparator: true },
    { sourceType: 'expression', expression: '1234567', thousandsSeparator: true }
  ]) {
    ctx.binding = binding;
    assert.equal(vm.runInContext('normalizeTextBinding(normalizeTextBinding(binding)).thousandsSeparator', ctx), true);
  }
});
