const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

function flashDocument() {
  const classes = new Set();
  const clocks = ['fast', 'slow'].map(rate => ({ animationName: `hmi-flash-clock-${rate}`, startTime: null }));
  const unrelated = { animationName: 'unrelated', startTime: 123 };
  let queries = 0;
  return {
    timeline: { currentTime: 0 }, clocks, unrelated,
    documentElement: {
      classList: { contains: name => classes.has(name), add: name => classes.add(name) },
      getAnimations: () => { queries++; return [...clocks, unrelated]; }
    },
    queries: () => queries
  };
}

test('browser flash preserves phase, idle fallback, and hit-test visibility', () => {
  const ctx = vm.createContext({
    isEditMode: false, document: flashDocument(),
    performance: { now: () => 0 },
    evaluateVisibilityRule: rule => rule.active,
  });
  for (const name of ['applyVisibilityFlash', 'getBrowserVisibilityFlash', 'shouldPaintObject', 'animateVisibilityFlash', 'shouldRenderObject']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start)+3), ctx);
  }
  ctx.rule = { enabled: true, active: true, flashEnabled: true, flashRate: 'slow' };
  ctx.obj = { visibility: { enabled: true, defaultVisible: false, rules: [ctx.rule] } };
  for (const [time, visible] of [[0,true], [999,true], [1000,false], [1999,false], [2000,true]]) {
    ctx.document.timeline.currentTime = time;
    assert.equal(vm.runInContext('shouldRenderObject(obj)', ctx), visible);
    assert.equal(vm.runInContext('shouldPaintObject(obj)', ctx), true);
  }
  ctx.rule.active = false;
  assert.equal(vm.runInContext('shouldPaintObject(obj)', ctx), false);
  ctx.rule.active = true;
  ctx.element = { style: {}, animate: () => assert.fail('redrawing a flash must not create an object animation') };
  for (const time of [2500, 3750]) {
    ctx.document.timeline.currentTime = time;
    vm.runInContext('animateVisibilityFlash(element, getBrowserVisibilityFlash(obj))', ctx);
  }
  assert.equal(ctx.element.style.visibility, 'var(--hmi-flash-slow-on, visible)');
  assert.equal(ctx.document.queries(), 1);
  assert.ok(ctx.document.clocks.every(clock => clock.startTime === 0));
  assert.equal(ctx.document.unrelated.startTime, 123);
  ctx.isEditMode = true;
  assert.equal(vm.runInContext('getBrowserVisibilityFlash(obj)', ctx), null);
  assert.equal(vm.runInContext('shouldPaintObject(obj)', ctx), true);
});

test('reverse timing swaps visibility animation and hit-test phases without reversing the source condition', () => {
  for (const [rate, halfPeriod] of [['slow',1000],['fast',500]]) {
    const ctx=vm.createContext({isEditMode:false,document:flashDocument(),evaluateVisibilityRule:rule=>rule.active});
    for(const name of ['applyVisibilityFlash','getBrowserVisibilityFlash','shouldPaintObject','animateVisibilityFlash','shouldRenderObject']){
      const start=source.indexOf(`const ${name} =`);
      vm.runInContext(source.slice(start,source.indexOf('\n};',start)+3),ctx);
    }
    ctx.rule={enabled:true,active:true,flashEnabled:true,flashRate:rate,flashWhen:false};
    ctx.obj={visibility:{enabled:true,defaultVisible:false,rules:[ctx.rule]}};
    assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),false);
    assert.equal(vm.runInContext('shouldPaintObject(obj)',ctx),true);
    ctx.document.timeline.currentTime=halfPeriod;
    assert.equal(vm.runInContext('shouldRenderObject(obj)',ctx),true);
    ctx.element={style:{}};
    vm.runInContext('animateVisibilityFlash(element,getBrowserVisibilityFlash(obj))',ctx);
    assert.equal(ctx.element.style.visibility,`var(--hmi-flash-${rate}-off, hidden)`);
    assert.ok(ctx.document.clocks.every(clock=>clock.startTime===0));
    ctx.rule.active=false;assert.equal(vm.runInContext('shouldPaintObject(obj)',ctx),false);
  }
});

test('color phases and replacement objects share clocks without restarting them', () => {
  const document = flashDocument();
  const ctx = vm.createContext({ document, first: { style: {} }, second: { style: {} } });
  const start = source.indexOf('const animateVisibilityFlash =');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  vm.runInContext(`animateVisibilityFlash(first, {on:true,off:false,rule:{flashRate:'fast'}}, 'opacity')`, ctx);
  document.clocks.forEach(clock => { clock.startTime = 42; });
  for (let i = 0; i < 100; i++) {
    vm.runInContext(`animateVisibilityFlash(second, {on:false,off:true,rule:{flashRate:'fast'}}, 'opacity')`, ctx);
  }
  assert.equal(ctx.first.style.opacity, 'var(--hmi-flash-fast-opacity, 1)');
  assert.equal(ctx.second.style.opacity, 'calc(1 - var(--hmi-flash-fast-opacity, 1))');
  assert.equal(document.queries(), 1);
  assert.ok(document.clocks.every(clock => clock.startTime === 42));
  const unused = { style: {} };
  ctx.unused = unused;
  vm.runInContext(`animateVisibilityFlash(unused, {on:true,off:true,rule:{flashRate:'fast'}})`, ctx);
  assert.deepEqual(unused.style, {});
});
