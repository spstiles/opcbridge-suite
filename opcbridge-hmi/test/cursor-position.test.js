const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('cursor position uses screen origin, respects zoom, and remembers visibility', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
  const code = source.slice(source.indexOf('const getScreenPoint ='), source.indexOf('const createLibraryDropObject ='));
  const overlay = { style: {} };
  const events = {};
  const menu = { setAttribute() {}, addEventListener(name, fn) { events[name] = fn; } };
  const storage = new Map([['hmi.cursorPosition.enabled', 'true']]);
  const leaf = {};
  const context = vm.createContext({
    isEditMode: true, lastScreenSize: { width: 2000, height: 1000 },
    screen: { getBoundingClientRect: () => ({ left: -100, top: -50, width: 1000, height: 500 }), contains: t => t === leaf },
    screenWrapper: { clientLeft: 0, clientTop: 0, clientWidth: 800, clientHeight: 400,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 400 }) },
    document: { getElementById: id => id === 'cursorPositionOverlay' ? overlay : menu,
      elementFromPoint: () => leaf, addEventListener() {}, documentElement: { addEventListener() {} }, body: {} },
    window: { addEventListener() {} },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    requestAnimationFrame: () => 1,
    ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} }
  });
  vm.runInContext(code, context);
  vm.runInContext('cursorPositionPointer = {clientX: 200, clientY: 100}; renderCursorPosition();', context);
  assert.equal(overlay.textContent, 'X: 600  Y: 300');
  assert.equal(overlay.style.left, '792px');
  vm.runInContext('clearCursorPosition(); renderCursorPosition();', context);
  assert.equal(overlay.textContent, 'X: —  Y: —');
  context.isEditMode = false;
  vm.runInContext('renderCursorPosition();', context);
  assert.equal(overlay.hidden, true);
  events.click();
  assert.equal(storage.get('hmi.cursorPosition.enabled'), 'false');
});
