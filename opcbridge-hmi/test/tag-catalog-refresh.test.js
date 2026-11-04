'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
test('editor refresh prevents duplicate requests, reports completion, and restores controls', async () => {
  let finish;
  let calls=0;
  const buttons=[{disabled:false},{disabled:false}];
  const notices=[];
  const c=vm.createContext({document:{querySelectorAll:()=>buttons},
    loadTags:()=>{calls++;return new Promise(resolve=>{finish=resolve;});},
    showHmiToast:message=>notices.push(message)});
  vm.runInContext(source.slice(source.indexOf('let tagCatalogRefreshPending ='),source.indexOf('document.addEventListener("click", event => {', source.indexOf('let tagCatalogRefreshPending ='))),c);
  const first=vm.runInContext('refreshEditorTagCatalog()',c);
  await vm.runInContext('refreshEditorTagCatalog()',c);
  assert.equal(calls,1); assert.ok(buttons.every(b=>b.disabled));
  finish(true); await first;
  assert.ok(buttons.every(b=>!b.disabled)); assert.equal(notices[0],'Tag list refreshed.');
  const second=vm.runInContext('refreshEditorTagCatalog()',c);
  finish(false); await second;
  assert.equal(calls,2); assert.match(notices[1],/Could not refresh/);
  assert.ok(buttons.every(b=>!b.disabled));
});
test('failed catalog requests preserve existing tags, connection choices, and unsaved screen edits',async()=>{
  const tags=[{connection_id:'PLC',name:'Existing'}];
  const screen={objects:[{text:'Unsaved edit'}]};
  const c=vm.createContext({tagsCache:tags,tagsAllCache:tags,tagCatalogLoaded:true,
    currentScreenObj:screen,tagsStatus:{textContent:''},isEditMode:false,
    fetch:async()=>{throw new Error('offline');},hideHmiBusy:()=>{}});
  vm.runInContext(source.slice(source.indexOf('const loadTags ='),source.indexOf('const loadImageFiles =')),c);
  assert.equal(await vm.runInContext('loadTags()',c),false);
  assert.equal(c.tagsCache,tags);assert.equal(c.tagsAllCache,tags);
  assert.equal(c.currentScreenObj,screen);assert.equal(c.tagCatalogLoaded,true);
  assert.match(c.tagsStatus.textContent,/offline/);
});
