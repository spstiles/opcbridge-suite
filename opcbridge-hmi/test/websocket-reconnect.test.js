const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
function fixture(){
 const timers=new Map();let timerId=0;const sockets=[];let seedCount=0;
 class Socket {
  static CONNECTING=0;static OPEN=1;static CLOSED=3;
  constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}
  send(value){this.sent.push(JSON.parse(value));}
  close(){this.readyState=3;}
  open(){this.readyState=1;this.onopen?.();}
 }
 const context=vm.createContext({WebSocket:Socket,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),
  document:{visibilityState:'visible'},getWsUrl:()=> 'ws://test:8090',updateWsStatus:()=>{},
  collectActiveWsSubscriptions:()=>['PLC:Flow'],wsTagKeyToQueryItem:()=>({connection_id:'PLC',name:'Flow'}),normalizeTagCacheKey:(c,n)=>`${c}.${n}`,
  scheduleTagSeedRefresh:()=>{seedCount++;}});
 vm.runInContext('let wsClient=null,wsConnected=false,wsCurrentUrl="",wsReconnectTimer=null,wsConnectTimer=null,wsSubscribeTimer=null,wsLastSubscribeFingerprint="";const activeTagInfoCache=new Map();',context);
 vm.runInContext(source.slice(source.indexOf('const scheduleWsReconnect ='),source.indexOf('const normalizeTagCacheKey =')),context);
 vm.runInContext(source.slice(source.indexOf('const wsSendSubscribe ='),source.indexOf('document.addEventListener("visibilitychange"')),context);
 vm.runInContext(source.slice(source.indexOf('const scheduleWsSubscribeRefresh ='),source.indexOf('const getCssNumber =')),context);
 return {sockets,run:code=>vm.runInContext(code,context),seedCount:()=>seedCount,
  fire(delay){const entry=[...timers.entries()].find(([,t])=>t.delay===delay);assert.ok(entry,`missing ${delay}ms timer`);timers.delete(entry[0]);entry[1].fn();},
  pending:delay=>[...timers.values()].filter(t=>t.delay===delay).length};
}
test('core restart reconnects and re-registers demand without a page reload',()=>{
 const f=fixture();f.run('connectWebSocket()');f.sockets[0].open();f.fire(100);
 assert.deepEqual(f.sockets[0].sent.map(s=>s.type),['register_demand','subscribe']);
 f.sockets[0].onclose();f.fire(3000);f.sockets[1].open();f.fire(100);
 assert.deepEqual(f.sockets[1].sent.map(s=>s.type),['register_demand','subscribe']);
 assert.equal(f.sockets[1].sent[0].tags[0],'PLC:Flow');assert.equal(f.seedCount(),2);
});
test('error without a close event still retries',()=>{
 const f=fixture();f.run('connectWebSocket()');f.sockets[0].onerror();
 assert.equal(f.pending(3000),1);f.fire(3000);assert.equal(f.sockets.length,2);
});
test('a stuck connecting socket times out and repeated failures keep retrying',()=>{
 const f=fixture();f.run('connectWebSocket()');f.fire(10000);f.fire(3000);
 f.sockets[1].onerror();f.fire(3000);assert.equal(f.sockets.length,3);
 f.sockets[2].open();f.fire(100);assert.equal(f.run('wsConnected'),true);
});
test('events from an obsolete socket cannot disconnect its replacement',()=>{
 const f=fixture();f.run('connectWebSocket()');const obsoleteClose=f.sockets[0].onclose;
 obsoleteClose();f.fire(3000);f.sockets[1].open();obsoleteClose();
 assert.equal(f.run('wsConnected'),true);assert.equal(f.pending(3000),0);
});
