const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function context() {
  const ctx = vm.createContext({
    HmiLayers: require('../public/js/layers'), isEditMode: false, currentScreenAliasContext: {},
    tagValueCache: new Map(), runtimeAutomationStateCache: new WeakMap(), runtimeLayerVisibilityCache: new WeakMap(),
    normalizeTagCacheKey: (c,t) => `${c}/${t}`, activeTagInfoCache: new Map(),
    resolveAliasObject: (layer, aliases) => ({...layer, visibility: {...layer.visibility, tag: aliases.tag || layer.visibility?.tag}}),
    evaluateVisibilityExpression: expression => expression === '1' ? true : expression === '0' ? false : null,
    document: {timeline:{currentTime:0}}, performance:{now:()=>0},
    getDisplayObject: obj=>obj, getObjectBounds:()=>({x:0,y:0,width:50,height:50}), pointInBox:()=>true,
  });
  for (const name of ['coerceTagBoolean','coerceTagNumber','getAutomationState','evaluateVisibilityRule','applyVisibilityFlash','shouldRenderObject','shouldDrawLayer','findHitInObjectList']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf('\n};',start)+3),ctx);
  }
  return ctx;
}
test('layer automation overrides saved visibility, retains missing updates, and leaves editor Show independent',()=>{
  const ctx=context();
  ctx.layer={hidden:true,editorVisible:true,visibility:{enabled:true,connection_id:'test',tag:'Visible',mode:'equals',match:'1'}};
  ctx.tagValueCache.set('test/Visible',1);
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),true);
  ctx.tagValueCache.clear();
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),true);
  ctx.tagValueCache.set('test/Visible',0);
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),false);
  ctx.isEditMode=true;
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),true);
  ctx.layer.editorVisible=false;
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),false);
  ctx.isEditMode=false;ctx.layer.visibility.enabled=false;
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),false);
  ctx.layer.hidden=false;
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),true);
});
test('constant expression changes update the whole layer',()=>{
  const ctx=context();ctx.layer={hidden:true,visibility:{enabled:true,sourceType:'expression',expression:'1'}};
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),true);
  ctx.layer.visibility.expression='0';
  assert.equal(vm.runInContext('shouldDrawLayer(layer)',ctx),false);
});
test('hidden layer hit targets track the source and viewport alias context',()=>{
  const ctx=context();
  ctx.screen={layers:[{id:'base'},{id:'overlay',hidden:true,visibility:{enabled:true,connection_id:'test',tag:'{alias:Visible}',mode:'equals',match:'1'}}],objects:[{type:'rect',layerId:'base'},{type:'rect',layerId:'overlay'}]};ctx.aliases={tag:'Resolved'};
  ctx.tagValueCache.set('test/Resolved',0);
  assert.equal(vm.runInContext('findHitInObjectList(screen.objects,{x:1,y:1},[],screen,aliases).path[0]',ctx),0);
  ctx.tagValueCache.set('test/Resolved',1);
  assert.equal(vm.runInContext('findHitInObjectList(screen.objects,{x:1,y:1},[],screen,aliases).path[0]',ctx),1);
});
