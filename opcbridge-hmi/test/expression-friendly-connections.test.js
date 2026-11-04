'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/hmi.js'), 'utf8');
const slice = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
test('visibility tag insertion, save and repeated reopen display names while storing IDs', () => {
  const handlers = {};
  const id = 'connection_abc123';
  const editor = { value: '' };
  const obj = { visibility: { expression: `tag("${id}", "Run") == 1` } };
  const noop = () => {};
  const c = vm.createContext({
    getConnectionDisplayName: value => value === id ? 'Field Ops' : value,
    resolveMappedConnectionId: value => value === 'Field Ops' ? id : value,
    visibilityExpressionOverlay: { classList: {remove:noop}, setAttribute:noop },
    getSelectedVisibilityDynamicObject: () => obj,
    isEditingRectVisibilityDynamic: () => true,
    ensureRectVisibilityDraft: noop, rectVisibilityDraft: null,
    getVisibilityRuleState: value => ({rule:value}), visibilityExpressionDraftValue:'',
    visibilityExpressionEditor: editor, syncVisibilityExpressionValidationUi: () => '',
    hideVisibilityExpressionInsertMenu: noop, setVisibilityExpressionTagPickerVisible: noop,
    populateVisibilityExpressionConnectionOptions: noop, populateVisibilityExpressionTagOptions: noop,
    requestAnimationFrame: noop,
    visibilityExpressionSaveBtn: {addEventListener:(_,fn) => {handlers.save=fn;}},
    visibilityExprInsertTagBtn: {addEventListener:(_,fn) => {handlers.insert=fn;}},
    visibilityExprTagConnection: {value:id}, visibilityExprTagName:{value:'Run'},
    insertVisibilityExpressionText: text => {editor.value=text;},
    updateVisibilityProperty: patch => {obj.visibility=patch;}, closeVisibilityExpressionModal:noop,
  });
  vm.runInContext(slice('const decodeExpressionStringLiteral =','const extractVisibilityExpressionTagKeys ='),c);
  vm.runInContext(slice('const openVisibilityExpressionModal =','const hideRectColorExpressionInsertMenu ='),c);
  vm.runInContext(slice('if (visibilityExpressionSaveBtn) {','if (visibilityExpressionEditor) {'),c);
  vm.runInContext(slice('if (visibilityExprInsertTagBtn) {','if (visibilityExpressionOverlay) {'),c);
  for(let i=0;i<3;i++) {
    vm.runInContext('openVisibilityExpressionModal()',c);
    assert.equal(editor.value,'tag("Field Ops", "Run") == 1');
    handlers.insert();
    assert.equal(editor.value,'tag("Field Ops", "Run")');
    editor.value += ' == 1';
    handlers.save();
    assert.equal(obj.visibility.expression,`tag("${id}", "Run") == 1`);
  }
});
