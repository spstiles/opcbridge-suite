const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function mappings(objects, layers = []) {
  const context = vm.createContext({
    currentScreenObj: { objects, layers },
    aliasTokenName: () => '',
    resolveMappedConnectionId: value => value
  });
  for (const [start, end] of [
    ['const decodeExpressionStringLiteral =', 'const rewriteAutomationExpressionConnections ='],
    ['const parseMappedTagReference =', 'function resolveMappedConnectionId('],
    ['const extractAutomationExpressionTagReferences =', 'const extractAutomationExpressionTagKeys ='],
    ['const formatMappedTagReference =', 'const downloadScreenReferenceMappings =']
  ]) vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
  return vm.runInContext('collectScreenReferenceMappings()', context);
}

test('exports unresolved imported expression tags and preserves math on replacement', () => {
  const binding = { sourceType: 'expression', expression: '{{ac:Plant/Flow/Analog}}/1000000', sourceReference: '{{ac:Plant/Flow/Analog}}/1000000', tag: '', connection_id: '' };
  const groups = mappings([{ id: 'flow', textBindings: { '1': binding } }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].current, 'ac:Plant/Flow/Analog');
  assert.equal(groups[0].occurrences[0].status, 'unresolved');
  assert.equal(groups[0].occurrences[0].apply('Plant::Flow', true), true);
  assert.equal(binding.expression, 'tag("Plant", "Flow")/1000000');
  assert.equal(binding.sourceType, 'expression');
});

test('remaps repeated and nested-brace references without changing other expression terms', () => {
  const binding = { sourceType: 'expression', expression: '{{{{ac:A}}}} + {{ac:A}} + {{ac:B}} + tag("Plant", "Good")' };
  const groups = mappings([{ id: 'sum', textBindings: { '1': binding } }]);
  assert.equal(groups.length, 3);
  groups.find(group => group.current === 'ac:A').occurrences[0].apply('Plant::A', true);
  assert.equal(binding.expression, 'tag("Plant", "A") + tag("Plant", "A") + {{ac:B}} + tag("Plant", "Good")');
  assert.equal(binding.status, 'unresolved');
  groups.find(group => group.current === 'ac:B').occurrences[0].apply('Plant::B', true);
  assert.equal(binding.expression, 'tag("Plant", "A") + tag("Plant", "A") + tag("Plant", "B") + tag("Plant", "Good")');
});

test('object mapping repairs only the chosen object and ignores import-history references', () => {
  const first = { sourceType: 'expression', expression: '{{ac:A}} * 2' };
  const second = { ...first };
  const groups = mappings([
    { id: 'one', textBindings: { '1': first }, externalReferences: [{ tag: 'ac:Old', connection_id: '' }] },
    { id: 'two', textBindings: { '1': second } }
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].occurrences.length, 2);
  groups[0].occurrences.find(item => item.objectId === 'one').apply('Plant::A', true);
  assert.equal(first.expression, 'tag("Plant", "A") * 2');
  assert.equal(second.expression, '{{ac:A}} * 2');
});

test('keeps direct unresolved bindings and skips brace-like text inside quoted strings', () => {
  const groups = mappings([{ id: 'one',
    textBindings: {
      '1': { sourceType: 'tag', connection_id: '', tag: 'ac:Missing', status: 'unresolved' },
      '2': { sourceType: 'expression', expression: 'tag("Plant", "Good") + "{{ac:Literal}}"' }
    }
  }]);
  assert.equal(groups.length, 2);
  assert.ok(groups.some(group => group.current === 'ac:Missing'));
  assert.ok(groups.some(group => group.current === 'Plant::Good'));
});


test('layer visibility references use the normal mapper and retain the failure threshold', () => {
  const visibility = {enabled:true,sourceType:'expression',expression:'{{PLANT-OPS Fail Count}}>3',status:'unresolved'};
  const groups = mappings([], [{id:'plant-layer',name:'PlantOpsSwitch',visibility}]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].current,'PLANT-OPS Fail Count');
  assert.equal(groups[0].occurrences[0].objectId,'plant-layer');
  assert.equal(groups[0].occurrences[0].apply('Memory::Plant Fail Count',true),true);
  assert.equal(visibility.expression,'tag("Memory", "Plant Fail Count")>3');
  assert.equal(visibility.status,'resolved');
});

test('legacy process-point state metadata resolves through the existing native States binding', () => {
  const original='ac:S01_Augusta_and_Michigan/Bypass_High_Level/Status';
  const ref={kind:'tag',automation:'GwxProcessPointStateItem',supported:false,status:'unsupported',source:{value:original}};
  const binding={sourceReference:original,connection_id:'PLC',tag:'Bypass',status:'resolved'};
  const obj={importId:'gwx_43',type:'text',multiStateAutomation:binding,externalReferences:[ref]};
  const issue={objectImportId:'gwx_43',category:'unsupported-automation',automation:ref.automation,status:'unsupported',source:{value:original}};
  const ctx=vm.createContext({currentScreenObj:{objects:[obj],referenceHealth:{issues:[issue]}},
    pruneInactiveTemplateBindings:()=>{},knownMappedTag:()=>true,knownMappedScreen:()=>false,
    parseMappedTagReference:()=>({connection_id:'PLC',tag:'Bypass'}),
    collectScreenReferenceMappings:()=>[{type:'tag',current:'PLC::Bypass',occurrences:[{objectId:'gwx_43',automation:'states',original,binding}]}]});
  vm.runInContext(source.slice(source.indexOf('const referenceAutomationMatches ='),source.indexOf('const getReferenceHealthIssues =')),ctx);
  vm.runInContext('reconcileReferenceHealthMetadata()',ctx);
  assert.equal(ref.status,'resolved');assert.equal(ref.supported,true);assert.equal(ref.automation,'states');assert.equal(issue.status,'resolved');
  ctx.knownMappedTag=()=>false;
  vm.runInContext('reconcileReferenceHealthMetadata()',ctx);
  assert.equal(ref.status,'unresolved');assert.equal(issue.status,'unresolved');
});

test('color compatibility copies report one missing reference per color use, separately from States', () => {
  const original='ac:Comms_Status/LS09_Read_Msg_Failure/Status';
  const expression=`{{${original}}} || {{ac:Comms_Status/LS09_Write_Msg_Failure/Status}}`;
  const rule={enabled:true,sourceType:'expression',expression,sourceReference:`x=${expression}`};
  const child={importId:'state-label',type:'text',multiStateAutomation:{...rule}};
  const obj={importId:'indicator',type:'group',colorAutomationRules:[{...rule},{...rule}],fillAutomation:{rules:[{...rule}]},children:[child]};
  const context=vm.createContext({currentScreenObj:{objects:[obj]},aliasTokenName:()=>'',knownMappedTag:()=>false,knownMappedScreen:()=>false,
    pruneInactiveTemplateBindings:()=>{},referenceHealthIssuesScreen:null,referenceHealthIssuesCache:null,tagCatalogLoaded:true,
    getEffectiveScreenAliases:()=>[],screenCache:new Map(),extractAutomationExpressionTagReferences:()=>[],getAutomationExpressionValidationError:()=>'',resolveMappedConnectionId:s=>s});
  for(const name of ['parseMappedTagReference','formatMappedTagReference']){
    const start=source.indexOf(`const ${name} =`);vm.runInContext(source.slice(start,source.indexOf('\n};',start)+3),context);
  }
  vm.runInContext(source.slice(source.indexOf('const referenceAutomationLabel ='),source.indexOf('const displayMappingReference =')),context);
  vm.runInContext(source.slice(source.indexOf('const referenceAutomationMatches ='),source.indexOf('const renderReferenceHealthBadge =')),context);
  const issues=vm.runInContext('getReferenceHealthIssues()',context).filter(issue=>issue.source.value===original);
  assert.equal(issues.length,2);
  assert.deepEqual(Array.from(issues,issue=>issue.automation).sort(),['color','states']);
  assert.deepEqual(Array.from(issues,issue=>issue.objectImportId).sort(),['indicator','state-label']);
  const group=vm.runInContext('collectScreenReferenceMappings()',context).find(group=>group.current===original);
  assert.equal(group.occurrences.length,4); // Keep every storage location repairable.
  group.occurrences.forEach(occurrence=>occurrence.apply('PLC::ReadFailure',true));
  assert.ok(obj.fillAutomation.rules[0].expression.includes('tag("PLC", "ReadFailure")'));
  assert.ok(child.multiStateAutomation.expression.includes('tag("PLC", "ReadFailure")'));
});
