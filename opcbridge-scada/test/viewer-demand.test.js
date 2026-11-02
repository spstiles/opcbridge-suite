const test = require('node:test');
const assert = require('node:assert/strict');
const ViewerDemand = require('../public/viewer-demand');
const row = name => ({ connection_id: 'C', name });

test('viewport scope deduplicates, excludes disabled/system rows and renews between reads', async () => {
  let now = 0;
  const calls = [];
  const viewer = new ViewerDemand({ clientId: 'tab1', now: () => now, visible: () => true,
    post: async (...args) => calls.push(args) });
  await viewer.setTags([row('A'), row('A'), { ...row('Off'), enabled: false }, { connection_id: '_system', name: 'Clock' }]);
  assert.deepEqual(calls[0][1].tags, ['C:A']);
  now = 9000; await viewer.tick(); assert.equal(calls.length, 1);
  now = 10001; await viewer.tick(); assert.equal(calls.length, 2);
  await viewer.setTags([row('B')]);
  assert.deepEqual(calls[2][1].tags, ['C:B']);
  await viewer.setTags([]);
  assert.equal(calls[3][0], '/polling/demand/release');
  assert.equal(calls[3][2], true);
});

test('hidden views release and restore; tabs use independent IDs', async () => {
  let visible = true;
  const calls = [];
  const viewer = new ViewerDemand({ clientId: 'first', visible: () => visible,
    post: async (path, body) => calls.push({ path, body }) });
  await viewer.setTags([row('A')]);
  visible = false; await viewer.tick(true);
  assert.equal(calls[1].path, '/polling/demand/release');
  visible = true; await viewer.tick(true);
  assert.deepEqual(calls[2].body.tags, ['C:A']);
  const second = new ViewerDemand({ clientId: 'second', visible: () => true,
    post: async (path, body) => calls.push({ path, body }) });
  await second.setTags([row('A')]);
  await viewer.release();
  assert.equal(calls[3].body.client_id, 'second');
  assert.equal(calls[4].body.client_id, 'first');
});

test('in-flight registration finishes before a later release; failures do not break reads', async () => {
  let finish;
  const calls = [];
  const viewer = new ViewerDemand({ clientId: 'tab', visible: () => true,
    post: async path => {
      calls.push(path);
      if (calls.length === 1) await new Promise(resolve => { finish = resolve; });
    } });
  const first = viewer.setTags([row('A')]);
  await Promise.resolve();
  viewer.release();
  finish(); await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['/polling/demand/register', '/polling/demand/release']);
  const broken = new ViewerDemand({ clientId: 'old-core', visible: () => true,
    post: async () => { throw new Error('404'); } });
  await broken.setTags([row('A')]);
  await broken.release();
});

test('browser loads viewer helper before app and proxy permits only its explicit endpoints', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.indexOf('src="viewer-demand.js"') < html.indexOf('src="app.js'));
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/viewer-demand.js'), 'utf8'), context);
  vm.runInContext('result = typeof ViewerDemand', context);
  assert.equal(context.result, 'function');
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  vm.runInContext(server.slice(server.indexOf('function isAllowedOpcbridgePath('), server.indexOf('function needsWriteToken(')), context);
  for (const route of ['/polling/demand', '/polling/demand/register', '/polling/demand/release'])
    assert.equal(context.isAllowedOpcbridgePath(route), true);
  assert.equal(context.isAllowedOpcbridgePath('/polling/demand/anything'), false);
});

test('hidden Workspace does not refresh tag values', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const cached = { tags: [] };
  const context = vm.createContext({ document: { visibilityState: 'hidden' },
    liveTagsBuildVisibleResponse: () => cached,
    apiGet: () => assert.fail('hidden Workspace fetched values'),
    apiPostJson: () => assert.fail('hidden Workspace fetched values') });
  vm.runInContext(source.slice(source.indexOf('async function loadVisibleLiveTags('), source.indexOf('function wireLiveTagsPagingUi(')), context);
  assert.equal(await context.loadVisibleLiveTags(), cached);
});


test('trust notification socket opts out of tag updates on every connection', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const sockets = [];
  class Socket {
    constructor() { this.messages = []; sockets.push(this); }
    send(text) { this.messages.push(JSON.parse(text)); }
    close() {}
  }
  const context = vm.createContext({ WebSocket: Socket,
    opcuaTrustEventsPort: 0, opcuaTrustEventsSocket: null, opcuaTrustEventsReconnectTimer: 0,
    window: { location: { protocol: 'http:', hostname: 'localhost' }, clearTimeout() {}, setTimeout() {} },
    configureServerTabIsActive: () => true,
    refreshOpcuaTrust: async () => { context.refreshed = true; }
  });
  vm.runInContext(source.slice(source.indexOf('function connectOpcuaTrustEvents('), source.indexOf('async function applySvcSettings(')), context);
  for (let i = 0; i < 2; i++) {
    context.connectOpcuaTrustEvents({ ws_enabled: true, ws_port: 8090 });
    sockets[i].onopen();
    assert.deepEqual(sockets[i].messages, [{ type: 'subscribe', tags: [] }]);
    sockets[i].onmessage({ data: JSON.stringify({ type: 'opcua_trust_changed' }) });
    assert.equal(context.refreshed, true);
    context.refreshed = false;
  }
});

test('Live Tags distinguishes polling lifecycle from disabled tags and actual faults', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('function computeTagStatus('),
    source.indexOf('function renderLiveTagsInto(')), context);
  const status = row => context.computeTagStatus(row);
  for (const [state, label] of [['inactive', 'INACTIVE'], ['waiting', 'WAITING']]) {
    const result = status({ polling_state: state, quality: 0, value: null });
    assert.equal(result.status, label);
    assert.equal(result.cls, 'status-warn');
    assert.equal(status({ polling_state: state, has_snapshot: false }).status, label);
    assert.equal(status({ polling_state: state, enabled: false }).status, 'DISABLED');
    assert.equal(status({ polling_state: state, reason: 'disabled' }).status, 'DISABLED');
    assert.equal(status({ polling_state: state, handle_ok: false }).status, 'BAD_HANDLE');
  }
  assert.equal(status({ polling_state: 'active', quality: 1 }).status, 'GOOD');
  assert.equal(status({ polling_state: 'error', quality: 0 }).status, 'BAD');
  assert.equal(status({ quality: 0 }).status, 'BAD');
  assert.equal(status({ has_snapshot: false }).status, 'MISSING');
  assert.equal(status({ has_snapshot: false, is_array_root: true }).status, 'ARRAY');
  assert.equal(status({ has_snapshot: false, reason: 'mqtt_disabled' }).status, 'MQTT_DISABLED');
});

test('old Live Tags index responses cannot overwrite a reset or a newer request', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const pending = [];
  const page = { indexLoaded: false, valueByKey: new Map() };
  const state = { liveTagsPaging: page };
  const context = vm.createContext({ state, Map, document: { visibilityState: 'visible' },
    liveTagsQueryParamsForCurrentScope: () => ({ params: new URLSearchParams() }),
    liveTagsBuildVisibleResponse: () => ({ tags: page.index || [] }),
    apiGet: () => new Promise(resolve => pending.push(resolve)),
    apiPostJson: async () => ({ tags: [] }),
    sessionSystemRowsForLiveParams: () => [], liveTagKey: row => row.name,
    isPanelActive: () => false, compareLiveTagIndexRows: () => 0,
    scadaViewerDemand: { release() {} }, els: {} });
  vm.runInContext(source.slice(source.indexOf('function resetLiveTagsViewport()'),
    source.indexOf('function liveTagKey(')), context);
  vm.runInContext(source.slice(source.indexOf('async function loadVisibleLiveTags('),
    source.indexOf('function wireLiveTagsPagingUi(')), context);
  const old = context.loadVisibleLiveTags();
  context.resetLiveTagsViewport();
  const newer = context.loadVisibleLiveTags();
  pending[1]({ tags: [{ name: 'New', connection_id: 'C' }] });
  await newer;
  pending[0]({ tags: [{ name: 'Old', connection_id: 'C' }] });
  const result = await old;
  assert.equal(page.index[0].name, 'New');
  assert.equal(result.tags[0].name, 'New');
});

test('overlapping value responses and hidden-tab completions cannot replace current values', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const row = { connection_id: 'C', name: 'Visible', value: 0 };
  const page = { indexLoaded: true, valueByKey: new Map([['Visible', row]]) };
  const pending = [];
  const document = { visibilityState: 'visible' };
  const context = vm.createContext({ Map, document, state: { liveTagsPaging: page },
    liveTagsQueryParamsForCurrentScope: () => ({ params: new URLSearchParams() }),
    liveTagsBuildVisibleResponse: () => ({ tags: [page.valueByKey.get('Visible')] }),
    sessionSystemRowsForLiveParams: () => [], liveTagKey: row => row.name,
    apiPostJson: () => new Promise(resolve => pending.push(resolve)) });
  vm.runInContext(source.slice(source.indexOf('async function loadVisibleLiveTags('),
    source.indexOf('function wireLiveTagsPagingUi(')), context);
  const old = context.loadVisibleLiveTags();
  const newer = context.loadVisibleLiveTags();
  pending[1]({ tags: [{ ...row, value: 2 }] }); await newer;
  pending[0]({ tags: [{ ...row, value: 1 }] }); await old;
  assert.equal(page.valueByKey.get('Visible').value, 2);
  const hiding = context.loadVisibleLiveTags();
  document.visibilityState = 'hidden';
  pending[2]({ tags: [{ ...row, value: 3 }] }); await hiding;
  assert.equal(page.valueByKey.get('Visible').value, 2);
});

test('a 5123-tag Live Tags list queries and registers only the viewport plus overscan', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const index = Array.from({ length: 5123 }, (_, n) => ({ connection_id: 'PLC', name: `Tag${n}` }));
  const page = { indexLoaded: true, index, rowHeight: 34, valueByKey: new Map() };
  const wrap = { scrollTop: 0, clientHeight: 340 };
  const requests = [];
  const registrations = [];
  const viewer = new ViewerDemand({ clientId: 'large-list', visible: () => true,
    post: async (path, body) => registrations.push({ path, body }) });
  const context = vm.createContext({ Map, state: { liveTagsPaging: page },
    document: { visibilityState: 'visible' }, els: { workspaceLiveTagsWrap: wrap },
    liveTagKey: row => `${row.connection_id}:${row.name}`,
    liveTagsQueryParamsForCurrentScope: () => ({ params: new URLSearchParams() }),
    sessionSystemRowsForLiveParams: () => [],
    apiGet: () => assert.fail('loaded index was requested again'),
    apiPostJson: async (path, body) => {
      requests.push(body.tags);
      return { tags: body.tags.map(row => ({ ...row, quality: 1, value: 7 })) };
    } });
  vm.runInContext(source.slice(source.indexOf('function liveTagsVisibleRange()'),
    source.indexOf('function liveTagsQueryParamsForCurrentScope()')), context);
  vm.runInContext(source.slice(source.indexOf('async function loadVisibleLiveTags('),
    source.indexOf('function wireLiveTagsPagingUi(')), context);
  for (const [scrollTop, first, last] of [[0, 0, 39], [34000, 988, 1027], [174148, 5110, 5122]]) {
    wrap.scrollTop = scrollTop;
    const response = await context.loadVisibleLiveTags();
    await viewer.setTags(response.tags);
    const queried = requests.at(-1);
    assert.equal(queried[0].name, `Tag${first}`);
    assert.equal(queried.at(-1).name, `Tag${last}`);
    assert.equal(queried.length, last - first + 1);
    assert.equal(response.total, 5123);
    assert.deepEqual(new Set(registrations.at(-1).body.tags),
      new Set(Array.from(queried, row => `PLC:${row.name}`)));
    assert.ok(queried.length <= 40);
  }
  assert.equal(page.valueByKey.has('PLC:Tag3000'), false);
  assert.equal(registrations.length, 3);
  await viewer.release();
  assert.equal(registrations.at(-1).path, '/polling/demand/release');
});

test('connection polling choice defaults on and preserves explicit all-tag settings', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('function normalizePollingMode('), source.indexOf('function isMqttConnectionObj(')), context);
  assert.equal(context.applyPollingConfigToConnection({}, {}).poll_active_only, true);
  assert.equal(context.applyPollingConfigToConnection({}, { activeOnly: false }).poll_active_only, false);
  assert.equal(context.applyPollingConfigToConnection({ poll_active_only: false }, {}).poll_active_only, false);
  assert.equal(context.applyPollingConfigToConnection({ poll_active_only: false }, { activeOnly: true }).poll_active_only, true);
  for (const prefix of ['edit', 'new']) {
    assert.ok(source.includes(`activeOnly: els.${prefix}DevPollActiveOnly?.value !== 'all'`));
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert.ok(html.includes(`id="${prefix}DevPollActiveOnly"`));
  }
});

test('Overview shows active sweep and sample age, with clear warmup and idle states', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const target = { innerHTML: '', querySelectorAll: () => [] };
  const context = vm.createContext({ els: { overviewHealthConnections: target },
    displayConnectionName: cid => cid, classForStatus: () => 'status-ok', escapeHtml: value => String(value),
    state: { overviewHealthExpanded: new Set() } });
  vm.runInContext(source.slice(source.indexOf('function renderOverviewHealth('), source.indexOf('function badge(')), context);
  const info = { status: 'ok', polling_activity: 'active', full_sweep_available: false,
    active_sweep_work: 1, active_sweep_ms_avg_10s: 400, active_sweep_ms_last: 420, oldest_active_sample_age_ms: 250 };
  const render = () => { context.renderOverviewHealth({ status: 'ok', connections: { PLC: info } }); return target.innerHTML; };
  assert.match(render(), /active sweep 400 ms avg10s/);
  assert.match(render(), /oldest active 250 ms/);
  info.active_sweep_ms_avg_10s = null; info.active_sweep_ms_last = null;
  info.oldest_active_sample_age_ms = null; info.active_without_sample = 1;
  assert.match(render(), /active sweep measuring/);
  assert.match(render(), /1 active read without a GOOD sample/);
  info.active_sweep_ms_last = 400; info.active_sweep_last_age_ms = 30000;
  assert.match(render(), /active sweep 400 ms last \(30.0 s ago\)/);
  info.polling_activity = 'idle'; info.active_sweep_work = 0; info.active_sweep_ms_last = null; info.active_without_sample = 0;
  assert.doesNotMatch(render(), /active sweep|oldest active|full sweep unavailable/);
});
