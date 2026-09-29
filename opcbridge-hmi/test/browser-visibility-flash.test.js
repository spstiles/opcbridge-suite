const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

test('browser flash preserves phase, idle fallback, and hit-test visibility', () => {
  const ctx = vm.createContext({
    isEditMode: false, document: { timeline: { currentTime: 0 } },
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
  const calls = [];
  ctx.element = { animate: (frames, options) => {
    const animation = {};
    calls.push({ frames, options, animation });
    return animation;
  } };
  for (const time of [2500, 3750]) {
    ctx.document.timeline.currentTime = time;
    vm.runInContext('animateVisibilityFlash(element, getBrowserVisibilityFlash(obj))', ctx);
  }
  assert.equal(calls[0].options.duration, 2000);
  assert.equal(calls[0].frames[1].visibility, 'hidden');
  assert.equal(calls[0].animation.startTime, 0);
  assert.equal(calls[1].animation.startTime, 0);
  ctx.isEditMode = true;
  assert.equal(vm.runInContext('getBrowserVisibilityFlash(obj)', ctx), null);
  assert.equal(vm.runInContext('shouldPaintObject(obj)', ctx), true);
});
