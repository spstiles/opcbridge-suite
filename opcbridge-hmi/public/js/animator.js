(function (root) {
  'use strict';
  const createId = () => 'frame_' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  function create(objects) {
    const frames = objects.map(object => ({ id: createId(), object: JSON.parse(JSON.stringify(object)) }));
    return { mode: 'playback', enabled: true, frameIntervalMs: 100, repeatCount: null,
      animateWhenTrue: true, inactiveVisible: true, inactiveFrame: 'fallback',
      startValue: 0, stopValue: 100, stoppedFrameId: frames[0]?.id || null, frames };
  }
  function stopped(config) {
    const frames = config?.frames || [];
    return frames.find(frame => frame.id === config.stoppedFrameId) || frames[0] || null;
  }
  function playback(config, elapsedMs, active = true) {
    if (!config?.enabled || !active) return stopped(config);
    const frames = config.frames || [];
    if (!frames.length) return null;
    const interval = positive(config.frameIntervalMs, 100);
    const duration = interval * frames.length;
    const elapsed = Number.isFinite(Number(elapsedMs)) ? Math.max(0, Number(elapsedMs)) : 0;
    const repeats = config.repeatCount == null ? Infinity : Math.max(1, Math.trunc(positive(config.repeatCount, 1)));
    if (elapsed >= repeats * duration) return config.frames?.at(-1) || null;
    return frames[Math.floor((elapsed % duration) / interval)];
  }
  function selectValue(config, value) {
    if (!config?.enabled || value === null || value === undefined || value === '' ||
        !Number.isFinite(Number(value))) return stopped(config);
    const start = config.startValue === undefined ? 0 : config.startValue;
    const stop = config.stopValue === undefined ? 100 : config.stopValue;
    const numeric = input => input !== null && input !== undefined && String(input).trim() !== '' && Number.isFinite(Number(input));
    if (!numeric(value) || !numeric(start) || !numeric(stop) || Number(stop) <= Number(start)) return stopped(config);
    const frames = config.frames || [];
    if (!frames.length) return null;
    const fraction = Math.max(0, Math.min(1, (Number(value) - Number(start)) / (Number(stop) - Number(start))));
    return frames[Math.min(frames.length - 1, Math.floor(fraction * frames.length))];
  }
  function move(config, id, delta) {
    const index = config.frames.findIndex(frame => frame.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= config.frames.length) return;
    const [frame] = config.frames.splice(index, 1);
    config.frames.splice(next, 0, frame);
  }
  function duplicate(config, id) {
    const index = config.frames.findIndex(frame => frame.id === id);
    if (index < 0) return null;
    const frame = JSON.parse(JSON.stringify(config.frames[index]));
    frame.id = createId();
    config.frames.splice(index + 1, 0, frame);
    return frame;
  }
  function remove(config, id) {
    config.frames = config.frames.filter(frame => frame.id !== id);
    if (config.stoppedFrameId === id) config.stoppedFrameId = config.frames[0]?.id || null;
  }
  // Screen storage has one canonical object list: ordinary group children.
  // Frame order is metadata; hiding a frame must not hide its
  // bindings from the editor, reference health, or runtime subscriptions.
  function attach(group) {
    if (group?.type !== 'group' || !Array.isArray(group.children)) {
      throw new TypeError('Animator requires a group with children');
    }
    const config = create([]);
    config.frames = group.children.map(object => {
      const id = createId();
      object.animatorFrameId = id;
      return { id };
    });
    config.stoppedFrameId = config.frames[0]?.id || null;
    group.animator = config;
    return config;
  }
  function frameObject(group, id) {
    return group?.children?.find(object => object.animatorFrameId === id) || null;
  }
  function prepareFrameGroups(group) {
    for (const object of group.children || []) {
      if (!object.animatorFrameId || object.animatorFrameContainer) continue;
      const index = group.children.indexOf(object);
      const id = object.animatorFrameId;
      delete object.animatorFrameId;
      group.children[index] = { type: 'group', x: 0, y: 0, w: group.w, h: group.h,
        animatorFrameId: id, animatorFrameContainer: true, children: [object] };
    }
  }
  function addFrame(group) {
    prepareFrameGroups(group);
    const id = createId();
    const frame = { id };
    group.animator.frames.push(frame);
    group.children.push({ type: 'group', x: 0, y: 0, w: group.w, h: group.h,
      animatorFrameId: id, animatorFrameContainer: true, children: [] });
    return frame;
  }
  function adoptUnassigned(group, id) {
    const target = frameObject(group, id);
    if (!target?.animatorFrameContainer) return [];
    const unassigned = group.children.filter(object => !object.animatorFrameId);
    group.children = group.children.filter(object => object.animatorFrameId);
    target.children.push(...unassigned);
    return unassigned;
  }
  function transfer(group, sourceId, targetId, objects) {
    const source = frameObject(group, sourceId), target = frameObject(group, targetId);
    if (!source?.animatorFrameContainer || !target?.animatorFrameContainer || source === target) return [];
    if (Number(source.rotation || 0) || Number(target.rotation || 0)) {
      throw new Error('Reset frame group rotation before moving objects between frames.');
    }
    const chosen = new Set(objects);
    const moving = source.children.filter(object => chosen.has(object));
    source.children = source.children.filter(object => !chosen.has(object));
    target.children.push(...moving);
    return moving;
  }
  function duplicateFrame(group, id) {
    const object = frameObject(group, id);
    if (!object || !group.animator) return null;
    const frame = duplicate(group.animator, id);
    if (!frame) return null;
    const copy = JSON.parse(JSON.stringify(object));
    copy.animatorFrameId = frame.id;
    group.children.splice(group.children.indexOf(object) + 1, 0, copy);
    return frame;
  }
  function removeFrame(group, id) {
    if (!group?.animator) return;
    remove(group.animator, id);
    group.children = group.children.filter(object => object.animatorFrameId !== id);
  }
  function detach(group) {
    if (!group?.animator) return;
    for (const object of group.children || []) delete object.animatorFrameId;
    delete group.animator;
  }
  function display(group, frame) {
    const object = frameObject(group, frame?.id);
    // Do not mutate the saved group or its bounds when switching frames.
    return { ...group, children: object ? [object] : [] };
  }
  // Clocks and the last displayed frame belong to a mounted instance only.
  // Inactivation discards elapsed time; every activation starts at frame one.
  function controller() {
    let started = null;
    let lastFrameId = null;
    let ticking = false;
    const inactive = (config, allowCurrent) => {
      if (config.inactiveVisible === false) return null;
      return allowCurrent && config.inactiveFrame === 'current'
        ? config.frames?.find(frame => frame.id === lastFrameId) || stopped(config)
        : stopped(config);
    };
    return {
      reset() { started = null; lastFrameId = null; ticking = false; },
      needsTick() { return ticking; },
      select(config, now, value, qualityGood = true) {
        ticking = false;
        if (config.mode === 'value') {
          started = null; lastFrameId = null;
          return qualityGood ? selectValue(config, value) : stopped(config);
        }
        const valid = qualityGood && (typeof value === 'boolean' ||
          (value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value))));
        if (config.enabled === false || !valid) {
          started = null; lastFrameId = null;
          return inactive(config, false);
        }
        const truthy = value === true || Number(value) !== 0;
        const active = config.animateWhenTrue === false ? !truthy : truthy;
        if (!active) {
          started = null;
          return inactive(config, true);
        }
        if (started === null) started = now;
        const repeats = config.repeatCount == null ? Infinity : Math.max(1, Math.trunc(positive(config.repeatCount, 1)));
        ticking = (config.frames?.length || 0) > 1 && now - started < repeats * positive(config.frameIntervalMs, 100) * config.frames.length;
        const frame = playback(config, Math.max(0, now - started), true);
        lastFrameId = frame?.id || null;
        return frame;
      }
    };
  }
  const api = { create, stopped, playback, selectValue, move, duplicate, remove,
    attach, frameObject, duplicateFrame, removeFrame, detach, display, controller,
    prepareFrameGroups, addFrame, transfer, adoptUnassigned };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HmiAnimator = api;
})(globalThis);
