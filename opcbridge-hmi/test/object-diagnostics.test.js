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

test('diagnostics shows click automations and tags while keeping unbound artwork silent', () => {
  const ctx = helpers();
  ctx.obj = { type: 'button', label: 'Overview', action: { type: 'navigate', screenId: 'Overview' },
    rotationAutomation: { sourceType: 'expression', expression: '6 * 7' } };
  vm.runInContext('text = buildObjectDiagnosticsText(obj)', ctx);
  assert.match(ctx.text, /Click: navigate\nScreen: Overview/);
  assert.doesNotMatch(ctx.text, /Object:|button|6 \* 7/);
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
  assert.doesNotMatch(tooltip.textContent, /ellipse/);
  assert.match(tooltip.textContent, /Click: momentary-write/);
});


test('diagnostics restores nested click sequences and press/release values alongside tag data', () => {
  const ctx = helpers({ obj: { children: [{ action: { type: 'sequence', actions: [
    { type: 'momentary-write', connection_id: 'PLC', tag: 'Start', onValue: 1, offValue: 0 },
    { type: 'popup', screenId: 'Controls' }, { type: 'history-back' }
  ] } }] } });
  vm.runInContext('text = buildObjectDiagnosticsText(obj)', ctx);
  assert.match(ctx.text, /Click: momentary-write\nPress: 1\nRelease: 0/);
  assert.match(ctx.text, /Click: popup\nScreen: Controls/);
  assert.match(ctx.text, /Click: history-back/);
  assert.match(ctx.text, /Connection: PLC\nTag: Start/);
  assert.doesNotMatch(ctx.text, /Object:/);
});

test('popup diagnostics finds a hidden alias-controlled indicator beneath visible base artwork', () => {
  const tooltip = { style: {}, classList: { remove() {} }, getBoundingClientRect: () => ({ width: 200, height: 100 }) };
  const host = { __hmiDiagnosticObject: { type: 'ellipse' }, parentElement: null };
  // Mirrors Buttons2's nested Group29: the aliased rule has no stored connection.
  const child = { objects: [{ type: 'group', x: 100, y: 50, w: 100, h: 100, children: [
    { type: 'ellipse', x: 10, y: 10, w: 80, h: 80 },
    { type: 'group', x: 10, y: 10, w: 80, h: 80,
      visibility: { enabled: true, rules: [{ enabled: true, tag: '{alias:BarScreenAutoMode}', match: '0', invert: true }] },
      children: [{ type: 'ellipse', x: 0, y: 0, w: 80, h: 80 }] }
  ] }] };
  const ctx = helpers({ diagnosticsModeEnabled: true, isEditMode: false, hmiSvg: {},
    currentPopupScreenId: '30-Bar Screen Buttons2',
    currentPopupAliasContext: { BarScreenAutoMode: { connection_id: 'B030', tag: 'Bar_Screen_1.Auto_Mode' } },
    screenCache: new Map([['30-Bar Screen Buttons2', child]]),
    popupSvg: { getScreenCTM: () => ({ inverse: () => ({}) }), createSVGPoint: () => ({ matrixTransform() { return { x: this.x, y: this.y }; } }) },
    getDisplayObject: obj => obj, getObjectBounds: obj => ({ x: obj.x, y: obj.y, width: obj.w, height: obj.h }),
    getObjectRotationDegrees: () => 0, getObjectRotationPivotPoint: (obj, box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
    pointInBox: (point, box) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height,
    getScreenPoint: () => assert.fail('Must use popup coordinates'),
    hideDiagnosticsTooltip: () => assert.fail('Hidden binding should remain diagnosable'), ensureDiagnosticsTooltip: () => tooltip,
    tagValueCache: new Map([['B030:Bar_Screen_1.Auto_Mode', false]]), tagQualityCache: new Map([['B030:Bar_Screen_1.Auto_Mode', 1]]),
    window: { innerWidth: 1000, innerHeight: 800 },
    event: { clientX: 140, clientY: 90, target: { closest: selector => selector === '#popupSvg' ? {} : host } } });
  vm.runInContext(source.slice(source.indexOf('const aliasTokenName ='), source.indexOf('const buildAliasContext =')), ctx);
  const start = source.indexOf('const showDiagnosticsForPointer =');
  vm.runInContext(source.slice(start, source.indexOf('const setDiagnosticsMode =', start)), ctx);
  vm.runInContext('showDiagnosticsForPointer(event)', ctx);
  assert.match(tooltip.textContent, /Alias: BarScreenAutoMode/);
  assert.match(tooltip.textContent, /Connection: B030\nTag: Bar_Screen_1.Auto_Mode\nValue: false\nQuality: Good/);
  assert.equal((tooltip.textContent.match(/Tag: Bar_Screen_1.Auto_Mode/g) || []).length, 1);
  assert.equal(child.objects[0].children[1].visibility.rules[0].tag, '{alias:BarScreenAutoMode}');
  ctx.child = child;
  assert.equal(vm.runInContext('collectDiagnosticObjectsAtPoint(child.objects, {x: 5, y: 5}).length', ctx), 0);
});
