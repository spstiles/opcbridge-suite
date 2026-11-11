const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

test('popup drag anchors its starting position and retains coordinates across live redraws', () => {
  const listeners = new Map();
  const header = { addEventListener(type, handler) { this[type] = handler; } };
  const modal = { style: {}, getBoundingClientRect: () => ({ left: 300, top: 200, width: 400, height: 300 }) };
  const overlay = { addEventListener() {}, querySelector: selector => selector === '.popup-header' ? header : modal,
    classList: { add() { assert.equal(modal.style.left, '300px'); assert.equal(modal.style.top, '200px'); } } };
  const ctx = vm.createContext({ popupOverlay: overlay, currentPopupScreenId: 'Controls',
    currentPopupOptions: { movable: true, modal: true }, clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    window: { innerWidth: 1000, innerHeight: 800,
      addEventListener: (type, handler) => listeners.set(type, handler),
      removeEventListener: type => listeners.delete(type) } });
  const start = source.indexOf('if (popupOverlay) {\n  popupOverlay.addEventListener("click"');
  vm.runInContext(source.slice(start, source.indexOf('\nif (setpointCancelBtn)', start)), ctx);
  header.pointerdown({ button: 0, pointerId: 7, clientX: 350, clientY: 220, preventDefault() {} });
  const move = listeners.get('pointermove');
  move({ pointerId: 7, clientX: 450, clientY: 270 });
  assert.equal(modal.style.left, '400px');
  assert.equal(modal.style.top, '250px');
  assert.equal(ctx.currentPopupOptions.popupX, 400);
  assert.equal(ctx.currentPopupOptions.popupY, 250);
  // openPopup replaces this options object on every redraw.
  ctx.currentPopupOptions = { ...ctx.currentPopupOptions };
  move({ pointerId: 7, clientX: 470, clientY: 280 });
  assert.equal(ctx.currentPopupOptions.popupX, 420);
  assert.equal(ctx.currentPopupOptions.popupY, 260);
  move({ pointerId: 8, clientX: 0, clientY: 0 });
  assert.equal(modal.style.left, '420px');
  move({ pointerId: 7, clientX: 2000, clientY: -100 });
  assert.equal(ctx.currentPopupOptions.popupX, 600);
  assert.equal(ctx.currentPopupOptions.popupY, 0);
  listeners.get('pointerup')({ pointerId: 8 });
  assert.equal(listeners.size, 3);
  listeners.get('pointerup')({ pointerId: 7 });
  assert.equal(listeners.size, 0);
});
