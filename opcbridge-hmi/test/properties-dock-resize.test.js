const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../public/js/hmi.js`, 'utf8');

for (const dock of ['right']) {
  test(`Properties ${dock} dock resizes from its inside edge and persists width`, () => {
    const listeners = {};
    let saved;
    let down;
    const pane = { dataset: { dock }, style: {}, getBoundingClientRect: () => ({ width: 360 }) };
    const ctx = vm.createContext({
      editorPane: pane, editorResizer: { addEventListener: (_, fn) => { down = fn; } }, isEditMode: true,
      EDITOR_WIDTH_KEY: 'width', saveEditorPaneState: state => { saved = state; }, getEditorPaneState: () => ({ dock }),
      document: { documentElement: { style: { setProperty() {} } }, body: { style: {} } },
      window: { innerWidth: 1400, localStorage: { setItem() {} },
        addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: name => { delete listeners[name]; } }
    });
    const start = source.indexOf('const applyEditorWidth =');
    const end = source.indexOf('window.addEventListener("resize", applyScale)', start);
    vm.runInContext(source.slice(start, end) + '\nbindResizer();', ctx);
    down({ clientX: 500 });
    listeners.mousemove({ clientX: dock === 'left' ? 560 : 440 });
    assert.equal(pane.style.width, '420px');
    assert.equal(saved.w, 420);
    assert.equal(saved.dock, dock);
    listeners.mouseup();
    assert.equal(listeners.mousemove, undefined);
    assert.equal(ctx.document.body.style.cursor, '');
  });
}

test('restoring width before docking does not replace saved panel state', () => {
  let writes = 0;
  const ctx = vm.createContext({ editorPane: { dataset: {}, style: {} }, EDITOR_WIDTH_KEY: 'width',
    saveEditorPaneState: () => { writes++; }, document: { documentElement: { style: { setProperty() {} } } },
    window: { innerWidth: 1400, localStorage: { setItem() {} } } });
  const start = source.indexOf('const applyEditorWidth =');
  vm.runInContext(source.slice(start, source.indexOf('const restoreEditorWidth =', start)) + '\napplyEditorWidth(420);', ctx);
  assert.equal(writes, 0);
});
