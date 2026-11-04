'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/hmi.js'), 'utf8');
function setup() {
  const context = vm.createContext({ tagValueCache: new Map(), tagQualityCache: new Map(), tagQualityLabelCache: new Map(),
    normalizeTagCacheKey: (c,t) => `${c}:${t}`, normalizeWsTagKey: (c,t) => `${c}:${t}` });
  vm.runInContext(source.slice(source.indexOf('const normalizeTagQuality ='), source.indexOf('const getStableAutomationState =')), context);
  return context;
}
test('quality-only changes repaint while retaining the last good value; idle and waiting remain distinct', () => {
  const c = setup();
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run', 42, 1, true, true);
    changed = applyTagSnapshotToCache('PLC:Run', 42, 0, true, true);
    label = getBoundTagQuality('PLC','Run');
  `,c);
  assert.equal(c.changed, true); assert.equal(c.label,'BAD'); assert.equal(c.tagValueCache.get('PLC:Run'),42);
  for (const state of ['inactive','waiting']) {
    vm.runInContext(`changed = applyTagSnapshotToCache('PLC:Run', null, 0, false, true, '${state}'); label = getBoundTagQuality('PLC','Run');`, c);
    assert.equal(c.changed,true); assert.equal(c.label,state.toUpperCase());
  }
  vm.runInContext("label = getBoundTagQuality('PLC','Unknown');",c); assert.equal(c.label,'UNKNOWN');
});
test('quality expressions evaluate and retain upstream demand and friendly-name remapping', () => {
  const c = setup();
  c.visibilityExpressionFunctionCache = new Map();
  c.resolveMappedConnectionId = x => x === 'Line A' ? 'PLC' : x;
  c.getConnectionDisplayName = x => x;
  c.formatMappedTagReference = (a,b) => `${a}:${b}`;
  vm.runInContext(source.slice(source.indexOf('const getAutomationExpressionValidationError ='),source.indexOf('const isEditingRectVisibilityDynamic =')),c);
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run',42,1,true,true);
    result = evaluateAutomationExpression('quality("PLC", "Run") == "GOOD"');
    keys = [...extractAutomationExpressionTagKeys('quality("PLC", "Run")')];
    mapped = normalizeAutomationExpressionConnectionReferences('quality("Line A", "Run")');
  `,c);
  assert.equal(c.result,true); assert.deepEqual(Array.from(c.keys),['PLC:Run']);
  assert.equal(c.mapped,'quality("PLC", "Run")');
});
test('quality bindings survive normalization and select indicator states', () => {
  const c = setup(); c.isEditMode = false;
  c.matchesIndicatorEquals = (a,b) => a === b;
  vm.runInContext(source.slice(source.indexOf('const normalizeTextBinding ='),source.indexOf('const getTextBindingsMap =')),c);
  // Isolate the actual state resolver without including rendering code.
  const start = source.indexOf('const resolveIndicatorState =');
  const end = source.indexOf('\n};',start)+4;
  vm.runInContext(source.slice(start,end),c);
  vm.runInContext(`
    binding = normalizeTextBinding({connection_id:'PLC',tag:'Run',property:'quality'});
    applyTagSnapshotToCache('PLC:Run',42,0,true,true);
    state = resolveIndicatorState({bindValue:binding,states:[{value:'GOOD'},{value:'BAD'}]});
  `,c);
  assert.equal(c.binding.property,'quality'); assert.equal(c.state.value,'BAD');
});
test('quality(tag()) uses the reference rather than its value and retains demand and names', () => {
  const c = setup();
  c.visibilityExpressionFunctionCache = new Map();
  c.resolveMappedConnectionId = x => x === 'Field Ops' ? 'PLC' : x;
  c.getConnectionDisplayName = x => x === 'PLC' ? 'Field Ops' : x;
  c.formatMappedTagReference = (a,b) => `${a}:${b}`;
  vm.runInContext(source.slice(source.indexOf('const getAutomationExpressionValidationError ='),source.indexOf('const isEditingRectVisibilityDynamic =')),c);
  for (const value of [0,1,false,'BAD',null]) {
    c.sampleValue = value;
    vm.runInContext(`
      applyTagSnapshotToCache('PLC:Run',sampleValue,1,true,true);
      result = evaluateAutomationExpression('(quality(tag("PLC", "Run")) != "GOOD")');
    `,c);
    assert.equal(c.result,false);
  }
  for (const [quality, state, expected] of [[0,'active','BAD'],[0,'waiting','WAITING'],[0,'inactive','INACTIVE'],[1,'active','GOOD']]) {
    c.sampleQuality=quality; c.sampleState=state;
    vm.runInContext(`
      applyTagSnapshotToCache('PLC:Run',1,sampleQuality,true,true,sampleState);
      result = evaluateAutomationExpression('quality ( tag ( "PLC", "Run" ) )');
    `,c);
    assert.equal(c.result,expected);
  }
  vm.runInContext(`
    mapped = normalizeAutomationExpressionConnectionReferences('quality(tag("Field Ops", "Run"))');
    displayed = formatAutomationExpressionForDisplay(mapped);
    keys = [...extractAutomationExpressionTagKeys(mapped)];
    missing = evaluateAutomationExpression("quality(tag('PLC', 'Missing'))");
    literal = evaluateAutomationExpression(JSON.stringify('quality(tag("PLC", "Run"))'));
    arithmetic = evaluateAutomationExpression('tag("PLC", "Run") + 2');
  `,c);
  assert.equal(c.mapped,'quality(tag("PLC", "Run"))');
  assert.equal(c.displayed,'quality(tag("Field Ops", "Run"))');
  assert.deepEqual(Array.from(c.keys),['PLC:Run']);
  assert.equal(c.missing,'UNKNOWN');
  assert.equal(c.literal,'quality(tag("PLC", "Run"))');
  assert.equal(c.arithmetic,3);
});
