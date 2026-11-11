(function(root) {
  const PREFIX = 'opcbridge-hmi.saved-screen:';
  function create({ host = root, onSaved }) {
    const seen = new Map();
    let channel;
    const receive = (notice) => {
      if (!notice || typeof notice.ref !== 'string' || !notice.ref || typeof notice.path !== 'string'
        || !notice.revision || !Number.isFinite(notice.savedAt)) return;
      const previous = seen.get(notice.ref);
      if (previous?.revision === notice.revision || previous?.savedAt > notice.savedAt) return;
      seen.set(notice.ref, notice);
      Promise.resolve().then(() => onSaved(notice)).catch(error => {
        if (seen.get(notice.ref)?.revision === notice.revision) seen.delete(notice.ref);
        host.console?.warn('Screen alias refresh failed:', error);
      });
    };
    try { if (host.BroadcastChannel) { channel = new host.BroadcastChannel('opcbridge-hmi-screen-saves'); channel.onmessage = event => receive(event.data); } } catch {}
    host.addEventListener('storage', event => {
      if (!event.key?.startsWith(PREFIX) || !event.newValue) return;
      try { receive(JSON.parse(event.newValue)); } catch {}
    });
    const recheck = () => {
      try {
        const storage = host.localStorage;
        for (let index = 0; index < storage.length; index++) {
          const key = storage.key(index);
          if (key?.startsWith(PREFIX)) { try { receive(JSON.parse(storage.getItem(key))); } catch {} }
        }
      } catch {}
    };
    host.addEventListener('focus', recheck);
    return {
      notify({ ref, path }) {
        if (!ref || !path) return;
        const savedAt = Date.now();
        const notice = { ref, path, savedAt, revision: `${savedAt}-${Math.random().toString(36).slice(2)}` };
        seen.set(ref, notice);
        try { host.localStorage.setItem(PREFIX + encodeURIComponent(ref), JSON.stringify(notice)); } catch {}
        try { channel?.postMessage(notice); } catch {}
      }, recheck
    };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HmiScreenSaveSync = api;
})(globalThis);
