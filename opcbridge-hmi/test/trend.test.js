const test=require('node:test');
const assert=require('node:assert/strict');
const trend=require('../public/js/trend');
test('trend configuration keeps independent scales, bounded history and safe colors',()=>{
 assert.equal(trend.normalize({}).source,'cache');
 assert.equal(trend.normalize({trendSource:'historian'}).source,'historian');
 const c=trend.normalize({trendWindowMs:1e20,pens:[{tag:'Flow',color:'red;display:none',min:30,max:6},{tag:'Effluent',min:0,max:120,decimals:3}]});
 assert.equal(c.windowMs,31*86400000);assert.equal(c.pens[0].max,31);assert.equal(c.pens[1].max,120);assert.match(c.pens[0].color,/^#[0-9a-f]{6}$/i);
 assert.equal(trend.normalize({pens:Array(30).fill({})}).pens.length,12);
});
test('history keeps bucket min/max peaks and bad samples as gaps; live samples deduplicate',()=>{
 const rows=trend.points({buckets:[{bucket_start_ms:100,avg:2,min:1,max:9},{bucket_start_ms:200,avg:null,min:null,max:null}]});
 assert.deepEqual(rows,[{t:100,v:2,lo:1,hi:9},{t:200,v:null,lo:null,hi:null}]);
 assert.equal(trend.points({points:[{ts_ms:100,value:6,quality:0}]})[0].v,null);
 const merged=trend.mergePoints(rows,[{t:100,v:3},{t:300,v:4}],100,250);
 assert.equal(merged.length,2);assert.equal(merged[0].v,3);
});
test('plot has separate axes, min/max bars, real gaps and constant reference lines',()=>{
 const c=trend.normalize({trendTitle:'Flow <script>',pens:[{tag:'Flow',min:0,max:6,color:'#ff0000'},{source:'constant',constant:30.5,min:0,max:60,color:'#ff00ff'}]});
 const series=new Map([[c.pens[0],[{t:0,v:2,lo:1,hi:4},{t:10,v:null},{t:20,v:3,lo:3,hi:3}]]]);
 const svg=trend.chart(c,series,0,100,780,260,'chart-a');
 assert.match(svg,/Flow &lt;script&gt;/);assert.match(svg,/id="chart-a"/);assert.match(svg,/url\(#chart-a\)/);
 assert.match(svg,/opacity="0.45"/);assert.match(svg,/>60<\/text>/);assert.match(svg,/>6<\/text>/);
 assert.match(svg,/<circle/);assert.match(svg,/stroke="#ff00ff" stroke-width="1.5"/);
 assert.doesNotMatch(svg,/<script>/);
});
test('trend traces participate in screen demand while constants and disabled pens do not',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
 const c=vm.createContext({normalizeWsTagKey:(a,b)=>`${a}:${b}`,getBrowserColorFlashRate:()=>false});
 vm.runInContext(source.slice(source.indexOf('const collectTagKeysFromValue ='),source.indexOf('const collectViewportTargetsFromValue =')),c);
 vm.runInContext(`keys=new Set();collectTagKeysFromValue({panelMode:'trend',pens:[{connection_id:'PLC',tag:'Flow'},{source:'constant',connection_id:'PLC',tag:'Old'},{enabled:false,connection_id:'PLC',tag:'Disabled'}]},keys)`,c);
 assert.deepEqual([...c.keys],['PLC:Flow']);
});
test('a trend-only screen does not activate alarm panel polling',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
 const c=vm.createContext({currentScreenObj:{objects:[{type:'alarms-panel',panelMode:'trend'}]}});
 vm.runInContext(source.slice(source.indexOf('const screenHasAlarmsPanel ='),source.indexOf('const getScreenAlarmHistoryDays =')),c);
 assert.equal(vm.runInContext('screenHasAlarmsPanel()',c),false);
 c.currentScreenObj.objects.push({type:'alarms-panel'});
 assert.equal(vm.runInContext('screenHasAlarmsPanel()',c),true);
});

test('expression pens retain their expression and subscribe to dependencies only when enabled',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const expression=require('../public/js/trend-expression');
 const c=trend.normalize({pens:[{source:'expression',expression:'tag("PLC", "Flow") * 2'}]});
 assert.equal(c.pens[0].source,'expression');assert.equal(c.pens[0].expression,'tag("PLC", "Flow") * 2');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
 const ctx=vm.createContext({normalizeWsTagKey:(a,b)=>a&&b?`${a}:${b}`:"",getBrowserColorFlashRate:()=>false,
  extractAutomationExpressionTagKeys:(text,out)=>expression.compile(text).dependencies.forEach(d=>out.add(`${d.connection_id}:${d.tag}`))});
 vm.runInContext(source.slice(source.indexOf('const collectTagKeysFromValue ='),source.indexOf('const collectViewportTargetsFromValue =')),ctx);
 ctx.pens=[c.pens[0],{source:'expression',enabled:false,expression:'tag("PLC", "Unused")'}];
 vm.runInContext("keys=new Set();collectTagKeysFromValue({panelMode:'trend',pens},keys)",ctx);
 assert.deepEqual([...ctx.keys],['PLC:Flow']);
});
