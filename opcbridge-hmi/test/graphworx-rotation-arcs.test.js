const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {convertGraphWorx}=require('../server/graphworx-import');
const xml=body=>`<Canvas xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">${body}</Canvas>`;
const group=rotation=>`<Canvas Name="Equipment"><gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList><gwx:GwxRotation ${rotation}/></gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup><Rectangle Width="100" Height="100"/></Canvas>`;

test('rotation import retains valve position scale, angles and direction',()=>{
  const {screen}=convertGraphWorx(xml(group('EndAngle="90" AnimationMode="Analog" DataSource="ac:Building_130/Valve/Position" LowLimitSource="0" HighLimitSource="100"')));
  const a=screen.objects[0].rotationAutomation;
  assert.equal(a.tag,'ac:Building_130/Valve/Position');
  assert.equal(a.inputMin,0);assert.equal(a.inputMax,100);
  assert.equal(a.angleStart,0);assert.equal(a.angleEnd,90);assert.equal(a.direction,'cw');
});

test('degritter ramp imports the local period and only the equipment run tag needs mapping',()=>{
  const {screen}=convertGraphWorx(xml(group('Clockwise="False" StartAngle="-360" DataSource="x={{ac:Building_130/Degritter1/Run/Status}} * {{localsim:ramp:Rotation:::::20000:100}}" LowLimitSource="0" HighLimitSource="100"')));
  const a=screen.objects[0].rotationAutomation;
  assert.equal(a.tag,'ac:Building_130/Degritter1/Run/Status');assert.equal(a.sourceType,'tag');
  assert.equal(a.rampPeriodMs,20000);assert.equal(a.rampMaximum,100);
  assert.equal(a.angleStart,-360);assert.equal(a.direction,'ccw');
  assert.ok(screen.referenceHealth.issues.every(issue=>!issue.source?.value.includes('localsim:ramp')));
});

const pathPoints=data=>convertGraphWorx(xml(`<Path Stroke="#FF000000" Data="${data}"/>`)).screen.objects[0].points;
test('quarter-circle arc is sampled on its circle instead of reduced to the chord',()=>{
  const points=pathPoints('M50,50 A50,50,0,0,1,100,0');
  assert.equal(points.length,13);assert.deepEqual(points[0],{x:50,y:50});assert.deepEqual(points.at(-1),{x:100,y:0});
  for(const p of points)assert.ok(Math.abs(Math.hypot(p.x-100,p.y-50)-50)<1e-6);
  assert.ok(points[6].x<70&&points[6].y<20);
});

test('arc sampling supports relative coordinates, sweep direction, large and rotated ellipses',()=>{
  for(const data of ['M50,50 a50,50,0,0,1,50,-50','M50,50 A50,50,0,1,0,100,0','M50,50 A10,25,45,0,1,100,0']){
    const points=pathPoints(data);assert.ok(points.length>2);
    assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    assert.deepEqual(points.at(-1),{x:100,y:0});
    assert.ok(points.some(p=>Math.abs(p.x+p.y-100)>1));
  }
  assert.equal(pathPoints('M0,0 A0,10,0,0,1,50,50').length,2);
});

const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function runtime(direction='cw'){
  const object={type:'group',w:100,h:100,rotationAutomation:{enabled:true,connection_id:'PLC',tag:'Run',inputMin:0,inputMax:100,angleStart:0,angleEnd:360,direction,rampPeriodMs:20000,rampMaximum:100}};
  const ctx=vm.createContext({obj:object,isEditMode:false,document:{timeline:{currentTime:5000}},tagValueCache:new Map([['PLC.Run',1]]),
    normalizeTagCacheKey:(conn,tag)=>`${conn}.${tag}`,getStableAutomationNumber:(_,value)=>Number(value),
    getMultiStateRotationOverride:()=>null,getRotationPivot:()=>({localX:50,localY:50})});
  let start=source.indexOf('const coerceTagBoolean =');
  vm.runInContext(source.slice(start,source.indexOf('\n};',start)+3),ctx);
  start=source.indexOf('const normalizeRotationAutomationState =');
  vm.runInContext(source.slice(start,source.indexOf('const normalizeMotionAutomationState =',start)),ctx);
  start=source.indexOf('const getRotationAutomationValue =');
  vm.runInContext(source.slice(start,source.indexOf('const supportsMotionPose =',start)),ctx);
  return ctx;
}

test('full-turn ramps rotate over time in both directions and stop with the run tag',()=>{
  for(const direction of ['cw','ccw']){
    const ctx=runtime(direction);
    assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),direction==='cw'?90:-90);
    ctx.document.timeline.currentTime=10000;
    assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),direction==='cw'?180:-180);
    ctx.tagValueCache.set('PLC.Run',0);assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),0);
    ctx.isEditMode=true;assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),0);
  }
});

test('mounted ramp uses browser animation with a stable timeline and skips stopped equipment',()=>{
  const ctx=runtime();let keyframes,options;
  const animation={};ctx.element={style:{},animate:(frames,settings)=>{keyframes=frames;options=settings;return animation;}};
  assert.equal(vm.runInContext('animateRotationAutomation(element,obj)',ctx),true);
  assert.equal(options.duration,20000);assert.equal(options.iterations,Infinity);
  assert.equal(keyframes[1].transform,'rotate(360deg)');assert.equal(animation.startTime,0);
  assert.equal(ctx.element.style.transformOrigin,'50px 50px');
  ctx.tagValueCache.set('PLC.Run',0);assert.equal(vm.runInContext('animateRotationAutomation(element,obj)',ctx),false);
});


test('editor-created continuous rotation uses its bit as enable and seconds per turn without analog mapping',()=>{
  const ctx=runtime();
  ctx.obj.rotationAutomation={enabled:true,mode:'continuous',connection_id:'PLC',tag:'Run',rampPeriodMs:4000,direction:'cw'};
  ctx.document.timeline.currentTime=1000;
  for(const value of [true,1,'true','1']){
    ctx.tagValueCache.set('PLC.Run',value);
    assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),90);
  }
  for(const value of [false,0,'false','0']){
    ctx.tagValueCache.set('PLC.Run',value);
    assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),0);
  }
  ctx.obj.rotationAutomation.sourceType='expression';ctx.evaluateAutomationExpression=()=>true;
  assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),90);
  ctx.obj.rotationAutomation.direction='ccw';assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),-90);
});

test('position mode remains an analog map even when switching from continuous with a retained period',()=>{
  const ctx=runtime();ctx.obj.rotationAutomation={enabled:true,mode:'position',connection_id:'PLC',tag:'Run',rampPeriodMs:4000,inputMin:0,inputMax:100,angleStart:0,angleEnd:90,direction:'cw'};
  ctx.tagValueCache.set('PLC.Run',50);assert.equal(vm.runInContext('getRotationAutomationValue(obj)',ctx),45);
  ctx.element={animate(){throw Error('Position mode must not animate');}};
  assert.equal(vm.runInContext('animateRotationAutomation(element,obj)',ctx),false);
});

test('continuous rotation wraps different object types once around their world pivot',()=>{
  for(const type of ['group','rect','ellipse','text','line','button']){
    const ctx=runtime();ctx.obj.type=type;ctx.obj.x=100;ctx.obj.y=200;
    ctx.getRotationPivot=()=>({localX:50,localY:50,worldX:150,worldY:250});
    let drawn,host;
    ctx.getDisplayObject=obj=>obj;ctx.applyGroupColorOverridesToObject=obj=>obj;ctx.shouldPaintObject=()=>true;
    ctx.tagQualityCache=new Map();ctx.browserColorFlashPhase=null;ctx.runtimeObjectDefs=null;
    ctx.collectTagKeysFromValue=()=>{};ctx.wsTagKeyToQueryItem=()=>null;
    ctx.document.createElementNS=()=>({style:{},setAttribute(){},appendChild(){},animate:()=>({})});
    ctx.parent={appendChild:child=>{host=child;}};ctx.record=value=>{drawn=value;};
    const start=source.indexOf('const renderObjectContentInto =');
    const end=source.indexOf('  const ns = "http://www.w3.org/2000/svg";',start);
    vm.runInContext(source.slice(start,end)+'record({object:obj,parent});\n};',ctx);
    vm.runInContext('renderObjectContentInto(parent,obj)',ctx);
    assert.equal(drawn.parent,host,type);assert.equal(host.style.transformOrigin,'150px 250px',type);
    assert.equal(drawn.object.rotationAutomation,undefined,type);
    assert.ok(ctx.obj.rotationAutomation,'saved configuration remains intact');
  }
});
