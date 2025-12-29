// opcbridge-scada UI (no external deps)

const els = {
  statusLine: document.getElementById('statusLine'),
  buildLine: document.getElementById('buildLine'),
  tabs: document.getElementById('tabs'),

  // Overview
  overviewHealthOverall: document.getElementById('overviewHealthOverall'),
  overviewHealthMeta: document.getElementById('overviewHealthMeta'),
  overviewHealthConnections: document.getElementById('overviewHealthConnections'),
  healthJson: document.getElementById('healthJson'),
  alarmsStatusJson: document.getElementById('alarmsStatusJson'),

  // Configure
  scadaListenHost: document.getElementById('scadaListenHost'),
  scadaListenPort: document.getElementById('scadaListenPort'),
  scadaRefreshMs: document.getElementById('scadaRefreshMs'),
  scadaOpcbridgeScheme: document.getElementById('scadaOpcbridgeScheme'),
  scadaOpcbridgeHost: document.getElementById('scadaOpcbridgeHost'),
  scadaOpcbridgePort: document.getElementById('scadaOpcbridgePort'),
  scadaAlarmsScheme: document.getElementById('scadaAlarmsScheme'),
  scadaAlarmsHost: document.getElementById('scadaAlarmsHost'),
  scadaAlarmsPort: document.getElementById('scadaAlarmsPort'),
  scadaHmiScheme: document.getElementById('scadaHmiScheme'),
  scadaHmiHost: document.getElementById('scadaHmiHost'),
  scadaHmiPort: document.getElementById('scadaHmiPort'),
  scadaOpenHmiBtn: document.getElementById('scadaOpenHmiBtn'),
  scadaSettingsReloadBtn: document.getElementById('scadaSettingsReloadBtn'),
  scadaSettingsSaveBtn: document.getElementById('scadaSettingsSaveBtn'),
  scadaSettingsStatus: document.getElementById('scadaSettingsStatus'),

  // Connections
  connRefreshBtn: document.getElementById('connRefreshBtn'),
  connNewBtn: document.getElementById('connNewBtn'),
  connList: document.getElementById('connList'),
  connListNote: document.getElementById('connListNote'),
  connEditorTitle: document.getElementById('connEditorTitle'),
  connTestBtn: document.getElementById('connTestBtn'),
  connSaveBtn: document.getElementById('connSaveBtn'),
  connReloadBtn: document.getElementById('connReloadBtn'),
  connId: document.getElementById('connId'),
  connDriver: document.getElementById('connDriver'),
  connGateway: document.getElementById('connGateway'),
  connPath: document.getElementById('connPath'),
  connSlot: document.getElementById('connSlot'),
  connPlcType: document.getElementById('connPlcType'),
  connRaw: document.getElementById('connRaw'),
  connAdvanced: document.getElementById('connAdvanced'),
  connStatus: document.getElementById('connStatus'),

  // Tags config
  tagsConfigRefreshBtn: document.getElementById('tagsConfigRefreshBtn'),
  tagsConfigSaveBtn: document.getElementById('tagsConfigSaveBtn'),
  tagsConfigReloadBtn: document.getElementById('tagsConfigReloadBtn'),
  tagsConfigConnFilter: document.getElementById('tagsConfigConnFilter'),
  tagsConfigSearch: document.getElementById('tagsConfigSearch'),
  tagsConfigTableBody: document.querySelector('#tagsConfigTable tbody'),
  tagsConfigStatus: document.getElementById('tagsConfigStatus'),

  // Live
  tagsTableBody: document.querySelector('#tagsTable tbody'),
  workspaceLiveTagsTbody: document.getElementById('workspaceLiveTagsTbody'),
  workspaceLiveTagsFilter: document.getElementById('workspaceLiveTagsFilter'),

  // Alarms
  activeAlarmsTableBody: document.querySelector('#activeAlarmsTable tbody'),
  alarmEventsTableBody: document.querySelector('#alarmEventsTable tbody'),

  // Workspace (tree)
  treeView: document.getElementById('treeView'),
  treeNote: document.getElementById('treeNote'),
  workspaceChildrenTable: document.getElementById('workspaceChildrenTable'),
  workspaceChildrenTbody: document.getElementById('workspaceChildrenTbody'),

  workspaceSaveBtn: document.getElementById('workspaceSaveBtn'),
  workspaceSaveReloadBtn: document.getElementById('workspaceSaveReloadBtn'),
  workspaceDiscardBtn: document.getElementById('workspaceDiscardBtn'),
  workspaceSaveStatus: document.getElementById('workspaceSaveStatus'),

  // Workspace: new device form
  workspaceDetailsPanel: document.getElementById('workspaceDetailsPanel'),
  workspaceNewDevicePanel: document.getElementById('workspaceNewDevicePanel'),
  channelPropsModal: document.getElementById('channelPropsModal'),
  channelPropsCloseBtn: document.getElementById('channelPropsCloseBtn'),
  channelPropsHint: document.getElementById('channelPropsHint'),
  channelPropName: document.getElementById('channelPropName'),
  channelPropDesc: document.getElementById('channelPropDesc'),
  channelPropCancelBtn: document.getElementById('channelPropCancelBtn'),
  channelPropSaveBtn: document.getElementById('channelPropSaveBtn'),
  channelPropStatus: document.getElementById('channelPropStatus'),

  workspaceItemModal: document.getElementById('workspaceItemModal'),
  workspaceItemCloseBtn: document.getElementById('workspaceItemCloseBtn'),
  workspaceItemHint: document.getElementById('workspaceItemHint'),
  workspaceItemTable: document.getElementById('workspaceItemTable'),
  workspaceItemTbody: document.getElementById('workspaceItemTbody'),
  workspaceItemStatus: document.getElementById('workspaceItemStatus'),

  // New tag modal
  newTagModal: document.getElementById('newTagModal'),
  newTagCloseBtn: document.getElementById('newTagCloseBtn'),
  newTagHint: document.getElementById('newTagHint'),
  newTagName: document.getElementById('newTagName'),
  newTagPlc: document.getElementById('newTagPlc'),
  newTagDatatype: document.getElementById('newTagDatatype'),
  newTagScan: document.getElementById('newTagScan'),
  newTagEnabled: document.getElementById('newTagEnabled'),
  newTagWritable: document.getElementById('newTagWritable'),
  newTagCancelBtn: document.getElementById('newTagCancelBtn'),
  newTagCreateBtn: document.getElementById('newTagCreateBtn'),
  newTagStatus: document.getElementById('newTagStatus'),
  workspaceItemDeviceEdit: document.getElementById('workspaceItemDeviceEdit'),
  workspaceItemTagEdit: document.getElementById('workspaceItemTagEdit'),
  workspaceItemGeneric: document.getElementById('workspaceItemGeneric'),
  editDevId: document.getElementById('editDevId'),
  editDevDriver: document.getElementById('editDevDriver'),
  editDevGateway: document.getElementById('editDevGateway'),
  editDevPath: document.getElementById('editDevPath'),
  editDevSlot: document.getElementById('editDevSlot'),
  editDevPlcType: document.getElementById('editDevPlcType'),
  editDevCancelBtn: document.getElementById('editDevCancelBtn'),
  editDevSaveBtn: document.getElementById('editDevSaveBtn'),
  editDevStatus: document.getElementById('editDevStatus'),

  editTagConn: document.getElementById('editTagConn'),
  editTagName: document.getElementById('editTagName'),
  editTagPlc: document.getElementById('editTagPlc'),
  editTagDatatype: document.getElementById('editTagDatatype'),
  editTagScan: document.getElementById('editTagScan'),
  editTagEnabled: document.getElementById('editTagEnabled'),
  editTagWritable: document.getElementById('editTagWritable'),
  editTagCancelBtn: document.getElementById('editTagCancelBtn'),
  editTagSaveBtn: document.getElementById('editTagSaveBtn'),
  editTagStatus: document.getElementById('editTagStatus'),

  newDeviceHint: document.getElementById('newDeviceHint'),
  newDevId: document.getElementById('newDevId'),
  newDevDriver: document.getElementById('newDevDriver'),
  newDevGateway: document.getElementById('newDevGateway'),
  newDevPath: document.getElementById('newDevPath'),
  newDevSlot: document.getElementById('newDevSlot'),
  newDevPlcType: document.getElementById('newDevPlcType'),
  newDevCancelBtn: document.getElementById('newDevCancelBtn'),
  newDevCreateBtn: document.getElementById('newDevCreateBtn'),
  newDevModalCloseBtn: document.getElementById('newDevModalCloseBtn'),
  newDevStatus: document.getElementById('newDevStatus')
};

const state = {
  cfg: null,
  auth: null,

  refreshTimer: null,

  liveTagsLast: null,
  liveTagFilter: { type: 'all', label: 'All' },

  // alarms/events (from opcbridge-alarms)
  alarmsAllLast: null,
  alarmsAll: [],
  alarmHistoryLast: null,

  // connections
  connFiles: [],
  connObjCache: new Map(),

  // workspace rendering
  workspaceRenderSeq: 0,
  selectedConnPath: '',
  selectedConnObj: null,
  selectedConnRawDirty: false,

  // tags config
  tagConfigAll: [],
  tagConfigEdited: new Map(),
  tagConfigDirty: false,

  workspaceConnDirty: new Map(), // pathRel -> connection object
  scadaDirty: false,

  // tree
  expanded: new Set(['project:opcbridge', 'folder:connectivity', 'folder:alarms_events']),
  selectedNodeId: '',
  scadaChannels: [],
  workspaceTreeRoot: null,
  scadaDeviceAssignments: {},
  pendingNewDevice: null,
  pendingNewTag: null,
  pendingChannelEdit: null,
  pendingWorkspaceItem: null,
  draggedDeviceConnectionId: ''
};

const DRIVER_LABELS = {
  ab_eip: 'Allen-Bradley Ethernet/IP'
};

const PLC_TYPE_LABELS = {
  lgx: 'Allen-Bradley Logix (ControlLogix / CompactLogix)',
  mlgx: 'Allen-Bradley MicroLogix',
  micro800: 'Allen-Bradley Micro800 (Micro8xx)',
  slc: 'Allen-Bradley SLC 500',
  plc5: 'Allen-Bradley PLC-5',
  'lgx-pccc': 'Logix (PCCC gateway mode)',
  'omron-njnx': 'OMRON NJ/NX'
};

function labelForDriver(code) {
  const k = String(code || '').trim();
  return DRIVER_LABELS[k] || k;
}

function labelForPlcType(code) {
  const k = String(code || '').trim();
  return PLC_TYPE_LABELS[k] || k;
}



function setFatalStatus(err) {
  const msg = (err && err.message) ? err.message : String(err || '');
  if (els.statusLine) els.statusLine.textContent = `UI error: ${msg}`;
}

window.addEventListener('error', (e) => {
  setFatalStatus(e?.error || e?.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', (e) => {
  setFatalStatus(e?.reason || 'Unhandled rejection');
});

function setTab(id) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === id));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `tab-${id}`));
}

els.tabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  setTab(btn.dataset.tab);
});

function classForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'ok') return 'status-ok';
  if (s === 'degraded' || s === 'warn' || s === 'warning') return 'status-degraded';
  return 'status-error';
}

function renderOverviewHealth(health) {
  if (!health) return;

  const overall = String(health?.status || 'error');
  if (els.overviewHealthOverall) {
    els.overviewHealthOverall.textContent = `Status: ${overall.toUpperCase()}`;
    els.overviewHealthOverall.className = classForStatus(overall);
  }

  const counts = health?.counts || {};
  const ok = Number(counts?.ok ?? 0) || 0;
  const degraded = Number(counts?.degraded ?? 0) || 0;
  const err = Number(counts?.error ?? 0) || 0;

  const conns = health?.connections && typeof health.connections === 'object' ? health.connections : {};
  const connCount = Object.keys(conns).length;

  if (els.overviewHealthMeta) {
    els.overviewHealthMeta.textContent = `Connections: ${connCount} | OK: ${ok} | Degraded: ${degraded} | Error: ${err}`;
  }

  if (els.overviewHealthConnections) {
    const lines = [];
    Object.entries(conns).forEach(([cid, info]) => {
      const st = String(info?.status || 'unknown');
      const reason = info?.reason ? (` - ${info.reason}`) : '';
      const ratio = (typeof info?.stale_ratio === 'number') ? ` (${Math.round(info.stale_ratio * 100)}% stale/bad)` : '';
      const seen = (typeof info?.tags_seen === 'number') ? info.tags_seen : null;
      const good = (typeof info?.good_recent === 'number') ? info.good_recent : null;
      const age = (typeof info?.newest_age_ms === 'number') ? info.newest_age_ms : null;

      let details = '';
      if (seen != null && good != null) details += ` • ${good}/${seen} good recent`;
      if (age != null) details += ` • newest ${age} ms`;

      const cls = classForStatus(st);
      lines.push(`<div class="${cls}">${cid}: ${st.toUpperCase()}${reason}${ratio}${details}</div>`);
    });

    els.overviewHealthConnections.innerHTML = lines.join('');
  }
}

function badge(status) {
  const s = String(status || '').toLowerCase();
  const cls = s === 'ok' ? 'ok' : s === 'degraded' ? 'warn' : 'bad';
  return `<span class="badge ${cls}">${s || '-'}</span>`;
}

async function apiGet(url) {
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiGetText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function apiPostJson(url, bodyObj) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(bodyObj || {})
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = { ok: false, error: text || `HTTP ${res.status}` }; }
  if (!res.ok) {
    const msg = parsed?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parsed;
}

async function opcbridgeReload() {
  await apiPostJson('/api/opcbridge/reload', {});
}

function stripJsonComments(text) {
  const s = String(text || '');
  const noBlock = s.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function parseJsonc(text) {
  return JSON.parse(stripJsonComments(text));
}

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

const TAG_DATATYPE_OPTIONS = [
  { value: 'bool', label: 'Boolean' },
  { value: 'int16', label: 'Int16' },
  { value: 'uint16', label: 'UInt16' },
  { value: 'int32', label: 'Int32' },
  { value: 'uint32', label: 'UInt32' },
  { value: 'float32', label: 'Float32' },
  { value: 'float64', label: 'Float64' },
  { value: 'string', label: 'String' },
];

function fillTagDatatypeSelect(selectEl, selected) {
  if (!selectEl) return;
  const cur = String(selected || '').trim().toLowerCase();
  selectEl.textContent = '';

  TAG_DATATYPE_OPTIONS.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  });

  if (cur && TAG_DATATYPE_OPTIONS.some((x) => x.value == cur)) {
    selectEl.value = cur;
    return;
  }

  // default
  selectEl.value = 'bool';
}

function fmtTime(tsMs) {
  const t = Number(tsMs);
  if (!Number.isFinite(t) || t <= 0) return '';
  try { return new Date(t).toLocaleString(); } catch { return new Date(t).toISOString(); }
}

function renderJson(el, obj) {
  if (!el) return;
  el.textContent = JSON.stringify(obj, null, 2);
}

// ---------------- Configure ----------------

function setScadaSettingsStatus(msg) {
  if (els.scadaSettingsStatus) els.scadaSettingsStatus.textContent = String(msg || '');
}

function hmiUrlFromForm() {
  const scheme = els.scadaHmiScheme?.value || 'http';
  const host = els.scadaHmiHost?.value?.trim() || '127.0.0.1';
  const port = Number(els.scadaHmiPort?.value ?? 3000) || 3000;
  return `${scheme}://${host}:${port}`;
}

function fillScadaSettings(cfg) {
  if (!cfg) return;
  if (els.scadaListenHost) els.scadaListenHost.value = String(cfg.listen?.host || '');
  if (els.scadaListenPort) els.scadaListenPort.value = String(cfg.listen?.port ?? '');
  if (els.scadaRefreshMs) els.scadaRefreshMs.value = String(cfg.refresh_ms ?? 2000);

  if (els.scadaOpcbridgeScheme) els.scadaOpcbridgeScheme.value = String(cfg.opcbridge?.scheme || 'http');
  if (els.scadaOpcbridgeHost) els.scadaOpcbridgeHost.value = String(cfg.opcbridge?.host || '');
  if (els.scadaOpcbridgePort) els.scadaOpcbridgePort.value = String(cfg.opcbridge?.port ?? '');

  if (els.scadaAlarmsScheme) els.scadaAlarmsScheme.value = String(cfg.alarms?.scheme || 'http');
  if (els.scadaAlarmsHost) els.scadaAlarmsHost.value = String(cfg.alarms?.host || '');
  if (els.scadaAlarmsPort) els.scadaAlarmsPort.value = String(cfg.alarms?.port ?? '');

  if (els.scadaHmiScheme) els.scadaHmiScheme.value = String(cfg.hmi?.scheme || 'http');
  if (els.scadaHmiHost) els.scadaHmiHost.value = String(cfg.hmi?.host || '');
  if (els.scadaHmiPort) els.scadaHmiPort.value = String(cfg.hmi?.port ?? '');
}

function readScadaSettingsFromForm() {
  return {
    listen: {
      host: els.scadaListenHost?.value?.trim() || '0.0.0.0',
      port: Number(els.scadaListenPort?.value ?? 3010) || 3010
    },
    refresh_ms: Number(els.scadaRefreshMs?.value ?? 2000) || 2000,
    opcbridge: {
      scheme: els.scadaOpcbridgeScheme?.value || 'http',
      host: els.scadaOpcbridgeHost?.value?.trim() || '127.0.0.1',
      port: Number(els.scadaOpcbridgePort?.value ?? 8080) || 8080
    },
    alarms: {
      scheme: els.scadaAlarmsScheme?.value || 'http',
      host: els.scadaAlarmsHost?.value?.trim() || '127.0.0.1',
      port: Number(els.scadaAlarmsPort?.value ?? 8085) || 8085
    },
    hmi: {
      scheme: els.scadaHmiScheme?.value || 'http',
      host: els.scadaHmiHost?.value?.trim() || '127.0.0.1',
      port: Number(els.scadaHmiPort?.value ?? 3000) || 3000
    }
  };
}

async function loadScadaSettings() {
  setScadaSettingsStatus('Loading…');
  try {
    const data = await apiGet('/api/scada/config');
    fillScadaSettings(data?.config);
    state.scadaConfigFull = data?.config || null;
    state.scadaChannels = Array.isArray(data?.config?.channels) ? data.config.channels : [];
    state.scadaDeviceAssignments = (data?.config?.device_assignments && typeof data.config.device_assignments === 'object') ? data.config.device_assignments : {};
    renderWorkspaceTree();
    setScadaSettingsStatus(data?.local_only ? 'Ready. (Config updates restricted to localhost)' : 'Ready.');
  } catch (err) {
    setScadaSettingsStatus(`Failed: ${err.message}`);
  }
}

async function saveScadaSettings() {
  setScadaSettingsStatus('Saving…');
  try {
    const next = readScadaSettingsFromForm();
    const resp = await apiPostJson('/api/scada/config', { config: next });
    fillScadaSettings(resp?.config);

    if (resp?.restart_required) {
      setScadaSettingsStatus('Saved. Restart opcbridge-scada for listen host/port changes to take effect.');
    } else {
      setScadaSettingsStatus('Saved.');
    }

    await loadBootstrapConfig();
    restartRefreshLoop();
  } catch (err) {
    setScadaSettingsStatus(`Save failed: ${err.message}`);
  }
}

function wireScadaSettingsUi() {
  els.scadaSettingsReloadBtn?.addEventListener('click', loadScadaSettings);
  els.scadaSettingsSaveBtn?.addEventListener('click', saveScadaSettings);
  els.scadaOpenHmiBtn?.addEventListener('click', () => {
    window.open(hmiUrlFromForm(), '_blank', 'noopener,noreferrer');
  });
}

// ---------------- Connections ----------------

function setConnStatus(msg) {
  if (els.connStatus) els.connStatus.textContent = String(msg || '');
}

function setConnEditorEnabled(enabled) {
  if (els.connTestBtn) els.connTestBtn.disabled = !enabled;
  if (els.connSaveBtn) els.connSaveBtn.disabled = !enabled;
  if (els.connReloadBtn) els.connReloadBtn.disabled = !enabled;
  [els.connId, els.connDriver, els.connGateway, els.connPath, els.connSlot, els.connPlcType, els.connRaw]
    .filter(Boolean)
    .forEach((el) => { el.disabled = !enabled; });
}

function fillConnForm(obj) {
  state.selectedConnObj = obj;
  state.selectedConnRawDirty = false;
  if (!obj) return;

  if (els.connId) els.connId.value = String(obj.connection_id || '');
  if (els.connDriver) els.connDriver.value = String(obj.driver || '');
  if (els.connGateway) els.connGateway.value = String(obj.gateway || '');
  if (els.connPath) els.connPath.value = String(obj.path || '');
  if (els.connSlot) els.connSlot.value = obj.slot == null ? '' : String(obj.slot);
  if (els.connPlcType) els.connPlcType.value = String(obj.plc_type || obj.plcType || '');
  if (els.connRaw) els.connRaw.value = prettyJson(obj);
}

function readConnObjFromForm() {
  if (state.selectedConnRawDirty && els.connRaw) {
    return parseJsonc(els.connRaw.value);
  }

  const base = { ...(state.selectedConnObj || {}) };
  if (els.connId) base.connection_id = els.connId.value.trim();
  if (els.connDriver) base.driver = els.connDriver.value.trim();
  if (els.connGateway) base.gateway = els.connGateway.value.trim();
  if (els.connPath) base.path = els.connPath.value.trim();

  if (els.connSlot) {
    const raw = els.connSlot.value.trim();
    if (raw === '') delete base.slot;
    else base.slot = Number(raw);
  }

  if (els.connPlcType) {
    const v = els.connPlcType.value.trim();
    if (v) base.plc_type = v;
    else delete base.plc_type;
  }

  return base;
}

function renderConnList() {
  if (!els.connList) return;
  els.connList.textContent = '';

  const items = state.connFiles.slice().sort((a, b) => {
    const ap = String(a?.path || '');
    const bp = String(b?.path || '');
    return ap.localeCompare(bp);
  });

  items.forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'list-item';
    btn.classList.toggle('is-active', f.path === state.selectedConnPath);
    const title = (f.path || '').replace(/^connections\//, '').replace(/\.json$/i, '');
    btn.innerHTML = `
      <div class="title">${title}</div>
      <div class="meta"><code>${f.path}</code></div>
    `;
    btn.addEventListener('click', () => selectConnectionFile(f.path));
    els.connList.appendChild(btn);
  });

  if (els.connListNote) {
    els.connListNote.textContent = items.length ? `${items.length} connection file(s)` : 'No connection files found.';
  }
}

async function loadConnectionsList() {
  setConnStatus('Loading connections…');
  try {
    const data = await apiGet('/api/opcbridge/config/files');
    const files = Array.isArray(data?.files) ? data.files : [];
    state.connFiles = files.filter((f) => String(f?.kind) === 'connection');

    // Preload connection configs so we can key devices/tags by true connection_id (not filename).
    await Promise.allSettled(state.connFiles.map(async (f) => {
      const rel = String(f?.path || '').trim();
      if (!rel) return;
      try {
        await getConnObjForPath(rel);
      } catch {
        // ignore
      }
    }));

    renderConnList();
    renderWorkspaceTree();
    setConnStatus('Ready.');
  } catch (err) {
    setConnStatus(`Failed: ${err.message}`);
  }
}


async function getConnObjForPath(pathRel) {
  const key = String(pathRel || '').trim();
  if (!key) return null;
  if (state.connObjCache?.has(key)) return state.connObjCache.get(key);

  const raw = await apiGetText(`/api/opcbridge/config/file?path=${encodeURIComponent(key)}`);
  const obj = parseJsonc(raw);
  if (state.connObjCache) state.connObjCache.set(key, obj);
  return obj;
}

async function selectConnectionFile(pathRel) {
  state.selectedConnPath = String(pathRel || '');
  renderConnList();
  renderWorkspaceTree();

  if (els.connEditorTitle) {
    els.connEditorTitle.textContent = state.selectedConnPath ? `Editing: ${state.selectedConnPath}` : 'Select a connection';
  }

  if (!state.selectedConnPath) {
    setConnEditorEnabled(false);
    return;
  }

  setConnEditorEnabled(true);
  setConnStatus('Loading connection…');

  try {
    const raw = await apiGetText(`/api/opcbridge/config/file?path=${encodeURIComponent(state.selectedConnPath)}`);
    const obj = parseJsonc(raw);
    if (state.connObjCache) state.connObjCache.set(String(state.selectedConnPath), obj);
    fillConnForm(obj);
    setConnStatus('Loaded.');
  } catch (err) {
    setConnStatus(`Failed: ${err.message}`);
  }
}

async function saveSelectedConnection({ reload }) {
  if (!state.selectedConnPath) return;
  setConnStatus('Saving…');

  try {
    const obj = readConnObjFromForm();
    const content = prettyJson(obj);
    await apiPostJson('/api/opcbridge/config/file', { path: state.selectedConnPath, content });
    if (state.connObjCache) state.connObjCache.set(String(state.selectedConnPath), obj);
    setConnStatus(reload ? 'Saved. Reloading…' : 'Saved.');

    if (reload) {
      await apiPostJson('/api/opcbridge/reload', {});
      setConnStatus('Saved + Reloaded.');
    }

    await loadConnectionsList();
  } catch (err) {
    setConnStatus(`Save failed: ${err.message}`);
  }
}

function wireConnectionsUi() {
  els.connRefreshBtn?.addEventListener('click', loadConnectionsList);
  els.connSaveBtn?.addEventListener('click', () => saveSelectedConnection({ reload: false }));
  els.connReloadBtn?.addEventListener('click', () => saveSelectedConnection({ reload: true }));

  if (els.connRaw) {
    els.connRaw.addEventListener('input', () => { state.selectedConnRawDirty = true; });
  }

  const reflect = () => {
    if (!els.connRaw) return;
    if (state.selectedConnRawDirty) return;
    try {
      const obj = readConnObjFromForm();
      els.connRaw.value = prettyJson(obj);
    } catch {
      // ignore
    }
  };

  [els.connId, els.connDriver, els.connGateway, els.connPath, els.connSlot, els.connPlcType]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('input', reflect));

  setConnEditorEnabled(false);
}

// ---------------- Tags config ----------------

function setTagsConfigStatus(msg) {
  if (els.tagsConfigStatus) els.tagsConfigStatus.textContent = String(msg || '');
}

function makeTagKey(tag) {
  const c = String(tag?.connection_id || '').trim();
  const n = String(tag?.name || '').trim();
  return c && n ? `${c}::${n}` : '';
}

function sanitizeTagForPost(tag) {
  const out = { ...(tag || {}) };
  delete out.source_file;
  return out;
}

function getEffectiveTagsAll() {
  if (!state.tagConfigEdited || state.tagConfigEdited.size === 0) return state.tagConfigAll;
  const map = state.tagConfigEdited;
  return state.tagConfigAll.map((t) => {
    const key = makeTagKey(t);
    return (key && map.has(key)) ? map.get(key) : t;
  });
}

function workspaceIsDirty() {
  return (state.workspaceConnDirty && state.workspaceConnDirty.size > 0) || Boolean(state.tagConfigDirty) || Boolean(state.scadaDirty);
}

function setWorkspaceSaveStatus(msg) {
  if (els.workspaceSaveStatus) els.workspaceSaveStatus.textContent = String(msg || '');
}

function renderWorkspaceSaveBar() {
  const dirty = workspaceIsDirty();
  if (els.workspaceSaveBtn) els.workspaceSaveBtn.disabled = !dirty;
  // Allow manual reload even when there are no staged changes.
  if (els.workspaceSaveReloadBtn) els.workspaceSaveReloadBtn.disabled = false;
  if (els.workspaceDiscardBtn) els.workspaceDiscardBtn.disabled = !dirty;
}

const OPCBRIDGE_SCADA_DRAFT_KEY = 'opcbridge_scada_workspace_draft_v1';

function saveWorkspaceDraft() {
  try {
    const conn = {};
    if (state.workspaceConnDirty && state.workspaceConnDirty.size) {
      for (const [k, v] of state.workspaceConnDirty.entries()) conn[k] = v;
    }

    const tagEdits = {};
    if (state.tagConfigEdited && state.tagConfigEdited.size) {
      for (const [k, v] of state.tagConfigEdited.entries()) tagEdits[k] = v;
    }

    const payload = {
      ts_ms: Date.now(),
      conn_dirty: conn,
      tag_all: Array.isArray(state.tagConfigAll) ? state.tagConfigAll : [],
      tag_edits: tagEdits,
      tag_dirty: Boolean(state.tagConfigDirty),
      scada_channels: Array.isArray(state.scadaChannels) ? state.scadaChannels : [],
      scada_assignments: (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object') ? state.scadaDeviceAssignments : {},
      scada_dirty: Boolean(state.scadaDirty)
    };

    window.localStorage.setItem(OPCBRIDGE_SCADA_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function clearWorkspaceDraft() {
  try { window.localStorage.removeItem(OPCBRIDGE_SCADA_DRAFT_KEY); } catch { /* ignore */ }
}

function restoreWorkspaceDraft() {
  let raw = '';
  try { raw = window.localStorage.getItem(OPCBRIDGE_SCADA_DRAFT_KEY) || ''; } catch { raw = ''; }
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    // Restore tags (includes staged new tags)
    if (Array.isArray(parsed.tag_all)) {
      state.tagConfigAll = parsed.tag_all;
    }

    // Restore tag edits
    state.tagConfigEdited = new Map();
    if (parsed.tag_edits && typeof parsed.tag_edits === 'object') {
      Object.entries(parsed.tag_edits).forEach(([k, v]) => {
        if (k) state.tagConfigEdited.set(String(k), v);
      });
    }

    // Restore connection drafts
    state.workspaceConnDirty = new Map();
    if (parsed.conn_dirty && typeof parsed.conn_dirty === 'object') {
      Object.entries(parsed.conn_dirty).forEach(([k, v]) => {
        if (!k) return;
        state.workspaceConnDirty.set(String(k), v);
        if (state.connObjCache) state.connObjCache.set(String(k), v);
        // ensure file appears in list (covers new staged devices)
        const rel = String(k);
        if (rel && Array.isArray(state.connFiles) && !state.connFiles.some((f) => String(f?.path || '') === rel)) {
          state.connFiles.push({ kind: 'connection', path: rel });
        }
      });
    }

    // Restore scada drafts
    if (Array.isArray(parsed.scada_channels)) state.scadaChannels = parsed.scada_channels;
    if (parsed.scada_assignments && typeof parsed.scada_assignments === 'object') state.scadaDeviceAssignments = parsed.scada_assignments;

    state.scadaDirty = Boolean(parsed.scada_dirty);
    markTagsDirty(Boolean(parsed.tag_dirty));

    renderWorkspaceTree();
    renderWorkspaceSaveBar();
    setWorkspaceSaveStatus('Restored unsaved changes (draft).');
  } catch {
    // ignore
  }
}

window.addEventListener('beforeunload', (e) => {
  if (!workspaceIsDirty()) return;
  // Save draft and warn.
  saveWorkspaceDraft();
  e.preventDefault();
  e.returnValue = '';
});

function markTagsDirty(next) {
  state.tagConfigDirty = Boolean(next);
  if (els.tagsConfigSaveBtn) els.tagsConfigSaveBtn.disabled = !state.tagConfigDirty;
  if (els.tagsConfigReloadBtn) els.tagsConfigReloadBtn.disabled = !state.tagConfigDirty;
  renderWorkspaceSaveBar();
  if (state.tagConfigDirty) saveWorkspaceDraft();
}

function getFilteredTagsConfigRows() {
  const connFilter = String(els.tagsConfigConnFilter?.value || '');
  const q = String(els.tagsConfigSearch?.value || '').toLowerCase().trim();
  const rows = state.tagConfigAll.map((t) => {
    const key = makeTagKey(t);
    return state.tagConfigEdited.get(key) || t;
  });

  return rows.filter((t) => {
    if (connFilter && String(t.connection_id || '') !== connFilter) return false;
    if (!q) return true;
    const hay = `${t.connection_id || ''} ${t.name || ''} ${t.plc_tag_name || ''} ${t.datatype || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderTagsConfigTable() {
  if (!els.tagsConfigTableBody) return;
  els.tagsConfigTableBody.textContent = '';

  const rows = getFilteredTagsConfigRows();
  rows.forEach((t) => {
    const tr = document.createElement('tr');
    const enabled = t.enabled !== false;
    const scan = t.scan_ms ?? '';

    const scanInputId = `scan_${Math.random().toString(16).slice(2)}`;
    const enabledInputId = `en_${Math.random().toString(16).slice(2)}`;
    const writableInputId = `wr_${Math.random().toString(16).slice(2)}`;

    tr.innerHTML = `
      <td><code>${String(t.connection_id || '')}</code></td>
      <td><code>${String(t.name || '')}</code></td>
      <td><code>${String(t.plc_tag_name || '')}</code></td>
      <td><code>${String(t.datatype || '')}</code></td>
      <td><input class="inline-input" id="${scanInputId}" type="number" min="0" step="1" value="${String(scan)}" /></td>
      <td><input class="inline-check" id="${enabledInputId}" type="checkbox" ${enabled ? 'checked' : ''} /></td>
      <td><input class="inline-check" id="${writableInputId}" type="checkbox" ${t.writable ? 'checked' : ''} /></td>
      <td><code>${String(t.source_file || '')}</code></td>
    `;

    const key = makeTagKey(t);
    const scanEl = tr.querySelector(`#${CSS.escape(scanInputId)}`);
    const enabledEl = tr.querySelector(`#${CSS.escape(enabledInputId)}`);
    const writableEl = tr.querySelector(`#${CSS.escape(writableInputId)}`);

    const applyEdit = () => {
      const original = state.tagConfigAll.find((x) => makeTagKey(x) === key);
      const base = state.tagConfigEdited.get(key) || { ...(original || t) };

      if (scanEl) {
        const raw = String(scanEl.value).trim();
        if (raw === '') {
          delete base.scan_ms;
        } else {
          base.scan_ms = Math.max(0, Math.trunc(Number(raw) || 0));
        }
      }

      if (enabledEl) {
        base.enabled = Boolean(enabledEl.checked);
      }

      if (writableEl) {
        base.writable = Boolean(writableEl.checked);
      }

      state.tagConfigEdited.set(key, base);
      markTagsDirty(true);
    };

    scanEl?.addEventListener('change', applyEdit);
    enabledEl?.addEventListener('change', applyEdit);
    writableEl?.addEventListener('change', applyEdit);

    els.tagsConfigTableBody.appendChild(tr);
  });

  setTagsConfigStatus(rows.length ? `Loaded ${rows.length} tag(s).` : 'No tags.');
}

function renderTagsConfigFilters() {
  if (!els.tagsConfigConnFilter) return;
  const conns = Array.from(new Set(state.tagConfigAll.map((t) => String(t.connection_id || '')).filter(Boolean))).sort();
  els.tagsConfigConnFilter.textContent = '';
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'All connections';
  els.tagsConfigConnFilter.appendChild(optAll);
  conns.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    els.tagsConfigConnFilter.appendChild(opt);
  });
}

async function loadTagsConfig() {
  setTagsConfigStatus('Loading tag config…');
  try {
    const data = await apiGet('/api/opcbridge/config/tags');
    const tags = Array.isArray(data?.tags) ? data.tags : [];
    state.tagConfigAll = tags;
    state.tagConfigEdited = new Map();
    markTagsDirty(false);
    renderTagsConfigFilters();
    renderTagsConfigTable();
    renderWorkspaceTree();
  } catch (err) {
    setTagsConfigStatus(`Failed: ${err.message}`);
  }
}

async function saveTagsConfig({ reload }) {
  setTagsConfigStatus('Saving…');
  try {
    const merged = state.tagConfigAll.map((t) => {
      const key = makeTagKey(t);
      return state.tagConfigEdited.get(key) || t;
    });

    const tagsOut = merged.map(sanitizeTagForPost);
    await apiPostJson('/api/opcbridge/config/tags', { tags: tagsOut });

    if (reload) {
      await apiPostJson('/api/opcbridge/reload', {});
      setTagsConfigStatus('Saved + Reloaded.');
    } else {
      setTagsConfigStatus('Saved.');
    }

    await loadTagsConfig();
  } catch (err) {
    setTagsConfigStatus(`Save failed: ${err.message}`);
  }
}

function wireTagsConfigUi() {
  els.tagsConfigRefreshBtn?.addEventListener('click', loadTagsConfig);
  els.tagsConfigSaveBtn?.addEventListener('click', () => saveTagsConfig({ reload: false }));
  els.tagsConfigReloadBtn?.addEventListener('click', () => saveTagsConfig({ reload: true }));
  els.tagsConfigConnFilter?.addEventListener('change', renderTagsConfigTable);
  els.tagsConfigSearch?.addEventListener('input', () => {
    window.clearTimeout(state._tagSearchTimer);
    state._tagSearchTimer = window.setTimeout(renderTagsConfigTable, 80);
  });

  markTagsDirty(false);
}


let ctxMenuEl = null;

function closeContextMenu() {
  if (ctxMenuEl) {
    ctxMenuEl.remove();
    ctxMenuEl = null;
  }
}

function showContextMenu(x, y, items) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'ctxmenu';

  items.forEach((it) => {
    if (it === 'sep') {
      const sep = document.createElement('div');
      sep.className = 'sep';
      menu.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'item';
    btn.textContent = it.label;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeContextMenu();
      it.onClick?.();
    });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  ctxMenuEl = menu;

  // Fit on screen
  const pad = 8;
  const rect = menu.getBoundingClientRect();
  let left = x;
  let top = y;
  if (left + rect.width + pad > window.innerWidth) left = Math.max(pad, window.innerWidth - rect.width - pad);
  if (top + rect.height + pad > window.innerHeight) top = Math.max(pad, window.innerHeight - rect.height - pad);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

window.addEventListener('click', () => closeContextMenu());
window.addEventListener('blur', () => closeContextMenu());
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeContextMenu(); });


function setNewDevStatus(msg) {
  if (els.newDevStatus) els.newDevStatus.textContent = String(msg || '');
}

function showWorkspacePanel(which) {
  const showNewDevice = which === 'new_device';

  // Right pane stays table-only; new device is a modal.
  if (els.workspaceDetailsPanel) els.workspaceDetailsPanel.style.display = 'block';
  if (els.workspaceNewDevicePanel) els.workspaceNewDevicePanel.style.display = showNewDevice ? 'flex' : 'none';
}

function showWorkspaceNewDeviceForm(channelId) {
  const cid = String(channelId || '').trim();
  state.pendingNewDevice = { channel_id: cid };
  showWorkspacePanel('new_device');

  if (els.newDeviceHint) {
    els.newDeviceHint.textContent = cid ? `Creating a new Device under channel '${cid}'.` : 'Creating a new Device.';
  }

  if (els.newDevId) els.newDevId.value = '';
  if (els.newDevDriver) els.newDevDriver.value = 'ab_eip';
  if (els.newDevGateway) els.newDevGateway.value = '';
  if (els.newDevPath) els.newDevPath.value = '1,0';
  if (els.newDevSlot) els.newDevSlot.value = '0';
  if (els.newDevPlcType) els.newDevPlcType.value = 'lgx';

  setNewDevStatus('');
  els.newDevId?.focus?.();
}

function closeWorkspaceNewDeviceForm() {
  state.pendingNewDevice = null;
  showWorkspacePanel('details');
  setNewDevStatus('');
}


function setNewTagStatus(msg) {
  if (els.newTagStatus) els.newTagStatus.textContent = String(msg || '');
}

function showNewTagModal(connectionId) {
  const cid = String(connectionId || '').trim();
  if (!cid) return;

  state.pendingNewTag = { connection_id: cid };

  if (els.newTagHint) els.newTagHint.textContent = `Creating a new tag under device '${cid}'.`;
  if (els.newTagName) els.newTagName.value = '';
  if (els.newTagPlc) els.newTagPlc.value = '';
  fillTagDatatypeSelect(els.newTagDatatype, 'bool');
  if (els.newTagScan) els.newTagScan.value = '';
  if (els.newTagEnabled) els.newTagEnabled.checked = true;
  if (els.newTagWritable) els.newTagWritable.checked = false;

  setNewTagStatus('');
  if (els.newTagModal) els.newTagModal.style.display = 'flex';
  els.newTagName?.focus?.();
}

function closeNewTagModal() {
  state.pendingNewTag = null;
  setNewTagStatus('');
  if (els.newTagModal) els.newTagModal.style.display = 'none';
}


async function deleteTagById(connectionId, tagName) {
  const cid = String(connectionId || '').trim();
  const name = String(tagName || '').trim();
  if (!cid || !name) return;

  if (!window.confirm(`Delete tag '${cid}:${name}'?`)) return;

  try {
    const remaining = state.tagConfigAll.filter((t) => !(String(t?.connection_id || '') === cid && String(t?.name || '') === name));
    const tagsOut = remaining.map(sanitizeTagForPost);
    await apiPostJson('/api/opcbridge/config/tags', { tags: tagsOut });
    await loadTagsConfig();

    renderWorkspaceTree();
  } catch (err) {
    window.alert(`Failed to delete tag: ${err.message}`);
  }
}

async function createNewTagFromModal() {
  const cid = String(state.pendingNewTag?.connection_id || '').trim();
  if (!cid) return;

  const name = String(els.newTagName?.value || '').trim();
  if (!name) { setNewTagStatus('Tag Name is required.'); return; }

  const plc_tag_name = String(els.newTagPlc?.value || '').trim();
  if (!plc_tag_name) { setNewTagStatus('PLC Tag is required.'); return; }

  const datatype = String(els.newTagDatatype?.value || '').trim();
  const scanRaw = String(els.newTagScan?.value || '').trim();
  const scan_ms = scanRaw === '' ? null : Math.max(0, Math.trunc(Number(scanRaw) || 0));
  const enabled = Boolean(els.newTagEnabled?.checked);
  const writable = Boolean(els.newTagWritable?.checked);

  const tag = { connection_id: cid, name, plc_tag_name, datatype, enabled, writable };
  if (scan_ms != null) tag.scan_ms = scan_ms;

  const key = makeTagKey(tag);
  const exists = state.tagConfigAll.some((t) => makeTagKey(t) === key);
  if (exists) { setNewTagStatus(`Tag '${cid}:${name}' already exists.`); return; }

  state.tagConfigAll = state.tagConfigAll.concat([tag]);
  markTagsDirty(true);
  renderWorkspaceTree();
  closeNewTagModal();
}

async function createNewTagFromModalReload() {
  await createNewTagFromModal();
  try {
    await opcbridgeReload();
  } catch {
    // ignore
  }
}

function wireNewTagModalUi() {
  const close = () => closeNewTagModal();

  els.newTagCloseBtn?.addEventListener('click', close);
  els.newTagCancelBtn?.addEventListener('click', close);
  els.newTagCreateBtn?.addEventListener('click', createNewTagFromModal);

  els.newTagModal?.addEventListener('click', (e) => {
    if (e.target === els.newTagModal) close();
  });

  [els.newTagName, els.newTagPlc, els.newTagDatatype, els.newTagScan]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && els.newTagModal?.style.display === 'flex') {
        e.preventDefault();
        createNewTagFromModal();
      }
    }));
}


function setChannelPropStatus(msg) {
  if (els.channelPropStatus) els.channelPropStatus.textContent = String(msg || '');
}

function openChannelPropsModal(channelId) {
  const cid = String(channelId || '').trim();
  if (!cid || cid === 'unassigned') return;

  const ch = (Array.isArray(state.scadaChannels) ? state.scadaChannels : []).find((c) => String(c?.id || '').trim() === cid);
  state.pendingChannelEdit = { channel_id: cid };

  if (els.channelPropsHint) els.channelPropsHint.textContent = `Editing channel '${cid}'.`;
  if (els.channelPropName) els.channelPropName.value = String(ch?.name || cid);
  if (els.channelPropDesc) els.channelPropDesc.value = String(ch?.description || '');

  setChannelPropStatus('');

  if (els.channelPropsModal) els.channelPropsModal.style.display = 'flex';
  els.channelPropName?.focus?.();
}

function closeChannelPropsModal() {
  state.pendingChannelEdit = null;
  setChannelPropStatus('');
  if (els.channelPropsModal) els.channelPropsModal.style.display = 'none';
}


function setWorkspaceItemStatus(msg) {
  if (els.workspaceItemStatus) els.workspaceItemStatus.textContent = String(msg || '');
}

function closeWorkspaceItemModal() {
  state.pendingWorkspaceItem = null;
  setWorkspaceItemStatus('');
  setEditDevStatus('');
  setEditTagStatus('');
  setEditTagStatus('');
  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';
  if (els.workspaceItemModal) els.workspaceItemModal.style.display = 'none';
}

function setEditDevStatus(msg) {
  if (els.editDevStatus) els.editDevStatus.textContent = String(msg || '');
}

function setEditTagStatus(msg) {
  if (els.editTagStatus) els.editTagStatus.textContent = String(msg || '');
}

function openWorkspaceItemModal(node) {
  if (!els.workspaceItemModal) return;
  if (!node) return;

  state.pendingWorkspaceItem = { id: String(node.id || '') };

  if (els.workspaceItemHint) els.workspaceItemHint.textContent = '';
  if (els.workspaceItemTbody) els.workspaceItemTbody.textContent = '';
  setWorkspaceItemStatus('');
  setEditDevStatus('');

  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';

  const type = String(node.type || '');
  const titleEl = document.getElementById('workspaceItemModalTitle');
  if (titleEl) {
    titleEl.textContent = type === 'device'
      ? 'Edit Device'
      : (type === 'tag' ? 'Edit Tag' : (type === 'tags_folder' ? 'Tags Properties' : 'Properties'));
  }

  const addRow = (field, value, dim = false) => {
    if (!els.workspaceItemTbody) return;
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = String(field || '');
    const td2 = document.createElement('td');
    td2.textContent = String(value ?? '');
    if (dim) td2.className = 'audit-cell-dim';
    tr.appendChild(td1);
    tr.appendChild(td2);
    els.workspaceItemTbody.appendChild(tr);
  };

  if (type === 'device') {
    if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'block';

    const connectionId = String(node.meta?.connection_id || '');
    const relPath = String(node.meta?.path || '').trim();

    if (els.editDevId) els.editDevId.value = connectionId;

    if (!relPath) {
      setEditDevStatus('Missing device config path.');
    } else {
      setEditDevStatus('Loading…');
      getConnObjForPath(relPath).then((obj) => {
        if (els.editDevDriver) els.editDevDriver.value = String(obj?.driver || 'ab_eip') || 'ab_eip';
        if (els.editDevGateway) els.editDevGateway.value = String(obj?.gateway || '');
        if (els.editDevPath) els.editDevPath.value = String(obj?.path || '1,0') || '1,0';
        if (els.editDevSlot) els.editDevSlot.value = (obj?.slot == null) ? '' : String(obj.slot);
        if (els.editDevPlcType) els.editDevPlcType.value = String(obj?.plc_type || obj?.plcType || 'lgx') || 'lgx';
        setEditDevStatus('');
      }).catch((err) => {
        setEditDevStatus(`Load failed: ${err.message}`);
      });
    }

    if (els.workspaceItemHint) {
      els.workspaceItemHint.textContent = relPath ? `Editing ${relPath}` : 'Editing device.';
    }

    els.workspaceItemModal.style.display = 'flex';
    return;
  }

  if (type === 'tag') {
    if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'block';

    const conn = String(node.meta?.connection_id || '');
    const name = String(node.meta?.name || node.label || '');
    state.pendingWorkspaceItem = { id: String(node.id || ''), type: 'tag', connection_id: conn, name };

    if (els.workspaceItemHint) els.workspaceItemHint.textContent = `${conn}:${name}`;

    if (els.editTagConn) els.editTagConn.value = conn;
    if (els.editTagName) els.editTagName.value = name;

    const row = getEffectiveTagsAll().find((tt) => String(tt?.connection_id || '') === conn && String(tt?.name || '') === name) || null;
    if (!row) {
      if (els.editTagPlc) els.editTagPlc.value = '';
      fillTagDatatypeSelect(els.editTagDatatype, 'bool');
      if (els.editTagScan) els.editTagScan.value = '';
      if (els.editTagEnabled) els.editTagEnabled.checked = true;
      if (els.editTagWritable) els.editTagWritable.checked = false;
      if (els.editTagSaveBtn) els.editTagSaveBtn.disabled = true;
      setEditTagStatus('Tag not found in config. Refresh tag config.');
    } else {
      if (els.editTagPlc) els.editTagPlc.value = String(row?.plc_tag_name || '');
      fillTagDatatypeSelect(els.editTagDatatype, String(row?.datatype || 'bool'));
      if (els.editTagScan) els.editTagScan.value = (row?.scan_ms == null) ? '' : String(row.scan_ms);
      if (els.editTagEnabled) els.editTagEnabled.checked = (row?.enabled !== false);
      if (els.editTagWritable) els.editTagWritable.checked = (row?.writable === true);
      if (els.editTagSaveBtn) els.editTagSaveBtn.disabled = false;
      setEditTagStatus('');
    }

    els.workspaceItemModal.style.display = 'flex';
    els.editTagPlc?.focus?.();
    return;
  }

  // Generic (read-only) properties
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'block';

  if (type === 'channel') {
    addRow('Name', String(node.label || ''));
    addRow('Channel ID', String(node.meta?.channel_id || ''));
    addRow('Description', String(node.meta?.description || ''), !String(node.meta?.description || '').trim());
  } else if (type === 'tags_folder') {
    addRow('Connection', String(node.meta?.connection_id || ''));
  } else if (type === 'tag') {
    const conn = String(node.meta?.connection_id || '');
    const name = String(node.meta?.name || node.label || '');
    addRow('Connection', conn);
    addRow('Name', name);
    const row = state.tagConfigAll.find((tt) => String(tt?.connection_id || '') === conn && String(tt?.name || '') === name) || null;
    if (row) {
      addRow('PLC Tag', String(row?.plc_tag_name || ''), !String(row?.plc_tag_name || ''));
      addRow('Datatype', String(row?.datatype || ''), !String(row?.datatype || ''));
      addRow('Scan (ms)', row?.scan_ms == null ? '' : String(row.scan_ms), row?.scan_ms == null);
      addRow('Enabled', row?.enabled !== false ? 'yes' : 'no');
      addRow('Writable', row?.writable === true ? 'yes' : 'no');
    }
  } else if (type === 'alarm') {
    addRow('Alarm ID', String(node.meta?.alarm_id || ''));
    addRow('Name', String(node.label || ''));
    addRow('Group', String(node.meta?.group || ''), !String(node.meta?.group || '').trim());
    addRow('Site', String(node.meta?.site || ''), !String(node.meta?.site || '').trim());
    addRow('Severity', node.meta?.severity == null ? '' : String(node.meta.severity), node.meta?.severity == null);
    addRow('Enabled', node.meta?.enabled === false ? 'no' : 'yes');
    addRow('Active', node.meta?.active ? 'yes' : 'no');
    addRow('Acked', node.meta?.acked ? 'yes' : 'no');
    const src = node.meta?.source || {};
    addRow('Source', `${String(src?.connection_id || '')}:${String(src?.tag || '')}`.replace(/^:$/, ''), !(src?.connection_id || src?.tag));
    addRow('Message', String(node.meta?.message || ''), !String(node.meta?.message || '').trim());
  } else if (type === 'event') {
    const ev = node.meta || {};
    const src = ev?.source || {};
    addRow('Event ID', String(ev?.event_id || ''), !String(ev?.event_id || '').trim());
    addRow('Time', fmtTime(ev?.ts_ms), !ev?.ts_ms);
    addRow('Type', String(ev?.type || ''), !String(ev?.type || '').trim());
    addRow('Alarm ID', String(ev?.alarm_id || ''), !String(ev?.alarm_id || '').trim());
    addRow('Group', String(ev?.group || ''), !String(ev?.group || '').trim());
    addRow('Site', String(ev?.site || ''), !String(ev?.site || '').trim());
    addRow('Severity', ev?.severity == null ? '' : String(ev.severity), ev?.severity == null);
    addRow('Source', `${String(src?.connection_id || '')}:${String(src?.tag || '')}`.replace(/^:$/, ''), !(src?.connection_id || src?.tag));
    addRow('Value', ev?.value == null ? '' : (typeof ev.value === 'string' ? ev.value : JSON.stringify(ev.value)), ev?.value == null);
    addRow('Message', ev?.message == null ? '' : String(ev.message), ev?.message == null);
    addRow('Actor', ev?.actor == null ? '' : String(ev.actor), ev?.actor == null);
    addRow('Note', ev?.note == null ? '' : String(ev.note), ev?.note == null);
  } else {
    addRow('Name', String(node.label || node.id || ''));
  }

  els.workspaceItemModal.style.display = 'flex';
}

async function saveEditedTagFromModal() {
  const conn = String(state.pendingWorkspaceItem?.connection_id || '').trim();
  const name = String(state.pendingWorkspaceItem?.name || '').trim();
  if (!conn || !name) return;

  const idx = state.tagConfigAll.findIndex((t) => String(t?.connection_id || '') === conn && String(t?.name || '') === name);
  if (idx < 0) { setEditTagStatus('Tag not found in config (try Refresh).'); return; }

  const plc_tag_name = String(els.editTagPlc?.value || '').trim();
  const datatype = String(els.editTagDatatype?.value || '').trim();
  const scanRaw = String(els.editTagScan?.value || '').trim();
  const enabled = Boolean(els.editTagEnabled?.checked);
  const writable = Boolean(els.editTagWritable?.checked);

  if (!plc_tag_name) { setEditTagStatus('PLC Tag is required.'); return; }
  if (!datatype) { setEditTagStatus('Datatype is required.'); return; }

  const next = { ...(state.tagConfigAll[idx] || {}) };
  next.plc_tag_name = plc_tag_name;
  next.datatype = datatype;
  next.enabled = enabled;
  next.writable = writable;
  if (scanRaw === '') delete next.scan_ms;
  else next.scan_ms = Math.max(0, Math.trunc(Number(scanRaw) || 0));

  const key = makeTagKey(next);
  if (!state.tagConfigEdited) state.tagConfigEdited = new Map();
  if (key) state.tagConfigEdited.set(key, next);
  markTagsDirty(true);
  renderWorkspaceTree();
  closeWorkspaceItemModal();
}

async function saveEditedTagFromModalReload() {
  await saveEditedTagFromModal();
  try {
    await opcbridgeReload();
  } catch {
    // ignore
  }
}

async function saveEditedDeviceFromModal() {
  const nodeId = String(state.pendingWorkspaceItem?.id || '');
  const node = findWorkspaceNodeById(state.workspaceTreeRoot, nodeId);
  if (!node || String(node.type || '') !== 'device') return;

  const relPath = String(node.meta?.path || '').trim();
  if (!relPath) { setEditDevStatus('Missing device config path.'); return; }

  const connection_id = String(node.meta?.connection_id || '').trim();
  const driver = String(els.editDevDriver?.value || '').trim() || 'ab_eip';
  const gateway = String(els.editDevGateway?.value || '').trim();
  const pathVal = String(els.editDevPath?.value || '').trim() || '1,0';
  const slot = Number(String(els.editDevSlot?.value || '0').trim() || '0') || 0;
  const plc_type = String(els.editDevPlcType?.value || '').trim() || 'lgx';

  const obj = { connection_id, driver, gateway, path: pathVal, slot, plc_type };

  if (!state.workspaceConnDirty) state.workspaceConnDirty = new Map();
  state.workspaceConnDirty.set(relPath, obj);
  if (state.connObjCache) state.connObjCache.set(relPath, obj);

  setEditDevStatus('Staged.');
  renderWorkspaceSaveBar();
  saveWorkspaceDraft();
  renderWorkspaceTree();
  closeWorkspaceItemModal();
}

async function saveEditedDeviceFromModalReload() {
  await saveEditedDeviceFromModal();
  try {
    await opcbridgeReload();
  } catch {
    // ignore
  }
}

function wireWorkspaceItemModalUi() {
  const close = () => closeWorkspaceItemModal();

  els.workspaceItemCloseBtn?.addEventListener('click', close);

  els.editDevCancelBtn?.addEventListener('click', close);
  els.editDevSaveBtn?.addEventListener('click', saveEditedDeviceFromModal);

  els.editTagCancelBtn?.addEventListener('click', close);
  els.editTagSaveBtn?.addEventListener('click', saveEditedTagFromModal);
  els.workspaceItemModal?.addEventListener('click', (e) => {
    if (e.target === els.workspaceItemModal) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.workspaceItemModal?.style.display === 'flex') close();
  });
  [els.editDevGateway, els.editDevPath, els.editDevSlot, els.editDevPlcType, els.editDevDriver]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && els.workspaceItemModal?.style.display === 'flex') {
        e.preventDefault();
        saveEditedDeviceFromModal();
      }
    }));

  [els.editTagPlc, els.editTagDatatype, els.editTagScan]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && els.workspaceItemModal?.style.display === 'flex') {
        e.preventDefault();
        saveEditedTagFromModal();
      }
    }));

}

async function saveChannelPropsModal() {
  const cid = String(state.pendingChannelEdit?.channel_id || '').trim();
  if (!cid) return;

  const name = String(els.channelPropName?.value || '').trim();
  if (!name) { setChannelPropStatus('Name is required.'); return; }
  const description = String(els.channelPropDesc?.value || '').trim();

  const channels = Array.isArray(state.scadaChannels) ? state.scadaChannels.slice() : [];
  const next = channels.map((c) => {
    const id = String(c?.id || '').trim();
    if (id !== cid) return c;
    return { ...c, name, description };
  });

  state.scadaChannels = next;
  state.scadaDirty = true;
  renderWorkspaceSaveBar();
  saveWorkspaceDraft();

  renderWorkspaceTree();
  const selected = findWorkspaceNodeById(state.workspaceTreeRoot, state.selectedNodeId);
  if (selected) renderWorkspaceDetails(selected);

  closeChannelPropsModal();
}

async function createNewDeviceFromWorkspace() {
  const cid = String(state.pendingNewDevice?.channel_id || '').trim();

  const connection_id = String(els.newDevId?.value || '').trim();
  if (!connection_id) { setNewDevStatus('Device ID is required.'); return; }

  const driver = String(els.newDevDriver?.value || '').trim() || 'ab_eip';
  const gateway = String(els.newDevGateway?.value || '').trim();
  const pathVal = String(els.newDevPath?.value || '').trim() || '1,0';
  const slot = Number(String(els.newDevSlot?.value || '0').trim() || '0') || 0;
  const plc_type = String(els.newDevPlcType?.value || '').trim() || 'lgx';

  const obj = { connection_id, driver, gateway, path: pathVal, slot, plc_type };
  const relPath = `connections/${connection_id}.json`;

  const exists = state.connFiles.some((f) => String(f?.path || '') === relPath);
  if (exists) { setNewDevStatus(`Device '${connection_id}' already exists.`); return; }

  if (!state.workspaceConnDirty) state.workspaceConnDirty = new Map();
  state.workspaceConnDirty.set(relPath, obj);
  if (state.connObjCache) state.connObjCache.set(String(relPath), obj);
  state.connFiles = state.connFiles.concat([{ kind: 'connection', path: relPath }]);

  // Stage channel assignment
  if (cid) {
    const da = (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object') ? { ...state.scadaDeviceAssignments } : {};
    da[String(connection_id)] = cid;
    state.scadaDeviceAssignments = da;
    state.scadaDirty = true;
  }

  setNewDevStatus('Staged.');
  renderWorkspaceSaveBar();
  saveWorkspaceDraft();
  renderWorkspaceTree();
  closeWorkspaceNewDeviceForm();
}

async function createNewDeviceFromWorkspaceReload() {
  await createNewDeviceFromWorkspace();
  try {
    await opcbridgeReload();
  } catch {
    // ignore
  }
}

function wireNewDeviceFormUi() {
  // Default panel state
  showWorkspacePanel('details');

  els.newDevCancelBtn?.addEventListener('click', closeWorkspaceNewDeviceForm);
  els.newDevModalCloseBtn?.addEventListener('click', closeWorkspaceNewDeviceForm);

  els.workspaceNewDevicePanel?.addEventListener('click', (e) => {
    if (e.target === els.workspaceNewDevicePanel) closeWorkspaceNewDeviceForm();
  });
  els.newDevCreateBtn?.addEventListener('click', createNewDeviceFromWorkspace);

  // Enter to create when focused in an input
  [els.newDevId, els.newDevDriver, els.newDevGateway, els.newDevPath, els.newDevSlot, els.newDevPlcType]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewDeviceFromWorkspace();
      }
    }));
}

function wireWorkspaceSaveBarUi() {
  els.workspaceSaveBtn?.addEventListener('click', () => saveWorkspaceAll({ reload: false }));
  els.workspaceSaveReloadBtn?.addEventListener('click', () => saveWorkspaceAll({ reload: true }));
  els.workspaceDiscardBtn?.addEventListener('click', discardWorkspaceChanges);
  renderWorkspaceSaveBar();
}

function wireChannelPropsUi() {
  const close = () => closeChannelPropsModal();

  els.channelPropCancelBtn?.addEventListener('click', close);
  els.channelPropsCloseBtn?.addEventListener('click', close);
  els.channelPropSaveBtn?.addEventListener('click', saveChannelPropsModal);

  els.channelPropsModal?.addEventListener('click', (e) => {
    if (e.target === els.channelPropsModal) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.channelPropsModal?.style.display === 'flex') close();
  });
}



async function deleteChannelById(channelId) {
  const cid = String(channelId || '').trim();
  if (!cid || cid === 'unassigned') return;

  if (!window.confirm(`Delete channel '${cid}'? Devices assigned to it will become Unassigned.`)) return;

  const channels = Array.isArray(state.scadaChannels) ? state.scadaChannels.slice() : [];
  const nextChannels = channels.filter((c) => String(c?.id || '').trim() !== cid);

  const da = (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object') ? { ...state.scadaDeviceAssignments } : {};
  for (const [devId, chId] of Object.entries(da)) {
    if (String(chId || '').trim() === cid) delete da[devId];
  }

  state.scadaChannels = nextChannels;
  state.scadaDeviceAssignments = da;
  state.scadaDirty = true;
  renderWorkspaceSaveBar();
  saveWorkspaceDraft();

  if (state.selectedNodeId === `channel:${cid}`) state.selectedNodeId = 'folder:connectivity';
  renderWorkspaceTree();
}

async function createNewChannelInteractive() {
  const name = String(window.prompt('New channel name:', '') || '').trim();
  if (!name) return;

  const idDefault = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const id = String(window.prompt('Channel id:', idDefault) || '').trim() || idDefault;
  if (!id) return;

  const channels = Array.isArray(state.scadaChannels) ? state.scadaChannels.slice() : [];
  if (channels.some((c) => String(c?.id || '') === id)) {
    window.alert(`A channel with id '${id}' already exists.`);
    return;
  }

  channels.push({ id, name });
  state.scadaChannels = channels;
  state.scadaDirty = true;
  renderWorkspaceSaveBar();
  saveWorkspaceDraft();
  renderWorkspaceTree();
}

async function createNewConnectionInteractive(opts = {}) {
  setTab('workspace');
  const cid = String(opts?.channel_id || '').trim();
  showWorkspaceNewDeviceForm(cid);
}


async function deleteDeviceById(connectionId, pathRel) {
  const cid = String(connectionId || '').trim();
  const relPath = String(pathRel || '').trim();
  if (!cid || !relPath) return;

  if (!window.confirm(`Delete device '${cid}'? This deletes ${relPath} and removes its tags from config.`)) return;

  try {
    await apiPostJson('/api/opcbridge/config/delete', { path: relPath });

    // Remove any channel assignment
    try {
      const cur = await apiGet('/api/scada/config');
      const cfg = cur?.config || {};
      const da = (cfg.device_assignments && typeof cfg.device_assignments === 'object') ? { ...cfg.device_assignments } : {};
      delete da[cid];
      const resp = await apiPostJson('/api/scada/config', { config: { ...cfg, device_assignments: da } });
      state.scadaDeviceAssignments = (resp?.config?.device_assignments && typeof resp.config.device_assignments === 'object') ? resp.config.device_assignments : da;
    } catch {
      // ignore
    }

    // Remove tags for this connection_id
    try {
      const remaining = state.tagConfigAll.filter((t) => String(t?.connection_id || '') !== cid);
      const tagsOut = remaining.map(sanitizeTagForPost);
      await apiPostJson('/api/opcbridge/config/tags', { tags: tagsOut });
      await loadTagsConfig();
    } catch {
      // ignore
    }

    if (state.selectedNodeId && String(state.selectedNodeId).includes(relPath)) {
      state.selectedNodeId = 'folder:connectivity';
    }

    state.connObjCache?.delete?.(relPath);

    await loadConnectionsList();
    renderWorkspaceTree();
  } catch (err) {
    window.alert(`Failed to delete device: ${err.message}`);
  }
}

// ---------------- Workspace tree ----------------


function tagCountForConn(connectionId) {
  if (!connectionId) return 0;
  return getEffectiveTagsAll().filter((t) => String(t.connection_id || '') === connectionId).length;
}

function inferConnectionIdFromPath(pathRel) {
  const s = String(pathRel || '').split('/').pop() || '';
  return s.replace(/\.json$/i, '');
}


function connectionIdForConnFilePath(pathRel) {
  const rel = String(pathRel || '').trim();
  if (!rel) return '';

  const cached = state.connObjCache?.get?.(rel);
  const fromObj = String(cached?.id || cached?.connection_id || '').trim();
  if (fromObj) return fromObj;

  return inferConnectionIdFromPath(rel);
}


function parseDraggedDevice(e) {
  const fromState = String(state.draggedDeviceConnectionId || '').trim();
  if (fromState) return { connection_id: fromState };

  try {
    const raw = e?.dataTransfer?.getData('text/plain') || e?.dataTransfer?.getData('text') || '';
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (String(parsed.type || '') !== 'device') return null;
    const connection_id = String(parsed.connection_id || '').trim();
    if (!connection_id) return null;
    return { connection_id };
  } catch {
    return null;
  }
}

async function assignDeviceToChannel(connectionId, channelId) {
  const connection_id = String(connectionId || '').trim();
  const target = String(channelId || '').trim();
  if (!connection_id) return;

  const targetCid = (target && target !== 'unassigned') ? target : '';
  const currentCid = String(state.scadaDeviceAssignments?.[connection_id] || '').trim();
  if (currentCid === targetCid) return;

  const next = (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object')
    ? { ...state.scadaDeviceAssignments }
    : {};

  if (targetCid) next[connection_id] = targetCid;
  else delete next[connection_id];

  state.scadaDeviceAssignments = next;
  state.scadaDirty = true;
  renderWorkspaceSaveBar();
  saveWorkspaceDraft();

  renderWorkspaceTree();
  const sel = findWorkspaceNodeById(state.workspaceTreeRoot, state.selectedNodeId);
  if (sel) renderWorkspaceDetails(sel);
}

function buildTree() {
  const root = {
    id: 'project:opcbridge',
    type: 'project',
    label: 'opcbridge',
    children: []
  };

  const connectivity = { id: 'folder:connectivity', type: 'folder', label: 'Connectivity', children: [] };
  root.children.push(connectivity);
  const alarmsEvents = { id: 'folder:alarms_events', type: 'folder', label: 'Alarms & Events', children: [] };
  root.children.push(alarmsEvents);

  const alarmsRoot = { id: 'folder:alarms', type: 'alarms_root', label: 'Alarms', children: [] };

  alarmsEvents.children.push(alarmsRoot);

  const channelItems = Array.isArray(state.scadaChannels) ? state.scadaChannels.slice() : [];
  const channels = [];

  channelItems.forEach((ch) => {
    const cid = String(ch?.id || '').trim();
    const cname = String(ch?.name || ch?.id || '').trim();
    const cdesc = String(ch?.description || '').trim();
    if (!cid || !cname) return;
    channels.push({ id: cid, name: cname, description: cdesc });
  });

  if (channels.length === 0) {
    connectivity.children.push({ id: 'hint:no_channels', type: 'hint', label: '(right-click Connectivity to add a channel)', children: [] });
  }

  const assignments = (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object') ? state.scadaDeviceAssignments : {};

  const channelNodes = channels.map((c) => ({
    id: `channel:${c.id}`,
    type: 'channel',
    label: c.name,
    meta: { channel_id: c.id, description: String(c.description || '') },
    children: []
  }));

  const unassigned = {
    id: 'channel:unassigned',
    type: 'channel',
    label: 'Unassigned',
    meta: { channel_id: 'unassigned' },
    children: []
  };

  const connItems = state.connFiles.slice().sort((a, b) => String(a?.path || '').localeCompare(String(b?.path || '')));
  connItems.forEach((f) => {
    const pathRel = String(f?.path || '');
    if (!pathRel) return;
    const connectionId = connectionIdForConnFilePath(pathRel);

    const deviceId = `device:${pathRel}`;

    const tagChildren = [];
    if (state.expanded.has(deviceId)) {
      const tags = getEffectiveTagsAll()
        .filter((tt) => String(tt.connection_id || '') == connectionId)
        .slice()
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

      tags.forEach((tt) => {
        tagChildren.push({
          id: `tag:${connectionId}::${String(tt.name || '')}`,
          type: 'tag',
          label: String(tt.name || ''),
          meta: { connection_id: connectionId, name: String(tt.name || '') },
          children: []
        });
      });
    }

    const deviceNode = {
      id: deviceId,
      type: 'device',
      label: connectionId,
      meta: { path: pathRel, connection_id: connectionId },
      children: tagChildren
    };

    const assigned = String(assignments[String(connectionId)] || '').trim();
    if (assigned) {
      const target = channelNodes.find((c) => String(c.meta?.channel_id) === assigned);
      if (target) target.children.push(deviceNode);
      else unassigned.children.push(deviceNode);
    } else {
      unassigned.children.push(deviceNode);
    }
  });

  channelNodes.forEach((ch) => connectivity.children.push(ch));
  if (unassigned.children.length) connectivity.children.push(unassigned);

  // Build alarms tree: Group -> Site -> Alarm
  const allAlarms = Array.isArray(state.alarmsAll) ? state.alarmsAll : [];
  const safeKey = (s) => {
    const k = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return k || 'none';
  };

  if (!allAlarms.length) {
    alarmsRoot.children.push({ id: 'hint:no_alarms', type: 'hint', label: '(no alarms loaded yet)', children: [] });
  } else {
    const groups = new Map();
    allAlarms.forEach((a) => {
      const alarm_id = String(a?.alarm_id || a?.id || '').trim();
      if (!alarm_id) return;

      const groupRaw = String(a?.group || a?.group_name || '').trim();
      const siteRaw = String(a?.site || a?.site_name || '').trim();

      const groupLabel = groupRaw || '(No group)';
      const siteLabel = siteRaw || '(No site)';

      const groupId = `alarm_group:${safeKey(groupLabel)}`;
      let groupNode = groups.get(groupId);
      if (!groupNode) {
        groupNode = {
          id: groupId,
          type: 'alarm_group',
          label: groupLabel,
          meta: { group: groupRaw },
          children: []
        };
        groups.set(groupId, groupNode);
      }

      const siteId = `${groupId}:site:${safeKey(siteLabel)}`;
      let siteNode = (groupNode.children || []).find((n) => String(n?.id || '') === siteId) || null;
      if (!siteNode) {
        siteNode = {
          id: siteId,
          type: 'alarm_site',
          label: siteLabel,
          meta: { group: groupRaw, site: siteRaw },
          children: []
        };
        groupNode.children.push(siteNode);
      }

      const name = String(a?.name || a?.description || alarm_id).trim() || alarm_id;
      const sev = (a?.severity == null) ? '' : Number(a.severity);
      const enabled = (a?.enabled !== false);
      const active = Boolean(a?.active);
      const acked = Boolean(a?.acked);
      const src = a?.source || {};
      const srcConn = String(src?.connection_id || a?.connection_id || '').trim();
      const srcTag = String(src?.tag || a?.tag || a?.tag_name || '').trim();
      const message = String(a?.message || '').trim();

      siteNode.children.push({
        id: `alarm:${alarm_id}`,
        type: 'alarm',
        label: name,
        meta: {
          alarm_id,
          group: groupRaw,
          site: siteRaw,
          severity: sev,
          enabled,
          active,
          acked,
          source: { connection_id: srcConn, tag: srcTag },
          message
        },
        children: []
      });
    });

    const groupNodes = Array.from(groups.values()).sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || '')));
    groupNodes.forEach((g) => {
      g.children = (g.children || []).slice().sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || '')));
      g.children.forEach((s) => {
        s.children = (s.children || []).slice().sort((a, b) => Number(b?.meta?.severity || 0) - Number(a?.meta?.severity || 0));
      });
      alarmsRoot.children.push(g);
    });
  }

  return root;
}

function renderTreeNode(node, container) {
  const canExpand = ['project', 'folder', 'channel', 'device', 'alarms_root', 'alarm_group', 'alarm_site'].includes(String(node.type || ''));
  const expanded = state.expanded.has(node.id);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tree-item';
  btn.classList.toggle('is-active', state.selectedNodeId === node.id);

  const twisty = document.createElement('span');
  twisty.className = 'twisty';
  twisty.classList.toggle('is-empty', !canExpand);
  twisty.textContent = canExpand ? (expanded ? '−' : '+') : '';
  if (canExpand) {
    twisty.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.expanded.has(node.id)) state.expanded.delete(node.id);
      else state.expanded.add(node.id);
      renderWorkspaceTree();
    });
  }

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = node.label;

  const meta = document.createElement('span');
  meta.className = 'meta';
  if (node.type === 'device') {
    const n = tagCountForConn(node.meta?.connection_id);
    meta.textContent = n ? `${n} tag(s)` : '';
  }

  btn.appendChild(twisty);
  btn.appendChild(label);
  btn.appendChild(meta);

  btn.addEventListener('click', () => {
    state.selectedNodeId = node.id;
    updateWorkspaceLiveTagFilterFromNode(node);
    renderWorkspaceTree();
    renderWorkspaceDetails(node);
  });

  if (node.type === 'device') {
    btn.draggable = true;
    btn.addEventListener('dragstart', (e) => {
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'device', connection_id: String(node.meta?.connection_id || '') }));
        state.draggedDeviceConnectionId = String(node.meta?.connection_id || '');
        btn.classList.add('is-dragging');
      } catch {
        // ignore
      }
    });
    btn.addEventListener('dragend', () => {
      btn.classList.remove('is-dragging');
      state.draggedDeviceConnectionId = '';
      document.querySelectorAll('.tree-item.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    });
  }

  if (node.type === 'channel') {
    btn.addEventListener('dragenter', (e) => {
      const dev = parseDraggedDevice(e);
      if (!dev) return;
      e.preventDefault();
      btn.classList.add('is-drop-target');
    });
    btn.addEventListener('dragover', (e) => {
      const dev = parseDraggedDevice(e);
      if (!dev) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    btn.addEventListener('dragleave', () => {
      btn.classList.remove('is-drop-target');
    });
    btn.addEventListener('drop', async (e) => {
      const dev = parseDraggedDevice(e);
      if (!dev) return;
      e.preventDefault();
      btn.classList.remove('is-drop-target');
      const cid = String(node.meta?.channel_id || '').trim();
      await assignDeviceToChannel(dev.connection_id, cid);
    });
  }

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Right-click also selects the node and updates the right pane.
    state.selectedNodeId = node.id;
    renderWorkspaceTree();

    if (node.type === 'project') return;

    const items = [];

    if (node.type === 'folder' && node.id === 'folder:connectivity') {
      items.push({ label: 'Add Channel…', onClick: () => createNewChannelInteractive() });
      items.push('sep');
    }

    if (node.type === 'channel' && String(node.meta?.channel_id || '') !== 'unassigned') {
      const cid = String(node.meta?.channel_id || '');
      items.push({ label: 'Edit Channel…', onClick: () => openChannelPropsModal(cid) });
      items.push({ label: 'Delete Channel…', onClick: () => deleteChannelById(cid) });
      items.push('sep');
    }

    if (node.type === 'device') {
      const cid = String(node.meta?.connection_id || '').trim();
      const relPath = String(node.meta?.path || '').trim();
      items.push({ label: 'Add Tag…', onClick: () => showNewTagModal(cid) });
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'Delete Device…', onClick: () => deleteDeviceById(cid, relPath) });
      items.push('sep');
    }

    if (node.type === 'tag') {
      const cid = String(node.meta?.connection_id || '').trim();
      const name = String(node.meta?.name || node.label || '').trim();
      items.push({ label: 'Delete Tag…', onClick: () => deleteTagById(cid, name) });
      items.push('sep');
    }

    const canAddDevice = node.type === 'channel';
    if (canAddDevice) {
      items.push({ label: 'Add Device…', onClick: () => createNewConnectionInteractive({ channel_id: String(node.meta?.channel_id || '') }) });
    }

    items.push({ label: 'Refresh', onClick: async () => { await loadConnectionsList(); await loadTagsConfig(); await refreshAll(); } });

    if (!items.length) return;
    showContextMenu(e.clientX, e.clientY, items);
  });

  container.appendChild(btn);

  if (canExpand && expanded) {
    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tree-children';
    (node.children || []).forEach((c) => renderTreeNode(c, childrenWrap));
    container.appendChild(childrenWrap);
  }
}


function renderWorkspaceDetails(node) {
  if (!node) return;

  // Right pane is table-only.
  if (els.workspaceDetailsPanel) els.workspaceDetailsPanel.style.display = 'block';

  const children = Array.isArray(node.children) ? node.children : [];
  const isConnectivity = node.id === 'folder:connectivity';
  const isChannel = String(node.type || '') === 'channel';
  const isDevice = String(node.type || '') === 'device';
  const isTag = String(node.type || '') === 'tag';

  const isAlarmsEvents = node.id === 'folder:alarms_events';
  const isAlarmsRoot = String(node.type || '') === 'alarms_root';
  const isAlarmGroup = String(node.type || '') === 'alarm_group';
  const isAlarmSite = String(node.type || '') === 'alarm_site';
  const isAlarm = String(node.type || '') === 'alarm';

  // ---------- Alarms & Events (alarms only for now) ----------
  if (isAlarmsEvents || isAlarmsRoot || isAlarmGroup || isAlarmSite || isAlarm) {
    const columns = (isAlarmSite || isAlarm)
      ? ['Name', 'Severity', 'Source', 'State', 'Acked', 'Enabled', 'Group', 'Site']
      : ['Name'];

    const colCount = columns.length;

    // Header
    if (els.workspaceChildrenTable) {
      const headRow = els.workspaceChildrenTable.querySelector('thead tr');
      if (headRow) {
        headRow.textContent = '';
        columns.forEach((c) => {
          const th = document.createElement('th');
          th.textContent = c;
          headRow.appendChild(th);
        });
      }
    }

    if (!els.workspaceChildrenTbody) return;
    els.workspaceChildrenTbody.textContent = '';

    const addCell = (tr, text, dim = false) => {
      const td = document.createElement('td');
      td.textContent = String(text ?? '');
      if (dim) td.className = 'audit-cell-dim';
      tr.appendChild(td);
      return td;
    };

    const rows = isAlarm ? [node] : (Array.isArray(node.children) ? node.children : []);

    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = colCount;
      td.className = 'audit-cell-dim';
      td.textContent = 'No items.';
      tr.appendChild(td);
      els.workspaceChildrenTbody.appendChild(tr);
      return;
    }

    rows.forEach((c) => {
      const tr = document.createElement('tr');
      const type = String(c?.type || '');

      if ((isAlarmSite || isAlarm) && type === 'alarm') {
        const meta = c?.meta || {};
        const src = meta?.source || {};
        const stateStr = (meta?.enabled === false) ? 'DISABLED' : (meta?.active ? 'ACTIVE' : 'OK');
        addCell(tr, String(c?.label || meta?.alarm_id || ''), false);
        addCell(tr, meta?.severity == null ? '' : String(meta.severity), meta?.severity == null);
        addCell(tr, `${String(src?.connection_id || '')}:${String(src?.tag || '')}`.replace(/^:$/, ''), !(src?.connection_id || src?.tag));
        addCell(tr, stateStr, false);
        addCell(tr, meta?.acked ? 'yes' : 'no', false);
        addCell(tr, meta?.enabled === false ? 'no' : 'yes', false);
        addCell(tr, String(meta?.group || ''), !String(meta?.group || '').trim());
        addCell(tr, String(meta?.site || ''), !String(meta?.site || '').trim());
      } else {
        addCell(tr, String(c?.label || c?.id || ''), false);
      }

      tr.style.cursor = 'default';

      tr.addEventListener('click', () => {
        const trs = Array.from(els.workspaceChildrenTbody.querySelectorAll('tr'));
        trs.forEach((r) => r.classList.remove('is-selected'));
        tr.classList.add('is-selected');
      });

      tr.addEventListener('dblclick', () => {
        openWorkspaceItemModal(c);
      });

      els.workspaceChildrenTbody.appendChild(tr);
    });

    return;
  }

  // ---------- Connectivity / tags ----------

  // When a channel is selected, list its devices with device fields.
  const showDeviceCols = isChannel;

  // When a device is selected, list all tags. When a tag is selected, show a single-row tag table.
  const showTagCols = isDevice || isTag;

  const columns = ['Name'];
  if (isConnectivity) columns.push('Description');
  if (showDeviceCols) columns.push('Driver', 'Gateway', 'Path', 'Slot', 'PLC Type');
  if (showTagCols) columns.push('PLC Tag', 'Datatype', 'Scan (ms)', 'Enabled', 'Writable');

  const colCount = columns.length;

  state.workspaceRenderSeq = (Number(state.workspaceRenderSeq || 0) + 1) || 1;
  const seq = state.workspaceRenderSeq;

  const connectionId = String(node.meta?.connection_id || '').trim();
  const selectedTagName = isTag ? String(node.meta?.name || node.label || '').trim() : '';

  let tagRows = [];
  if (showTagCols && connectionId) {
    if (isDevice) {
      tagRows = getEffectiveTagsAll()
        .filter((tt) => String(tt?.connection_id || '') === connectionId)
        .slice()
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    } else if (isTag && selectedTagName) {
      const key = `${connectionId}::${selectedTagName}`;
      const original = state.tagConfigAll.find((tt) => String(tt?.connection_id || '') === connectionId && String(tt?.name || '') === selectedTagName) || null;
      const edited = state.tagConfigEdited?.get?.(key) || null;
      const row = edited || original || { connection_id: connectionId, name: selectedTagName };
      tagRows = [row];
    }
  }

  const rowsToRender = showTagCols ? tagRows : children;

  // Header
  if (els.workspaceChildrenTable) {
    const headRow = els.workspaceChildrenTable.querySelector('thead tr');
    if (headRow) {
      headRow.textContent = '';
      columns.forEach((c) => {
        const th = document.createElement('th');
        th.textContent = c;
        headRow.appendChild(th);
      });
    }
  }

  if (!els.workspaceChildrenTbody) return;
  els.workspaceChildrenTbody.textContent = '';

  if (!rowsToRender.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colCount;
    td.className = 'audit-cell-dim';
    td.textContent = 'No children.';
    tr.appendChild(td);
    els.workspaceChildrenTbody.appendChild(tr);
    return;
  }

  const addCell = (tr, text, dim = false) => {
    const td = document.createElement('td');
    td.textContent = String(text ?? '');
    if (dim) td.className = 'audit-cell-dim';
    tr.appendChild(td);
    return td;
  };

  rowsToRender.forEach((c) => {
    const tr = document.createElement('tr');

    const type = String(c?.type || '');
    const name = showTagCols ? String(c?.name || '') : String(c?.label || c?.id || '');

    addCell(tr, name);

    if (showTagCols) {
      const plcTag = String(c?.plc_tag_name || '');
      const datatype = String(c?.datatype || '');
      const scan = (c?.scan_ms == null) ? '' : String(c.scan_ms);
      const enabled = (c?.enabled !== false) ? 'yes' : 'no';
      const writable = (c?.writable === true) ? 'yes' : 'no';
      addCell(tr, plcTag, !plcTag);
      addCell(tr, datatype, !datatype);
      addCell(tr, scan, scan === '');
      addCell(tr, enabled, false);
      addCell(tr, writable, false);
    }

    if (isConnectivity) {
      const desc = (type === 'channel') ? String(c?.meta?.description || '') : '';
      addCell(tr, desc, !desc);
    }

    let tDriver = null;
    let tGateway = null;
    let tPath = null;
    let tSlot = null;
    let tPlc = null;

    if (showDeviceCols) {
      // Only device rows get values; other child rows get blanks.
      tDriver = addCell(tr, '', true);
      tGateway = addCell(tr, '', true);
      tPath = addCell(tr, '', true);
      tSlot = addCell(tr, '', true);
      tPlc = addCell(tr, '', true);

      if (type === 'device') {
        const relPath = String(c?.meta?.path || '').trim();
        if (relPath) {
          // async fill from cache / file
          getConnObjForPath(relPath).then((obj) => {
            if (seq !== state.workspaceRenderSeq) return;
            if (!tDriver?.isConnected) return;

            const driver = String(obj?.driver || '').trim();
            const gateway = String(obj?.gateway || '').trim();
            const pathVal = String(obj?.path || '').trim();
            const slotVal = (obj?.slot == null) ? '' : String(obj.slot);
            const plcType = String(obj?.plc_type || obj?.plcType || '').trim();

            tDriver.textContent = labelForDriver(driver);
            tGateway.textContent = gateway;
            tPath.textContent = pathVal;
            tSlot.textContent = slotVal;
            tPlc.textContent = labelForPlcType(plcType);

            [tDriver, tGateway, tPath, tSlot, tPlc].forEach((td) => {
              if (!td) return;
              td.classList.toggle('audit-cell-dim', !String(td.textContent || '').trim());
            });
          }).catch(() => {
            if (seq !== state.workspaceRenderSeq) return;
            [tDriver, tGateway, tPath, tSlot, tPlc].forEach((td) => {
              if (!td?.isConnected) return;
              td.textContent = '';
              td.classList.add('audit-cell-dim');
            });
          });
        }
      }
    }

    tr.style.cursor = 'default';

    tr.addEventListener('click', () => {
      const rows = Array.from(els.workspaceChildrenTbody.querySelectorAll('tr'));
      rows.forEach((r) => r.classList.remove('is-selected'));
      tr.classList.add('is-selected');
    });

    tr.addEventListener('dblclick', () => {
      // double-click opens properties
      if (showTagCols) {
        const pseudo = {
          id: `tag:${String(c?.connection_id || connectionId)}::${String(c?.name || '')}`,
          type: 'tag',
          label: String(c?.name || ''),
          meta: { connection_id: String(c?.connection_id || connectionId), name: String(c?.name || '') }
        };
        openWorkspaceItemModal(pseudo);
        return;
      }
      if (type === 'channel') {
        const cid = String(c?.meta?.channel_id || '').trim();
        if (cid && cid !== 'unassigned') openChannelPropsModal(cid);
        return;
      }
      openWorkspaceItemModal(c);
    });

    els.workspaceChildrenTbody.appendChild(tr);
  });
}
function renderWorkspaceTree() {
  if (!els.treeView) return;
  els.treeView.textContent = '';

  const tree = buildTree();
  state.workspaceTreeRoot = tree;
  renderTreeNode(tree, els.treeView);

  if (els.treeNote) {
    els.treeNote.textContent = `Devices: ${state.connFiles.length} · Tags: ${getEffectiveTagsAll().length}`;
  }

  const selected = state.selectedNodeId ? findWorkspaceNodeById(tree, state.selectedNodeId) : null;
  if (selected) {
    renderWorkspaceDetails(selected);
    return;
  }

  state.selectedNodeId = 'project:opcbridge';
  renderWorkspaceDetails(tree);
}

function findWorkspaceNodeById(node, id) {
  if (!node) return null;
  if (String(node.id) === String(id)) return node;
  const children = Array.isArray(node.children) ? node.children : [];
  for (const c of children) {
    const found = findWorkspaceNodeById(c, id);
    if (found) return found;
  }
  return null;
}

function selectWorkspaceNodeById(id) {
  const root = state.workspaceTreeRoot;
  const node = findWorkspaceNodeById(root, id);
  if (!node) return;
  state.selectedNodeId = node.id;
  updateWorkspaceLiveTagFilterFromNode(node);
  renderWorkspaceTree();
  renderWorkspaceDetails(node);
}

async function saveWorkspaceAll({ reload }) {
  if (!workspaceIsDirty()) {
    if (!reload) return;
    setWorkspaceSaveStatus('Reloading…');
    renderWorkspaceSaveBar();
    try {
      await opcbridgeReload();
      setWorkspaceSaveStatus('Reloaded.');
    } catch (err) {
      setWorkspaceSaveStatus(`Reload failed: ${err.message}`);
    } finally {
      renderWorkspaceSaveBar();
    }
    return;
  }
  setWorkspaceSaveStatus('Saving…');
  renderWorkspaceSaveBar();
  try {
    // 1) Save connection file writes
    if (state.workspaceConnDirty && state.workspaceConnDirty.size) {
      for (const [pathRel, obj] of state.workspaceConnDirty.entries()) {
        await apiPostJson('/api/opcbridge/config/file', { path: pathRel, content: prettyJson(obj) });
        if (state.connObjCache) state.connObjCache.set(String(pathRel), obj);
      }
    }

    // 2) Save tags config (includes any edits staged in tags config page + workspace popups)
    if (state.tagConfigDirty) {
      const effective = getEffectiveTagsAll();
      const tagsOut = effective.map(sanitizeTagForPost);
      await apiPostJson('/api/opcbridge/config/tags', { tags: tagsOut });
    }

    // 3) Save SCADA config (channels + assignments)
    if (state.scadaDirty) {
      const cur = await apiGet('/api/scada/config');
      const cfg = cur?.config || state.scadaConfigFull || {};
      const next = { ...cfg, channels: Array.isArray(state.scadaChannels) ? state.scadaChannels : [], device_assignments: (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object') ? state.scadaDeviceAssignments : {} };
      const resp = await apiPostJson('/api/scada/config', { config: next });
      state.scadaConfigFull = resp?.config || next;
    }

    if (reload) {
      await opcbridgeReload();
    }

    // Clear dirty state and refresh
    if (state.workspaceConnDirty) state.workspaceConnDirty.clear();
    state.scadaDirty = false;
    state.tagConfigEdited = new Map();
    markTagsDirty(false);
    clearWorkspaceDraft();

    await Promise.all([loadConnectionsList(), loadTagsConfig(), loadScadaSettings()]);
    renderWorkspaceTree();
    setWorkspaceSaveStatus(reload ? 'Saved + Reloaded.' : 'Saved.');
  } catch (err) {
    setWorkspaceSaveStatus(`Save failed: ${err.message}`);
  } finally {
    renderWorkspaceSaveBar();
  }
}

async function discardWorkspaceChanges() {
  if (!workspaceIsDirty()) return;
  if (!window.confirm('Discard unsaved changes?')) return;
  setWorkspaceSaveStatus('Discarding…');
  try {
    if (state.workspaceConnDirty) state.workspaceConnDirty.clear();
    state.scadaDirty = false;
    state.tagConfigEdited = new Map();
    markTagsDirty(false);
    clearWorkspaceDraft();
    await Promise.all([loadConnectionsList(), loadTagsConfig(), loadScadaSettings()]);
    renderWorkspaceTree();
    setWorkspaceSaveStatus('');
  } catch (err) {
    setWorkspaceSaveStatus(`Discard failed: ${err.message}`);
  } finally {
    renderWorkspaceSaveBar();
  }
}


function updateWorkspaceLiveTagFilterLabel() {
  if (!els.workspaceLiveTagsFilter) return;
  const lbl = String(state.liveTagFilter?.label || 'All');
  els.workspaceLiveTagsFilter.textContent = `Filter: ${lbl}`;
}

function updateWorkspaceLiveTagFilterFromNode(node) {
  if (!node) return;
  const type = String(node.type || '');

  if (type === 'channel') {
    const channel_id = String(node.meta?.channel_id || '').trim();
    const label = channel_id && channel_id !== 'unassigned' ? node.label : 'Unassigned';
    state.liveTagFilter = { type: 'channel', channel_id, label };
  } else if (type === 'device' || type === 'tag') {
    const connection_id = String(node.meta?.connection_id || '').trim();
    if (connection_id) {
      state.liveTagFilter = { type: 'device', connection_id, label: connection_id };
    } else {
      state.liveTagFilter = { type: 'all', label: 'All' };
    }
  } else {
    state.liveTagFilter = { type: 'all', label: 'All' };
  }

  updateWorkspaceLiveTagFilterLabel();

  // Re-render workspace live table immediately using last snapshot.
  if (state.liveTagsLast) {
    renderLiveTags(state.liveTagsLast);
  }
}

function filterLiveTagsForWorkspace(tags) {
  const f = state.liveTagFilter || { type: 'all' };
  if (!tags || !Array.isArray(tags)) return [];

  if (f.type === 'device') {
    const cid = String(f.connection_id || '').trim();
    if (!cid) return tags;
    return tags.filter((t) => String(t?.connection_id || '') === cid);
  }

  if (f.type === 'channel') {
    const ch = String(f.channel_id || '').trim();

    // Build set of connection_ids assigned to this channel.
    const da = (state.scadaDeviceAssignments && typeof state.scadaDeviceAssignments === 'object')
      ? state.scadaDeviceAssignments
      : {};

    const include = new Set();

    if (ch && ch !== 'unassigned') {
      Object.entries(da).forEach(([devId, channelId]) => {
        if (String(channelId || '').trim() === ch) include.add(String(devId || '').trim());
      });
    } else {
      // Unassigned: devices with no assignment.
      const assigned = new Set(Object.keys(da).map((k) => String(k || '').trim()).filter(Boolean));

      // Prefer the known configured connections list.
      const connIds = (Array.isArray(state.connFiles) ? state.connFiles : [])
        .map((f) => connectionIdForConnFilePath(String(f?.path || '')))
        .filter(Boolean);

      connIds.forEach((cid) => { if (!assigned.has(cid)) include.add(cid); });
    }

    if (include.size === 0) return [];
    return tags.filter((t) => include.has(String(t?.connection_id || '').trim()));
  }

  return tags;
}

// ---------------- Live + alarms ----------------

function computeTagStatus(t) {
  const hasSnap = (t?.has_snapshot !== false);
  const handleOk = (t?.handle_ok !== false);

  let status = 'BAD';
  let cls = 'status-error';

  if (!handleOk) {
    status = 'BAD_HANDLE';
  } else if (!hasSnap) {
    status = 'MISSING';
  } else if (t?.quality === 1 || t?.quality === 'good') {
    status = 'GOOD';
    cls = 'status-ok';
  }

  return { status, cls, hasSnap };
}

function renderLiveTagsInto(tbody, tags) {
  if (!tbody) return;
  tbody.textContent = '';
  (tags || []).forEach((t) => {
    const { status, cls, hasSnap } = computeTagStatus(t);

    const tr = document.createElement('tr');

    const conn = String(t?.connection_id || '');
    const name = String(t?.tag || t?.name || '');
    const datatype = String(t?.datatype || '');

    const value = (t?.value == null)
      ? ''
      : (typeof t.value === 'string' ? t.value : JSON.stringify(t.value));

    const writable = (t?.writable === true) ? 'yes' : 'no';

    const ts = (hasSnap && t?.timestamp_ms != null)
      ? fmtTime(t.timestamp_ms)
      : '';

    tr.innerHTML = `
      <td><code>${conn}</code></td>
      <td><code>${name}</code></td>
      <td><code>${datatype}</code></td>
      <td class="${cls}"><code>${status}</code></td>
      <td><code>${value}</code></td>
      <td><code>${writable}</code></td>
      <td><code>${ts}</code></td>
    `;

    tbody.appendChild(tr);
  });
}

function renderLiveTags(tagsResp) {
  state.liveTagsLast = tagsResp;
  const tags = Array.isArray(tagsResp?.tags) ? tagsResp.tags : [];
  renderLiveTagsInto(els.tagsTableBody, tags);

  updateWorkspaceLiveTagFilterLabel();
  const filtered = filterLiveTagsForWorkspace(tags);
  renderLiveTagsInto(els.workspaceLiveTagsTbody, filtered);
}


function renderActiveAlarms(activeResp) {
  state.activeAlarmsLast = activeResp;
  if (!els.activeAlarmsTableBody) return;
  els.activeAlarmsTableBody.textContent = '';
  const alarms = Array.isArray(activeResp?.alarms) ? activeResp.alarms : [];
  alarms.forEach((a) => {
    const src = a?.source || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${String(a?.alarm_id || '')}</code></td>
      <td><code>${String(a?.severity ?? '')}</code></td>
      <td><code>${String(src?.connection_id || '')}:${String(src?.tag || '')}</code></td>
      <td>${String(a?.message || '')}</td>
      <td><code>${a?.acked ? 'yes' : 'no'}</code></td>
      <td><code>${fmtTime(a?.active_since_ms)}</code></td>
    `;
    els.activeAlarmsTableBody.appendChild(tr);
  });
}

function renderAlarmEvents(histResp) {
  state.alarmHistoryLast = histResp;
  if (!els.alarmEventsTableBody) return;
  els.alarmEventsTableBody.textContent = '';
  const events = Array.isArray(histResp?.events) ? histResp.events : [];
  events.forEach((ev) => {
    const src = ev?.source || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${fmtTime(ev?.ts_ms)}</code></td>
      <td><code>${String(ev?.type || '')}</code></td>
      <td><code>${String(ev?.alarm_id || '')}</code></td>
      <td><code>${String(ev?.severity ?? '')}</code></td>
      <td><code>${String(src?.connection_id || '')}:${String(src?.tag || '')}</code></td>
      <td><code>${ev?.value == null ? '' : (typeof ev.value === 'string' ? ev.value : JSON.stringify(ev.value))}</code></td>
      <td>${ev?.message == null ? '' : String(ev.message)}</td>
    `;
    els.alarmEventsTableBody.appendChild(tr);
  });
}

async function refreshAll() {
  const started = Date.now();
  try {
    const [health, alarmsStatus] = await Promise.all([
      apiGet('/api/opcbridge/health'),
      apiGet('/api/alarms/alarm/api/status')
    ]);

    renderOverviewHealth(health);
    renderJson(els.healthJson, health);
    renderJson(els.alarmsStatusJson, alarmsStatus);

    const tags = await apiGet('/api/opcbridge/tags');
    renderLiveTags(tags);

const [active, history, all] = await Promise.all([
  apiGet('/api/alarms/alarm/api/alarms/active').catch(() => ({ ok: false, alarms: [] })),
  apiGet('/api/alarms/alarm/api/alarms/history?limit=200').catch(() => ({ ok: false, events: [] })),
  apiGet('/api/alarms/alarm/api/alarms/all').catch(() => ({ ok: false, alarms: [] }))
]);
renderActiveAlarms(active);
renderAlarmEvents(history);

state.alarmsAllLast = all;
state.alarmsAll = Array.isArray(all?.alarms) ? all.alarms : [];

// If the user is browsing alarms/events in Workspace, refresh that view.
const sid = String(state.selectedNodeId || '');
if (sid.includes('alarms') || sid.includes('alarm')) {
  renderWorkspaceTree();
}

    const overall = String(health?.status || 'unknown');
    const elapsed = Date.now() - started;
    if (els.statusLine) {
      els.statusLine.innerHTML = `opcbridge: ${badge(overall)} · alarms: <span class="badge ok">${alarmsStatus?.ok ? 'ok' : 'bad'}</span> · refresh ${elapsed}ms`;
    }
  } catch (err) {
    if (els.statusLine) els.statusLine.textContent = `Refresh failed: ${err.message}`;
  }
}

async function loadBootstrapConfig() {
  const cfg = await apiGet('/api/config');
  state.cfg = cfg?.config;
  state.auth = cfg?.auth;

  if (els.buildLine) {
    const o = state.cfg?.opcbridge || {};
    const a = state.cfg?.alarms || {};
    const h = state.cfg?.hmi || {};
    const r = state.cfg?.refresh_ms;
    const authStr = state.auth
      ? ` · admin_token=${state.auth.admin_token_configured ? 'yes' : 'no'} write_token=${state.auth.write_token_configured ? 'yes' : 'no'}`
      : '';
    els.buildLine.textContent = `refresh=${r}ms · opcbridge @ ${o.scheme}://${o.host}:${o.port} · alarms @ ${a.scheme}://${a.host}:${a.port} · hmi @ ${h.scheme}://${h.host}:${h.port}${authStr}`;
  }
}

function restartRefreshLoop() {
  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
  const ms = Number(state.cfg?.refresh_ms ?? 2000) || 2000;
  state.refreshTimer = window.setInterval(refreshAll, ms);
}

async function main() {
  setTab('overview');

  wireScadaSettingsUi();
  wireConnectionsUi();
  wireTagsConfigUi();
  wireNewDeviceFormUi();
  wireChannelPropsUi();
  wireWorkspaceItemModalUi();
  wireNewTagModalUi();

  try {
    await loadBootstrapConfig();
  } catch {
    // ignore
  }

  try {
    await loadScadaSettings();
  } catch {
    // ignore
  }

  try {
    await loadConnectionsList();
  } catch {
    // ignore
  }

  try {
    await loadTagsConfig();
  } catch {
    // ignore
  }

  // Always render at least the skeleton tree/table so the Workspace UI isn't blank.
  renderWorkspaceTree();

  try {
    await refreshAll();
  } catch {
    // ignore
  }

  restartRefreshLoop();
}

main();
