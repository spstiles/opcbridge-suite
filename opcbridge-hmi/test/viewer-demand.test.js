const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/hmi.js'), 'utf8');

test('HMI registers screen scope and clears hidden/reconnected viewers without subscribe-all', () => {
  const calls = [];
  const context = vm.createContext({
    wsConnected: true, wsClient: { readyState: 1, send: text => calls.push(JSON.parse(text)) },
    WebSocket: { OPEN: 1 }, document: { visibilityState: 'visible' },
    wsLastSubscribeFingerprint: '', activeTagInfoCache: new Map(),
    collectActiveWsSubscriptions: () => ['C:Visible', '_system:Clock'],
    wsTagKeyToQueryItem: key => ({ connection_id: key.split(':')[0], name: key.split(':')[1] }),
    normalizeTagCacheKey: (cid, name) => `${cid}:${name}`
  });
  vm.runInContext(source.slice(source.indexOf('const wsSendSubscribe ='), source.indexOf('document.addEventListener("visibilitychange", () => {\n  updateWsSubscriptions();')), context);
  vm.runInContext('updateWsSubscriptions()', context);
  assert.deepEqual(calls[0], { type: 'register_demand', owner: 'opcbridge-hmi-viewer', tags: ['C:Visible'] });
  assert.deepEqual(calls[1].tags, ['C:Visible', '_system:Clock']);
  context.document.visibilityState = 'hidden';
  vm.runInContext('updateWsSubscriptions()', context);
  assert.deepEqual(calls[2].tags, []);
  assert.deepEqual(calls[3], { type: 'subscribe', tags: [] });
  context.wsLastSubscribeFingerprint = '';
  vm.runInContext('updateWsSubscriptions()', context);
  assert.deepEqual(calls[5], { type: 'subscribe', tags: [] });
  context.document.visibilityState = 'visible';
  vm.runInContext('updateWsSubscriptions()', context);
  assert.deepEqual(calls[6].tags, ['C:Visible']);
});

test('hidden HMI skips value seeding', async () => {
  const context = vm.createContext({ document: { visibilityState: 'hidden' },
    fetch: () => assert.fail('hidden page requested tag values') });
  vm.runInContext(source.slice(source.indexOf('const seedTagValuesForKeys ='), source.indexOf('const seedActiveTagValues =')) + '\nresult = seedTagValuesForKeys(["C:A"]);', context);
  assert.equal(await context.result, false);
});
