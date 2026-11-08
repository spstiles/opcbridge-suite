const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function setup() {
  function element() {
    return { children: [], dataset: {}, value: '', textContent: '',
      appendChild(child) { this.children.push(child); },
      set innerHTML(value) { this.children = []; this.value = ''; },
      get options() { return this.children.flatMap(child => child.children.length ? child.options : [child]); },
      get selectedOptions() { return this.options.filter(option => option.value === this.value); } };
  }
  const ctx = vm.createContext({ document: { createElement: element }, tagsCacheVersion: 1,
    tagsCache: [
      { connection_id: '_system', name: 'System/Alarms/Groups/Field/Lift Station 1/Active' },
      { connection_id: '_system', name: 'System/Alarms/RuntimeConnected' },
      { connection_id: '_system', name: 'System/Clock/Second' },
      { connection_id: 'PLC', name: 'Flow' }
    ],
    getConnectionDisplayName: id => id === '__alarm_status_picker' ? 'Alarms' : id,
    sortConnectionIdsForDisplay: ids => [...new Set(ids)].sort(),
    getEffectiveScreenAliases: () => [], currentScreenObj: {},
    parseTagSelectValue: value => { const [connection_id, tag] = value.split('::'); return { connection_id, tag }; }
  });
  vm.runInContext(source.slice(source.indexOf('const ALARM_TAG_PICKER_ID ='), source.indexOf('const closeTextBindingModal =')), ctx);
  ctx.element = element;
  return ctx;
}
test('Alarms category has short labels and canonical binding values', () => {
  const ctx = setup();
  ctx.select = ctx.element();
  vm.runInContext('populateConnectionSelect(select)', ctx);
  assert.ok(ctx.select.options.some(option => option.value === '__alarm_status_picker' && option.textContent === 'Alarms'));
  vm.runInContext("populateFilteredCombinedTagSelect(select, '__alarm_status_picker')", ctx);
  assert.deepEqual(ctx.select.options.map(option => option.textContent), ['Select tag…', 'Field/Lift Station 1/Active', 'RuntimeConnected']);
  const option = ctx.select.options[1];
  assert.equal(option.value, '_system::System/Alarms/Groups/Field/Lift Station 1/Active');
  assert.equal(option.title, 'System/Alarms/Groups/Field/Lift Station 1/Active');
  vm.runInContext("select.value=''; populateFilteredCombinedTagSelect(select, '_system')", ctx);
  assert.deepEqual(ctx.select.options.map(option => option.textContent), ['Select tag…', 'System/Clock/Second']);
});
test('saved alarm bindings reopen in Alarms; expressions retain the real connection', () => {
  const ctx = setup(); ctx.select = ctx.element();
  vm.runInContext("setConnectionSelectValue(select, '_system', 'System/Alarms/Groups/Field/Active')", ctx);
  assert.equal(ctx.select.value, '__alarm_status_picker');
  assert.equal(vm.runInContext('tagPickerConnectionId(select.value)', ctx), '_system');
  vm.runInContext('populateTagSelect(select)', ctx);
  const group = ctx.select.children.find(child => child.label === 'Alarms');
  assert.ok(group);
  assert.equal(group.children[0].textContent, 'Field/Lift Station 1/Active');
  assert.equal(group.children[0].value, '_system::System/Alarms/Groups/Field/Lift Station 1/Active');
});

test('compact picker uses relative labels and canonical IDs for both filtered and grouped choices', () => {
  const ctx = setup();
  ctx.tagBindingConnectionSelect = ctx.element();
  ctx.tagBindingTagSelect = ctx.element();
  ctx.tagBindingTagFilterInput = { value: '' };
  vm.runInContext(source.slice(source.indexOf('function populateCompactTagBindingConnectionOptions('), source.indexOf('function getCompactTagBindingSummary(')), ctx);
  ctx.populateCompactTagBindingConnectionOptions();
  ctx.tagBindingConnectionSelect.value = '__alarm_status_picker';
  ctx.populateCompactTagBindingTagOptions('__alarm_status_picker');
  const option = ctx.tagBindingTagSelect.options.find(item => item.textContent === 'Field/Lift Station 1/Active');
  assert.ok(option);
  assert.equal(option.dataset.connectionId, '_system');
  assert.equal(option.dataset.tag, 'System/Alarms/Groups/Field/Lift Station 1/Active');
  assert.equal(option.value, '_system::System/Alarms/Groups/Field/Lift Station 1/Active');
  ctx.tagBindingConnectionSelect.value = '';
  ctx.populateCompactTagBindingTagOptions('');
  assert.ok(ctx.tagBindingTagSelect.children.some(child => child.label === 'Alarms'));
});
