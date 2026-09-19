const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

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
