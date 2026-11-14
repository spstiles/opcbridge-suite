const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function setup(loadScan=true){
  let fetches=0,panels=0;
  const ctx=vm.createContext({availableScreens:[{ref:'A'},{ref:'B'}],currentScreenId:'A',currentScreenObj:{issues:[{message:'A warning'}]},
    screenCache:new Map(),systemReferenceHealthBadge:null,console:{warn(){}},
    window:{requestAnimationFrame:fn=>fn()},fetch:async()=>{fetches++;return {ok:true,json:async()=>({parsed:{issues:[{message:'B warning'}]}})};},
    repairDuplicateImportIds(){},repairScreenTagConnections(){},evaluateReferenceHealthForScreen:screen=>screen.issues,
    renderCachedSystemReferenceHealth:()=>panels++});
  vm.runInContext(`let referenceHealthOverlay=null,systemReferenceHealthResults=new Map(),systemReferenceHealthScanPromise=null,systemReferenceHealthScanGeneration=0,systemReferenceHealthHasScan=false,systemReferenceHealthStale=false,systemReferenceHealthRevision=0,systemReferenceHealthProgress='';`,ctx);
  const include=(start,end)=>{const a=source.indexOf(start);vm.runInContext(source.slice(a,source.indexOf(end,a)),ctx);};
  include('const getSystemReferenceHealthSummary =','const evaluateReferenceHealthForScreen =');
  include('const invalidateSystemReferenceHealth =','const scheduleReferenceHealthRefresh =');
  if(loadScan)include('const scanSystemReferenceHealth =','let diagnosticsModeEnabled =');
  return {ctx,include,fetches:()=>fetches,panels:()=>panels,run:code=>vm.runInContext(code,ctx)};
}

test('completed results are reused and invalidation retains them without fetching',async()=>{
  const f=setup();await f.run('scanSystemReferenceHealth({force:true})');
  assert.equal(f.fetches(),1);assert.equal(f.run('systemReferenceHealthHasScan'),true);
  const results=f.run('systemReferenceHealthResults');assert.equal(results.size,2);
  await f.run('scanSystemReferenceHealth()');assert.equal(f.fetches(),1);
  f.run('invalidateSystemReferenceHealth()');assert.equal(f.run('systemReferenceHealthResults'),results);
  assert.match(f.run('getSystemReferenceHealthSummary()'),/out of date/);
  await f.run('scanSystemReferenceHealth()');assert.equal(f.fetches(),1);
  await f.run('scanSystemReferenceHealth({force:true})');assert.equal(f.fetches(),2);
  assert.equal(f.run('systemReferenceHealthStale'),false);
});

test('opening the panel displays cached results immediately and only its scan button requests a scan',async()=>{
  const f=setup(false);let scans=0;
  const button={addEventListener(name,fn){this[name]=fn;}};
  const overlay={setAttribute(){},addEventListener(){},querySelector:selector=>selector==='[data-system-ref-scan]'?button:null};
  f.ctx.document={createElement:()=>overlay,body:{appendChild(){}}};
  f.ctx.closeReferenceHealth=()=>{};
  // Install the real opener with a scan spy; list rendering is independently cached.
  const a=source.indexOf('const openSystemReferenceHealth =');
  vm.runInContext(source.slice(a,source.indexOf('const renderCachedSystemReferenceHealth =',a)),f.ctx);
  f.ctx.scanSystemReferenceHealth=()=>{scans++;};
  f.run('openSystemReferenceHealth()');assert.equal(scans,0);assert.equal(f.panels(),1);
  button.click();assert.equal(scans,1);
});

test('scans share in-flight work and leave previous results visible until completion',async()=>{
  const f=setup();let release;
  f.ctx.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({parsed:{issues:[]}})});});
  f.run(`systemReferenceHealthResults.set('Old',[{message:'Previous warning'}])`);
  const promise=f.run('scanSystemReferenceHealth({force:true})');
  await Promise.resolve();await Promise.resolve();
  assert.equal(f.run(`systemReferenceHealthResults.has('Old')`),true);
  f.run('invalidateSystemReferenceHealth()');
  release();await promise;
  assert.equal(f.run('systemReferenceHealthStale'),true,'edits during a scan cannot be called up to date');
  assert.equal(f.run(`systemReferenceHealthResults.has('Old')`),false);
});

test('failed screen reads are reported and cannot result in an all-valid system status',async()=>{
  const f=setup();f.ctx.fetch=async()=>({ok:false,status:503});
  await f.run('scanSystemReferenceHealth({force:true})');
  assert.equal(f.run('systemReferenceHealthResults.get("B")[0].category'),'screen');
  assert.equal(f.run('systemReferenceHealthStale'),true);
});
