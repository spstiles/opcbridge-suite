const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function fixture(){
  class Node{
    constructor(){this.children=[];this.attributes={};this.style={};this.animations=[];}
    appendChild(node){node.remove();this.children.push(node);node.parent=this;return node;}
    remove(){if(this.parent){this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}}
    setAttribute(key,value){this.attributes[key]=value;}
    replaceChildren(...nodes){for(const child of [...this.children])child.remove();for(const node of nodes)this.appendChild(node);}
    replaceWith(node){const parent=this.parent,index=parent.children.indexOf(this);node.remove();parent.children[index]=node;node.parent=parent;this.parent=null;}
    querySelectorAll(){return this.children.flatMap(node=>[...('data-hmi-continuous-rotation' in node.attributes?[node]:[]),...node.querySelectorAll()]);}
    getAnimations(){return [...this.animations,...this.children.flatMap(node=>node.getAnimations())];}
  }
  let created=0,fail=false;
  const rotor={type:'group',id:'rotor',children:[],rotationAutomation:{mode:'continuous',connection_id:'PLC',tag:'Run',rampPeriodMs:20000}};
  const host=new Node();
  const ctx=vm.createContext({isEditMode:false,runtimeObjectDefs:null,browserColorFlashPhase:null,host,rotor,
    tagValueCache:new Map([['PLC.Run',1]]),tagQualityCache:new Map([['PLC.Run',1]]),
    collectTagKeysFromValue:(obj,keys)=>keys.add('PLC:Run'),wsTagKeyToQueryItem:()=>({connection_id:'PLC',name:'Run'}),normalizeTagCacheKey:(c,t)=>`${c}.${t}`,
    document:{createElementNS:()=>new Node()},getDisplayObject:obj=>obj,applyGroupColorOverridesToObject:obj=>obj,shouldPaintObject:()=>true,
    normalizeRotationAutomationState:automation=>automation||{},
    animateRotationAutomation:node=>{if(!ctx.tagValueCache.get('PLC.Run'))return false;created++;node.animations.push({cancel(){this.cancelled=true;}});return true;},
    draw:parent=>{const shape=new Node();shape.definitions=ctx.runtimeObjectDefs;parent.appendChild(shape);}});
  let a=source.indexOf('const continuousRotationDrawings =');vm.runInContext(source.slice(a,source.indexOf('const animateRotationAutomation =',a)),ctx);
  a=source.indexOf('const renderObjectContentInto =');
  vm.runInContext(source.slice(a,source.indexOf('  const ns = "http://www.w3.org/2000/svg";',a))+'draw(parent);\n};',ctx);
  ctx.renderObjectInto=(parent,obj)=>{vm.runInContext('renderObjectContentInto(parentArg,rotorArg)',Object.assign(ctx,{parentArg:parent,rotorArg:obj}));if(fail)throw Error('paint failure');};
  a=source.indexOf('function animationsWithin(');vm.runInContext(source.slice(a,source.indexOf('const paintRuntimeRegion =',a)),ctx);
  a=source.indexOf('const paintRuntimeRegion =');vm.runInContext(source.slice(a,source.indexOf('// Repaint the owning top-level region',a)),ctx);
  return {ctx,host,rotor,created:()=>created,paint:()=>vm.runInContext('paintRuntimeRegion(host,rotor)',ctx),fail:()=>{fail=true;}};
}

test('surrounding repaints retain the spinning SVG, animation, and its gradient/filter definitions',()=>{
  const f=fixture();f.paint();const drawing=f.host.querySelectorAll()[0],animation=drawing.animations[0],defs=drawing.children[0];
  assert.equal(drawing.children[1].definitions,defs);
  for(let i=0;i<20;i++)f.paint();
  assert.equal(f.created(),1);assert.equal(f.host.querySelectorAll()[0],drawing);
  assert.equal(animation.cancelled,undefined);assert.equal(drawing.children[0],defs);
  assert.equal(f.ctx.runtimeObjectDefs,null);
});

test('run state and timing changes invalidate reuse and cancel superseded animations',()=>{
  const f=fixture();f.paint();let previous=f.host.querySelectorAll()[0].animations[0];
  f.rotor.rotationAutomation.rampPeriodMs=10000;f.paint();assert.equal(f.created(),2);assert.equal(previous.cancelled,true);
  previous=f.host.querySelectorAll()[0].animations[0];
  f.ctx.tagValueCache.set('PLC.Run',0);f.paint();assert.equal(previous.cancelled,true);assert.equal(f.host.querySelectorAll().length,0);
  f.ctx.tagValueCache.set('PLC.Run',1);f.paint();assert.equal(f.created(),3);
});

test('failed surrounding repaint leaves the old spinning drawing and animation untouched',()=>{
  const f=fixture();f.paint();const drawing=f.host.querySelectorAll()[0],animation=drawing.animations[0];
  f.fail();assert.throws(()=>f.paint(),/paint failure/);
  assert.equal(f.host.querySelectorAll()[0],drawing);assert.equal(animation.cancelled,undefined);
  assert.equal(vm.runInContext('continuousRotationRepaint',f.ctx),null);
});


test('a rotor appearance edit invalidates the retained drawing',()=>{
  const f=fixture();f.paint();const previous=f.host.querySelectorAll()[0].animations[0];
  f.rotor.children.push({type:'ellipse',fill:'#ff0000'});f.paint();
  assert.equal(f.created(),2);assert.equal(previous.cancelled,true);
});
