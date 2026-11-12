const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../public/js/hmi.js`, 'utf8');

for (const type of ['group', 'rect', 'text', 'button']) {
  test(`custom secondary color picker updates the correct ${type} target`, () => {
    let patch;
    const ctx = vm.createContext({getSelectedColorDynamicObject:()=>({type}),
      isHexColor:value=>/^#[0-9a-f]{6}$/i.test(value), updateRectColorDraft:value=>{patch=value;},
      input:{value:''}, text:{value:''}});
    const start = source.indexOf('const applyRectColorDraftColor =');
    vm.runInContext(source.slice(start, source.indexOf('const applyAutomationColor =', start)), ctx);
    vm.runInContext(`applyRectColorDraftColor('#fa3232', input, text, 'strokeColor', 'strokeEnabled')`, ctx);
    assert.deepEqual(JSON.parse(JSON.stringify(patch)), type === 'group'
      ? {textColor:'#fa3232',textEnabled:true} : {strokeColor:'#fa3232',strokeEnabled:true});
    assert.equal(ctx.input.value,'#fa3232');
    assert.equal(ctx.text.value,'#fa3232');
    vm.runInContext(`applyRectColorDraftColor('#008c3c', input, text, 'fillColor', 'fillEnabled')`, ctx);
    assert.deepEqual(JSON.parse(JSON.stringify(patch)),{fillColor:'#008c3c',fillEnabled:true});
  });
}
