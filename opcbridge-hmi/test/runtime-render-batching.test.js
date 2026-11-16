const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function fixture(){
 const timers=[],frames=[],painted=[];let deferred=0;
 const ctx=vm.createContext({runtimeDirtyKeys:new Set(),runtimeFullRenderRequested:false,wsRuntimeRenderRaf:null,isEditMode:false,currentPopupScreenId:null,
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},window:{requestAnimationFrame:fn=>{frames.push(fn);return frames.length;}},
  isEditingGestureActive:()=>false,isKeypadOpen:false,shouldDeferRuntimeScreenRender:()=>false,scheduleDeferredRuntimeScreenRender:()=>deferred++,
  updateRuntimeObjects:keys=>{painted.push([...keys]);return true;},renderScreen:()=>painted.push('full')});
 const start=source.indexOf('let runtimeRenderTimer =');vm.runInContext(source.slice(start,source.indexOf('const normalizeWsTagKey',start)),ctx);
 return {ctx,timers,frames,painted,deferred:()=>deferred,schedule:keys=>{ctx.keys=keys;vm.runInContext('scheduleRuntimeRender(keys)',ctx);}};
}
test('a burst of changed tags shares one bounded paint batch without dropping keys',()=>{
 const f=fixture();for(let i=0;i<100;i++)f.schedule([`PLC:Tag${i}`]);
 assert.equal(f.timers.length,1);assert.equal(f.timers[0].ms,100);assert.equal(f.frames.length,0);assert.equal(f.ctx.runtimeDirtyKeys.size,100);
 f.timers.shift().fn();assert.equal(f.frames.length,1);f.schedule(['PLC:Later']);assert.equal(f.timers.length,0);
 f.frames.shift()();assert.equal(f.painted.length,1);assert.equal(f.painted[0].length,101);assert.equal(f.ctx.runtimeDirtyKeys.size,0);
 f.schedule(['PLC:Next']);assert.equal(f.timers.length,1);
});
test('full render requests survive coalescing and interaction deferral keeps dirty keys',()=>{
 const f=fixture();f.schedule(['PLC:One']);f.schedule(null);f.timers.shift().fn();f.frames.shift()();assert.deepEqual(f.painted,['full']);
 f.ctx.shouldDeferRuntimeScreenRender=()=>true;f.schedule(['PLC:Two']);f.timers.shift().fn();f.frames.shift()();assert.equal(f.deferred(),1);assert.equal(f.ctx.runtimeDirtyKeys.has('PLC:Two'),true);
 f.ctx.shouldDeferRuntimeScreenRender=()=>false;f.schedule([]);f.timers.shift().fn();f.frames.shift()();assert.deepEqual(f.painted[1],['PLC:Two']);
});
test('animation snapshots select only animations belonging to a region',()=>{
 const ctx=vm.createContext({});const start=source.indexOf('function animationsWithin(');vm.runInContext(source.slice(start,source.indexOf('const paintRuntimeRegion =',start)),ctx);
 const target={},other={},animation={effect:{target}},unrelated={effect:{target:other}};let queried=0;
 ctx.element={contains:node=>node===target,getAnimations:()=>{queried++;return[animation];}};ctx.snapshot=[animation,unrelated,{effect:null}];
 assert.deepEqual(Array.from(vm.runInContext('animationsWithin(element,snapshot)',ctx)),[animation]);assert.equal(queried,0);
 assert.deepEqual(Array.from(vm.runInContext('animationsWithin(element,null)',ctx)),[animation]);assert.equal(queried,1);
});
