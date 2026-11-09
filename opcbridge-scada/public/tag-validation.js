/* Explicit, bounded validation demand. Never writes tag values. */
class TagValidation {
  constructor({post, clientId, progress=()=>{}, now=Date.now, wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)), batchSize=64, timeoutMs=30000}) {
    Object.assign(this,{post,clientId,progress,now,wait,batchSize:Math.max(1,Math.min(64,batchSize)),timeoutMs:Math.max(1000,Math.min(120000,timeoutMs))});
    this.running=false;this.cancelled=false;this.results=[];
  }
  cancel(){this.cancelled=true;}
  body(tags){return {client_id:this.clientId,owner:'opcbridge-scada-validation',...(tags?{tags:tags.map(t=>`${t.connection_id}:${t.name}`)}:{})};}
  async release(){await this.post('/polling/demand/release',this.body()).catch(()=>{});}
  async run(input){
    if(this.running)throw Error('Validation is already running.');
    this.running=true;this.cancelled=false;this.results=[];this.error='';
    const unique=new Map();
    for(const row of input||[]){const connection_id=String(row.connection_id||''),name=String(row.name||row.tag||'');if(connection_id&&name)unique.set(JSON.stringify([connection_id,name]),{...row,connection_id,name});}
    const rows=[...unique.values()],pending=rows.filter(t=>t.enabled!==false);
    this.total=rows.length;
    const add=(row,status,detail)=>this.results.push({...row,status,detail,checked_at_ms:this.now()});
    rows.filter(t=>t.enabled===false).forEach(t=>add(t,'disabled','Disabled tags are not read.'));
    const notify=()=>this.progress({total:this.total,checked:this.results.length,results:this.results,running:this.running,error:this.error});
    notify();
    try{
      for(let offset=0;offset<pending.length&&!this.cancelled;offset+=this.batchSize){
        const batch=pending.slice(offset,offset+this.batchSize);
        // Capture before activating demand: cached good values alone are not proof
        // that an otherwise inactive tag can currently be read.
        const baseline=await this.post('/tags/query',{tags:batch.map(({connection_id,name})=>({connection_id,name}))});
        const key=t=>JSON.stringify([t.connection_id,t.name]);
        const before=new Map((baseline.tags||[]).map(t=>[key(t),t]));
        if(this.cancelled)break;
        await this.post('/polling/demand/register',this.body(batch));
        const started=this.now();let renewed=started;const remaining=new Map(batch.map(t=>[key(t),t]));
        try{
          while(remaining.size&&!this.cancelled&&this.now()-started<this.timeoutMs){
            await this.wait(500);if(this.cancelled)break;
            if(this.now()-renewed>=10000){await this.post('/polling/demand/register',this.body([...remaining.values()]));renewed=this.now();}
            const response=await this.post('/tags/query',{tags:[...remaining.values()].map(({connection_id,name})=>({connection_id,name}))});
            for(const row of response.tags||[]){
              const id=key(row),original=remaining.get(id);if(!original)continue;
              const old=before.get(id),timestamp=Number(row.timestamp_ms),oldTimestamp=Number(old?.timestamp_ms);
              const fresh=row.has_snapshot!==false&&row.timestamp_ms!=null&&(!old||old.has_snapshot===false||old.timestamp_ms==null||timestamp>oldTimestamp);
              const activated=['inactive','waiting'].includes(old?.polling_state)&&['active','error'].includes(row.polling_state);
              if(row.enabled===false){add(original,'disabled','Tag was disabled during validation.');remaining.delete(id);}
              else if(row.handle_ok===false){add(original,'read_error',row.reason||'No usable tag handle. Check the address, datatype, and connection.');remaining.delete(id);}
              else if(fresh||activated){
                if(row.quality===1||String(row.quality).toUpperCase()==='GOOD')add(original,'good','A refreshed good sample was observed.');
                else add(original,'read_error',row.reason||'Read returned bad quality. Check the tag configuration and connection; this may be temporary.');
                remaining.delete(id);
              }
            }
            notify();
          }
          for(const row of remaining.values())add(row,this.cancelled?'untested':'unverified',this.cancelled?'Cancelled before verification.':'No refreshed sample within the batch timeout. This does not prove the tag is invalid.');
        }finally{await this.release();}
        notify();
      }
    }catch(error){this.error=String(error.message||error);}
    finally{
      const completed=new Set(this.results.map(t=>JSON.stringify([t.connection_id,t.name])));
      for(const row of rows)if(!completed.has(JSON.stringify([row.connection_id,row.name])))add(row,'untested',this.error||'Cancelled before verification.');
      await this.release();this.running=false;notify();
    }
    return this.results;
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports=TagValidation;
