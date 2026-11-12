const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../public/js/hmi.js'),'utf8');
function setup(savedWidth) {
  const listeners = new Map(); const storage = new Map(); const attributes = {};
  if (savedWidth) storage.set('opcbridge-hmi.objectExplorer.width',String(savedWidth));
  let floating = false;
  const panel = {style:{width:'260px'},classList:{contains:()=>floating},getBoundingClientRect:()=>({width:parseFloat(panel.style.width)})};
  const handle = {addEventListener(type,fn){this[type]=fn;},setAttribute:(key,value)=>{attributes[key]=value;}};
  const body = {style:{cursor:''}};
  const ctx = vm.createContext({isEditMode:true,document:{body,getElementById:id=>id==='objectExplorer'?panel:handle},
    window:{innerWidth:2000,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
      addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)} });
  const start=source.indexOf('const OBJECT_EXPLORER_WIDTH_KEY =');
  vm.runInContext(source.slice(start,source.indexOf('\nrestoreObjectExplorerDock();',start)),ctx);
  vm.runInContext('restoreObjectExplorerWidth(); initializeObjectExplorerResize()',ctx);
  const event = extra => ({button:0,pointerId:1,clientX:260,preventDefault(){},stopPropagation(){},...extra});
  return {ctx,panel,handle,body,listeners,storage,attributes,event,float:()=>{floating=true;}};
}

test('right edge drag resizes the dock column live and saves its width on release', () => {
  const f=setup(); f.handle.pointerdown(f.event());
  assert.equal(f.body.style.cursor,'col-resize');
  f.listeners.get('pointermove')(f.event({clientX:340}));
  assert.equal(f.panel.style.width,'340px');
  assert.equal(f.storage.size,0,'do not persist every move');
  f.listeners.get('pointermove')(f.event({pointerId:2,clientX:500}));
  assert.equal(f.panel.style.width,'340px');
  f.listeners.get('pointerup')(f.event({clientX:340}));
  assert.equal(f.storage.get('opcbridge-hmi.objectExplorer.width'),'340');
  assert.equal(f.body.style.cursor,''); assert.equal(f.listeners.size,0);
  assert.equal(f.attributes['aria-valuenow'],'340');
});

test('width is restored and clamped to preserve workspace space', () => {
  const f=setup(400); assert.equal(f.panel.style.width,'400px');
  vm.runInContext('applyObjectExplorerWidth(9999)',f.ctx); assert.equal(f.panel.style.width,'700px');
  vm.runInContext('applyObjectExplorerWidth(1)',f.ctx); assert.equal(f.panel.style.width,'200px');
  f.ctx.window.innerWidth=1000;
  vm.runInContext('restoreObjectExplorerWidth()',f.ctx); assert.equal(f.panel.style.width,'350px');
  assert.equal(f.storage.get('opcbridge-hmi.objectExplorer.width'),'400','temporary viewport clamp preserves preferred width');
});

test('keyboard resizing works on the dock and the dock handle is inactive while floating', () => {
  const f=setup(); f.handle.keydown(f.event({key:'ArrowRight'})); assert.equal(f.panel.style.width,'270px');
  f.handle.keydown(f.event({key:'ArrowLeft',shiftKey:true})); assert.equal(f.panel.style.width,'269px');
  f.float(); f.handle.pointerdown(f.event()); assert.equal(f.listeners.size,0);
  f.handle.keydown(f.event({key:'ArrowRight'})); assert.equal(f.panel.style.width,'269px');
});
