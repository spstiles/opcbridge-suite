const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function buildWorkspaceTagFolders('), source.indexOf('function buildTree(')), context);
const build = names => context.buildWorkspaceTagFolders(names.map(name => ({ name })), 'Field_Ops');

test('nested dotted names form folders while leaf identities retain full names', () => {
  const tree = build(['Lift_Station_01.Pump_01.Running', 'Lift_Station_01.Pump_01.Failed', 'Lift_Station_01.Generator_Running']);
  const station = tree[0];
  assert.equal(station.type, 'tag_folder');
  assert.equal(station.label, 'Lift_Station_01');
  const pump = station.children[0];
  assert.equal(pump.meta.tag_prefix, 'Lift_Station_01.Pump_01');
  assert.equal(pump.children[1].label, 'Running');
  assert.equal(pump.children[1].meta.name, 'Lift_Station_01.Pump_01.Running');
  assert.equal(pump.children[1].id, 'tag:Field_Ops::Lift_Station_01.Pump_01.Running');
});

test('standalone tags coexist with folders of the same name', () => {
  const tree = build(['Pump_01', 'Pump_01.Running']);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].type, 'tag_folder');
  assert.equal(tree[1].type, 'tag');
  assert.equal(tree[0].label, tree[1].label);
  assert.notEqual(tree[0].id, tree[1].id);
});

test('folder matches respect dot boundaries and include descendants', () => {
  assert.equal(context.workspaceTagInFolder('Pump_01.Running', 'Pump_01'), true);
  assert.equal(context.workspaceTagInFolder('Pump_01.Motor.Failed', 'Pump_01'), true);
  assert.equal(context.workspaceTagInFolder('Pump_010.Running', 'Pump_01'), false);
  assert.equal(context.workspaceTagInFolder('Pump_01', 'Pump_01'), false);
});

test('existing unusual names remain accessible and source configuration is unchanged', () => {
  const tags = [{ name: '.Leading' }, { name: 'Empty..Segment' }, { name: 'Trailing.' }];
  const before = JSON.stringify(tags);
  const tree = context.buildWorkspaceTagFolders(tags, 'c');
  assert.equal(tree.length, 3);
  assert.ok(tree.every(node => node.type === 'tag'));
  assert.equal(JSON.stringify(tags), before);
});

test('live folder filtering occurs before pagination and excludes other connections', async () => {
  const rows = Array.from({ length: 600 }, (_, i) => ({ connection_id: 'Field_Ops', name: `${i < 300 ? 'Pump_01' : 'Pump_010'}.Tag${i}` }));
  rows.push({ connection_id: 'Other', name: 'Pump_01.Running' });
  const state = { liveTagsPaging: { indexLoaded: false }, liveTagFilter: { type: 'tag_folder', connection_id: 'Field_Ops', prefix: 'Pump_01' } };
  let queried = [];
  const live = vm.createContext({
    state, URLSearchParams, isPanelActive: () => true,
    liveTagsQueryParamsForCurrentScope: () => ({ params: new URLSearchParams() }),
    apiGet: async () => ({ tags: rows, total: rows.length }),
    apiPostJson: async (url, body) => { queried = body.tags; return { tags: [] }; },
    sessionSystemRowsForLiveParams: () => [],
    liveTagKey: row => `${row.connection_id}::${row.name}`,
    compareLiveTagIndexRows: (a, b) => a.name.localeCompare(b.name),
    workspaceTagInFolder: context.workspaceTagInFolder,
    liveTagsBuildVisibleResponse: () => ({ tags: state.liveTagsPaging.index.slice(0, 250) })
  });
  vm.runInContext(source.slice(source.indexOf('async function loadVisibleLiveTags('), source.indexOf('function wireLiveTagsPagingUi(')), live);
  await live.loadVisibleLiveTags();
  assert.equal(state.liveTagsPaging.total, 300);
  assert.equal(queried.length, 250);
  assert.ok(queried.every(row => row.connection_id === 'Field_Ops' && row.name.startsWith('Pump_01.')));
});
