const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
function fixture(){
 const select={options:[],value:'',appendChild(option){option.remove=()=>{this.options.splice(this.options.indexOf(option),1);};this.options.push(option);}};
 const ctx=vm.createContext({document:{createElement:()=>({dataset:{}})}});
 const start=source.indexOf('const setScreenTargetSelectValue =');vm.runInContext(source.slice(start,source.indexOf('const isActiveElementWithin =',start)),ctx);ctx.select=select;
 return {select,set:value=>{ctx.target=value;vm.runInContext('setScreenTargetSelectValue(select,target)',ctx);}};
}
test('missing screen targets remain selected and distinguish broken links from unconfigured actions',()=>{
 const f=fixture();f.select.appendChild({value:'Overview',textContent:'Overview',dataset:{}});f.set('Deleted Screen');
 assert.equal(f.select.value,'Deleted Screen');assert.equal(f.select.options.at(-1).textContent,'Missing: Deleted Screen');
 f.set('Other Missing');assert.equal(f.select.options.filter(o=>o.dataset.missingScreen).length,1);assert.equal(f.select.value,'Other Missing');
 f.set('');assert.equal(f.select.value,'');assert.equal(f.select.options.some(o=>o.dataset.missingScreen),false);assert.ok(f.select.options.some(o=>o.value===''&&o.textContent==='Select screen…'));
});
test('restoring or replacing a missing screen removes its temporary option',()=>{
 const f=fixture();f.set('Restored');f.select.appendChild({value:'Restored',textContent:'Restored',dataset:{}});f.set('Restored');
 assert.equal(f.select.options.filter(o=>o.value==='Restored').length,1);assert.equal(f.select.options.some(o=>o.dataset.missingScreen),false);
 f.select.appendChild({value:'Existing',textContent:'Existing',dataset:{}});f.set('Existing');assert.equal(f.select.value,'Existing');
});
