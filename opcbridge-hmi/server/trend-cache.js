'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const stripJsonComments=require('strip-json-comments');
const MAX_TAGS=256, MAX_BUCKETS=250000, MAX_FILE_BYTES=96*1024*1024, DAY=86400000;
const tagKey=(connection,name)=>JSON.stringify([connection,name]);
async function savedTrendScopes(roots){
  const scopes=new Map();
  async function walk(dir){
    let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
    for(const entry of entries){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory())await walk(file);
      else if(entry.isFile()&&/\.(screen|jsonc)$/i.test(entry.name)){
        if((await fs.stat(file)).size>32*1024*1024)throw new Error('Trend screen exceeds 32 MB.');
        const screen=JSON.parse(stripJsonComments(await fs.readFile(file,'utf8')));
        function visit(value){
          if(!value||typeof value!=='object')return;
          if(value.panelMode==='trend'&&value.trendSource!=='historian'){
            const retention=Math.max(60000,Math.min(31*DAY,Number(value.trendWindowMs)||7200000));
            for(const p of (Array.isArray(value.pens)?value.pens:[]).slice(0,12)){
              if(p.enabled===false||p.source==='constant'||!p.connection_id||!p.tag)continue;
              // Unresolved alias templates cannot be collected independently of a viewer.
              if(/\{alias:/i.test(p.connection_id+p.tag))continue;
              const key=tagKey(String(p.connection_id),String(p.tag));
              const old=scopes.get(key);
              scopes.set(key,{connection_id:String(p.connection_id),name:String(p.tag),retention:Math.max(retention,old?.retention||0)});
              if(scopes.size>MAX_TAGS)throw new Error(`Rolling trends support at most ${MAX_TAGS} distinct tags per HMI server.`);
            }
          }
          for(const [key,child]of Object.entries(value))if(!['importInfo','referenceHealth','externalReferences'].includes(key)&&child&&typeof child==='object'){
            if(Array.isArray(child))child.forEach(visit);else visit(child);
          }
        }
        visit(screen);
      }
    }
  }
  for(const root of [...new Set(roots)])await walk(root);
  return scopes;
}
class TrendCache{
  constructor({readConfig,screenRoots,file,request=fetch,now=Date.now}){
    Object.assign(this,{readConfig,screenRoots,file,request,now});
    this.scopes=new Map();this.entries=new Map();this.client=`hmi-trends-${crypto.createHash('sha256').update(os.hostname()+':'+file).digest('hex').slice(0,16)}`;
    this.status={error:'',persistence_error:'',tags:0};this.running=false;this.endpoint='';this.renewAt=0;this.scanAt=0;this.flushAt=0;this.started=now();
  }
  async start(){
    if(this.timer)return;
    try{
      const stat=await fs.stat(this.file);if(stat.size>MAX_FILE_BYTES)throw new Error('Trend cache file is too large.');
      const data=JSON.parse(await fs.readFile(this.file,'utf8'));
      if(data.version===1&&typeof data.endpoint==='string')this.endpoint=data.endpoint;
      if(data.version===1&&Array.isArray(data.entries))for(const [key,value]of data.entries.slice(0,MAX_TAGS)){
        if(typeof key==='string'&&Array.isArray(value.rows))this.entries.set(key,{...value,rows:value.rows.slice(-6000).filter(p=>Number.isFinite(p.t)&&p.t<=this.now()&&Number.isFinite(p.count)&&p.count>=0&&Number.isFinite(p.sum)&&Number.isFinite(p.bad)&&p.bad>=0&&(p.min===null||Number.isFinite(p.min))&&(p.max===null||Number.isFinite(p.max)))});
      }
    }catch(error){if(error.code!=='ENOENT')this.status.persistence_error=`Could not restore trend cache: ${error.message}`;}
    await this.tick();
    this.timer=setInterval(()=>void this.tick(),1000);this.timer.unref();
  }
  async json(url,body){
    const response=await this.request(url,{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error(`OPCBridge HTTP ${response.status}`);
    const result=await response.json();if(result.ok===false)throw new Error(result.error||'OPCBridge request failed');return result;
  }
  demand(){return {client_id:this.client,owner:'hmi-trend-cache',tags:[...this.scopes.values()].map(s=>`${s.connection_id}:${s.name}`)};}
  async release(endpoint){if(endpoint)await this.json(`${endpoint}/polling/demand/release`,this.demand());}
  reconcile(scopes){
    this.scopes=scopes;const perTag=Math.max(1,Math.min(6000,Math.floor(MAX_BUCKETS/Math.max(1,scopes.size))));
    for(const key of this.entries.keys())if(!scopes.has(key))this.entries.delete(key);
    for(const [key,scope]of scopes){
      const width=Math.max(1000,Math.ceil(scope.retention/perTag/1000)*1000);
      const entry=this.entries.get(key)||{rows:[],started_at_ms:this.now()};
      // Coarsen when a longer window is added, retaining count/min/max summaries.
      const merged=new Map();
      for(const row of entry.rows){
        if(row.t<this.now()-scope.retention)continue;
        const t=Math.floor(row.t/width)*width;const old=merged.get(t);
        merged.set(t,old?this.combine(old,row,t):{...row,t});
      }
      entry.rows=[...merged.values()].sort((a,b)=>a.t-b.t).slice(-perTag);entry.width=width;entry.retention=scope.retention;entry.limit=perTag;
      this.entries.set(key,entry);
    }
    this.status.tags=scopes.size;
  }
  combine(a,b,t=a.t){return {t,count:a.count+b.count,sum:a.sum+b.sum,min:a.min===null?b.min:b.min===null?a.min:Math.min(a.min,b.min),max:a.max===null?b.max:b.max===null?a.max:Math.max(a.max,b.max),bad:a.bad+b.bad};}
  sample(rows,at){
    const found=new Map((Array.isArray(rows)?rows:[]).map(row=>[tagKey(row.connection_id,row.name),row]));
    for(const [key,entry]of this.entries){
      const row=found.get(key);
      const value=typeof row?.value==='boolean'?Number(row.value):row?.value;
      const good=row&&row.enabled!==false&&row.has_snapshot!==false&&(row.quality===1||row.quality==='GOOD')&&(!row.polling_state||row.polling_state==='active')&&typeof value==='number'&&Number.isFinite(value);
      if(!good&&!entry.rows.length)continue;
      const t=Math.floor(at/entry.width)*entry.width;
      const point={t,count:good?1:0,sum:good?value:0,min:good?value:null,max:good?value:null,bad:good?0:1};
      const last=entry.rows.at(-1);
      if(last?.t===t)entry.rows[entry.rows.length-1]=this.combine(last,point);
      else {
        if(last&&t>last.t+entry.width){
          entry.rows.push({t:last.t+entry.width,count:0,sum:0,min:null,max:null,bad:1});
          if(t-entry.width>last.t+entry.width)entry.rows.push({t:t-entry.width,count:0,sum:0,min:null,max:null,bad:1});
        }
        entry.rows.push(point);
      }
      if(entry.rows.length>entry.limit)entry.rows.splice(0,entry.rows.length-entry.limit);
      const cutoff=at-entry.retention;while(entry.rows.length&&entry.rows[0].t<cutoff)entry.rows.shift();
    }
  }
  async tick(){
    if(this.running||this.stopping)return;
    this.running=true;
    try{
      const now=this.now();
      const {config}=await this.readConfig();const core=config.opcbridge||{};
      const endpoint=`http://${core.host||'127.0.0.1'}:${Number(core.httpPort)||8080}`;
      if(endpoint!==this.endpoint){
        if(this.endpoint)await this.release(this.endpoint).catch(()=>{});
        this.endpoint=endpoint;this.entries.clear();this.scanAt=0;this.renewAt=0;
      }
      if(!this.scanAt||now-this.scanAt>=10000){
        const scopes=await savedTrendScopes(this.screenRoots);
        this.reconcile(scopes);this.scanAt=now;this.renewAt=0;
      }
      if(!this.renewAt||now-this.renewAt>=20000){
        await this.json(`${this.endpoint}/polling/demand/register`,this.demand());this.renewAt=now;
      }
      if(this.scopes.size){
        const data=await this.json(`${this.endpoint}/tags/query`,{tags:[...this.scopes.values()].map(({connection_id,name})=>({connection_id,name}))});
        this.sample(data.tags,this.now());
      }
      this.status.error='';
      if(!this.flushAt||now-this.flushAt>=30000){await this.flush();this.flushAt=now;}
    }catch(error){this.status.error=error.message;this.sample([],this.now());}
    finally{this.running=false;}
  }
  async flush(){
    try{
      await fs.mkdir(path.dirname(this.file),{recursive:true});
      const text=JSON.stringify({version:1,endpoint:this.endpoint,entries:[...this.entries]});
      if(Buffer.byteLength(text)>MAX_FILE_BYTES)throw new Error('Trend cache size limit reached.');
      await fs.writeFile(this.file+'.tmp',text,{mode:0o600});await fs.rename(this.file+'.tmp',this.file);this.status.persistence_error='';
    }catch(error){this.status.persistence_error=error.message;}
  }
  query(connection,tag,from,to){
    const entry=this.entries.get(tagKey(connection,tag));
    const width=Math.max(entry?.width||1000,Math.ceil((to-from)/1200/1000)*1000),grouped=new Map();
    for(const row of entry?.rows||[]){if(row.t<from||row.t>to)continue;const t=Math.floor(row.t/width)*width;const old=grouped.get(t);grouped.set(t,old?this.combine(old,row,t):{...row,t});}
    return {ok:true,source:'cache',collecting:this.scopes.has(tagKey(connection,tag)),started_at_ms:entry?.started_at_ms||null,retention_ms:entry?.retention||0,
      error:this.status.error||this.status.persistence_error||'',
      buckets:[...grouped.values()].map(p=>({bucket_start_ms:p.t,bucket_end_ms:p.t+width,count:p.count,avg:p.bad?null:p.count?p.sum/p.count:null,min:p.bad?null:p.min,max:p.bad?null:p.max,quality:p.bad?0:1}))};
  }
  async stop(){
    this.stopping=true;clearInterval(this.timer);
    // Finish any in-flight tick before its final atomic checkpoint.
    while(this.running)await new Promise(resolve=>setTimeout(resolve,20));
    await this.release(this.endpoint).catch(()=>{});await this.flush();
  }
}
module.exports={TrendCache,savedTrendScopes,tagKey};
