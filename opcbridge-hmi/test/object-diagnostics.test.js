const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function helpers(extra = {}) {
  const ctx = vm.createContext({ extractAutomationExpressionTagReferences: () => [],
    referenceAutomationLabel: path => path.join('.'), evaluateAutomationExpression: () => 42,
    resolveConnectionForKnownTag: value => value, normalizeTagCacheKey: (c, t) => c ? `${c}:${t}` : '',
    tagQualityCache: new Map(), tagValueCache: new Map(), activeTagInfoCache: new Map(), tagsCache: [], tagsAllCache: [],
    getConnectionDisplayName: value => value, isExplicitBadQuality: quality => quality === 0, ...extra });
  vm.runInContext(source.slice(source.indexOf('const diagnosticValueText ='), source.indexOf('const showDiagnosticsForPointer =')), ctx);
  return ctx;
}

test('diagnostics includes nested group automations and omits stale import metadata', () => {
  let deep = { type: 'ellipse', colorAutomationRules: [{ sourceType: 'tag', connection_id: 'PLC', tag: 'Running' }] };
  for (let i = 0; i < 12; i++) deep = { type: 'group', children: [deep] };
  const ctx = helpers({ obj: { ...deep, externalReferences: [{ connection_id: 'PLC', tag: 'OldImport' }] } });
  vm.runInContext('refs = collectObjectDiagnosticReferences(obj); text = buildObjectDiagnosticsText(obj)', ctx);
  assert.equal(ctx.refs.length, 1);
  assert.equal(ctx.refs[0].tag, 'Running');
  assert.match(ctx.text, /Tag: Running/);
  assert.doesNotMatch(ctx.text, /Object:|ellipse|group/);
  assert.doesNotMatch(ctx.text, /OldImport/);
});

test('diagnostics only shows tag information and hides unbound artwork and navigation', () => {
  const ctx = helpers();
  ctx.obj = { type: 'button', label: 'Overview', action: { type: 'navigate', screenId: 'Overview' },
    rotationAutomation: { sourceType: 'expression', expression: '6 * 7' } };
  vm.runInContext('text = buildObjectDiagnosticsText(obj)', ctx);
  assert.equal(ctx.text, '');
  ctx.obj = { type: 'ellipse', bind: { tag: '{alias:Missing}' } };
  vm.runInContext('text = buildObjectDiagnosticsText(obj)', ctx);
  assert.match(ctx.text, /Connection: Unmapped/);
  assert.match(ctx.text, /Tag: \{alias:Missing\}/);
  assert.match(ctx.text, /Value: Unavailable/);
  ctx.obj = { type: 'rect' };
  assert.equal(vm.runInContext('buildObjectDiagnosticsText(obj)', ctx), '');
});

test('popup hover uses the rendered object and includes enclosing group automation', () => {
  const tooltip = { style: {}, classList: { remove() {} }, getBoundingClientRect: () => ({ width: 200, height: 100 }) };
  const group = { __hmiDiagnosticObject: { type: 'group', colorAutomation: { connection_id: 'PLC', tag: 'Running' } }, parentElement: null };
  const host = { __hmiDiagnosticObject: { type: 'ellipse' }, parentElement: { closest: () => group } };
  const ctx = helpers({ diagnosticsModeEnabled: true, isEditMode: false, hmiSvg: {},
    getScreenPoint: () => assert.fail('Popup must not use the main screen coordinate system'),
    hideDiagnosticsTooltip: () => assert.fail('Object diagnostics should be shown'), ensureDiagnosticsTooltip: () => tooltip,
    window: { innerWidth: 1000, innerHeight: 800 },
    event: { clientX: 100, clientY: 100, target: { closest: selector => selector === '#popupSvg' ? {} : host } } });
  const start = source.indexOf('const showDiagnosticsForPointer =');
  vm.runInContext(source.slice(start, source.indexOf('const setDiagnosticsMode =', start)), ctx);
  vm.runInContext('showDiagnosticsForPointer(event)', ctx);
  assert.match(tooltip.textContent, /Connection: PLC/);
  assert.match(tooltip.textContent, /Tag: Running/);
  assert.doesNotMatch(tooltip.textContent, /Object:|ellipse|group/);
});


test('popup decorations do not obscure tag diagnostics on an underlying object', () => {
  const tooltip = { style: {}, classList: { remove() {} }, getBoundingClientRect: () => ({ width: 200, height: 100 }) };
  const decoration = { __hmiDiagnosticObject: { type: 'ellipse' }, parentElement: null };
  const tagged = { __hmiDiagnosticObject: { type: 'ellipse', action: { connection_id: 'PLC', tag: 'Start', type: 'momentary-write' } } };
  const underlying = { closest: selector => selector === '#popupSvg' ? {} : tagged };
  const ctx = helpers({ diagnosticsModeEnabled: true, isEditMode: false, hmiSvg: {},
    document: { elementsFromPoint: () => [underlying] },
    getScreenPoint: () => assert.fail('Popup must not use main-screen hit testing'),
    hideDiagnosticsTooltip: () => assert.fail('Tag diagnostics should be shown'), ensureDiagnosticsTooltip: () => tooltip,
    tagValueCache: new Map([['PLC:Start', 1]]), tagQualityCache: new Map([['PLC:Start', 1]]),
    window: { innerWidth: 1000, innerHeight: 800 },
    event: { clientX: 100, clientY: 100, target: { closest: selector => selector === '#popupSvg' ? {} : decoration } } });
  const start = source.indexOf('const showDiagnosticsForPointer =');
  vm.runInContext(source.slice(start, source.indexOf('const setDiagnosticsMode =', start)), ctx);
  vm.runInContext('showDiagnosticsForPointer(event)', ctx);
  assert.match(tooltip.textContent, /Tag: Start\nValue: 1\nQuality: Good/);
  assert.doesNotMatch(tooltip.textContent, /ellipse|momentary-write/);
});
