/* Shared ordered-click model and executor. No device access in this module. */
(function (root) {
  const list = action => action?.type === 'sequence' ? action.actions || [] : action?.type ? [action] : [];
  const pack = actions => actions.length === 1 ? actions[0] : { type: 'sequence', actions };
  const supported = new Set(['set-write', 'toggle-write', 'navigate', 'load-viewport', 'popup', 'close-popup', 'history-back', 'history-forward', 'alarm-filter']);
  const validate = actions => {
    for (const [index, action] of actions.entries()) {
      const fail = reason => { throw new Error(`Action ${index + 1}: ${reason}`); };
      if (!supported.has(action?.type)) fail('this action must be used alone for now.');
      if (action.type.endsWith('-write')) {
        if (!action.connection_id?.trim() || !action.tag?.trim()) fail('choose a connection and tag.');
        if (action.onValue === undefined || action.onValue === null) fail('enter a write value.');
        if (action.type === 'toggle-write' && action.offValue == null) fail('enter an off value.');
      }
      if (['navigate', 'load-viewport', 'popup'].includes(action.type) && !action.screenId?.trim()) fail('choose a screen.');
      if (action.type === 'load-viewport' && !action.viewportId?.trim()) fail('choose a viewport.');
    }
  };
  const run = async (action, execute) => {
    // Capture before any asynchronous operation or navigation mutates the screen.
    const actions = JSON.parse(JSON.stringify(list(action)));
    validate(actions);
    let completed = 0;
    for (const step of actions) {
      try {
        await execute(step, completed);
        completed++;
      } catch (cause) {
        const error = new Error(`Action ${completed + 1} failed: ${cause.message || cause}. ${completed} of ${actions.length} actions completed. Remaining actions were not run; completed writes were not rolled back.`);
        error.completed = completed;
        throw error;
      }
    }
    return completed;
  };
  const api = { list, pack, validate, run, supported };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HmiClickActions = api;
})(globalThis);
