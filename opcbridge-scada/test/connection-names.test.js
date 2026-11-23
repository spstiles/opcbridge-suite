const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
test('health can show the runtime name before the config cache loads and supports older connection files', () => {
 const c=vm.createContext({state:{connFiles:[],connObjCache:new Map()},MEMORY_CONNECTION_ID:'_memory',
   connectionIdForConnFilePath:()=> 'connection_123'});
 vm.runInContext(source.slice(source.indexOf('function displayConnectionName('),source.indexOf('function displaySystemTagName(')),c);
 assert.equal(c.displayConnectionName('connection_123','Pump Station'), 'Pump Station');
 c.state.connFiles=[{path:'connections/station.json'}];
 c.state.connObjCache.set('connections/station.json',{name:'Legacy Pump Station'});
 assert.equal(c.displayConnectionName('connection_123'), 'Legacy Pump Station');
 assert.equal(c.displayConnectionName('connection_123','connection_123'), 'Legacy Pump Station');
});
test('friendly connection names reject case/space duplicates and allow self-renames and deleted names',async()=>{
 const c=vm.createContext({state:{connFiles:[{path:'a'},{path:'b'}],workspaceDeletePaths:new Set()},
 getConnObjForPath:async path=>path==='a'?{id:'a',description:' Field Ops '}:{id:'b'}});
 vm.runInContext(source.slice(source.indexOf('async function validateUniqueConnectionName('),source.indexOf('async function saveEditedDeviceFromModal()')),c);
 await assert.rejects(vm.runInContext('validateUniqueConnectionName("field OPS")',c),/already in use/);
 await assert.rejects(vm.runInContext('validateUniqueConnectionName(" B ")',c),/already in use/);
 await vm.runInContext('validateUniqueConnectionName("Field Ops", "a")',c);
 c.state.workspaceDeletePaths.add('a');
 await vm.runInContext('validateUniqueConnectionName("Field Ops")',c);
});
