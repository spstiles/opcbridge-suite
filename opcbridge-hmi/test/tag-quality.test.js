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
test('confirmed bad quality remains visible while raw idle and waiting states remain available', () => {
  const c = setup();
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run', 42, 1, true, true);
    changed = applyTagSnapshotToCache('PLC:Run', 42, 0, true, true);
    label = getBoundTagQuality('PLC','Run');
  `,c);
  assert.equal(c.changed, true); assert.equal(c.label,'BAD'); assert.equal(c.tagValueCache.get('PLC:Run'),42);
  for (const state of ['inactive','waiting']) {
    vm.runInContext(`changed = applyTagSnapshotToCache('PLC:Run', null, 0, false, true, '${state}'); label = getBoundTagQuality('PLC','Run');`, c);
    assert.equal(c.changed,true); assert.equal(c.label,'BAD');
    assert.equal(vm.runInContext("getBoundTagQuality('PLC','Run',false)",c),state.toUpperCase());
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
  for (const [quality, state, expected] of [[0,'active','BAD'],[0,'waiting','BAD'],[0,'inactive','BAD'],[1,'active','GOOD']]) {
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


test('returning to an inactive screen retains values and good presentation without hiding raw quality', () => {
  const c=setup();
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run',42,1,true,true);
    applyTagSnapshotToCache('PLC:Run',null,0,true,true,'inactive');
    applyTagSnapshotToCache('PLC:Run',null,0,true,true,'waiting');
  `,c);
  assert.equal(c.tagValueCache.get('PLC:Run'),42);
  assert.equal(vm.runInContext("getBoundTagQuality('PLC','Run')",c),'GOOD');
  assert.equal(vm.runInContext("getBoundTagQuality('PLC','Run',false)",c),'WAITING');
  assert.equal(c.tagQualityCache.get('PLC:Run'),0);
  vm.runInContext("applyTagSnapshotToCache('PLC:Run',99,1,true,true,'active')",c);
  assert.equal(c.tagValueCache.get('PLC:Run'),99);
  assert.equal(vm.runInContext("getBoundTagQuality('PLC','Run')",c),'GOOD');
});
test('pending default values cannot replace a previous measurement or seed an unseen tag', () => {
  const c=setup();
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run',42,1,true,true);
    applyTagSnapshotToCache('PLC:Run',0,1,true,true,'waiting');
    applyTagSnapshotToCache('PLC:Unseen',0,1,true,true,'waiting');
  `,c);
  assert.equal(c.tagValueCache.get('PLC:Run'),42);
  assert.equal(c.tagValueCache.has('PLC:Unseen'),false);
  assert.equal(vm.runInContext("getBoundTagQuality('PLC','Unseen')",c),'WAITING');
});
test('normal reactivation does not trigger a configured bad-quality expression, but an actual failure does', () => {
  const c=setup();c.visibilityExpressionFunctionCache=new Map();
  c.resolveMappedConnectionId=x=>x;c.getConnectionDisplayName=x=>x;c.formatMappedTagReference=(a,b)=>`${a}:${b}`;
  vm.runInContext(source.slice(source.indexOf('const getAutomationExpressionValidationError ='),source.indexOf('const isEditingRectVisibilityDynamic =')),c);
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run',42,1,true,true);
    applyTagSnapshotToCache('PLC:Run',null,0,true,true,'waiting');
    flashing=evaluateAutomationExpression('quality(tag("PLC", "Run")) != "GOOD"');
  `,c);
  assert.equal(c.flashing,false);
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run',null,0,true,true,'error');
    flashing=evaluateAutomationExpression('quality(tag("PLC", "Run")) != "GOOD"');
  `,c);
  assert.equal(c.flashing,true);assert.equal(c.tagValueCache.get('PLC:Run'),42);
});

test('a newly loaded screen binding renders the retained measurement while its subscription wakes up', () => {
  const c=setup();c.isEditMode=false;c.TEXT_PLACEHOLDER_RE=/\{([^}]+)\}/g;
  c.getBindPlaceholder=()=> '??????';c.formatBoundNumber=()=>null;
  vm.runInContext(source.slice(source.indexOf('const renderBoundTemplate ='),source.indexOf('const renderTextTemplate =')),c);
  vm.runInContext(`
    applyTagSnapshotToCache('PLC:Run',42,1,true,true);
    first=renderBoundTemplate('{1}',{'1':{connection_id:'PLC',tag:'Run'}});
    applyTagSnapshotToCache('PLC:Run',null,0,true,true,'inactive');
    applyTagSnapshotToCache('PLC:Run',null,0,true,true,'waiting');
    revisited=renderBoundTemplate('{1}',{'1':{connection_id:'PLC',tag:'Run'}});
    applyTagSnapshotToCache('PLC:Run',84,1,true,true,'active');
    updated=renderBoundTemplate('{1}',{'1':{connection_id:'PLC',tag:'Run'}});
  `,c);
  assert.equal(c.first,'42');assert.equal(c.revisited,'42');assert.equal(c.updated,'84');
});
