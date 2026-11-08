const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {queryParameters,createTrendsRouter}=require('../server/trends');
test('trend historian requests use bounded ranges and bounded min/max buckets',()=>{
 const params=queryParameters({connection_id:'c',tag_name:'Flow',from_ms:0,to_ms:259200000},259200000);
 assert.equal(params.get('bucket'),'216s');assert.equal(params.get('limit'),'1500');
 assert.throws(()=>queryParameters({connection_id:'c',tag_name:'Flow',from_ms:0,to_ms:32*86400000}),/31 days/);
 assert.throws(()=>queryParameters({connection_id:'c',tag_name:'Flow',from_ms:'bad',to_ms:10}),/range/);
});
test('history endpoint relays only bounded queries to the configured historian and surfaces failures',async()=>{
 let url;let fail=false;
 const app=express();app.use('/api/trends',createTrendsRouter({readConfig:async()=>({config:{historian:{host:'127.0.0.1',httpPort:8096}}}),request:async value=>{url=value;return {ok:!fail,json:async()=>fail?{ok:false,error:'Database offline'}:{ok:true,buckets:[{bucket_start_ms:100,avg:5,min:2,max:8}]}};}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}/api/trends/query?source=historian&connection_id=c&tag_name=Flow&from_ms=0&to_ms=1000`;
 try{
  const response=await fetch(base);assert.equal(response.status,200);assert.equal((await response.json()).buckets[0].max,8);assert.match(url,/127.0.0.1:8096\/query/);
  fail=true;const failure=await fetch(base);assert.equal(failure.status,502);assert.equal((await failure.json()).error,'Database offline');
  assert.equal((await fetch(base.replace('from_ms=0','from_ms=invalid'))).status,400);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('HMI settings cannot persist a separate historian endpoint',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../server/app.js'),'utf8');
 let written;
 const c=vm.createContext({CONFIG_PATH:'not-a-real-config',fsp:{writeFile:async(_path,text)=>{written=text;}}});
 vm.runInContext(source.slice(source.indexOf('const writeConfig ='),source.indexOf('const normalizeSvgName =')),c);
 await vm.runInContext('writeConfig({historian:{host:"history-host",httpPort:12345}})',c);
 const parsed=JSON.parse(written.replace(/^\s*\/\/.*$/gm,''));
 assert.equal(parsed.historian,undefined);
});
test('default query uses rolling cache and never calls the historian',async()=>{
 let args;
 const app=express();app.use('/api/trends',createTrendsRouter({readConfig:async()=>({config:{}}),cache:{status:{tags:1},query:(...value)=>{args=value;return{ok:true,source:'cache',collecting:true,buckets:[]};}},request:()=>assert.fail('cache query contacted historian')}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/trends/query?connection_id=PLC&tag_name=Flow&from_ms=0&to_ms=1000`);
  assert.equal(response.status,200);assert.equal((await response.json()).source,'cache');assert.deepEqual(args,['PLC','Flow',0,1000]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
