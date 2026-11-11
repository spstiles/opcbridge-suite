const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

function context(extra = {}) {
  const ctx = vm.createContext(extra);
  const start = source.indexOf('const LEVEL_AUTOMATION_TYPES =');
  vm.runInContext(source.slice(start, source.indexOf('const initializeLevelAutomationControl =', start)), ctx);
  return ctx;
}

const importedGroup = () => ({ type: 'group', importId: 'gwx_48', children: [],
  levelAutomation: { enabled: true, sourceType: 'tag', connection_id: 'B030',
    tag: 'Building_30_Data.Bar_Screen_Channel_Elevation', inputMin: 593.5, inputMax: 601.9,
    sourceAutomation: 'GwxSize', sourceReference: 'ac:Building_30/Analog_Data/Bar_Screen_Channel_Elevation/Analog',
    status: 'unresolved' } });

test('existing imported group Level binding opens with its exact source and can be repaired', () => {
  const obj = importedGroup();
  const control = Object.fromEntries(['enabled', 'sourceType', 'expression', 'min', 'max', 'direction', 'invert', 'clamp', 'fill', 'emptyFill'].map(key => [key, {}]));
  control.updateSourceRows = () => {};
  let refreshed = 0;
  const ctx = context({ obj, selectedIndices: [0], getActiveObjects: () => [obj],
    initializeLevelAutomationControl: () => control, renderCompactTagBindingRows: () => { refreshed++; },
    recordHistory() {}, renderScreen() {}, syncEditorFromScreen() {}, setDirty() {} });
  const start = source.indexOf('const syncLevelAutomationControl =');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  assert.equal(vm.runInContext('canEditLevelAutomation(obj)', ctx), true);
  vm.runInContext('syncLevelAutomationControl(obj)', ctx);
  assert.equal(refreshed, 1);
  assert.equal(control.min.value, '593.5');
  assert.equal(control.max.value, '601.9');
  vm.runInContext(`updateSelectedLevelAutomation({ connection_id: 'B030', tag: 'Analog_Data.Bar_Screen_Channel_Elevation' })`, ctx);
  assert.equal(obj.levelAutomation.tag, 'Analog_Data.Bar_Screen_Channel_Elevation');
  assert.equal(obj.levelAutomation.inputMin, 593.5);
  assert.equal(obj.levelAutomation.inputMax, 601.9);
  assert.equal(obj.levelAutomation.sourceAutomation, 'GwxSize');
  assert.equal(obj.levelAutomation.status, undefined);
  assert.equal(obj.levelAutomation.sourceReference, undefined);
});

test('group Level support is limited to existing bindings and registered with the editor', () => {
  const ctx = context();
  assert.equal(vm.runInContext('canEditLevelAutomation({type:"group"})', ctx), false);
  assert.equal(vm.runInContext('canEditLevelAutomation({type:"rect"})', ctx), true);
  assert.match(source, /const hasLevelDynamic = Boolean\(obj\?\.levelAutomation && canEditLevelAutomation\(obj\)\)/);
  assert.match(source, /id: "level-automation", tab: "level", types: \[\.\.\.LEVEL_AUTOMATION_TYPES, "group"\]/);
});
