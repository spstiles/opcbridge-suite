const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
function setup(){
 const applied=[];const downloads=[];const handlers={};
 const noop=()=>{};
 const element=()=>({appendChild:noop,addEventListener:noop,remove:noop,click:noop});
 const overlay={...element(),querySelector:selector=>selector==='[data-reference-mapping-apply]'?{addEventListener:(_,fn)=>{handlers.apply=fn;}}:element()};
 const id='connection_abc123';
 const group={type:'tag',current:`${id}::Old`,originals:new Set([`${id}::Old`]),statuses:new Set(['resolved']),automations:new Set(['visibility']),occurrences:[{path:'objects.0.visibility',objectId:'one',apply:(...args)=>applied.push(args)}]};
 const c=vm.createContext({getConnectionDisplayName:x=>x===id?'OPC Data':x,
 resolveMappedConnectionId:x=>x.toLowerCase()==='opc data'?id:x,
 collectScreenReferenceMappings:()=>[group],setMenuOpen:noop,showHmiToast:noop,
 referenceCsvEscape:x=>String(x),currentScreenId:'test',currentScreenFilename:'',
 Blob:class{constructor(parts){downloads.push(parts.join(''));}},URL:{createObjectURL:()=>'',revokeObjectURL:noop},
 document:{createElement:tag=>tag==='div'?overlay:element(),body:{appendChild:noop}},
 closeReferenceMappingPreview:noop,knownMappedTag:()=>true,knownMappedScreen:()=>true,
 showHmiBusy:()=>Symbol(),hideHmiBusy:noop,waitForHmiBusyPaint:async()=>{},recordHistory:noop,syncMappedReferenceMetadata:noop,syncObjectMappedReferenceMetadata:noop,
 setDirty:noop,renderScreen:noop,updateSelectionOverlays:noop,updatePropertiesPanel:noop,renderReferenceHealthBadge:noop,setEditorStatusSafe:noop});
 vm.runInContext(source.slice(source.indexOf('const parseMappedTagReference ='),source.indexOf('function resolveMappedConnectionId(')),c);
 vm.runInContext(source.slice(source.indexOf('const formatMappedTagReference ='),source.indexOf('const referenceAutomationLabel =')),c);
 vm.runInContext(source.slice(source.indexOf('const displayMappingReference ='),source.indexOf('const knownMappedTag =')),c);
 vm.runInContext(source.slice(source.indexOf('const openReferenceMappingPreview ='),source.indexOf('const uploadScreenReferenceMappings =')),c);
 return{c,downloads,handlers,applied,group,id};
}
test('both mapping exports use friendly names',()=>{
 const{c,downloads}=setup();
 vm.runInContext('downloadScreenReferenceMappings(); downloadObjectReferenceMappings();',c);
 assert.equal(downloads.length,2);
 for(const text of downloads){assert.match(text,/OPC Data::Old/);assert.doesNotMatch(text,/connection_abc123/);}
});
for(const legacy of [false,true])test(`mapping imports ${legacy?'legacy IDs':'friendly names'} for current and replacement references`,async()=>{
 const{c,handlers,applied,id}=setup();
 c.rows=[{reference_type:'tag',current_reference:`${legacy?id:'OPC Data'}::Old`,replacement_reference:`${legacy?id:'OPC Data'}::New`}];
 vm.runInContext('openReferenceMappingPreview(rows)',c);await handlers.apply();
 assert.equal(applied.length,1);assert.equal(applied[0][0],`${id}::New`);
});

test('reference upload paints busy state before reading and previewing, then clears it',async()=>{
 const {c}=setup(),events=[];
 c.referenceMappingInput={value:'selected.csv'};
 c.showHmiBusy=()=>{events.push('show');return 'upload';};
 c.updateHmiBusy=()=>events.push('update');c.hideHmiBusy=token=>events.push(`hide:${token}`);
 c.waitForHmiBusyPaint=async()=>events.push('paint');
 c.parseReferenceCsv=()=>[{reference_type:'tag',current_reference:'Old',replacement_reference:'New'}];
 vm.runInContext(source.slice(source.indexOf('const uploadScreenReferenceMappings ='),source.indexOf('const importGraphWorxFile =')),c);
 c.collectScreenReferenceMappings=()=>{events.push('preview');return [];};
 c.file={name:'mapping.csv',text:async()=>{events.push('read');return 'csv';}};
 await vm.runInContext('uploadScreenReferenceMappings(file)',c);
 assert.deepEqual(events,['show','paint','read','update','paint','preview','hide:upload']);
 assert.equal(c.referenceMappingInput.value,'');
});

for(const fail of ['read','validation','preview'])test(`reference upload clears busy state after ${fail} failure`,async()=>{
 const {c}=setup(),messages=[];let hidden=0;
 c.referenceMappingInput={value:'selected.csv'};c.hideHmiBusy=()=>hidden++;c.updateHmiBusy=()=>{};c.showHmiToast=message=>messages.push(message);
 c.parseReferenceCsv=()=>fail==='validation'?[]:[{reference_type:'tag',current_reference:'Old',replacement_reference:'New'}];
 c.file={name:'mapping.csv',text:async()=>{if(fail==='read')throw Error('read failed');return 'csv';}};
 vm.runInContext(source.slice(source.indexOf('const uploadScreenReferenceMappings ='),source.indexOf('const importGraphWorxFile =')),c);
 c.collectScreenReferenceMappings=()=>{throw Error('preview failed');};
 await vm.runInContext('uploadScreenReferenceMappings(file)',c);
 assert.equal(hidden,1);assert.equal(c.referenceMappingInput.value,'');assert.match(messages[0],/Reference import failed:/);
});

test('applying mappings waits for busy paint and prevents double submission',async()=>{
 const {c,handlers,applied}=setup();let resume,shown=0,hidden=0;
 c.showHmiBusy=()=>{shown++;return 'apply';};c.hideHmiBusy=()=>hidden++;
 c.waitForHmiBusyPaint=()=>new Promise(resolve=>{resume=resolve;});
 c.rows=[{reference_type:'tag',current_reference:'OPC Data::Old',replacement_reference:'OPC Data::New'}];
 vm.runInContext('openReferenceMappingPreview(rows)',c);
 const first=handlers.apply();await handlers.apply();
 assert.equal(shown,1);assert.equal(applied.length,0);
 resume();await first;
 assert.equal(applied.length,1);assert.equal(hidden,1);
});
