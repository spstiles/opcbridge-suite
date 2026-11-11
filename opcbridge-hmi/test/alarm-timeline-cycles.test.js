const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');

function timeline() {
  const ctx = vm.createContext({ alarmsStateById: new Map(), alarmTimelineById: new Map(),
    alarmOpenTimelineKeyByAlarmId: new Map(), alarmTimelineSource: 'history',
    normalizeAlarmTimelineId: id => String(id || ''), isIgnoredAlarmHistoryEvent: () => false,
    isReturnedAlarmEventType: type => ['return', 'reset', 'clear', 'missed-return'].includes(type),
    getAlarmStateTimelineKey: id => `state:${id}`, isDisplayableAlarmTimelineRow: () => true });
  for (const name of ['upsertTimelineFromAlarmEvent', 'shouldIngestAlarmHistoryEvent', 'buildLaterReturnEventMap',
    'rebuildAlarmTimelineFromHistoryEvents', 'mergeAlarmTimelineRowWithRuntimeState', 'getAlarmTimelineRows']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  }
  return ctx;
}

test('history reload preserves returned cycles when the same alarm is currently active', () => {
  const ctx = timeline();
  ctx.events = [
    { alarm_id: 'High_Level', type: 'active', ts_ms: 100, message: 'High level' },
    { alarm_id: 'High_Level', type: 'return', ts_ms: 200, message: 'Level normal' },
    { alarm_id: 'High_Level', type: 'active', ts_ms: 300, message: 'High level' },
    { alarm_id: 'High_Level', type: 'clear', ts_ms: 400, message: 'Level normal' },
    { alarm_id: 'High_Level', type: 'active', ts_ms: 500, message: 'High level' }
  ];
  ctx.alarmsStateById.set('High_Level', { alarm_id: 'High_Level', enabled: true, active: true,
    active_since_ms: 500, last_change_ms: 500, message: 'High level', acked: true });
  for (let reload = 0; reload < 3; reload++) {
    vm.runInContext('rebuildAlarmTimelineFromHistoryEvents(events); rows = getAlarmTimelineRows()', ctx);
    assert.equal(ctx.rows.length, 3);
    assert.deepEqual(Array.from(ctx.rows, row => row.last_event_ts_ms), [200, 400, 500]);
    assert.deepEqual(Array.from(ctx.rows, row => row.active), [false, false, true]);
    assert.equal(ctx.rows[0].message, 'Level normal');
    assert.equal(ctx.rows[0].cleared_ts_ms, 200);
    assert.equal(ctx.rows[2].acked, true);
  }
});

test('an active alarm without a matching history occurrence appears once alongside old cycles', () => {
  const ctx = timeline();
  ctx.events = [{ alarm_id: 'High_Level', type: 'active', ts_ms: 100 },
    { alarm_id: 'High_Level', type: 'return', ts_ms: 200 }];
  ctx.alarmsStateById.set('High_Level', { alarm_id: 'High_Level', enabled: true, active: true, active_since_ms: 500 });
  vm.runInContext('rebuildAlarmTimelineFromHistoryEvents(events); rows = getAlarmTimelineRows()', ctx);
  assert.equal(ctx.rows.length, 2);
  assert.equal(ctx.rows.filter(row => row.active).length, 1);
  assert.equal(ctx.rows[0].last_event_ts_ms, 200);
  assert.equal(ctx.rows[1].last_event_ts_ms, 500);
});
