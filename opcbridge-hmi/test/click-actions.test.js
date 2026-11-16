const test = require('node:test');
const assert = require('node:assert/strict');
const actions = require('../public/js/click-actions.js');
const write = tag => ({type:'set-write', connection_id:'PLC', tag, onValue:1});

test('editing a selected action preserves the other actions and their settings', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
  const context = vm.createContext({HmiClickActions: actions});
  vm.runInContext(source.slice(source.indexOf('const clickActionSelection ='), source.indexOf('const renderClickActionList =')), context);
  context.obj = {action: actions.pack([write('A'), {type:'popup', screenId:'detail', aliases:{Title:{value:'Pump'}}}])};
  vm.runInContext('clickActionSelection.set(obj, 1); replaceEditedClickAction(obj, {...getEditedClickAction(obj), screenId:"other"});', context);
  assert.equal(context.obj.action.actions[0].tag, 'A');
  assert.equal(context.obj.action.actions[1].screenId, 'other');
  assert.equal(context.obj.action.actions[1].aliases.Title.value, 'Pump');
});

test('single-action storage is unchanged; multiple actions have one ordered list', () => {
  const one = write('A');
  assert.equal(actions.pack([one]), one);
  assert.deepEqual(actions.list(one), [one]);
  assert.deepEqual(actions.list(actions.pack([one, write('B')])), [one, write('B')]);
});

test('awaits writes before navigation and captures actions before screen mutation', async () => {
  const sequence = actions.pack([write('A'), {type:'load-viewport', viewportId:'v', screenId:'next'}, {type:'close-popup'}]);
  const events = [];
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const running = actions.run(sequence, async action => {
    events.push(action.type);
    if (action.type === 'set-write') { await blocked; events.push('write complete'); }
  });
  sequence.actions.length = 0;
  assert.deepEqual(events, ['set-write']);
  release();
  assert.equal(await running, 3);
  assert.deepEqual(events, ['set-write', 'write complete', 'load-viewport', 'close-popup']);
});

test('partial failure stops all later actions and reports completed count', async () => {
  const seen = [];
  await assert.rejects(actions.run(actions.pack([write('A'), write('B'), {type:'close-popup'}]), async action => {
    seen.push(action.tag);
    if (action.tag === 'B') throw new Error('Access denied');
  }), error => error.completed === 1 && /not rolled back/.test(error.message));
  assert.deepEqual(seen, ['A', 'B']);
});

test('invalid or interactive sequences fail before any action runs', async () => {
  for (const invalid of [{type:'prompt-write'}, {type:'momentary-write'}, {type:'navigate', screenId:''}]) {
    let called = false;
    await assert.rejects(actions.run(actions.pack([write('A'), invalid]), () => { called = true; }));
    assert.equal(called, false);
  }
});

test('confirmation gates each action and Cancel stops the remaining sequence', async () => {
  const calls=[];const action={type:'sequence',actions:[{type:'set-write',connection_id:'PLC',tag:'Reset',onValue:1,requireConfirmation:true,confirmationMessage:'Reset flow data?'},{type:'navigate',screenId:'Done'}]};
  assert.equal(await actions.run(action,async step=>calls.push(step.type)),0, "a confirmed action cannot run without a confirmation handler");
  let resolveConfirmation;
  const pending=actions.run(action,async step=>calls.push(step.type),()=>new Promise(resolve=>{resolveConfirmation=resolve;}));
  assert.deepEqual(calls,[]);resolveConfirmation(false);assert.equal(await pending,0);assert.deepEqual(calls,[]);
  assert.equal(await actions.run(action,async step=>calls.push(step.type),async step=>step.confirmationMessage==='Reset flow data?'),2);
  assert.deepEqual(calls,['set-write','navigate']);
});

test('an empty rectangle Click tab offers confirmation and saves a valid default action', () => {
  const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(`${__dirname}/../public/js/hmi.js`,'utf8');
  const node=()=>({children:[],handlers:{},classList:{toggle(){}},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},setAttribute(key,value){this[key]=value;},addEventListener(key,fn){this.handlers[key]=fn;}});
  const host=node(),obj={type:'rect',clickEnabled:true};let dirty=false;
  const context=vm.createContext({HmiClickActions:actions,usesFullClickEditor:()=>true,
    document:{getElementById:id=>id==='buttonClickActionList'?host:null,createElement:node,createTextNode:text=>({text})},
    buttonActionSelect:{options:[],value:'navigate'},recordHistory(){},setDirty:value=>{dirty=value;},renderScreen(){},syncEditorFromScreen(){},updatePropertiesPanel(){}});
  const start=source.indexOf('const clickActionSelection =');
  vm.runInContext(source.slice(start,source.indexOf('const objectDynamicTabPropertiesBtn =',start)),context);context.obj=obj;
  vm.runInContext('renderClickActionList(obj)',context);
  const checkbox=host.children.find(item=>item.children?.[0]?.type==='checkbox').children[0];
  const messageRow=host.children.find(item=>item.children?.[1]?.placeholder==='Are you sure?');
  assert.equal(checkbox.checked,false);assert.equal(messageRow.hidden,true);assert.equal(obj.action,undefined,'opening properties does not mutate the screen');
  checkbox.checked=true;checkbox.handlers.change();assert.equal(obj.action.type,'navigate');assert.equal(obj.action.requireConfirmation,true);assert.equal(messageRow.hidden,false);assert.equal(dirty,true);
  messageRow.children[1].value='Reset flow data?';messageRow.children[1].handlers.change();assert.equal(obj.action.confirmationMessage,'Reset flow data?');
  host.children.find(item=>item.textContent==='Add Action').handlers.click();
  assert.equal(obj.action.actions.length,2);assert.equal(obj.action.actions[0].requireConfirmation,true);assert.equal(obj.action.actions[0].confirmationMessage,'Reset flow data?');
  vm.runInContext('clickActionSelection.set(obj,0);replaceEditedClickAction(obj,{type:"set-write",connection_id:"PLC",tag:"Reset",onValue:1})',context);
  assert.equal(obj.action.actions[0].requireConfirmation,true);assert.equal(obj.action.actions[0].confirmationMessage,'Reset flow data?');
});
