(function(root){
  const number=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
  const normalize=value=>({enabled:value?.enabled!==false,sourceType:['tag','expression'].includes(value?.sourceType)?value.sourceType:'constant',connection_id:String(value?.connection_id||''),tag:String(value?.tag||''),expression:String(value?.expression||''),speed:number(value?.speed,40,1,1000),direction:value?.direction==='reverse'?'reverse':'forward',colorMode:value?.colorMode==='custom'?'custom':'auto',color:String(value?.color||'#46d9ff'),width:number(value?.width,4,1,100),dash:number(value?.dash,12,2,200),gap:number(value?.gap,20,2,300)});
  function lighterColor(color) {
    let channels;
    if (color && typeof color === 'object') channels=[color.r,color.g,color.b];
    else { const hex=String(color||'').match(/^#([0-9a-f]{6})$/i);channels=hex?[0,2,4].map(i=>parseInt(hex[1].slice(i,i+2),16)):[128,128,128]; }
    // Near-white pipes need a darker indicator to retain visible contrast.
    const bright=(channels[0]*.2126+channels[1]*.7152+channels[2]*.0722)>210;
    return '#'+channels.map(value=>Math.round(bright?value*.55:value+(255-value)*.6).toString(16).padStart(2,'0')).join('');
  }
  function active(config,{read,evaluate,edit=false}){
    if(!config.enabled)return false;if(edit||config.sourceType==='constant')return true;
    const value=config.sourceType==='expression'?evaluate(config.expression):read(config.connection_id,config.tag);
    if(value===null||value===undefined)return false;
    if(typeof value==='number')return Number.isFinite(value)&&value!==0;
    return value===true||['true','1','on'].includes(String(value).toLowerCase());
  }
  function append(parent,obj,pathData,thickness,border,environment){
    if(obj.type!=='pipe'||!obj.flowAutomation)return null;
    const config=normalize(obj.flowAutomation);if(!active(config,environment))return null;
    const interior=thickness-2*border-2;if(interior<=0)return null;
    const color=config.colorMode==='custom'?config.color:(environment.deriveColor||lighterColor)(environment.pipeColor||obj.color||'#808080');
    const path=parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
    for(const [key,value]of Object.entries({d:pathData,fill:'none',stroke:color,'stroke-width':Math.min(config.width,interior),'stroke-dasharray':`${config.dash} ${config.gap}`,'stroke-linecap':'butt','stroke-linejoin':obj.jointType||'round','pointer-events':'none','vector-effect':'non-scaling-stroke','data-pipe-flow':config.direction}))path.setAttribute(key,value);
    parent.appendChild(path);
    environment.paint?.(path,color);
    if(!environment.edit&&path.animate){
      const period=config.dash+config.gap,duration=period/config.speed*1000;
      const animation=path.animate([{strokeDashoffset:0},{strokeDashoffset:config.direction==='reverse'?period:-period}],{duration,iterations:Infinity,easing:'linear'});
      // One clock keeps the phase steady when live data rebuilds the SVG.
      animation.currentTime=environment.now()%duration;
    }
    return path;
  }
  const api={normalize,active,append,lighterColor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HmiPipeFlow=api;
})(globalThis);
