const test = require('node:test');
const assert = require('node:assert/strict');
const animator = require('../public/js/animator');
const example = () => animator.create([{ type: 'rect', x: 10, y: 20 }, { type: 'group', x: 30, children: [{ type: 'ellipse' }] }, { type: 'image' }]);

test('frames preserve drawings and positions and do not mutate source selections', () => {
  const source = [{ type: 'rect', x: 12, y: 20 }];
  const config = animator.create(source);
  assert.equal(config.frames[0].object.x, 12);
  config.frames[0].object.x = 50;
  assert.equal(source[0].x, 12);
  assert.equal(config.stoppedFrameId, config.frames[0].id);
});

test('playback uses equal frame intervals and wraps without timer-count drift', () => {
  const config = example();
  config.frameIntervalMs = 200;
  for (const [time, index] of [[0, 0], [199, 0], [200, 1], [400, 2], [599, 2], [600, 0], [10400, 1]]) {
    assert.equal(animator.playback(config, time), config.frames[index]);
  }
  config.repeatCount = 2;
  assert.equal(animator.playback(config, 2000), config.frames[2]);
  assert.equal(animator.playback(config, 100000), config.frames[2]);
});

test('inactive playback and invalid data select a deliberate stopped frame', () => {
  const config = example();
  config.stoppedFrameId = config.frames[1].id;
  assert.equal(animator.playback(config, 700, false), config.frames[1]);
  for (const value of [undefined, null, '', NaN, Infinity, 'not a number']) {
    assert.equal(animator.selectValue(config, value), config.frames[1]);
  }
});

test('value selection evenly maps a global range and clamps both endpoints', () => {
  const config = example();
  config.startValue = 10; config.stopValue = 70;
  for (const [value, index] of [[-20, 0], [10, 0], [29, 0], [30, 1], [49, 1], [50, 2], [70, 2], [200, 2]]) {
    assert.equal(animator.selectValue(config, value), config.frames[index]);
  }
  config.stopValue = 5;
  assert.equal(animator.selectValue(config, 10), animator.stopped(config));
});

test('invalid ranges use fallback and frame order survives save', () => {
  const config = example();
  config.stoppedFrameId = config.frames[2].id;
  for (const [start, stop] of [[null, 10], [0, ''], [10, 10], [10, 0], [NaN, 10]]) {
    config.startValue = start; config.stopValue = stop;
    assert.equal(animator.selectValue(config, 1), config.frames[2]);
  }
  config.startValue = 0; config.stopValue = 3;
  animator.move(config, config.frames[2].id, -1);
  const saved = JSON.parse(JSON.stringify(config));
  assert.equal(animator.selectValue(saved, 1).id, config.frames[1].id);
  assert.equal(Object.hasOwn(saved, 'durationMs'), false);
  assert.ok(saved.frames.every(frame => !Object.hasOwn(frame, 'weight')));
});

test('ordering, duplication, deletion and JSON round trips keep stable frame identity', () => {
  const config = example();
  const id = config.frames[0].id;
  animator.move(config, id, 1);
  assert.equal(animator.stopped(config).id, id);
  const copy = animator.duplicate(config, id);
  assert.notEqual(copy.id, id);
  copy.object.x = 100;
  assert.equal(config.frames.find(frame => frame.id === id).object.x, 10);
  assert.equal(animator.stopped(JSON.parse(JSON.stringify(config))).id, id);
  animator.remove(config, id);
  assert.equal(animator.stopped(config), config.frames[0]);
  for (const frame of [...config.frames]) animator.remove(config, frame.id);
  assert.equal(animator.playback(config, 0), null);
});

test('saved groups keep frames as ordinary children without duplicated object payloads', () => {
  const group = { type: 'group', x: 20, y: 30, w: 100, h: 80,
    children: [{ type: 'rect', x: 5, bindValue: { tag: 'Pump.Running' } },
      { type: 'group', children: [{ type: 'text', text: 'Stopped' }] }] };
  const config = animator.attach(group);
  assert.equal(config.frames.length, 2);
  assert.equal(config.frames[0].object, undefined);
  assert.ok(config.frames.every(frame => !Object.hasOwn(frame, 'name')));
  assert.equal(animator.frameObject(group, config.frames[0].id), group.children[0]);
  const saved = JSON.parse(JSON.stringify(group));
  assert.equal(animator.frameObject(saved, config.frames[0].id).bindValue.tag, 'Pump.Running');
  const rendered = animator.display(saved, saved.animator.frames[1]);
  assert.equal(rendered.children.length, 1);
  assert.equal(saved.children.length, 2);
  assert.equal(rendered.w, 100);
  assert.equal(rendered.x, 20);
});

test('frame edits, duplication, ordering and deletion operate on canonical children', () => {
  const group = { type: 'group', children: [{ type: 'rect', x: 10 }, { type: 'text', text: 'Off' }] };
  const config = animator.attach(group);
  const id = config.frames[0].id;
  const copy = animator.duplicateFrame(group, id);
  assert.equal(Object.hasOwn(copy, 'name'), false);
  animator.frameObject(group, copy.id).x = 50;
  assert.equal(animator.frameObject(group, id).x, 10);
  animator.move(config, id, 2);
  assert.equal(animator.display(group, config.frames[2]).children[0].x, 10);
  animator.removeFrame(group, id);
  assert.equal(animator.frameObject(group, id), null);
  assert.equal(group.children.length, 2);
  assert.equal(config.frames.length, 2);
  animator.detach(group);
  assert.equal(group.animator, undefined);
  assert.ok(group.children.every(object => !Object.hasOwn(object, 'animatorFrameId')));
});

test('invalid groups cannot silently acquire an Animator', () => {
  assert.throws(() => animator.attach({ type: 'rect' }), TypeError);
});

test('mounted playback restarts on activation and holds the final finite frame', () => {
  const config = example(); config.repeatCount = 1;
  const clock = animator.controller();
  assert.equal(clock.select(config, 200, false), config.frames[0]);
  assert.equal(clock.select(config, 500, true), config.frames[0]);
  assert.equal(clock.select(config, 1200, 1), config.frames[2]);
  assert.equal(clock.select(config, 1800, 1), config.frames[2]);
  assert.equal(clock.select(config, 1900, 0), config.frames[0]);
  assert.equal(clock.select(config, 2000, 1), config.frames[0]);
  assert.equal(clock.select(config, 2700, 1, false), config.frames[0]);
  assert.equal(clock.select(config, 2800, 1), config.frames[0]);
});

test('separate mounted controllers do not share activation times', () => {
  const config = example();
  const first = animator.controller(), second = animator.controller();
  first.select(config, 0, true);
  assert.equal(first.select(config, 750, true), config.frames[1]);
  assert.equal(second.select(config, 750, true), config.frames[0]);
  config.mode = 'value';
  config.startValue = 0; config.stopValue = 3;
  assert.equal(first.select(config, 800, 3), config.frames[2]);
  assert.equal(first.select(config, 800, 70, false), config.frames[0]);
});

test('seconds divided by six selects ten frames across a minute without a second timer', () => {
  const config = animator.create(Array.from({ length: 10 }, () => ({ type: 'rect' })));
  config.mode = 'value'; config.startValue = 0; config.stopValue = 10;
  for (let second = 0; second < 60; second++) {
    assert.equal(animator.selectValue(config, second / 6), config.frames[Math.floor(second / 6)]);
  }
  assert.equal(animator.selectValue(config, 0), config.frames[0]);
  assert.equal(animator.selectValue(config, 10), config.frames[9]);
});

test('frame groups preserve drawings, accept new drawings and transfer selected members', () => {
  const object = { type: 'rect', x: 12, y: 34 };
  const group = { type: 'group', w: 100, h: 100, children: [object] };
  const config = animator.attach(group);
  const firstId = config.frames[0].id;
  animator.prepareFrameGroups(group);
  const first = animator.frameObject(group, firstId);
  assert.equal(first.x, 0);
  assert.equal(first.children[0], object);
  assert.equal(object.x, 12);
  assert.equal(object.animatorFrameId, undefined);
  const secondFrame = animator.addFrame(group);
  const second = animator.frameObject(group, secondFrame.id);
  assert.equal(second.children.length, 0);
  const label = { type: 'text', text: 'Running' };
  first.children.push(label);
  assert.deepEqual(animator.transfer(group, firstId, secondFrame.id, [label]), [label]);
  assert.deepEqual(first.children, [object]);
  assert.deepEqual(second.children, [label]);
  animator.prepareFrameGroups(group);
  assert.equal(first.children[0], object);
  assert.equal(config.frames.length, 2);
});

test('unassigned outer-group drawings can be adopted without loss or duplication', () => {
  const group = { type: 'group', w: 100, h: 100, children: [{ type: 'rect' }] };
  animator.attach(group);
  const frame = animator.addFrame(group);
  const drawing = { type: 'ellipse', x: 10, y: 15 };
  group.children.push(drawing);
  assert.deepEqual(animator.adoptUnassigned(group, frame.id), [drawing]);
  assert.equal(animator.frameObject(group, frame.id).children[0], drawing);
  assert.equal(group.children.length, 2);
  assert.deepEqual(animator.adoptUnassigned(group, frame.id), []);
});

test('false activation accepts valid false values but unavailable data never starts playback', () => {
  const config = example(); config.animateWhenTrue = false;
  config.stoppedFrameId = config.frames[2].id;
  for (const value of [false, 0, '0']) {
    const clock = animator.controller();
    assert.equal(clock.select(config, 100, value), config.frames[0]);
    assert.equal(clock.select(config, 200, value), config.frames[1]);
    assert.equal(clock.select(config, 250, true), config.frames[2]);
    assert.equal(clock.needsTick(), false);
    assert.equal(clock.select(config, 400, value), config.frames[0]);
  }
  for (const value of [undefined, null, '', ' ', NaN, Infinity, 'invalid']) {
    const clock = animator.controller();
    assert.equal(clock.select(config, 0, value), config.frames[2]);
    assert.equal(clock.needsTick(), false);
  }
});

test('inactive hold retains only displayed frame identity and reactivation restarts', () => {
  const config = example(); config.inactiveFrame = 'current';
  const clock = animator.controller();
  clock.select(config, 0, true);
  assert.equal(clock.select(config, 100, true), config.frames[1]);
  assert.equal(clock.select(config, 170, false), config.frames[1]);
  assert.equal(clock.select(config, 9999, false), config.frames[1]);
  assert.equal(clock.needsTick(), false);
  assert.equal(clock.select(config, 10000, true), config.frames[0]);
  assert.equal(clock.select(config, 10100, true), config.frames[1]);
  assert.equal(clock.select(config, 10200, 0, false), animator.stopped(config));
  assert.equal(clock.select(config, 10300, false), animator.stopped(config));
  assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(config)), 'lastFrameId'), false);
  clock.reset();
  assert.equal(clock.select(config, 10400, false), animator.stopped(config));
});

test('invisible inactive playback draws no frame and always stops scheduling', () => {
  const config = example(); config.inactiveVisible = false;
  const clock = animator.controller();
  assert.equal(clock.select(config, 0, false), null);
  assert.equal(clock.needsTick(), false);
  assert.equal(clock.select(config, 100, true), config.frames[0]);
  assert.equal(clock.select(config, 200, true), config.frames[1]);
  assert.equal(clock.select(config, 250, false), null);
  assert.equal(clock.needsTick(), false);
  assert.equal(clock.select(config, 300, true), config.frames[0]);
  assert.equal(clock.select(config, 350, true, false), null);
  config.enabled = false;
  assert.equal(clock.select(config, 400, true), null);
});

test('Value Selection ignores Playback inactivity settings and falls back on bad data', () => {
  const config = example(); config.mode = 'value';
  config.animateWhenTrue = false; config.inactiveVisible = false; config.inactiveFrame = 'current';
  const clock = animator.controller();
  assert.equal(clock.select(config, 0, 100), config.frames[2]);
  assert.equal(clock.select(config, 1, null), config.frames[0]);
  assert.equal(clock.select(config, 2, 100, false), config.frames[0]);
  assert.equal(clock.needsTick(), false);
});
