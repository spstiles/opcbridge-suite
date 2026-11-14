const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function setup(){
  let next=0;const timers=new Map();const counts={renders:0,properties:0,health:0,subscriptions:0,seeds:0};
  const ctx=vm.createContext({isEditMode:true,activeCompactTagBindingId:'',document:{activeElement:null},
    currentScreenObj:{},currentScreenId:'',referenceHealthRefreshTimer:null,wsSubscribeTimer:null,
    window:{setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)},
    setTimeout:fn=>{timers.set(++next,fn);return next;},
    paint:()=>counts.renders++,properties:()=>counts.properties++,invalidateReferenceHealthCache(){},
    renderReferenceHealthBadge:()=>counts.health++,getActiveObjects:()=>[],selectedIndices:[],renderSelectedReferenceProperties(){},
    updateWsSubscriptions:()=>counts.subscriptions++,scheduleTagSeedRefresh:()=>counts.seeds++});
  function include(start,end){const a=source.indexOf(start);vm.runInContext(source.slice(a,source.indexOf(end,a)),ctx);}
  include('let compactTagEditDepth =','function registerCompactTagBinding(');
  let a=source.indexOf('const renderScreen =');
  vm.runInContext(source.slice(a,source.indexOf('  runtimeRenderIndex = null;',a))+'paint();\n};',ctx);
  a=source.indexOf('const updatePropertiesPanel =');
  vm.runInContext(source.slice(a,source.indexOf('  if (isEditMode && currentScreenObj?.layers)',a))+'properties();\n};',ctx);
  include('const scheduleReferenceHealthRefresh =','const referenceAutomationMatches =');
  include('const scheduleWsSubscribeRefresh =','const connectWebSocket =');
  const tick=()=>{const pending=[...timers.entries()];for(const [id,fn] of pending){if(!timers.has(id))continue;timers.delete(id);fn();}};
  return {ctx,counts,timers,tick,focus:()=>{ctx.document.activeElement={closest:()=>({})};},blur:()=>{ctx.document.activeElement=null;}};
}

test('binding changes persist immediately while canvas and properties wait until both fields are left',()=>{
  const f=setup();f.focus();f.ctx.model={};
  vm.runInContext(`applyCompactTagEdit(()=>{model.connection_id='PLC2';renderScreen();updatePropertiesPanel();scheduleReferenceHealthRefresh();scheduleWsSubscribeRefresh();})`,f.ctx);
  assert.equal(f.ctx.model.connection_id,'PLC2');assert.equal(f.counts.renders,0);assert.equal(f.counts.properties,0);
  f.tick();assert.equal(f.counts.health,0);assert.equal(f.counts.subscriptions,0);assert.equal(f.counts.renders,0);
  vm.runInContext(`applyCompactTagEdit(()=>{model.tag='Pump.Run';renderScreen();})`,f.ctx);
  f.tick();assert.equal(f.ctx.model.tag,'Pump.Run');assert.equal(f.counts.renders,0);
  f.blur();f.tick();f.tick();
  assert.equal(f.counts.renders,1);assert.equal(f.counts.health,1);
  assert.equal(f.counts.subscriptions,1);assert.equal(f.counts.seeds,1);
});

test('picker keeps deferred work pending and a normal redraw absorbs it without a second repaint',()=>{
  const f=setup();f.ctx.activeCompactTagBindingId='visibility';
  vm.runInContext('applyCompactTagEdit(()=>renderScreen())',f.ctx);f.tick();assert.equal(f.counts.renders,0);
  f.ctx.activeCompactTagBindingId='';
  vm.runInContext('renderScreen()',f.ctx);f.tick();assert.equal(f.counts.renders,1);
});

test('failed edits restore the transaction depth so later screen updates are not suppressed',()=>{
  const f=setup();assert.throws(()=>vm.runInContext(`applyCompactTagEdit(()=>{throw Error('edit failed')})`,f.ctx),/edit failed/);
  vm.runInContext('renderScreen()',f.ctx);assert.equal(f.counts.renders,1);assert.equal(f.timers.size,0);
});
