// opcbridge-scada UI (no external deps)

const els = {
  statusLine: document.getElementById('statusLine'),
  buildLine: document.getElementById('buildLine'),
  authLine: document.getElementById('authLine'),
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
  topLinkOpcbridge: document.getElementById('topLinkOpcbridge'),
  topLinkHmi: document.getElementById('topLinkHmi'),
  scadaSettingsReloadBtn: document.getElementById('scadaSettingsReloadBtn'),
  scadaSettingsSaveBtn: document.getElementById('scadaSettingsSaveBtn'),
  scadaSettingsStatus: document.getElementById('scadaSettingsStatus'),

  // opcbridge systemd service settings
  svcOpcbridgeBin: document.getElementById('svcOpcbridgeBin'),
  svcOpcbridgeConfigDir: document.getElementById('svcOpcbridgeConfigDir'),
  svcHttpEnabled: document.getElementById('svcHttpEnabled'),
  svcWsEnabled: document.getElementById('svcWsEnabled'),
  svcOpcuaEnabled: document.getElementById('svcOpcuaEnabled'),
  svcMqttEnabled: document.getElementById('svcMqttEnabled'),
  svcHttpPort: document.getElementById('svcHttpPort'),
  svcWsPort: document.getElementById('svcWsPort'),
  svcOpcuaPort: document.getElementById('svcOpcuaPort'),
  svcReloadBtn: document.getElementById('svcReloadBtn'),
  svcApplyBtn: document.getElementById('svcApplyBtn'),
  svcStatus: document.getElementById('svcStatus'),

  // MQTT CA certificate (opcbridge)
  mqttCaFile: document.getElementById('mqttCaFile'),
  mqttCaDownloadBtn: document.getElementById('mqttCaDownloadBtn'),
  mqttCaUploadBtn: document.getElementById('mqttCaUploadBtn'),
  mqttCaCurrentStatus: document.getElementById('mqttCaCurrentStatus'),
  mqttCaStatus: document.getElementById('mqttCaStatus'),

  // Data Logger (opcbridge-reporter)
  loggerTreeView: document.getElementById('loggerTreeView'),
  loggerTreeNote: document.getElementById('loggerTreeNote'),
  loggerDbTbody: document.getElementById('loggerDbTbody'),
  loggerDbTable: document.getElementById('loggerDbTable'),
  loggerReportsTable: document.getElementById('loggerReportsTable'),
  loggerReportsTbody: document.getElementById('loggerReportsTbody'),
  loggerRefreshBtn: document.getElementById('loggerRefreshBtn'),
  loggerStatus: document.getElementById('loggerStatus'),
  loggerJson: document.getElementById('loggerJson'),

  loggerDbModal: document.getElementById('loggerDbModal'),
  loggerDbCloseBtn: document.getElementById('loggerDbCloseBtn'),
  loggerDbHint: document.getElementById('loggerDbHint'),
  loggerDbModalId: document.getElementById('loggerDbModalId'),
  loggerDbModalName: document.getElementById('loggerDbModalName'),
  loggerDbModalType: document.getElementById('loggerDbModalType'),
  loggerDbModalOpcbridgeBaseUrl: document.getElementById('loggerDbModalOpcbridgeBaseUrl'),
  loggerDbModalMysqlHost: document.getElementById('loggerDbModalMysqlHost'),
  loggerDbModalMysqlPort: document.getElementById('loggerDbModalMysqlPort'),
  loggerDbModalMysqlUser: document.getElementById('loggerDbModalMysqlUser'),
  loggerDbModalMysqlPassword: document.getElementById('loggerDbModalMysqlPassword'),
  loggerDbModalMysqlPasswordHint: document.getElementById('loggerDbModalMysqlPasswordHint'),
  loggerDbModalMysqlDatabase: document.getElementById('loggerDbModalMysqlDatabase'),
  loggerDbMysqlFields: document.getElementById('loggerDbMysqlFields'),
  loggerDbOdbcFields: document.getElementById('loggerDbOdbcFields'),
  loggerDbModalOdbcDriver: document.getElementById('loggerDbModalOdbcDriver'),
  loggerDbModalOdbcHost: document.getElementById('loggerDbModalOdbcHost'),
  loggerDbModalOdbcPort: document.getElementById('loggerDbModalOdbcPort'),
  loggerDbModalOdbcDatabase: document.getElementById('loggerDbModalOdbcDatabase'),
  loggerDbModalOdbcUser: document.getElementById('loggerDbModalOdbcUser'),
  loggerDbModalOdbcPassword: document.getElementById('loggerDbModalOdbcPassword'),
  loggerDbModalOdbcPasswordHint: document.getElementById('loggerDbModalOdbcPasswordHint'),
  loggerDbModalOdbcEncrypt: document.getElementById('loggerDbModalOdbcEncrypt'),
  loggerDbModalOdbcTrustCert: document.getElementById('loggerDbModalOdbcTrustCert'),
  loggerDbCancelBtn: document.getElementById('loggerDbCancelBtn'),
  loggerDbSaveBtn: document.getElementById('loggerDbSaveBtn'),
  loggerDbModalStatus: document.getElementById('loggerDbModalStatus'),

  loggerReportModal: document.getElementById('loggerReportModal'),
  loggerReportCloseBtn: document.getElementById('loggerReportCloseBtn'),
  loggerReportCancelBtn: document.getElementById('loggerReportCancelBtn'),
  loggerReportSaveBtn: document.getElementById('loggerReportSaveBtn'),
  loggerReportId: document.getElementById('loggerReportId'),
  loggerReportName: document.getElementById('loggerReportName'),
  loggerReportDatabase: document.getElementById('loggerReportDatabase'),
  loggerReportTable: document.getElementById('loggerReportTable'),
  loggerReportMode: document.getElementById('loggerReportMode'),
  loggerReportEnabled: document.getElementById('loggerReportEnabled'),
  loggerReportPersistent: document.getElementById('loggerReportPersistent'),
  loggerReportScheduleKind: document.getElementById('loggerReportScheduleKind'),
  loggerReportEveryMinutes: document.getElementById('loggerReportEveryMinutes'),
  loggerReportHourlyMinute: document.getElementById('loggerReportHourlyMinute'),
  loggerReportHourlySecond: document.getElementById('loggerReportHourlySecond'),
  loggerReportDailyHour: document.getElementById('loggerReportDailyHour'),
  loggerReportDailyMinute: document.getElementById('loggerReportDailyMinute'),
  loggerReportDailySecond: document.getElementById('loggerReportDailySecond'),
  loggerReportOnCalendar: document.getElementById('loggerReportOnCalendar'),
  loggerScheduleEveryMinutesWrap: document.getElementById('loggerScheduleEveryMinutesWrap'),
  loggerScheduleHourlyWrap: document.getElementById('loggerScheduleHourlyWrap'),
  loggerScheduleDailyWrap: document.getElementById('loggerScheduleDailyWrap'),
  loggerScheduleAdvancedWrap: document.getElementById('loggerScheduleAdvancedWrap'),
  loggerReportSchedulePreview: document.getElementById('loggerReportSchedulePreview'),
  loggerReportTags: document.getElementById('loggerReportTags'),
  loggerReportSelectTagsBtn: document.getElementById('loggerReportSelectTagsBtn'),
  loggerReportStatus: document.getElementById('loggerReportStatus'),

  loggerTagPickerModal: document.getElementById('loggerTagPickerModal'),
  loggerTagPickerCloseBtn: document.getElementById('loggerTagPickerCloseBtn'),
  loggerTagPickerSearch: document.getElementById('loggerTagPickerSearch'),
  loggerTagPickerSelectAllBtn: document.getElementById('loggerTagPickerSelectAllBtn'),
  loggerTagPickerClearBtn: document.getElementById('loggerTagPickerClearBtn'),
  loggerTagPickerApplyBtn: document.getElementById('loggerTagPickerApplyBtn'),
  loggerTagPickerStatus: document.getElementById('loggerTagPickerStatus'),
  loggerTagPickerTbody: document.getElementById('loggerTagPickerTbody'),

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

  // Logs
  logsSource: document.getElementById('logsSource'),
  logsUnit: document.getElementById('logsUnit'),
  logsLines: document.getElementById('logsLines'),
  logsRefreshBtn: document.getElementById('logsRefreshBtn'),
  logsStatus: document.getElementById('logsStatus'),
  logsOutput: document.getElementById('logsOutput'),

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
  newTagMqttAllowed: document.getElementById('newTagMqttAllowed'),
  newTagScaling: document.getElementById('newTagScaling'),
  newTagScalingLinearRow: document.getElementById('newTagScalingLinearRow'),
  newTagRawLow: document.getElementById('newTagRawLow'),
  newTagRawHigh: document.getElementById('newTagRawHigh'),
  newTagScaledLow: document.getElementById('newTagScaledLow'),
  newTagScaledHigh: document.getElementById('newTagScaledHigh'),
  newTagScaledDatatype: document.getElementById('newTagScaledDatatype'),
  newTagClampLow: document.getElementById('newTagClampLow'),
  newTagClampHigh: document.getElementById('newTagClampHigh'),
  newTagCancelBtn: document.getElementById('newTagCancelBtn'),
  newTagCreateBtn: document.getElementById('newTagCreateBtn'),
  newTagStatus: document.getElementById('newTagStatus'),
  workspaceItemDeviceEdit: document.getElementById('workspaceItemDeviceEdit'),
  workspaceItemTagEdit: document.getElementById('workspaceItemTagEdit'),
  workspaceItemAlarmEdit: document.getElementById('workspaceItemAlarmEdit'),
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
  editTagMqttAllowed: document.getElementById('editTagMqttAllowed'),
  editTagScaling: document.getElementById('editTagScaling'),
  editTagScalingLinearRow: document.getElementById('editTagScalingLinearRow'),
  editTagRawLow: document.getElementById('editTagRawLow'),
  editTagRawHigh: document.getElementById('editTagRawHigh'),
  editTagScaledLow: document.getElementById('editTagScaledLow'),
  editTagScaledHigh: document.getElementById('editTagScaledHigh'),
  editTagScaledDatatype: document.getElementById('editTagScaledDatatype'),
  editTagClampLow: document.getElementById('editTagClampLow'),
  editTagClampHigh: document.getElementById('editTagClampHigh'),
  editTagCancelBtn: document.getElementById('editTagCancelBtn'),
  editTagSaveBtn: document.getElementById('editTagSaveBtn'),
  editTagStatus: document.getElementById('editTagStatus'),

  editAlarmId: document.getElementById('editAlarmId'),
  editAlarmName: document.getElementById('editAlarmName'),
  editAlarmGroup: document.getElementById('editAlarmGroup'),
  editAlarmSite: document.getElementById('editAlarmSite'),
  editAlarmConn: document.getElementById('editAlarmConn'),
  editAlarmTag: document.getElementById('editAlarmTag'),
  editAlarmType: document.getElementById('editAlarmType'),
  editAlarmEnabled: document.getElementById('editAlarmEnabled'),
  editAlarmSeverity: document.getElementById('editAlarmSeverity'),
  editAlarmThreshold: document.getElementById('editAlarmThreshold'),
  editAlarmHysteresis: document.getElementById('editAlarmHysteresis'),
  editAlarmMsgOn: document.getElementById('editAlarmMsgOn'),
  editAlarmMsgOff: document.getElementById('editAlarmMsgOff'),
  editAlarmCancelBtn: document.getElementById('editAlarmCancelBtn'),
  editAlarmSaveBtn: document.getElementById('editAlarmSaveBtn'),
  editAlarmStatus: document.getElementById('editAlarmStatus'),

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
  ,
  // Auth (opcbridge cookie-based login)
  loginModal: document.getElementById('loginModal'),
  loginCloseBtn: document.getElementById('loginCloseBtn'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  loginCancelBtn: document.getElementById('loginCancelBtn'),
  loginOkBtn: document.getElementById('loginOkBtn'),
  loginStatus: document.getElementById('loginStatus'),

  // Users (opcbridge auth)
  usersStatusLine: document.getElementById('usersStatusLine'),
  usersInitWrap: document.getElementById('usersInitWrap'),
  usersInitUsername: document.getElementById('usersInitUsername'),
  usersInitPassword: document.getElementById('usersInitPassword'),
  usersInitConfirm: document.getElementById('usersInitConfirm'),
  usersInitTimeout: document.getElementById('usersInitTimeout'),
  usersInitBtn: document.getElementById('usersInitBtn'),
  usersInitStatus: document.getElementById('usersInitStatus'),

  usersManageWrap: document.getElementById('usersManageWrap'),
  usersRefreshBtn: document.getElementById('usersRefreshBtn'),
  usersTimeoutMinutes: document.getElementById('usersTimeoutMinutes'),
  usersTimeoutSaveBtn: document.getElementById('usersTimeoutSaveBtn'),
  usersTimeoutStatus: document.getElementById('usersTimeoutStatus'),

  usersTreeView: document.getElementById('usersTreeView'),
  usersTreeNote: document.getElementById('usersTreeNote'),

  usersDetailsStatus: document.getElementById('usersDetailsStatus'),
  usersDetailsTablePanel: document.getElementById('usersDetailsTablePanel'),
  usersDetailsTable: document.getElementById('usersDetailsTable'),
  usersDetailsThead: document.getElementById('usersDetailsThead'),
  usersDetailsTbody: document.getElementById('usersDetailsTbody'),

  usersDetailsFormPanel: document.getElementById('usersDetailsFormPanel'),
  usersFormIdLabel: document.getElementById('usersFormIdLabel'),
  usersFormId: document.getElementById('usersFormId'),
  usersFormLabel: document.getElementById('usersFormLabel'),
  usersFormDescription: document.getElementById('usersFormDescription'),
  usersFormPermsRow: document.getElementById('usersFormPermsRow'),
  usersFormPerms: document.getElementById('usersFormPerms'),
  usersFormRoleRow: document.getElementById('usersFormRoleRow'),
  usersFormRole: document.getElementById('usersFormRole'),
  usersFormPasswordRow: document.getElementById('usersFormPasswordRow'),
  usersFormPassword: document.getElementById('usersFormPassword'),
  usersFormConfirmRow: document.getElementById('usersFormConfirmRow'),
  usersFormConfirm: document.getElementById('usersFormConfirm'),
  usersFormCancelBtn: document.getElementById('usersFormCancelBtn'),
  usersFormSaveBtn: document.getElementById('usersFormSaveBtn'),
  usersFormStatus: document.getElementById('usersFormStatus')
};

const state = {
  cfg: null,
  auth: null,
  userAuthTimer: null,

  refreshTimer: null,

  liveTagsLast: null,
  liveTagFilter: { type: 'all', label: 'All' },

  // alarms/events (from opcbridge-alarms)
  alarmsAllLast: null,
  alarmsAll: [],
  alarmHistoryLast: null,
  // alarms config (from opcbridge alarms.json via /config/alarms)
  alarmsConfigLast: null,
  alarmsConfig: null,
  alarmsConfigMtimeMs: 0,
  alarmsConfigDirty: false,

  // users/roles ui (opcbridge auth store)
  usersRoles: [],
  usersUsers: [],
  usersTreeExpanded: new Set(),
  usersSelectedNodeId: '',
  usersFormMode: '', // role_new|role_edit|user_new|user_edit
  usersFormTargetId: '', // role id or username

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
  workspaceDeletePaths: new Set(), // connection config paths to delete on Save/Save+Reload

  // tree
  expanded: new Set(['project:opcbridge', 'folder:connectivity', 'folder:alarms_events']),
  selectedNodeId: '',
  workspaceTreeRoot: null,
  pendingNewDevice: null,
  pendingNewTag: null,
  pendingWorkspaceItem: null,
  draggedDeviceConnectionId: '',

  // workspace right-pane table (selection + sorting)
  workspaceChildrenSelRoot: '',
  workspaceChildrenSel: new Set(), // keys like "connection_id::tag_name"
  workspaceChildrenLastIndex: -1,
  workspaceChildrenSort: { key: 'name', dir: 'asc' },

  // auth status cache (opcbridge cookie-based)
  opcbridgeAuthStatus: null,

  // reporter (data logger)
  reporterDatabases: [],
  reporterReports: [],
  reporterCapabilities: null,
  loggerSelectedNodeId: 'logger:databases',
  loggerEditingId: '',
  loggerEditingMode: '', // '' | 'new' | 'edit'
  loggerReportEditingId: '',
  loggerReportEditingMode: '', // '' | 'new' | 'edit'

  loggerTagPickerAll: [],
  loggerTagPickerSelected: new Set(),
  loggerTagPickerFilter: '',
};

const DRIVER_LABELS = {
  ab_eip: 'Allen-Bradley Ethernet/IP'
};

const ROLE_PERMISSION_DEFS = [
  { id: 'hmi.edit_screens', label: 'Edit screens (HMI editor)' },
  { id: 'opcbridge.write_tags', label: 'Write tags (runtime)' },
  { id: 'opcbridge.edit_config', label: 'Edit connections/tags (config)' },
  { id: 'suite.manage_server', label: 'Manage server (ports, endpoints, tokens)' },
  { id: 'auth.manage_users', label: 'Manage users/roles' },
  { id: 'suite.view_logs', label: 'View logs' }
];

function getUserPermissions() {
  const perms = state.opcbridgeAuthStatus?.user?.permissions;
  return Array.isArray(perms) ? perms.map((p) => String(p || '').trim()).filter(Boolean) : [];
}

function hasPerm(permId) {
  const want = String(permId || '').trim();
  if (!want) return false;
  return getUserPermissions().includes(want);
}

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}



function setFatalStatus(err) {
  const msg = (err && err.message) ? err.message : String(err || '');
  if (els.statusLine) els.statusLine.textContent = `UI error: ${msg}`;
}

function canAccessUsersTab() {
  return hasPerm('auth.manage_users');
}

function canAccessConfigureTab() {
  return hasPerm('suite.manage_server');
}

function canAccessLogsTab() {
  return hasPerm('suite.view_logs');
}

function canAccessWorkspaceTab() {
  return hasPerm('opcbridge.edit_config');
}

function canAccessLoggerTab() {
  return hasPerm('suite.manage_server');
}

function canEditConfig() {
  return hasPerm('opcbridge.edit_config');
}

function updateUsersTabVisibility() {
  const usersBtn = document.querySelector('.tabs .tab[data-tab="users"]');
  if (!usersBtn) return;
  const canSee = canAccessUsersTab();
  usersBtn.style.display = canSee ? '' : 'none';

  if (!canSee) {
    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel && activePanel.id === 'tab-users') {
      setTab('overview');
    }
  }
}

function updateConfigureTabVisibility() {
  const cfgBtn = document.querySelector('.tabs .tab[data-tab="configure"]');
  if (!cfgBtn) return;
  const canSee = canAccessConfigureTab();
  cfgBtn.style.display = canSee ? '' : 'none';

  if (!canSee) {
    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel && activePanel.id === 'tab-configure') {
      setTab('overview');
    }
  }
}

function updateWorkspaceTabVisibility() {
  const wsBtn = document.querySelector('.tabs .tab[data-tab="workspace"]');
  if (!wsBtn) return;
  const canSee = canAccessWorkspaceTab();
  wsBtn.style.display = canSee ? '' : 'none';

  if (!canSee) {
    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel && activePanel.id === 'tab-workspace') {
      setTab('overview');
    }
  }
}

function updateLogsTabVisibility() {
  const logsBtn = document.querySelector('.tabs .tab[data-tab="logs"]');
  if (!logsBtn) return;
  const canSee = canAccessLogsTab();
  logsBtn.style.display = canSee ? '' : 'none';

  if (!canSee) {
    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel && activePanel.id === 'tab-logs') {
      setTab('overview');
    }
  }
}

function updateLoggerTabVisibility() {
  const loggerBtn = document.querySelector('.tabs .tab[data-tab="logger"]');
  if (!loggerBtn) return;
  const canSee = canAccessLoggerTab();
  loggerBtn.style.display = canSee ? '' : 'none';

  if (!canSee) {
    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel && activePanel.id === 'tab-logger') {
      setTab('overview');
    }
  }
}

function loggerSetStatus(msg) {
  if (els.loggerStatus) els.loggerStatus.textContent = String(msg || '');
}

function loggerModalSetStatus(msg) {
  if (els.loggerDbModalStatus) els.loggerDbModalStatus.textContent = String(msg || '');
}

function buildLoggerTreeRoots() {
  const dbs = Array.isArray(state.reporterDatabases) ? state.reporterDatabases : [];
  const reports = Array.isArray(state.reporterReports) ? state.reporterReports : [];

  const dbRoot = {
    id: 'logger:databases',
    type: 'logger_root_db',
    label: 'Databases',
    children: dbs
      .slice()
      .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { sensitivity: 'base' }))
      .map((d) => ({
        id: `logger:db:${String(d?.id || '').trim()}`,
        type: 'logger_db',
        label: String(d?.name || d?.id || '').trim() || '(unnamed)',
        meta: { id: String(d?.id || '').trim() }
      }))
  };

  const reportsRoot = {
    id: 'logger:reports',
    type: 'logger_root_reports',
    label: 'Reports',
    children: reports
      .slice()
      .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { sensitivity: 'base' }))
      .map((r) => ({
        id: `logger:report:${String(r?.id || '').trim()}`,
        type: 'logger_report',
        label: String(r?.name || r?.id || '').trim() || '(unnamed)',
        meta: { id: String(r?.id || '').trim() }
      }))
  };

  return [dbRoot, reportsRoot];
}

function renderLoggerTreeNode(node, container) {
  const canExpand = node.type === 'logger_root_db' || node.type === 'logger_root_reports';
  const expanded = Boolean(state._loggerExpanded) ? state._loggerExpanded.has(node.id) : true;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tree-item';
  btn.classList.toggle('is-active', state.loggerSelectedNodeId === node.id);

  const twisty = document.createElement('span');
  twisty.className = 'twisty';
  twisty.classList.toggle('is-empty', !canExpand);
  twisty.textContent = canExpand ? (expanded ? '−' : '+') : '';
  if (canExpand) {
    twisty.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state._loggerExpanded) state._loggerExpanded = new Set();
      if (state._loggerExpanded.has(node.id)) state._loggerExpanded.delete(node.id);
      else state._loggerExpanded.add(node.id);
      renderLoggerTree();
    });
  }

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = node.label;

  const meta = document.createElement('span');
  meta.className = 'meta';
  if (node.type === 'logger_root_db') meta.textContent = `${(node.children || []).length} db(s)`;
  if (node.type === 'logger_root_reports') meta.textContent = `${(node.children || []).length} report(s)`;

  btn.appendChild(twisty);
  btn.appendChild(label);
  btn.appendChild(meta);

  btn.addEventListener('click', () => {
    state.loggerSelectedNodeId = node.id;
    renderLoggerTree();
    renderLoggerDetails();
  });

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();

    state.loggerSelectedNodeId = node.id;
    renderLoggerTree();
    renderLoggerDetails();

    const items = [];
    if (node.type === 'logger_root_db') {
      items.push({ label: 'Add Database…', onClick: () => startNewDatabase() });
      items.push({ label: 'Refresh', onClick: () => refreshReporterAll().catch(() => {}) });
    }
    if (node.type === 'logger_root_reports') {
      items.push({ label: 'Add Report…', onClick: () => startNewReport() });
      items.push({ label: 'Refresh', onClick: () => refreshReporterAll().catch(() => {}) });
    }
	    if (node.type === 'logger_db') {
	      const id = String(node.meta?.id || '').trim();
	      items.push({ label: 'Properties…', onClick: () => openLoggerDbModal({ mode: 'edit', id }) });
	      items.push({ label: 'Delete Database…', onClick: () => deleteReporterDatabase(id) });
	      items.push({ label: 'Refresh', onClick: () => refreshReporterAll().catch(() => {}) });
	    }
    if (node.type === 'logger_report') {
      const id = String(node.meta?.id || '').trim();
      items.push({ label: 'Properties…', onClick: () => openLoggerReportModal({ mode: 'edit', id }) });
      items.push({ label: 'Delete Report…', onClick: () => deleteReporterReport(id) });
      items.push({ label: 'Refresh', onClick: () => refreshReporterAll().catch(() => {}) });
    }
    if (items.length) showContextMenu(e.clientX, e.clientY, items);
  });

  container.appendChild(btn);

  if (canExpand && expanded) {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length) {
      const div = document.createElement('div');
      div.className = 'tree-children';
      children.forEach((c) => renderLoggerTreeNode(c, div));
      container.appendChild(div);
    }
  }
}

function renderLoggerTree() {
  if (!els.loggerTreeView) return;
  els.loggerTreeView.textContent = '';
  const roots = buildLoggerTreeRoots();
  if (!state._loggerExpanded) state._loggerExpanded = new Set(['logger:databases', 'logger:reports']);
  roots.forEach((r) => renderLoggerTreeNode(r, els.loggerTreeView));
  if (els.loggerTreeNote) {
    const dbCount = Array.isArray(roots[0]?.children) ? roots[0].children.length : 0;
    const reportCount = Array.isArray(roots[1]?.children) ? roots[1].children.length : 0;
    els.loggerTreeNote.textContent = `Databases: ${dbCount} · Reports: ${reportCount}`;
  }
  if (!state.loggerSelectedNodeId) state.loggerSelectedNodeId = 'logger:databases';
}

function getSelectedDatabaseId() {
  const sid = String(state.loggerSelectedNodeId || '').trim();
  if (sid.startsWith('logger:db:')) return sid.slice('logger:db:'.length);
  return '';
}

function getSelectedReportId() {
  const sid = String(state.loggerSelectedNodeId || '').trim();
  if (sid.startsWith('logger:report:')) return sid.slice('logger:report:'.length);
  return '';
}

function findDatabaseById(id) {
  const dbs = Array.isArray(state.reporterDatabases) ? state.reporterDatabases : [];
  return dbs.find((d) => String(d?.id || '').trim() === String(id || '').trim()) || null;
}

function findReportById(id) {
  const reports = Array.isArray(state.reporterReports) ? state.reporterReports : [];
  return reports.find((r) => String(r?.id || '').trim() === String(id || '').trim()) || null;
}

function setLoggerModalPasswordHint(passwordSet) {
  if (!els.loggerDbModalMysqlPasswordHint) return;
  els.loggerDbModalMysqlPasswordHint.textContent = passwordSet
    ? 'Password is set on the server (leave blank to keep unchanged).'
    : 'No password is set yet.';
}

function setLoggerModalOdbcPasswordHint(passwordSet) {
  if (!els.loggerDbModalOdbcPasswordHint) return;
  els.loggerDbModalOdbcPasswordHint.textContent = passwordSet
    ? 'Password is set on the server (leave blank to keep unchanged).'
    : 'No password is set yet.';
}

function canUseOdbcInUi() {
  const avail = state.reporterCapabilities?.odbc?.available;
  return Boolean(avail);
}

function renderLoggerDbModalTypeUi() {
  if (!els.loggerDbModalType) return;
  const canOdbc = canUseOdbcInUi();
  const opt = Array.from(els.loggerDbModalType.options || []).find((o) => String(o.value) === 'odbc');
  if (opt) opt.disabled = !canOdbc;
  if (!canOdbc && String(els.loggerDbModalType.value) === 'odbc') {
    els.loggerDbModalType.value = 'mysql';
  }
}

function renderLoggerDbModalFieldsForType(type) {
  const t = String(type || 'mysql').trim() || 'mysql';
  if (els.loggerDbMysqlFields) els.loggerDbMysqlFields.style.display = (t === 'mysql') ? '' : 'none';
  if (els.loggerDbOdbcFields) els.loggerDbOdbcFields.style.display = (t === 'odbc') ? '' : 'none';
}

function renderLoggerTable() {
  if (!els.loggerDbTbody) return;
  const dbs = Array.isArray(state.reporterDatabases) ? state.reporterDatabases : [];
  const selectedId = getSelectedDatabaseId();
  els.loggerDbTbody.textContent = '';

  if (!dbs.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.className = 'small';
    td.textContent = 'No databases configured. Right-click “Databases” to add one.';
    tr.appendChild(td);
    els.loggerDbTbody.appendChild(tr);
    return;
  }

  const mk = (text, mono) => {
    const td = document.createElement('td');
    if (mono) td.className = 'mono';
    td.textContent = String(text ?? '');
    return td;
  };

  dbs.forEach((d) => {
    const id = String(d?.id || '').trim();
    const tr = document.createElement('tr');
    tr.classList.toggle('is-selected', id && id === selectedId);
    tr.appendChild(mk(id, true));
    tr.appendChild(mk(String(d?.name || ''), false));
    tr.appendChild(mk(String(d?.type || 'mysql'), true));
    tr.appendChild(mk(String(d?.mysql_host || ''), true));
    tr.appendChild(mk(String(d?.mysql_port ?? ''), true));
    tr.appendChild(mk(String(d?.mysql_user || ''), true));
    tr.appendChild(mk(String(d?.mysql_database || ''), true));
    tr.appendChild(mk(String(d?.opcbridge_base_url || ''), true));
    tr.appendChild(mk((d?.password_set || d?.mysql_password_set) ? 'set' : '', false));

    tr.addEventListener('click', () => {
      if (!id) return;
      state.loggerSelectedNodeId = `logger:db:${id}`;
      renderLoggerTree();
      renderLoggerTable();
    });
    tr.addEventListener('dblclick', () => {
      if (!id) return;
      openLoggerDbModal({ mode: 'edit', id });
    });

    els.loggerDbTbody.appendChild(tr);
  });
}

function reporterDatabaseLabel(databaseId) {
  const id = String(databaseId || '').trim();
  if (!id) return '';
  const db = findDatabaseById(id);
  if (!db) return id;
  const name = String(db?.name || '').trim();
  return name ? `${name} (${id})` : id;
}

function renderLoggerReportsTable() {
  if (!els.loggerReportsTbody) return;
  const reports = Array.isArray(state.reporterReports) ? state.reporterReports : [];
  const selectedId = getSelectedReportId();
  els.loggerReportsTbody.textContent = '';

  if (!reports.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'small';
    td.textContent = 'No reports configured. Right-click “Reports” to add one.';
    tr.appendChild(td);
    els.loggerReportsTbody.appendChild(tr);
    return;
  }

  const mk = (text, mono = false) => {
    const td = document.createElement('td');
    if (mono) td.classList.add('mono');
    td.textContent = String(text ?? '');
    return td;
  };

  reports.forEach((r) => {
    const id = String(r?.id || '').trim();
    const tr = document.createElement('tr');
    tr.classList.toggle('is-selected', id && id === selectedId);

    const mode = String(r?.mode || 'scheduled').trim() || 'scheduled';
    const enabled = Boolean(r?.enabled);
    const cal = String(r?.schedule?.on_calendar || '').trim();

    tr.appendChild(mk(id, true));
    tr.appendChild(mk(String(r?.name || ''), false));
    tr.appendChild(mk(reporterDatabaseLabel(r?.database_id), false));
    tr.appendChild(mk(mode, true));
    tr.appendChild(mk(cal, true));
    tr.appendChild(mk(enabled ? 'yes' : 'no', false));

    tr.addEventListener('click', () => {
      if (!id) return;
      state.loggerSelectedNodeId = `logger:report:${id}`;
      renderLoggerTree();
      renderLoggerReportsTable();
    });
    tr.addEventListener('dblclick', () => {
      if (!id) return;
      openLoggerReportModal({ mode: 'edit', id });
    });

    els.loggerReportsTbody.appendChild(tr);
  });
}

function renderLoggerDetails() {
  const sid = String(state.loggerSelectedNodeId || '').trim();
  const showReports = sid === 'logger:reports' || sid.startsWith('logger:report:');

  if (els.loggerDbTable) els.loggerDbTable.style.display = showReports ? 'none' : '';
  if (els.loggerReportsTable) els.loggerReportsTable.style.display = showReports ? '' : 'none';

  if (showReports) renderLoggerReportsTable();
  else renderLoggerTable();
}

function openLoggerDbModal(opts = {}) {
  const mode = String(opts.mode || 'edit');
  const id = String(opts.id || '').trim();
  const isNew = mode === 'new';
  const db = (!isNew && id) ? findDatabaseById(id) : null;

  state.loggerEditingMode = isNew ? 'new' : 'edit';
  state.loggerEditingId = isNew ? '' : id;

  if (els.loggerDbModal) els.loggerDbModal.style.display = 'block';
  loggerModalSetStatus('');

  renderLoggerDbModalTypeUi();

  if (els.loggerDbModalId) {
    els.loggerDbModalId.disabled = !isNew;
    els.loggerDbModalId.value = isNew ? '' : String(db?.id || id);
  }
  if (els.loggerDbModalName) els.loggerDbModalName.value = String(db?.name || '');
  if (els.loggerDbModalType) els.loggerDbModalType.value = String(db?.type || 'mysql');
  if (els.loggerDbModalOpcbridgeBaseUrl) els.loggerDbModalOpcbridgeBaseUrl.value = String(db?.opcbridge_base_url || '');
  const t = String(db?.type || 'mysql').trim() || 'mysql';
  renderLoggerDbModalFieldsForType(t);

  if (els.loggerDbModalMysqlHost) els.loggerDbModalMysqlHost.value = String(db?.mysql_host || '');
  if (els.loggerDbModalMysqlPort) els.loggerDbModalMysqlPort.value = String(db?.mysql_port ?? '');
  if (els.loggerDbModalMysqlUser) els.loggerDbModalMysqlUser.value = String(db?.mysql_user || '');
  if (els.loggerDbModalMysqlDatabase) els.loggerDbModalMysqlDatabase.value = String(db?.mysql_database || '');
  if (els.loggerDbModalMysqlPassword) els.loggerDbModalMysqlPassword.value = '';
  setLoggerModalPasswordHint(Boolean(db?.password_set || db?.mysql_password_set));

  if (els.loggerDbModalOdbcDriver) els.loggerDbModalOdbcDriver.value = String(db?.odbc_driver || '');
  if (els.loggerDbModalOdbcHost) els.loggerDbModalOdbcHost.value = String(db?.odbc_host || '');
  if (els.loggerDbModalOdbcPort) els.loggerDbModalOdbcPort.value = String(db?.odbc_port ?? '');
  if (els.loggerDbModalOdbcDatabase) els.loggerDbModalOdbcDatabase.value = String(db?.odbc_database || '');
  if (els.loggerDbModalOdbcUser) els.loggerDbModalOdbcUser.value = String(db?.odbc_user || '');
  if (els.loggerDbModalOdbcPassword) els.loggerDbModalOdbcPassword.value = '';
  setLoggerModalOdbcPasswordHint(Boolean(db?.password_set));
  if (els.loggerDbModalOdbcEncrypt) els.loggerDbModalOdbcEncrypt.checked = (db?.odbc_encrypt !== false);
  if (els.loggerDbModalOdbcTrustCert) els.loggerDbModalOdbcTrustCert.checked = Boolean(db?.odbc_trust_cert);

  if (els.loggerDbHint) {
    els.loggerDbHint.textContent = isNew ? 'New database connection.' : `Edit database '${id}'.`;
  }
}

function closeLoggerDbModal() {
  if (els.loggerDbModal) els.loggerDbModal.style.display = 'none';
  state.loggerEditingMode = '';
  state.loggerEditingId = '';
  loggerModalSetStatus('');
}

function startNewDatabase() {
  openLoggerDbModal({ mode: 'new' });
}

async function deleteReporterDatabase(id) {
  const dbId = String(id || '').trim();
  if (!dbId) return;
  if (!window.confirm(`Delete database '${dbId}'?`)) return;
  loggerSetStatus('Deleting…');
  try {
    const resp = await apiPostJson('/api/reporter/databases/delete', { id: dbId });
    if (!resp?.ok) throw new Error(String(resp?.error || 'Failed'));
    await refreshReporterAll();
    state.loggerSelectedNodeId = 'logger:databases';
    state.loggerEditingMode = '';
    state.loggerEditingId = '';
    renderLoggerTree();
    renderLoggerDetails();
    loggerSetStatus('Deleted.');
  } catch (err) {
    loggerSetStatus(`Failed: ${err.message || err}`);
  }
}

function getDatabaseFromModalUi() {
  const id = String(els.loggerDbModalId?.value || '').trim();
  const type = String(els.loggerDbModalType?.value || 'mysql').trim() || 'mysql';
  const base = {
    id,
    name: String(els.loggerDbModalName?.value || '').trim(),
    type,
    opcbridge_base_url: String(els.loggerDbModalOpcbridgeBaseUrl?.value || '').trim(),
  };

  if (type === 'odbc') {
    const db = {
      ...base,
      odbc_driver: String(els.loggerDbModalOdbcDriver?.value || '').trim(),
      odbc_host: String(els.loggerDbModalOdbcHost?.value || '').trim(),
      odbc_port: Math.trunc(Number(els.loggerDbModalOdbcPort?.value ?? 0) || 0),
      odbc_database: String(els.loggerDbModalOdbcDatabase?.value || '').trim(),
      odbc_user: String(els.loggerDbModalOdbcUser?.value || '').trim(),
      odbc_encrypt: Boolean(els.loggerDbModalOdbcEncrypt?.checked),
      odbc_trust_cert: Boolean(els.loggerDbModalOdbcTrustCert?.checked),
    };
    const password = String(els.loggerDbModalOdbcPassword?.value || '').trim();
    if (password) db.odbc_password = password;
    return db;
  }

  const db = {
    ...base,
    mysql_host: String(els.loggerDbModalMysqlHost?.value || '').trim(),
    mysql_port: Math.trunc(Number(els.loggerDbModalMysqlPort?.value ?? 0) || 0),
    mysql_user: String(els.loggerDbModalMysqlUser?.value || '').trim(),
    mysql_database: String(els.loggerDbModalMysqlDatabase?.value || '').trim()
  };
  const password = String(els.loggerDbModalMysqlPassword?.value || '').trim();
  if (password) db.mysql_password = password;
  return db;
}

async function saveReporterDatabase() {
  loggerModalSetStatus('Saving…');
  try {
    const db = getDatabaseFromModalUi();
    if (!db.id) throw new Error('ID is required.');
    if (!db.opcbridge_base_url) throw new Error('opcbridge Base URL is required.');
    if (db.type === 'odbc') {
      if (!canUseOdbcInUi()) throw new Error('ODBC support is not installed on this server.');
      if (!db.odbc_driver) throw new Error('ODBC Driver is required.');
      if (!db.odbc_host) throw new Error('SQL Server Host is required.');
      if (!db.odbc_port || db.odbc_port < 1 || db.odbc_port > 65535) throw new Error('SQL Server Port is required.');
      if (!db.odbc_database) throw new Error('Database is required.');
      if (!db.odbc_user) throw new Error('User is required.');
    } else {
      if (!db.mysql_host) throw new Error('MySQL Host is required.');
      if (!db.mysql_port || db.mysql_port < 1 || db.mysql_port > 65535) throw new Error('MySQL Port is required.');
      if (!db.mysql_user) throw new Error('MySQL User is required.');
      if (!db.mysql_database) throw new Error('MySQL Database is required.');
    }

    const resp = await apiPostJson('/api/reporter/databases', { database: db });
    if (!resp?.ok) throw new Error(String(resp?.error || 'Failed'));

    state.loggerEditingMode = '';
    state.loggerEditingId = '';
    await refreshReporterAll();
    state.loggerSelectedNodeId = `logger:db:${db.id}`;
    renderLoggerTree();
    renderLoggerDetails();
    closeLoggerDbModal();
    loggerSetStatus('Saved.');
  } catch (err) {
    loggerModalSetStatus(`Failed: ${err.message || err}`);
  }
}

function loggerReportModalSetStatus(msg) {
  if (els.loggerReportStatus) els.loggerReportStatus.textContent = String(msg || '');
}

function clampInt(n, min, max, fallback) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return fallback;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function buildOnCalendarForScheduleKind(kind) {
  const k = String(kind || '').trim();
  if (k === 'hourly') {
    const mm = clampInt(els.loggerReportHourlyMinute?.value ?? 0, 0, 59, 0);
    const ss = clampInt(els.loggerReportHourlySecond?.value ?? 0, 0, 59, 0);
    return `*-*-* *:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  if (k === 'daily') {
    const hh = clampInt(els.loggerReportDailyHour?.value ?? 23, 0, 23, 23);
    const mm = clampInt(els.loggerReportDailyMinute?.value ?? 55, 0, 59, 55);
    const ss = clampInt(els.loggerReportDailySecond?.value ?? 0, 0, 59, 0);
    return `*-*-* ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  if (k === 'custom') {
    return String(els.loggerReportOnCalendar?.value || '').trim();
  }
  // every_n_minutes (default)
  const n = clampInt(els.loggerReportEveryMinutes?.value ?? 5, 1, 1440, 5);
  return `*-*-* *:0/${n}:00`;
}

function guessScheduleKindFromOnCalendar(value) {
  const s = String(value || '').trim();
  let m = null;
  m = s.match(/^\*-\*-\* \*:0\/(\d+):00$/);
  if (m) return { kind: 'every_n_minutes', everyMinutes: clampInt(m[1], 1, 1440, 5) };
  m = s.match(/^\*-\*-\* \*:(\d{1,2}):(\d{1,2})$/);
  if (m) return { kind: 'hourly', hourlyMinute: clampInt(m[1], 0, 59, 0), hourlySecond: clampInt(m[2], 0, 59, 0) };
  m = s.match(/^\*-\*-\* (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (m) return { kind: 'daily', dailyHour: clampInt(m[1], 0, 23, 23), dailyMinute: clampInt(m[2], 0, 59, 55), dailySecond: clampInt(m[3], 0, 59, 0) };
  return { kind: 'custom' };
}

function renderLoggerReportScheduleUi() {
  const kind = String(els.loggerReportScheduleKind?.value || 'every_n_minutes').trim() || 'every_n_minutes';

  if (els.loggerScheduleEveryMinutesWrap) els.loggerScheduleEveryMinutesWrap.style.display = (kind === 'every_n_minutes') ? '' : 'none';
  if (els.loggerScheduleHourlyWrap) els.loggerScheduleHourlyWrap.style.display = (kind === 'hourly') ? '' : 'none';
  if (els.loggerScheduleDailyWrap) els.loggerScheduleDailyWrap.style.display = (kind === 'daily') ? '' : 'none';
  if (els.loggerScheduleAdvancedWrap) els.loggerScheduleAdvancedWrap.style.display = (kind === 'custom') ? '' : 'none';

  const cal = buildOnCalendarForScheduleKind(kind);
  if (els.loggerReportOnCalendar) {
    if (kind !== 'custom') els.loggerReportOnCalendar.value = cal;
  }
  if (els.loggerReportSchedulePreview) {
    els.loggerReportSchedulePreview.textContent = cal ? `Schedule: ${cal}` : '';
  }
}

function closeLoggerReportModal() {
  if (els.loggerReportModal) els.loggerReportModal.style.display = 'none';
  state.loggerReportEditingMode = '';
  state.loggerReportEditingId = '';
  loggerReportModalSetStatus('');
}

function closeLoggerTagPickerModal() {
  if (els.loggerTagPickerModal) els.loggerTagPickerModal.style.display = 'none';
  if (els.loggerTagPickerStatus) els.loggerTagPickerStatus.textContent = '';
}

function tagKeyFromLiveTag(t) {
  const cid = String(t?.connection_id || '').trim();
  const name = String(t?.name || '').trim();
  if (!cid || !name) return '';
  return `${cid}:${name}`;
}

function parseReportTagsTextToSet() {
  const text = String(els.loggerReportTags?.value || '');
  const set = new Set();
  text.split(/\r?\n/g).forEach((line) => {
    const s = String(line || '').trim();
    if (!s) return;
    if (s.startsWith('#')) return;
    // Only preselect concrete tags (no wildcards).
    if (s.includes('*') || s.includes('?')) return;
    if (!s.includes(':')) return;
    set.add(s);
  });
  return set;
}

function renderLoggerTagPickerTable() {
  if (!els.loggerTagPickerTbody) return;
  const all = Array.isArray(state.loggerTagPickerAll) ? state.loggerTagPickerAll : [];
  const q = String(state.loggerTagPickerFilter || '').toLowerCase();
  els.loggerTagPickerTbody.textContent = '';

  const filtered = all.filter((t) => {
    if (!q) return true;
    const cid = String(t?.connection_id || '').toLowerCase();
    const name = String(t?.name || '').toLowerCase();
    return cid.includes(q) || name.includes(q);
  });

  const mk = (text, mono = false) => {
    const td = document.createElement('td');
    if (mono) td.classList.add('mono');
    td.textContent = String(text ?? '');
    return td;
  };

  filtered.forEach((t) => {
    const key = tagKeyFromLiveTag(t);
    if (!key) return;
    const tr = document.createElement('tr');

    const td0 = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.loggerTagPickerSelected.has(key);
    cb.addEventListener('change', () => {
      if (cb.checked) state.loggerTagPickerSelected.add(key);
      else state.loggerTagPickerSelected.delete(key);
      if (els.loggerTagPickerStatus) {
        els.loggerTagPickerStatus.textContent = `${state.loggerTagPickerSelected.size} selected`;
      }
    });
    td0.appendChild(cb);

    tr.appendChild(td0);
    tr.appendChild(mk(String(t?.connection_id || ''), true));
    tr.appendChild(mk(String(t?.name || ''), true));
    tr.appendChild(mk(String(t?.datatype || ''), true));
    tr.appendChild(mk(t?.writable ? 'yes' : 'no', false));

    tr.addEventListener('dblclick', () => {
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });

    els.loggerTagPickerTbody.appendChild(tr);
  });

  if (els.loggerTagPickerStatus) {
    els.loggerTagPickerStatus.textContent = `${state.loggerTagPickerSelected.size} selected · ${filtered.length} shown`;
  }
}

async function openLoggerTagPickerModal() {
  if (!els.loggerTagPickerModal) return;
  if (!els.loggerReportTags) return;

  state.loggerTagPickerSelected = parseReportTagsTextToSet();
  state.loggerTagPickerFilter = '';
  if (els.loggerTagPickerSearch) els.loggerTagPickerSearch.value = '';
  if (els.loggerTagPickerStatus) els.loggerTagPickerStatus.textContent = 'Loading tags…';
  els.loggerTagPickerModal.style.display = 'block';

  try {
    const resp = await apiGet('/api/opcbridge/tags');
    const raw = Array.isArray(resp?.tags) ? resp.tags : [];
    // Deduplicate by connection_id:name
    const seen = new Set();
    const out = [];
    raw.forEach((t) => {
      const key = tagKeyFromLiveTag(t);
      if (!key) return;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(t);
    });
    out.sort((a, b) => tagKeyFromLiveTag(a).localeCompare(tagKeyFromLiveTag(b), undefined, { sensitivity: 'base' }));
    state.loggerTagPickerAll = out;
    renderLoggerTagPickerTable();
  } catch (err) {
    state.loggerTagPickerAll = [];
    if (els.loggerTagPickerStatus) els.loggerTagPickerStatus.textContent = `Failed: ${err.message || err}`;
    renderLoggerTagPickerTable();
  }
}

function applyLoggerTagPickerSelectionToTextarea() {
  const existing = String(els.loggerReportTags?.value || '').split(/\r?\n/g).map((s) => String(s || '').trim());
  const preserved = [];
  for (const line of existing) {
    if (!line) continue;
    if (line.startsWith('#')) { preserved.push(line); continue; }
    if (line.includes('*') || line.includes('?')) { preserved.push(line); continue; }
    if (!line.includes(':')) { preserved.push(line); continue; }
    // concrete tags will be rebuilt from selection
  }

  const selected = Array.from(state.loggerTagPickerSelected || []).map((s) => String(s || '').trim()).filter(Boolean);
  selected.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const next = preserved.concat(selected);
  if (els.loggerReportTags) els.loggerReportTags.value = next.join('\n');
  closeLoggerTagPickerModal();
}

function normalizeReportTagsArray(tags) {
  const out = [];
  const arr = Array.isArray(tags) ? tags : [];
  for (const t of arr) {
    if (typeof t === 'string') {
      const s = String(t || '').trim();
      if (s) out.push(s);
      continue;
    }
    if (t && typeof t === 'object' && !Array.isArray(t)) {
      const cid = String(t.connection_id || '').trim();
      const name = String(t.name || '').trim();
      if (cid && name) out.push(`${cid}:${name}`);
      continue;
    }
  }
  return out;
}

function openLoggerReportModal(opts = {}) {
  const mode = String(opts.mode || 'edit').trim() || 'edit';
  const id = String(opts.id || '').trim();
  const isNew = mode === 'new';
  const report = (!isNew && id) ? findReportById(id) : null;

  state.loggerReportEditingMode = isNew ? 'new' : 'edit';
  state.loggerReportEditingId = isNew ? '' : id;

  if (els.loggerReportModal) els.loggerReportModal.style.display = 'block';
  loggerReportModalSetStatus('');

  if (els.loggerReportId) {
    els.loggerReportId.disabled = !isNew;
    els.loggerReportId.value = isNew ? '' : String(report?.id || id);
  }
  if (els.loggerReportName) els.loggerReportName.value = String(report?.name || '');

  // Database dropdown
  if (els.loggerReportDatabase) {
    const dbs = Array.isArray(state.reporterDatabases) ? state.reporterDatabases : [];
    els.loggerReportDatabase.innerHTML = ['<option value=""></option>'].concat(
      dbs
        .slice()
        .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { sensitivity: 'base' }))
        .map((d) => {
          const did = String(d?.id || '').trim();
          const label = String(d?.name || d?.id || '').trim() || did;
          return `<option value="${escapeHtml(did)}">${escapeHtml(label)}</option>`;
        })
    ).join('');
    els.loggerReportDatabase.value = String(report?.database_id || '');
  }

  if (els.loggerReportTable) els.loggerReportTable.value = String(report?.table || 'tag_log');
  if (els.loggerReportMode) els.loggerReportMode.value = String(report?.mode || 'scheduled');
  if (els.loggerReportEnabled) els.loggerReportEnabled.checked = Boolean(report?.enabled);
  if (els.loggerReportPersistent) els.loggerReportPersistent.checked = (report?.schedule?.persistent !== false);

  const cal = String(report?.schedule?.on_calendar || '');
  if (els.loggerReportOnCalendar) els.loggerReportOnCalendar.value = cal;
  const guess = guessScheduleKindFromOnCalendar(cal);
  if (els.loggerReportScheduleKind) els.loggerReportScheduleKind.value = String(guess.kind || 'every_n_minutes');
  if (els.loggerReportEveryMinutes && typeof guess.everyMinutes === 'number') els.loggerReportEveryMinutes.value = String(guess.everyMinutes);
  if (els.loggerReportHourlyMinute && typeof guess.hourlyMinute === 'number') els.loggerReportHourlyMinute.value = String(guess.hourlyMinute);
  if (els.loggerReportHourlySecond && typeof guess.hourlySecond === 'number') els.loggerReportHourlySecond.value = String(guess.hourlySecond);
  if (els.loggerReportDailyHour && typeof guess.dailyHour === 'number') els.loggerReportDailyHour.value = String(guess.dailyHour);
  if (els.loggerReportDailyMinute && typeof guess.dailyMinute === 'number') els.loggerReportDailyMinute.value = String(guess.dailyMinute);
  if (els.loggerReportDailySecond && typeof guess.dailySecond === 'number') els.loggerReportDailySecond.value = String(guess.dailySecond);
  renderLoggerReportScheduleUi();

  if (els.loggerReportTags) {
    const tags = normalizeReportTagsArray(report?.tags);
    els.loggerReportTags.value = tags.join('\n');
  }
}

function startNewReport() {
  openLoggerReportModal({ mode: 'new' });
}

function getReportFromModalUi() {
  const id = String(els.loggerReportId?.value || '').trim();
  const mode = String(els.loggerReportMode?.value || 'scheduled').trim() || 'scheduled';
  const enabled = Boolean(els.loggerReportEnabled?.checked);
  const persistent = Boolean(els.loggerReportPersistent?.checked);
  const kind = String(els.loggerReportScheduleKind?.value || 'every_n_minutes').trim() || 'every_n_minutes';
  const onCalendar = buildOnCalendarForScheduleKind(kind);

  const tagsText = String(els.loggerReportTags?.value || '');
  const tags = tagsText
    .split(/\r?\n/g)
    .map((s) => String(s || '').trim())
    .filter((s) => s && !s.startsWith('#'));

  return {
    id,
    name: String(els.loggerReportName?.value || '').trim(),
    database_id: String(els.loggerReportDatabase?.value || '').trim(),
    table: String(els.loggerReportTable?.value || 'tag_log').trim() || 'tag_log',
    mode,
    enabled,
    schedule: { on_calendar: onCalendar, persistent },
    tags
  };
}

async function saveAndApplyReporterReport() {
  loggerReportModalSetStatus('Saving…');
  try {
    const report = getReportFromModalUi();
    if (!report.id) throw new Error('ID is required.');
    if (!report.database_id) throw new Error('Database is required.');
    if (report.mode === 'scheduled' && !report.schedule.on_calendar) throw new Error('OnCalendar is required for scheduled reports.');

    const save = await apiPostJson('/api/reporter/reports', { report });
    if (!save?.ok) throw new Error(String(save?.error || 'Failed'));

    loggerReportModalSetStatus('Applying schedule…');
    const apply = await apiPostJson('/api/reporter/reports/apply', { id: report.id });
    if (!apply?.ok) throw new Error(String(apply?.error || 'Failed'));

    await refreshReporterAll();
    state.loggerSelectedNodeId = `logger:report:${report.id}`;
    renderLoggerTree();
    renderLoggerDetails();
    closeLoggerReportModal();
    loggerSetStatus('Applied.');
  } catch (err) {
    loggerReportModalSetStatus(`Failed: ${err.message || err}`);
  }
}

async function deleteReporterReport(id) {
  const rid = String(id || '').trim();
  if (!rid) return;
  if (!window.confirm(`Delete report '${rid}'?`)) return;
  loggerSetStatus('Deleting…');
  try {
    const resp = await apiPostJson('/api/reporter/reports/delete', { id: rid });
    if (!resp?.ok) throw new Error(String(resp?.error || 'Failed'));
    await refreshReporterAll();
    state.loggerSelectedNodeId = 'logger:reports';
    renderLoggerTree();
    renderLoggerDetails();
    loggerSetStatus('Deleted.');
  } catch (err) {
    loggerSetStatus(`Failed: ${err.message || err}`);
  }
}

async function refreshReporterAll() {
  loggerSetStatus('Loading…');
  const out = { ok: true };

  try {
    const caps = await apiGet('/api/reporter/capabilities');
    if (caps?.ok) state.reporterCapabilities = caps.capabilities || null;
    out.capabilities = caps;
  } catch (err) {
    out.ok = false;
    out.capabilities = { ok: false, error: String(err.message || err) };
    state.reporterCapabilities = null;
  }

  try {
    const db = await apiGet('/api/reporter/databases');
    if (!db?.ok) throw new Error(String(db?.error || 'Failed'));
    state.reporterDatabases = Array.isArray(db?.databases) ? db.databases : [];
    out.databases = db;
  } catch (err) {
    out.ok = false;
    out.databases = { ok: false, error: String(err.message || err) };
    state.reporterDatabases = [];
  }

  try {
    const rep = await apiGet('/api/reporter/reports');
    if (!rep?.ok) throw new Error(String(rep?.error || 'Failed'));
    state.reporterReports = Array.isArray(rep?.reports) ? rep.reports : [];
    out.reports = rep;
  } catch (err) {
    out.ok = false;
    out.reports = { ok: false, error: String(err.message || err) };
    state.reporterReports = [];
  }

  if (els.loggerJson) els.loggerJson.textContent = JSON.stringify(out, null, 2);
  if (!state.loggerSelectedNodeId) state.loggerSelectedNodeId = 'logger:databases';
  renderLoggerTree();
  renderLoggerDetails();
  loggerSetStatus(out.ok ? 'Ready.' : 'Partial failure (see Raw JSON).');
}

function wireLoggerUi() {
  if (els.loggerRefreshBtn) els.loggerRefreshBtn.addEventListener('click', () => refreshReporterAll());
  if (els.loggerDbModalType) els.loggerDbModalType.addEventListener('change', () => {
    renderLoggerDbModalTypeUi();
    renderLoggerDbModalFieldsForType(String(els.loggerDbModalType?.value || 'mysql'));
  });
  if (els.loggerDbCloseBtn) els.loggerDbCloseBtn.addEventListener('click', closeLoggerDbModal);
  if (els.loggerDbCancelBtn) els.loggerDbCancelBtn.addEventListener('click', closeLoggerDbModal);
  if (els.loggerDbSaveBtn) els.loggerDbSaveBtn.addEventListener('click', () => saveReporterDatabase());
  if (els.loggerReportCloseBtn) els.loggerReportCloseBtn.addEventListener('click', closeLoggerReportModal);
  if (els.loggerReportCancelBtn) els.loggerReportCancelBtn.addEventListener('click', closeLoggerReportModal);
  if (els.loggerReportSaveBtn) els.loggerReportSaveBtn.addEventListener('click', saveAndApplyReporterReport);
  if (els.loggerReportScheduleKind) els.loggerReportScheduleKind.addEventListener('change', renderLoggerReportScheduleUi);
  if (els.loggerReportEveryMinutes) els.loggerReportEveryMinutes.addEventListener('input', renderLoggerReportScheduleUi);
  if (els.loggerReportHourlyMinute) els.loggerReportHourlyMinute.addEventListener('input', renderLoggerReportScheduleUi);
  if (els.loggerReportHourlySecond) els.loggerReportHourlySecond.addEventListener('input', renderLoggerReportScheduleUi);
  if (els.loggerReportDailyHour) els.loggerReportDailyHour.addEventListener('input', renderLoggerReportScheduleUi);
  if (els.loggerReportDailyMinute) els.loggerReportDailyMinute.addEventListener('input', renderLoggerReportScheduleUi);
  if (els.loggerReportDailySecond) els.loggerReportDailySecond.addEventListener('input', renderLoggerReportScheduleUi);
  if (els.loggerReportOnCalendar) els.loggerReportOnCalendar.addEventListener('input', () => {
    if (String(els.loggerReportScheduleKind?.value || '') === 'custom') renderLoggerReportScheduleUi();
  });

  if (els.loggerReportSelectTagsBtn) els.loggerReportSelectTagsBtn.addEventListener('click', openLoggerTagPickerModal);
  if (els.loggerTagPickerCloseBtn) els.loggerTagPickerCloseBtn.addEventListener('click', closeLoggerTagPickerModal);
  if (els.loggerTagPickerApplyBtn) els.loggerTagPickerApplyBtn.addEventListener('click', applyLoggerTagPickerSelectionToTextarea);
  if (els.loggerTagPickerClearBtn) els.loggerTagPickerClearBtn.addEventListener('click', () => {
    state.loggerTagPickerSelected = new Set();
    renderLoggerTagPickerTable();
  });
  if (els.loggerTagPickerSelectAllBtn) els.loggerTagPickerSelectAllBtn.addEventListener('click', () => {
    const all = Array.isArray(state.loggerTagPickerAll) ? state.loggerTagPickerAll : [];
    const q = String(state.loggerTagPickerFilter || '').toLowerCase();
    const sel = new Set(state.loggerTagPickerSelected || []);
    all.forEach((t) => {
      const key = tagKeyFromLiveTag(t);
      if (!key) return;
      if (q) {
        const cid = String(t?.connection_id || '').toLowerCase();
        const name = String(t?.name || '').toLowerCase();
        if (!cid.includes(q) && !name.includes(q)) return;
      }
      sel.add(key);
    });
    state.loggerTagPickerSelected = sel;
    renderLoggerTagPickerTable();
  });
  if (els.loggerTagPickerSearch) els.loggerTagPickerSearch.addEventListener('input', () => {
    state.loggerTagPickerFilter = String(els.loggerTagPickerSearch?.value || '');
    renderLoggerTagPickerTable();
  });
}

function logsSetStatus(msg) {
  if (els.logsStatus) els.logsStatus.textContent = String(msg || '');
}

function logsSetOutput(text) {
  if (!els.logsOutput) return;
  els.logsOutput.textContent = String(text || '');
}

async function refreshLogs() {
  if (!els.logsOutput) return;
  const source = String(els.logsSource?.value || 'systemd').trim() || 'systemd';
  const unit = String(els.logsUnit?.value || '').trim();
  const lines = Math.max(10, Math.min(5000, Math.trunc(Number(els.logsLines?.value ?? 400) || 400)));
  logsSetStatus('Loading…');
  try {
    const u = source === 'systemd'
      ? `/api/logs?unit=${encodeURIComponent(unit)}&lines=${encodeURIComponent(String(lines))}`
      : `/api/logs/source?source=${encodeURIComponent(source)}&limit=${encodeURIComponent(String(lines))}`;
    const resp = await apiGetText(u);
    let data = null;
    try { data = JSON.parse(resp); } catch { data = { ok: false, error: resp }; }
    if (!data?.ok) {
      const err = String(data?.error || 'unknown error');
      const hint = data?.hint ? String(data.hint) : '';
      const stderr = data?.stderr ? String(data.stderr) : '';
      logsSetStatus(`Failed: ${err}`);
      const extra = [
        hint ? `Hint: ${hint}` : '',
        stderr ? `stderr:\n${stderr}` : '',
        (data?.details && typeof data.details === 'object') ? `details:\n${JSON.stringify(data.details, null, 2)}` : ''
      ].filter(Boolean).join('\n\n');
      logsSetOutput(extra);
      return;
    }
    logsSetStatus(`OK · ${String(data.unit || data.source || unit || source)} · ${Number(data.lines || lines)} lines`);
    logsSetOutput(String(data.text || ''));
  } catch (err) {
    logsSetStatus(`Failed: ${err.message}`);
    logsSetOutput('');
  }
}

function wireLogsUi() {
  if (!els.logsRefreshBtn) return;
  if (els.logsRefreshBtn.dataset.wired === '1') return;
  els.logsRefreshBtn.dataset.wired = '1';

  if (els.logsSource) {
    els.logsSource.innerHTML = [
      { value: 'systemd', label: 'System journal (journalctl)' },
      { value: 'opcbridge_events', label: 'opcbridge alarms/events log' },
      { value: 'alarm_server_history', label: 'alarm server history' },
      { value: 'hmi_audit', label: 'HMI audit log' }
    ].map((s) => `<option value="${escapeHtml(s.value)}">${escapeHtml(s.label)}</option>`).join('');
  }

  const units = [
    { value: 'opcbridge.service', label: 'opcbridge.service' },
    { value: 'opcbridge-alarms.service', label: 'opcbridge-alarms.service' },
    { value: 'opcbridge-hmi.service', label: 'opcbridge-hmi.service' },
    { value: 'opcbridge-scada.service', label: 'opcbridge-scada.service' }
  ];
  if (els.logsUnit) {
    els.logsUnit.innerHTML = units.map((u) => `<option value="${escapeHtml(u.value)}">${escapeHtml(u.label)}</option>`).join('');
  }

  els.logsRefreshBtn.addEventListener('click', refreshLogs);

  const updateLogsControls = () => {
    const source = String(els.logsSource?.value || 'systemd').trim() || 'systemd';
    const serviceRow = els.logsUnit?.closest('.form-row');
    if (serviceRow) serviceRow.style.display = (source === 'systemd') ? '' : 'none';
  };
  if (els.logsSource) {
    els.logsSource.addEventListener('change', () => {
      updateLogsControls();
    });
  }
  updateLogsControls();
}

window.addEventListener('error', (e) => {
  setFatalStatus(e?.error || e?.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', (e) => {
  setFatalStatus(e?.reason || 'Unhandled rejection');
});

function setTab(id) {
  const next = String(id || '').trim();
  if (!next) return;
  if (next === 'alarms') {
    // Alarms page removed (data is still visible elsewhere).
    id = 'overview';
  }
  if (next === 'configure' && !canAccessConfigureTab()) {
    id = 'overview';
  }
  if (next === 'workspace' && !canAccessWorkspaceTab()) {
    id = 'overview';
  }
  if (next === 'logger' && !canAccessLoggerTab()) {
    id = 'overview';
  }
  if (next === 'logs' && !canAccessLogsTab()) {
    id = 'overview';
  }
  if (next === 'users' && !canAccessUsersTab()) {
    id = 'overview';
  }

  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === id));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `tab-${id}`));

  if (id === 'users') {
    refreshUsersPanel().catch(() => {});
    refreshUserAuthLine().catch(() => {});
  }
  if (id === 'logs') {
    refreshLogs().catch(() => {});
  }
  if (id === 'logger') {
    refreshReporterAll().catch(() => {});
  }
}

els.tabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  if (!btn.dataset.tab) return; // ignore non-tab links in the header
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

async function apiJson(url, { method, bodyObj } = {}) {
  const m = String(method || 'GET').toUpperCase();
  const init = { method: m, headers: { Accept: 'application/json' } };
  if (m !== 'GET' && m !== 'HEAD') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(bodyObj || {});
  }
  const res = await fetch(url, init);
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
  const r = await apiPostJson('/api/opcbridge/reload', {});
  if (r && r.pending) {
    const gen = (typeof r.gen === 'number') ? r.gen : null;
    await waitForOpcbridgeReloadDone({ gen });
  }
}

async function waitForOpcbridgeReloadDone({ gen, maxWaitMs = 180000, intervalMs = 750 } = {}) {
  const start = Date.now();
  while ((Date.now() - start) < maxWaitMs) {
    try {
      const s = await apiGet('/api/opcbridge/reload/status');
      const sGen = (typeof s?.gen === 'number') ? s.gen : 0;
      if (typeof gen === 'number' && sGen < gen) {
        // Still reporting an older reload; keep polling.
      } else if (s && s.done) {
        if (s.ok) return true;
        throw new Error(String(s.error || 'Reload failed'));
      }
    } catch (err) {
      // If the status endpoint is temporarily unavailable during reload, keep waiting.
      const msg = String(err?.message || err || '');
      if (msg.toLowerCase().includes('blocked path')) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
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

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  // RFC4180-ish: quote if contains comma, quote, or newline. Double quotes inside quoted fields.
  if (!/[,"\r\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows, headers) {
  const hdr = Array.isArray(headers) ? headers : [];
  const lines = [];
  if (hdr.length) lines.push(hdr.map(csvEscape).join(','));
  (rows || []).forEach((row) => {
    lines.push(hdr.map((h) => csvEscape(row?.[h])).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function downloadTextFile({ filename, mime, text }) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download.txt';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function isDeleteAction(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === 'delete';
}

async function downloadConnectivityCsv() {
  const connItems = state.connFiles.slice().sort((a, b) => String(a?.path || '').localeCompare(String(b?.path || '')));
  const objs = await Promise.all(connItems.map(async (f) => {
    const rel = String(f?.path || '').trim();
    if (!rel) return null;
    try {
      const obj = await getConnObjForPath(rel);
      return { rel, obj };
    } catch {
      return { rel, obj: null };
    }
  }));

  const headers = [
    'connection_id',
    'description',
    'driver',
    'driver_label',
    'gateway',
    'path',
    'slot',
    'plc_type',
    'plc_type_label',
    'source_file',
    'action'
  ];

  const rows = objs.filter(Boolean).map(({ rel, obj }) => {
    const cid = String(obj?.connection_id || obj?.id || '') || inferConnectionIdFromPath(rel);
    const driver = String(obj?.driver || '').trim();
    const plcType = String(obj?.plc_type || obj?.plcType || '').trim();
    return {
      connection_id: cid,
      description: String(obj?.description || '').trim(),
      driver,
      driver_label: labelForDriver(driver),
      gateway: String(obj?.gateway || '').trim(),
      path: String(obj?.path || '').trim(),
      slot: (obj?.slot == null) ? '' : String(obj.slot),
      plc_type: plcType,
      plc_type_label: labelForPlcType(plcType),
      source_file: rel,
      action: ''
    };
  });

  downloadTextFile({
    filename: 'opcbridge-devices.csv',
    mime: 'text/csv',
    text: toCsv(rows, headers)
  });
}

function downloadDeviceTagsCsv(connectionId) {
  const cid = String(connectionId || '').trim();
  if (!cid) return;

  const tags = getEffectiveTagsAll()
    .filter((t) => String(t?.connection_id || '') === cid)
    .slice()
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

	  const headers = [
	    'connection_id',
	    'name',
	    'plc_tag_name',
	    'datatype',
	    'scan_ms',
	    'enabled',
	    'writable',
	    'mqtt_command_allowed',
	    'scaling',
	    'raw_low',
	    'raw_high',
	    'scaled_low',
	    'scaled_high',
	    'clamp_low',
	    'clamp_high',
	    'scaled_datatype',
	    'log_event_on_change',
	    'log_periodic_mode',
	    'log_periodic_interval_sec',
	    'action'
	  ];

	  const rows = tags.map((t) => ({
	    connection_id: cid,
	    name: String(t?.name || '').trim(),
	    plc_tag_name: String(t?.plc_tag_name || '').trim(),
	    datatype: String(t?.datatype || '').trim(),
	    scan_ms: (t?.scan_ms == null) ? '' : String(t.scan_ms),
	    enabled: (t?.enabled !== false) ? 'true' : 'false',
	    writable: (t?.writable === true) ? 'true' : 'false',
	    mqtt_command_allowed: (t?.mqtt_command_allowed === true) ? 'true' : 'false',
	    scaling: String(t?.scaling || '').trim(),
	    raw_low: (t?.raw_low == null) ? '' : String(t.raw_low),
	    raw_high: (t?.raw_high == null) ? '' : String(t.raw_high),
	    scaled_low: (t?.scaled_low == null) ? '' : String(t.scaled_low),
	    scaled_high: (t?.scaled_high == null) ? '' : String(t.scaled_high),
	    clamp_low: (t?.clamp_low === true) ? 'true' : 'false',
	    clamp_high: (t?.clamp_high === true) ? 'true' : 'false',
	    scaled_datatype: String(t?.scaled_datatype || '').trim(),
	    log_event_on_change: (t?.log_event_on_change === true) ? 'true' : 'false',
	    log_periodic_mode: String(t?.log_periodic_mode || '').trim(),
	    log_periodic_interval_sec: (t?.log_periodic_interval_sec == null) ? '' : String(t.log_periodic_interval_sec),
	    action: ''
	  }));

  const safe = cid.replace(/[^a-z0-9._-]+/gi, '_');
  downloadTextFile({
    filename: `opcbridge-tags-${safe}.csv`,
    mime: 'text/csv',
    text: toCsv(rows, headers)
  });
}

function parseCsv(text) {
  const input = String(text || '');
  const firstNonEmptyLine = (() => {
    const lines = input.split(/\r?\n/g);
    for (const line of lines) {
      if (String(line || '').trim() !== '') return String(line);
    }
    return '';
  })();

  // Auto-detect delimiter (supports CSV and TSV; common spreadsheet exports).
  const delimiter = (() => {
    const line = firstNonEmptyLine;
    const count = (ch) => (line.split(ch).length - 1);
    const commas = count(',');
    const tabs = count('\t');
    const semis = count(';');
    if (tabs > commas && tabs >= semis) return '\t';
    if (semis > commas && semis > tabs) return ';';
    return ',';
  })();

  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Ignore trailing empty line
    if (row.length === 1 && String(row[0] || '').trim() === '' && rows.length === 0) return;
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = input[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // ignore, handle at \n
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Flush last field/row
  pushField();
  if (row.some((c) => String(c || '').length > 0)) pushRow();

  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h) => String(h || '').trim());
  const records = [];
  rows.slice(1).forEach((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (idx < cells.length) ? cells[idx] : '';
    });
    // drop totally empty rows
    const hasAny = Object.values(obj).some((v) => String(v || '').trim() !== '');
    if (hasAny) records.push(obj);
  });
  return { headers, records };
}

function parseBoolLoose(value, defaultValue) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'y' || raw === 'on') return true;
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'n' || raw === 'off') return false;
  return defaultValue;
}

function parseIntLoose(value, defaultValue) {
  const raw = String(value ?? '').trim();
  if (!raw) return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.trunc(n);
}

function parseFloatLoose(value, defaultValue) {
  const raw = String(value ?? '').trim();
  if (!raw) return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return n;
}

function csvNormalizeHeaderKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function csvGet(rowObj, key) {
  if (!rowObj || typeof rowObj !== 'object') return '';
  const direct = rowObj[key];
  if (direct != null) return direct;
  const want = csvNormalizeHeaderKey(key);
  if (!want) return '';
  for (const k of Object.keys(rowObj)) {
    if (csvNormalizeHeaderKey(k) === want) return rowObj[k];
  }
  return '';
}

function normalizeConnRelPath(connectionId, sourceFile) {
  const cid = String(connectionId || '').trim();
  if (!cid) return '';
  const sf = String(sourceFile || '').trim();
  if (sf && sf.startsWith('connections/') && sf.toLowerCase().endsWith('.json')) return sf;
  return `connections/${cid}.json`;
}

async function pickCsvText() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    document.body.appendChild(input);

    const cleanup = () => {
      try { input.remove(); } catch { /* ignore */ }
    };

    input.addEventListener('change', () => {
      try {
        const file = input.files && input.files[0];
        if (!file) { cleanup(); return resolve(''); }
        const reader = new FileReader();
        reader.onerror = () => { cleanup(); reject(new Error('Failed to read file.')); };
        reader.onload = () => { cleanup(); resolve(String(reader.result || '')); };
        reader.readAsText(file);
      } catch (err) {
        cleanup();
        reject(err);
      }
    }, { once: true });

    input.click();
  });
}

async function importDevicesCsvIntoWorkspace() {
  const csvText = await pickCsvText();
  if (!csvText) return;

  const { records } = parseCsv(csvText);
  if (!records.length) { setWorkspaceSaveStatus('CSV had no data rows (make sure the first row is a header).'); return; }

  let staged = 0;
  let deleted = 0;
  let skipped = 0;
  records.forEach((r) => {
    const connection_id = String(csvGet(r, 'connection_id') || '').trim();
    if (!connection_id) { skipped += 1; return; }
    const relPath = normalizeConnRelPath(connection_id, csvGet(r, 'source_file'));

    if (isDeleteAction(csvGet(r, 'action'))) {
      state.workspaceDeletePaths?.add?.(relPath);
      state.workspaceConnDirty?.delete?.(relPath);
      state.connObjCache?.delete?.(relPath);
      state.connFiles = (state.connFiles || []).filter((f) => String(f?.path || '') !== relPath);

      // Also remove tags belonging to this device.
      state.tagConfigAll = (state.tagConfigAll || []).filter((t) => String(t?.connection_id || '') !== connection_id);
      state.tagConfigEdited = new Map();
      markTagsDirty(true);

      deleted += 1;
      return;
    }

    const driver = String(csvGet(r, 'driver') || '').trim() || 'ab_eip';
    const plc_type = String(csvGet(r, 'plc_type') || '').trim() || 'lgx';
    const gateway = String(csvGet(r, 'gateway') || '').trim();
    const pathVal = String(csvGet(r, 'path') || '').trim() || '1,0';
    const slot = parseIntLoose(csvGet(r, 'slot'), 0) || 0;
    const description = String(csvGet(r, 'description') || '').trim();

    const obj = { id: connection_id, description, driver, gateway, path: pathVal, slot, plc_type };

    if (!state.workspaceConnDirty) state.workspaceConnDirty = new Map();
    state.workspaceConnDirty.set(relPath, obj);
    state.connObjCache?.set?.(relPath, obj);

    if (!Array.isArray(state.connFiles)) state.connFiles = [];
    if (!state.connFiles.some((f) => String(f?.path || '') === relPath)) {
      state.connFiles.push({ kind: 'connection', path: relPath });
    }

    staged += 1;
  });

  renderWorkspaceSaveBar();
  saveWorkspaceDraft();
  renderWorkspaceTree();
  setWorkspaceSaveStatus(`Imported devices CSV: staged ${staged} device(s)${deleted ? `, deleted ${deleted}` : ''}${skipped ? `, skipped ${skipped}` : ''}.`);
}

async function importTagsCsvIntoWorkspace(connectionId) {
  const cid = String(connectionId || '').trim();
  if (!cid) return;

  const csvText = await pickCsvText();
  if (!csvText) return;

  const { records } = parseCsv(csvText);
  if (!records.length) { setWorkspaceSaveStatus('CSV had no data rows (make sure the first row is a header).'); return; }

  let upserts = 0;
  let deleted = 0;
  let skipped = 0;
  let skippedWrongConn = 0;
  let skippedMissing = 0;
  let sampleWrongConn = null;
  let sampleMissing = null;
  const all = Array.isArray(state.tagConfigAll) ? state.tagConfigAll.slice() : [];

  records.forEach((r) => {
    const rowCid = String(csvGet(r, 'connection_id') || '').trim() || cid;
    const name = String(csvGet(r, 'name') || '').trim();
    if (!rowCid || !name) {
      skipped += 1;
      skippedMissing += 1;
      if (!sampleMissing) sampleMissing = { connection_id: rowCid, name };
      return;
    }
    if (rowCid !== cid) {
      skipped += 1;
      skippedWrongConn += 1;
      if (!sampleWrongConn) sampleWrongConn = { connection_id: rowCid, name };
      return;
    }

    const idx = all.findIndex((t) => String(t?.connection_id || '') === rowCid && String(t?.name || '') === name);
    if (isDeleteAction(csvGet(r, 'action'))) {
      if (idx >= 0) {
        all.splice(idx, 1);
        deleted += 1;
      }
      state.tagConfigEdited?.delete?.(`${rowCid}::${name}`);
      return;
    }
    const base = (idx >= 0) ? { ...(all[idx] || {}) } : { connection_id: rowCid, name };

    const plc_tag_name = String(
      csvGet(r, 'plc_tag_name') ||
      csvGet(r, 'plc_tag') ||
      csvGet(r, 'plc_tagname') ||
      ''
    ).trim();
    if (plc_tag_name) base.plc_tag_name = plc_tag_name;
    const datatype = String(csvGet(r, 'datatype') || '').trim();
    if (datatype) base.datatype = datatype;
    const scan = parseIntLoose(csvGet(r, 'scan_ms') || csvGet(r, 'scan') || csvGet(r, 'scanms'), null);
	    if (scan == null) delete base.scan_ms;
	    else base.scan_ms = Math.max(0, scan);
	    base.enabled = parseBoolLoose(csvGet(r, 'enabled'), true);
	    base.writable = parseBoolLoose(csvGet(r, 'writable'), false);
	    base.mqtt_command_allowed = parseBoolLoose(csvGet(r, 'mqtt_command_allowed') || csvGet(r, 'mqtt_allowed') || csvGet(r, 'mqtt_command'), false);

	    const scaling = String(csvGet(r, 'scaling') || '').trim().toLowerCase();
	    if (scaling === 'none' || scaling === 'linear') base.scaling = scaling;
	    else if (scaling) delete base.scaling;

	    const rawLow = parseFloatLoose(csvGet(r, 'raw_low'), null);
	    if (rawLow == null) delete base.raw_low;
	    else base.raw_low = rawLow;
	    const rawHigh = parseFloatLoose(csvGet(r, 'raw_high'), null);
	    if (rawHigh == null) delete base.raw_high;
	    else base.raw_high = rawHigh;
	    const scaledLow = parseFloatLoose(csvGet(r, 'scaled_low'), null);
	    if (scaledLow == null) delete base.scaled_low;
	    else base.scaled_low = scaledLow;
	    const scaledHigh = parseFloatLoose(csvGet(r, 'scaled_high'), null);
	    if (scaledHigh == null) delete base.scaled_high;
	    else base.scaled_high = scaledHigh;

	    const clampLowRaw = csvGet(r, 'clamp_low');
	    if (String(clampLowRaw ?? '').trim() === '') delete base.clamp_low;
	    else base.clamp_low = parseBoolLoose(clampLowRaw, false);
	    const clampHighRaw = csvGet(r, 'clamp_high');
	    if (String(clampHighRaw ?? '').trim() === '') delete base.clamp_high;
	    else base.clamp_high = parseBoolLoose(clampHighRaw, false);

	    const scaledDatatype = String(csvGet(r, 'scaled_datatype') || '').trim();
	    if (scaledDatatype) base.scaled_datatype = scaledDatatype;
	    else delete base.scaled_datatype;
	    base.log_event_on_change = parseBoolLoose(csvGet(r, 'log_event_on_change') || csvGet(r, 'log_on_change'), false);

	    const mode = String(csvGet(r, 'log_periodic_mode') || '').trim();
	    if (mode) base.log_periodic_mode = mode;
    else delete base.log_periodic_mode;
    const intervalSec = parseIntLoose(csvGet(r, 'log_periodic_interval_sec') || csvGet(r, 'log_interval_sec'), null);
    if (intervalSec == null) delete base.log_periodic_interval_sec;
    else base.log_periodic_interval_sec = Math.max(0, intervalSec);

    if (idx >= 0) all[idx] = base;
    else all.push(base);
    upserts += 1;
  });

  state.tagConfigAll = all;
  state.tagConfigEdited = new Map();
  markTagsDirty(true);
  saveWorkspaceDraft();
  renderWorkspaceTree();
  const parts = [];
  if (skippedWrongConn) {
    parts.push(`${skippedWrongConn} wrong connection_id`);
  }
  if (skippedMissing) {
    parts.push(`${skippedMissing} missing required fields`);
  }
  const hint = parts.length ? ` (${parts.join(', ')})` : '';
  const ex = sampleWrongConn
    ? ` Example wrong connection_id: connection_id='${String(sampleWrongConn.connection_id)}' name='${String(sampleWrongConn.name)}' (upload target is '${cid}').`
    : (sampleMissing ? ` Example missing fields: connection_id='${String(sampleMissing.connection_id)}' name='${String(sampleMissing.name)}'.` : '');
  setWorkspaceSaveStatus(`Imported tags CSV for ${cid}: upserted ${upserts} tag(s)${deleted ? `, deleted ${deleted}` : ''}${skipped ? `, skipped ${skipped}${hint}` : ''}.${ex}`);
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

const TAG_SCALED_DATATYPE_OPTIONS = [
  { value: '', label: '(default float64)' },
  { value: 'float64', label: 'Float64' },
  { value: 'float32', label: 'Float32' },
  { value: 'int32', label: 'Int32' },
  { value: 'uint32', label: 'UInt32' },
  { value: 'int16', label: 'Int16' },
  { value: 'uint16', label: 'UInt16' },
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

function fillScaledDatatypeSelect(selectEl, selected) {
  if (!selectEl) return;
  const cur = String(selected ?? '').trim().toLowerCase();
  selectEl.textContent = '';
  TAG_SCALED_DATATYPE_OPTIONS.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  });

  const known = TAG_SCALED_DATATYPE_OPTIONS.some((x) => x.value === cur);
  selectEl.value = known ? cur : '';
}

function applyScalingModeUi(modeEl, linearRowEl) {
  if (!modeEl || !linearRowEl) return;
  const mode = String(modeEl.value || 'none').trim().toLowerCase();
  linearRowEl.style.display = (mode === 'linear') ? '' : 'none';
}

function readLinearScalingFromUi({ scalingEl, rawLowEl, rawHighEl, scaledLowEl, scaledHighEl, scaledDatatypeEl, clampLowEl, clampHighEl }, datatype) {
  const mode = String(scalingEl?.value || 'none').trim().toLowerCase();
  if (mode !== 'linear') return { ok: true, scaling: 'none', fields: {} };

  const dt = String(datatype || '').trim().toLowerCase();
  if (dt === 'bool' || dt === 'string') return { ok: false, error: 'Scaling is only supported for numeric datatypes.' };

  const rawLowStr = String(rawLowEl?.value ?? '').trim();
  const rawHighStr = String(rawHighEl?.value ?? '').trim();
  const scaledLowStr = String(scaledLowEl?.value ?? '').trim();
  const scaledHighStr = String(scaledHighEl?.value ?? '').trim();
  if (!rawLowStr || !rawHighStr || !scaledLowStr || !scaledHighStr) {
    return { ok: false, error: 'Raw Low/High and Scaled Low/High are required for Linear scaling.' };
  }

  const raw_low = Number(rawLowStr);
  const raw_high = Number(rawHighStr);
  const scaled_low = Number(scaledLowStr);
  const scaled_high = Number(scaledHighStr);
  if (![raw_low, raw_high, scaled_low, scaled_high].every((n) => Number.isFinite(n))) {
    return { ok: false, error: 'Scaling bounds must be valid numbers.' };
  }
  if (raw_high === raw_low) return { ok: false, error: 'Raw High must be different from Raw Low.' };
  if (scaled_high === scaled_low) return { ok: false, error: 'Scaled High must be different from Scaled Low.' };

  const fields = {
    scaling: 'linear',
    raw_low,
    raw_high,
    scaled_low,
    scaled_high,
    clamp_low: Boolean(clampLowEl?.checked),
    clamp_high: Boolean(clampHighEl?.checked),
  };
  const sdt = String(scaledDatatypeEl?.value || '').trim().toLowerCase();
  if (sdt) fields.scaled_datatype = sdt;
  return { ok: true, scaling: 'linear', fields };
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

// ---------------- Alarms config (opcbridge alarms.json) ----------------

function normalizeAlarmGroupName(name) {
  return String(name || '').trim();
}

function normalizeAlarmSiteName(name) {
  return String(name || '').trim();
}

function ensureAlarmGroupsTree(cfgObj) {
  const obj = (cfgObj && typeof cfgObj === 'object' && !Array.isArray(cfgObj)) ? cfgObj : {};
  if (!Array.isArray(obj.groups)) obj.groups = [];
  obj.groups = obj.groups.filter((g) => g && typeof g === 'object' && !Array.isArray(g));
  obj.groups.forEach((g) => {
    g.name = normalizeAlarmGroupName(g.name || g.label || g.id || '');
    if (!Array.isArray(g.sites)) g.sites = [];
    g.sites = g.sites.filter((s) => s && typeof s === 'object' && !Array.isArray(s));
    g.sites.forEach((s) => { s.name = normalizeAlarmSiteName(s.name || s.label || s.id || ''); });
    g.sites = g.sites.filter((s) => s.name);
  });
  obj.groups = obj.groups.filter((g) => g.name);
  return obj;
}

function parseOpcbridgeAlarmsConfig(resp) {
  // Expected: { ok, json: { alarms: [...] , groups?: [...] }, mtime_ms }
  const cfg = resp?.json;
  if (!cfg || typeof cfg !== 'object') return { alarms: [], groups: [] };
  const out = { ...(cfg || {}) };
  if (!Array.isArray(out.alarms)) out.alarms = [];
  ensureAlarmGroupsTree(out);
  return out;
}

async function loadOpcbridgeAlarmsConfig() {
  const resp = await apiGet('/api/opcbridge/config/alarms');
  state.alarmsConfigLast = resp || null;
  state.alarmsConfigMtimeMs = Number(resp?.mtime_ms || 0) || 0;
  state.alarmsConfig = parseOpcbridgeAlarmsConfig(resp);
  return state.alarmsConfig;
}

async function saveOpcbridgeAlarmsConfig(nextCfg) {
  const obj = (nextCfg && typeof nextCfg === 'object' && !Array.isArray(nextCfg)) ? nextCfg : {};
  if (!Array.isArray(obj.alarms)) obj.alarms = [];
  ensureAlarmGroupsTree(obj);
  const content = JSON.stringify(obj, null, 2) + '\n';
  await apiPostJson('/api/opcbridge/config/file', { path: 'alarms.json', content });
}

function upsertAlarmGroup(cfg, groupName) {
  const name = normalizeAlarmGroupName(groupName);
  if (!name) throw new Error('Group name is required.');
  ensureAlarmGroupsTree(cfg);
  const want = name.toLowerCase();
  if (cfg.groups.some((g) => String(g?.name || '').toLowerCase() === want)) return;
  cfg.groups.push({ name, sites: [] });
}

function upsertAlarmSite(cfg, groupName, siteName) {
  const gname = normalizeAlarmGroupName(groupName);
  const sname = normalizeAlarmSiteName(siteName);
  if (!gname) throw new Error('Group name is required.');
  if (!sname) throw new Error('Site name is required.');
  ensureAlarmGroupsTree(cfg);
  const group = cfg.groups.find((g) => String(g?.name || '').toLowerCase() === gname.toLowerCase()) || null;
  if (!group) throw new Error(`Group not found: ${gname}`);
  const want = sname.toLowerCase();
  if (Array.isArray(group.sites) && group.sites.some((s) => String(s?.name || '').toLowerCase() === want)) return;
  group.sites = Array.isArray(group.sites) ? group.sites : [];
  group.sites.push({ name: sname });
}

function ensureGroupSiteInConfig(cfg, groupName, siteName) {
  const g = normalizeAlarmGroupName(groupName);
  const s = normalizeAlarmSiteName(siteName);
  if (g) upsertAlarmGroup(cfg, g);
  if (g && s) upsertAlarmSite(cfg, g, s);
}

// ---------------- Configure ----------------

function setScadaSettingsStatus(msg) {
  if (els.scadaSettingsStatus) els.scadaSettingsStatus.textContent = String(msg || '');
}

function setSvcStatus(msg) {
  if (els.svcStatus) els.svcStatus.textContent = String(msg || '');
}

function setMqttCaStatus(msg) {
  if (els.mqttCaStatus) els.mqttCaStatus.textContent = String(msg || '');
}

function setMqttCaCurrentStatus(msg) {
  if (els.mqttCaCurrentStatus) els.mqttCaCurrentStatus.textContent = String(msg || '');
}

async function refreshMqttCaStatus() {
  setMqttCaCurrentStatus('Checking current CA cert…');
  try {
    const data = await apiGet('/api/opcbridge/cert/status');
    if (data?.exists) {
      const size = Number(data?.size_bytes ?? 0) || 0;
      const suffix = size > 0 ? ` (${size} bytes)` : '';
      setMqttCaCurrentStatus(`Current: present${suffix}`);
    } else {
      setMqttCaCurrentStatus('Current: missing');
    }
  } catch (err) {
    setMqttCaCurrentStatus(`Current: unknown (${err.message})`);
  }
}

function hmiUrlFromForm() {
  const currentHost = (window.location && window.location.hostname) ? String(window.location.hostname) : '';
  const currentScheme = (window.location && window.location.protocol) ? String(window.location.protocol).replace(':', '') : '';
  // For UI convenience, the header links should use the same host you used to reach SCADA
  // (headless servers won't have a browser on localhost).
  const scheme = currentScheme || (els.scadaHmiScheme?.value || 'http');
  const host = currentHost || (els.scadaHmiHost?.value?.trim() || '127.0.0.1');
  const port = Number(els.scadaHmiPort?.value ?? 3000) || 3000;
  return `${scheme}://${host}:${port}`;
}

function opcbridgeUrlFromForm() {
  const currentHost = (window.location && window.location.hostname) ? String(window.location.hostname) : '';
  const currentScheme = (window.location && window.location.protocol) ? String(window.location.protocol).replace(':', '') : '';
  // For UI convenience, the header links should use the same host you used to reach SCADA.
  const scheme = currentScheme || (els.scadaOpcbridgeScheme?.value || 'http');
  const host = currentHost || (els.scadaOpcbridgeHost?.value?.trim() || '127.0.0.1');
  const port = Number(els.scadaOpcbridgePort?.value ?? 8080) || 8080;
  return `${scheme}://${host}:${port}`;
}

function refreshTopLinks() {
  const opcUrl = opcbridgeUrlFromForm();
  const hmiUrl = hmiUrlFromForm();
  if (els.topLinkOpcbridge) {
    els.topLinkOpcbridge.href = `${opcUrl}/`;
    els.topLinkOpcbridge.title = `${opcUrl}/`;
  }
  if (els.topLinkHmi) {
    els.topLinkHmi.href = `${hmiUrl}/`;
    els.topLinkHmi.title = `${hmiUrl}/`;
  }
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

  refreshTopLinks();
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
    renderWorkspaceTree();
    refreshTopLinks();
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
    refreshTopLinks();

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

  // Keep header links up-to-date while editing.
  [
    els.scadaOpcbridgeScheme, els.scadaOpcbridgeHost, els.scadaOpcbridgePort,
    els.scadaHmiScheme, els.scadaHmiHost, els.scadaHmiPort
  ].forEach((el) => el?.addEventListener?.('input', refreshTopLinks));
  [
    els.scadaOpcbridgeScheme, els.scadaHmiScheme
  ].forEach((el) => el?.addEventListener?.('change', refreshTopLinks));
}

// ---------------- opcbridge service (systemd) ----------------

function fillSvcForm(s) {
  if (!s) return;
  if (els.svcOpcbridgeBin) els.svcOpcbridgeBin.value = String(s.bin || '');
  if (els.svcOpcbridgeConfigDir) els.svcOpcbridgeConfigDir.value = String(s.config_dir || '');
  if (els.svcHttpEnabled) els.svcHttpEnabled.checked = Boolean(s.http_enabled);
  if (els.svcWsEnabled) els.svcWsEnabled.checked = Boolean(s.ws_enabled);
  if (els.svcOpcuaEnabled) els.svcOpcuaEnabled.checked = Boolean(s.opcua_enabled);
  if (els.svcMqttEnabled) els.svcMqttEnabled.checked = Boolean(s.mqtt_enabled);
  if (els.svcHttpPort) els.svcHttpPort.value = String(s.http_port ?? '');
  if (els.svcWsPort) els.svcWsPort.value = String(s.ws_port ?? '');
  if (els.svcOpcuaPort) els.svcOpcuaPort.value = String(s.opcua_port ?? '');
}

function readSvcForm() {
  return {
    bin: els.svcOpcbridgeBin?.value?.trim() || '',
    config_dir: els.svcOpcbridgeConfigDir?.value?.trim() || '',
    http_enabled: Boolean(els.svcHttpEnabled?.checked),
    ws_enabled: Boolean(els.svcWsEnabled?.checked),
    opcua_enabled: Boolean(els.svcOpcuaEnabled?.checked),
    mqtt_enabled: Boolean(els.svcMqttEnabled?.checked),
    http_port: Number(els.svcHttpPort?.value ?? 0) || 0,
    ws_port: Number(els.svcWsPort?.value ?? 0) || 0,
    opcua_port: Number(els.svcOpcuaPort?.value ?? 0) || 0
  };
}

async function loadSvcSettings() {
  setSvcStatus('Loading…');
  try {
    const data = await apiGet('/api/opcbridge/systemd');
    if (data?.enabled === false) {
      setSvcStatus('Systemd management disabled in opcbridge-scada.');
      return;
    }
    fillSvcForm(data?.settings);
    const p = data?.dropin_path ? ` (${data.dropin_path})` : '';
    setSvcStatus(data?.exists ? `Loaded from drop-in${p}.` : `No drop-in found${p}; showing defaults.`);
  } catch (err) {
    setSvcStatus(`Failed: ${err.message}`);
  }
}

async function applySvcSettings() {
  setSvcStatus('Applying…');
  try {
    const settings = readSvcForm();
    const resp = await apiPostJson('/api/opcbridge/systemd', { settings });
    if (!resp?.ok) throw new Error(resp?.error || 'Apply failed');
    setSvcStatus(`Applied. Restarted ${resp?.unit || 'opcbridge.service'}.`);
    restartRefreshLoop();
  } catch (err) {
    setSvcStatus(`Apply failed: ${err.message}`);
  }
}

function wireSvcUi() {
  els.svcReloadBtn?.addEventListener('click', loadSvcSettings);
  els.svcApplyBtn?.addEventListener('click', applySvcSettings);
}

async function uploadMqttCaCert() {
  setMqttCaStatus('Uploading…');
  try {
    const file = els.mqttCaFile?.files?.[0] || null;
    if (!file) throw new Error('Pick a ca.crt file first.');

    const buf = await file.arrayBuffer();
    const resp = await fetch('/api/opcbridge/cert/upload', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/x-pem-file' },
      body: buf
    });
    const data = await resp.json().catch(() => ({ ok: false, error: `HTTP ${resp.status}` }));
    if (!resp.ok || !data?.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
    setMqttCaStatus(data?.message || 'Uploaded.');
    await refreshMqttCaStatus();
  } catch (err) {
    setMqttCaStatus(`Upload failed: ${err.message}`);
  }
}

function downloadMqttCaCert() {
  // This is proxied by scada and uses the scada server's admin token.
  window.open('/api/opcbridge/config/cert/download', '_blank', 'noopener,noreferrer');
}

function wireMqttCaUi() {
  els.mqttCaUploadBtn?.addEventListener('click', uploadMqttCaCert);
  els.mqttCaDownloadBtn?.addEventListener('click', downloadMqttCaCert);
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
  return (
    (state.workspaceConnDirty && state.workspaceConnDirty.size > 0) ||
    (state.workspaceDeletePaths && state.workspaceDeletePaths.size > 0) ||
    Boolean(state.tagConfigDirty) ||
    Boolean(state.alarmsConfigDirty)
  );
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
    const deletes = [];
    if (state.workspaceDeletePaths && state.workspaceDeletePaths.size) {
      for (const p of state.workspaceDeletePaths.values()) deletes.push(String(p));
    }

    const tagEdits = {};
    if (state.tagConfigEdited && state.tagConfigEdited.size) {
      for (const [k, v] of state.tagConfigEdited.entries()) tagEdits[k] = v;
    }

    const payload = {
      ts_ms: Date.now(),
      conn_dirty: conn,
      conn_delete: deletes,
      tag_all: Array.isArray(state.tagConfigAll) ? state.tagConfigAll : [],
      tag_edits: tagEdits,
      tag_dirty: Boolean(state.tagConfigDirty),
      alarms_config: state.alarmsConfig || null,
      alarms_dirty: Boolean(state.alarmsConfigDirty)
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

    state.workspaceDeletePaths = new Set();
    if (Array.isArray(parsed.conn_delete)) {
      parsed.conn_delete.forEach((p) => {
        const rel = String(p || '').trim();
        if (rel) state.workspaceDeletePaths.add(rel);
      });
    }

    markTagsDirty(Boolean(parsed.tag_dirty));

    if (parsed.alarms_config && typeof parsed.alarms_config === 'object') {
      state.alarmsConfig = parsed.alarms_config;
    }
    state.alarmsConfigDirty = Boolean(parsed.alarms_dirty);

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
  state.pendingNewDevice = {};
  showWorkspacePanel('new_device');

  if (els.newDeviceHint) {
    els.newDeviceHint.textContent = 'Creating a new Device.';
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
  if (els.newTagMqttAllowed) els.newTagMqttAllowed.checked = false;
  if (els.newTagScaling) {
    els.newTagScaling.value = 'none';
    els.newTagScaling.onchange = () => applyScalingModeUi(els.newTagScaling, els.newTagScalingLinearRow);
    applyScalingModeUi(els.newTagScaling, els.newTagScalingLinearRow);
  }
  fillScaledDatatypeSelect(els.newTagScaledDatatype, '');
  if (els.newTagRawLow) els.newTagRawLow.value = '0';
  if (els.newTagRawHigh) els.newTagRawHigh.value = '100';
  if (els.newTagScaledLow) els.newTagScaledLow.value = '0';
  if (els.newTagScaledHigh) els.newTagScaledHigh.value = '100';
  if (els.newTagClampLow) els.newTagClampLow.checked = false;
  if (els.newTagClampHigh) els.newTagClampHigh.checked = false;

  [els.newTagScaling, els.newTagRawLow, els.newTagRawHigh, els.newTagScaledLow, els.newTagScaledHigh, els.newTagScaledDatatype, els.newTagClampLow, els.newTagClampHigh]
    .filter(Boolean)
    .forEach((e) => { e.disabled = !canEditConfig(); });

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
  const mqtt_command_allowed = Boolean(els.newTagMqttAllowed?.checked);
  const scalingRes = readLinearScalingFromUi({
    scalingEl: els.newTagScaling,
    rawLowEl: els.newTagRawLow,
    rawHighEl: els.newTagRawHigh,
    scaledLowEl: els.newTagScaledLow,
    scaledHighEl: els.newTagScaledHigh,
    scaledDatatypeEl: els.newTagScaledDatatype,
    clampLowEl: els.newTagClampLow,
    clampHighEl: els.newTagClampHigh,
  }, datatype);
  if (!scalingRes.ok) { setNewTagStatus(String(scalingRes.error || 'Invalid scaling settings.')); return; }

  const tag = { connection_id: cid, name, plc_tag_name, datatype, enabled, writable, mqtt_command_allowed };
  if (scan_ms != null) tag.scan_ms = scan_ms;
  if (scalingRes.scaling === 'linear') Object.assign(tag, scalingRes.fields || {});

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

function setWorkspaceItemStatus(msg) {
  if (els.workspaceItemStatus) els.workspaceItemStatus.textContent = String(msg || '');
}

function closeWorkspaceItemModal() {
  state.pendingWorkspaceItem = null;
  setWorkspaceItemStatus('');
  setEditDevStatus('');
  setEditTagStatus('');
  setEditAlarmStatus('');
  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';
  if (els.workspaceItemModal) els.workspaceItemModal.style.display = 'none';
}

function setEditDevStatus(msg) {
  if (els.editDevStatus) els.editDevStatus.textContent = String(msg || '');
}

function setEditTagStatus(msg) {
  if (els.editTagStatus) els.editTagStatus.textContent = String(msg || '');
}

function setEditAlarmStatus(msg) {
  if (els.editAlarmStatus) els.editAlarmStatus.textContent = String(msg || '');
}

function openWorkspaceItemModal(node) {
  if (!els.workspaceItemModal) return;
  if (!node) return;

  // Show immediately so any async loads (or errors) still present feedback.
  els.workspaceItemModal.style.display = 'flex';

  state.pendingWorkspaceItem = { id: String(node.id || '') };

  if (els.workspaceItemHint) els.workspaceItemHint.textContent = '';
  if (els.workspaceItemTbody) els.workspaceItemTbody.textContent = '';
  setWorkspaceItemStatus('');
  setEditDevStatus('');

  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'none';
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
    if (els.editDevId) els.editDevId.disabled = !canEditConfig();

    state.pendingWorkspaceItem = { id: String(node.id || ''), type: 'device', connection_id: connectionId, path: relPath };

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

    return;
  }

  if (type === 'tag') {
    if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'block';

    const conn = String(node.meta?.connection_id || '');
    const name = String(node.meta?.name || node.label || '');
    state.pendingWorkspaceItem = { id: String(node.id || ''), type: 'tag', connection_id: conn, name };

    if (els.workspaceItemHint) els.workspaceItemHint.textContent = `${conn}:${name}`;

    if (els.editTagConn) els.editTagConn.value = conn;
    if (els.editTagName) {
      els.editTagName.value = name;
      els.editTagName.disabled = !canEditConfig();
    }

    const row = getEffectiveTagsAll().find((tt) => String(tt?.connection_id || '') === conn && String(tt?.name || '') === name) || null;
    if (!row) {
      if (els.editTagPlc) els.editTagPlc.value = '';
      fillTagDatatypeSelect(els.editTagDatatype, 'bool');
      if (els.editTagScan) els.editTagScan.value = '';
      if (els.editTagEnabled) els.editTagEnabled.checked = true;
      if (els.editTagWritable) els.editTagWritable.checked = false;
      if (els.editTagMqttAllowed) els.editTagMqttAllowed.checked = false;
      if (els.editTagScaling) els.editTagScaling.value = 'none';
      fillScaledDatatypeSelect(els.editTagScaledDatatype, '');
      if (els.editTagRawLow) els.editTagRawLow.value = '0';
      if (els.editTagRawHigh) els.editTagRawHigh.value = '100';
      if (els.editTagScaledLow) els.editTagScaledLow.value = '0';
      if (els.editTagScaledHigh) els.editTagScaledHigh.value = '100';
      if (els.editTagClampLow) els.editTagClampLow.checked = false;
      if (els.editTagClampHigh) els.editTagClampHigh.checked = false;
      if (els.editTagSaveBtn) els.editTagSaveBtn.disabled = true;
      setEditTagStatus('Tag not found in config. Refresh tag config.');
    } else {
      if (els.editTagPlc) els.editTagPlc.value = String(row?.plc_tag_name || '');
      fillTagDatatypeSelect(els.editTagDatatype, String(row?.datatype || 'bool'));
      if (els.editTagScan) els.editTagScan.value = (row?.scan_ms == null) ? '' : String(row.scan_ms);
      if (els.editTagEnabled) els.editTagEnabled.checked = (row?.enabled !== false);
      if (els.editTagWritable) els.editTagWritable.checked = (row?.writable === true);
      if (els.editTagMqttAllowed) els.editTagMqttAllowed.checked = (row?.mqtt_command_allowed === true);
      if (els.editTagScaling) els.editTagScaling.value = String(row?.scaling || 'none').trim().toLowerCase() || 'none';
      fillScaledDatatypeSelect(els.editTagScaledDatatype, row?.scaled_datatype ?? '');
      if (els.editTagRawLow) els.editTagRawLow.value = (row?.raw_low == null) ? '0' : String(row.raw_low);
      if (els.editTagRawHigh) els.editTagRawHigh.value = (row?.raw_high == null) ? '100' : String(row.raw_high);
      if (els.editTagScaledLow) els.editTagScaledLow.value = (row?.scaled_low == null) ? '0' : String(row.scaled_low);
      if (els.editTagScaledHigh) els.editTagScaledHigh.value = (row?.scaled_high == null) ? '100' : String(row.scaled_high);
      if (els.editTagClampLow) els.editTagClampLow.checked = (row?.clamp_low === true);
      if (els.editTagClampHigh) els.editTagClampHigh.checked = (row?.clamp_high === true);
      if (els.editTagSaveBtn) els.editTagSaveBtn.disabled = false;
      setEditTagStatus('');
    }

    if (els.editTagScaling) {
      els.editTagScaling.onchange = () => applyScalingModeUi(els.editTagScaling, els.editTagScalingLinearRow);
      applyScalingModeUi(els.editTagScaling, els.editTagScalingLinearRow);
      els.editTagScaling.disabled = !canEditConfig();
    }
    [els.editTagRawLow, els.editTagRawHigh, els.editTagScaledLow, els.editTagScaledHigh, els.editTagScaledDatatype, els.editTagClampLow, els.editTagClampHigh]
      .filter(Boolean)
      .forEach((e) => { e.disabled = !canEditConfig(); });

    els.editTagPlc?.focus?.();
    return;
  }

  if (type === 'alarm') {
    if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'block';

    const alarmId = String(node.meta?.alarm_id || '').trim();
    state.pendingWorkspaceItem = { id: String(node.id || ''), type: 'alarm', mode: 'edit', alarm_id: alarmId };
    if (els.workspaceItemHint) els.workspaceItemHint.textContent = alarmId ? `Alarm: ${alarmId}` : 'Alarm';

    const cfg = state.alarmsConfig || { alarms: [], groups: [] };
    const existing = (Array.isArray(cfg.alarms) ? cfg.alarms : []).find((a) => String(a?.id || '').trim() === alarmId) || null;

    setEditAlarmStatus('');

    if (els.editAlarmId) {
      els.editAlarmId.value = existing ? String(existing.id || '') : alarmId;
      els.editAlarmId.disabled = true; // immutable
    }
    if (els.editAlarmName) els.editAlarmName.value = existing ? String(existing.name || '') : String(node.label || '');
    if (els.editAlarmGroup) els.editAlarmGroup.value = existing ? String(existing.group || '') : String(node.meta?.group || '');
    if (els.editAlarmSite) els.editAlarmSite.value = existing ? String(existing.site || '') : String(node.meta?.site || '');

    // Fill connection options from loaded connections
    if (els.editAlarmConn) {
      const conns = state.connFiles.slice().map((f) => connectionIdForConnFilePath(String(f?.path || ''))).filter(Boolean);
      conns.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
      els.editAlarmConn.textContent = '';
      conns.forEach((cid) => {
        const opt = document.createElement('option');
        opt.value = cid;
        opt.textContent = cid;
        els.editAlarmConn.appendChild(opt);
      });
      const want = existing ? String(existing.connection_id || '') : String(node.meta?.source?.connection_id || '');
      if (want) els.editAlarmConn.value = want;
    }

    const refreshTagSelect = () => {
      const cid = String(els.editAlarmConn?.value || '').trim();
      if (!els.editAlarmTag) return;
      els.editAlarmTag.textContent = '';
      const tags = getEffectiveTagsAll().filter((t) => String(t?.connection_id || '') === cid);
      tags.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
      tags.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = String(t?.name || '');
        opt.textContent = String(t?.name || '');
        els.editAlarmTag.appendChild(opt);
      });
      const wantTag = existing ? String(existing.tag_name || '') : String(node.meta?.source?.tag || '');
      if (wantTag) els.editAlarmTag.value = wantTag;
    };

    if (els.editAlarmConn) els.editAlarmConn.onchange = refreshTagSelect;
    refreshTagSelect();

    if (els.editAlarmType) els.editAlarmType.value = existing ? String(existing.type || 'high') : 'high';
    if (els.editAlarmEnabled) els.editAlarmEnabled.checked = existing ? (existing.enabled !== false) : true;
    if (els.editAlarmSeverity) els.editAlarmSeverity.value = existing && existing.severity != null ? String(existing.severity) : '500';
    if (els.editAlarmThreshold) els.editAlarmThreshold.value = existing && existing.threshold != null ? String(existing.threshold) : '';
    if (els.editAlarmHysteresis) els.editAlarmHysteresis.value = existing && existing.hysteresis != null ? String(existing.hysteresis) : '';
    if (els.editAlarmMsgOn) els.editAlarmMsgOn.value = existing ? String(existing.message_on_active || '') : '';
    if (els.editAlarmMsgOff) els.editAlarmMsgOff.value = existing ? String(existing.message_on_return || '') : '';

    (els.editAlarmName || els.editAlarmGroup || els.editAlarmSite || els.editAlarmConn)?.focus?.();
    return;
  }

  // Generic (read-only) properties
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'block';

  if (type === 'tags_folder') {
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

function openNewAlarmModal({ group, site } = {}) {
  if (!els.workspaceItemModal) return;

  state.pendingWorkspaceItem = { id: 'alarm:new', type: 'alarm', mode: 'new', alarm_id: '' };
  if (els.workspaceItemHint) els.workspaceItemHint.textContent = 'New Alarm';
  if (els.workspaceItemTbody) els.workspaceItemTbody.textContent = '';
  setWorkspaceItemStatus('');
  setEditAlarmStatus('');

  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'block';

  const titleEl = document.getElementById('workspaceItemModalTitle');
  if (titleEl) titleEl.textContent = 'New Alarm';

  if (els.editAlarmId) { els.editAlarmId.value = ''; els.editAlarmId.disabled = false; }
  if (els.editAlarmName) els.editAlarmName.value = '';
  if (els.editAlarmGroup) els.editAlarmGroup.value = String(group || '');
  if (els.editAlarmSite) els.editAlarmSite.value = String(site || '');

  // Connections
  if (els.editAlarmConn) {
    const conns = state.connFiles.slice().map((f) => connectionIdForConnFilePath(String(f?.path || ''))).filter(Boolean);
    conns.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
    els.editAlarmConn.textContent = '';
    conns.forEach((cid) => {
      const opt = document.createElement('option');
      opt.value = cid;
      opt.textContent = cid;
      els.editAlarmConn.appendChild(opt);
    });
    if (els.editAlarmConn.options.length) els.editAlarmConn.value = String(els.editAlarmConn.options[0].value || '');
  }

  const refreshTags = () => {
    const cid = String(els.editAlarmConn?.value || '').trim();
    if (!els.editAlarmTag) return;
    els.editAlarmTag.textContent = '';
    const tags = getEffectiveTagsAll().filter((t) => String(t?.connection_id || '') === cid);
    tags.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
    tags.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = String(t?.name || '');
      opt.textContent = String(t?.name || '');
      els.editAlarmTag.appendChild(opt);
    });
    if (els.editAlarmTag.options.length) els.editAlarmTag.value = String(els.editAlarmTag.options[0].value || '');
  };
  if (els.editAlarmConn) els.editAlarmConn.onchange = refreshTags;
  refreshTags();

  if (els.editAlarmType) els.editAlarmType.value = 'high';
  if (els.editAlarmEnabled) els.editAlarmEnabled.checked = true;
  if (els.editAlarmSeverity) els.editAlarmSeverity.value = '500';
  if (els.editAlarmThreshold) els.editAlarmThreshold.value = '';
  if (els.editAlarmHysteresis) els.editAlarmHysteresis.value = '';
  if (els.editAlarmMsgOn) els.editAlarmMsgOn.value = '';
  if (els.editAlarmMsgOff) els.editAlarmMsgOff.value = '';

  els.workspaceItemModal.style.display = 'flex';
  els.editAlarmId?.focus?.();
}

async function saveEditedTagFromModal() {
  const conn = String(state.pendingWorkspaceItem?.connection_id || '').trim();
  const name = String(state.pendingWorkspaceItem?.name || '').trim();
  if (!conn || !name) return;

  const idx = state.tagConfigAll.findIndex((t) => String(t?.connection_id || '') === conn && String(t?.name || '') === name);
  if (idx < 0) { setEditTagStatus('Tag not found in config (try Refresh).'); return; }

  const newName = String(els.editTagName?.value || '').trim();
  if (!newName) { setEditTagStatus('Tag name is required.'); return; }
  if (!canEditConfig() && newName !== name) { setEditTagStatus('Login required to rename tags.'); return; }

  const plc_tag_name = String(els.editTagPlc?.value || '').trim();
  const datatype = String(els.editTagDatatype?.value || '').trim();
  const scanRaw = String(els.editTagScan?.value || '').trim();
  const enabled = Boolean(els.editTagEnabled?.checked);
  const writable = Boolean(els.editTagWritable?.checked);
  const mqtt_command_allowed = Boolean(els.editTagMqttAllowed?.checked);
  const scalingRes = readLinearScalingFromUi({
    scalingEl: els.editTagScaling,
    rawLowEl: els.editTagRawLow,
    rawHighEl: els.editTagRawHigh,
    scaledLowEl: els.editTagScaledLow,
    scaledHighEl: els.editTagScaledHigh,
    scaledDatatypeEl: els.editTagScaledDatatype,
    clampLowEl: els.editTagClampLow,
    clampHighEl: els.editTagClampHigh,
  }, datatype);

  if (!plc_tag_name) { setEditTagStatus('PLC Tag is required.'); return; }
  if (!datatype) { setEditTagStatus('Datatype is required.'); return; }
  if (!scalingRes.ok) { setEditTagStatus(String(scalingRes.error || 'Invalid scaling settings.')); return; }

  // If renaming, update the base row so the new key is part of the canonical tag list.
  const oldKey = `${conn}::${name}`;
  if (newName !== name) {
    const oldNodeId = `tag:${conn}::${name}`;
    const newNodeId = `tag:${conn}::${newName}`;
    const exists = getEffectiveTagsAll().some((t) => {
      const key = makeTagKey(t);
      return key && key !== oldKey && key === `${conn}::${newName}`;
    });
    if (exists) { setEditTagStatus(`Tag '${conn}:${newName}' already exists.`); return; }
    state.tagConfigAll[idx] = { ...(state.tagConfigAll[idx] || {}), name: newName };
    state.tagConfigEdited?.delete?.(oldKey);
    if (state.pendingWorkspaceItem) state.pendingWorkspaceItem.name = newName;
    if (String(state.selectedNodeId || '') === oldNodeId) state.selectedNodeId = newNodeId;
    if (state.workspaceChildrenSel && state.workspaceChildrenSel.size && state.workspaceChildrenSel.has(oldKey)) {
      state.workspaceChildrenSel.delete(oldKey);
      state.workspaceChildrenSel.add(`${conn}::${newName}`);
    }
  }

  const next = { ...(state.tagConfigAll[idx] || {}) };
  next.plc_tag_name = plc_tag_name;
  next.datatype = datatype;
  next.enabled = enabled;
  next.writable = writable;
  next.mqtt_command_allowed = mqtt_command_allowed;
  if (scanRaw === '') delete next.scan_ms;
  else next.scan_ms = Math.max(0, Math.trunc(Number(scanRaw) || 0));

  delete next.scaling;
  delete next.raw_low;
  delete next.raw_high;
  delete next.scaled_low;
  delete next.scaled_high;
  delete next.clamp_low;
  delete next.clamp_high;
  delete next.scaled_datatype;
  if (scalingRes.scaling === 'linear') Object.assign(next, scalingRes.fields || {});

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

async function saveEditedAlarmFromModal() {
  const mode = String(state.pendingWorkspaceItem?.mode || 'edit');
  const alarm_id = String(state.pendingWorkspaceItem?.alarm_id || '').trim();

  const id = String(els.editAlarmId?.value || alarm_id || '').trim();
  const name = String(els.editAlarmName?.value || '').trim();
  const group = String(els.editAlarmGroup?.value || '').trim();
  const site = String(els.editAlarmSite?.value || '').trim();
  const connection_id = String(els.editAlarmConn?.value || '').trim();
  const tag_name = String(els.editAlarmTag?.value || '').trim();
  const type = String(els.editAlarmType?.value || '').trim();
  const enabled = Boolean(els.editAlarmEnabled?.checked);
  const severity = Math.max(0, Math.min(1000, Math.trunc(Number(els.editAlarmSeverity?.value ?? 500) || 500)));
  const thresholdRaw = String(els.editAlarmThreshold?.value ?? '').trim();
  const hysteresisRaw = String(els.editAlarmHysteresis?.value ?? '').trim();
  const message_on_active = String(els.editAlarmMsgOn?.value || '').trim();
  const message_on_return = String(els.editAlarmMsgOff?.value || '').trim();

  if (!id) { setEditAlarmStatus('Alarm ID is required.'); return; }
  if (!connection_id) { setEditAlarmStatus('Connection is required.'); return; }
  if (!tag_name) { setEditAlarmStatus('Tag is required.'); return; }
  if (!type) { setEditAlarmStatus('Type is required.'); return; }

  const cfg = state.alarmsConfig || { alarms: [], groups: [] };
  if (!Array.isArray(cfg.alarms)) cfg.alarms = [];

  const idx = cfg.alarms.findIndex((a) => String(a?.id || '').trim() === id);
  if (mode === 'new' && idx >= 0) { setEditAlarmStatus('Alarm ID already exists.'); return; }
  if (mode === 'edit' && !alarm_id) { setEditAlarmStatus('Missing alarm id.'); return; }

  const next = {
    id,
    name: name || id,
    group,
    site,
    connection_id,
    tag_name,
    type,
    enabled,
    severity,
    message_on_active,
    message_on_return
  };
  if (thresholdRaw !== '') next.threshold = Number(thresholdRaw);
  if (hysteresisRaw !== '') next.hysteresis = Number(hysteresisRaw);

  // Ensure folder nodes exist if user filled group/site.
  if (group || site) {
    try { ensureGroupSiteInConfig(cfg, group, site); } catch { /* ignore */ }
  }

  if (mode === 'new') {
    cfg.alarms.push(next);
  } else {
    // Update by alarm_id (original id), allowing id rename? (Not currently; keep id immutable.)
    const origId = alarm_id;
    const origIdx = cfg.alarms.findIndex((a) => String(a?.id || '').trim() === origId);
    if (origIdx < 0) { setEditAlarmStatus('Alarm not found in config (try Refresh).'); return; }
    next.id = origId;
    cfg.alarms[origIdx] = { ...(cfg.alarms[origIdx] || {}), ...next };
  }

  setEditAlarmStatus('Saving…');
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  closeWorkspaceItemModal();
  renderWorkspaceTree();
}

async function saveEditedAlarmFromModalReload() {
  await saveEditedAlarmFromModal();
  try { await opcbridgeReload(); } catch { /* ignore */ }
  try { await refreshAll(); } catch { /* ignore */ }
}

async function saveEditedDeviceFromModal() {
  const nodeId = String(state.pendingWorkspaceItem?.id || '');
  const node = findWorkspaceNodeById(state.workspaceTreeRoot, nodeId);
  if (!node || String(node.type || '') !== 'device') return;

  const relPath = String(state.pendingWorkspaceItem?.path || node.meta?.path || '').trim();
  if (!relPath) { setEditDevStatus('Missing device config path.'); return; }

  const oldId = String(state.pendingWorkspaceItem?.connection_id || node.meta?.connection_id || node.meta?.id || '').trim();
  const newId = String(els.editDevId?.value || '').trim();
  if (!newId) { setEditDevStatus('Device ID is required.'); return; }
  if (!/^[A-Za-z0-9._-]+$/.test(newId)) {
    setEditDevStatus('Device ID may only contain letters, digits, ".", "_", and "-".');
    return;
  }
  const driver = String(els.editDevDriver?.value || '').trim() || 'ab_eip';
  const gateway = String(els.editDevGateway?.value || '').trim();
  const pathVal = String(els.editDevPath?.value || '').trim() || '1,0';
  const slot = Number(String(els.editDevSlot?.value || '0').trim() || '0') || 0;
  const plc_type = String(els.editDevPlcType?.value || '').trim() || 'lgx';

  const existing = state.connObjCache?.get?.(relPath) || {};
  const description = String(existing?.description || '').trim();
  const obj = { id: newId, description, driver, gateway, path: pathVal, slot, plc_type };

  let targetRelPath = relPath;
  if (oldId && newId !== oldId) {
    const newRelPath = `connections/${newId}.json`;

    const collides = (state.connFiles || []).some((f) => {
      const p = String(f?.path || '');
      if (!p) return false;
      if (p === relPath) return false;
      const cid = connectionIdForConnFilePath(p);
      return String(cid || '') === newId || p === newRelPath;
    });
    if (collides) { setEditDevStatus(`Device '${newId}' already exists.`); return; }

    if (!state.workspaceDeletePaths) state.workspaceDeletePaths = new Set();
    state.workspaceDeletePaths.add(relPath);
    state.workspaceDeletePaths.add(`tags/${oldId}.json`);

    state.connFiles = (state.connFiles || []).filter((f) => String(f?.path || '') !== relPath);
    if (!state.connFiles.some((f) => String(f?.path || '') === newRelPath)) {
      state.connFiles = state.connFiles.concat([{ kind: 'connection', path: newRelPath }]);
    }
    state.connObjCache?.delete?.(relPath);

    // Update tags to the new connection_id.
    state.tagConfigAll = (Array.isArray(state.tagConfigAll) ? state.tagConfigAll : []).map((t) => {
      if (String(t?.connection_id || '') !== oldId) return t;
      return { ...(t || {}), connection_id: newId };
    });
    if (state.tagConfigEdited && state.tagConfigEdited.size) {
      const nextEdits = new Map();
      for (const [k, v] of state.tagConfigEdited.entries()) {
        const key = String(k || '');
        const sep = key.indexOf('::');
        if (sep < 0) { nextEdits.set(key, v); continue; }
        const cid = key.slice(0, sep);
        const name = key.slice(sep + 2);
        if (cid !== oldId) { nextEdits.set(key, v); continue; }
        nextEdits.set(`${newId}::${name}`, { ...(v || {}), connection_id: newId });
      }
      state.tagConfigEdited = nextEdits;
    }
    markTagsDirty(true);

    // Update alarms config to the new connection_id (staged with Save/Save+Reload).
    if (state.alarmsConfig && Array.isArray(state.alarmsConfig.alarms)) {
      state.alarmsConfig = {
        ...(state.alarmsConfig || {}),
        alarms: state.alarmsConfig.alarms.map((a) => {
          if (String(a?.connection_id || '') !== oldId) return a;
          return { ...(a || {}), connection_id: newId };
        })
      };
      state.alarmsConfigDirty = true;
    }

    targetRelPath = newRelPath;
    state.selectedNodeId = `device:${newRelPath}`;
  }

  if (!state.workspaceConnDirty) state.workspaceConnDirty = new Map();
  state.workspaceConnDirty.set(targetRelPath, obj);
  if (state.connObjCache) state.connObjCache.set(targetRelPath, obj);

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

  els.editAlarmCancelBtn?.addEventListener('click', close);
  els.editAlarmSaveBtn?.addEventListener('click', saveEditedAlarmFromModalReload);
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

async function createNewDeviceFromWorkspace() {
  const connection_id = String(els.newDevId?.value || '').trim();
  if (!connection_id) { setNewDevStatus('Device ID is required.'); return; }

  const driver = String(els.newDevDriver?.value || '').trim() || 'ab_eip';
  const gateway = String(els.newDevGateway?.value || '').trim();
  const pathVal = String(els.newDevPath?.value || '').trim() || '1,0';
  const slot = Number(String(els.newDevSlot?.value || '0').trim() || '0') || 0;
  const plc_type = String(els.newDevPlcType?.value || '').trim() || 'lgx';

  // opcbridge connection config requires `id` (not `connection_id`).
  const obj = { id: connection_id, description: '', driver, gateway, path: pathVal, slot, plc_type };
  const relPath = `connections/${connection_id}.json`;

  const exists = state.connFiles.some((f) => String(f?.path || '') === relPath);
  if (exists) { setNewDevStatus(`Device '${connection_id}' already exists.`); return; }

  if (!state.workspaceConnDirty) state.workspaceConnDirty = new Map();
  state.workspaceConnDirty.set(relPath, obj);
  if (state.connObjCache) state.connObjCache.set(String(relPath), obj);
  state.connFiles = state.connFiles.concat([{ kind: 'connection', path: relPath }]);

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

async function createNewConnectionInteractive(opts = {}) {
  setTab('workspace');
  showWorkspaceNewDeviceForm();
}


async function deleteDeviceById(connectionId, pathRel) {
  const cid = String(connectionId || '').trim();
  const relPath = String(pathRel || '').trim();
  if (!cid || !relPath) return;

  if (!window.confirm(`Delete device '${cid}'? This deletes ${relPath} and removes its tags from config.`)) return;

  try {
    await apiPostJson('/api/opcbridge/config/delete', { path: relPath });

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

async function addAlarmGroupInteractive() {
  const name = normalizeAlarmGroupName(window.prompt('New alarm group name:', '') || '');
  if (!name) return;
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    upsertAlarmGroup(cfg, name);
    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
    renderWorkspaceTree();
  } catch (err) {
    window.alert(`Failed to create alarm group: ${err.message}`);
  }
}

async function addAlarmSiteInteractive(groupName) {
  const g = normalizeAlarmGroupName(groupName);
  if (!g) return;
  const site = normalizeAlarmSiteName(window.prompt(`New site name for group '${g}':`, '') || '');
  if (!site) return;
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    ensureGroupSiteInConfig(cfg, g, site);
    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
    renderWorkspaceTree();
  } catch (err) {
    window.alert(`Failed to create site: ${err.message}`);
  }
}

async function deleteAlarmById(alarmId) {
  const id = String(alarmId || '').trim();
  if (!id) return;
  if (!window.confirm(`Delete alarm '${id}'?`)) return;
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    const before = Array.isArray(cfg?.alarms) ? cfg.alarms.length : 0;
    cfg.alarms = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).filter((a) => String(a?.id || '').trim() !== id);
    const after = cfg.alarms.length;
    if (after === before) return;
    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
    await opcbridgeReload().catch(() => {});
    await refreshAll().catch(() => {});
    renderWorkspaceTree();
  } catch (err) {
    window.alert(`Failed to delete alarm: ${err.message}`);
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
    connectivity.children.push(deviceNode);
  });

  // Build alarms tree: Group -> Site -> Alarm (config-driven)
  const cfg = state.alarmsConfig || null;
  const cfgAlarms = Array.isArray(cfg?.alarms) ? cfg.alarms : [];
  const cfgGroups = Array.isArray(cfg?.groups) ? cfg.groups : [];
  const runtime = Array.isArray(state.alarmsAll) ? state.alarmsAll : [];
  const runtimeById = new Map();
  runtime.forEach((a) => {
    const id = String(a?.alarm_id || a?.id || '').trim();
    if (id) runtimeById.set(id, a);
  });
  const safeKey = (s) => {
    const k = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return k || 'none';
  };

  const groups = new Map();

  // Add configured group/site folders (even if empty).
  cfgGroups.forEach((g) => {
    const groupName = String(g?.name || '').trim();
    if (!groupName) return;
    const groupId = `alarm_group:${safeKey(groupName)}`;
    let groupNode = groups.get(groupId);
    if (!groupNode) {
      groupNode = { id: groupId, type: 'alarm_group', label: groupName, meta: { group: groupName }, children: [] };
      groups.set(groupId, groupNode);
    }
    const sites = Array.isArray(g?.sites) ? g.sites : [];
    sites.forEach((s) => {
      const siteName = String(s?.name || '').trim();
      if (!siteName) return;
      const siteId = `${groupId}:site:${safeKey(siteName)}`;
      if ((groupNode.children || []).some((n) => String(n?.id || '') === siteId)) return;
      groupNode.children.push({ id: siteId, type: 'alarm_site', label: siteName, meta: { group: groupName, site: siteName }, children: [] });
    });
  });

  // Place alarms into folders.
  cfgAlarms.forEach((a) => {
    const alarm_id = String(a?.id || '').trim();
    if (!alarm_id) return;

    const groupRaw = String(a?.group || '').trim();
    const siteRaw = String(a?.site || '').trim();
    const groupLabel = groupRaw || '(No group)';
    const siteLabel = siteRaw || '(No site)';

    const groupId = `alarm_group:${safeKey(groupLabel)}`;
    let groupNode = groups.get(groupId);
    if (!groupNode) {
      groupNode = { id: groupId, type: 'alarm_group', label: groupLabel, meta: { group: groupRaw }, children: [] };
      groups.set(groupId, groupNode);
    }

    const siteId = `${groupId}:site:${safeKey(siteLabel)}`;
    let siteNode = (groupNode.children || []).find((n) => String(n?.id || '') === siteId) || null;
    if (!siteNode) {
      siteNode = { id: siteId, type: 'alarm_site', label: siteLabel, meta: { group: groupRaw, site: siteRaw }, children: [] };
      groupNode.children.push(siteNode);
    }

    const runtimeRow = runtimeById.get(alarm_id) || null;
    const name = String(a?.name || alarm_id).trim() || alarm_id;
    const sev = (a?.severity == null) ? '' : Number(a.severity);
    const enabled = (a?.enabled !== false);
    const active = Boolean(runtimeRow?.active);
    const acked = Boolean(runtimeRow?.acked);
    const srcConn = String(a?.connection_id || '').trim();
    const srcTag = String(a?.tag_name || '').trim();
    const message = String(runtimeRow?.message || '').trim();

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

  if (!cfgAlarms.length && !cfgGroups.length) {
    alarmsRoot.children.push({ id: 'hint:no_alarms', type: 'hint', label: '(no alarms configured)', children: [] });
  }

  const groupNodes = Array.from(groups.values()).sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || '')));
  groupNodes.forEach((g) => {
    g.children = (g.children || []).slice().sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || '')));
    g.children.forEach((s) => {
      s.children = (s.children || []).slice().sort((a, b) => Number(b?.meta?.severity || 0) - Number(a?.meta?.severity || 0));
    });
    alarmsRoot.children.push(g);
  });

  return root;
}

function renderTreeNode(node, container) {
  const canExpand = ['project', 'folder', 'device', 'alarms_root', 'alarm_group', 'alarm_site'].includes(String(node.type || ''));
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

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Right-click also selects the node and updates the right pane.
    state.selectedNodeId = node.id;
    renderWorkspaceTree();

    if (node.type === 'project') return;

    const items = [];

    if (node.type === 'folder' && node.id === 'folder:connectivity') {
      items.push({ label: 'Add Device…', onClick: () => createNewConnectionInteractive() });
      items.push({ label: 'Download CSV', onClick: () => downloadConnectivityCsv() });
      items.push({ label: 'Upload CSV…', onClick: () => importDevicesCsvIntoWorkspace().catch((err) => window.alert(`CSV import failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'alarms_root') {
      items.push({ label: 'Add Group…', onClick: () => addAlarmGroupInteractive() });
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal() });
      items.push('sep');
    }

    if (node.type === 'alarm_group') {
      items.push({ label: 'Add Site…', onClick: () => addAlarmSiteInteractive(String(node.meta?.group || node.label || '')) });
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal({ group: String(node.meta?.group || node.label || '') }) });
      items.push('sep');
    }

    if (node.type === 'alarm_site') {
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal({ group: String(node.meta?.group || ''), site: String(node.meta?.site || '') }) });
      items.push('sep');
    }

    if (node.type === 'alarm') {
      const aid = String(node.meta?.alarm_id || '').trim();
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'Delete Alarm…', onClick: () => deleteAlarmById(aid) });
      items.push('sep');
    }

    if (node.type === 'device') {
      const cid = String(node.meta?.connection_id || '').trim();
      const relPath = String(node.meta?.path || '').trim();
      items.push({ label: 'Add Tag…', onClick: () => showNewTagModal(cid) });
      items.push({ label: 'Download CSV', onClick: () => downloadDeviceTagsCsv(cid) });
      items.push({ label: 'Upload CSV…', onClick: () => importTagsCsvIntoWorkspace(cid).catch((err) => window.alert(`CSV import failed: ${err.message}`)) });
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'Delete Device…', onClick: () => deleteDeviceById(cid, relPath) });
      items.push('sep');
    }

    if (node.type === 'tag') {
      const cid = String(node.meta?.connection_id || '').trim();
      const name = String(node.meta?.name || node.label || '').trim();
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'Delete Tag…', onClick: () => deleteTagById(cid, name) });
      items.push('sep');
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

  // When connectivity is selected, list its devices with device fields.
  const showDeviceCols = isConnectivity;

  // When a device is selected, list its tags. Clicking a tag in the tree should not change the right pane.
  const showTagCols = isDevice || isTag;

  const columns = [];
  const addCol = (key, label, sortable = false) => columns.push({ key, label, sortable });
  addCol('name', 'Name', true);
  if (showDeviceCols) {
    addCol('description', 'Description', true);
    addCol('driver', 'Driver', true);
    addCol('gateway', 'Gateway', true);
    addCol('path', 'Path', true);
    addCol('slot', 'Slot', true);
    addCol('plc_type', 'PLC Type', true);
  }
  if (showTagCols) {
    addCol('plc_tag_name', 'PLC Tag', true);
    addCol('datatype', 'Datatype', true);
    addCol('scan_ms', 'Scan (ms)', true);
    addCol('enabled', 'Enabled', true);
    addCol('writable', 'Writable', true);
  }

  const colCount = columns.length;

  state.workspaceRenderSeq = (Number(state.workspaceRenderSeq || 0) + 1) || 1;
  const seq = state.workspaceRenderSeq;

  const connectionId = String(node.meta?.connection_id || '').trim();

  let tagRows = [];
  if (showTagCols && connectionId) {
    tagRows = getEffectiveTagsAll()
      .filter((tt) => String(tt?.connection_id || '') === connectionId)
      .slice();
  }

  const rowsToRender = showTagCols ? tagRows : children;

  const rootKey = showTagCols ? `tags:${connectionId || ''}` : `children:${String(node.id || '')}`;
  if (state.workspaceChildrenSelRoot !== rootKey) {
    state.workspaceChildrenSelRoot = rootKey;
    state.workspaceChildrenSel = new Set();
    state.workspaceChildrenLastIndex = -1;
    state.workspaceChildrenSort = showTagCols ? { key: 'name', dir: 'asc' } : { key: 'name', dir: 'asc' };
  }

  const getComparable = (row, key) => {
    if (!row) return '';
    const k = String(key || '');
    if (showTagCols) {
      if (k === 'name') return String(row?.name || '');
      if (k === 'plc_tag_name') return String(row?.plc_tag_name || '');
      if (k === 'datatype') return String(row?.datatype || '');
      if (k === 'scan_ms') return (row?.scan_ms == null) ? -1 : Number(row.scan_ms);
      if (k === 'enabled') return (row?.enabled === false) ? 0 : 1;
      if (k === 'writable') return (row?.writable === true) ? 1 : 0;
      return '';
    }

    // device rows are tree nodes; use cached connection object where possible
    const label = String(row?.label || row?.id || '');
    if (k === 'name') return label;
    const pathRel = String(row?.meta?.path || '').trim();
    const obj = pathRel ? state.connObjCache?.get?.(pathRel) : null;
    if (!obj) return '';
    if (k === 'description') return String(obj?.description || '');
    if (k === 'driver') return labelForDriver(obj?.driver);
    if (k === 'gateway') return String(obj?.gateway || '');
    if (k === 'path') return String(obj?.path || '');
    if (k === 'slot') return (obj?.slot == null) ? '' : String(obj.slot);
    if (k === 'plc_type') return labelForPlcType(obj?.plc_type || obj?.plcType || '');
    return '';
  };

  const sortRows = (arr) => {
    const s = state.workspaceChildrenSort || { key: 'name', dir: 'asc' };
    const dir = (s.dir === 'desc') ? -1 : 1;
    const key = String(s.key || 'name');
    return arr.slice().sort((a, b) => {
      const va = getComparable(a, key);
      const vb = getComparable(b, key);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  };

  const rowsSorted = columns.some((c) => c.sortable) ? sortRows(rowsToRender) : rowsToRender;

  // Header
  if (els.workspaceChildrenTable) {
    const headRow = els.workspaceChildrenTable.querySelector('thead tr');
    if (headRow) {
      headRow.textContent = '';
      columns.forEach((c) => {
        const th = document.createElement('th');
        th.textContent = c.label;
        if (c.sortable) {
          th.classList.add('sortable');
          th.title = 'Sort';
          th.addEventListener('click', () => {
            const cur = state.workspaceChildrenSort || { key: 'name', dir: 'asc' };
            const nextKey = String(c.key || 'name');
            const nextDir = (cur.key === nextKey && cur.dir === 'asc') ? 'desc' : 'asc';
            state.workspaceChildrenSort = { key: nextKey, dir: nextDir };
            renderWorkspaceDetails(node);
          });
        }
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

  const selectKeyForRow = (row) => {
    if (showTagCols) return makeTagKey(row);
    return String(row?.id || '');
  };

  const clearSelection = () => {
    state.workspaceChildrenSel = new Set();
    state.workspaceChildrenLastIndex = -1;
  };

  const applySelectionClass = () => {
    const keys = state.workspaceChildrenSel || new Set();
    const trs = Array.from(els.workspaceChildrenTbody.querySelectorAll('tr[data-row-key]'));
    trs.forEach((r) => r.classList.toggle('is-selected', keys.has(String(r.dataset.rowKey || ''))));
  };

  const handleRowClick = (e, idx, key) => {
    if (!showTagCols) {
      clearSelection();
      state.workspaceChildrenSel.add(key);
      state.workspaceChildrenLastIndex = idx;
      applySelectionClass();
      return;
    }

    const multi = e.ctrlKey || e.metaKey;
    const range = e.shiftKey && state.workspaceChildrenLastIndex >= 0;
    const keys = state.workspaceChildrenSel || new Set();

    if (range) {
      const start = Math.min(state.workspaceChildrenLastIndex, idx);
      const end = Math.max(state.workspaceChildrenLastIndex, idx);
      const toSelect = [];
      const trs = Array.from(els.workspaceChildrenTbody.querySelectorAll('tr[data-row-key]'));
      for (let i = start; i <= end; i++) {
        const k = String(trs[i]?.dataset?.rowKey || '');
        if (k) toSelect.push(k);
      }
      if (!multi) keys.clear();
      toSelect.forEach((k) => keys.add(k));
    } else if (multi) {
      if (keys.has(key)) keys.delete(key);
      else keys.add(key);
      state.workspaceChildrenLastIndex = idx;
    } else {
      keys.clear();
      keys.add(key);
      state.workspaceChildrenLastIndex = idx;
    }

    state.workspaceChildrenSel = keys;
    applySelectionClass();
  };

  const stageDeleteSelectedTags = () => {
    const keys = Array.from(state.workspaceChildrenSel || []);
    const tagKeys = keys.filter((k) => k.includes('::'));
    if (!tagKeys.length) return;
    if (!window.confirm(`Delete ${tagKeys.length} tag(s)? (Applied on Save / Save+Reload.)`)) return;

    const delSet = new Set(tagKeys);
    state.tagConfigAll = (state.tagConfigAll || []).filter((t) => !delSet.has(makeTagKey(t)));
    if (state.tagConfigEdited && state.tagConfigEdited.size) {
      for (const k of delSet.values()) state.tagConfigEdited.delete(k);
    }
    markTagsDirty(true);
    clearSelection();
    renderWorkspaceTree();
  };

  rowsSorted.forEach((c, idx) => {
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

    let tDesc = null;

    let tDriver = null;
    let tGateway = null;
    let tPath = null;
    let tSlot = null;
    let tPlc = null;

    if (showDeviceCols) {
      // Only device rows get values; other child rows get blanks.
      tDesc = addCell(tr, '', true);
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
            if (!tDriver?.isConnected || !tDesc?.isConnected) return;

            const desc = String(obj?.description || '').trim();
            const driver = String(obj?.driver || '').trim();
            const gateway = String(obj?.gateway || '').trim();
            const pathVal = String(obj?.path || '').trim();
            const slotVal = (obj?.slot == null) ? '' : String(obj.slot);
            const plcType = String(obj?.plc_type || obj?.plcType || '').trim();

            tDesc.textContent = desc;
            tDriver.textContent = labelForDriver(driver);
            tGateway.textContent = gateway;
            tPath.textContent = pathVal;
            tSlot.textContent = slotVal;
            tPlc.textContent = labelForPlcType(plcType);

            [tDesc, tDriver, tGateway, tPath, tSlot, tPlc].forEach((td) => {
              if (!td) return;
              td.classList.toggle('audit-cell-dim', !String(td.textContent || '').trim());
            });
          }).catch(() => {
            if (seq !== state.workspaceRenderSeq) return;
            [tDesc, tDriver, tGateway, tPath, tSlot, tPlc].forEach((td) => {
              if (!td?.isConnected) return;
              td.textContent = '';
              td.classList.add('audit-cell-dim');
            });
          });
        }
      }
    }

    tr.style.cursor = 'default';

    const rowKey = selectKeyForRow(c);
    if (rowKey) tr.dataset.rowKey = rowKey;
    tr.addEventListener('click', (e) => handleRowClick(e, idx, rowKey));
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // ensure row is selected
      const keys = state.workspaceChildrenSel || new Set();
      if (rowKey && !keys.has(rowKey)) {
        keys.clear();
        keys.add(rowKey);
        state.workspaceChildrenSel = keys;
        state.workspaceChildrenLastIndex = idx;
        applySelectionClass();
      }
      if (showTagCols && (state.workspaceChildrenSel?.size || 0) > 0) {
        showContextMenu(e.clientX, e.clientY, [
          { label: `Delete selected tag(s) (${state.workspaceChildrenSel.size})`, onClick: stageDeleteSelectedTags }
        ]);
      }
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
      openWorkspaceItemModal(c);
    });

    els.workspaceChildrenTbody.appendChild(tr);
  });

  applySelectionClass();
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
      setWorkspaceSaveStatus('Reloaded. Refreshing…');
      await Promise.all([loadConnectionsList(), loadTagsConfig(), loadOpcbridgeAlarmsConfig().catch(() => null)]);
      renderWorkspaceTree();
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
    // 0) Apply staged deletes
    if (state.workspaceDeletePaths && state.workspaceDeletePaths.size) {
      for (const relPath of Array.from(state.workspaceDeletePaths.values())) {
        try {
          await apiPostJson('/api/opcbridge/config/delete', { path: relPath });
        } catch (err) {
          const msg = String(err?.message || '');
          if (!msg.toLowerCase().includes('file does not exist')) throw err;
        }
        state.connObjCache?.delete?.(relPath);
        state.workspaceConnDirty?.delete?.(relPath);
        state.connFiles = (state.connFiles || []).filter((f) => String(f?.path || '') !== relPath);
      }
      state.workspaceDeletePaths.clear();
    }

    // 1) Save connection file writes
    if (state.workspaceConnDirty && state.workspaceConnDirty.size) {
      for (const [pathRel, obj] of state.workspaceConnDirty.entries()) {
        if (!obj || typeof obj !== 'object') throw new Error(`Invalid connection object for ${pathRel}`);
        if (!String(obj.id || '').trim()) throw new Error(`Connection config must contain string field 'id' (${pathRel})`);
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

    // 3) Save alarms config (only if we staged updates, e.g., renaming a device)
    if (state.alarmsConfigDirty) {
      const cfg = state.alarmsConfig || { alarms: [], groups: [] };
      await saveOpcbridgeAlarmsConfig(cfg);
      state.alarmsConfigDirty = false;
    }

    if (reload) {
      await opcbridgeReload();
    }

    // Clear dirty state and refresh
    if (state.workspaceConnDirty) state.workspaceConnDirty.clear();
    state.tagConfigEdited = new Map();
    markTagsDirty(false);
    clearWorkspaceDraft();

    await Promise.all([loadConnectionsList(), loadTagsConfig(), loadOpcbridgeAlarmsConfig().catch(() => null)]);
    renderWorkspaceTree();
    setWorkspaceSaveStatus(reload ? 'Saved + Reloaded.' : 'Saved.');
  } catch (err) {
    const msg = String(err?.message || err || '');
    if (msg.toLowerCase().includes('upstream timeout')) {
      setWorkspaceSaveStatus('Save is taking longer than expected (timeout). The server may still be working; waiting a moment then refreshing…');
      renderWorkspaceSaveBar();
      setTimeout(async () => {
        try {
          await Promise.all([loadConnectionsList(), loadTagsConfig(), loadOpcbridgeAlarmsConfig().catch(() => null)]);
          renderWorkspaceTree();
          setWorkspaceSaveStatus(reload ? 'Saved + Reloaded.' : 'Saved.');
          renderWorkspaceSaveBar();
        } catch {
          // keep the prior status
        }
      }, 5000);
    } else {
      setWorkspaceSaveStatus(`Save failed: ${msg}`);
    }
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
    if (state.workspaceDeletePaths) state.workspaceDeletePaths.clear();
    state.alarmsConfigDirty = false;
    state.tagConfigEdited = new Map();
    markTagsDirty(false);
    clearWorkspaceDraft();
    await Promise.all([loadConnectionsList(), loadTagsConfig(), loadOpcbridgeAlarmsConfig().catch(() => null)]);
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

  if (type === 'device' || type === 'tag') {
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

// Keep alarms config fresh for Workspace editing.
try {
  await loadOpcbridgeAlarmsConfig();
} catch {
  // ignore
}

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
  state.versions = {
    suite_version: String(cfg?.suite_version || ''),
    component_version: String(cfg?.component_version || '')
  };

  if (els.buildLine) {
    const o = state.cfg?.opcbridge || {};
    const a = state.cfg?.alarms || {};
    const h = state.cfg?.hmi || {};
    const r = state.cfg?.refresh_ms;
    const suiteV = String(state.versions?.suite_version || '').trim();
    const compV = String(state.versions?.component_version || '').trim();
    const verStr = (suiteV || compV) ? `suite=${suiteV || '?'} · scada=${compV || '?'}` : '';
    const authStr = state.auth
      ? ` · admin_token=${state.auth.admin_token_configured ? 'yes' : 'no'} write_token=${state.auth.write_token_configured ? 'yes' : 'no'}`
      : '';
    els.buildLine.textContent = `refresh=${r}ms · ${verStr}${verStr ? ' · ' : ''}opcbridge @ ${o.scheme}://${o.host}:${o.port} · alarms @ ${a.scheme}://${a.host}:${a.port} · hmi @ ${h.scheme}://${h.host}:${h.port}${authStr}`;
  }
}

async function refreshUserAuthLine() {
  if (!els.authLine) return;
  try {
    const s = await apiGet('/api/opcbridge/auth/status');
    state.opcbridgeAuthStatus = s || null;
    updateConfigureTabVisibility();
    updateWorkspaceTabVisibility();
    updateLogsTabVisibility();
    updateUsersTabVisibility();
    updateLoggerTabVisibility();
    const configured = Boolean(s?.configured);
    const loggedIn = Boolean(s?.user_logged_in ?? s?.logged_in);
    const username = String(s?.user?.username || '').trim();
    const role = String(s?.user?.role || '').trim();
    if (!configured) {
      els.authLine.innerHTML = `<span class="badge warn">auth</span> not configured`;
      return;
    }
    if (loggedIn) {
      const who = username ? ` as ${escapeHtml(username)}${role ? ` (${escapeHtml(role)})` : ''}` : '';
      els.authLine.innerHTML = `<span class="badge ok">auth</span> logged in${who} <button class="btn" id="authLogoutBtn" type="button">Logout</button>`;
      document.getElementById('authLogoutBtn')?.addEventListener('click', logoutUser);
      return;
    }
    els.authLine.innerHTML = `<span class="badge warn">auth</span> not logged in <button class="btn primary" id="authLoginBtn" type="button">Login</button>`;
    document.getElementById('authLoginBtn')?.addEventListener('click', loginUser);
  } catch {
    els.authLine.innerHTML = `<span class="badge warn">auth</span> unavailable`;
  }
}

function isOpcbridgeAdmin() {
  return hasPerm('auth.manage_users');
}

function setUsersStatus(msg) {
  if (els.usersStatusLine) els.usersStatusLine.textContent = String(msg || '');
}

function setUsersInitStatus(msg) {
  if (els.usersInitStatus) els.usersInitStatus.textContent = String(msg || '');
}

function setUsersTimeoutStatus(msg) {
  if (els.usersTimeoutStatus) els.usersTimeoutStatus.textContent = String(msg || '');
}

function setUsersDetailsStatus(msg) {
  if (els.usersDetailsStatus) els.usersDetailsStatus.textContent = String(msg || '');
}

function setUsersFormStatus(msg) {
  if (els.usersFormStatus) els.usersFormStatus.textContent = String(msg || '');
}

function usersShowTablePanel() {
  if (els.usersDetailsTablePanel) els.usersDetailsTablePanel.style.display = 'block';
  if (els.usersDetailsFormPanel) els.usersDetailsFormPanel.style.display = 'none';
}

function usersShowFormPanel() {
  if (els.usersDetailsTablePanel) els.usersDetailsTablePanel.style.display = 'none';
  if (els.usersDetailsFormPanel) els.usersDetailsFormPanel.style.display = 'block';
}

function usersSetDetailsTable(headers, rows) {
  if (!els.usersDetailsThead || !els.usersDetailsTbody) return;
  els.usersDetailsThead.textContent = '';
  els.usersDetailsTbody.textContent = '';

  const trh = document.createElement('tr');
  (headers || []).forEach((h) => {
    const th = document.createElement('th');
    th.textContent = String(h || '');
    trh.appendChild(th);
  });
  els.usersDetailsThead.appendChild(trh);

  (rows || []).forEach((r) => {
    const tr = document.createElement('tr');
    (r?.cells || []).forEach((c) => {
      const td = document.createElement('td');
      td.textContent = String(c ?? '');
      tr.appendChild(td);
    });
    if (typeof r?.onDblClick === 'function') {
      tr.addEventListener('dblclick', () => r.onDblClick());
    }
    els.usersDetailsTbody.appendChild(tr);
  });
}

function buildUsersTree() {
  const roles = (state.usersRoles || []).slice().sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')));
  const users = (state.usersUsers || []).slice().sort((a, b) => String(a?.username || '').localeCompare(String(b?.username || '')));
  return [
    {
      id: 'users_root_roles',
      type: 'roles_root',
      label: 'Roles',
      children: roles.map((r) => ({
        id: `role:${String(r?.id || '')}`,
        type: 'role',
        label: String(r?.label || r?.id || ''),
        meta: r,
        children: []
      }))
    },
    {
      id: 'users_root_users',
      type: 'users_root',
      label: 'Users',
      children: users.map((u) => ({
        id: `user:${String(u?.username || '')}`,
        type: 'user',
        label: String(u?.username || ''),
        meta: u,
        children: []
      }))
    }
  ];
}

function renderUsersTreeNode(node, container) {
  const canExpand = (node?.type === 'roles_root' || node?.type === 'users_root');
  const expanded = state.usersTreeExpanded.has(node.id);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tree-item';
  btn.classList.toggle('is-active', state.usersSelectedNodeId === node.id);

  const twisty = document.createElement('span');
  twisty.className = 'twisty';
  twisty.classList.toggle('is-empty', !canExpand);
  twisty.textContent = canExpand ? (expanded ? '−' : '+') : '';
  if (canExpand) {
    twisty.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (expanded) state.usersTreeExpanded.delete(node.id);
      else state.usersTreeExpanded.add(node.id);
      renderUsersTree();
    });
  }

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = String(node?.label || '');

  btn.appendChild(twisty);
  btn.appendChild(label);

  btn.addEventListener('click', () => {
    state.usersSelectedNodeId = node.id;
    renderUsersTree();
    renderUsersDetails(node);
  });

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.usersSelectedNodeId = node.id;
    renderUsersTree();
    renderUsersDetails(node);

    if (!isOpcbridgeAdmin()) return;

    const items = [];
    if (node.type === 'roles_root') {
      items.push({ label: 'Add Role…', onClick: () => openRoleForm({ mode: 'new' }) });
    } else if (node.type === 'role') {
      const roleId = String(node?.meta?.id || '').trim();
      items.push({ label: 'Edit Role…', onClick: () => openRoleForm({ mode: 'edit', roleId }) });
      items.push({ label: 'Delete Role…', onClick: () => deleteRole(roleId) });
    } else if (node.type === 'users_root') {
      items.push({ label: 'Add User…', onClick: () => openUserForm({ mode: 'new' }) });
    } else if (node.type === 'user') {
      const username = String(node?.meta?.username || '').trim();
      items.push({ label: 'Edit User…', onClick: () => openUserForm({ mode: 'edit', username }) });
      items.push({ label: 'Delete User…', onClick: () => deleteUser(username) });
    }
    if (items.length) showContextMenu(e.clientX, e.clientY, items);
  });

  container.appendChild(btn);

  if (canExpand && expanded && Array.isArray(node.children) && node.children.length) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-children';
    node.children.forEach((child) => renderUsersTreeNode(child, wrap));
    container.appendChild(wrap);
  }
}

function renderUsersTree() {
  if (!els.usersTreeView) return;
  els.usersTreeView.textContent = '';
  const roots = buildUsersTree();
  roots.forEach((r) => {
    if (!state.usersTreeExpanded.has(r.id)) state.usersTreeExpanded.add(r.id);
    renderUsersTreeNode(r, els.usersTreeView);
  });
  if (els.usersTreeNote) {
    els.usersTreeNote.textContent = `Roles: ${(state.usersRoles || []).length} · Users: ${(state.usersUsers || []).length}`;
  }
  if (!state.usersSelectedNodeId && roots.length) state.usersSelectedNodeId = roots[0].id;
}

function renderUsersDetails(node) {
  if (!node) return;
  usersShowTablePanel();
  setUsersDetailsStatus('');

  if (node.type === 'roles_root') {
    const rows = (state.usersRoles || []).slice().sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || ''))).map((r) => ({
      cells: [
        String(r?.id || ''),
        String(r?.label || ''),
        String(r?.description || ''),
        Array.isArray(r?.permissions) ? r.permissions.join(', ') : ''
      ],
      onDblClick: () => openRoleForm({ mode: 'edit', roleId: String(r?.id || '') })
    }));
    usersSetDetailsTable(['Role', 'Label', 'Description', 'Permissions'], rows);
    return;
  }

  if (node.type === 'users_root') {
    const rows = (state.usersUsers || []).slice().sort((a, b) => String(a?.username || '').localeCompare(String(b?.username || ''))).map((u) => ({
      cells: [String(u?.username || ''), String(u?.name || u?.username || ''), String(u?.description || ''), String(u?.role || '')],
      onDblClick: () => openUserForm({ mode: 'edit', username: String(u?.username || '') })
    }));
    usersSetDetailsTable(['Username', 'Name', 'Description', 'Role'], rows);
    return;
  }

  if (node.type === 'role') {
    openRoleForm({ mode: 'edit', roleId: String(node?.meta?.id || '') });
    return;
  }

  if (node.type === 'user') {
    openUserForm({ mode: 'edit', username: String(node?.meta?.username || '') });
  }
}

function fillRoleSelectOptions(selectedValue) {
  if (!els.usersFormRole) return;
  els.usersFormRole.textContent = '';
  (state.usersRoles || []).slice().sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || ''))).forEach((r) => {
    const opt = document.createElement('option');
    opt.value = String(r?.id || '');
    opt.textContent = String(r?.label || r?.id || '');
    els.usersFormRole.appendChild(opt);
  });
  if (selectedValue) els.usersFormRole.value = String(selectedValue);
  if (!String(els.usersFormRole.value || '').trim() && els.usersFormRole.options.length) {
    els.usersFormRole.value = String(els.usersFormRole.options[0].value || '');
  }
}

function openRoleForm({ mode, roleId }) {
  usersShowFormPanel();
  setUsersFormStatus('');
  setUsersDetailsStatus('');

  state.usersFormMode = (mode === 'new') ? 'role_new' : 'role_edit';
  state.usersFormTargetId = roleId ? String(roleId) : '';

  if (els.usersFormIdLabel) els.usersFormIdLabel.textContent = 'Role ID';
  if (els.usersFormRoleRow) els.usersFormRoleRow.style.display = 'none';
  if (els.usersFormPasswordRow) els.usersFormPasswordRow.style.display = 'none';
  if (els.usersFormConfirmRow) els.usersFormConfirmRow.style.display = 'none';
  if (els.usersFormPermsRow) els.usersFormPermsRow.style.display = '';

  const role = (mode === 'edit')
    ? (state.usersRoles || []).find((r) => String(r?.id || '') === String(roleId || '')) || null
    : null;

  if (els.usersFormId) {
    els.usersFormId.value = role ? String(role.id || '') : '';
    els.usersFormId.disabled = (mode === 'edit');
  }
  if (els.usersFormLabel) {
    els.usersFormLabel.value = role ? String(role.label || '') : '';
    els.usersFormLabel.disabled = false;
  }
  if (els.usersFormDescription) {
    els.usersFormDescription.value = role ? String(role.description || '') : '';
    els.usersFormDescription.disabled = false;
  }
  if (els.usersFormPerms) {
    const current = new Set((role && Array.isArray(role.permissions)) ? role.permissions.map((p) => String(p || '').trim()).filter(Boolean) : []);
    els.usersFormPerms.textContent = '';
    ROLE_PERMISSION_DEFS.forEach((p) => {
      const wrap = document.createElement('label');
      wrap.className = 'perm-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.permId = p.id;
      cb.checked = current.has(p.id);
      if (role && String(role.id || '') === 'admin') cb.disabled = true;
      const txt = document.createElement('span');
      txt.textContent = p.label;
      wrap.appendChild(cb);
      wrap.appendChild(txt);
      els.usersFormPerms.appendChild(wrap);
    });
  }
}

function openUserForm({ mode, username }) {
  usersShowFormPanel();
  setUsersFormStatus('');
  setUsersDetailsStatus('');

  state.usersFormMode = (mode === 'new') ? 'user_new' : 'user_edit';
  state.usersFormTargetId = username ? String(username) : '';

  const self = String(state.opcbridgeAuthStatus?.user?.username || '').trim();
  const isSelfEdit = (mode === 'edit' && self && String(username || '').trim() === self);
  const canAdmin = isOpcbridgeAdmin();

  if (els.usersFormIdLabel) els.usersFormIdLabel.textContent = 'Username';
  if (els.usersFormPermsRow) els.usersFormPermsRow.style.display = 'none';
  if (els.usersFormRoleRow) els.usersFormRoleRow.style.display = '';
  if (els.usersFormPasswordRow) els.usersFormPasswordRow.style.display = '';
  if (els.usersFormConfirmRow) els.usersFormConfirmRow.style.display = '';

  const user = (mode === 'edit')
    ? (state.usersUsers || []).find((u) => String(u?.username || '') === String(username || '')) || null
    : null;

  if (els.usersFormId) {
    els.usersFormId.value = user ? String(user.username || '') : '';
    els.usersFormId.disabled = (mode === 'edit');
  }
  if (els.usersFormLabel) {
    els.usersFormLabel.value = user ? String(user.name || user.username || '') : '';
    els.usersFormLabel.disabled = false;
  }
  if (els.usersFormDescription) {
    els.usersFormDescription.value = user ? String(user.description || '') : '';
    els.usersFormDescription.disabled = false;
  }
  fillRoleSelectOptions(user ? String(user.role || '') : '');
  if (els.usersFormRole) els.usersFormRole.disabled = isSelfEdit ? true : (!canAdmin);
  if (els.usersFormPassword) els.usersFormPassword.value = '';
  if (els.usersFormConfirm) els.usersFormConfirm.value = '';
}

async function deleteRole(roleId) {
  const id = String(roleId || '').trim();
  if (!id) return;
  if (!window.confirm(`Delete role '${id}'?`)) return;
  setUsersDetailsStatus('Deleting role…');
  try {
    await apiJson(`/api/opcbridge/auth/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refreshUsersPanel();
    setUsersDetailsStatus('Role deleted.');
  } catch (err) {
    setUsersDetailsStatus(`Delete failed: ${err.message}`);
  }
}

async function deleteUser(username) {
  const uname = String(username || '').trim();
  if (!uname) return;
  const self = String(state.opcbridgeAuthStatus?.user?.username || '').trim();
  if (self && uname === self) {
    window.alert('You cannot delete the currently logged-in user.');
    return;
  }
  if (!window.confirm(`Delete user '${uname}'?`)) return;
  setUsersDetailsStatus('Deleting user…');
  try {
    await apiJson(`/api/opcbridge/auth/users/${encodeURIComponent(uname)}`, { method: 'DELETE' });
    await Promise.all([refreshUserAuthLine(), refreshUsersPanel()]);
    setUsersDetailsStatus('User deleted.');
  } catch (err) {
    setUsersDetailsStatus(`Delete failed: ${err.message}`);
  }
}

async function refreshUsersPanel() {
  if (!els.usersStatusLine) return;
  try {
    const s = await apiGet('/api/opcbridge/auth/status');
    state.opcbridgeAuthStatus = s || null;

    const configured = Boolean(s?.configured);
    const initialized = Boolean(s?.initialized);
    const loggedIn = Boolean(s?.user_logged_in);
    const username = String(s?.user?.username || '').trim();
    const role = String(s?.user?.role || 'viewer').trim().toLowerCase();
    const timeoutMinutes = Number(s?.timeoutMinutes) || 0;
    const users = Array.isArray(s?.users) ? s.users : [];
    const roles = Array.isArray(s?.roles) ? s.roles : [];
    state.usersUsers = users;
    state.usersRoles = roles;

    const who = loggedIn ? `${username || '?'} (${role || 'viewer'})` : 'not logged in';
    setUsersStatus(`opcbridge auth: configured=${configured ? 'yes' : 'no'} initialized=${initialized ? 'yes' : 'no'} · ${who}`);

    if (els.usersInitWrap) els.usersInitWrap.style.display = (!initialized) ? 'block' : 'none';
    if (els.usersManageWrap) els.usersManageWrap.style.display = (initialized) ? 'block' : 'none';

	    if (!initialized) {
	      // Leave blank by default; user may not use "admin" as the initial username.
	      if (els.usersInitTimeout) els.usersInitTimeout.value = String(timeoutMinutes || 0);
	      setUsersInitStatus('');
	      return;
	    }

    if (els.usersTimeoutMinutes) els.usersTimeoutMinutes.value = String(timeoutMinutes || 0);
    setUsersTimeoutStatus('');
    const canAdmin = loggedIn && role === 'admin';
    if (els.usersTimeoutSaveBtn) els.usersTimeoutSaveBtn.disabled = !canAdmin;

    renderUsersTree();
    const roots = buildUsersTree();
    const allNodes = roots.flatMap((r) => [r, ...(r.children || [])]);
    const selected = allNodes.find((n) => n.id === state.usersSelectedNodeId) || roots[0];
    if (selected) renderUsersDetails(selected);
  } catch (err) {
    setUsersStatus(`Users panel failed: ${err.message}`);
    if (els.usersInitWrap) els.usersInitWrap.style.display = 'none';
    if (els.usersManageWrap) els.usersManageWrap.style.display = 'none';
  }
}

function wireUsersUi() {
  if (els.usersRefreshBtn) els.usersRefreshBtn.addEventListener('click', refreshUsersPanel);

  if (els.usersInitBtn) {
    els.usersInitBtn.addEventListener('click', async () => {
      const username = String(els.usersInitUsername?.value || '').trim();
      const password = String(els.usersInitPassword?.value || '');
      const confirm = String(els.usersInitConfirm?.value || '');
      const timeoutMinutes = Math.max(0, Math.floor(Number(els.usersInitTimeout?.value) || 0));
      if (!username) { setUsersInitStatus('Username required.'); return; }
      if (!password) { setUsersInitStatus('Password required.'); return; }
      if (!confirm) { setUsersInitStatus('Confirm password required.'); return; }
      if (password !== confirm) { setUsersInitStatus('Passwords do not match.'); return; }
      setUsersInitStatus('Initializing…');
      try {
        await apiPostJson('/api/opcbridge/auth/init', { username, password, confirm, timeoutMinutes });
        if (els.usersInitPassword) els.usersInitPassword.value = '';
        if (els.usersInitConfirm) els.usersInitConfirm.value = '';
        await Promise.all([refreshUserAuthLine(), refreshUsersPanel()]);
        setUsersInitStatus('Initialized.');
      } catch (err) {
        setUsersInitStatus(`Init failed: ${err.message}`);
      }
    });
  }

  if (els.usersTimeoutSaveBtn) {
    els.usersTimeoutSaveBtn.addEventListener('click', async () => {
      const timeoutMinutes = Math.max(0, Math.floor(Number(els.usersTimeoutMinutes?.value) || 0));
      setUsersTimeoutStatus('Saving…');
      try {
        await apiJson('/api/opcbridge/auth/timeout', { method: 'PUT', bodyObj: { timeoutMinutes } });
        await Promise.all([refreshUserAuthLine(), refreshUsersPanel()]);
        setUsersTimeoutStatus('Saved.');
      } catch (err) {
        setUsersTimeoutStatus(`Save failed: ${err.message}`);
      }
    });
  }

  els.usersFormCancelBtn?.addEventListener('click', async () => {
    usersShowTablePanel();
    setUsersFormStatus('');
    const roots = buildUsersTree();
    const allNodes = roots.flatMap((r) => [r, ...(r.children || [])]);
    const selected = allNodes.find((n) => n.id === state.usersSelectedNodeId) || roots[0];
    if (selected) renderUsersDetails(selected);
  });

  els.usersFormSaveBtn?.addEventListener('click', async () => {
    const mode = state.usersFormMode;
    const self = String(state.opcbridgeAuthStatus?.user?.username || '').trim();
    const isSelfEdit = (mode === 'user_edit' && self && String(state.usersFormTargetId || '').trim() === self);
    const isAdminAction = (mode === 'role_new' || mode === 'role_edit' || mode === 'user_new' || mode === 'user_edit');
    if (isAdminAction && !isOpcbridgeAdmin() && !isSelfEdit) {
      setUsersFormStatus('Admin login required.');
      return;
    }
    setUsersFormStatus('Saving…');
    try {
      if (mode === 'role_new') {
        const id = String(els.usersFormId?.value || '').trim().toLowerCase();
        const label = String(els.usersFormLabel?.value || '').trim();
        const description = String(els.usersFormDescription?.value || '').trim();
        const permissions = [];
        els.usersFormPerms?.querySelectorAll('input[type="checkbox"][data-perm-id]')?.forEach((cb) => {
          if (cb.checked) permissions.push(String(cb.dataset.permId || '').trim());
        });
        await apiPostJson('/api/opcbridge/auth/roles', { id, label, description, permissions });
        state.usersSelectedNodeId = `role:${id}`;
      } else if (mode === 'role_edit') {
        const id = String(state.usersFormTargetId || '').trim();
        const label = String(els.usersFormLabel?.value || '').trim();
        const description = String(els.usersFormDescription?.value || '').trim();
        const permissions = [];
        els.usersFormPerms?.querySelectorAll('input[type="checkbox"][data-perm-id]')?.forEach((cb) => {
          if (cb.checked) permissions.push(String(cb.dataset.permId || '').trim());
        });
        await apiJson(`/api/opcbridge/auth/roles/${encodeURIComponent(id)}`, { method: 'PUT', bodyObj: { label, description, permissions } });
        state.usersSelectedNodeId = `role:${id}`;
      } else if (mode === 'user_new') {
        const username = String(els.usersFormId?.value || '').trim();
        const role = String(els.usersFormRole?.value || 'viewer').trim();
        const name = String(els.usersFormLabel?.value || '').trim();
        const description = String(els.usersFormDescription?.value || '').trim();
        const password = String(els.usersFormPassword?.value || '');
        const confirm = String(els.usersFormConfirm?.value || '');
        if (!username) throw new Error('Username required.');
        if (!password) throw new Error('Password required.');
        if (!confirm) throw new Error('Confirm required.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        await apiPostJson('/api/opcbridge/auth/users', { username, name, description, password, role });
        state.usersSelectedNodeId = `user:${username}`;
      } else if (mode === 'user_edit') {
        const username = String(state.usersFormTargetId || '').trim();
        const name = String(els.usersFormLabel?.value || '').trim();
        const description = String(els.usersFormDescription?.value || '').trim();
        const password = String(els.usersFormPassword?.value || '');
        const confirm = String(els.usersFormConfirm?.value || '');
        const bodyObj = { name, description };
        if (isOpcbridgeAdmin() && !isSelfEdit) {
          bodyObj.role = String(els.usersFormRole?.value || 'viewer').trim();
        }
        if (password) {
          if (!confirm) throw new Error('Confirm required.');
          if (password !== confirm) throw new Error('Passwords do not match.');
          bodyObj.password = password;
          bodyObj.confirm = confirm;
        }
        await apiJson(`/api/opcbridge/auth/users/${encodeURIComponent(username)}`, { method: 'PUT', bodyObj });
        state.usersSelectedNodeId = `user:${username}`;
      } else {
        throw new Error('Nothing to save.');
      }

      if (els.usersFormPassword) els.usersFormPassword.value = '';
      if (els.usersFormConfirm) els.usersFormConfirm.value = '';
      usersShowTablePanel();
      await Promise.all([refreshUserAuthLine(), refreshUsersPanel()]);
      setUsersFormStatus('Saved.');
    } catch (err) {
      setUsersFormStatus(`Save failed: ${err.message}`);
    }
  });
}

function startUserAuthPolling() {
  if (state.userAuthTimer) return;
  state.userAuthTimer = window.setInterval(() => {
    refreshUserAuthLine().catch(() => {});
  }, 2000);
}

	function openLoginModal() {
	  if (!els.loginModal) return;
	  if (els.loginStatus) els.loginStatus.textContent = '';
	  if (els.loginPassword) els.loginPassword.value = '';
	  els.loginModal.style.display = 'flex';
	  try {
	    (els.loginUsername || els.loginPassword)?.focus?.();
	  } catch {
	    // ignore
	  }
	}

function closeLoginModal() {
  if (!els.loginModal) return;
  els.loginModal.style.display = 'none';
  if (els.loginStatus) els.loginStatus.textContent = '';
}

function wireLoginModalUi() {
  if (!els.loginModal) return;
  if (els.loginModal.dataset.wired === '1') return;
  els.loginModal.dataset.wired = '1';

  els.loginCloseBtn?.addEventListener('click', closeLoginModal);
  els.loginCancelBtn?.addEventListener('click', closeLoginModal);
  els.loginModal.addEventListener('click', (e) => {
    if (e.target === els.loginModal) closeLoginModal();
  });
  els.loginModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLoginModal();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      els.loginOkBtn?.click?.();
    }
  });

  els.loginOkBtn?.addEventListener('click', async () => {
    const username = String(els.loginUsername?.value || '').trim();
    const password = String(els.loginPassword?.value || '');
    if (!password) {
      if (els.loginStatus) els.loginStatus.textContent = 'Password required.';
      return;
    }
    if (els.loginStatus) els.loginStatus.textContent = 'Logging in…';
    try {
      const payload = { password };
      if (username) payload.username = username;
      await apiPostJson('/api/opcbridge/auth/login', payload);
      await refreshUserAuthLine();
      closeLoginModal();
    } catch (err) {
      if (els.loginStatus) els.loginStatus.textContent = `Login failed: ${err.message}`;
    }
  });
}

async function loginUser() {
  openLoginModal();
}

async function logoutUser() {
  try {
    await apiPostJson('/api/opcbridge/auth/logout', {});
    await refreshUserAuthLine();
  } catch (err) {
    window.alert(`Logout failed: ${err.message}`);
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
  updateConfigureTabVisibility();
  updateWorkspaceTabVisibility();
  updateLoggerTabVisibility();
  updateLogsTabVisibility();
  updateUsersTabVisibility();

  startUserAuthPolling();

  wireScadaSettingsUi();
  wireSvcUi();
  wireMqttCaUi();
  wireLoggerUi();
  wireConnectionsUi();
  wireTagsConfigUi();
  wireLoginModalUi();
  wireUsersUi();
  wireLogsUi();
  wireNewDeviceFormUi();
  wireWorkspaceSaveBarUi();
  wireWorkspaceItemModalUi();
  wireNewTagModalUi();

  try {
    await loadBootstrapConfig();
  } catch {
    // ignore
  }

  try {
    await refreshUserAuthLine();
  } catch {
    // ignore
  }

  try {
    await refreshUsersPanel();
  } catch {
    // ignore
  }

  try {
    await loadScadaSettings();
    await loadSvcSettings();
  } catch {
    // ignore
  }

  try {
    await refreshMqttCaStatus();
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
