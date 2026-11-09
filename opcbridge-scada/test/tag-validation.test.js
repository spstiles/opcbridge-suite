const test=require('node:test'),assert=require('node:assert/strict');
const TagValidation=require('../public/tag-validation');
const row=(name,extra={})=>({connection_id:'PLC',name,datatype:'float32',enabled:true,...extra});
function fixture(options={}){
 let now=1000,active=false;const calls=[];
 const runner=new TagValidation({clientId:'test',now:()=>now,wait:async ms=>{now+=ms;},timeoutMs:1000,
  post:async(path,body)=>{
   calls.push({path,body});
   if(path.endsWith('/register'))active=true;
   if(path.endsWith('/release'))active=false;
   if(path==='/tags/query')return {tags:body.tags.map(t=>({...t,has_snapshot:true,handle_ok:true,timestamp_ms:active?now:1,quality:1,polling_state:active?'active':'inactive'}))};
   return {ok:true};
  },...options});
 return {runner,calls};
}
test('validation reads bounded batches, skips disabled tags, and releases its own demand',async()=>{
 const {runner,calls}=fixture({batchSize:2});
 const result=await runner.run([row('A'),row('B'),row('C'),row('D',{enabled:false}),row('A')]);
 assert.equal(result.length,4);assert.equal(result.filter(t=>t.status==='good').length,3);
 assert.equal(result.find(t=>t.name==='D').status,'disabled');
 assert.deepEqual(calls.filter(c=>c.path.endsWith('/register')).map(c=>c.body.tags),[['PLC:A','PLC:B'],['PLC:C']]);
 assert.ok(calls.filter(c=>c.path.endsWith('/release')).length>=2);
 assert.ok(calls.every(c=>['/tags/query','/polling/demand/register','/polling/demand/release'].includes(c.path)));
 assert.equal(runner.running,false);
});
test('cached values do not falsely validate tags; timeout is unverified, not invalid',async()=>{
 const {runner}=fixture({post:async(path,body)=>path==='/tags/query'?{tags:body.tags.map(t=>({...t,timestamp_ms:1,has_snapshot:true,quality:1,polling_state:'active'}))}:{ok:true}});
 const result=await runner.run([row('A')]);assert.equal(result[0].status,'unverified');
});
test('refreshed bad quality and missing handles are failures with honest diagnostics',async()=>{
 let count=0;
 const {runner}=fixture({post:async(path,body)=>{
  if(path!='/tags/query')return {ok:true};count++;
  return {tags:body.tags.map(t=>({...t,timestamp_ms:count,has_snapshot:true,quality:0,handle_ok:t.name!=='NoHandle',reason:t.name==='NoHandle'?'bad_handle':''}))};
 }});
 const result=await runner.run([row('Bad'),row('NoHandle')]);
 assert.ok(result.every(t=>t.status==='read_error'));assert.match(result[0].detail,/temporary/);assert.equal(result[1].detail,'bad_handle');
});
test('cancellation leaves remaining tags untested and releases demand',async()=>{
 const f=fixture();const original=f.runner.wait;
 f.runner.wait=async ms=>{await original(ms);f.runner.cancel();};
 const result=await f.runner.run([row('A'),row('B')]);
 assert.ok(result.every(t=>t.status==='untested'));assert.ok(f.calls.some(c=>c.path.endsWith('/release')));assert.equal(f.runner.running,false);
});
test('registration failure is reported and cleanup still runs',async()=>{
 const calls=[];const {runner}=fixture({post:async path=>{calls.push(path);if(path.endsWith('/register'))throw Error('offline');return {tags:[]};}});
 const result=await runner.run([row('A')]);assert.equal(result[0].status,'untested');assert.equal(runner.error,'offline');assert.ok(calls.includes('/polling/demand/release'));
});
