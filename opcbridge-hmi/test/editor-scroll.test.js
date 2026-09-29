const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Edit/Run round trip restores editor scroll and ignores stale transitions/screens', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
  const code = source.slice(source.indexOf('const setMode ='), source.indexOf('\nif (projectTitleEl)', source.indexOf('const setMode =')));
  const frames = [];
  const wrapper = { scrollLeft: 1500, scrollTop: 2300,
    scrollTo({ left, top }) { this.scrollLeft = left; this.scrollTop = top; } };
  const noop = () => {};
  const ctx = {
    modeTransitionRevision: 0, isTouchRuntimeEndpoint: false, poseEditSession: null,
    isEditMode: true, authSession: null, lastEditUiState: null,
    selectedIndices: [], groupEditStack: [], selectedPolygonVertex: null,
    currentScreenObj: {}, currentScreenId: 'wall', currentScreenFilename: 'wall.screen',
    screenWrapper: wrapper, tagCatalogLoaded: true,
    toolbar: null, editorPane: null, screenTitle: null, editorFilename: null,
    document: { body: { classList: { toggle: noop } } },
    window: { requestAnimationFrame: fn => frames.push(fn) },
    getActiveObjects: () => [],
  };
  for (const name of ['hideDiagnosticsTooltip', 'markAuthActivity', 'clearSelectedPolygonVertex',
    'setRuntimeHistoryBase', 'initViewportHistoriesForCurrentScreen', 'applyScale', 'renderScreen',
    'refreshScreensList', 'updateSelectionOverlays', 'updatePropertiesPanel', 'updateGroupBreadcrumb',
    'ensureRuntimeHistoryForCurrentScreen']) ctx[name] = noop;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const mode = value => vm.runInContext(`setMode(${value})`, ctx);
  mode(false);
  assert.equal(wrapper.scrollTop, 0);
  mode(true);
  frames.splice(0).forEach(fn => fn());
  assert.equal(wrapper.scrollLeft, 1500);
  assert.equal(wrapper.scrollTop, 2300);
  mode(false);
  frames.splice(0).forEach(fn => fn());
  ctx.currentScreenObj = {};
  mode(true);
  frames.splice(0).forEach(fn => fn());
  assert.equal(wrapper.scrollTop, 0);
});
