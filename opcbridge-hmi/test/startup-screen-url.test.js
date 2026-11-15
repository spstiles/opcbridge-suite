const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function resolve(url){
  const parsed=new URL(url,'http://localhost:3000');
  const ctx=vm.createContext({window:{location:parsed},URLSearchParams});
  const start=source.indexOf('const isTouchRuntimeEndpoint =');
  vm.runInContext(source.slice(start,source.indexOf('let isEditMode =',start)),ctx);
  return {screen:vm.runInContext('startupScreenOverrideId',ctx),touch:vm.runInContext('isTouchRuntimeEndpoint',ctx)};
}

test('normal HMI screen links decode names and retain the standard interface',()=>{
  assert.deepEqual(resolve('/?screen=130-Preliminary%20Treatment'),{screen:'130-Preliminary Treatment',touch:false});
  assert.deepEqual(resolve('/?screen=SPS+Test.screen&mode=edit'),{screen:'SPS Test',touch:false});
  assert.deepEqual(resolve('/?startup=Overview.jsonc'),{screen:'Overview',touch:false});
});

test('touch links retain query overrides and path-based startup screens',()=>{
  assert.deepEqual(resolve('/touch?screen=Overview'),{screen:'Overview',touch:true});
  assert.deepEqual(resolve('/touch/130-Preliminary%20Treatment'),{screen:'130-Preliminary Treatment',touch:true});
  assert.equal(resolve('/touch/Overview?screen=SPS%20Test').screen,'SPS Test');
});

test('URLs without a screen override retain the configured default selection',()=>{
  assert.equal(resolve('/').screen,'');assert.equal(resolve('/?screen=').screen,'');
  assert.equal(resolve('/touch').screen,'');
});
