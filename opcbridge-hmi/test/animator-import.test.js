const test = require('node:test');
const assert = require('node:assert/strict');
const { convertGraphWorx } = require('../server/graphworx-import');
const animator = require('../public/js/animator');
const importSelector = attributes => convertGraphWorx(`<Canvas Width="400" Height="300" xmlns:gwx="clr-namespace:Ico.Gwx">
  <Canvas Name="Fan" Canvas.Left="20" Canvas.Top="30">
    <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
      <gwx:GwxRangeSelector ${attributes}/>
    </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
    <Rectangle Name="First" Width="30" Height="40" Fill="Red"/>
    <Canvas Name="Second"><Ellipse Width="30" Height="40" Fill="Blue"/></Canvas>
    <Rectangle Name="Third" Width="30" Height="40" Fill="Green"/>
  </Canvas></Canvas>`);

test('imports Range Selector playback with cycle duration converted to frame interval', () => {
  const result = importSelector('AnimationMode="Discrete" DataSource="1" DataComparison="NotEqualZero" Duration="900" RepeatCount="2"');
  const group = result.screen.objects[0];
  assert.equal(group.animator.mode, 'playback');
  assert.equal(group.animator.frameIntervalMs, 300);
  assert.equal(group.animator.repeatCount, 2);
  assert.equal(group.animator.expression, '1');
  assert.equal(result.summary.unresolved, 0);
  assert.deepEqual(group.children.map(child => child.source.name), ['First', 'Second', 'Third']);
  assert.deepEqual(group.children.map(child => child.animatorFrameId), group.animator.frames.map(frame => frame.id));
  assert.equal(group.children[1].animator, undefined);
  const clock = animator.controller();
  assert.equal(clock.select(group.animator, 0, 1).id, group.animator.frames[0].id);
  assert.equal(clock.select(group.animator, 300, 1).id, group.animator.frames[1].id);
  assert.equal(clock.select(group.animator, 1800, 1).id, group.animator.frames[2].id);
});

test('imports analog source and numeric limits into evenly spaced Value Selection', () => {
  const result = importSelector('AnimationMode="AnalogSelector" DataSource="ac:Fan/Speed" LowLimitSource="0" HighLimitSource="59" FrameDistribution="0.333333 0.333333 0.333333"');
  const config = result.screen.objects[0].animator;
  assert.equal(config.mode, 'value');
  assert.equal(config.tag, 'ac:Fan/Speed');
  assert.equal(config.connection_id, '');
  assert.equal(config.startValue, 0);
  assert.equal(config.stopValue, 59);
  assert.equal(result.summary.unresolved, 1);
  assert.equal(animator.selectValue(config, 30).id, config.frames[1].id);
  assert.equal(animator.selectValue(config, 59).id, config.frames[2].id);
});

test('imports expressions, disabled state, and infinite repeats', () => {
  const result = importSelector('AnimationMode="DiscreteAnimator" DataSource="x=1" Duration="600" RepeatCount="-1" Enabled="False"');
  const config = result.screen.objects[0].animator;
  assert.equal(config.expression, '1');
  assert.equal(config.enabled, false);
  assert.equal(config.repeatCount, null);
});

test('reports unequal frame distribution while preserving total cycle duration', () => {
  const result = importSelector('AnimationMode="Discrete" DataSource="1" Duration="1000" FrameDistribution="0.4,0.2,0.4"');
  assert.equal(result.screen.objects[0].animator.frameIntervalMs, 1000 / 3);
  assert.ok(result.screen.referenceHealth.issues.some(issue => issue.message.includes('evenly spaced')));
});

test('keeps unsupported settings inactive with an explicit notice', () => {
  for (const attrs of ['Duration="ac:Cycle"', 'Duration="600" AutoReverse="True"', 'Duration="600" DataComparison="GreaterThanLow"', 'Duration="600" RepeatCount="0"']) {
    const result = importSelector(`AnimationMode="Discrete" DataSource="1" ${attrs}`);
    assert.equal(result.screen.objects[0].animator, undefined);
    assert.ok(result.screen.referenceHealth.issues.some(issue => issue.message.includes('not activated')));
    assert.ok(result.screen.referenceHealth.issues.some(issue => issue.status === 'unsupported'));
  }
  const result = importSelector('AnimationMode="Analog" DataSource="ac:Fan" LowLimitSource="ac:Low"');
  assert.equal(result.screen.objects[0].animator, undefined);
});

test('tag-driven playback stops and restarts through the native controller', () => {
  const result = importSelector('AnimationMode="Discrete" DataSource="ac:Fan/Running" DataComparison="NotEqualZero" Duration="600" RepeatCount="Infinite"');
  const config = result.screen.objects[0].animator;
  assert.equal(config.tag, 'ac:Fan/Running');
  assert.equal(config.repeatCount, null);
  const clock = animator.controller();
  clock.select(config, 0, 1);
  assert.equal(clock.select(config, 200, 1).id, config.frames[1].id);
  assert.equal(clock.select(config, 250, 0).id, config.stoppedFrameId);
  assert.equal(clock.select(config, 500, 1).id, config.frames[0].id);
  assert.equal(clock.select(config, 700, 1, false).id, config.stoppedFrameId);
});

test('default constant source and explicit Always need no tag remapping', () => {
  const defaultSource = importSelector('AnimationMode="Discrete" Duration="600"');
  assert.equal(defaultSource.screen.objects[0].animator.expression, '1');
  const always = importSelector('AnimationMode="Discrete" DataSource="ac:Unused" DataComparison="Always" Duration="600"');
  assert.equal(always.screen.objects[0].animator.expression, '1');
  assert.equal(always.summary.unresolved, 0);
});

test('Range Selector maps activation polarity and inactive hold while restarting on activation', () => {
  for (const [comparison, animate, expected] of [['EqualZero', 'True', false], ['NotEqualZero', 'False', false], ['EqualZero', 'False', true]]) {
    const result = importSelector(`AnimationMode="Discrete" DataSource="ac:Fan/Stopped" Duration="600" DataComparison="${comparison}" AnimateWhenTrue="${animate}" FreezeWhenNotAnimating="True"`);
    const config = result.screen.objects[0].animator;
    assert.equal(config.animateWhenTrue, expected);
    assert.equal(config.inactiveFrame, 'current');
    const clock = animator.controller();
    clock.select(config, 0, expected);
    assert.equal(clock.select(config, 200, expected), config.frames[1]);
    assert.equal(clock.select(config, 250, !expected), config.frames[1]);
    assert.equal(clock.select(config, 300, expected), config.frames[0]);
  }
});

test('reports empty sources and additional unsupported animation options', () => {
  for (const attrs of ['DataSource=""', 'SkipInitialDuration="True"', 'PartitionMode="DeltaValue"']) {
    const result = importSelector(`AnimationMode="Discrete" Duration="600" ${attrs}`);
    assert.equal(result.screen.objects[0].animator, undefined);
    assert.ok(result.summary.conversionNotices.some(message => message.includes('not activated')));
    assert.deepEqual(result.screen.importInfo.conversionNotices, result.summary.conversionNotices);
  }
});

test('skipped source frames do not silently shorten the imported animation', () => {
  const result = convertGraphWorx(`<Canvas Width="100" Height="100" xmlns:gwx="clr-namespace:Ico.Gwx"><Canvas>
    <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxRangeSelector AnimationMode="Discrete" DataSource="1" Duration="600"/></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
    <Rectangle Width="20" Height="20"/><UnsupportedDrawing Width="20" Height="20"/>
  </Canvas></Canvas>`);
  assert.equal(result.screen.objects[0].animator, undefined);
  assert.ok(result.summary.conversionNotices.some(message => message.includes('source frames')));
  assert.equal(Object.hasOwn(result.screen.objects[0], 'importAnimatorFramesIncomplete'), false);
});

test('distribution warnings have stable notice IDs and reach the import summary', () => {
  const result = importSelector('AnimationMode="Discrete" Duration="600" FrameDistribution="0.5 0.25 0.25"');
  const notices = result.screen.referenceHealth.issues.filter(issue => issue.category === 'animator-import');
  assert.ok(notices[0].id);
  assert.match(result.summary.conversionNotices[0], /evenly spaced/);
});
