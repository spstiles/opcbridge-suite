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
  vm.runInContext(source.slice(source.indexOf('const ALARM_TAG_PICKER_ID ='), source.indexOf('const populateTagSelect =')), c);
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

test('text binding dialog displays friendly names through nested editing and saves IDs', () => {
  const id = 'connection_abc123';
  const expression = `tag("${id}", "Flow") / 694.4`;
  const display = 'tag("Field Ops", "Flow") / 694.4';
  const field = value => ({ value, checked: false });
  const input = field('');
  const handlers = {};
  let nested, saved;
  const noop = () => {};
  const c = vm.createContext({
    getConnectionDisplayName: value => value === id ? 'Field Ops' : value,
    resolveMappedConnectionId: value => value === 'Field Ops' ? id : value,
    textBindingOverlay: { classList: { remove: noop }, setAttribute: noop },
    getActiveObjects: () => [{ type: 'text' }], selectedIndices: [0],
    getTextBindingsMap: () => ({ '1': { sourceType: 'expression', expression } }),
    requestAnimationFrame: noop, tagCatalogLoaded: true, textBindingModalKey: null, textBindingModalObjectType: 'text',
    textBindingTitle: {}, textBindingSourceTypeSelect: field('expression'),
    textBindingPropertySelect: field('value'), textBindingConnectionInput: field(''),
    textBindingTagInput: field(''), textBindingExpressionInput: input,
    textBindingDigitsInput: field(''), textBindingPadZerosInput: field(''),
    textBindingThousandsSeparatorInput: field(''), textBindingDecimalsInput: field('0'),
    textBindingMultiplierInput: field('1'), setTagBindingFieldValues: noop,
    setInputValueSafe: (el, value) => { el.value = value; }, updateTextBindingSourceUi: noop,
    textBindingExpressionEditBtn: { addEventListener: (_, fn) => { handlers.edit = fn; } },
    textBindingSaveBtn: { addEventListener: (_, fn) => { handlers.save = fn; } },
    openAutomationNumericExpressionModal: options => { nested = options; },
    getAutomationExpressionValidationError: () => '',
    updateTextBindingProperty: (key, patch) => { saved = patch; }, closeTextBindingModal: noop
  });
  vm.runInContext(slice('const decodeExpressionStringLiteral =', 'const extractVisibilityExpressionTagKeys ='), c);
  const openStart = source.indexOf('const openTextBindingModal =');
  vm.runInContext(source.slice(openStart, source.indexOf('\n};', openStart) + 3), c);
  vm.runInContext(slice('textBindingExpressionEditBtn?.addEventListener', 'if (textBindingClearBtn) {'), c);
  vm.runInContext('openTextBindingModal("1")', c);
  assert.equal(input.value, display);
  handlers.edit();
  assert.equal(nested.value, display);
  nested.apply(expression);
  assert.equal(input.value, display);
  handlers.save();
  assert.equal(saved.expression, expression);
  assert.equal(saved.sourceType, 'expression');
});
