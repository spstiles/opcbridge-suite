const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {convertGraphWorx} = require('../server/graphworx-import');
const source = fs.readFileSync(`${__dirname}/../public/js/hmi.js`, 'utf8');
const xml = `<Canvas xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:gwxcmd="clr-namespace:Ico.Gwx.Commands" xmlns:s="clr-namespace:System">
<Label Width="90" Height="50"><TextBlock Text="Flow Identifiers"/>
<gwx:GwxPick DataSource="localsim::Flow_Identifier_Active:Boolean"><gwxcmd:ToggleValueCommand><gwxcmd:ToggleValueCommand.Values><s:String>1</s:String><s:String>0</s:String></gwxcmd:ToggleValueCommand.Values></gwxcmd:ToggleValueCommand></gwx:GwxPick>
<gwx:GwxColor TargetPropertyName="Background" EndBrush="#FF7CCA62" AnimationMode="Discrete" DataSource="localsim::Flow_Identifier_Active:Boolean"/>
</Label><Label Width="90" Height="20"><TextBlock Text="Flow"/><gwx:GwxHide DataSource="localsim::Flow_Identifier_Active:Boolean" AnimationMode="Discrete" DataComparison="EqualZero"/></Label></Canvas>`;

test('imports a local Boolean toggle, green background, and matching label visibility without unresolved tags', () => {
  const {screen} = convertGraphWorx(xml);
  const button = screen.objects[0], label = screen.objects[1];
  assert.deepEqual(button.action,{type:'toggle-write',connection_id:'_local',tag:'Flow_Identifier_Active',onValue:'1',offValue:'0'});
  assert.equal(button.backgroundAutomation.rules[0].connection_id,'_local');
  assert.equal(button.backgroundAutomation.rules[0].onColor,'#7cca62');
  assert.equal(button.fillAutomation,undefined);
  assert.equal(label.visibility.rules[0].tag,'Flow_Identifier_Active');
  assert.equal(label.visibility.rules[0].invert,true);
  assert.equal(label.visibility.rules[0].match,'0');
  assert.equal(screen.referenceHealth.issues.length,0);
});

test('non-Boolean local commands and multi-value toggles remain unsupported', () => {
  for (const changed of [xml.replace('<s:String>1</s:String>','<s:String>2</s:String>'),xml.replace('<s:String>0</s:String>','<s:String>0</s:String><s:String>2</s:String>')]) {
    const {screen} = convertGraphWorx(changed);
    assert.equal(screen.objects[0].action,undefined);
    assert.ok(screen.referenceHealth.issues.some(issue=>issue.automation==='pick/write'&&issue.status==='unsupported'));
  }
});

function runtime() {
  let renders=0;
  const ctx=vm.createContext({tagValueCache:new Map(),isEditMode:false,currentPopupScreenId:null,
    isViewOnlyRuntime:()=>true,getBrowserColorFlashRate:()=>null,renderScreen:()=>{renders++;},fetch:()=>{throw Error('Local values must never use OPC');}});
  function include(start,end) { const a=source.indexOf(start); vm.runInContext(source.slice(a,source.indexOf(end,a)),ctx); }
  include('const coerceTagBoolean =','const resolveBarLimit =');
  include('const normalizeTagCacheKey =','const normalizeTagQuality =');
  include('const normalizeWsTagKey =','const collectViewportTargetsFromValue =');
  include('const wsTagKeyToQueryItem =','const applyTagRowsToCache =');
  include('const apiWriteTag =','const findNumberInputById =');
  include('const matchesToggleOnValue =','const getWriteActionActiveState =');
  return {ctx,renders:()=>renders};
}

test('local toggle starts off, toggles twice in a view-only session, and does not call OPC', async () => {
  const f=runtime();
  vm.runInContext(`collectTagKeysFromValue({connection_id:'_local',tag:'Flow_Identifier_Active'}, new Set())`,f.ctx);
  assert.equal(f.ctx.tagValueCache.get('_local.Flow_Identifier_Active'),0);
  f.ctx.action=convertGraphWorx(xml).screen.objects[0].action;
  await vm.runInContext('runToggleWriteAction(action)',f.ctx);
  assert.equal(f.ctx.tagValueCache.get('_local.Flow_Identifier_Active'),1);
  await vm.runInContext('runToggleWriteAction(action)',f.ctx);
  assert.equal(f.ctx.tagValueCache.get('_local.Flow_Identifier_Active'),0);
  assert.equal(f.renders(),2);
  await assert.rejects(vm.runInContext(`apiWriteTag({connection_id:'PLC',tag:'Override',value:1})`,f.ctx),/Writes are disabled/);
});

test('local visibility and action values are excluded from server subscriptions and seed queries', () => {
  const f=runtime(); f.ctx.keys=new Set();
  vm.runInContext(`collectTagKeysFromValue({children:[{connection_id:'_local',tag:'Flow'},{connection_id:'PLC',tag:'Run'}]}, keys)`,f.ctx);
  assert.deepEqual([...f.ctx.keys],['PLC:Run']);
  assert.equal(vm.runInContext(`wsTagKeyToQueryItem('_local:Flow')`,f.ctx),null);
});


test('equipment toggle imports as Maintained Toggle with its original reference ready for mapping', () => {
  const reference = 'ac:Building_139/Low_Flow_Emergency_Override/Status';
  const {screen} = convertGraphWorx(xml.replaceAll('localsim::Flow_Identifier_Active:Boolean',reference));
  assert.deepEqual(screen.objects[0].action,{type:'toggle-write',connection_id:'',tag:reference,
    onValue:'1',offValue:'0',sourceReference:reference,status:'unresolved'});
  const ref = screen.objects[0].externalReferences.find(ref=>ref.automation==='pick/write');
  assert.equal(ref.supported,true);
  assert.equal(ref.status,'unresolved');
  assert.ok(!screen.referenceHealth.issues.some(issue=>issue.automation==='pick/write'&&issue.status==='unsupported'));
});
