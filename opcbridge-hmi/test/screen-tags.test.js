const test=require('node:test');
const assert=require('node:assert/strict');
const tags=require('../public/js/screen-tags');
const screen=()=>({screenTags:[{name:'Pending',type:'boolean',initialValue:false},{name:'Setpoint',type:'number',initialValue:12.5},{name:'Label',type:'text',initialValue:'Pump'}]});
test('screen tags initialize typed defaults once per instance and reset after close',()=>{
 const cache=new Map(),quality=new Map(),store=tags.createStore(cache,quality),s=screen();
 const main=store.context('main',s),popup=store.context('popup',s),viewport=store.context('viewport:1',s);
 assert.notEqual(main,popup);assert.notEqual(viewport,popup);assert.equal(quality.get(`_local.${main}Setpoint`),1);
 assert.equal(cache.get(`_local.${main}Setpoint`),12.5);
 assert.equal(store.write(main+'Setpoint','25.75'),25.75);assert.equal(store.write(main+'Label','Edited'),'Edited');
 assert.equal(store.write(main+'Pending',1),true);assert.equal(cache.get(`_local.${popup}Pending`),false);
 assert.equal(store.context('main',s),main);assert.equal(cache.get(`_local.${main}Setpoint`),25.75);
 store.release('popup');assert.throws(()=>store.write(popup+'Pending',true),/closed/);
 const reopened=store.context('popup',s);assert.notEqual(reopened,popup);assert.equal(cache.get(`_local.${reopened}Setpoint`),12.5);
 assert.throws(()=>store.write(main+'Setpoint','not a number'),/finite/);store.clear();assert.equal(cache.size,0);assert.equal(quality.size,0);
});
test('screen bindings, expressions, imported locals and forwarded local aliases retain their scope',()=>{
 const s=screen();s.objects=[{action:{connection_id:'_local',tag:'ImportedFlag'}}];
 assert.ok(tags.definitions(s).some(item=>item.name==='ImportedFlag'&&item.imported));
 const binding={connection_id:'_screen',tag:'Setpoint',expression:'tag("_screen", "Setpoint") + tag("_local", "ImportedFlag")',children:[{bind:{connection_id:'_local',tag:'screen9:Label'}}]};
 tags.resolve(binding,'screen1:');assert.equal(binding.connection_id,'_local');assert.equal(binding.tag,'screen1:Setpoint');
 assert.match(binding.expression,/tag\("_local", "screen1:Setpoint"\)/);assert.match(binding.expression,/screen1:ImportedFlag/);
 assert.equal(binding.children[0].bind.tag,'screen9:Label');
});
test('separate viewports of one screen do not share tag values and replacement screens initialize anew',()=>{
 const cache=new Map(),store=tags.createStore(cache),s=screen();const a=store.context('viewport:A',s),b=store.context('viewport:B',s);
 store.write(a+'Label','A');assert.equal(cache.get(`_local.${b}Label`),'Pump');
 const next=store.context('viewport:A',screen());assert.notEqual(next,a);assert.equal(cache.get(`_local.${next}Label`),'Pump');assert.equal(cache.has(`_local.${a}Label`),false);
});

test('local write API preserves numbers/text, rejects closed scopes, and never calls OPC',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
 const cache=new Map(),store=tags.createStore(cache),prefix=store.context('main',screen());let requests=0;
 const ctx=vm.createContext({screenTagStore:store,tagValueCache:cache,isEditMode:true,
   normalizeTagCacheKey:(connection,name)=>`${connection}.${name}`,coerceTagBoolean:Boolean,
   fetch:async()=>{requests++;throw Error('must not use OPC');}});
 const start=source.indexOf('const apiWriteTag =');vm.runInContext(source.slice(start,source.indexOf('const findNumberInputById =',start)),ctx);
 ctx.prefix=prefix;
 assert.equal((await vm.runInContext('apiWriteTag({connection_id:"_local",tag:prefix+"Setpoint",value:45.75})',ctx)).value,45.75);
 assert.equal((await vm.runInContext('apiWriteTag({connection_id:"_local",tag:prefix+"Label",value:"New label"})',ctx)).value,'New label');
 await assert.rejects(vm.runInContext('apiWriteTag({connection_id:"_screen",tag:"Setpoint",value:1})',ctx),/active screen/);
 store.clear();await assert.rejects(vm.runInContext('apiWriteTag({connection_id:"_local",tag:prefix+"Setpoint",value:1})',ctx),/closed/);
 assert.equal(requests,0);
});

test('renaming a screen tag updates local bindings and expressions without touching PLC tags',()=>{
 const value={objects:[{bind:{connection_id:'_screen',tag:'Old'},expression:'tag("_screen", "Old") + tag("PLC", "Old")'}],layers:[{visibility:{connection_id:'_local',tag:'Old'}}]};
 tags.renameBindings(value,'Old','New');assert.equal(value.objects[0].bind.tag,'New');assert.equal(value.layers[0].visibility.tag,'New');
 assert.equal(value.objects[0].expression,'tag("_screen", "New") + tag("PLC", "Old")');
});
