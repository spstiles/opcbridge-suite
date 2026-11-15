/* Screen-local values: definitions are saved; runtime values are instance-owned. */
(function(root) {
  const validName = name => /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(String(name || ''));
  function definitions(screen) {
    const tags = new Map();
    for (const tag of screen?.screenTags || []) if (validName(tag.name)) tags.set(tag.name, {
      name:tag.name, type:['boolean','number','text'].includes(tag.type)?tag.type:'boolean', initialValue:tag.initialValue
    });
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (value.connection_id === '_local' && validName(value.tag)) {
        if(!tags.has(value.tag)) tags.set(value.tag,{name:value.tag,type:'boolean',initialValue:false});
        tags.get(value.tag).imported=true;
      }
      for (const [key, child] of Object.entries(value)) if (key !== 'screenTags' && child && typeof child === 'object') visit(child);
    };
    visit(screen);return [...tags.values()];
  }
  function coerce(type,value) {
    if (type === 'text') return String(value ?? '');
    if (type === 'number') { const n=Number(value);if(!Number.isFinite(n))throw Error('Enter a finite number.');return n; }
    return value === true || value === 1 || ['true','1','on'].includes(String(value).toLowerCase());
  }
  function createStore(cache, qualityCache = null) {
    let serial=0;const instances=new Map(),types=new Map();
    const release = key => {
      const state=instances.get(key);if(!state)return;
      for(const name of state.names){cache.delete(`_local.${name}`);qualityCache?.delete(`_local.${name}`);types.delete(name);}instances.delete(key);
    };
    const context = (key,screen) => {
      let state=instances.get(key);
      if(state?.screen!==screen){release(key);state={screen,prefix:`screen${++serial}:`,names:new Set()};instances.set(key,state);}
      for(const tag of definitions(screen)) {
        const name=state.prefix+tag.name;
        if(!state.names.has(name)){state.names.add(name);types.set(name,tag.type);cache.set(`_local.${name}`,coerce(tag.type,tag.initialValue ?? (tag.type==='number'?0:tag.type==='text'?'':false)));qualityCache?.set(`_local.${name}`,1);}
      }
      return state.prefix;
    };
    const write = (name,value) => {
      if(!types.has(name))throw Error('Screen tag is not defined or its screen has closed.');
      const next=coerce(types.get(name),value);cache.set(`_local.${name}`,next);return next;
    };
    return {context,write,release,clear(){for(const key of [...instances.keys()])release(key);}};
  }
  function resolve(value,prefix) {
    if(!prefix || !value || typeof value!=='object')return value;
    const visit = obj => {
      if(['_screen','_local'].includes(obj.connection_id) && obj.tag && !/^screen\d+:/.test(String(obj.tag))){
        obj.connection_id='_local';obj.tag=prefix+obj.tag;
      }
      for(const [key,child]of Object.entries(obj)){
        if(key==='expression'&&typeof child==='string')obj[key]=child.replace(/tag\(\s*(["'])_(?:screen|local)\1\s*,\s*(["'])([^"']+)\2\s*\)/g,(_,q,t,name)=>`tag("_local", ${JSON.stringify(prefix+name)})`);
        else if(child&&typeof child==='object')visit(child);
      }
    };visit(value);return value;
  }
  function renameBindings(value, from, to) {
    if (!value || typeof value !== 'object') return;
    if (['_screen','_local'].includes(value.connection_id) && value.tag === from) value.tag = to;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'expression' && typeof child === 'string') {
        value[key] = child.replace(/tag\(\s*(["'])_(screen|local)\1\s*,\s*(["'])([^"']+)\3\s*\)/g,
          (token, quote, connection, tagQuote, name) => name === from ? `tag("_${connection}", ${JSON.stringify(to)})` : token);
      } else if (child && typeof child === 'object') renameBindings(child, from, to);
    }
  }
  const api={validName,definitions,coerce,createStore,resolve,renameBindings};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HmiScreenTags=api;
})(globalThis);
