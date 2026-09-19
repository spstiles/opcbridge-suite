const test = require('node:test');
const assert = require('node:assert/strict');
const arc = require('../public/js/arc-geometry');
test('exact quarter ellipse, signed sweeps and full circles', () => {
  const o = { x: 10, y: 20, w: 100, h: 60, startAngle: 0, sweepAngle: 90 };
  assert.deepEqual(arc.point(o, 0), { x: 110, y: 50 });
  assert.match(arc.path(o), /^M 110 50 A 50 30 0 0 1 60 80$/);
  assert.match(arc.path({ ...o, sweepAngle: -90 }), /A 50 30 0 0 0/);
  assert.equal((arc.path({ ...o, sweepAngle: 360 }).match(/ A /g) || []).length, 2);
  assert.equal(arc.path({ ...o, w: 0 }), '');
  assert.equal(arc.path({ ...o, sweepAngle: 0 }), '');
  for (const angle of [-170, -90, 0, 45, 130]) {
    assert.ok(Math.abs(arc.angle(o, arc.point(o, angle)) - angle) < 1e-9);
  }
});
test('drag endpoints define all four bends without moving the start', () => {
  const a = { x: 120, y: 90 };
  const near = (actual, expected) => {
    assert.ok(Math.abs(actual.x - expected.x) < 1e-9);
    assert.ok(Math.abs(actual.y - expected.y) < 1e-9);
  };
  for (const dx of [-40, 40]) for (const dy of [-25, 25]) {
    const b = { x: a.x + dx, y: a.y + dy };
    for (const circle of [false, true]) {
      const o = arc.fromEndpoints(a, b, circle);
      near(arc.point(o, o.startAngle), a);
      near(arc.point(o, o.startAngle + o.sweepAngle), circle
        ? { x: b.x, y: a.y + Math.sign(dy) * 40 } : b);
      assert.equal(Math.abs(o.sweepAngle), 90);
      if (circle) assert.equal(o.w, o.h);
      for (let i = 0; i <= 10; i++) {
        const p = arc.point(o, o.startAngle + o.sweepAngle * i / 10);
        assert.ok((p.x - a.x) * Math.sign(dx) >= -1e-9);
        assert.ok((p.y - a.y) * Math.sign(dy) >= -1e-9);
      }
    }
  }
});
test('clicks and axis-aligned drags do not create degenerate arcs', () => {
  const a = { x: 1, y: 2 };
  for (const b of [a, { x: 1, y: 50 }, { x: 50, y: 2 }]) {
    assert.equal(arc.fromEndpoints(a, b), null);
    assert.equal(arc.fromEndpoints(a, b, true), null);
  }
});
