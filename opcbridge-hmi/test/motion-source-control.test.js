const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function element(){
  const el={children:[],value:'',className:'',listeners:{},dataset:{},classList:{toggle(name,on){this[name]=on;},add(){}},
    appendChild(child){child.parentNode=this;this.children.push(child);},append(...children){children.forEach(child=>this.appendChild(child));},
    addEventListener(name,fn){this.listeners[name]=fn;},closest(){return this.parentNode;}};
  return el;
}
function setup(){
  const form=element(),anchor=element(),anchorRow=element();anchorRow.appendChild(anchor);form.appendChild(anchorRow);
  const bindings=new Map();let patch;
  const ctx=vm.createContext({motionControlConfigs:[],document:{createElement:element},
    normalizePivotMode:mode=>mode,connectionIdFromFriendlyInput:input=>input.value,
    updateSelectedObjectMotionConfig:value=>{patch=value;},
    getCompactTagBindingConfig:id=>bindings.get(id),
    registerCompactTagBinding:config=>{
      bindings.set(config.id,{...config,row:element(),editorConnectionInput:element(),editorTagInput:element()});
      for(const input of [config.connectionInput,config.tagInput]){input.parentNode.hidden=true;}
    }});
  const definitions=[['text','textRotationInput'],['button','buttonRotationInput'],['numberInput','numberInputRotationInput'],
    ['indicator','indicatorRotationInput'],['viewport','viewportRotationInput'],['rect','rectRotationInput'],
    ['ellipse','ellipseRotationInput'],['circle','circleRotationInput'],['line','lineY2Input'],['bar','barRotationInput'],['group','groupRotationInput']];
  for(const [prefix,input] of definitions){ctx[`${prefix}Props`]=form;ctx[input]=anchor;}
  const start=source.indexOf('const initializeMotionControls =');
  vm.runInContext(source.slice(start,source.indexOf('\ninitializeMotionControls();',start))+'\ninitializeMotionControls();',ctx);
  return {ctx,bindings,patch:()=>patch};
}

test('all Motion controls use the shared connection/tag/picker row',()=>{
 const f=setup();assert.equal(f.bindings.size,11);
 for(const [id,binding]of f.bindings){
  assert.equal(binding.inlineOnly,undefined,id);assert.equal(binding.buttonLabel,'Source',id);assert.ok(binding.container);assert.ok(binding.beforeEl);
  binding.apply({connection_id:'PLC2',tag:'Position'});
  assert.deepEqual(JSON.parse(JSON.stringify(f.patch())),{sourceType:'tag',connection_id:'PLC2',tag:'Position',enabled:true});
 }
});
test('Motion expression switching hides the shared row and never restores the legacy fields',()=>{
 const f=setup();
 for(const control of f.ctx.motionControlConfigs){
  const binding=f.bindings.get(`motion-${control.id}`);
  control.sourceTypeSelect.value='expression';control.sourceTypeSelect.listeners.change();assert.equal(binding.row.hidden,true);
  control.sourceTypeSelect.value='tag';control.sourceTypeSelect.listeners.change();assert.equal(binding.row.hidden,false);
  assert.equal(control.connectionRow.hidden,true);assert.equal(control.tagRow.hidden,true);
 }
});
