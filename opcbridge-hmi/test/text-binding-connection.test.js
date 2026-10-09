'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function setup() {
  const select = {
    tagName: 'SELECT', dataset: {}, options: [], selected: '',
    get value() { return this.selected; },
    set value(value) { this.selected = this.options.some(option => option.value === value) ? value : ''; },
    set innerHTML(value) { this.options = []; this.selected = ''; },
    appendChild(option) { this.options.push(option); },
  };
  const names = { plc_a: 'Line A', plc_b: 'Line B' };
  const context = vm.createContext({
    tagsCacheVersion: 1, tagsCache: [{ connection_id: 'plc_b' }, { connection_id: 'plc_a' }, { connection_id: 'plc_a' }],
    document: { createElement: () => ({ value: '', textContent: '' }), getElementById: () => { throw new Error('Select controls must not create a filtering datalist'); } },
    getConnectionDisplayName: id => names[id] || id,
    resolveMappedConnectionId: () => { throw new Error('Selected IDs must not be reinterpreted as display names'); }
  });
  vm.runInContext(source.slice(source.indexOf('function sortConnectionIdsForDisplay('), source.indexOf('let connectionDisplayNameCacheVersion')), context);
  vm.runInContext(source.slice(source.indexOf('const populateConnectionSelect ='), source.indexOf('const populateFilteredCombinedTagSelect =')), context);
  vm.runInContext(source.slice(source.indexOf('function ensureFriendlyConnectionNames('), source.indexOf('function populateCompactTagBindingConnectionOptions(')), context);
  return { context, select };
}
test('changing and reopening a text binding retains every connection and stores IDs', () => {
  const { context, select } = setup();
  context.setFriendlyConnectionInputValue(select, 'plc_a');
  assert.deepEqual(select.options.map(option => option.textContent), ['Select connection…', 'Line A', 'Line B']);
  select.value = 'plc_b';
  assert.equal(context.connectionIdFromFriendlyInput(select), 'plc_b');
  context.setFriendlyConnectionInputValue(select, 'plc_b');
  context.ensureFriendlyConnectionNames(select);
  assert.deepEqual(select.options.map(option => option.value), ['', 'plc_a', 'plc_b']);
  assert.equal(select.value, 'plc_b');
});
test('unavailable saved connections remain editable alongside the available connections', () => {
  const { context, select } = setup();
  context.setFriendlyConnectionInputValue(select, 'offline_plc');
  assert.equal(select.value, 'offline_plc');
  assert.deepEqual(select.options.map(option => option.value), ['', 'plc_a', 'plc_b', 'offline_plc']);
  context.tagsCacheVersion++;
  context.tagsCache.push({ connection_id: 'plc_c' });
  context.setFriendlyConnectionInputValue(select, 'offline_plc');
  assert.ok(select.options.some(option => option.value === 'plc_c'));
  assert.equal(select.value, 'offline_plc');
});
