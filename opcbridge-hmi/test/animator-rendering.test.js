const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const animator = require('../public/js/animator');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/hmi.js'), 'utf8');

test('Animator scheduler repaints only changed mounted frames and releases detached hosts', () => {
  const drawing = { type: 'group', children: [{ type: 'rect' }, { type: 'ellipse' }] };
  animator.attach(drawing);
  const clock = animator.controller();
  const first = clock.select(drawing.animator, 0, true);
  const painted = [];
  const host = { isConnected: true, append() {}, replaceChildren() {}, getAnimations: () => [] };
  const entry = { host, source: drawing, clock, edit: false, frameId: first.id };
  let callback;
  const ctx = vm.createContext({
    HmiAnimator: animator, animatorMountedRegions: new Set([entry]),
    animatorAnimationRequest: null, animatorPreviews: new Map(), isEditMode: false,
    runtimeObjectDefs: null,
    requestAnimationFrame: fn => { callback = fn; return 1; },
    getMultiStateSourceValue: () => true,
    document: { createElementNS: () => ({ appendChild() {} }) },
    renderObjectInto: (_, object) => painted.push(object.children[0].type), console
  });
  const start = source.indexOf('function selectAnimatorMountedFrame(');
  const end = source.indexOf('function mountAnimator(', start);
  vm.runInContext(source.slice(start, end), ctx);
  vm.runInContext('scheduleAnimatorPainting()', ctx);
  callback(50);
  assert.deepEqual(painted, []);
  callback(150);
  assert.deepEqual(painted, ['ellipse']);
  assert.equal(drawing.children.length, 2);
  host.isConnected = false;
  callback(700);
  assert.equal(ctx.animatorMountedRegions.size, 0);
  assert.equal(ctx.animatorAnimationRequest, null);
});

test('Animator is loaded before HMI and appears in both Bindings menus', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/animator.js') < html.indexOf('/js/hmi.js'));
  assert.match(html, /id="dynamicsAddAnimatorMenuBtn"/);
  assert.match(html, /data-add-dynamic="animator"/);
  assert.match(source, /animator: ensureAnimatorForSelectedObjects/);
});

test('Animator properties remain safe during startup with no selected object', () => {
  const start = source.indexOf('  const showAnimatorTab =');
  const end = source.indexOf('\n  const showRectRotationTab', start);
  assert.ok(start >= 0 && end > start);
  const visibility = [];
  const panel = { classList: { toggle: (_, hidden) => visibility.push(hidden) } };
  const ctx = vm.createContext({
    obj: null, animatorOwner: null, currentObjectDynamicTab: 'properties',
    objectDynamicTabAnimatorBtn: panel, objectDynamicAnimatorHost: panel,
    renderAnimatorEditor: () => { throw new Error('No object must not create an editor'); }
  });
  assert.doesNotThrow(() => vm.runInContext(source.slice(start, end), ctx));
  assert.deepEqual(visibility, [true, true]);
});

test('Animator menu click closes menus and invokes creation in the menu helper scope', () => {
  const start = source.indexOf('  dynamicsAddAnimatorMenuBtn?.addEventListener');
  const end = source.indexOf('\n  });', start) + 6;
  assert.ok(start > source.indexOf('  const setDynamicsFlyoutOpen ='));
  const calls = [];
  let click;
  const ctx = vm.createContext({
    dynamicsAddAnimatorMenuBtn: { addEventListener: (_, handler) => click = handler },
    setDynamicsFlyoutOpen: value => calls.push(['flyout', value]),
    setMenuOpen: value => calls.push(['menu', value]),
    ensureAnimatorForSelectedObjects: () => calls.push(['create'])
  });
  vm.runInContext(source.slice(start, end), ctx);
  click();
  assert.deepEqual(calls, [['flyout', false], ['menu', false], ['create']]);
});

test('drawing in the Animator group routes additions into the selected frame', () => {
  const owner = { animator: { frames: [{ id: 'first' }, { id: 'second' }] }, children: [] };
  const frame = { children: [] };
  let active = owner;
  const ctx = vm.createContext({
    currentScreenObj: {}, isEditMode: true, activeLayerEditable: () => true,
    getActiveGroup: () => active, getActiveObjects: () => active.children,
    animatorEditorFrames: new Map([['first', 'second']]),
    editAnimatorFrame: (object, id) => {
      assert.equal(object, owner); assert.equal(id, 'second'); active = frame;
    }
  });
  const start = source.indexOf('const ensureActiveObjects =');
  const end = source.indexOf('\n};', start) + 3;
  vm.runInContext(source.slice(start, end), ctx);
  const drawing = { type: 'rect' };
  vm.runInContext('ensureActiveObjects()', ctx).push(drawing);
  assert.deepEqual(frame.children, [drawing]);
  assert.deepEqual(owner.children, []);
});

test('Animator tab remains available for a selected drawing or an empty frame', () => {
  const owner = { animator: { frames: [] } };
  const frame = { animatorFrameContainer: true };
  const ctx = vm.createContext({ groupEditStack: [owner, frame] });
  const start = source.indexOf('function getAnimatorEditorOwner(');
  const end = source.indexOf('\n}', start) + 2;
  vm.runInContext(source.slice(start, end), ctx);
  ctx.owner = owner;
  assert.equal(vm.runInContext('getAnimatorEditorOwner({type:"rect"})', ctx), owner);
  assert.equal(vm.runInContext('getAnimatorEditorOwner(null)', ctx), owner);
  assert.equal(vm.runInContext('getAnimatorEditorOwner(owner)', ctx), owner);
  ctx.groupEditStack = [];
  assert.equal(vm.runInContext('getAnimatorEditorOwner(null)', ctx), null);
  assert.ok(!source.includes('renderAnimatorMembership'));
});

test('Value Selection editor uses global Start/Stop controls, not per-frame rules', () => {
  const start = source.indexOf('function renderAnimatorEditor(');
  const end = source.indexOf('objectDynamicTabAnimatorBtn?.addEventListener', start);
  const editor = source.slice(start, end);
  assert.match(editor, /input\("Start Value", "startValue"\)/);
  assert.match(editor, /input\("Stop Value", "stopValue"\)/);
  assert.ok(!editor.includes('row("Frame Match"'));
  assert.ok(!editor.includes('row("Frame Weight'));
});

test('false activation plays in preview and empty-source playback remains always active', () => {
  const config = animator.create([{ type: 'rect' }, { type: 'ellipse' }]);
  config.animateWhenTrue = false;
  const entry = { source: { animator: config }, clock: animator.controller() };
  const ctx = vm.createContext({
    HmiAnimator: animator, animatorPreviews: new Map(), isEditMode: false,
    getMultiStateSourceValue: () => { throw new Error('Empty source needs no evaluation'); }
  });
  const start = source.indexOf('function selectAnimatorMountedFrame(');
  const end = source.indexOf('function scheduleAnimatorPainting(', start);
  vm.runInContext(source.slice(start, end), ctx);
  assert.equal(ctx.selectAnimatorMountedFrame(entry, 0), config.frames[0]);
  assert.equal(ctx.selectAnimatorMountedFrame(entry, 100), config.frames[1]);
  ctx.isEditMode = true;
  ctx.animatorPreviews.set(config.frames[0].id, true);
  entry.clock.reset();
  assert.equal(ctx.selectAnimatorMountedFrame(entry, 200), config.frames[0]);
  assert.equal(ctx.selectAnimatorMountedFrame(entry, 300), config.frames[1]);
  ctx.animatorPreviews.clear();
  assert.equal(ctx.selectAnimatorMountedFrame(entry, 400), animator.stopped(config));
});

test('invisible inactive Animator has no displayed children without removing saved drawings', () => {
  const group = { type: 'group', children: [{ type: 'rect' }, { type: 'ellipse' }] };
  animator.attach(group); group.animator.inactiveVisible = false;
  const frame = animator.controller().select(group.animator, 0, false);
  assert.equal(frame, null);
  assert.deepEqual(animator.display(group, frame).children, []);
  assert.equal(group.children.length, 2);
});

test('pasted Animators regenerate frame and fallback IDs without changing the original', () => {
  const original = { type: 'group', children: [{ type: 'rect' }, { type: 'ellipse' }] };
  animator.attach(original);
  original.animator.stoppedFrameId = original.animator.frames[1].id;
  const clone = JSON.parse(JSON.stringify(original));
  const ctx = vm.createContext({ crypto: require('node:crypto') });
  const start = source.indexOf('const regenerateClonedObjectIdentifiers =');
  const end = source.indexOf('\nconst formatMappedTagReference', start);
  vm.runInContext(source.slice(start, end), ctx);
  ctx.clones = [clone];
  vm.runInContext('regenerateClonedObjectIdentifiers(clones)', ctx);
  assert.notEqual(clone.animator.frames[0].id, original.animator.frames[0].id);
  assert.equal(clone.animator.stoppedFrameId, clone.animator.frames[1].id);
  assert.deepEqual(clone.children.map(child => child.animatorFrameId), clone.animator.frames.map(frame => frame.id));
  assert.equal(original.children[0].animatorFrameId, original.animator.frames[0].id);
});
