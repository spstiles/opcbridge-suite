const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
const HmiClickActions = require('../public/js/click-actions');
function helper(ctx, name) {
  const start = source.indexOf(`const ${name} =`);
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
}
function aliases(extra = {}) {
  const ctx = vm.createContext({ getEffectiveScreenAliases: screen => screen.aliases || [], ...extra });
  vm.runInContext(source.slice(source.indexOf('const aliasTokenName ='), source.indexOf('const buildAliasPreviewContext =')), ctx);
  return ctx;
}
const target = (tag) => ({ connection_id: 'PLC', tag });
const referenced = { aliases: [{ name: 'Running', type: 'tag' }, { name: 'Command', type: 'tag' }] };

test('tag aliases resolve indicator reads, expressions and write targets without mutating the saved screen', () => {
  const ctx = aliases({ referenced, mappings: { Running: target('Pump1.Running'), Command: target('Pump1.Command') },
    objects: [{ type: 'indicator', bind: { connection_id: '', tag: '{alias:Running}' } },
      { type: 'text', textBindings: { '1': { sourceType: 'expression', expression: '{alias:Running} * 100' } } },
      { type: 'button', action: { type: 'set-write', tag: '{alias:Command}', onValue: 1 } }] });
  vm.runInContext('context = buildAliasContext(referenced, mappings); resolved = resolveAliasObject(objects, context)', ctx);
  assert.equal(ctx.resolved[0].bind.tag, 'Pump1.Running');
  assert.equal(ctx.resolved[0].bind.connection_id, 'PLC');
  assert.equal(ctx.resolved[1].textBindings['1'].expression, 'tag("PLC", "Pump1.Running") * 100');
  assert.equal(ctx.resolved[2].action.tag, 'Pump1.Command');
  assert.equal(ctx.objects[2].action.tag, '{alias:Command}');
});

test('runtime click targets use each viewport instance alias mapping; editing keeps the source object', () => {
  const button = { id: 'start', type: 'button', action: { type: 'set-write', tag: '{alias:Command}', onValue: 1 } };
  const viewports = ['Pump1', 'Pump2'].map((id) => ({ id, type: 'viewport', aliases: { Command: target(`${id}.Start`) } }));
  const ctx = aliases({ isEditMode: false, currentScreenAliasContext: {},
    screenCache: new Map([['detail', { ...referenced, objects: [button] }]]), viewportAliasMappings: new Map(),
    getActiveObjects: () => viewports, getObjectByScreenPath: () => button });
  helper(ctx, 'getObjectFromMeta');
  for (let index = 0; index < 2; index++) {
    ctx.meta = { index, viewportTargetId: 'detail', viewportChildPath: [0] };
    vm.runInContext('result = getObjectFromMeta(meta)', ctx);
    assert.equal(ctx.result.action.tag, `Pump${index + 1}.Start`);
    assert.equal(ctx.result.action.connection_id, 'PLC');
  }
  ctx.isEditMode = true;
  vm.runInContext('result = getObjectFromMeta(meta)', ctx);
  assert.equal(ctx.result, button);
});

test('forwarded popup aliases and value templates resolve to concrete tags', () => {
  const ctx = aliases({ referenced, parent: { Command: target('Pump2.Start'), Number: 2 },
    mappings: { Command: { tag: '{alias:Command}' } } });
  vm.runInContext('context = buildAliasContext(referenced, mappings, parent); result = resolveAliasObject({action:{tag:"{alias:Command}"}}, context)', ctx);
  assert.equal(ctx.result.action.tag, 'Pump2.Start');
  ctx.context = { Number: 2 };
  vm.runInContext('result = resolveAliasObject({connection_id:"PLC",tag:"Pump{alias:Number}.Start"}, context)', ctx);
  assert.equal(ctx.result.tag, 'Pump2.Start');
});

test('writes send only concrete mapped destinations and reject unresolved aliases before HTTP', async () => {
  const requests = [];
  const ctx = aliases({ isViewOnlyRuntime: () => false, isEditMode: true,
    fetch: async (url, init) => { requests.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ ok: true }) }; },
    getAuditContextForWrite: () => ({}), normalizeTagCacheKey: () => '', referenced,
    mappings: { Command: target('Pump1.Start') } });
  helper(ctx, 'apiWriteTag');
  vm.runInContext('context = buildAliasContext(referenced, mappings); result = resolveAliasObject({connection_id:"",tag:"{alias:Command}",value:1}, context)', ctx);
  ctx.write = ctx.result;
  await vm.runInContext('apiWriteTag(write)', ctx);
  assert.equal(requests[0].connection_id, 'PLC');
  assert.equal(requests[0].tag, 'Pump1.Start');
  await assert.rejects(vm.runInContext('apiWriteTag({connection_id:"PLC",tag:"Pump{alias:Missing}.Start",value:1})', ctx), /alias is unresolved/);
  assert.equal(requests.length, 1);
});

test('momentary alias writes keep the pressed target for release when the calling context changes', async () => {
  const writes = [];
  const ctx = aliases({ action: { type: 'momentary-write', tag: '{alias:Command}', onValue: 1, offValue: 0 },
    context: { Command: target('Pump1.Start') }, write: async request => { writes.push(request); } });
  helper(ctx, 'createMomentaryWriter');
  await vm.runInContext('writer = createMomentaryWriter(write); writer.press(1, resolveAliasObject(action, context), {})', ctx);
  ctx.context = { Command: target('Pump2.Start') };
  await vm.runInContext('writer.release(1)', ctx);
  assert.deepEqual(writes.map(write => [write.connection_id, write.tag, write.value]), [['PLC', 'Pump1.Start', 1], ['PLC', 'Pump1.Start', 0]]);
});

test('shared tag picker offers screen aliases and saves them without a stale connection', () => {
  const element = () => ({ children: [], dataset: {}, appendChild(child) { this.children.push(child); } });
  const select = element();
  select.selectedOptions = [];
  const save = { addEventListener(event, handler) { this[event] = handler; } };
  let binding;
  const ctx = aliases({ currentScreenObj: referenced, tagBindingTagSelect: select,
    tagBindingConnectionSelect: { value: 'OLD_PLC' }, tagBindingTagFilterInput: { value: '' },
    document: { createElement: element }, tagsCache: [], tagPickerConnectionIds: () => [],
    tagPickerMatchesConnection: () => true, tagPickerConnectionId: id => id, tagPickerName: (_, name) => name,
    tagBindingSaveBtn: save, activeCompactTagBindingId: 'buttonWrite',
    getCompactTagBindingConfig: () => ({ apply: value => { binding = value; } }),
    parseTagSelectValue: () => ({ connection_id: '', tag: '{alias:Command}' }), tagBindingTemplateInput: { value: '' },
    closeCompactTagBindingModal() {}, renderCompactTagBindingRows() {} });
  const start = source.indexOf('function populateCompactTagBindingTagOptions(');
  vm.runInContext(source.slice(start, source.indexOf('\nfunction getCompactTagBindingSummary', start)), ctx);
  vm.runInContext('populateCompactTagBindingTagOptions("OLD_PLC")', ctx);
  const group = select.children.find(child => child.label === 'Screen Aliases');
  assert.ok(group);
  const option = group.children.find(child => child.value === '::{alias:Command}');
  assert.ok(option);
  select.selectedOptions = [option]; select.value = option.value;
  const saveStart = source.indexOf('if (tagBindingSaveBtn) {');
  vm.runInContext(source.slice(saveStart, source.indexOf('\nif (tagBindingClearBtn)', saveStart)), ctx);
  save.click();
  assert.equal(binding.tag, '{alias:Command}');
  assert.equal(binding.connection_id, '');
});

test('numeric entries retain the resolved target of their own referenced screen instance', async () => {
  const writes = [];
  const ctx = aliases({ currentScreenAliasContext: {}, findNumberInputById: () => { throw new Error('Must use the rendered instance'); },
    normalizeNumericString: value => value, apiWriteTag: async value => { writes.push(value); } });
  helper(ctx, 'writeNumberInputById');
  ctx.object = { id: 'speed', bindValue: { ...target('Pump2.Speed'), multiplier: 10 } };
  await vm.runInContext('writeNumberInputById("speed", "120", object)', ctx);
  assert.equal(writes[0].tag, 'Pump2.Speed');
  assert.equal(writes[0].value, 12);
});

test('two instances of a referenced screen subscribe to both alias mappings', () => {
  const child = { ...referenced, objects: [{ type: 'indicator', bind: { tag: '{alias:Running}' } }] };
  const ctx = aliases({ currentScreenObj: { objects: [1, 2].map(n => ({ type: 'viewport', id: `v${n}`, target: 'detail',
    aliases: { Running: target(`Pump${n}.Running`) } })) }, currentScreenAliasContext: {}, currentPopupScreenId: null,
    viewportAliasMappings: new Map(), screenCache: new Map([['detail', child]]),
    collectTagKeysFromValue: (value, out) => {
      const visit = value => {
        if (!value || typeof value !== 'object') return;
        if (value.connection_id && value.tag && !value.tag.includes('{alias:')) out.add(`${value.connection_id}:${value.tag}`);
        Object.values(value).forEach(visit);
      }; visit(value);
    } });
  helper(ctx, 'collectActiveWsSubscriptions');
  const subscriptions = vm.runInContext('collectActiveWsSubscriptions()', ctx);
  assert.ok(subscriptions.includes('PLC:Pump1.Running'));
  assert.ok(subscriptions.includes('PLC:Pump2.Running'));
});

test('expression editor accepts alias operands before runtime mappings are supplied', () => {
  const ctx = aliases({ stripQuotedStrings: expression => expression.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, ' ') });
  helper(ctx, 'getAutomationExpressionValidationError');
  ctx.expression = '{alias:Running} * 100 + {alias:Offset}';
  assert.equal(vm.runInContext('getAutomationExpressionValidationError(expression)', ctx), '');
  ctx.expression = '{alias:Running}; alert(1)';
  assert.match(vm.runInContext('getAutomationExpressionValidationError(expression)', ctx), /Unsupported/);
  ctx.expression = '{alias:}';
  assert.match(vm.runInContext('getAutomationExpressionValidationError(expression)', ctx), /Unsupported/);
});

test('caller source type distinguishes a tag mapping from literal text while preserving legacy mappings', () => {
  const ctx = aliases({ screen: { aliases: [{ name: 'Title', type: 'text' }, { name: 'Command', type: 'tag' }] } });
  ctx.mappings = { Title: { sourceType: 'tag', ...target('Pump1.Name') }, Command: { sourceType: 'text', value: 'No command' } };
  vm.runInContext('context = buildAliasContext(screen, mappings)', ctx);
  assert.equal(ctx.context.Title.tag, 'Pump1.Name');
  assert.equal(ctx.context.Title.connection_id, 'PLC');
  assert.equal(ctx.context.Command, 'No command');
  ctx.mappings = { Title: { value: 'Pump One' }, Command: target('Pump1.Start') };
  vm.runInContext('context = buildAliasContext(screen, mappings)', ctx);
  assert.equal(ctx.context.Title, 'Pump One');
  assert.equal(ctx.context.Command.tag, 'Pump1.Start');
});
