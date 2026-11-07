const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const start = source.indexOf('const centerReferenceObjectInView =');
const helper = source.slice(start, source.indexOf('\n};', start) + 3);

test('reference navigation centers nested object at the current screen scale', () => {
  const wrapper = { scrollLeft: 200, scrollTop: 100, clientLeft: 2, clientTop: 2,
    clientWidth: 800, clientHeight: 600,
    getBoundingClientRect: () => ({ left: 50, top: 80 }) };
  const context = vm.createContext({ isEditMode: true, screenWrapper: wrapper,
    screen: { getBoundingClientRect: () => ({ left: -148, top: -18, width: 2000, height: 1500 }) },
    lastScreenSize: { width: 4000, height: 3000 },
    getActiveOffset: () => ({ x: 1000, y: 800 }),
    getDisplayObject: obj => obj, getObjectBounds: obj => obj });
  vm.runInContext(helper, context);
  vm.runInContext('centerReferenceObjectInView({x:1200,y:900,width:200,height:100})', context);
  assert.equal(wrapper.scrollLeft, 750);
  assert.equal(wrapper.scrollTop, 575);
  context.isEditMode = false;
  vm.runInContext('centerReferenceObjectInView({x:0,y:0,width:20,height:20})', context);
  assert.equal(wrapper.scrollLeft, 750);
  assert.equal(wrapper.scrollTop, 575);
});
