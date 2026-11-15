const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function include(ctx,start,end){const a=source.indexOf(start);vm.runInContext(source.slice(a,source.indexOf(end,a)),ctx);}
function colorEditor(local=true){
  const obj={type:'rect',id:'lamp',fill:'#000000'};const history=[],dirty=[],calls={paint:0,full:0,ui:0};
  const focus={value:'1'};
  const ctx=vm.createContext({obj,document:{activeElement:focus},rectColorDraftObject:obj,
    rectColorDraft:{selectedRuleIndex:0,rules:[{enabled:true,sourceType:'tag',connection_id:'PLC',tag:'Run',mode:'equals',match:'1',fillEnabled:true,fillColor:'#ff0000'}]},
    getActiveObjects:()=>[obj],getSelectedColorDynamicObject:()=>obj,isEditingAnyColorDynamic:()=>true,
    ensureRectColorDraft(){},getColorDynamicTabIndex:()=>0,normalizeRectColorDraft:(_,draft)=>draft,syncRectColorUiFromDraft:()=>calls.ui++,
    getDefaultColorRuleForObject:()=>({}),isClosedDynamicPath:()=>false,isPathDynamicObject:()=>false,
    serializeColorAutomationRules:rules=>{const nonnull=rules.filter(Boolean);return nonnull.length?{rules:nonnull}:null;},
    recordHistory:()=>history.push(JSON.stringify(obj)),getAutomationExpressionValidationError:()=>'',
    repaintEditorColorObject:()=>{calls.paint++;return local;},renderScreen:()=>calls.full++,syncEditorFromScreen(){},
    setDirty:(value,options)=>dirty.push({value,options})});
  include(ctx,'const updateRectColorDraft =','const normalizeVisibilityRule =');
  return {ctx,obj,history,dirty,calls,focus};
}

test('color mode and paint edits update the model immediately without replacing Properties or scanning references',()=>{
  const f=colorEditor();vm.runInContext(`updateRectColorDraft({mode:'threshold',threshold:10,fillColor:'#00ff00'})`,f.ctx);
  assert.equal(f.obj.fillAutomation.rules[0].onColor,'#00ff00');
  assert.equal(f.obj.fillAutomation.rules[0].mode,'threshold');
  assert.equal(f.calls.paint,1);assert.equal(f.calls.full,0);assert.equal(f.ctx.document.activeElement,f.focus);
  assert.equal(f.dirty[0].value,true);assert.equal(f.dirty[0].options.refreshReferences,false);
  assert.equal(f.dirty[0].options.refreshSubscriptions,false);
  assert.equal(f.history.length,1);assert.equal(JSON.parse(f.history[0]).fillAutomation,undefined,'undo captures the original object before mutation');
});

test('source edits still request reference and subscription updates with a local repaint',()=>{
  const f=colorEditor();vm.runInContext(`updateRectColorDraft({connection_id:'NewPLC',tag:'Pump.Running'})`,f.ctx);
  assert.equal(f.obj.fillAutomation.rules[0].connection_id,'NewPLC');
  assert.equal(f.dirty[0].options.refreshReferences,true);assert.equal(f.dirty[0].options.refreshSubscriptions,true);
  assert.equal(f.calls.full,0);
});

test('missing local drawing host falls back to a full repaint',()=>{
  const f=colorEditor(false);vm.runInContext(`updateRectColorDraft({fillColor:'#0000ff'})`,f.ctx);
  assert.equal(f.calls.full,1);assert.equal(f.obj.fillAutomation.rules[0].onColor,'#0000ff');
});

test('local repaint preserves neighboring hosts and repaints the owning group for nested selections',()=>{
  const child={type:'ellipse',id:'child'},group={type:'group',id:'parent',children:[child]},other={id:'other'};
  const host={isConnected:true},neighbor={isConnected:true};const paints=[];let overlays=0,metadata=0;
  const ctx=vm.createContext({isEditMode:true,currentScreenObj:{objects:[group,other]},groupEditStack:[group],
    renderedElementMeta:[{index:0,el:host},{index:1,el:neighbor}],child,
    buildAliasPreviewContext:()=>({}),resolveAliasObject:obj=>obj,getDisplayObject:obj=>obj,
    paintRuntimeRegion:(el,obj)=>paints.push({el,obj}),buildGroupEditMeta:()=>metadata++,updateSelectionOverlays:()=>overlays++,console});
  include(ctx,'const repaintEditorColorObject =','const updateRuntimeObjects =');
  assert.equal(vm.runInContext('repaintEditorColorObject(child)',ctx),true);
  assert.equal(paints.length,1);assert.equal(paints[0].el,host);assert.equal(paints[0].obj,group);
  assert.equal(ctx.renderedElementMeta[1].el,neighbor);assert.equal(metadata,1);assert.equal(overlays,1);
});

test('optional scans do not prevent dirty state or saved screen cache updates',()=>{
  const calls={references:0,subscriptions:0};const ctx=vm.createContext({poseEditSession:null,isDirty:false,
    currentScreenObj:{objects:[]},currentScreenId:'Screen',screenCache:new Map(),screenTitle:null,screenSaveBtn:null,
    scheduleWsSubscribeRefresh:()=>calls.subscriptions++,scheduleReferenceHealthRefresh:()=>calls.references++});
  include(ctx,'const setDirty =','const confirmLoseUnsavedChanges =');
  vm.runInContext('setDirty(true,{refreshReferences:false,refreshSubscriptions:false})',ctx);
  assert.equal(ctx.isDirty,true);assert.equal(ctx.screenCache.get('Screen'),ctx.currentScreenObj);
  assert.equal(calls.references,0);assert.equal(calls.subscriptions,0);
  vm.runInContext('setDirty(true)',ctx);assert.equal(calls.references,1);assert.equal(calls.subscriptions,1);
});
