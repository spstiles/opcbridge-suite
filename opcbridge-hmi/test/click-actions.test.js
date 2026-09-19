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
