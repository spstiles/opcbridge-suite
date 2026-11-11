const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
test('health messages use friendly names without modifying saved references or tag names',()=>{
  const c=vm.createContext({getConnectionDisplayName:id=>id==='connection_abc123'?'OPC Data':'Missing connection',formatAutomationExpressionForDisplay:s=>s});
  vm.runInContext(source.slice(source.indexOf('const getReferenceHealthIssueDisplay ='),source.indexOf('const openReferenceHealth =')),c);
  const issue={category:'tag',source:{value:'connection_abc123::FieldOps/Missing'},message:'visibility tag not found: connection_abc123::FieldOps/Missing'};
  c.issue=issue;
  vm.runInContext('display = getReferenceHealthIssueDisplay(issue)',c);
  assert.equal(c.display.message,'visibility tag not found: OPC Data::FieldOps/Missing');
  assert.equal(c.display.source,'OPC Data::FieldOps/Missing');
  assert.equal(issue.source.value,'connection_abc123::FieldOps/Missing');
  c.issue={category:'tag',source:{value:'connection_abc123::connection_deadbeef'},message:'not found: connection_abc123::connection_deadbeef'};
  vm.runInContext('display = getReferenceHealthIssueDisplay(issue)',c);
  assert.equal(c.display.message,'not found: OPC Data::connection_deadbeef');
  c.issue={category:'tag',source:{value:'connection_deadbeef::Missing'},message:'tag not found: connection_deadbeef::Missing'};
  vm.runInContext('display = getReferenceHealthIssueDisplay(issue)',c);
  assert.equal(c.display.source,'Missing connection::Missing');
});
test('selected object References Needing Attention uses friendly labels after changing connection',()=>{
 const make=()=>({children:[],setAttribute(){},classList:{toggle:()=>{}},appendChild(child){this.children.push(child);},append(...children){this.children.push(...children);}});
 const panel=make();
 const raw='connection_9783c3b9638597fb::<#PLANT_OPS#>\\PLC2.B130.BarScreen_Manual_Effluent_Gate.Open_Position';
 const issue={category:'tag',automation:'visibility',objectImportId:'gate',source:{value:raw}};
 const c=vm.createContext({selectedReferenceHealthProps:panel,getReferenceHealthIssues:()=>[issue],
   getConnectionDisplayName:()=> 'OPC Data',formatAutomationExpressionForDisplay:value=>value,
   document:{createElement:()=>make()}});
 vm.runInContext(source.slice(source.indexOf('const getReferenceHealthIssueDisplay ='),source.indexOf('const openReferenceHealth =')),c);
 vm.runInContext(source.slice(source.indexOf('const renderSelectedReferenceProperties ='),source.indexOf('const updatePropertiesPanel =')),c);
 vm.runInContext('renderSelectedReferenceProperties({id:"gate"})',c);
 const input=panel.children[0].children[1].children[0].children[1];
 assert.equal(input.value,raw.replace('connection_9783c3b9638597fb','OPC Data'));
 assert.doesNotMatch(input.title,/connection_9783c3b9638597fb/);
 assert.equal(issue.source.value,raw);
});
