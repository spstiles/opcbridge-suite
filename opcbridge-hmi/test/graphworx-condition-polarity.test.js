const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {convertGraphWorx}=require('../server/graphworx-import');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
const xml=dynamic=>`<Canvas xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx"><Label Width="100" Height="30" Background="#FF000000"><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>${dynamic}</gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup><TextBlock Text="FAULT"/></Label></Canvas>`;
function runtime(){
  const ctx=vm.createContext({isEditMode:false,tagValueCache:new Map(),activeTagInfoCache:new Map(),runtimeAutomationStateCache:new WeakMap(),
    normalizeTagCacheKey:(c,t)=>`${c}:${t}`,document:{timeline:{currentTime:0}},
    evaluateVisibilityExpression:()=>ctx.value,evaluateAutomationExpression:expression=>expression.includes('== 0')?!ctx.value:ctx.value,
    getColorAutomationRules:config=>config.rules,isColorRuleFlashActive:()=>true});
  for(const name of ['coerceTagBoolean','coerceTagNumber','getAutomationState','getStableAutomationState','evaluateVisibilityRule','applyVisibilityFlash','shouldRenderObject','getAutomationColor']){
    const start=source.indexOf(`const ${name} =`);vm.runInContext(source.slice(start,source.indexOf('\n};',start)+3),ctx);
  }
  return ctx;
}

test('imported gate fault expression flashes when either failure is true and stays hidden when both are false',()=>{
  const expression='{{ac:Building_130/BarScreen1_Influent_Gate/Fail_Close/Status}} || {{ac:Building_130/BarScreen1_Influent_Gate/Fail_Open/Status}}';
  const obj=convertGraphWorx(xml(`<gwx:GwxHide AnimationMode="Discrete" DataSource="x=${expression}" PeriodicToggleRate="1000" DynamicStateWhenToggleOff="True"/>`)).screen.objects[0];
  assert.equal(obj.visibility.rules[0].expression,expression);assert.equal(obj.visibility.rules[0].invert,false);
  const ctx=runtime();ctx.obj=obj;
  for(const [close,open] of [[false,false],[true,false],[false,true],[true,true]]){
    ctx.value=close||open;ctx.document.timeline.currentTime=0;
    assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),close||open);
    ctx.document.timeline.currentTime=1500;
    assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),false);
  }
});

test('steady GraphWorX Hide conditions retain their inverse show semantics',()=>{
  const obj=convertGraphWorx(xml('<gwx:GwxHide DataSource="x={{ac:Plant/Hide}}"/>')).screen.objects[0];
  assert.equal(obj.visibility.rules[0].invert,true);
  const ctx=runtime();ctx.obj=obj;ctx.value=false;
  assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),true);
  ctx.value=true;assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),false);
});

test('two original on/off colors remain separate and activate for opposite tag states',()=>{
  const obj=convertGraphWorx(xml('<gwx:GwxColor TargetPropertyName="Background" EndBrush="#FFFFFF00" AnimationMode="Discrete" DataSource="ac:Plant/Override"/><gwx:GwxColor TargetPropertyName="Background" EndBrush="#FF00FFFF" AnimationMode="Discrete" DataSource="ac:Plant/Override" DataComparison="EqualZero"/>')).screen.objects[0];
  assert.equal(obj.backgroundAutomation.rules.length,2);
  assert.equal(obj.backgroundAutomation.rules[1].mode,'equals');assert.equal(obj.backgroundAutomation.rules[1].match,'0');
  const ctx=runtime();ctx.config=obj.backgroundAutomation;
  for(const rule of ctx.config.rules){rule.connection_id='PLC';rule.tag='Override';}
  for(const [value,color] of [[0,'#00ffff'],[1,'#ffff00'],[false,'#00ffff'],[true,'#ffff00']]){
    ctx.tagValueCache.set('PLC:Override',value);
    assert.equal(vm.runInContext(`getAutomationColor(config,'#000000')`,ctx),color);
  }
});

test('EqualZero is expressed explicitly for calculated color and visibility sources',()=>{
  const obj=convertGraphWorx(xml('<gwx:GwxColor TargetPropertyName="Foreground" EndBrush="#FFFF0000" DataSource="x={{ac:Plant/Run}}" DataComparison="EqualZero"/><gwx:GwxHide DataSource="x={{ac:Plant/Run}}" DataComparison="EqualZero"/>')).screen.objects[0];
  assert.equal(obj.fillAutomation.rules[0].expression,'({{ac:Plant/Run}}) == 0');
  assert.equal(obj.visibility.rules[0].expression,'({{ac:Plant/Run}}) == 0');
  const ctx=runtime();ctx.config=obj.fillAutomation;ctx.obj=obj;
  ctx.value=0;assert.equal(vm.runInContext(`getAutomationColor(config,'#000000')`,ctx),'#ff0000');
  // Hide when zero means show when the original value is nonzero.
  ctx.evaluateVisibilityExpression=()=>ctx.value===0;
  assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),false);
  ctx.value=1;assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),true);
});
