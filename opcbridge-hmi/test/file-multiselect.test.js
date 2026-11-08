const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/hmi.js'), 'utf8');
function fn(name) {
  const start = source.indexOf(`const ${name} =`);
  return source.slice(start, source.indexOf('\n};', start) + 3) + `\nthis.${name} = ${name};`;
}
test('file selection supports toggle and ranges but save-as stays single-select', () => {
  const rows = ['a', 'b', 'c'].map(name => ({ _fileEntry: { source: 'screens', kind: 'file', path: name },
    classList: { toggle() {} } }));
  const ctx = vm.createContext({ screenFileMode: 'manager', screenFileSource: 'screens',
    screenFileSelections: new Map(), screenFileSelectionAnchor: null,
    openFileList: { querySelectorAll: () => rows }, updateScreenFileFooterButtons() {}, updateScreenFileSelectionSummary() {},
    screenFileEntryKey: entry => `${entry.source}:${entry.path}` });
  vm.runInContext(fn('selectScreenFileEntry'), ctx);
  ctx.selectScreenFileEntry(rows[0], rows[0]._fileEntry);
  ctx.selectScreenFileEntry(rows[2], rows[2]._fileEntry, { shiftKey: true });
  assert.equal(ctx.screenFileSelections.size, 3);
  ctx.selectScreenFileEntry(rows[1], rows[1]._fileEntry, { ctrlKey: true });
  assert.equal(ctx.screenFileSelections.size, 2);
  ctx.screenFileMode = 'saveAs';
  ctx.selectScreenFileEntry(rows[1], rows[1]._fileEntry, { ctrlKey: true });
  assert.equal(ctx.screenFileSelections.size, 1);
});
test('batch deletion confirms once, continues after failure, and cancellation deletes nothing', async () => {
  const requests = [], statuses = []; let confirmations = 0;
  const ctx = vm.createContext({ screenFileSelections: new Map([['a', { kind: 'file', source: 'screens', path: 'a.screen' }],
    ['b', { kind: 'file', source: 'screens', path: 'b.screen' }]]),
    screenFileSource: 'screens', screenFileDir: '', currentScreenPath: 'other.screen', isDirty: false,
    window: { confirm: () => { confirmations++; return true; } }, screenFileDeleteBtn: {}, screenFileNameInput: {},
    fetch: async url => { requests.push(url); return { ok: !url.includes('a.screen'), status: 500 }; },
    refreshScreensList: async () => {}, navigateScreenFileLocation: async () => {},
    updateScreenFileFooterButtons() {}, updateScreenFileSelectionSummary() {}, setEditorStatusSafe: s => statuses.push(s) });
  vm.runInContext(fn('deleteSelectedScreenFile'), ctx);
  await ctx.deleteSelectedScreenFile();
  assert.equal(confirmations, 1);
  assert.equal(requests.length, 2);
  assert.match(statuses.at(-1), /a.screen: HTTP 500/);
  ctx.screenFileSelections.set('c', { kind: 'file', source: 'images', name: 'c.png' });
  ctx.window.confirm = () => false;
  await ctx.deleteSelectedScreenFile();
  assert.equal(requests.length, 2);
});
