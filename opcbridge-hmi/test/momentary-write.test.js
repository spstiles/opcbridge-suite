const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/js/hmi.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const createMomentaryWriter ='), source.indexOf('\nif (hmiSvg) {\n  const momentaryWriter')), context);
const create = vm.runInContext('createMomentaryWriter', context);
const action = () => ({ connection_id: 'remote', tag: 'Reset', onValue: 1, offValue: 0 });
const tick = () => new Promise(resolve => setImmediate(resolve));

test('quick release and repeated clicks wait for each earlier write', async () => {
  const calls = [];
  const completions = [];
  const writer = create(request => {
    calls.push(request);
    return new Promise(resolve => completions.push(resolve));
  }, assert.fail);
  writer.press(1, action(), {id:'text'});
  writer.release(1);
  writer.press(2, action(), {});
  const done = writer.release(2);
  await tick();
  assert.deepEqual(calls.map(c => c.value), [1]);
  for (let index = 0; index < 4; index++) {
    assert.equal(calls.length, index + 1);
    completions[index]();
    await tick();
  }
  await done;
  assert.deepEqual(calls.map(c => c.value), [1, 0, 1, 0]);
  assert.ok(calls.every(c => c.keepalive));
});

test('failed press still resets, and a failed reset does not block later clicks', async () => {
  const calls = [], errors = [];
  const writer = create(async request => {
    calls.push(request.value);
    if (calls.length <= 2) throw new Error('lost response');
  }, error => errors.push(error.message));
  writer.press(1, action(), {});
  writer.release(1);
  writer.press(2, action(), {});
  await writer.release(2);
  assert.deepEqual(calls, [1, 0, 1, 0]);
  assert.equal(errors.length, 2);
});

test('release is idempotent, ignores other pointers, and captures the original target', async () => {
  const calls = [];
  const writer = create(async request => calls.push(request), assert.fail);
  const original = action();
  writer.press(1, original, {});
  original.tag = 'Different';
  await writer.release(2);
  assert.equal(calls.length, 1);
  await writer.release(null);
  await writer.release(1);
  assert.deepEqual(calls.map(c => c.tag), ['Reset', 'Reset']);
});

test('a new press releases the previous held target before writing another', async () => {
  const calls = [];
  const writer = create(async request => calls.push([request.tag, request.value]), assert.fail);
  writer.press(1, action(), {});
  writer.press(2, {...action(), tag:'Other'}, {});
  await writer.release(null);
  assert.deepEqual(calls, [['Reset',1], ['Reset',0], ['Other',1], ['Other',0]]);
});

test('runtime pointer cancellation and focus loss reset exactly once', async () => {
  for (const eventName of ['pointerup', 'pointercancel', 'blur', 'pagehide', 'visibilitychange']) {
    const listeners = new Map();
    const surface = name => ({ style: {}, addEventListener(type, fn) { listeners.set(`${name}:${type}`, fn); } });
    const calls = [];
    const svg = surface('svg'), win = surface('window'), doc = surface('document');
    doc.hidden = true;
    const runtime = vm.createContext({
      console, hmiSvg: svg, window: win, document: doc,
      apiWriteTag: async request => calls.push(request.value),
      isEditMode: false, isViewOnlyRuntime: () => false,
      beginRuntimePointerInteraction() {}, endRuntimePointerInteraction() {},
      showDiagnosticsForPointer() {}, hideDiagnosticsTooltip() {},
      getScreenPoint: () => ({}), getMetaAtPoint: () => ({}),
      getObjectFromMeta: () => ({action:{...action(),type:'momentary-write'}})
    });
    const from = source.indexOf('const createMomentaryWriter =');
    const to = source.indexOf('hmiSvg.addEventListener("click",', from);
    vm.runInContext(source.slice(from, to) + '\n}', runtime);
    listeners.get('svg:pointerdown')({pointerId:1,button:0});
    const owner = eventName === 'visibilitychange' ? 'document' : 'window';
    listeners.get(`${owner}:${eventName}`)({pointerId:1});
    listeners.get(`${owner}:${eventName}`)({pointerId:1});
    await tick();
    assert.deepEqual(calls, [1,0], eventName);
  }
});
