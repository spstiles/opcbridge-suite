const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
class Node {
  constructor(type) { this.type = type; this.childNodes = []; this.attrs = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  appendChild(child) { this.childNodes.push(child); child.parent = this; }
  remove() { this.parent.childNodes = this.parent.childNodes.filter(n => n !== this); }
}
const makeRenderer = () => {
  const errors = [];
  const context = vm.createContext({
    document: { createElementNS: (_, type) => new Node(type) },
    console: { error: (...args) => errors.push(args) },
    HmiArcGeometry: require('../public/js/arc-geometry'),
    getDisplayObject: o => o, applyGroupColorOverridesToObject: o => o,
    shouldRenderObject: () => true, popupSvg: null,
    getObjectRotationDegrees: o => o.rotation || 0,
    mergeGroupColorOverrides: () => null, getGroupColorOverrides: () => null,
    translateObject: (o, x, y) => { o.x += x; o.y += y; },
    getAutomationColor: (_, fallback) => fallback,
    applyRotationTransform: (node, o) => node.setAttribute('transform', `rotate(${o.rotation})`)
  });
  vm.runInContext(source.slice(source.indexOf('const renderObjectInto ='), source.indexOf('const pendingScreens =')), context);
  return { errors, render: vm.runInContext('renderSharedTopLevelObject', context) };
};
const arc = { type: 'arc', x: -40, y: -20, w: 80, h: 40, startAngle: -90, sweepAngle: 90, stroke: '#808080', strokeWidth: 8 };
test('arc rotation handle tracks the same full-ellipse frame as selection', () => {
  const begin = source.indexOf('const canRotateHandleTrack =');
  const end = source.indexOf('if (canRotateHandleTrack)', begin);
  const tracking = source.slice(begin, end);
  for (const rotation of [45, 90, -90, 180, 270]) {
    const context = vm.createContext({ selectedIndices: [0], singleRotation: rotation, singleObj: { ...arc, rotation } });
    assert.equal(vm.runInContext(`${tracking}\nBoolean(canRotateHandleTrack)`, context), true);
  }
  // Exercise the actual selection-bounds branch instead of SVG getBBox(),
  // which returns only the visible quarter of this ellipse.
  const marker = 'else if (!bbox && obj && (item.type === "rect" || item.type === "arc"))';
  const start = source.indexOf(marker);
  assert.ok(start >= 0);
  const stop = source.indexOf('} else if', start);
  const branch = source.slice(start + 5, stop + 1);
  const context = vm.createContext({ bbox: null, obj: arc, item: { type: 'arc' } });
  vm.runInContext(branch, context);
  assert.equal(JSON.stringify(context.bbox), JSON.stringify({ x: -40, y: -20, width: 80, height: 40 }));
});
test('native arcs survive shared rendering and repeated redraws', () => {
  const { render, errors } = makeRenderer();
  for (let i = 0; i < 3; i++) {
    const root = new Node('svg');
    const wrapper = render(root, arc);
    assert.ok(wrapper, 'arc must be registered with main renderer');
    const element = wrapper.childNodes[0];
    assert.equal(element.type, 'path');
    assert.match(element.attrs.d, / A 40 20 /);
    assert.equal(element.attrs.stroke, '#808080');
    assert.equal(element.attrs['stroke-width'], '8');
  }
  assert.deepEqual(errors, []);
});
test('layered arcs remain rendered within nested groups', () => {
  const { render, errors } = makeRenderer();
  const child = { type: 'group', x: 10, y: 5, children: [arc, { ...arc, strokeWidth: 4, stroke: '#cccccc' }] };
  for (let i = 0; i < 3; i++) {
    const wrapper = render(new Node('svg'), { type: 'group', x: 459, y: 414, children: [child] });
    assert.ok(wrapper);
    const paths = wrapper.childNodes[0].childNodes[0].childNodes;
    assert.equal(paths.length, 2);
    assert.equal(paths[0].attrs['stroke-width'], '8');
    assert.equal(paths[1].attrs['stroke-width'], '4');
  }
  assert.deepEqual(errors, []);
});
