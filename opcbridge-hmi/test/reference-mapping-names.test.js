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
 recordHistory:noop,syncMappedReferenceMetadata:noop,syncObjectMappedReferenceMetadata:noop,
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
for(const legacy of [false,true])test(`mapping imports ${legacy?'legacy IDs':'friendly names'} for current and replacement references`,()=>{
 const{c,handlers,applied,id}=setup();
 c.rows=[{reference_type:'tag',current_reference:`${legacy?id:'OPC Data'}::Old`,replacement_reference:`${legacy?id:'OPC Data'}::New`}];
 vm.runInContext('openReferenceMappingPreview(rows)',c);handlers.apply();
 assert.equal(applied.length,1);assert.equal(applied[0][0],`${id}::New`);
});
