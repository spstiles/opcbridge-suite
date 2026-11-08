const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAlarmSource } = require('../server/alarm-source');
test('Configure Server supplies both HTTP and websocket alarm endpoints', () => {
  assert.deepEqual(normalizeAlarmSource({alarms: {scheme:'https',host:'192.168.100.43',port:9085,wsPort:9086}}),
    {scheme:'https',host:'192.168.100.43',httpPort:9085,wsPort:9086});
});
test('legacy configurations receive the default websocket port', () => {
  assert.equal(normalizeAlarmSource({alarms:{host:'192.168.100.43',port:8085}}).wsPort,8086);
  assert.equal(normalizeAlarmSource({}).host,'127.0.0.1');
});
test('invalid configured ports fail instead of selecting a different server', () => {
  assert.throws(() => normalizeAlarmSource({alarms:{port:70000}}));
  assert.throws(() => normalizeAlarmSource({alarms:{wsPort:'bad'}}));
});
