/* Native HMI trend: bounded historian buckets plus source-timestamped live samples. */
(function(root){
  'use strict';
  const palette=['#ff0000','#00aa00','#0000ff','#008080','#800080','#ff00ff','#ff8800','#444444'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=(value,fallback)=>value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):fallback;
  function normalize(obj){
    return {source:obj.trendSource==='historian'?'historian':'cache',title:String(obj.trendTitle||'Trend'),windowMs:Math.max(60000,Math.min(31*86400000,number(obj.trendWindowMs,7200000))),
      refreshMs:Math.max(5000,Math.min(3600000,number(obj.trendRefreshMs,60000))),
      pens:(Array.isArray(obj.pens)?obj.pens:[]).slice(0,12).map((p,i)=>{
        const min=number(p.min,0);const max=number(p.max,100);
        return {...p,connection_id:String(p.connection_id||''),tag:String(p.tag||''),label:String(p.label||p.tag||`Trace ${i+1}`),
          color:/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:palette[i%palette.length],min,max:max>min?max:min+1,
          decimals:Math.max(0,Math.min(6,Math.floor(number(p.decimals,3)))),constant:p.source==='constant'?number(p.constant,0):null,
          expression:String(p.expression||''),source:p.source==='expression'?'expression':p.source==='constant'?'constant':'tag',enabled:p.enabled!==false};})};
  }
  function points(body){
    const rows=Array.isArray(body.buckets)?body.buckets:body.points||[];
    return rows.map(p=>{
      const t=number(p.ts_ms,number(p.bucket_start_ms,NaN));
      const good=p.quality===undefined||p.quality===null||p.quality===1||p.quality==='GOOD';
      const v=good?number(p.value,number(p.avg,null)):null;
      return {t,v,lo:good?number(p.min,v):null,hi:good?number(p.max,v):null,...(Number.isFinite(p.bucket_end_ms)?{end:p.bucket_end_ms}:{})};
    }).filter(p=>Number.isFinite(p.t)).sort((a,b)=>a.t-b.t);
  }
  function mergePoints(history,live,from,to){
    const rows=new Map();
    for(const p of [...history,...live]) if(p.t>=from&&p.t<=to) rows.set(p.t,p);
    return [...rows.values()].sort((a,b)=>a.t-b.t);
  }
  const live=new Map(),states=new Map(),mounted=new Set();
  let nextClip=0;
  function recordLive(key,value,timestamp,quality,polling){
    const t=Number(timestamp); if(!Number.isFinite(t)||t<=0)return;
    const valid=(quality===1||quality==='GOOD')&&(!polling||polling==='active');
    const v=valid?number(value,null):null;
    const rows=live.get(key)||[];
    const p={t,v,lo:v,hi:v};
    if(rows.length&&rows[rows.length-1].t===t)rows[rows.length-1]=p;else rows.push(p);
    if(rows.length>10000)rows.splice(0,rows.length-10000);
    live.set(key,rows);
    // Only active viewers feed this cache; cap keys as well as samples.
    if(live.size>512)live.delete(live.keys().next().value);
  }
  const timeText=t=>new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  function chart(config,series,from,to,width,height,clipId="trendPlotClip"){
    const pens=config.pens.filter(p=>p.enabled),axis=38,left=8+axis*pens.length,right=width-12,top=12,bottom=height-32;
    if(right-left<50||bottom-top<25)return '<div class="trend-empty">Enlarge the trend to display its scales.</div>';
    const x=t=>left+(t-from)/(to-from)*(right-left);
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(config.title)}"><defs><clipPath id="${esc(clipId)}"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs><rect width="100%" height="100%" fill="white"/>`;
    for(let tick=0;tick<=6;tick++){
      const px=left+(right-left)*tick/6,py=top+(bottom-top)*tick/6,t=from+(to-from)*tick/6;
      const label=to-from>=86400000?new Date(t).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):timeText(t);
      svg+=`<path d="M ${px} ${top} V ${bottom} M ${left} ${py} H ${right}" stroke="#d0d0d0" fill="none"/><text x="${px}" y="${bottom+16}" text-anchor="${tick===0?'start':tick===6?'end':'middle'}" font-size="10" fill="#222">${esc(label)}</text>`;
    }
    pens.forEach((pen,index)=>{
      const y=v=>bottom-(v-pen.min)/(pen.max-pen.min)*(bottom-top);
      const a=8+axis*(pens.length-1-index);
      svg+=`<rect x="${a}" y="${top}" width="${axis-2}" height="${bottom-top}" fill="${pen.color}"/>`;
      for(let tick=0;tick<=6;tick++){
        const value=pen.min+(pen.max-pen.min)*tick/6;
        svg+=`<text x="${a+axis-5}" y="${Math.min(bottom-2,Math.max(top+10,y(value)+3))}" text-anchor="end" font-size="10" fill="${contrast(pen.color)}">${esc(Number(value.toFixed(2)))}</text>`;
      }
      const data=pen.source==='constant'?[{t:from,v:pen.constant},{t:to,v:pen.constant}]:(series.get(pen)||[]);
      let path='',bars='',dots='',previous=null;
      const gap=pen.source==='constant'?Infinity:(to-from)/1200*3;
      for(const p of data){
        if(p.v===null){previous=null;continue;}
        const px=x(p.t),py=y(p.v);
        path+=`${previous&&p.t-previous.t<=gap&&(!Number.isFinite(previous.end)||p.t<=previous.end)?'L':'M'}${px.toFixed(2)} ${py.toFixed(2)} `;
        if(p.lo!==null&&p.hi!==null&&p.lo!==p.hi)bars+=`M${px.toFixed(2)} ${y(p.lo).toFixed(2)}V${y(p.hi).toFixed(2)} `;
        dots=`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="1" fill="${pen.color}"/>`;
        previous=p;
      }
      svg+=`<g clip-path="url(#${esc(clipId)})"><path d="${bars}" stroke="${pen.color}" opacity="0.45" fill="none"/><path d="${path}" stroke="${pen.color}" stroke-width="1.5" fill="none"/>${dots}</g>`;
    });
    return svg+'</svg>';
  }
  function contrast(color){const n=parseInt(color.slice(1),16);return (((n>>16)&255)*.299+((n>>8)&255)*.587+(n&255)*.114)>140?'#111':'#fff';}
  function stateFor(obj){
    const config=normalize(obj),signature=JSON.stringify(config);
    const key=String(obj.id||"trend")+"|"+signature;
    let s=states.get(key);
    if(!s||s.signature!==signature){s={signature,config,history:new Map(),errors:new Map(),notices:new Map(),lastFetch:0,loading:false,end:null,rangeMs:null};states.set(key,s);if(states.size>64)states.delete(states.keys().next().value);}
    return s;
  }
  function draw(host){
    const {obj,s,options}=host._trend;
    const config=s.config,to=s.end||Date.now(),from=to-(s.rangeMs||config.windowMs);
    if(!options.editing&&!s.end&&options.evaluate)for(const p of config.pens.filter(p=>p.enabled&&p.source==='expression')){
      try{recordLive(options.key(p),options.evaluate(p.expression),to,'GOOD');}catch{recordLive(options.key(p),null,to,'BAD');}
    }
    const series=new Map();
    config.pens.filter(p=>p.enabled).forEach(p=>series.set(p,mergePoints(s.history.get(p)||[],s.end?[]:(live.get(options.key(p))||[]),from,to)));
    host.querySelector('.trend-title').textContent=config.title;
    host.querySelector('[data-trend-pause]').textContent=s.end?'Live':'Pause';
    const plot=host.querySelector('.trend-plot');
    plot.innerHTML=chart(config,series,from,to,Math.max(160,Number(obj.w)||720),Math.max(100,(Number(obj.h)||400)-65-(config.source==='historian'?38:0)-config.pens.filter(p=>p.enabled).length*22),host._trend.clipId);
    const body=host.querySelector('tbody');body.replaceChildren();
    config.pens.filter(p=>p.enabled).forEach(p=>{
      const rows=series.get(p)||[],last=[...rows].reverse().find(r=>r.v!==null);
      const tr=document.createElement('tr');
      const label=document.createElement('td'),swatch=document.createElement('span');swatch.className='trend-swatch';swatch.style.background=p.color;label.append(swatch,document.createTextNode(p.label));
      const value=document.createElement('td');value.textContent=p.source==='constant'?p.constant.toFixed(p.decimals):last?last.v.toFixed(p.decimals):'—';
      const time=document.createElement('td');time.textContent=p.source==='constant'?'Reference':last?timeText(last.t):'—';
      const status=document.createElement('td');status.textContent=options.editing?'Preview':s.errors.get(p)||(!rows.length&&p.source!=='constant'?(s.loading?'Loading…':s.notices.get(p)||(config.source==='cache'?'Building trend cache':'No history')):(p.source==='constant'||rows.at(-1)?.v!=null?'Good':'Bad quality'));
      tr.append(label,value,time,status);body.appendChild(tr);
    });
    host.querySelector('.trend-range').textContent=`${new Date(from).toLocaleString()} – ${new Date(to).toLocaleString()}`;
  }
  // Requests are bounded and serialized within a chart; a server outage cannot spawn
  // an unbounded retry loop. A completed fetch never redraws a departed screen.
  async function refresh(host,force=false){
    const info=host._trend;if(!info||!host.isConnected||info.options.editing||document.visibilityState==='hidden')return;
    const {s,options}=info,now=Date.now();
    if(s.loading||(!force&&s.end&&s.lastFetch)||(!force&&now-s.lastFetch<s.config.refreshMs))return;
    s.loading=true;s.lastFetch=now;draw(host);
    const to=s.end||now,from=to-(s.rangeMs||s.config.windowMs);
    for(const pen of s.config.pens.filter(p=>p.enabled&&(p.source==='expression'||(p.source==='tag'&&p.connection_id&&p.tag)))){
      if(!host.isConnected||host._trend!==info||document.visibilityState==='hidden')break;
      try{
        const history=await options.history(pen,from,to,s.config.source);
        s.history.set(pen,points(history));
        if(history.error)s.errors.set(pen,history.error);else s.errors.delete(pen);
        s.notices.set(pen,history.source==='cache'?(history.collecting?'No cached samples in this range':'Save this trend to start collecting'):'No history');
      }catch(error){s.errors.set(pen,String(error.message||error));}
    }
    s.loading=false;draw(host);
  }
  function mount(parent,obj,options){
    const ns='http://www.w3.org/2000/svg',fo=document.createElementNS(ns,'foreignObject');
    for(const [k,v]of Object.entries({x:Number(obj.x)||0,y:Number(obj.y)||0,width:Math.max(160,Number(obj.w)||720),height:Math.max(140,Number(obj.h)||400)}))fo.setAttribute(k,v);
    fo.style.pointerEvents=options.editing?'none':'auto';
    const host=document.createElementNS('http://www.w3.org/1999/xhtml','div');host.className='hmi-trend';
    host.style.border=`${Math.max(0,Number(obj.strokeWidth)||0)}px ${obj.borderStyle==='outset'?'outset':obj.borderStyle==='inset'?'inset':'solid'} ${/^#[0-9a-f]{6}$/i.test(obj.stroke||'')?obj.stroke:'#aaaaaa'}`;
    host.innerHTML='<div class="trend-header"><strong class="trend-title"></strong><span class="trend-actions"><button data-trend-back title="Previous time window">◀</button><button data-trend-pause>Pause</button><button data-trend-next title="Next time window">▶</button><button data-trend-refresh title="Refresh data">↻</button></span></div><div class="trend-dates" hidden><label>Start <input type="datetime-local" data-trend-start /></label><label>End <input type="datetime-local" data-trend-end /></label><button data-trend-load>Load</button><span data-trend-date-error role="status"></span></div><div class="trend-plot"></div><div class="trend-range"></div><table><thead><tr><th>Description</th><th>Last Value</th><th>Last Time</th><th>Status</th></tr></thead><tbody></tbody></table>';
    host._trend={obj,s:stateFor(obj),options,clipId:`trend-clip-${++nextClip}`};
    const navigate=direction=>{const s=host._trend.s;s.end=Math.min(Date.now(),(s.end||Date.now())+direction*(s.rangeMs||s.config.windowMs));s.lastFetch=0;syncDates();draw(host);void refresh(host,true);};
    host.querySelector('[data-trend-back]').onclick=()=>navigate(-1);
    host.querySelector('[data-trend-next]').onclick=()=>navigate(1);
    host.querySelector('[data-trend-pause]').onclick=()=>{const s=host._trend.s;if(s.end){s.end=null;s.rangeMs=null;}else s.end=Date.now();s.lastFetch=0;syncDates();draw(host);void refresh(host,true);};
    host.querySelector('[data-trend-refresh]').onclick=()=>void refresh(host,true);
    const dates=host.querySelector('.trend-dates');dates.hidden=host._trend.s.config.source!=='historian';
    const localInput=t=>{const d=new Date(t);return new Date(t-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
    host.querySelector('[data-trend-start]').value=host._trend.s.dateStart||localInput((host._trend.s.end||Date.now())-(host._trend.s.rangeMs||host._trend.s.config.windowMs));
    host.querySelector('[data-trend-end]').value=host._trend.s.dateEnd||localInput(host._trend.s.end||Date.now());
    function syncDates(){
      const s=host._trend.s;s.dateStart=null;s.dateEnd=null;
      host.querySelector('[data-trend-start]').value=localInput((s.end||Date.now())-(s.rangeMs||s.config.windowMs));
      host.querySelector('[data-trend-end]').value=localInput(s.end||Date.now());
    }
    host.querySelector('[data-trend-start]').oninput=event=>{host._trend.s.dateStart=event.target.value;};
    host.querySelector('[data-trend-end]').oninput=event=>{host._trend.s.dateEnd=event.target.value;};
    host.querySelector('[data-trend-load]').onclick=()=>{
      const from=new Date(host.querySelector('[data-trend-start]').value).getTime(),to=new Date(host.querySelector('[data-trend-end]').value).getTime();
      const error=host.querySelector('[data-trend-date-error]');
      if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>31*86400000||to>Date.now()) {error.textContent='Choose a valid past range of up to 31 days.';return;}
      error.textContent='';const s=host._trend.s;s.end=to;s.rangeMs=to-from;s.lastFetch=0;draw(host);void refresh(host,true);
    };
    for(const event of ['pointerdown','mousedown','touchstart','click'])host.addEventListener(event,e=>e.stopPropagation());
    fo.appendChild(host);parent.appendChild(fo);mounted.add(host);
    // Paint immediately, even while the SVG is being built off-document, so
    // a screen redraw never exposes an empty chart. Fetch after attachment.
    draw(host);
    setTimeout(()=>{void refresh(host);},0);
    return host;
  }
  function tick(){
    for(const host of mounted){if(!host.isConnected){mounted.delete(host);continue;}if(document.visibilityState==='hidden')continue;draw(host);void refresh(host);}
  }
  const api={normalize,points,mergePoints,chart,recordLive,mount,tick,palette,esc};
  if(typeof module==='object')module.exports=api;else root.TrendWidget=api;
})(typeof window==='object'?window:globalThis);
