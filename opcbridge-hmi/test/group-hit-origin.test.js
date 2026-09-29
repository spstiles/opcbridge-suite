const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

test('overflowing group children retain their drawn click positions and viewport clipping', () => {
  const button = { type: 'button', x: -205, y: 103, w: 150, h: 78 };
  const group = { type: 'group', x: 1711, y: 1459, w: 102, h: 71, children: [button] };
  const ctx = vm.createContext({
    group, isEditMode: false, groupEditStack: [],
    getDisplayObject: x => x, shouldRenderObject: x => !x.hidden,
    pointInBox: (p, b) => p.x >= b.x && p.x <= b.x+b.width && p.y >= b.y && p.y <= b.y+b.height,
    getActiveOffset: () => ({ x: 0, y: 0 }), getActiveObjects: () => [group],
    getObjectRotationDegrees: () => 0,
    renderedElementMeta: [{ index: 0, type: 'group' }],
    screenCache: new Map([['child', { objects: [group] }]]),
    computeViewportTransform: () => ({ x: 0, y: 0, w: 1600, h: 1600, scale: 1, offsetX: 0, offsetY: 0 })
  });
  for (const name of ['getObjectBounds', 'getGroupContentBounds', 'findHitInObjectList',
    'findRuntimeChildMetaInViewport', 'findRuntimeChildMetaInGroup', 'getMetaAtPoint']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start)+3), ctx);
  }
  let hit = vm.runInContext('getMetaAtPoint({x: 1550, y: 1580})', ctx);
  assert.equal(hit.type, 'button');
  assert.equal(hit.bounds.x, 1506);
  assert.equal(hit.bounds.y, 1562);
  // Nested child extends left and below both its own and its parent's boxes.
  group.children = [{ type: 'group', x: 0, y: 0, w: 20, h: 20, children: [button] }];
  hit = vm.runInContext('getMetaAtPoint({x: 1550, y: 1580})', ctx);
  assert.deepEqual(Array.from(hit.childPath), [0, 0]);
  hit = vm.runInContext('findRuntimeChildMetaInViewport({target: "child"}, 0, {x: 1550, y: 1580})', ctx);
  assert.deepEqual(Array.from(hit.viewportChildPath), [0, 0, 0]);
  assert.equal(vm.runInContext('findRuntimeChildMetaInViewport({target: "child"}, 0, {x: 1620, y: 1580})', ctx), null);
  button.hidden = true;
  hit = vm.runInContext('getMetaAtPoint({x: 1550, y: 1580})', ctx);
  assert.notEqual(hit?.type, 'button');
});
