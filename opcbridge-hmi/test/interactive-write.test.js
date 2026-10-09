const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../server/app.js'), 'utf8');
const start = source.indexOf('  app.post("/api/opc/write"');
const end = source.indexOf('\n  });', start) + '\n  });'.length;
function harness(status, body) {
  let handler; const requests = []; const audits = [];
  const context = vm.createContext({
    app: { post: (route, callback) => { handler = callback; } },
    readConfig: async () => ({ config: { opcbridge: { host: 'local-core', httpPort: 8080, writeToken: 'service-write-token' }, hmi: {} } }),
    fetch: async (url, options) => { requests.push({ url, options }); return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) }; },
    appendAudit: async (req, event) => { audits.push({ actor: req.auditActor, event }); }
  });
  vm.runInContext(source.slice(start, end), context);
  const req = { headers: { cookie: 'OPCBRIDGE_ADMIN_TOKEN=operator-session', 'x-opcbridge-hmi-user': 'forged-name', 'x-admin-token': 'forged-service-token' }, body: { connection_id: 'memory', tag: 'Setpoint', value: 42 } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  return { run: () => handler(req, res), requests, audits, req, res };
}
test('HMI forwards one write request with token/session and records the core-confirmed actor', async () => {
  const h = harness(200, { ok: true, authenticated_user: { username: 'actual-operator', groups: ['operator'] } });
  await h.run();
  assert.equal(h.requests.length, 1); assert.equal(h.requests[0].url, 'http://local-core:8080/write/interactive');
  assert.equal(h.requests[0].options.headers.Cookie, h.req.headers.cookie);
  assert.equal(h.requests[0].options.headers['X-Admin-Token'], undefined);
  assert.equal(JSON.parse(h.requests[0].options.body).token, 'service-write-token');
  assert.equal(h.audits[0].actor.name, 'actual-operator'); assert.equal(h.audits[0].actor.attribution, 'authenticated');
  assert.equal(h.audits[0].event.result, 'success'); assert.equal(h.res.statusCode, 200);
});
test('expired session is rejected and cannot substitute a browser-reported username', async () => {
  const h = harness(401, { ok: false, error: 'Login required' }); await h.run();
  assert.equal(h.res.statusCode, 401); assert.equal(h.requests.length, 1);
  assert.equal(h.audits[0].actor.name, ''); assert.equal(h.audits[0].event.result, 'failure');
});
test('permission rejection retains the checked actor and is not retried', async () => {
  const h = harness(403, { ok: false, error: 'Write permission required', authenticated_user: { username: 'reader', groups: ['viewer'] } }); await h.run();
  assert.equal(h.res.statusCode, 403); assert.equal(h.requests.length, 1); assert.equal(h.audits[0].actor.name, 'reader');
});
test('older core returns an upgrade error, with no fallback to token-only writes', async () => {
  const h = harness(404, { error: 'Not found' }); await h.run();
  assert.equal(h.requests.length, 1); assert.match(h.res.body.error, /must be updated/); assert.equal(h.audits[0].event.result, 'failure');
});
