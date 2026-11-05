const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {TrendCache,savedTrendScopes,tagKey}=require('../server/trend-cache');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hmi-trend-cache-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const screens=path.join(root,'screens');await fs.mkdir(screens);
 const file=path.join(screens,'test.screen');
 const write=async objects=>fs.writeFile(file,JSON.stringify({objects}));
 let now=2000000000000,value=4,fail=false;const calls=[];
 const options={readConfig:async()=>({config:{opcbridge:{host:'core',httpPort:8080}}}),screenRoots:[screens],file:path.join(root,'cache.json'),now:()=>now,
 request:async(url,options)=>{
  calls.push({url,body:options.body&&JSON.parse(options.body)});
  if(fail)throw Error('offline');
  return{ok:true,json:async()=>url.endsWith('/tags/query')?{tags:[{connection_id:'PLC',name:'Flow',quality:1,value,has_snapshot:true,polling_state:'active'}]}:{ok:true}};
 }};
 return{write,options,calls,setNow:n=>now=n,setValue:n=>value=n,setFail:n=>fail=n,now:()=>now};
}
const widget=(window=7200000)=>({panelMode:'trend',trendWindowMs:window,pens:[{connection_id:'PLC',tag:'Flow'},{source:'constant',connection_id:'PLC',tag:'Unused'}]});
test('saved trends deduplicate shared tags, use longest window, and exclude historian/constant pens',async t=>{
 const f=await fixture(t);await f.write([widget(),widget(259200000),{...widget(),trendSource:'historian',pens:[{connection_id:'PLC',tag:'HistoryOnly'}]}]);
 const scopes=await savedTrendScopes(f.options.screenRoots);
 assert.equal(scopes.size,1);assert.equal([...scopes.values()][0].retention,259200000);
});
test('cache collects without a browser, persists across restart, and releases deleted demand',async t=>{
 const f=await fixture(t);await f.write([widget()]);
 const cache=new TrendCache(f.options);await cache.start();
 clearInterval(cache.timer);
 assert.deepEqual(f.calls.find(c=>c.url.endsWith('/register')).body.tags,['PLC:Flow']);
 f.setNow(f.now()+3000);f.setValue(8);await cache.tick();
 let result=cache.query('PLC','Flow',f.now()-10000,f.now());
 assert.ok(result.buckets.some(p=>p.avg===4));assert.ok(result.buckets.some(p=>p.avg===8));
 await cache.stop();
 const restored=new TrendCache(f.options);await restored.start();clearInterval(restored.timer);
 assert.ok(restored.query('PLC','Flow',f.now()-10000,f.now()).buckets.some(p=>p.avg===4));
 await f.write([]);f.setNow(f.now()+11000);await restored.tick();
 assert.equal(restored.entries.size,0);
 assert.deepEqual(f.calls.filter(c=>c.url.endsWith('/register')).at(-1).body.tags,[]);
 await restored.stop();assert.ok(f.calls.some(c=>c.url.endsWith('/release')));
});
test('outages are gaps, retention prunes old data, and summaries preserve peaks',async t=>{
 const f=await fixture(t);await f.write([widget(60000)]);
 const cache=new TrendCache(f.options);await cache.tick();
 f.setNow(f.now()+2000);f.setValue(100);await cache.tick();
 f.setNow(f.now()+2000);f.setFail(true);await cache.tick();
 let result=cache.query('PLC','Flow',f.now()-10000,f.now());
 assert.ok(result.buckets.some(p=>p.max===100));assert.ok(result.buckets.some(p=>p.quality===0&&p.avg===null));
 f.setFail(false);f.setNow(f.now()+65000);await cache.tick();
 result=cache.query('PLC','Flow',f.now()-70000,f.now());
 assert.equal(result.buckets.length,1);assert.equal(result.buckets[0].avg,100);
 await cache.stop();
});
test('cache has strict per-tag storage bounds and failed checkpoint does not discard in-memory data',async t=>{
 const f=await fixture(t);await f.write([widget()]);const cache=new TrendCache(f.options);await cache.tick();
 const entry=cache.entries.get(tagKey('PLC','Flow'));entry.limit=3;
 for(let i=0;i<10;i++)cache.sample([{connection_id:'PLC',name:'Flow',value:i,quality:1}],f.now()+i*3000);
 assert.ok(entry.rows.length<=3);
 cache.file='/dev/null/not-a-file';await cache.flush();assert.ok(cache.status.persistence_error);assert.equal(cache.entries.size,1);
});
