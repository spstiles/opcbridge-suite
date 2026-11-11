const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const source = fs.readFileSync(path.join(__dirname,'../public/js/hmi.js'),'utf8');

test('Library contents reside only inside the standalone Library modal', () => {
  const pane = html.indexOf('<aside id="editor-pane"');
  const end = html.indexOf('</aside>',pane);
  assert.doesNotMatch(html.slice(pane,end), /libraryContents|libraryImagesGrid|textToolBtn|data-panel="library"/);
  const modal = html.indexOf('id="libraryModalOverlay"');
  const host = html.indexOf('id="libraryModalHost"',modal);
  const contents = html.indexOf('id="libraryContents"',host);
  const nextModal = html.indexOf('id="textBindingOverlay"',modal);
  assert.ok(modal < host && host < contents && contents < nextModal);
  for (const id of ['libraryContents','libraryImagesGrid','textToolBtn','imgUploadInput','navToolBtn']) {
    assert.equal(html.split(`id="${id}"`).length-1,1);
  }
  assert.doesNotMatch(html,/data-panel="library"/);
});

test('opening and closing Library only toggles its own modal', () => {
  const classes = new Set(['is-hidden']); const attrs = {};
  const ctx = vm.createContext({ libraryModalOverlay: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) }, setAttribute: (key,value) => { attrs[key]=value; } },
    insertMenuFlyout: null, insertMenuBtn: null, setMenuOpen() {} });
  const start = source.indexOf('const openLibraryModal =');
  vm.runInContext(source.slice(start,source.indexOf('const openSelectedScreenFile =',start)),ctx);
  vm.runInContext('openLibraryModal()',ctx);
  assert.equal(classes.has('is-hidden'),false); assert.equal(attrs['aria-hidden'],'false');
  vm.runInContext('closeLibraryModal()',ctx);
  assert.equal(classes.has('is-hidden'),true); assert.equal(attrs['aria-hidden'],'true');
});
