const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function element() {
  return { children: [], classList: { toggle() {} },
    append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); },
    addEventListener(event, handler) { this[event] = handler; } };
}
async function editor(kind) {
  const host = element();
  const first = { type: 'navigate', screenId: 'Overview' };
  const action = { type: 'popup', screenId: 'Detail', aliases: { Other: { value: 42 } } };
  const owner = { type: kind === 'button' ? 'button' : 'group', actions: [first, action] };
  let selected = owner;
  let selectedIndex = 1;
  let dirty = false;
  let config;
  let opened;
  let toast;
  const ctx = vm.createContext({ buttonTargetAliases: host, groupTargetAliases: host,
    getScreenForAliases: async () => ({}), getEffectiveScreenAliases: () => [{ name: 'Command', type: 'tag', required: true }],
    document: { createElement: element }, setFriendlyConnectionInputValue: (input, value) => { input.value = value; },
    connectionIdFromFriendlyInput: input => input.value,
    getAutomationObject: () => selected, getEditedClickAction: obj => obj?.actions[selectedIndex],
    getSelectedActionOwner: () => ({ ...selected, action: selected.actions[selectedIndex] }),
    updateButtonProperty: patch => { selected.actions[selectedIndex] = patch.action; dirty = true; },
    updateSelectedGroupAction: patch => { Object.assign(selected.actions[selectedIndex], patch); dirty = true; },
    registerCompactTagBinding: value => { config = value; }, openCompactTagBindingModal: id => { opened = id; },
    showHmiToast: message => { toast = message; }, renderReferenceHealthBadge() {} });
  vm.runInContext(source.slice(source.indexOf('let targetAliasRenderSequence ='), source.indexOf('const renderIndicatorStatesEditor =')), ctx);
  ctx.kind = kind; ctx.action = action;
  await vm.runInContext('renderTargetAliasEditor(kind, "Detail", action)', ctx);
  const row = host.children[2];
  const picker = row.children[1].children[2];
  picker.click();
  return { owner, first, action, picker, config: () => config, opened: () => opened, dirty: () => dirty, toast: () => toast,
    changeObject: () => { selected = { actions: [{ type: 'popup' }] }; },
    changeAction: () => { selectedIndex = 0; } };
}

test('calling button and group alias pickers save to the selected action and preserve other mappings', async () => {
  for (const kind of ['button', 'group']) {
    const fixture = await editor(kind);
    assert.equal(fixture.opened(), 'target-screen-alias');
    fixture.config().apply({ connection_id: 'PLC', tag: 'Pump1.Start' });
    assert.equal(fixture.dirty(), true);
    assert.equal(fixture.owner.actions[0], fixture.first);
    assert.equal(fixture.owner.actions[1].aliases.Command.connection_id, 'PLC');
    assert.equal(fixture.owner.actions[1].aliases.Command.tag, 'Pump1.Start');
    assert.equal(fixture.owner.actions[1].aliases.Other.value, 42);
  }
});

test('alias picker can forward a parent alias and clear a mapping', async () => {
  let fixture = await editor('button');
  fixture.config().apply({ connection_id: '', tag: '{alias:ParentCommand}' });
  assert.equal(fixture.owner.actions[1].aliases.Command.tag, '{alias:ParentCommand}');
  fixture = await editor('button');
  fixture.config().apply({ connection_id: '', tag: '' });
  assert.equal(fixture.owner.actions[1].aliases.Command.tag, '');
});

test('alias picker does not write into a different selected object or click action', async () => {
  for (const change of ['changeObject', 'changeAction']) {
    const fixture = await editor('button');
    fixture[change]();
    fixture.config().apply({ connection_id: 'PLC', tag: 'Wrong.Start' });
    assert.equal(fixture.dirty(), false);
    assert.equal(fixture.action.aliases.Command, undefined);
    assert.match(fixture.toast(), /action changed/);
  }
});
