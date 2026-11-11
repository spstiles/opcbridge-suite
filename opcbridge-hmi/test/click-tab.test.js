const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('button write picker uses the shared compact row and reads the selected action', () => {
  const registration = source.match(/registerCompactTagBinding\(\{\s*id: "buttonWrite",[\s\S]*?\n  \}\);/)[0];
  assert.ok(registration.includes('container: buttonWriteFields'));
  assert.ok(registration.includes('beforeEl: buttonWriteOnRow'));
  assert.ok(!registration.includes('inlineOnly'));
  const action = { connection_id: 'connection_a', tag: 'Pump1' };
  let config;
  vm.runInNewContext(registration, {
    registerCompactTagBinding: value => { config = value; },
    buttonWriteFields: {}, buttonWriteOnRow: {},
    getActiveObjects: () => [{}], selectedIndices: [0],
    getEditedClickAction: () => action,
    updateButtonWriteBinding: patch => Object.assign(action, patch)
  });
  config.apply({ connection_id: 'connection_b', tag: 'Pump2' });
  assert.equal(config.read().connection_id, 'connection_b');
  config.apply({ connection_id: 'connection_c', tag: 'Pump2' });
  assert.equal(config.read().connection_id, 'connection_c');
  assert.equal(config.read().tag, 'Pump2');
  for (const id of ['buttonWriteConnection', 'buttonWriteTag', 'buttonWriteTagPickBtn']) {
    assert.ok(!html.includes('id="' + id + '"'));
  }
});

test('buttons always have Click; other objects require an action or explicit addition', () => {
  const context = vm.createContext({});
  vm.runInContext(source.match(/^const hasClickTab = .*;$/m)[0], context);
  const check = obj => { context.obj = obj; return vm.runInContext('hasClickTab(obj)', context); };
  assert.equal(check({type:'button'}), true);
  assert.equal(check({type:'group'}), false);
  assert.equal(check({type:'image', action:{type:'popup', screenId:'target'}}), true);
  assert.equal(check({type:'group', clickEnabled:true}), true);
  assert.equal(check(null), false);
});

test('button action controls live outside appearance properties and retain unique IDs', () => {
  const appearance = html.indexOf('id="buttonProps"');
  const click = html.indexOf('id="buttonClickProps"');
  const action = html.indexOf('id="buttonActionType"');
  const position = html.indexOf('id="buttonX"');
  assert.ok(appearance < position && position < click && click < action);
  for (const id of ['buttonActionType', 'buttonTarget', 'buttonWriteOnValue', 'objectDynamicTabClickBtn']) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1, id);
  }
  assert.ok(html.includes('data-add-dynamic="click"'));
  assert.ok(html.includes('id="dynamicsAddClickMenuBtn"'));
});

test('Click keeps the non-button action editor visible while hiding appearance panels', () => {
  const panelNames = ['screenProps', 'textProps', 'buttonProps', 'groupProps', 'objectActionProps', 'viewportProps',
    'numberInputProps', 'indicatorProps', 'rectProps', 'ellipseProps', 'circleProps', 'lineProps', 'curveProps',
    'polylineProps', 'splineProps', 'polygonProps', 'barProps'];
  const ctx = vm.createContext({ currentObjectDynamicTab: 'click', showAnimatorTab: false });
  for (const name of panelNames) {
    const classes = new Set();
    ctx[name] = { classes, classList: { add: value => classes.add(value) } };
  }
  const start = source.indexOf('  if (currentObjectDynamicTab === "click" || showAnimatorTab) {');
  const end = source.indexOf('  if (showShadowTab || showDropShadowTab)', start);
  const block = source.slice(start, end);
  vm.runInContext(block, ctx);
  assert.equal(ctx.objectActionProps.classes.has('is-hidden'), false, 'Click fields and Remove Click must stay visible');
  assert.equal(ctx.groupProps.classes.has('is-hidden'), true);
  assert.equal(ctx.buttonProps.classes.has('is-hidden'), true);
  ctx.currentObjectDynamicTab = 'animator';
  ctx.showAnimatorTab = true;
  vm.runInContext(block, ctx);
  assert.equal(ctx.objectActionProps.classes.has('is-hidden'), true);
});

test('all drawable objects share the full Click editor and selected-action routing', () => {
  const c=vm.createContext({selectedIndices:[0],getActiveObjects:()=>[c.obj],getEditedClickAction:o=>o.action||{}});
  vm.runInContext(source.match(/^const usesFullClickEditor = .*;$/m)[0],c);
  const start=source.indexOf('const getSelectedActionOwner =');
  vm.runInContext(source.slice(start,source.indexOf('\n};',start)+3),c);
  for(const type of ['text','button','ellipse','rect','circle','polygon','polyline','pipe','spline','curve','line','group','image','viewport','indicator','number-input','bar','arc','alarms-panel']){
    c.obj={type,action:{type:'set-write',tag:'PumpCommand'}};
    assert.equal(vm.runInContext('usesFullClickEditor(obj)',c),true);
    assert.equal(vm.runInContext('getSelectedActionOwner("button").action.tag',c),'PumpCommand');
    assert.equal(vm.runInContext('getSelectedActionOwner("group")',c),null);
  }
  c.obj=null;
  assert.equal(vm.runInContext('usesFullClickEditor(obj)',c),false);
  assert.equal(vm.runInContext('getSelectedActionOwner("button")',c),null);
});

test('shared action updates save text writes without changing text appearance or button properties', () => {
  const obj={type:'text',text:'Start Pump',fill:'#ffffff',fontSize:20};let recorded=0;
  const c=vm.createContext({selectedIndices:[0],getActiveObjects:()=>[obj],recordHistory:()=>recorded++,
    replaceEditedClickAction:(o,action)=>{o.action=action;},renderClickActionList:()=>{},renderScreen:()=>{},syncEditorFromScreen:()=>{},setDirty:()=>{},pruneInactiveTemplateBindings:()=>{}});
  const start=source.indexOf('const updateButtonProperty =');
  vm.runInContext(source.slice(start,source.indexOf('const updateGroupProperty =',start)),c);
  for(const type of ['set-write','toggle-write','momentary-write','prompt-write']){
    c.action={type,connection_id:'PLC',tag:'PumpCommand',onValue:'1',offValue:'0'};
    vm.runInContext('updateButtonProperty({action})',c);
    assert.equal(obj.action.type,type);assert.equal(obj.action.tag,'PumpCommand');assert.equal(obj.text,'Start Pump');assert.equal(obj.fill,'#ffffff');
  }
  vm.runInContext('updateButtonProperty({label:"Wrong control"})',c);
  assert.equal(obj.label,undefined);assert.equal(recorded,4);
});

test('popup settings on text and buttons persist checkbox changes and enable Save for the selected click action', () => {
  const HmiClickActions = require('../public/js/click-actions');
  for (const type of ['text', 'button', 'ellipse', 'rect', 'group', 'image', 'polygon', 'line', 'circle']) {
    const first = { type: 'navigate', screenId: 'Overview' };
    const popup = { type: 'popup', screenId: 'Controls', modal: true, movable: false, aliases: { Pump: { value: '1' } } };
    const obj = { type, text: 'Open Controls', action: HmiClickActions.pack([first, popup]) };
    let dirty = false;
    let history = 0;
    const movable = { checked: true, addEventListener(event, handler) { this[event] = handler; } };
    const c = vm.createContext({ HmiClickActions, obj, selectedIndices: [0],
      getActiveObjects: () => [obj], getAutomationObject: () => obj,
      recordHistory: () => { history++; }, renderClickActionList() {}, renderScreen() {}, syncEditorFromScreen() {},
      setDirty: value => { dirty = value; },
      buttonPopupMovableInput: movable, buttonPopupModalInput: null, buttonPopupXInput: null, buttonPopupYInput: null,
      buttonPopupSizeModeSelect: null, buttonPopupWidthInput: null, buttonPopupHeightInput: null, buttonPopupScaleModeSelect: null,
      buttonPopupFixedSizeFields: null, setPopupFixedSizeFieldsVisible() {},
      buttonPopupSettingsFromInputs: () => ({ modal: true, movable: movable.checked, popupSizeMode: 'screen', popupScaleMode: 'fit' }) });
    vm.runInContext(source.slice(source.indexOf('const usesFullClickEditor ='), source.indexOf('const renderClickActionList =')), c);
    vm.runInContext('clickActionSelection.set(obj, 1)', c);
    vm.runInContext(source.slice(source.indexOf('const updateButtonProperty ='), source.indexOf('const updateGroupProperty =')), c);
    vm.runInContext(source.slice(source.indexOf('const updateButtonPopupSettings ='), source.indexOf('[groupPopupModalInput, groupPopupMovableInput')), c);
    movable.change();
    assert.equal(dirty, true, `${type}: Movable must enable Save`);
    assert.equal(history, 1);
    assert.equal(obj.action.actions[0], first);
    assert.equal(obj.action.actions[1].movable, true);
    assert.equal(obj.action.actions[1].screenId, 'Controls');
    assert.equal(obj.action.actions[1].aliases, popup.aliases);
    dirty = false;
    movable.checked = false;
    movable.change();
    assert.equal(dirty, true, `${type}: clearing Movable must enable Save`);
    assert.equal(obj.action.actions[1].movable, false);
    assert.equal(obj.text, 'Open Controls');
  }
});


test('ellipse Click writes save the selected action without changing ellipse appearance', () => {
  const HmiClickActions = require('../public/js/click-actions');
  const first = { type: 'navigate', screenId: 'Overview' };
  const obj = { type: 'ellipse', x: 10, y: 20, w: 62, h: 62, fill: '#000000', stroke: '#ffffff',
    action: HmiClickActions.pack([first, { type: 'momentary-write', tag: 'Old', onValue: 1, offValue: 0 }]) };
  let dirty = false;
  const c = vm.createContext({ HmiClickActions, obj, selectedIndices: [0], getActiveObjects: () => [obj],
    recordHistory() {}, renderClickActionList() {}, renderScreen() {}, syncEditorFromScreen() {},
    setDirty: value => { dirty = value; } });
  vm.runInContext(source.slice(source.indexOf('const usesFullClickEditor ='), source.indexOf('const renderClickActionList =')), c);
  vm.runInContext('clickActionSelection.set(obj, 1)', c);
  const start = source.indexOf('const updateButtonProperty =');
  vm.runInContext(source.slice(start, source.indexOf('const updateGroupProperty =', start)), c);
  vm.runInContext('updateButtonProperty({action:{type:"momentary-write",connection_id:"PLC",tag:"Auto",onValue:1,offValue:0}})', c);
  assert.equal(dirty, true);
  assert.equal(obj.action.actions[0], first);
  assert.equal(obj.action.actions[1].tag, 'Auto');
  assert.equal(obj.action.actions[1].offValue, 0);
  vm.runInContext('updateButtonProperty({label:"Wrong appearance panel"})', c);
  assert.equal(obj.label, undefined);
  assert.equal(obj.x, 10); assert.equal(obj.y, 20);
  assert.equal(obj.w, 62); assert.equal(obj.h, 62);
  assert.equal(obj.fill, '#000000'); assert.equal(obj.stroke, '#ffffff');
});


test('shared Click writes persist on every object while button appearance edits remain restricted', () => {
  for (const type of ['group','rect','circle','polygon','polyline','pipe','spline','curve','line','image','viewport','indicator','number-input','bar','arc','alarms-panel']) {
    const obj = { type, x: 12, fill: '#123456' };
    let dirty = false;
    const c = vm.createContext({ selectedIndices: [0], getActiveObjects: () => [obj],
      recordHistory() {}, replaceEditedClickAction: (o, action) => { o.action = action; },
      renderClickActionList() {}, renderScreen() {}, syncEditorFromScreen() {}, setDirty: value => { dirty = value; } });
    const start = source.indexOf('const updateButtonProperty =');
    vm.runInContext(source.slice(start, source.indexOf('const updateGroupProperty =', start)), c);
    vm.runInContext('updateButtonProperty({action:{type:"set-write",connection_id:"PLC",tag:"Start",onValue:1}})', c);
    assert.equal(obj.action.tag, 'Start', type);
    assert.equal(dirty, true, type);
    vm.runInContext('updateButtonProperty({label:"Wrong appearance control"})', c);
    assert.equal(obj.label, undefined, type);
    assert.equal(obj.x, 12, type);
    assert.equal(obj.fill, '#123456', type);
  }
});
