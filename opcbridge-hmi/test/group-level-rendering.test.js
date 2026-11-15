const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
class Node{
  constructor(name){this.localName=name;this.attributes={};this.children=[];this.classList={toggle(){}};this.listeners={};this.value='';}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
  appendChild(n){n.parent=this;n.parentNode=this;this.children.push(n);return n;}append(...nodes){nodes.forEach(n=>this.appendChild(n));}
  querySelectorAll(){return this.children.flatMap(n=>[...(['path','polygon','polyline','rect','circle','ellipse','text'].includes(n.localName)?[n]:[]),...n.querySelectorAll()]);}
  querySelector(){return null;}closest(name){let p=this;while(p){if(name==='defs'&&p.localName==='defs')return p;if(name==='.prop-row'&&p.className==='prop-row')return p;p=p.parent;}return null;}
  cloneNode(deep){const clone=new Node(this.localName);clone.attributes={...this.attributes};if(deep)this.children.forEach(n=>clone.appendChild(n.cloneNode(true)));return clone;}
  addEventListener(name,fn){this.listeners[name]=fn;}
}
function load(ctx,start,end){const a=source.indexOf(start);vm.runInContext(source.slice(a,source.indexOf(end,a)),ctx);}
function fixture(value,direction='up'){
  const obj={type:'group',levelAutomation:{enabled:true,connection_id:'B130',tag:'TankLevel',inputMin:0,inputMax:144,direction,fill:'#3a7bd5',emptyFill:'none'}};
  const drawing=new Node('g'),polygon=new Node('polygon'),outline=new Node('polyline'),parent=new Node('g'),defs=new Node('defs');
  polygon.setAttribute('fill','#ffff00');polygon.setAttribute('stroke','#000000');polygon.setAttribute('points','0,0 24,0 24,172 0,172');
  outline.setAttribute('fill','none');outline.setAttribute('stroke','#000000');drawing.append(polygon,outline);parent.appendChild(drawing);
  const ctx=vm.createContext({obj,drawing,parent,defs,nextClipPathId:1,isEditMode:false,
    tagValueCache:new Map([['B130.TankLevel',value]]),normalizeTagCacheKey:(c,t)=>`${c}.${t}`,document:{createElementNS:(_,name)=>new Node(name)},
    svgRootForPaint:()=>parent,getOrCreateDefs:()=>defs,setSvgPaint:(el,attr,paint)=>el.setAttribute(attr,paint)});
  load(ctx,'const normalizeLevelAutomation =','const updateSelectedLevelAutomation =');
  load(ctx,'const coerceTagNumber =','const resolveBarLimit =');
  load(ctx,'const getLevelAutomationFraction =','const setImageHref =');
  vm.runInContext('appendLevelAutomationOverlay(parent,obj,drawing,{x:0,y:0,width:24,height:172})',ctx);
  return {ctx,obj,drawing,polygon,outline,parent,defs,overlay:parent.children[1],border:parent.children[2]};
}

test('group Level fills follow 0%, 50%, 100% while keeping the original silhouette and outlines',()=>{
  for(const [value,height,y] of [[0,0,172],[72,86,86],[144,172,0]]){
    const f=fixture(value);assert.equal(Number(f.overlay.getAttribute('height')),height);assert.equal(Number(f.overlay.getAttribute('y')),y);
    assert.equal(f.overlay.getAttribute('fill'),'#3a7bd5');assert.equal(f.polygon.getAttribute('fill'),'none');
    const mask=f.defs.children[0];assert.equal(mask.children.length,1);
    assert.equal(mask.children[0].localName,'polygon','clipPath must contain geometry directly, never a group');
    assert.equal(mask.children[0].getAttribute('fill'),'#ffffff');
    assert.equal(mask.children[0].getAttribute('points'),f.polygon.getAttribute('points'));
    assert.equal(f.border.children[0].getAttribute('fill'),'none');assert.equal(f.border.children[1].getAttribute('stroke'),'#000000');
  }
});

test('group levels clamp to their range and support horizontal and reversed fills',()=>{
  assert.equal(Number(fixture(-10).overlay.getAttribute('height')),0);
  assert.equal(Number(fixture(200).overlay.getAttribute('height')),172);
  assert.equal(Number(fixture(72,'left').overlay.getAttribute('x')),12);
  assert.equal(Number(fixture(72,'left').overlay.getAttribute('width')),12);
  assert.equal(Number(fixture(72,'down').overlay.getAttribute('y')),0);
});

test('Level Fill and Empty Fill use the shared paint picker and native swatches',()=>{
  const obj={levelAutomation:{enabled:true}};let picker;
  const ctx=vm.createContext({levelAutomationControl:null,LEVEL_AUTOMATION_TYPES:['rect','ellipse','polygon'],automationSectionConfigs:[],selectedIndices:[0],getActiveObjects:()=>[obj],
    document:{createElement:name=>new Node(name)},createAutomationSectionTitle:()=>new Node('div'),
    updateSelectedLevelAutomation:patch=>Object.assign(obj.levelAutomation,patch),registerCompactTagBinding(){},openPaintPicker:options=>{picker=options;}});
  load(ctx,'const normalizeLevelAutomation =','const updateSelectedLevelAutomation =');
  load(ctx,'const initializeLevelAutomationControl =','const syncLevelAutomationControl =');
  const control=vm.runInContext('initializeLevelAutomationControl()',ctx);
  const buttons=control.sectionEl.children.flatMap(row=>row.children.flatMap(child=>child.children.filter(node=>node.localName==='button')));
  assert.equal(buttons.length,2);
  control.fill.value='#123456';buttons[0].listeners.click();assert.equal(picker.title,'Level Fill');assert.equal(picker.value,'#123456');
  picker.onApply('linear-gradient(90deg, red, blue)');assert.match(obj.levelAutomation.fill,/linear-gradient/);
  buttons[1].listeners.click();assert.equal(picker.title,'Empty Fill');picker.onApply('#abcdef');assert.equal(obj.levelAutomation.emptyFill,'#abcdef');
  control.fillSwatch.value='#00ff00';control.fillSwatch.listeners.input();assert.equal(obj.levelAutomation.fill,'#00ff00');
});
