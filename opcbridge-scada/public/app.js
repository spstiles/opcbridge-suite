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
  overviewRebuildStatus: document.getElementById('overviewRebuildStatus'),
  overviewRebuildHint: document.getElementById('overviewRebuildHint'),
  overviewRebuildBtn: document.getElementById('overviewRebuildBtn'),
  healthJson: document.getElementById('healthJson'),
  alarmsStatusJson: document.getElementById('alarmsStatusJson'),
  overviewAlarmRuntimeWarning: document.getElementById('overviewAlarmRuntimeWarning'),
  overviewAlarmRuntimeWarningActions: document.getElementById('overviewAlarmRuntimeWarningActions'),
  alarmRuntimeRefreshBtn: document.getElementById('alarmRuntimeRefreshBtn'),
  alarmRuntimeRestartBtn: document.getElementById('alarmRuntimeRestartBtn'),

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
  authAdminCard: document.getElementById('authAdminCard'),
  authAdminTokenValue: document.getElementById('authAdminTokenValue'),
  authAdminTokenCopyBtn: document.getElementById('authAdminTokenCopyBtn'),
  authWriteTokenValue: document.getElementById('authWriteTokenValue'),
  authWriteTokenCopyBtn: document.getElementById('authWriteTokenCopyBtn'),
  authAdminReloadBtn: document.getElementById('authAdminReloadBtn'),
  authAdminTestAlarmsBtn: document.getElementById('authAdminTestAlarmsBtn'),
  authAdminStatus: document.getElementById('authAdminStatus'),
  projectBackupDownloadBtn: document.getElementById('projectBackupDownloadBtn'),
  projectBackupIncludeSecrets: document.getElementById('projectBackupIncludeSecrets'),
  projectBackupIncludeHistory: document.getElementById('projectBackupIncludeHistory'),
  projectBackupIncludeHistorianData: document.getElementById('projectBackupIncludeHistorianData'),
  projectRestoreFile: document.getElementById('projectRestoreFile'),
  projectRestorePreviewBtn: document.getElementById('projectRestorePreviewBtn'),
  projectRestoreApplyBtn: document.getElementById('projectRestoreApplyBtn'),
  projectBackupStatus: document.getElementById('projectBackupStatus'),
  soundOutputDevice: document.getElementById('soundOutputDevice'),
  soundTestAudioFile: document.getElementById('soundTestAudioFile'),
  soundTestTtsText: document.getElementById('soundTestTtsText'),
  soundReloadBtn: document.getElementById('soundReloadBtn'),
  soundTestBtn: document.getElementById('soundTestBtn'),
  soundSaveBtn: document.getElementById('soundSaveBtn'),
  soundSettingsStatus: document.getElementById('soundSettingsStatus'),
  sipTestTo: document.getElementById('sipTestTo'),
  sipEnabled: document.getElementById('sipEnabled'),
  sipServer: document.getElementById('sipServer'),
  sipExt: document.getElementById('sipExt'),
  sipPass: document.getElementById('sipPass'),
  sipTransport: document.getElementById('sipTransport'),
  sipNetIf: document.getElementById('sipNetIf'),
  sipDurationSec: document.getElementById('sipDurationSec'),
  sipTestAudioFile: document.getElementById('sipTestAudioFile'),
  sipTestTtsText: document.getElementById('sipTestTtsText'),
  sipAckConfirmAudioFile: document.getElementById('sipAckConfirmAudioFile'),
  sipAckConfirmTtsText: document.getElementById('sipAckConfirmTtsText'),
  sipAckConfirmMaxMs: document.getElementById('sipAckConfirmMaxMs'),
  sipAckPromptTts: document.getElementById('sipAckPromptTts'),
  sipSaveBtn: document.getElementById('sipSaveBtn'),
  sipTestBtn: document.getElementById('sipTestBtn'),
  sipStatus: document.getElementById('sipStatus'),
  ttsSaveBtn: document.getElementById('ttsSaveBtn'),
  ttsStatus: document.getElementById('ttsStatus'),
  voiceModemEnabled: document.getElementById('voiceModemEnabled'),
  voiceModemDevice: document.getElementById('voiceModemDevice'),
  voiceModemManualDevice: document.getElementById('voiceModemManualDevice'),
  voiceModemBaud: document.getElementById('voiceModemBaud'),
  voiceModemVoiceInit: document.getElementById('voiceModemVoiceInit'),
  voiceModemVoiceLine: document.getElementById('voiceModemVoiceLine'),
  voiceModemDialSeconds: document.getElementById('voiceModemDialSeconds'),
  voiceModemAudioDelaySeconds: document.getElementById('voiceModemAudioDelaySeconds'),
  voiceModemAudioGapMs: document.getElementById('voiceModemAudioGapMs'),
  ttsSpeedWpm: document.getElementById('ttsSpeedWpm'),
  voiceModemTestContact: document.getElementById('voiceModemTestContact'),
  voiceModemTestAudioFile: document.getElementById('voiceModemTestAudioFile'),
  voiceModemTestTtsText: document.getElementById('voiceModemTestTtsText'),
  voiceModemReloadBtn: document.getElementById('voiceModemReloadBtn'),
  voiceModemSaveBtn: document.getElementById('voiceModemSaveBtn'),
  voiceModemTestBtn: document.getElementById('voiceModemTestBtn'),
  voiceModemStatus: document.getElementById('voiceModemStatus'),
  alarmNotifEnabled: document.getElementById('alarmNotifEnabled'),
  alarmNotifRepeatMs: document.getElementById('alarmNotifRepeatMs'),
  alarmNotifUntil: document.getElementById('alarmNotifUntil'),
  alarmNotifOutputDevice: document.getElementById('alarmNotifOutputDevice'),
  alarmNotifReloadBtn: document.getElementById('alarmNotifReloadBtn'),
  alarmNotifSaveBtn: document.getElementById('alarmNotifSaveBtn'),
  alarmNotifStatus: document.getElementById('alarmNotifStatus'),
  alarmsSchemaStatus: document.getElementById('alarmsSchemaStatus'),
  alarmsEventsRuntimeWarning: document.getElementById('alarmsEventsRuntimeWarning'),
  alarmsEventsRuntimeWarningActions: document.getElementById('alarmsEventsRuntimeWarningActions'),
  alarmsEventsRuntimeRefreshBtn: document.getElementById('alarmsEventsRuntimeRefreshBtn'),
  alarmsEventsRuntimeRestartBtn: document.getElementById('alarmsEventsRuntimeRestartBtn'),
  alarmsEventsTreeView: document.getElementById('alarmsEventsTreeView'),
  alarmsEventsTreeNote: document.getElementById('alarmsEventsTreeNote'),
  alarmsEventsListHint: document.getElementById('alarmsEventsListHint'),
  alarmsEventsChildrenTable: document.getElementById('alarmsEventsChildrenTable'),
  alarmsEventsChildrenTbody: document.getElementById('alarmsEventsChildrenTbody'),
  alarmsEventsPropsHint: document.getElementById('alarmsEventsPropsHint'),
  alarmsEventsPropsDeleteBtn: document.getElementById('alarmsEventsPropsDeleteBtn'),
  alarmsEventsPropsEditor: document.getElementById('alarmsEventsPropsEditor'),
  alarmsEventsPropsStatus: document.getElementById('alarmsEventsPropsStatus'),
  alarmsEventsPropsTable: document.getElementById('alarmsEventsPropsTable'),
  alarmsEventsPropsTbody: document.getElementById('alarmsEventsPropsTbody'),
  alarmsEventsPropsJson: document.getElementById('alarmsEventsPropsJson'),

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
  workspaceChildrenHint: document.getElementById('workspaceChildrenHint'),
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
  newTagSourceKind: document.getElementById('newTagSourceKind'),
  newTagPlc: document.getElementById('newTagPlc'),
  newTagDerivedRow: document.getElementById('newTagDerivedRow'),
  newTagSourceTag: document.getElementById('newTagSourceTag'),
  newTagBitBox: document.getElementById('newTagBitBox'),
  newTagBit: document.getElementById('newTagBit'),
  newTagDatatype: document.getElementById('newTagDatatype'),
  newTagScan: document.getElementById('newTagScan'),
  newTagElemCount: document.getElementById('newTagElemCount'),
  newTagEnabled: document.getElementById('newTagEnabled'),
  newTagWritable: document.getElementById('newTagWritable'),
  newTagInvert: document.getElementById('newTagInvert'),
  newTagMqttAllowed: document.getElementById('newTagMqttAllowed'),
  newTagLogEvent: document.getElementById('newTagLogEvent'),
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
  workspaceItemEventEdit: document.getElementById('workspaceItemEventEdit'),
  workspaceItemAudioScopeEdit: document.getElementById('workspaceItemAudioScopeEdit'),
  workspaceItemGeneric: document.getElementById('workspaceItemGeneric'),
  editDevId: document.getElementById('editDevId'),
  editDevDriver: document.getElementById('editDevDriver'),
  editDevGateway: document.getElementById('editDevGateway'),
  editDevPath: document.getElementById('editDevPath'),
  editDevSlot: document.getElementById('editDevSlot'),
  editDevPlcType: document.getElementById('editDevPlcType'),
  editDevPollingMode: document.getElementById('editDevPollingMode'),
  editDevPollingPacing: document.getElementById('editDevPollingPacing'),
  editDevPollBatchSize: document.getElementById('editDevPollBatchSize'),
  editDevPollTimeBudgetMs: document.getElementById('editDevPollTimeBudgetMs'),
  editDevCancelBtn: document.getElementById('editDevCancelBtn'),
  editDevSaveBtn: document.getElementById('editDevSaveBtn'),
  editDevStatus: document.getElementById('editDevStatus'),

  editTagConn: document.getElementById('editTagConn'),
  editTagName: document.getElementById('editTagName'),
  editTagSourceKind: document.getElementById('editTagSourceKind'),
  editTagPlc: document.getElementById('editTagPlc'),
  editTagDerivedRow: document.getElementById('editTagDerivedRow'),
  editTagSourceTag: document.getElementById('editTagSourceTag'),
  editTagBitBox: document.getElementById('editTagBitBox'),
  editTagBit: document.getElementById('editTagBit'),
  editTagDatatype: document.getElementById('editTagDatatype'),
  editTagScan: document.getElementById('editTagScan'),
  editTagElemCount: document.getElementById('editTagElemCount'),
  editTagEnabled: document.getElementById('editTagEnabled'),
  editTagWritable: document.getElementById('editTagWritable'),
  editTagInvert: document.getElementById('editTagInvert'),
  editTagMqttAllowed: document.getElementById('editTagMqttAllowed'),
  editTagLogEvent: document.getElementById('editTagLogEvent'),
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
  editAlarmTagFilter: document.getElementById('editAlarmTagFilter'),
  editAlarmTag: document.getElementById('editAlarmTag'),
  editAlarmType: document.getElementById('editAlarmType'),
  editAlarmEnabled: document.getElementById('editAlarmEnabled'),
  editAlarmAudibleMode: document.getElementById('editAlarmAudibleMode'),
  editAlarmAudioMode: document.getElementById('editAlarmAudioMode'),
  editAlarmAudioSequenceMount: document.getElementById('editAlarmAudioSequenceMount'),
  editAlarmAudioGap: document.getElementById('editAlarmAudioGap'),
  editAlarmSpeechText: document.getElementById('editAlarmSpeechText'),
  editAlarmAudioHint: document.getElementById('editAlarmAudioHint'),
  editAlarmAudioUpload: document.getElementById('editAlarmAudioUpload'),
  editAlarmAudioUploadBtn: document.getElementById('editAlarmAudioUploadBtn'),
  editAlarmAudioDeleteBtn: document.getElementById('editAlarmAudioDeleteBtn'),
  editAlarmSeverityPreset: document.getElementById('editAlarmSeverityPreset'),
  editAlarmSeverity: document.getElementById('editAlarmSeverity'),
  editAlarmThresholdRow: document.getElementById('editAlarmThresholdRow'),
  editAlarmThreshold: document.getElementById('editAlarmThreshold'),
  editAlarmHysteresisRow: document.getElementById('editAlarmHysteresisRow'),
  editAlarmHysteresis: document.getElementById('editAlarmHysteresis'),
  editAlarmValueRow: document.getElementById('editAlarmValueRow'),
  editAlarmValue: document.getElementById('editAlarmValue'),
  editAlarmMsgOn: document.getElementById('editAlarmMsgOn'),
  editAlarmMsgOff: document.getElementById('editAlarmMsgOff'),
  editAlarmPreview: document.getElementById('editAlarmPreview'),
  editAlarmCancelBtn: document.getElementById('editAlarmCancelBtn'),
  editAlarmSaveBtn: document.getElementById('editAlarmSaveBtn'),
  editAlarmStatus: document.getElementById('editAlarmStatus'),
  newEventConn: document.getElementById('newEventConn'),
  newEventSearch: document.getElementById('newEventSearch'),
  newEventTag: document.getElementById('newEventTag'),
  newEventCancelBtn: document.getElementById('newEventCancelBtn'),
  newEventSaveBtn: document.getElementById('newEventSaveBtn'),
  newEventStatus: document.getElementById('newEventStatus'),

  editAudioScopeName: document.getElementById('editAudioScopeName'),
  editAudioScopeAudibleMode: document.getElementById('editAudioScopeAudibleMode'),
  editAudioScopeAudioFile: document.getElementById('editAudioScopeAudioFile'),
  editAudioScopeSpeechText: document.getElementById('editAudioScopeSpeechText'),
  editAudioScopeHint: document.getElementById('editAudioScopeHint'),
  editAudioScopeCancelBtn: document.getElementById('editAudioScopeCancelBtn'),
  editAudioScopeSaveBtn: document.getElementById('editAudioScopeSaveBtn'),
  editAudioScopeStatus: document.getElementById('editAudioScopeStatus'),

  newDeviceHint: document.getElementById('newDeviceHint'),
  newDevId: document.getElementById('newDevId'),
  newDevDriver: document.getElementById('newDevDriver'),
  newDevGateway: document.getElementById('newDevGateway'),
  newDevPath: document.getElementById('newDevPath'),
  newDevSlot: document.getElementById('newDevSlot'),
  newDevPlcType: document.getElementById('newDevPlcType'),
  newDevPollingMode: document.getElementById('newDevPollingMode'),
  newDevPollingPacing: document.getElementById('newDevPollingPacing'),
  newDevPollBatchSize: document.getElementById('newDevPollBatchSize'),
  newDevPollTimeBudgetMs: document.getElementById('newDevPollTimeBudgetMs'),
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
  usersFormStatus: document.getElementById('usersFormStatus'),
  // TTS
  ttsVoice: document.getElementById('ttsVoice'),
  ttsVoiceSelect: document.getElementById('ttsVoiceSelect'),
  ttsVoiceHint: document.getElementById('ttsVoiceHint')
};

function setTtsStatus(msg) {
  if (!els.ttsStatus) return;
  els.ttsStatus.textContent = String(msg || '');
}

	async function loadTtsSettings() {
	  try {
	    const voicesResp = await apiGet('/api/scada/tts/voices').catch(() => ({ ok: false, voices: [], engine: '', error: '' }));
	    const cfg = await loadOpcbridgeAlarmsConfig();
	    const tts = cfg.tts && typeof cfg.tts === 'object' ? cfg.tts : {};
	    const wpmRaw = Number(tts.speed_wpm ?? 175);
	    const wpm = Number.isFinite(wpmRaw) ? wpmRaw : 175;
	    if (els.ttsSpeedWpm) {
	      els.ttsSpeedWpm.value = String(Math.max(80, Math.min(450, Math.trunc(wpm))));
	    }
	    const currentVoice = String(tts.voice || '').trim();
	    const voices = Array.isArray(voicesResp?.voices) ? voicesResp.voices : [];
	    const engine = String(voicesResp?.engine || '').trim();
	    const ok = voicesResp?.ok === true;

	    if (els.ttsVoiceSelect) {
	      els.ttsVoiceSelect.textContent = '';
	      const autoOpt = document.createElement('option');
	      autoOpt.value = '';
	      autoOpt.textContent = '(Default voice)';
	      els.ttsVoiceSelect.appendChild(autoOpt);

	      voices.forEach((v) => {
	        const id = String(v?.id || v?.name || '').trim();
	        if (!id) return;
	        const opt = document.createElement('option');
	        opt.value = id;
	        const label = String(v?.label || v?.name || id).trim() || id;
	        const meta = String(v?.age_gender || '').trim();
	        opt.textContent = meta ? `${label} — ${id} (${meta})` : `${label} — ${id}`;
	        els.ttsVoiceSelect.appendChild(opt);
	      });

	      const customOpt = document.createElement('option');
	      customOpt.value = '__custom__';
	      customOpt.textContent = '(Custom…)';
	      els.ttsVoiceSelect.appendChild(customOpt);

	      const has = currentVoice && Array.from(els.ttsVoiceSelect.options).some((o) => o.value === currentVoice);
	      els.ttsVoiceSelect.value = has ? currentVoice : (currentVoice ? '__custom__' : '');
	    }

	    if (els.ttsVoice) {
	      const isCustom = String(els.ttsVoiceSelect?.value || '') === '__custom__';
	      els.ttsVoice.disabled = !isCustom || !canEditConfig();
	      els.ttsVoice.value = isCustom ? currentVoice : '';
	    }

	    if (els.ttsVoiceHint) {
	      if (!ok) {
	        els.ttsVoiceHint.textContent = `Voice list unavailable${voicesResp?.error ? `: ${voicesResp.error}` : '.'}`;
	      } else if (engine) {
	        els.ttsVoiceHint.textContent = `Detected TTS engine: ${engine}. ${voices.length} voice(s) found. Tip: you can enter a comma-separated fallback list in Custom (e.g. en-us,en-gb,en).`;
	      } else {
	        els.ttsVoiceHint.textContent = voices.length ? `${voices.length} voice(s) found.` : '';
	      }
	    }

	    if (els.ttsVoiceSelect) {
	      els.ttsVoiceSelect.disabled = !canEditConfig();
	      els.ttsVoiceSelect.onchange = () => {
	        const isCustom = String(els.ttsVoiceSelect.value || '') === '__custom__';
	        if (els.ttsVoice) {
	          els.ttsVoice.disabled = !isCustom || !canEditConfig();
	          if (!isCustom) els.ttsVoice.value = '';
	        }
	      };
	    }
	    setTtsStatus('Ready.');
	  } catch (err) {
	    setTtsStatus(`Load failed: ${err.message}`);
	  }
	}

	async function saveTtsSettings() {
	  if (els.ttsSaveBtn) els.ttsSaveBtn.disabled = true;
	  setTtsStatus('Saving...');
	  try {
	    const cfg = await loadOpcbridgeAlarmsConfig();
	    cfg.tts = cfg.tts && typeof cfg.tts === 'object' ? cfg.tts : {};
	    const raw = Number(els.ttsSpeedWpm?.value ?? 175);
	    const ttsSpeedWpm = Number.isFinite(raw) ? raw : 175;
	    cfg.tts.speed_wpm = Math.max(80, Math.min(450, Math.trunc(ttsSpeedWpm)));
	    const sel = String(els.ttsVoiceSelect?.value || '').trim();
	    const voice = sel === '__custom__' ? String(els.ttsVoice?.value || '').trim() : sel;
	    cfg.tts.voice = String(voice || '').trim();
	    if (!cfg.tts.voice) delete cfg.tts.voice;
	    await saveOpcbridgeAlarmsConfig(cfg);
	    // Verify persistence so we don't show "Saved" when a NaN/null sneaks in.
	    const after = await loadOpcbridgeAlarmsConfig();
	    const afterWpm = Number(after?.tts?.speed_wpm ?? NaN);
	    if (!Number.isFinite(afterWpm) || Math.trunc(afterWpm) !== Math.trunc(cfg.tts.speed_wpm)) {
	      throw new Error(`Saved but did not persist (wanted ${cfg.tts.speed_wpm}, got ${Number.isFinite(afterWpm) ? afterWpm : 'missing'}).`);
	    }
	    await loadTtsSettings();
	    setTtsStatus('Saved. Alarm server will reload the settings automatically.');
	  } catch (err) {
	    setTtsStatus(`Save failed: ${err.message}`);
	  } finally {
	    if (els.ttsSaveBtn) els.ttsSaveBtn.disabled = false;
	  }
	}

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
  alarmsStatusLast: null,
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
  expanded: new Set(['project:opcbridge', 'folder:connectivity']),
  selectedNodeId: '',
  workspaceTreeRoot: null,
  alarmsEventsExpanded: new Set(['folder:alarms', 'folder:alarm_groups', 'folder:events', 'folder:routing_groups', 'folder:schedules', 'folder:audio_files', 'folder:notification_contacts', 'folder:notification_contact_groups', 'folder:notification_policies']),
  alarmsEventsSelectedNodeId: '',
	  alarmsEventsTreeRoot: null,
	  alarmsEventsSelectedChildId: '',
	  alarmsEventsSelectedChildIds: [],
	  alarmsEventsSelectedChildAnchorId: '',
	  alarmsEventsChildrenSort: {},
  alarmsEventsPropsDirty: false,
  pendingNewDevice: null,
  pendingNewTag: null,
  pendingWorkspaceItem: null,
  alarmModalAudioSequenceInput: null,
  draggedDeviceConnectionId: '',

  // workspace right-pane table (selection + sorting)
  workspaceChildrenSelRoot: '',
  workspaceChildrenSel: new Set(), // keys like "connection_id::tag_name"
  workspaceChildrenLastIndex: -1,
  workspaceChildrenSort: { key: 'name', dir: 'asc' },

  // auth status cache (opcbridge cookie-based)
  opcbridgeAuthStatus: null,
  authWasLoggedIn: false,
  authLastLogoutAtMs: 0,
  authAdminLoaded: false,
  authAdminLoadInFlight: false,

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

function canAccessAlarmsEventsTab() {
  // Requires both: editing config (alarms/events) + managing server (notification behavior / outputs).
  return hasPerm('opcbridge.edit_config') && hasPerm('suite.manage_server');
}

function canAccessLoggerTab() {
  return hasPerm('suite.manage_server');
}

function canEditConfig() {
  return hasPerm('opcbridge.edit_config');
}

function isPanelActive(panelId) {
  const panel = document.getElementById(panelId);
  return Boolean(panel && panel.classList.contains('is-active'));
}

function isAlarmsEventsPropertiesEditorOpen() {
  const el = els.alarmsEventsPropsEditor;
  if (!el) return false;
  if (el.style.display === 'none') return false;
  if (state.alarmsEventsPropsDirty === true) return true;
  const active = document.activeElement;
  if (!active || !el.contains(active)) return false;
  const tag = String(active.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || active.isContentEditable === true;
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

function updateAuthAdminPanelVisibility() {
  if (!els.authAdminCard) return;
  els.authAdminCard.style.display = canAccessConfigureTab() ? '' : 'none';
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

function updateAlarmsEventsTabVisibility() {
  const aeBtn = document.querySelector('.tabs .tab[data-tab="alarms_events"]');
  if (!aeBtn) return;
  const canSee = canAccessAlarmsEventsTab();
  aeBtn.style.display = canSee ? '' : 'none';

  if (!canSee) {
    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel && activePanel.id === 'tab-alarms_events') {
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
    td0.className = 'cell-check';
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
  if (next === 'alarms_events' && !canAccessAlarmsEventsTab()) {
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
  if (id === 'configure') {
    ensureAuthAdminPanelLoaded();
    loadSoundSettings().catch(() => {});
    loadVoiceModemSettings().catch(() => {});
  }
  if (id === 'alarms_events') {
    loadAlarmNotificationSettings().catch(() => {});
    renderAlarmsSchemaStatus(state.alarmsStatusLast);
    renderAlarmsEventsTree();
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

async function fetchWithTimeout(url, init = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiGet(url, { timeoutMs = 30000 } = {}) {
  const res = await fetchWithTimeout(url, { cache: 'no-store', headers: { Accept: 'application/json' } }, timeoutMs);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      refreshUserAuthLine().catch(() => {});
      if (state.opcbridgeAuthStatus?.configured) {
        setWorkspaceSaveStatus('Login required. Press Login.');
      }
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGetText(url, { timeoutMs = 30000 } = {}) {
  const res = await fetchWithTimeout(url, { cache: 'no-store' }, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function apiPostJson(url, bodyObj, { timeoutMs = 120000 } = {}) {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(bodyObj || {})
  }, timeoutMs);
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = { ok: false, error: text || `HTTP ${res.status}` }; }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      refreshUserAuthLine().catch(() => {});
      if (state.opcbridgeAuthStatus?.configured) {
        setWorkspaceSaveStatus('Login required. Press Login.');
      }
    }
    const msg = parsed?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parsed;
}

async function apiJson(url, { method, bodyObj, timeoutMs } = {}) {
  const m = String(method || 'GET').toUpperCase();
  const init = { method: m, headers: { Accept: 'application/json' } };
  if (m !== 'GET' && m !== 'HEAD') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(bodyObj || {});
  }
  const res = await fetchWithTimeout(url, init, timeoutMs || (m === 'GET' || m === 'HEAD' ? 30000 : 120000));
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = { ok: false, error: text || `HTTP ${res.status}` }; }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      refreshUserAuthLine().catch(() => {});
      if (state.opcbridgeAuthStatus?.configured) {
        setWorkspaceSaveStatus('Login required. Press Login.');
      }
    }
    const msg = parsed?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parsed;
}

async function copyTextToClipboardSafe(text) {
  const value = String(text || '');
  if (!value) return;
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', 'readonly');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  if (!ok) throw new Error('Clipboard API unavailable');
}

async function opcbridgeReload() {
  const r = await apiPostJson('/api/opcbridge/reload', {});
  if (r && r.pending) {
    const gen = (typeof r.gen === 'number') ? r.gen : null;
    await waitForOpcbridgeReloadDone({ gen });
  }
}

function renderRuntimeRebuildStatus(status) {
  const required = Boolean(status?.full_rebuild_required);
  if (els.overviewRebuildStatus) {
    els.overviewRebuildStatus.textContent = required ? 'Full rebuild required.' : 'Full runtime is current.';
    els.overviewRebuildStatus.className = required ? 'status warn' : 'status ok';
  }
  if (els.overviewRebuildHint) {
    els.overviewRebuildHint.textContent = required
      ? 'Press Rebuild Full Runtime to refresh OPC UA nodes and rebuild all runtime bindings.'
      : 'Save + Reload performs a full runtime rebuild so all clients see the same runtime state.';
  }
  if (els.overviewRebuildBtn) {
    els.overviewRebuildBtn.disabled = !canEditConfig() || Boolean(status?.in_progress);
  }
}

function wireOverviewRuntimeUi() {
  if (els.overviewRebuildBtn && els.overviewRebuildBtn.dataset.wired !== '1') {
    els.overviewRebuildBtn.dataset.wired = '1';
    els.overviewRebuildBtn.addEventListener('click', async () => {
      if (!canEditConfig()) {
        openLoginModal();
        return;
      }
      if (!window.confirm('Rebuild the full opcbridge runtime? This pauses all pollers and rebuilds OPC UA nodes.')) return;
      try {
        els.overviewRebuildBtn.disabled = true;
        if (els.overviewRebuildStatus) {
          els.overviewRebuildStatus.textContent = 'Rebuilding full runtime…';
          els.overviewRebuildStatus.className = 'status warn';
        }
        await opcbridgeReload();
        await refreshAll();
      } catch (err) {
        if (els.overviewRebuildStatus) {
          els.overviewRebuildStatus.textContent = `Rebuild failed: ${err.message}`;
          els.overviewRebuildStatus.className = 'status bad';
        }
      }
    });
  }
  const refreshBtns = [els.alarmRuntimeRefreshBtn, els.alarmsEventsRuntimeRefreshBtn].filter(Boolean);
  refreshBtns.forEach((btn) => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => { refreshAll().catch(() => {}); });
  });
  const restartBtns = [els.alarmRuntimeRestartBtn, els.alarmsEventsRuntimeRestartBtn].filter(Boolean);
  restartBtns.forEach((btn) => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', restartAlarmRuntimeService);
  });
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
    'polling_mode',
    'polling_pacing',
    'poll_batch_size',
    'poll_time_budget_ms',
    'source_file',
    'action'
  ];

  const rows = objs.filter(Boolean).map(({ rel, obj }) => {
    const cid = String(obj?.connection_id || obj?.id || '') || inferConnectionIdFromPath(rel);
    const driver = String(obj?.driver || '').trim();
    const plcType = String(obj?.plc_type || obj?.plcType || '').trim();
    const pollingMode = normalizePollingMode(obj?.polling_mode);
    const pollingPacing = normalizePollingPacing(obj?.polling_pacing);
    const pollBatchSize = Number(obj?.poll_batch_size);
    const pollTimeBudgetMs = Number(obj?.poll_time_budget_ms);
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
      polling_mode: pollingMode,
      polling_pacing: pollingPacing,
      poll_batch_size: Number.isFinite(pollBatchSize) && pollBatchSize > 0 ? String(Math.trunc(pollBatchSize)) : '',
      poll_time_budget_ms: Number.isFinite(pollTimeBudgetMs) && pollTimeBudgetMs > 0 ? String(Math.trunc(pollTimeBudgetMs)) : '',
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
	    'source_tag',
	    'bit',
	    'invert',
	    'datatype',
	    'elem_count',
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
	    // Derived tags: source_tag is set (bit optional) and no plc_tag_name
	    // Direct tags: plc_tag_name and no source_tag/bit
	    connection_id: cid,
	    name: String(t?.name || '').trim(),
	    plc_tag_name: (String(t?.source_tag || '').trim() !== '') ? '' : String(t?.plc_tag_name || '').trim(),
	    source_tag: String(t?.source_tag || '').trim(),
	    bit: (t?.bit == null || String(t?.source_tag || '').trim() === '') ? '' : String(t.bit),
	    invert: (t?.invert === true) ? 'true' : 'false',
	    datatype: String(t?.datatype || '').trim(),
	    elem_count: (t?.elem_count == null) ? '' : String(t.elem_count),
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

const ALARM_CSV_HEADERS = [
  'id',
  'name',
  'group',
  'site',
  'connection_id',
  'tag_name',
  'type',
  'value',
  'threshold',
  'hysteresis',
  'severity',
  'enabled',
  'audible_enabled',
  'audio_file',
  'speech_text',
  'notification_policy',
  'message_on_active',
  'message_on_return',
  'action'
];

function alarmCsvValueText(alarm) {
  if (!Object.prototype.hasOwnProperty.call(alarm || {}, 'value')) return '';
  const value = alarm.value;
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseAlarmCompareValueCsv(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const n = Number(raw);
  if (Number.isFinite(n) && raw !== '') return n;
  try {
    if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) return JSON.parse(raw);
  } catch {
    // Keep plain text if the user did not enter valid JSON.
  }
  return raw;
}

function unwrapAlarmCompareValue(value) {
  let cur = value;
  for (let i = 0; i < 8; i += 1) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) break;
    if (!Object.prototype.hasOwnProperty.call(cur, 'value')) break;
    if (Object.prototype.hasOwnProperty.call(cur, 'ok') && cur.ok !== true) break;
    cur = cur.value;
  }
  return cur;
}

function downloadAlarmsCsv({ group = '', site = '' } = {}) {
  const cfg = state.alarmsConfig || { alarms: [] };
  const g = String(group || '').trim();
  const s = String(site || '').trim();
  const alarms = (Array.isArray(cfg.alarms) ? cfg.alarms : [])
    .filter((a) => {
      if (!g && !s) return true;
      const ag = String(a?.group || '').trim();
      const as = String(a?.site || '').trim();
      if (g && ag !== g) return false;
      if (s && as !== s) return false;
      return true;
    })
    .slice()
    .sort((a, b) => String(a?.group || '').localeCompare(String(b?.group || ''), undefined, { numeric: true, sensitivity: 'base' })
      || String(a?.site || '').localeCompare(String(b?.site || ''), undefined, { numeric: true, sensitivity: 'base' })
      || String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const rows = alarms.map((a) => ({
    id: String(a?.id || '').trim(),
    name: String(a?.name || a?.id || '').trim(),
    group: String(a?.group || '').trim(),
    site: String(a?.site || '').trim(),
    connection_id: String(a?.connection_id || '').trim(),
    tag_name: String(a?.tag_name || a?.tag || '').trim(),
    type: String(a?.type || '').trim(),
    value: alarmCsvValueText(a),
    threshold: (a?.threshold == null) ? '' : String(a.threshold),
    hysteresis: (a?.hysteresis == null) ? '' : String(a.hysteresis),
    severity: (a?.severity == null) ? '500' : String(a.severity),
    enabled: (a?.enabled !== false) ? 'true' : 'false',
    audible_enabled: Object.prototype.hasOwnProperty.call(a || {}, 'audible_enabled') ? (a.audible_enabled ? 'true' : 'false') : '',
    audio_file: String(a?.audio_file || '').trim(),
    speech_text: String(a?.speech_text || '').trim(),
    notification_policy: String(a?.notification_policy || '').trim(),
    message_on_active: String(a?.message_on_active || '').trim(),
    message_on_return: String(a?.message_on_return || '').trim(),
    action: ''
  }));

  downloadTextFile({
    filename: (g || s)
      ? `opcbridge-alarms-${(g || 'all').replace(/[^a-z0-9._-]+/gi, '_')}${s ? `-${s.replace(/[^a-z0-9._-]+/gi, '_')}` : ''}.csv`
      : 'opcbridge-alarms.csv',
    mime: 'text/csv',
    text: toCsv(rows, ALARM_CSV_HEADERS)
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

function isNumericBitSourceDatatype(dt) {
  const s = String(dt || '').trim().toLowerCase();
  return s === 'int16' || s === 'uint16' || s === 'int32' || s === 'uint32';
}

function getDerivedBitSourceOptions(connectionId, excludeTagName) {
  const cid = String(connectionId || '').trim();
  const ex = String(excludeTagName || '').trim();
  const all = getEffectiveTagsAll();
  const names = all
    .filter((t) => String(t?.connection_id || '') === cid)
    .filter((t) => String(t?.name || '') !== ex)
    .filter((t) => String(t?.plc_tag_name || '').trim() !== '')
    .filter((t) => isNumericBitSourceDatatype(t?.datatype))
    .flatMap((t) => {
      const name = String(t?.name || '').trim();
      if (!name) return [];
      const ec = Math.max(1, Math.floor(Number(t?.elem_count) || 1));
      if (ec <= 1) return [name];
      const out = [];
      for (let i = 0; i < ec; i++) out.push(`${name}[${i}]`);
      return out;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return names;
}

function getDerivedAliasSourceOptions(connectionId, excludeTagName) {
  const cid = String(connectionId || '').trim();
  const ex = String(excludeTagName || '').trim();
  const all = getEffectiveTagsAll();
  const names = all
    .filter((t) => String(t?.connection_id || '') === cid)
    .filter((t) => String(t?.name || '') !== ex)
    .filter((t) => String(t?.plc_tag_name || '').trim() !== '')
    .flatMap((t) => {
      const name = String(t?.name || '').trim();
      if (!name) return [];
      const ec = Math.max(1, Math.floor(Number(t?.elem_count) || 1));
      if (ec <= 1) return [name];
      const out = [];
      for (let i = 0; i < ec; i++) out.push(`${name}[${i}]`);
      return out;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return names;
}

function applyTagSourceKindUi({ kindEl, plcEl, derivedRowEl, sourceEl, bitBoxEl, bitEl, datatypeEl, elemCountEl, writableEl, mqttAllowedEl, scalingEl, scalingLinearRowEl }, { connId, excludeTagName }) {
  const kind = String(kindEl?.value || 'plc').trim().toLowerCase();
  const isDerivedBit = (kind === 'derived_bit');
  const isDerivedAlias = (kind === 'derived_alias');
  const isDerived = (isDerivedBit || isDerivedAlias);

  if (derivedRowEl) derivedRowEl.style.display = isDerived ? '' : 'none';
  if (bitBoxEl) bitBoxEl.style.display = isDerivedBit ? '' : 'none';
  if (plcEl) plcEl.disabled = isDerived || !canEditConfig();
  if (sourceEl) sourceEl.disabled = !canEditConfig();
  if (bitEl) bitEl.disabled = isDerivedAlias || !canEditConfig();

  if (datatypeEl) {
    if (isDerivedBit) {
      fillTagDatatypeSelect(datatypeEl, 'bool');
      datatypeEl.disabled = true;
    } else {
      datatypeEl.disabled = !canEditConfig();
    }
  }

  if (elemCountEl) elemCountEl.disabled = isDerived || !canEditConfig();
  if (writableEl) {
    if (isDerivedAlias) writableEl.checked = false;
    writableEl.disabled = isDerivedAlias || !canEditConfig();
  }
  if (mqttAllowedEl) {
    if (isDerivedAlias) mqttAllowedEl.checked = false;
    mqttAllowedEl.disabled = isDerivedAlias || !canEditConfig();
  }

  if (scalingEl) {
    if (isDerivedBit) {
      scalingEl.value = 'none';
      scalingEl.disabled = true;
      if (scalingLinearRowEl) scalingLinearRowEl.style.display = 'none';
    } else {
      scalingEl.disabled = !canEditConfig();
    }
  }

  if (isDerivedBit && sourceEl) {
    const opts = getDerivedBitSourceOptions(connId, excludeTagName);
    const selected = String(sourceEl.value || '').trim();
    sourceEl.innerHTML = '';
    opts.forEach((n) => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sourceEl.appendChild(o);
    });
    if (selected && opts.includes(selected)) sourceEl.value = selected;
  }
  if (isDerivedAlias && sourceEl) {
    const opts = getDerivedAliasSourceOptions(connId, excludeTagName);
    const selected = String(sourceEl.value || '').trim();
    sourceEl.innerHTML = '';
    opts.forEach((n) => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sourceEl.appendChild(o);
    });
    if (selected && opts.includes(selected)) sourceEl.value = selected;
  }
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
    const pollingMode = normalizePollingMode(csvGet(r, 'polling_mode'));
    const pollingPacing = normalizePollingPacing(csvGet(r, 'polling_pacing'));
    const pollBatchSize = parseIntLoose(csvGet(r, 'poll_batch_size'), 0) || 0;
    const pollTimeBudgetMs = parseIntLoose(csvGet(r, 'poll_time_budget_ms'), 0) || 0;

    const obj = applyPollingConfigToConnection(
      { id: connection_id, description, driver, gateway, path: pathVal, slot, plc_type },
      { mode: pollingMode, pacing: pollingPacing, batchSize: pollBatchSize, timeBudgetMs: pollTimeBudgetMs }
    );

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

  if (workspaceIsDirty()) {
    window.alert('Please Save or Discard current Workspace changes before importing a tag CSV. Server-side CSV import writes directly to the tag file.');
    return;
  }

  const csvText = await pickCsvText();
  if (!csvText) return;

  setWorkspaceSaveStatus(`Importing tags CSV for ${cid} on server...`);
  renderWorkspaceSaveBar();

  const result = await apiPostJson('/api/opcbridge/config/tags/import_csv', { connection_id: cid, csv: csvText });
  setWorkspaceSaveStatus('Imported CSV. Rebuilding full runtime…');
  renderWorkspaceSaveBar();
  await opcbridgeReload();
  await loadTagsConfig();
  await refreshAll().catch(() => {});
  renderWorkspaceTree();

  const skipped = Number(result?.skipped || 0);
  const wrong = Number(result?.skipped_wrong_connection_id || 0);
  const missing = Number(result?.skipped_missing_required_fields || 0);
  const skipParts = [];
  if (wrong) skipParts.push(`${wrong} wrong connection_id`);
  if (missing) skipParts.push(`${missing} missing required fields`);
  const skipText = skipped ? `, skipped ${skipped}${skipParts.length ? ` (${skipParts.join(', ')})` : ''}` : '';
  setWorkspaceSaveStatus(`Imported tags CSV for ${cid}: upserted ${Number(result?.upserted || 0)}, deleted ${Number(result?.deleted || 0)}${skipText}. Rebuilt full runtime.`);
}

async function importAlarmsCsv() {
  if (!canEditConfig()) { window.alert('Login required to import alarms.'); return; }
  const csvText = await pickCsvText();
  if (!csvText) return;

  const { records } = parseCsv(csvText);
  if (!records.length) { window.alert('CSV had no data rows (make sure the first row is a header).'); return; }

  const cfg = await loadOpcbridgeAlarmsConfig();
  if (!Array.isArray(cfg.alarms)) cfg.alarms = [];
  ensureAlarmGroupsTree(cfg);

  // Build lookup maps so re-imports don't accidentally duplicate alarms if IDs differ.
  const idxById = new Map();
  const idxByConnTag = new Map(); // key: conn_id + \0 + tag_name
  const idxByNameConnTag = new Map(); // key: name + \0 + conn_id + \0 + tag_name
  cfg.alarms.forEach((a, i) => {
    const id = String(a?.id || '').trim();
    if (id && !idxById.has(id)) idxById.set(id, i);
    const conn = String(a?.connection_id || '').trim();
    const tag = String(a?.tag_name || a?.tag || '').trim();
    const name = String(a?.name || '').trim();
    if (conn && tag) {
      const k = `${conn}\0${tag}`;
      if (!idxByConnTag.has(k)) idxByConnTag.set(k, i);
      if (name) {
        const k2 = `${name.toLowerCase()}\0${conn}\0${tag}`;
        if (!idxByNameConnTag.has(k2)) idxByNameConnTag.set(k2, i);
      }
    }
  });

  let upserts = 0;
  let deleted = 0;
  let skipped = 0;
  let skippedMissing = 0;
  let skippedInvalid = 0;
  let sampleMissing = null;
  let sampleInvalid = null;

  records.forEach((r) => {
    const id = String(csvGet(r, 'id') || csvGet(r, 'alarm_id') || '').trim();
    if (!id) {
      skipped += 1;
      skippedMissing += 1;
      if (!sampleMissing) sampleMissing = { id, reason: 'missing id' };
      return;
    }
    // Guardrail: alarm IDs should not contain whitespace.
    // Whitespace (including accidental spaces) can cause imports to create duplicates and break routing.
    if (/\s/.test(id)) {
      skipped += 1;
      skippedInvalid += 1;
      if (!sampleInvalid) sampleInvalid = { id, reason: `invalid id (contains whitespace): '${id}'` };
      return;
    }

    let idx = idxById.has(id) ? idxById.get(id) : -1;
    if (isDeleteAction(csvGet(r, 'action'))) {
      if (idx >= 0) {
        cfg.alarms.splice(idx, 1);
        deleted += 1;
      }
      return;
    }

    const typeRaw = String(csvGet(r, 'type') || '').trim().toLowerCase();
    let type = typeRaw.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (type === 'not_equal' || type === 'notequals' || type === 'ne' || type === 'neq' || type === '!=')
      type = 'not_equals';
    if (type === 'equal' || type === 'eq' || type === '==') type = 'equals';
    if (!['equals', 'not_equals', 'high', 'low'].includes(type)) {
      skipped += 1;
      skippedInvalid += 1;
      if (!sampleInvalid) sampleInvalid = { id, reason: `invalid type '${typeRaw || '(blank)'}'` };
      return;
    }

    const rawConn = String(csvGet(r, 'connection_id') || '');
    const rawTag = String(csvGet(r, 'tag_name') || csvGet(r, 'tag') || '');
    const connectionId = rawConn.trim();
    const tagName = rawTag.trim();
    if (!connectionId || !tagName) {
      skipped += 1;
      skippedMissing += 1;
      if (!sampleMissing) sampleMissing = { id, reason: 'missing connection_id or tag_name' };
      return;
    }
    // Guardrail: connection_id and tag_name should not contain whitespace.
    // Whitespace (including accidental spaces) can cause imports to create duplicate alarms.
    if (/\s/.test(connectionId)) {
      skipped += 1;
      skippedInvalid += 1;
      if (!sampleInvalid) sampleInvalid = { id, reason: `invalid connection_id (contains whitespace): '${connectionId}'` };
      return;
    }
    if (/\s/.test(tagName)) {
      skipped += 1;
      skippedInvalid += 1;
      if (!sampleInvalid) sampleInvalid = { id, reason: `invalid tag_name (contains whitespace): '${tagName}'` };
      return;
    }

    // If no direct ID match, attempt to match existing alarms by (name+conn+tag) or (conn+tag).
    // This prevents accidental duplication when importing a CSV whose "id" column contains the display name.
    if (idx < 0) {
      const nameKey = String(csvGet(r, 'name') || '').trim();
      const k2 = nameKey ? `${nameKey.toLowerCase()}\0${connectionId}\0${tagName}` : '';
      if (k2 && idxByNameConnTag.has(k2)) idx = idxByNameConnTag.get(k2);
      if (idx < 0) {
        const k = `${connectionId}\0${tagName}`;
        if (idxByConnTag.has(k)) idx = idxByConnTag.get(k);
      }
    }

    const alarm = (idx >= 0) ? { ...(cfg.alarms[idx] || {}) } : { id };
    // Preserve existing ID when matching by conn/tag, otherwise use CSV id.
    alarm.id = (idx >= 0 && String((cfg.alarms[idx] || {}).id || '').trim()) ? String((cfg.alarms[idx] || {}).id || '').trim() : id;
    alarm.name = String(csvGet(r, 'name') || alarm.name || id).trim() || id;
    alarm.group = normalizeAlarmGroupName(csvGet(r, 'group'));
    alarm.site = normalizeAlarmSiteName(csvGet(r, 'site'));
    alarm.connection_id = connectionId;
    alarm.tag_name = tagName;
    alarm.type = type;
    alarm.enabled = parseBoolLoose(csvGet(r, 'enabled'), true);

    const sev = parseIntLoose(csvGet(r, 'severity'), 500);
    alarm.severity = Math.max(0, sev == null ? 500 : sev);

    const audibleRaw = csvGet(r, 'audible_enabled');
    if (String(audibleRaw ?? '').trim() === '') delete alarm.audible_enabled;
    else alarm.audible_enabled = parseBoolLoose(audibleRaw, false);

    const audioFile = String(csvGet(r, 'audio_file') || '').trim();
    if (audioFile) alarm.audio_file = validateAlarmAudioFileId(cfg, audioFile);
    else delete alarm.audio_file;

    const speechText = String(csvGet(r, 'speech_text') || '').trim();
    if (speechText) alarm.speech_text = speechText;
    else delete alarm.speech_text;

    const policy = String(csvGet(r, 'notification_policy') || csvGet(r, 'policy') || '').trim();
    if (policy) alarm.notification_policy = policy;
    else delete alarm.notification_policy;

    alarm.message_on_active = String(csvGet(r, 'message_on_active') || '').trim();
    alarm.message_on_return = String(csvGet(r, 'message_on_return') || '').trim();

    if (type === 'high' || type === 'low') {
      const threshold = parseFloatLoose(csvGet(r, 'threshold'), null);
      if (threshold == null) {
        skipped += 1;
        skippedMissing += 1;
        if (!sampleMissing) sampleMissing = { id, reason: 'missing threshold' };
        return;
      }
      alarm.threshold = threshold;
      delete alarm.value;
      delete alarm.equals_value;
      const hysteresis = parseFloatLoose(csvGet(r, 'hysteresis'), null);
      if (hysteresis == null) delete alarm.hysteresis;
      else alarm.hysteresis = hysteresis;
    } else {
      alarm.value = parseAlarmCompareValueCsv(csvGet(r, 'value'));
      delete alarm.threshold;
      delete alarm.hysteresis;
      delete alarm.equals_value;
    }

    if (alarm.group) {
      upsertAlarmGroup(cfg, alarm.group);
      if (alarm.site) ensureGroupSiteInConfig(cfg, alarm.group, alarm.site);
    }

    if (idx >= 0) cfg.alarms[idx] = alarm;
    else cfg.alarms.push(alarm);
    upserts += 1;
  });

  try {
    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
    await opcbridgeReload().catch(() => {});
    renderWorkspaceTree();
    renderAlarmsEventsTree();
  } catch (err) {
    const msg = `CSV import failed: ${String(err?.message || err)}`;
    setWorkspaceSaveStatus(msg);
    window.alert(msg);
    return;
  }

  const details = [];
  if (skippedMissing) details.push(`${skippedMissing} missing required fields`);
  if (skippedInvalid) details.push(`${skippedInvalid} invalid value(s)`);
  const sample = sampleInvalid || sampleMissing;
  const suffix = details.length ? `, skipped ${skipped} (${details.join(', ')})` : (skipped ? `, skipped ${skipped}` : '');
  const example = sample ? ` Example: ${sample.id || '(blank id)'} - ${sample.reason}.` : '';
  const msg = `Imported alarms CSV: upserted ${upserts} alarm(s)${deleted ? `, deleted ${deleted}` : ''}${suffix}.${example}`;
  setWorkspaceSaveStatus(msg);
  window.alert(msg);
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
  if (!obj.audio || typeof obj.audio !== 'object' || Array.isArray(obj.audio)) obj.audio = {};
  if (!Array.isArray(obj.audio.files)) obj.audio.files = [];
  obj.audio.files = obj.audio.files
    .filter((f) => f && typeof f === 'object' && !Array.isArray(f))
    .map((f) => ({
      ...f,
      id: String(f.id || '').trim(),
      name: String(f.name || f.id || '').trim(),
      path: String(f.path || '').trim()
    }))
    .filter((f) => f.id);
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

function getAlarmAudioFiles(cfgObj = state.alarmsConfig) {
  const cfg = (cfgObj && typeof cfgObj === 'object' && !Array.isArray(cfgObj)) ? cfgObj : {};
  const files = Array.isArray(cfg.audio?.files) ? cfg.audio.files : [];
  return files
    .filter((f) => f && typeof f === 'object' && !Array.isArray(f) && String(f.id || '').trim())
    .map((f) => ({
      id: String(f.id || '').trim(),
      name: String(f.name || f.id || '').trim(),
      path: String(f.path || '').trim()
    }))
    .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), undefined, { numeric: true, sensitivity: 'base' }));
}

function alarmAudioFileText(fileId, cfgObj = state.alarmsConfig) {
  const id = String(fileId || '').trim();
  if (!id) return 'none';
  const f = getAlarmAudioFiles(cfgObj).find((x) => x.id === id);
  return f ? `${f.name || f.id} (${f.id})` : id;
}

function createAlarmAudioFileInput(cfgObj, value = '', { placeholder = 'Blank = inherit', disabled = false } = {}) {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '6px';

  const files = getAlarmAudioFiles(cfgObj || {});
  const input = document.createElement('input');
  input.type = 'text';
  input.value = String(value || '').trim();
  input.placeholder = placeholder;
  input.disabled = disabled;

  const list = document.createElement('select');
  list.className = 'alarm-audio-picker-list';
  list.size = Math.min(8, Math.max(3, files.length || 3));
  list.disabled = disabled || !files.length;

  const renderList = () => {
    const q = String(input.value || '').trim().toLowerCase();
    const matches = files.filter((f) => {
      if (!q) return true;
      return [f.id, f.name, f.path].some((v) => String(v || '').toLowerCase().includes(q));
    });
    list.textContent = '';
    matches.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = String(f.id || '').trim();
      opt.textContent = f.path ? `${f.name || f.id} (${f.path})` : `${f.name || f.id} (${f.id})`;
      if (opt.value === String(input.value || '').trim()) opt.selected = true;
      list.appendChild(opt);
    });
    if (!matches.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = files.length ? 'No matching audio files' : 'No audio files configured';
      opt.disabled = true;
      list.appendChild(opt);
    }
  };

  input.addEventListener('input', renderList);
  const applyListSelection = () => {
    const selected = list.selectedOptions && list.selectedOptions.length
      ? String(list.selectedOptions[0].value || '').trim()
      : String(list.value || '').trim();
    input.value = selected;
    renderList();
  };
  list.addEventListener('mousedown', (e) => {
    const opt = e.target && e.target.tagName === 'OPTION' ? e.target : null;
    if (!opt) return;
    const selected = String(opt.value || '').trim();
    if (!selected) return;
    input.value = selected;
    opt.selected = true;
    e.preventDefault();
    renderList();
  }, true);
  list.addEventListener('change', applyListSelection);
  list.addEventListener('dblclick', applyListSelection);
  list.addEventListener('focus', () => {
    if (!String(input.value || '').trim()) renderList();
  });
  renderList();

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn';
  clearBtn.textContent = 'Clear / Inherit';
  clearBtn.disabled = disabled;
  clearBtn.addEventListener('click', () => {
    input.value = '';
    renderList();
    input.focus();
  });

  const row = document.createElement('div');
  row.className = 'row-actions';
  row.style.alignItems = 'stretch';
  row.appendChild(input);
  const showAllBtn = document.createElement('button');
  showAllBtn.type = 'button';
  showAllBtn.className = 'btn';
  showAllBtn.textContent = 'Show All';
  showAllBtn.disabled = disabled || !files.length;
  showAllBtn.addEventListener('click', () => {
    input.value = '';
    renderList();
    list.focus();
  });
  row.appendChild(showAllBtn);
  row.appendChild(clearBtn);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = files.length
    ? 'Type to filter, select a file from the list, paste an audio file ID, or clear to inherit.'
    : 'No audio files are configured yet.';

  wrap.appendChild(row);
  wrap.appendChild(list);
  wrap.appendChild(hint);
  return { wrap, input };
}

function createAlarmAudioSequenceInput(cfgObj, values = [], { disabled = false, onDirty = null } = {}) {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '8px';

  const files = getAlarmAudioFiles(cfgObj || {});
  const byId = new Map(files.map((f) => [String(f.id || '').trim(), f]));
  const sequence = (Array.isArray(values) ? values : [])
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr auto 1fr';
  grid.style.gap = '10px';

  const left = document.createElement('div');
  const filter = document.createElement('input');
  filter.type = 'text';
  filter.placeholder = 'Filter...';
  filter.disabled = disabled;
  filter.style.marginBottom = '6px';
  const leftLabel = document.createElement('div');
  leftLabel.className = 'hint';
  leftLabel.textContent = 'Available Files';
  const available = document.createElement('select');
  available.size = 8;
  available.disabled = disabled;
  left.appendChild(filter);
  left.appendChild(leftLabel);
  left.appendChild(available);

  const middle = document.createElement('div');
  middle.className = 'row-actions';
  middle.style.flexDirection = 'column';
  middle.style.justifyContent = 'center';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn';
  addBtn.textContent = 'Add →';
  addBtn.disabled = disabled;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn';
  removeBtn.textContent = '← Remove';
  removeBtn.disabled = disabled;
  middle.appendChild(addBtn);
  middle.appendChild(removeBtn);

  const right = document.createElement('div');
  const rightSpacer = document.createElement('div');
  rightSpacer.setAttribute('aria-hidden', 'true');
  rightSpacer.style.height = '34px';
  rightSpacer.style.marginBottom = '6px';
  const rightLabel = document.createElement('div');
  rightLabel.className = 'hint';
  rightLabel.textContent = 'Audio Sequence';
  const selected = document.createElement('select');
  selected.size = 8;
  selected.disabled = disabled;
  const order = document.createElement('div');
  order.className = 'row-actions';
  order.style.justifyContent = 'flex-end';
  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'btn';
  upBtn.textContent = 'Up';
  upBtn.disabled = disabled;
  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'btn';
  downBtn.textContent = 'Down';
  downBtn.disabled = disabled;
  order.appendChild(upBtn);
  order.appendChild(downBtn);
  right.appendChild(rightSpacer);
  right.appendChild(rightLabel);
  right.appendChild(selected);
  right.appendChild(order);

  const renderAvailable = () => {
    const q = String(filter.value || '').trim().toLowerCase();
    available.textContent = '';
    files.forEach((f) => {
      const id = String(f.id || '').trim();
      if (!id || sequence.includes(id)) return;
      const text = f.path ? `${f.name || id} (${f.path})` : `${f.name || id} (${id})`;
      if (q && !text.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return;
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = text;
      available.appendChild(opt);
    });
  };

  const renderSelected = (want = '') => {
    selected.textContent = '';
    sequence.forEach((id) => {
      const f = byId.get(id);
      const text = f ? (f.path ? `${f.name || id} (${f.path})` : `${f.name || id} (${id})`) : `${id} (missing)`;
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = text;
      selected.appendChild(opt);
    });
    const chosen = String(want || '').trim();
    if (chosen && Array.from(selected.options).some((o) => o.value === chosen)) selected.value = chosen;
  };

  const addCurrent = () => {
    const id = String(available.value || '').trim();
    if (!id || sequence.includes(id)) return;
    sequence.push(id);
    renderSelected(id);
    renderAvailable();
    if (typeof onDirty === 'function') onDirty();
  };
  const removeCurrent = () => {
    const id = String(selected.value || '').trim();
    const idx = sequence.indexOf(id);
    if (idx < 0) return;
    sequence.splice(idx, 1);
    renderSelected(sequence[Math.min(idx, sequence.length - 1)] || '');
    renderAvailable();
    if (typeof onDirty === 'function') onDirty();
  };
  const moveCurrent = (delta) => {
    const id = String(selected.value || '').trim();
    const idx = sequence.indexOf(id);
    if (idx < 0) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= sequence.length) return;
    const tmp = sequence[idx];
    sequence[idx] = sequence[nextIdx];
    sequence[nextIdx] = tmp;
    renderSelected(id);
    if (typeof onDirty === 'function') onDirty();
  };

  filter.addEventListener('input', renderAvailable);
  addBtn.addEventListener('click', addCurrent);
  removeBtn.addEventListener('click', removeCurrent);
  upBtn.addEventListener('click', () => moveCurrent(-1));
  downBtn.addEventListener('click', () => moveCurrent(1));
  available.addEventListener('dblclick', addCurrent);
  selected.addEventListener('dblclick', removeCurrent);

  grid.appendChild(left);
  grid.appendChild(middle);
  grid.appendChild(right);
  wrap.appendChild(grid);
  renderSelected(sequence[0] || '');
  renderAvailable();

  return {
    wrap,
    getValues: () => sequence.slice(),
    getSelectedValue: () => String(selected.value || '').trim() || String(available.value || '').trim()
  };
}

function validateAlarmAudioFileId(cfgObj, audioFileId) {
  const raw = String(audioFileId || '').trim();
  if (!raw) return '';
  const files = getAlarmAudioFiles(cfgObj || {});
  const exactId = files.find((f) => String(f?.id || '').trim() === raw);
  if (exactId) return String(exactId.id || '').trim();
  const exactName = files.find((f) => String(f?.name || '').trim().toLowerCase() === raw.toLowerCase());
  if (exactName) return String(exactName.id || '').trim();
  const exactPath = files.find((f) => String(f?.path || '').trim().toLowerCase() === raw.toLowerCase());
  if (exactPath) return String(exactPath.id || '').trim();
  const contains = files.filter((f) => [f?.id, f?.name, f?.path].some((v) => String(v || '').toLowerCase().includes(raw.toLowerCase())));
  if (contains.length === 1) return String(contains[0]?.id || '').trim();
  throw new Error(`Audio file '${raw}' is not in the audio files list.`);
}

function findAlarmGroupConfig(cfgObj, groupName) {
  const want = normalizeAlarmGroupName(groupName).toLowerCase();
  if (!want) return null;
  const groups = Array.isArray(cfgObj?.groups) ? cfgObj.groups : [];
  return groups.find((g) => String(g?.name || '').trim().toLowerCase() === want) || null;
}

function findAlarmSiteConfig(cfgObj, groupName, siteName) {
  const group = findAlarmGroupConfig(cfgObj, groupName);
  const want = normalizeAlarmSiteName(siteName).toLowerCase();
  if (!group || !want) return null;
  const sites = Array.isArray(group.sites) ? group.sites : [];
  return sites.find((s) => String(s?.name || '').trim().toLowerCase() === want) || null;
}

function isAlarmSiteProcessingEnabled(cfgObj, groupName, siteName) {
  const site = findAlarmSiteConfig(cfgObj, groupName, siteName);
  return !site || site.alarms_enabled !== false;
}

function alarmsForSite(cfgObj, groupName, siteName) {
  const g = String(groupName || '').trim();
  const s = String(siteName || '').trim();
  return (Array.isArray(cfgObj?.alarms) ? cfgObj.alarms : []).filter((a) => {
    return String(a?.group || '').trim() === g && String(a?.site || '').trim() === s;
  });
}

function alarmsForGroup(cfgObj, groupName) {
  const g = String(groupName || '').trim();
  return (Array.isArray(cfgObj?.alarms) ? cfgObj.alarms : []).filter((a) => String(a?.group || '').trim() === g);
}

function resolveInheritedAlarmAudio(cfgObj, groupName, siteName) {
  const cfg = (cfgObj && typeof cfgObj === 'object' && !Array.isArray(cfgObj)) ? cfgObj : {};
  const pushSeq = (arr, v) => {
    const id = String(v || '').trim();
    if (!id) return;
    arr.push(id);
  };
  const out = {
    audible_enabled: cfg.audio && Object.prototype.hasOwnProperty.call(cfg.audio, 'audible_enabled') ? Boolean(cfg.audio.audible_enabled) : false,
    audio_mode: String(cfg.audio?.audio_mode || 'audio_then_speech'),
    audio_file: String(cfg.audio?.default_file || '').trim(),
    audio_files: [],
    speech_text: String(cfg.audio?.speech_text || '').trim(),
    speech_texts: [],
    source: 'global'
  };
  if (out.audio_file) pushSeq(out.audio_files, out.audio_file);
  if (out.speech_text) out.speech_texts.push(out.speech_text);
  const group = findAlarmGroupConfig(cfg, groupName);
  if (group) {
    if (Object.prototype.hasOwnProperty.call(group, 'audible_enabled')) {
      out.audible_enabled = Boolean(group.audible_enabled);
      out.source = 'group';
    }
    if (String(group.audio_mode || '').trim()) {
      out.audio_mode = String(group.audio_mode || '').trim();
      out.source = 'group';
    }
    if (String(group.audio_file || '').trim()) {
      out.audio_file = String(group.audio_file || '').trim();
      pushSeq(out.audio_files, out.audio_file);
      out.source = 'group';
    }
    if (Array.isArray(group.audio_files)) {
      group.audio_files.forEach((id) => pushSeq(out.audio_files, id));
      if (!String(group.audio_file || '').trim() && out.audio_files.length) out.audio_file = out.audio_files[out.audio_files.length - 1];
      out.source = 'group';
    }
    if (String(group.speech_text || '').trim()) {
      out.speech_text = String(group.speech_text || '').trim();
      out.speech_texts.push(out.speech_text);
      out.source = 'group';
    }
  }
  const site = findAlarmSiteConfig(cfg, groupName, siteName);
  if (site) {
    if (Object.prototype.hasOwnProperty.call(site, 'audible_enabled')) {
      out.audible_enabled = Boolean(site.audible_enabled);
      out.source = 'site';
    }
    if (String(site.audio_mode || '').trim()) {
      out.audio_mode = String(site.audio_mode || '').trim();
      out.source = 'site';
    }
    if (String(site.audio_file || '').trim()) {
      out.audio_file = String(site.audio_file || '').trim();
      pushSeq(out.audio_files, out.audio_file);
      out.source = 'site';
    }
    if (Array.isArray(site.audio_files)) {
      site.audio_files.forEach((id) => pushSeq(out.audio_files, id));
      if (!String(site.audio_file || '').trim() && out.audio_files.length) out.audio_file = out.audio_files[out.audio_files.length - 1];
      out.source = 'site';
    }
    if (String(site.speech_text || '').trim()) {
      out.speech_text = String(site.speech_text || '').trim();
      out.speech_texts.push(out.speech_text);
      out.source = 'site';
    }
  }
  return out;
}

function resolveAlarmAudio(cfgObj, alarm) {
  const inherited = resolveInheritedAlarmAudio(cfgObj, alarm?.group, alarm?.site);
  const ownFile = String(alarm?.audio_file || '').trim();
  const ownFiles = Array.isArray(alarm?.audio_files) ? alarm.audio_files.map((v) => String(v || '').trim()).filter(Boolean) : [];
  const ownSpeech = String(alarm?.speech_text || '').trim();
  const audioFiles = inherited.audio_files ? inherited.audio_files.slice() : [];
  const pushSeq = (arr, v) => {
    const id = String(v || '').trim();
    if (!id) return;
    arr.push(id);
  };
  const speechTexts = inherited.speech_texts ? inherited.speech_texts.slice() : [];
  ownFiles.forEach((id) => pushSeq(audioFiles, id));
  if (ownFile && !(ownFiles.length && ownFiles[0] === ownFile)) pushSeq(audioFiles, ownFile);
  if (ownSpeech) speechTexts.push(ownSpeech);
  const effectiveFile = ownFile || (ownFiles.length ? ownFiles[0] : '') || inherited.audio_file || '';
  const mode = String(alarm?.audio_mode || inherited.audio_mode || 'audio_then_speech').trim();
  const normalizedMode = ['audio_only', 'speech_only', 'audio_then_speech', 'speech_then_audio'].includes(mode) ? mode : 'audio_then_speech';
  return {
    audible_enabled: Object.prototype.hasOwnProperty.call(alarm || {}, 'audible_enabled') ? Boolean(alarm.audible_enabled) : inherited.audible_enabled,
    audio_file: String(effectiveFile).trim(),
    speech_text: String(ownSpeech || inherited.speech_text || '').trim(),
    audio_files: audioFiles,
    speech_texts: speechTexts,
    audio_mode: normalizedMode,
    source: Object.prototype.hasOwnProperty.call(alarm || {}, 'audible_enabled') || ownFile || ownFiles.length || ownSpeech ? 'alarm' : inherited.source
  };
}

function alarmAudioSequenceText(audioIds, cfgObj = state.alarmsConfig, speechTexts = [], audioMode = 'audio_then_speech') {
  const ids = (Array.isArray(audioIds) ? audioIds : []).map((id) => String(id || '').trim()).filter(Boolean);
  const modeRaw = String(audioMode || 'audio_then_speech').trim();
  const mode = ['audio_only', 'speech_only', 'audio_then_speech', 'speech_then_audio'].includes(modeRaw) ? modeRaw : 'audio_then_speech';
  const audioParts = ids.map((id) => alarmAudioFileText(id, cfgObj));
  const speechParts = (Array.isArray(speechTexts) ? speechTexts : []).map((s) => String(s || '').trim()).filter(Boolean).map((text) => `TTS: ${text.length > 40 ? `${text.slice(0, 40)}...` : text}`);
  let parts = [];
  if (mode === 'audio_only') parts = audioParts;
  else if (mode === 'speech_only') parts = speechParts;
  else if (mode === 'speech_then_audio') parts = speechParts.concat(audioParts);
  else parts = audioParts.concat(speechParts);
  return parts.length ? parts.join(' -> ') : 'none';
}

function parseOpcbridgeAlarmsConfig(resp) {
  // Expected: { ok, json: { alarms: [...] , groups?: [...] }, mtime_ms }
  const cfg = resp?.json;
  if (!cfg || typeof cfg !== 'object') return { alarms: [], groups: [] };
  const out = { ...(cfg || {}) };
  if (Array.isArray(out.rules) && out.rules.length > 0) {
    const legacyById = new Map();
    if (Array.isArray(out.alarms)) {
      out.alarms.forEach((a) => {
        const id = String(a?.id || '').trim();
        if (id) legacyById.set(id, a);
      });
    }
    out.alarms = out.rules.map((rule) => {
      const a = alarmRuleToUiAlarm(rule);
      if (!a) return null;
      const legacy = legacyById.get(String(a.id || '').trim()) || {};
      if (!String(a.notification_policy || '').trim() && String(legacy?.notification_policy || '').trim()) {
        a.notification_policy = String(legacy.notification_policy || '').trim();
      }
      if (!String(a.speech_text || '').trim() && String(legacy?.speech_text || '').trim()) {
        a.speech_text = String(legacy.speech_text || '').trim();
      }
      if (!String(a.audio_mode || '').trim() && String(legacy?.audio_mode || '').trim()) {
        a.audio_mode = String(legacy.audio_mode || '').trim();
      }
      if (!Number.isFinite(Number(a.audio_gap_ms)) && Number.isFinite(Number(legacy?.audio_gap_ms))) {
        a.audio_gap_ms = Math.max(0, Math.trunc(Number(legacy.audio_gap_ms)));
      }
      if ((!Array.isArray(a.audio_files) || !a.audio_files.length) && Array.isArray(legacy?.audio_files) && legacy.audio_files.length) {
        a.audio_files = legacy.audio_files.map((v) => String(v || '').trim()).filter(Boolean);
      }
      if (!String(a.audio_file || '').trim() && String(legacy?.audio_file || '').trim()) {
        a.audio_file = String(legacy.audio_file || '').trim();
      }
      return a;
    }).filter(Boolean);
  } else if (!Array.isArray(out.alarms)) {
    out.alarms = [];
  }
  ensureAlarmGroupsTree(out);
  normalizeAlarmCompareValuesInConfig(out);
  return out;
}

function alarmRuleToUiAlarm(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return null;
  const source = (rule.source && typeof rule.source === 'object' && !Array.isArray(rule.source)) ? rule.source : {};
  const condition = (rule.condition && typeof rule.condition === 'object' && !Array.isArray(rule.condition)) ? rule.condition : {};
  const type = String(condition.type || rule.type || '').trim();
  const out = {
    id: String(rule.id || '').trim(),
    name: String(rule.name || rule.id || '').trim(),
    group: String(rule.group || '').trim(),
    site: String(rule.site || '').trim(),
    connection_id: String(source.connection_id || rule.connection_id || '').trim(),
    tag_name: String(source.tag || rule.tag_name || rule.tag || '').trim(),
    type,
    enabled: rule.enabled !== false,
    severity: Number.isFinite(Number(rule.severity)) ? Math.trunc(Number(rule.severity)) : 500,
    message_on_active: String(rule.message_on_active || '').trim(),
    message_on_return: String(rule.message_on_return || '').trim()
  };
  if (Object.prototype.hasOwnProperty.call(rule, 'audible_enabled')) out.audible_enabled = Boolean(rule.audible_enabled);
  if (String(rule.audio_mode || '').trim()) out.audio_mode = String(rule.audio_mode || '').trim();
  if (Number.isFinite(Number(rule.audio_gap_ms))) out.audio_gap_ms = Math.max(0, Math.trunc(Number(rule.audio_gap_ms)));
  if (String(rule.audio_file || '').trim()) out.audio_file = String(rule.audio_file || '').trim();
  if (Array.isArray(rule.audio_files)) out.audio_files = rule.audio_files.map((v) => String(v || '').trim()).filter(Boolean);
  if (String(rule.speech_text || '').trim()) out.speech_text = String(rule.speech_text || '').trim();
  if (String(rule.notification_policy || '').trim()) out.notification_policy = String(rule.notification_policy || '').trim();
  if (type === 'high' || type === 'low') {
    if (condition.threshold != null) out.threshold = condition.threshold;
    if (condition.hysteresis != null) out.hysteresis = condition.hysteresis;
  } else if (type === 'equals' || type === 'not_equals') {
    if (Object.prototype.hasOwnProperty.call(condition, 'value')) out.value = unwrapAlarmCompareValue(condition.value);
  }
  return out.id ? out : null;
}

function uiAlarmToRule(alarm) {
  const a = (alarm && typeof alarm === 'object' && !Array.isArray(alarm)) ? alarm : {};
  const type = String(a.type || '').trim();
  const rule = {
    id: String(a.id || '').trim(),
    name: String(a.name || a.id || '').trim(),
    group: String(a.group || '').trim(),
    site: String(a.site || '').trim(),
    enabled: a.enabled !== false,
    severity: Number.isFinite(Number(a.severity)) ? Math.trunc(Number(a.severity)) : 500,
    source: {
      connection_id: String(a.connection_id || '').trim(),
      tag: String(a.tag_name || a.tag || '').trim()
    },
    condition: { type },
    message_on_active: String(a.message_on_active || '').trim(),
    message_on_return: String(a.message_on_return || '').trim()
  };
  if (Object.prototype.hasOwnProperty.call(a, 'audible_enabled')) rule.audible_enabled = Boolean(a.audible_enabled);
  if (String(a.audio_mode || '').trim()) rule.audio_mode = String(a.audio_mode || '').trim();
  if (Number.isFinite(Number(a.audio_gap_ms))) rule.audio_gap_ms = Math.max(0, Math.trunc(Number(a.audio_gap_ms)));
  if (String(a.audio_file || '').trim()) rule.audio_file = String(a.audio_file || '').trim();
  if (Array.isArray(a.audio_files)) {
    const ids = a.audio_files.map((v) => String(v || '').trim()).filter(Boolean);
    if (ids.length) rule.audio_files = ids;
  }
  if (String(a.speech_text || '').trim()) rule.speech_text = String(a.speech_text || '').trim();
  if (String(a.notification_policy || '').trim()) rule.notification_policy = String(a.notification_policy || '').trim();
  if (type === 'high' || type === 'low') {
    rule.condition.threshold = Number(a.threshold);
    if (a.hysteresis != null && String(a.hysteresis).trim() !== '') rule.condition.hysteresis = Number(a.hysteresis);
  } else if (type === 'equals' || type === 'not_equals') {
    rule.condition.value = unwrapAlarmCompareValue(Object.prototype.hasOwnProperty.call(a, 'value') ? a.value : a.equals_value);
  }
  return rule;
}

function normalizeAlarmCompareValuesInConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || !Array.isArray(cfg.alarms)) return cfg;
  cfg.alarms.forEach((alarm) => {
    const type = String(alarm?.type || '').trim();
    if (type === 'equals' || type === 'not_equals') {
      if (Object.prototype.hasOwnProperty.call(alarm, 'value')) alarm.value = unwrapAlarmCompareValue(alarm.value);
      if (Object.prototype.hasOwnProperty.call(alarm, 'equals_value')) alarm.equals_value = unwrapAlarmCompareValue(alarm.equals_value);
    }
  });
  return cfg;
}

function syncAlarmRulesFromAlarms(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return cfg;
  if (!Array.isArray(cfg.alarms)) cfg.alarms = [];
  normalizeAlarmCompareValuesInConfig(cfg);
  const rules = cfg.alarms.map(uiAlarmToRule);
  const invalid = [];
  rules.forEach((r, idx) => {
    const ok = Boolean(r?.id && r?.source?.connection_id && r?.source?.tag && r?.condition?.type);
    if (ok) return;
    const alarm = cfg.alarms[idx] || {};
    invalid.push(String(alarm?.id || `#${idx + 1}`));
  });
  if (invalid.length) {
    throw new Error(`Cannot save alarms config. Invalid trigger fields for: ${invalid.join(', ')}`);
  }
	  cfg.rules = rules;
	  return cfg;
	}

function buildEmptySchema2Config() {
  return {
    schema_version: 2,
    timezone: 'America/Chicago',
    // Schedules are user-defined. The special schedule_id "always" is virtual/implicit
    // and should not be persisted as a schedule row.
    schedules: [],
    groups: [],
    alarms: [],
    rules: [],
    // Current notification model:
    targets: [],
    routes: [],
    policies: [],
    assignments: [],
    alarm_groups: [],
    // Other top-level sections:
    audio: { files: [] },
    sip: {},
    scada: {}
  };
}

function alarmTreeSafeKey(value) {
  const k = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return k || 'none';
}

function alarmEventsSiteNodeId(group, site) {
  const groupLabel = String(group || '').trim() || 'Unassigned';
  const siteLabel = String(site || '').trim() || 'Unassigned';
  const groupNodeId = `alarm_group:${alarmTreeSafeKey(groupLabel)}`;
  return `${groupNodeId}:site:${alarmTreeSafeKey(siteLabel)}`;
}

function expandAlarmEventsAlarmPath(group, site) {
  if (!state.alarmsEventsExpanded) state.alarmsEventsExpanded = new Set();
  const groupLabel = String(group || '').trim() || 'Unassigned';
  state.alarmsEventsExpanded.add('folder:alarms_events');
  state.alarmsEventsExpanded.add('folder:alarms');
  state.alarmsEventsExpanded.add(`alarm_group:${alarmTreeSafeKey(groupLabel)}`);
  state.alarmsEventsExpanded.add(alarmEventsSiteNodeId(group, site));
}

function selectAlarmEventsAlarm(alarmId, group, site) {
  expandAlarmEventsAlarmPath(group, site);
  state.alarmsEventsSelectedNodeId = alarmEventsSiteNodeId(group, site);
  state.alarmsEventsSelectedChildId = alarmId ? `alarm:${alarmId}` : '';
}

function cleanupLeakedRouteGroupAssignments(cfg) {
  const alarms = Array.isArray(cfg?.alarms) ? cfg.alarms : [];
  const groupNames = new Set((Array.isArray(cfg?.groups) ? cfg.groups : []).map((g) => String(g?.name || '').trim().toLowerCase()).filter(Boolean));
  const routeNames = new Set(getRoutingAlarmGroups(cfg).flatMap((route) => {
    const id = String(route?.id || '').trim().toLowerCase();
    const name = String(route?.name || '').trim().toLowerCase();
    return [id, name].filter(Boolean);
  }));
  let changed = false;
  alarms.forEach((alarm) => {
    const group = String(alarm?.group || '').trim();
    if (!group) return;
    const key = group.toLowerCase();
    if (groupNames.has(key)) return;
    if (!routeNames.has(key)) return;
    alarm.group = '';
    alarm.site = '';
    changed = true;
  });
  return changed;
}

function normalizeAlarmsConfigInvariants(cfg) {
  const out = (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) ? cfg : {};
  const fixes = [];

  // v2-only: enforce one schema and remove any legacy subtree.
  out.schema_version = 2;
  if (Object.prototype.hasOwnProperty.call(out, 'notifications')) {
    delete out.notifications;
    fixes.push('removed legacy notifications subtree');
  }
  if (!Array.isArray(out.targets)) out.targets = [];
  if (!Array.isArray(out.routes)) out.routes = [];
  if (!Array.isArray(out.policies)) out.policies = [];
  if (!Array.isArray(out.alarm_groups)) out.alarm_groups = [];
  if (!Array.isArray(out.schedules)) out.schedules = [];
  if (!out.audio || typeof out.audio !== 'object' || Array.isArray(out.audio)) out.audio = {};
  if (!Array.isArray(out.audio.files)) out.audio.files = [];

  // Option A: schedule_id="always" is virtual/implicit and should not be persisted.
  // If an 'always' schedule row exists (legacy), prune it.
  {
    const schedules = getSchedules(out);
    const before = schedules.length;
    out.schedules = schedules.filter((s) => String(s?.id || '').trim() !== 'always');
    if (out.schedules.length !== before) fixes.push("removed persisted 'always' schedule (virtual)");
  }

  const configuredOutput = getConfiguredAudioOutput(out);
  const route = findDefaultAudioRoute(out);
  if (route && route.type === 'audio_command') {
    const wantArgs = buildAudioRouteArgsForOutput(configuredOutput);
    const curArgs = Array.isArray(route.args) ? route.args.map((v) => String(v || '')) : [];
    if (JSON.stringify(curArgs) !== JSON.stringify(wantArgs)) {
      route.args = wantArgs;
      fixes.push(`aligned default_audio route args to configured output '${configuredOutput}'`);
    }
  }

  return fixes;
}

async function loadOpcbridgeAlarmsConfig() {
  const resp = await apiGet('/api/opcbridge/config/alarms');
  state.alarmsConfigLast = resp || null;
  state.alarmsConfigMtimeMs = Number(resp?.mtime_ms || 0) || 0;
  state.alarmsConfig = parseOpcbridgeAlarmsConfig(resp);
  const leakedChanged = cleanupLeakedRouteGroupAssignments(state.alarmsConfig);
  const fixes = normalizeAlarmsConfigInvariants(state.alarmsConfig);
  // Auto-fix should never clobber user edits. If we need to persist fixes,
  // do it only when we can prove we're saving the latest server version.
  if (leakedChanged || fixes.length) {
    try {
      const live = await apiGet('/api/opcbridge/config/alarms');
      const liveMs = Number(live?.mtime_ms || 0) || 0;
      // Only persist fixes if the server version we just read matches what we're holding.
      if (liveMs && state.alarmsConfigMtimeMs && liveMs !== state.alarmsConfigMtimeMs) {
        // Skip persisting; show hint so user can reload rather than risk overwriting.
        if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = `Auto-fix available (not applied): config changed on server. Reload to apply: ${fixes.join('; ')}`;
      } else {
        await saveOpcbridgeAlarmsConfig(state.alarmsConfig);
        if (els.alarmsEventsPropsStatus && fixes.length) {
          els.alarmsEventsPropsStatus.textContent = `Auto-fixed config: ${fixes.join('; ')}`;
        }
      }
    } catch {
      // If we can't verify freshness, don't risk overwriting.
      if (els.alarmsEventsPropsStatus && fixes.length) {
        els.alarmsEventsPropsStatus.textContent = `Auto-fix available (not applied): ${fixes.join('; ')}`;
      }
    }
  }
  return state.alarmsConfig;
}

async function saveOpcbridgeAlarmsConfig(nextCfg) {
  const obj = (nextCfg && typeof nextCfg === 'object' && !Array.isArray(nextCfg)) ? nextCfg : {};
  const allowAlarmDrop = obj.__allow_alarm_drop === true;
  if (Object.prototype.hasOwnProperty.call(obj, '__allow_alarm_drop')) delete obj.__allow_alarm_drop;
  if (!Array.isArray(obj.alarms)) obj.alarms = [];

  // Option A: schedule_id="always" is virtual/implicit. Ensure we never persist an 'always' schedule row.
  if (Array.isArray(obj.schedules)) {
    const before = obj.schedules.length;
    obj.schedules = obj.schedules.filter((s) => String(s?.id || '').trim() !== 'always');
    // Keep normalization side-effect silent here; normalizeAlarmsConfigInvariants() may add a fix note elsewhere.
    void before;
  }

  // Guardrail: this editor writes the full alarms.json document.
  // If our in-memory view is stale/partial, a normal save can accidentally wipe alarms/rules.
  // Block unexpected drops unless the caller explicitly allows deletion.
  try {
    const liveResp = await apiGet('/api/opcbridge/config/alarms');
    const liveCfg = parseOpcbridgeAlarmsConfig(liveResp);
    const liveAlarms = Array.isArray(liveCfg?.alarms) ? liveCfg.alarms.length : 0;
    const liveRules = Array.isArray(liveCfg?.rules) ? liveCfg.rules.length : 0;
    const nextAlarms = Array.isArray(obj?.alarms) ? obj.alarms.length : 0;
    const nextRules = Array.isArray(obj?.rules) ? obj.rules.length : 0;
    if (!allowAlarmDrop && liveAlarms > 0 && nextAlarms < liveAlarms) {
      throw new Error(`Refusing save: alarm count would drop from ${liveAlarms} to ${nextAlarms}. Reload and retry.`);
    }
    if (!allowAlarmDrop && liveRules > 0 && nextRules < liveRules) {
      throw new Error(`Refusing save: rule count would drop from ${liveRules} to ${nextRules}. Reload and retry.`);
    }
  } catch (err) {
    if (String(err?.message || '').startsWith('Refusing save:')) throw err;
  }

  normalizeAlarmsConfigInvariants(obj);
  ensureAlarmGroupsTree(obj);
  syncAlarmRulesFromAlarms(obj);

	  // v2-only: never persist legacy notification subtree.
	  if (Object.prototype.hasOwnProperty.call(obj, 'notifications')) delete obj.notifications;

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

function parseAlarmCompareValue(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: false, error: 'Compare value is required for equals/not_equals alarms.' };
  if (/^(true|false)$/i.test(text)) return { ok: true, value: text.toLowerCase() === 'true' };
  if (/^null$/i.test(text)) return { ok: true, value: null };
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return { ok: true, value: Number(text) };
  if ((text.startsWith('"') && text.endsWith('"')) || text.startsWith('{') || text.startsWith('[')) {
    try { return { ok: true, value: JSON.parse(text) }; } catch { /* treat as plain text below */ }
  }
  return { ok: true, value: text };
}

function alarmCompareValueToText(alarm) {
  if (!alarm || typeof alarm !== 'object') return '';
  if (Object.prototype.hasOwnProperty.call(alarm, 'value')) {
    const v = unwrapAlarmCompareValue(alarm.value);
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch { return String(v ?? ''); }
  }
  if (Object.prototype.hasOwnProperty.call(alarm, 'equals_value')) {
    const v = unwrapAlarmCompareValue(alarm.equals_value);
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch { return String(v ?? ''); }
  }
  if (Object.prototype.hasOwnProperty.call(alarm, 'threshold')) return String(alarm.threshold);
  return '';
}

function applyAlarmTypeUi() {
  const type = String(els.editAlarmType?.value || '').trim();
  const isEquals = type === 'equals' || type === 'not_equals';
  const isLimit = type === 'high' || type === 'low';
  if (els.editAlarmValueRow) els.editAlarmValueRow.style.display = isEquals ? '' : 'none';
  if (els.editAlarmThresholdRow) els.editAlarmThresholdRow.style.display = isLimit ? '' : 'none';
  if (els.editAlarmHysteresisRow) els.editAlarmHysteresisRow.style.display = isLimit ? '' : 'none';
  updateAlarmPreview();
}

function severityLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Unknown';
  if (n >= 900) return 'Critical';
  if (n >= 700) return 'High';
  if (n >= 500) return 'Medium';
  if (n >= 300) return 'Low';
  return 'Info';
}

function severityClass(value) {
  const label = severityLabel(value).toLowerCase();
  return `sev-${label}`;
}

function syncSeverityPresetFromValue() {
  if (!els.editAlarmSeverityPreset || !els.editAlarmSeverity) return;
  const val = String(Math.trunc(Number(els.editAlarmSeverity.value || '')));
  const matches = Array.from(els.editAlarmSeverityPreset.options || []).some((opt) => opt.value === val);
  els.editAlarmSeverityPreset.value = matches ? val : '';
}

function updateAlarmPreview() {
  if (!els.editAlarmPreview) return;
  const id = String(els.editAlarmId?.value || '').trim() || 'Alarm';
  const name = String(els.editAlarmName?.value || '').trim() || id;
  const conn = String(els.editAlarmConn?.value || '').trim() || '<connection>';
  const tag = String(els.editAlarmTag?.value || '').trim() || '<tag>';
  const type = String(els.editAlarmType?.value || '').trim() || '<type>';
  const sevText = String(els.editAlarmSeverity?.value ?? '').trim();
  const sev = Math.max(0, Math.min(1000, Math.trunc(Number(sevText || '500') || 500)));
  const threshold = String(els.editAlarmThreshold?.value ?? '').trim();
  const hysteresis = String(els.editAlarmHysteresis?.value ?? '').trim();
  const compareValue = String(els.editAlarmValue?.value ?? '').trim();
  const enabled = Boolean(els.editAlarmEnabled?.checked);

  let condition = '';
  if (type === 'high') condition = `is greater than or equal to ${threshold || '<threshold>'}`;
  else if (type === 'low') condition = `is less than or equal to ${threshold || '<threshold>'}`;
  else if (type === 'equals') condition = `equals ${compareValue || '<value>'}`;
  else if (type === 'not_equals') condition = `does not equal ${compareValue || '<value>'}`;
  else if (type === 'change') condition = 'changes value';
  else condition = `matches ${type}`;

  const h = (type === 'high' || type === 'low') && hysteresis ? ` with ${hysteresis} hysteresis` : '';
  const disabled = enabled ? '' : ' Disabled rules do not evaluate.';
  els.editAlarmPreview.textContent = `${name} triggers when ${conn}:${tag} ${condition}${h}. Severity: ${severityLabel(sev)} (${sev}).${disabled}`;
}

function slugAlarmPart(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function alarmTypeLabel(type) {
  const t = String(type || '').trim();
  if (t === 'not_equals') return 'not equals';
  return t.replace(/_/g, ' ');
}

function generatedAlarmId(connectionId, tagName, type) {
  return [connectionId, tagName, type].map(slugAlarmPart).filter(Boolean).join('_');
}

function syncNewAlarmDefaults() {
  if (String(state.pendingWorkspaceItem?.mode || '') !== 'new') return;
  // Intentionally do not auto-fill text fields for new objects.
  // Keep this function around to update preview as the user selects fields.
  updateAlarmPreview();
}

function fillAlarmConnectionSelect(want = '') {
  if (!els.editAlarmConn) return;
  const conns = state.connFiles.slice().map((f) => connectionIdForConnFilePath(String(f?.path || ''))).filter(Boolean);
  conns.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
  els.editAlarmConn.textContent = '';
  conns.forEach((cid) => {
    const opt = document.createElement('option');
    opt.value = cid;
    opt.textContent = cid;
    els.editAlarmConn.appendChild(opt);
  });
  if (want) els.editAlarmConn.value = want;
  else if (els.editAlarmConn.options.length) els.editAlarmConn.value = String(els.editAlarmConn.options[0].value || '');
}

function alarmGroupsSorted(cfgObj = state.alarmsConfig) {
  const cfg = ensureAlarmGroupsTree(cfgObj || {});
  return (Array.isArray(cfg.groups) ? cfg.groups : [])
    .slice()
    .filter((g) => String(g?.name || '').trim())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

function fillAlarmGroupSelect(want = '') {
  if (!els.editAlarmGroup) return;
  const wantNorm = normalizeAlarmGroupName(want);
  const groups = alarmGroupsSorted(state.alarmsConfig);

  els.editAlarmGroup.textContent = '';
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'Unassigned';
  els.editAlarmGroup.appendChild(noneOpt);

  groups.forEach((g) => {
    const name = normalizeAlarmGroupName(g?.name || '');
    if (!name) return;
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    els.editAlarmGroup.appendChild(opt);
  });

  if (wantNorm && !groups.some((g) => String(g?.name || '').trim().toLowerCase() === wantNorm.toLowerCase())) {
    const opt = document.createElement('option');
    opt.value = wantNorm;
    opt.textContent = `${wantNorm} (missing)`;
    els.editAlarmGroup.appendChild(opt);
  }

  els.editAlarmGroup.value = wantNorm || '';
  els.editAlarmGroup.disabled = !canEditConfig();
}

function fillAlarmSiteSelect(groupName, wantSite = '') {
  if (!els.editAlarmSite) return;
  const groupNorm = normalizeAlarmGroupName(groupName);
  const siteNorm = normalizeAlarmSiteName(wantSite);
  const group = groupNorm ? findAlarmGroupConfig(state.alarmsConfig || {}, groupNorm) : null;
  const sites = Array.isArray(group?.sites) ? group.sites : [];
  const siteNames = sites.map((s) => normalizeAlarmSiteName(s?.name || '')).filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));

  els.editAlarmSite.textContent = '';
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'Unassigned';
  els.editAlarmSite.appendChild(noneOpt);

  siteNames.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    els.editAlarmSite.appendChild(opt);
  });

  if (siteNorm && !siteNames.some((s) => s.toLowerCase() === siteNorm.toLowerCase())) {
    const opt = document.createElement('option');
    opt.value = siteNorm;
    opt.textContent = `${siteNorm} (missing)`;
    els.editAlarmSite.appendChild(opt);
  }

  els.editAlarmSite.value = siteNorm || '';
  els.editAlarmSite.disabled = !canEditConfig() || !groupNorm;
}

function refreshAlarmTagSelect(want = '') {
  const cid = String(els.editAlarmConn?.value || '').trim();
  if (!els.editAlarmTag) return;
  const filter = String(els.editAlarmTagFilter?.value || '').trim().toLowerCase();
  els.editAlarmTag.textContent = '';
  const tags = getEffectiveTagsAll()
    .filter((t) => String(t?.connection_id || '') === cid)
    .filter((t) => {
      if (!filter) return true;
      return String(t?.name || '').toLowerCase().includes(filter) || String(t?.plc_tag_name || '').toLowerCase().includes(filter);
    })
    .slice()
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const frag = document.createDocumentFragment();
  tags.forEach((t) => {
    const name = String(t?.name || '');
    const plc = String(t?.plc_tag_name || '').trim();
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = plc && plc !== name ? `${name}  (${plc})` : name;
    frag.appendChild(opt);
  });
  els.editAlarmTag.appendChild(frag);
  if (want) els.editAlarmTag.value = want;
  else if (els.editAlarmTag.options.length) els.editAlarmTag.value = String(els.editAlarmTag.options[0].value || '');
  if (filter && !els.editAlarmTag.options.length) setEditAlarmStatus('No matching tags found.');
  else if (filter) setEditAlarmStatus(`Showing ${tags.length} matching tag(s).`);
  else setEditAlarmStatus('');
}

function readAlarmAudioFromUi() {
  const mode = String(els.editAlarmAudibleMode?.value || 'inherit').trim();
  const seq = state.alarmModalAudioSequenceInput?.getValues?.() || [];
  const audioFile = seq.length ? String(seq[0] || '').trim() : '';
  const gapRaw = String(els.editAlarmAudioGap?.value ?? '').trim();
  const out = {
    group: String(els.editAlarmGroup?.value || '').trim(),
    site: String(els.editAlarmSite?.value || '').trim(),
    audio_file: audioFile,
    audio_files: seq,
    speech_text: String(els.editAlarmSpeechText?.value || '').trim()
  };
  const audioMode = String(els.editAlarmAudioMode?.value || 'inherit').trim();
  if (audioMode && audioMode !== 'inherit') out.audio_mode = audioMode;
  if (gapRaw !== '') out.audio_gap_ms = Math.trunc(Number(gapRaw) || 0);
  if (mode === 'on') out.audible_enabled = true;
  else if (mode === 'off') out.audible_enabled = false;
  return out;
}

function renderAlarmModalAudioSequence(cfgObj, values = []) {
  if (!els.editAlarmAudioSequenceMount) return;
  els.editAlarmAudioSequenceMount.textContent = '';
  state.alarmModalAudioSequenceInput = createAlarmAudioSequenceInput(cfgObj, values, {
    disabled: !canEditConfig(),
    onDirty: () => {
      refreshAlarmAudioUi(readAlarmAudioFromUi());
      updateAlarmPreview();
    }
  });
  if (state.alarmModalAudioSequenceInput?.wrap) {
    els.editAlarmAudioSequenceMount.appendChild(state.alarmModalAudioSequenceInput.wrap);
  }
}

function audioFileIdFromFilename(filename) {
  return String(filename || '')
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'audio';
}

function audioFilenameFromConfigFile(file) {
  const raw = String(file?.path || file?.id || '').trim();
  const parts = raw.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : raw;
}

function audioFolderFromPath(pathValue) {
  let p = String(pathValue || '').trim().replace(/\\/g, '/');
  if (p.startsWith('audio/')) p = p.slice(6);
  const parts = p.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function normalizeAudioFolderName(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
    .join('/');
}

function getConfiguredAudioFolders(cfgObj = state.alarmsConfig) {
  const folders = new Set();
  const explicit = Array.isArray(cfgObj?.audio?.folders) ? cfgObj.audio.folders : [];
  explicit.forEach((f) => {
    const folder = normalizeAudioFolderName(typeof f === 'string' ? f : f?.path);
    if (folder) folders.add(folder);
  });
  getAlarmAudioFiles(cfgObj || {}).forEach((f) => {
    const folder = normalizeAudioFolderName(audioFolderFromPath(f?.path));
    if (folder) folders.add(folder);
  });
  return Array.from(folders).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function expandAudioFolderPath(folder) {
  const clean = normalizeAudioFolderName(folder);
  state.alarmsEventsExpanded?.add?.('folder:alarms_events');
  state.alarmsEventsExpanded?.add?.('folder:audio_files');
  if (!clean) return;
  let cur = '';
  clean.split('/').filter(Boolean).forEach((part) => {
    cur = cur ? `${cur}/${part}` : part;
    state.alarmsEventsExpanded?.add?.(`audio_folder:${cur}`);
  });
}

function audioPathIsInFolder(pathValue, folder) {
  const cleanFolder = normalizeAudioFolderName(folder);
  if (!cleanFolder) return false;
  let p = String(pathValue || '').trim().replace(/\\/g, '/');
  if (p.startsWith('audio/')) p = p.slice(6);
  return p === cleanFolder || p.startsWith(`${cleanFolder}/`);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function uploadAlarmAudioFile(file, folder = '') {
  const filename = String(file.name || '').trim();
  if (!/\.(wav|mp3|ogg|flac)$/i.test(filename)) {
    throw new Error('Audio upload supports .wav, .mp3, .ogg, and .flac files.');
  }

  const cleanFolder = normalizeAudioFolderName(folder);
  const content_b64 = arrayBufferToBase64(await file.arrayBuffer());
  const resp = await apiPostJson('/api/opcbridge/config/audio/upload', { filename, folder: cleanFolder, content_b64 });
  if (!resp?.ok) throw new Error(resp?.error || 'Audio upload failed.');

  const cfg = state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } };
  if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
  if (!Array.isArray(cfg.audio.files)) cfg.audio.files = [];
  const idBase = audioFileIdFromFilename(filename);
  let id = idBase;
  let suffix = 2;
  const existing = new Set(cfg.audio.files.map((f) => String(f?.id || '').trim()).filter(Boolean));
  const existingForPath = cfg.audio.files.find((f) => String(f?.path || '').trim() === String(resp.path || `audio/${filename}`));
  if (existingForPath?.id) id = String(existingForPath.id);
  else {
    while (existing.has(id)) id = `${idBase}_${suffix++}`;
    cfg.audio.files.push({
      id,
      name: filename.replace(/\.[^.]+$/, ''),
      path: String(resp.path || `audio/${filename}`)
    });
  }

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  return { id, filename };
}

async function uploadAlarmAudioFiles(files, folder = '') {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return [];

  const cleanFolder = normalizeAudioFolderName(folder);
  const cfg = await loadOpcbridgeAlarmsConfig();
  if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
  if (!Array.isArray(cfg.audio.files)) cfg.audio.files = [];
  if (cleanFolder) {
    if (!Array.isArray(cfg.audio.folders)) cfg.audio.folders = [];
    if (!cfg.audio.folders.includes(cleanFolder)) cfg.audio.folders.push(cleanFolder);
  }

  const existingIds = new Set(cfg.audio.files.map((f) => String(f?.id || '').trim()).filter(Boolean));
  const results = [];
  const failures = [];

  for (const file of list) {
    const filename = String(file?.name || '').trim();
    try {
      if (!/\.(wav|mp3|ogg|flac)$/i.test(filename)) {
        throw new Error('unsupported file type');
      }

      const content_b64 = arrayBufferToBase64(await file.arrayBuffer());
      const resp = await apiPostJson('/api/opcbridge/config/audio/upload', { filename, folder: cleanFolder, content_b64 });
      if (!resp?.ok) throw new Error(resp?.error || 'Audio upload failed.');

      const pathValue = String(resp.path || (cleanFolder ? `audio/${cleanFolder}/${filename}` : `audio/${filename}`));
      const existingForPath = cfg.audio.files.find((f) => String(f?.path || '').trim() === pathValue);
      let id = existingForPath ? String(existingForPath.id || '').trim() : '';
      if (!id) {
        const idBase = audioFileIdFromFilename(filename);
        id = idBase;
        let suffix = 2;
        while (existingIds.has(id)) id = `${idBase}_${suffix++}`;
        existingIds.add(id);
        cfg.audio.files.push({
          id,
          name: filename.replace(/\.[^.]+$/, ''),
          path: pathValue
        });
      } else {
        existingForPath.name = existingForPath.name || filename.replace(/\.[^.]+$/, '');
        existingForPath.path = pathValue;
      }
      results.push({ id, filename, path: pathValue });
    } catch (err) {
      failures.push({ filename: filename || '(unnamed)', error: String(err?.message || err) });
    }
  }

  if (results.length) {
    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
  }
  if (failures.length) {
    const msg = failures.map((f) => `${f.filename}: ${f.error}`).join('\n');
    throw new Error(`${failures.length} upload(s) failed:\n${msg}`);
  }
  return results;
}

async function createAlarmAudioFolderInteractive(parentFolder = '') {
  if (!canEditConfig()) { window.alert('Login required to edit audio folders.'); return; }
  const base = normalizeAudioFolderName(parentFolder);
  const name = normalizeAudioFolderName(window.prompt('New audio folder name:', '') || '');
  if (!name) return;
  const folder = base ? `${base}/${name}` : name;
  const resp = await apiPostJson('/api/opcbridge/config/audio/folder', { folder });
  if (!resp?.ok) throw new Error(resp?.error || 'Audio folder create failed.');
  const cfg = await loadOpcbridgeAlarmsConfig();
  if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
  if (!Array.isArray(cfg.audio.folders)) cfg.audio.folders = [];
  if (!cfg.audio.folders.includes(folder)) cfg.audio.folders.push(folder);
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  expandAudioFolderPath(folder);
  state.alarmsEventsSelectedNodeId = `audio_folder:${folder}`;
  renderAlarmsEventsTree();
}

async function moveAlarmAudioFileInteractive(id) {
  const cfg = await loadOpcbridgeAlarmsConfig();
  const file = getAlarmAudioFiles(cfg).find((f) => f.id === id) || null;
  if (!file) throw new Error(`Audio file '${id}' is not in the audio files list.`);
  const current = audioFolderFromPath(file.path);
  const folders = getConfiguredAudioFolders(cfg);
  const hint = folders.length ? `\nExisting folders:\n${folders.join('\n')}` : '';
  const folder = normalizeAudioFolderName(window.prompt(`Move '${file.name || id}' to folder. Leave blank for audio root.${hint}`, current) || '');
  const resp = await apiPostJson('/api/opcbridge/config/audio/move', { path: String(file.path || ''), folder });
  if (!resp?.ok) throw new Error(resp?.error || 'Audio move failed.');
  const entry = (Array.isArray(cfg.audio?.files) ? cfg.audio.files : []).find((f) => String(f?.id || '') === id);
  if (entry) entry.path = String(resp.path || entry.path || '');
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = folder ? `audio_folder:${folder}` : 'folder:audio_files';
  state.alarmsEventsSelectedChildId = `audio_file:${id}`;
  renderAlarmsEventsTree();
}

async function deleteAlarmAudioFolderInteractive(folder) {
  const cleanFolder = normalizeAudioFolderName(folder);
  if (!cleanFolder) throw new Error('Audio folder is required.');
  if (!canEditConfig()) { window.alert('Login required to delete audio folders.'); return false; }
  const cfg = await loadOpcbridgeAlarmsConfig();
  const filesInFolder = getAlarmAudioFiles(cfg).filter((file) => audioPathIsInFolder(file?.path, cleanFolder));
  if (filesInFolder.length) {
    throw new Error(`Folder contains ${filesInFolder.length} audio file(s). Move or delete those files first.`);
  }
  const childFolders = getConfiguredAudioFolders(cfg).filter((f) => {
    const child = normalizeAudioFolderName(f);
    return child && child !== cleanFolder && child.startsWith(`${cleanFolder}/`);
  });
  if (childFolders.length) {
    throw new Error(`Folder contains ${childFolders.length} subfolder(s). Delete subfolders first.`);
  }
  if (!window.confirm(`Delete empty audio folder 'audio/${cleanFolder}'?`)) return false;
  const resp = await apiPostJson('/api/opcbridge/config/audio/folder/delete', { folder: cleanFolder });
  if (!resp?.ok) throw new Error(resp?.error || 'Audio folder delete failed.');
  if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
  if (Array.isArray(cfg.audio.folders)) {
    cfg.audio.folders = cfg.audio.folders.filter((f) => normalizeAudioFolderName(f) !== cleanFolder);
  }
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  const parent = cleanFolder.split('/').slice(0, -1).join('/');
  expandAudioFolderPath(parent);
  state.alarmsEventsSelectedNodeId = parent ? `audio_folder:${parent}` : 'folder:audio_files';
  renderAlarmsEventsTree();
  return true;
}

async function uploadAlarmAudioFileFromUi() {
  const files = Array.from(els.editAlarmAudioUpload?.files || []);
  if (!files.length) { setEditAlarmStatus('Choose one or more audio files to upload.'); return; }

  setEditAlarmStatus(`Uploading ${files.length} audio file(s)…`);
  const results = await uploadAlarmAudioFiles(files);
  if (els.editAlarmAudioUpload) els.editAlarmAudioUpload.value = '';
  const last = results[results.length - 1] || null;
  if (last?.id) {
    const current = state.alarmModalAudioSequenceInput?.getValues?.() || [];
    renderAlarmModalAudioSequence(state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } }, current.concat([last.id]));
  }
  refreshAlarmAudioUi(readAlarmAudioFromUi());
  setEditAlarmStatus(`Uploaded ${results.length} audio file(s).`);
}

async function deleteAlarmAudioFileById(id) {
  const cfg = state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } };
  const file = getAlarmAudioFiles(cfg).find((f) => f.id === id) || null;
  if (!file) throw new Error(`Audio file '${id}' is not in the audio files list.`);

  const usedByAlarm = (Array.isArray(cfg.alarms) ? cfg.alarms : []).some((a) => String(a?.audio_file || '') === id || (Array.isArray(a?.audio_files) && a.audio_files.some((v) => String(v || '') === id)));
  const usedByGroup = (Array.isArray(cfg.groups) ? cfg.groups : []).some((g) => {
    if (String(g?.audio_file || '') === id) return true;
    if (Array.isArray(g?.audio_files) && g.audio_files.some((v) => String(v || '') === id)) return true;
    return (Array.isArray(g?.sites) ? g.sites : []).some((s) => String(s?.audio_file || '') === id || (Array.isArray(s?.audio_files) && s.audio_files.some((v) => String(v || '') === id)));
  });
  const usedByDefault = String(cfg.audio?.default_file || '') === id;
  const usage = [usedByDefault ? 'global default' : '', usedByGroup ? 'group/site' : '', usedByAlarm ? 'alarm' : ''].filter(Boolean).join(', ');
  const prompt = usage
    ? `Delete audio file '${file.name || id}'? It is referenced by ${usage}; references will be cleared.`
    : `Delete audio file '${file.name || id}'?`;
  if (!window.confirm(prompt)) return null;

  const filename = audioFilenameFromConfigFile(file);
  const resp = await apiPostJson('/api/opcbridge/config/audio/delete', { path: String(file.path || ''), filename });
  if (!resp?.ok) throw new Error(resp?.error || 'Audio delete failed.');

  cfg.audio.files = (Array.isArray(cfg.audio?.files) ? cfg.audio.files : []).filter((f) => String(f?.id || '') !== id);
  if (String(cfg.audio?.default_file || '') === id) delete cfg.audio.default_file;
  (Array.isArray(cfg.groups) ? cfg.groups : []).forEach((g) => {
    if (String(g?.audio_file || '') === id) delete g.audio_file;
    if (Array.isArray(g?.audio_files)) g.audio_files = g.audio_files.map((v) => String(v || '')).filter((v) => v !== id);
    (Array.isArray(g?.sites) ? g.sites : []).forEach((s) => {
      if (String(s?.audio_file || '') === id) delete s.audio_file;
      if (Array.isArray(s?.audio_files)) s.audio_files = s.audio_files.map((v) => String(v || '')).filter((v) => v !== id);
    });
  });
  (Array.isArray(cfg.alarms) ? cfg.alarms : []).forEach((a) => {
    if (String(a?.audio_file || '') === id) delete a.audio_file;
    if (Array.isArray(a?.audio_files)) a.audio_files = a.audio_files.map((v) => String(v || '')).filter((v) => v !== id);
  });

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  return { id, filename };
}

async function deleteAlarmAudioFilesByIds(ids) {
  const unique = Array.from(new Set((Array.isArray(ids) ? ids : []).map((x) => String(x || '').trim()).filter(Boolean)));
  if (!unique.length) return [];

  const cfg = await loadOpcbridgeAlarmsConfig();
  const files = getAlarmAudioFiles(cfg).filter((f) => unique.includes(String(f?.id || '').trim()));
  if (!files.length) throw new Error('No matching audio files found to delete.');

  const names = files.map((f) => String(f?.name || f?.id || '').trim()).filter(Boolean);
  const prompt = `Delete ${files.length} audio file(s)? This cannot be undone.`;
  if (!window.confirm(prompt + (names.length ? `\n\n${names.slice(0, 15).join('\n')}${names.length > 15 ? '\n…' : ''}` : ''))) return [];

  const results = [];
  const failures = [];
  for (const file of files) {
    const id = String(file?.id || '').trim();
    if (!id) continue;
    const filename = audioFilenameFromConfigFile(file);
    try {
      const resp = await apiPostJson('/api/opcbridge/config/audio/delete', { path: String(file.path || ''), filename });
      if (!resp?.ok) throw new Error(resp?.error || `Audio delete failed for '${id}'.`);
      results.push({ id, filename });
    } catch (err) {
      failures.push({ id, error: String(err?.message || err) });
      continue;
    }

    // Remove from list and clear references.
    cfg.audio.files = (Array.isArray(cfg.audio?.files) ? cfg.audio.files : []).filter((f) => String(f?.id || '') !== id);
    if (String(cfg.audio?.default_file || '') === id) delete cfg.audio.default_file;
    (Array.isArray(cfg.groups) ? cfg.groups : []).forEach((g) => {
      if (String(g?.audio_file || '') === id) delete g.audio_file;
      if (Array.isArray(g?.audio_files)) g.audio_files = g.audio_files.map((v) => String(v || '')).filter((v) => v !== id);
      (Array.isArray(g?.sites) ? g.sites : []).forEach((s) => {
        if (String(s?.audio_file || '') === id) delete s.audio_file;
        if (Array.isArray(s?.audio_files)) s.audio_files = s.audio_files.map((v) => String(v || '')).filter((v) => v !== id);
      });
    });
    (Array.isArray(cfg.alarms) ? cfg.alarms : []).forEach((a) => {
      if (String(a?.audio_file || '') === id) delete a.audio_file;
      if (Array.isArray(a?.audio_files)) a.audio_files = a.audio_files.map((v) => String(v || '')).filter((v) => v !== id);
    });
  }

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  if (failures.length) {
    const head = `Deleted ${results.length}/${files.length} audio file(s).`;
    const body = failures.slice(0, 15).map((f) => `${f.id}: ${f.error}`).join('\n');
    window.alert(`${head}\n\nFailures:\n${body}${failures.length > 15 ? '\n…' : ''}`);
  }
  return results;
}

async function deleteSelectedAlarmAudioFileFromUi() {
  const id = String(state.alarmModalAudioSequenceInput?.getSelectedValue?.() || '').trim();
  if (!id) { setEditAlarmStatus('Select a configured audio file to delete.'); return; }

  setEditAlarmStatus('Deleting audio file…');
  const result = await deleteAlarmAudioFileById(id);
  if (!result) return;
  refreshAlarmAudioUi(readAlarmAudioFromUi());
  setEditAlarmStatus(`Deleted audio file '${result.filename}'.`);
}

function chooseAndUploadAlarmAudioFile(folder = '') {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.wav,.mp3,.ogg,.flac,audio/*';
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    uploadAlarmAudioFiles(files, folder)
      .then((results) => {
        const result = results[results.length - 1] || null;
        const cleanFolder = normalizeAudioFolderName(folder);
        state.alarmsEventsSelectedNodeId = cleanFolder ? `audio_folder:${cleanFolder}` : 'folder:audio_files';
        if (result?.id) state.alarmsEventsSelectedChildId = `audio_file:${result.id}`;
        expandAudioFolderPath(cleanFolder);
        renderAlarmsEventsTree();
      })
      .catch((err) => window.alert(`Audio upload failed: ${err.message}`));
  }, { once: true });
  input.click();
}

function refreshAlarmAudioUi(existingAlarm = null) {
  const cfg = state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } };
  const group = String(els.editAlarmGroup?.value || existingAlarm?.group || '').trim();
  const site = String(els.editAlarmSite?.value || existingAlarm?.site || '').trim();
  const alarm = existingAlarm || {};
  const inherited = resolveInheritedAlarmAudio(cfg, group, site);
  const effectiveAlarm = { ...alarm, group, site, audio_file: String(alarm.audio_file || '').trim(), speech_text: String(alarm.speech_text || '').trim() };
  if (!Object.prototype.hasOwnProperty.call(alarm, 'audible_enabled')) delete effectiveAlarm.audible_enabled;
  const effective = resolveAlarmAudio(cfg, effectiveAlarm);

  if (els.editAlarmAudibleMode) {
    els.editAlarmAudibleMode.value = Object.prototype.hasOwnProperty.call(alarm, 'audible_enabled')
      ? (alarm.audible_enabled === false ? 'off' : 'on')
      : 'inherit';
  }

  if (els.editAlarmAudioMode && document.activeElement !== els.editAlarmAudioMode) {
    const mode = String(alarm.audio_mode || '').trim();
    els.editAlarmAudioMode.value = mode || 'inherit';
  }
  if (els.editAlarmAudioGap && document.activeElement !== els.editAlarmAudioGap) {
    const gap = Number(alarm.audio_gap_ms);
    els.editAlarmAudioGap.value = Number.isFinite(gap) && gap >= 0 ? String(Math.trunc(gap)) : '';
  }
  if (els.editAlarmSpeechText && document.activeElement !== els.editAlarmSpeechText) {
    els.editAlarmSpeechText.value = String(alarm.speech_text || '');
  }

  if (els.editAlarmAudioHint) {
    const modeText = effective.audible_enabled ? 'enabled' : 'disabled';
    const sequenceText = alarmAudioSequenceText(effective.audio_files, cfg, effective.speech_texts, effective.audio_mode);
    els.editAlarmAudioHint.textContent = `Effective audible notification is ${modeText}; audio sequence: ${sequenceText}; source: ${effective.source}.`;
  }
}

function getAudioScopeConfig(cfg, scope, groupName, siteName) {
  if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
  if (scope === 'global') return cfg.audio;
  if (scope === 'group') return findAlarmGroupConfig(cfg, groupName);
  if (scope === 'site') return findAlarmSiteConfig(cfg, groupName, siteName);
  return null;
}

function getInheritedAudioForScope(cfg, scope, groupName, siteName) {
  if (scope === 'site') return resolveInheritedAlarmAudio(cfg, groupName, '');
  if (scope === 'group') {
    return {
      audible_enabled: cfg.audio && Object.prototype.hasOwnProperty.call(cfg.audio, 'audible_enabled') ? Boolean(cfg.audio.audible_enabled) : false,
      audio_file: String(cfg.audio?.default_file || '').trim(),
      speech_text: String(cfg.audio?.speech_text || '').trim(),
      speech_texts: String(cfg.audio?.speech_text || '').trim() ? [String(cfg.audio?.speech_text || '').trim()] : [],
      source: 'global'
    };
  }
  return { audible_enabled: false, audio_file: '', speech_text: '', speech_texts: [], source: 'system' };
}

	function notificationDefaultRepeatMs(cfg) {
	  const routes = getAlarmNotificationRoutes(cfg);
	  const best = routes.find((r) => r && typeof r === 'object' && r.enabled !== false && String(r.type || '') === 'audio_command')
	    || routes.find((r) => r && typeof r === 'object' && r.enabled !== false);
	  const ms = Math.trunc(Number(best?.repeat_ms ?? best?.config?.repeat_ms ?? 0) || 0);
	  return (ms > 0) ? ms : 0;
	}

function getInheritedRepeatForScope(cfg, scope, groupName, siteName) {
  const global = notificationDefaultRepeatMs(cfg);
  if (scope === 'site') {
    const g = groupName ? findAlarmGroupConfig(cfg, groupName) : null;
    if (g && Object.prototype.hasOwnProperty.call(g, 'repeat_ms')) {
      const ms = Math.trunc(Number(g.repeat_ms ?? 0) || 0);
      return { repeat_ms: ms < 0 ? 0 : ms, source: 'group' };
    }
    return { repeat_ms: global, source: 'global' };
  }
  if (scope === 'group') {
    return { repeat_ms: global, source: 'global' };
  }
  return { repeat_ms: 0, source: 'system' };
}

function refreshAudioScopeUi() {
  const pending = state.pendingWorkspaceItem || {};
  const scope = String(pending.scope || '').trim();
  const group = String(pending.group || '').trim();
  const site = String(pending.site || '').trim();
  const cfg = state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } };
  ensureAlarmGroupsTree(cfg);
  const target = getAudioScopeConfig(cfg, scope, group, site) || {};
  const inherited = getInheritedAudioForScope(cfg, scope, group, site);
  const selected = scope === 'global'
    ? String(cfg.audio?.default_file || '').trim()
    : String(target?.audio_file || '').trim();
  const speechText = String(target?.speech_text || '').trim();

  if (els.editAudioScopeName) {
    els.editAudioScopeName.value = scope === 'global' ? 'Global alarm audio defaults' : (scope === 'site' ? `${group} / ${site}` : group);
  }
  if (els.editAudioScopeAudibleMode) {
    const inheritOpt = Array.from(els.editAudioScopeAudibleMode.options || []).find((opt) => opt.value === 'inherit');
    if (inheritOpt) inheritOpt.disabled = scope === 'global';
    els.editAudioScopeAudibleMode.value = scope === 'global'
      ? (target.audible_enabled === true ? 'on' : 'off')
      : (Object.prototype.hasOwnProperty.call(target, 'audible_enabled') ? (target.audible_enabled === false ? 'off' : 'on') : 'inherit');
    els.editAudioScopeAudibleMode.disabled = !canEditConfig();
  }
  if (els.editAudioScopeAudioFile) {
    els.editAudioScopeAudioFile.textContent = '';
    const base = document.createElement('option');
    base.value = '';
    base.textContent = scope === 'global'
      ? 'No default audio file'
      : (inherited.audio_file ? `Use inherited: ${alarmAudioFileText(inherited.audio_file, cfg)}` : 'Use inherited: none');
    els.editAudioScopeAudioFile.appendChild(base);
    getAlarmAudioFiles(cfg).forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.path ? `${f.name || f.id} (${f.path})` : `${f.name || f.id} (${f.id})`;
      els.editAudioScopeAudioFile.appendChild(opt);
    });
    els.editAudioScopeAudioFile.value = selected;
    els.editAudioScopeAudioFile.disabled = !canEditConfig();
  }
  if (els.editAudioScopeSpeechText && document.activeElement !== els.editAudioScopeSpeechText) {
    els.editAudioScopeSpeechText.value = speechText;
    els.editAudioScopeSpeechText.disabled = !canEditConfig();
  }
  if (els.editAudioScopeHint) {
    const mode = String(els.editAudioScopeAudibleMode?.value || '').trim();
    const effectiveAudible = scope === 'global' ? mode === 'on' : (mode === 'inherit' ? inherited.audible_enabled : mode === 'on');
    const effectiveFile = selected || (scope === 'global' ? '' : inherited.audio_file);
    const effectiveSpeech = speechText || (scope === 'global' ? '' : inherited.speech_text);
    const source = scope === 'global' ? 'global' : (mode === 'inherit' && !selected ? inherited.source : scope);
    const sequence = alarmAudioSequenceText(effectiveFile ? [effectiveFile] : [], cfg, effectiveSpeech ? [effectiveSpeech] : []);
    els.editAudioScopeHint.textContent = `Effective audible notification is ${effectiveAudible ? 'enabled' : 'disabled'}; audio sequence: ${sequence}; source: ${source}.`;
  }
  if (els.editAudioScopeSaveBtn) els.editAudioScopeSaveBtn.disabled = !canEditConfig();
}

function openAudioScopeModal({ scope, group = '', site = '' }) {
  if (!els.workspaceItemModal) return;
  const normalizedScope = String(scope || '').trim();
  state.pendingWorkspaceItem = { id: `audio_scope:${normalizedScope}:${group}:${site}`, type: 'audio_scope', scope: normalizedScope, group, site };
  if (els.workspaceItemModal) els.workspaceItemModal.style.display = 'flex';
  if (els.workspaceItemHint) {
    els.workspaceItemHint.textContent = normalizedScope === 'global'
      ? 'Default alarm audio settings.'
      : 'Alarm audio settings for this hierarchy level.';
  }
  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'none';
  if (els.workspaceItemEventEdit) els.workspaceItemEventEdit.style.display = 'none';
  if (els.workspaceItemAudioScopeEdit) els.workspaceItemAudioScopeEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';
  if (els.workspaceItemAudioScopeEdit) els.workspaceItemAudioScopeEdit.style.display = 'block';
  const titleEl = document.getElementById('workspaceItemModalTitle');
  if (titleEl) titleEl.textContent = normalizedScope === 'global' ? 'Audio Defaults' : 'Alarm Audio Properties';
  setWorkspaceItemStatus('');
  setEditAudioScopeStatus('');
  refreshAudioScopeUi();
  els.editAudioScopeAudibleMode?.focus?.();
}

async function saveAudioScopeFromModal() {
  if (!canEditConfig()) { setEditAudioScopeStatus('Login required to edit audio settings.'); return; }
  const pending = state.pendingWorkspaceItem || {};
  const scope = String(pending.scope || '').trim();
  const group = String(pending.group || '').trim();
  const site = String(pending.site || '').trim();
  const mode = String(els.editAudioScopeAudibleMode?.value || '').trim();
  const audioFile = String(els.editAudioScopeAudioFile?.value || '').trim();
  const speechText = String(els.editAudioScopeSpeechText?.value || '').trim();
  const cfg = state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } };
  ensureAlarmGroupsTree(cfg);
  if (!['global', 'group', 'site'].includes(scope)) { setEditAudioScopeStatus('Audio scope is invalid.'); return; }
  if (scope === 'global' && !['on', 'off'].includes(mode)) { setEditAudioScopeStatus('Global audible setting must be enabled or disabled.'); return; }
  if (scope !== 'global' && !['inherit', 'on', 'off'].includes(mode)) { setEditAudioScopeStatus('Audible setting is invalid.'); return; }
  if (audioFile && !getAlarmAudioFiles(cfg).some((f) => f.id === audioFile)) { setEditAudioScopeStatus(`Audio file '${audioFile}' is not in the audio files list.`); return; }

  if (scope === 'global') {
    if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
    cfg.audio.audible_enabled = mode === 'on';
    if (audioFile) cfg.audio.default_file = audioFile;
    else delete cfg.audio.default_file;
    if (speechText) cfg.audio.speech_text = speechText;
    else delete cfg.audio.speech_text;
  } else if (scope === 'group') {
    upsertAlarmGroup(cfg, group);
    const target = findAlarmGroupConfig(cfg, group);
    if (!target) { setEditAudioScopeStatus('Group was not found.'); return; }
    if (mode === 'inherit') delete target.audible_enabled;
    else target.audible_enabled = mode === 'on';
    if (audioFile) target.audio_file = audioFile;
    else delete target.audio_file;
    if (speechText) target.speech_text = speechText;
    else delete target.speech_text;
  } else if (scope === 'site') {
    ensureGroupSiteInConfig(cfg, group, site);
    const target = findAlarmSiteConfig(cfg, group, site);
    if (!target) { setEditAudioScopeStatus('Site was not found.'); return; }
    if (mode === 'inherit') delete target.audible_enabled;
    else target.audible_enabled = mode === 'on';
    if (audioFile) target.audio_file = audioFile;
    else delete target.audio_file;
    if (speechText) target.speech_text = speechText;
    else delete target.speech_text;
  }

  setEditAudioScopeStatus('Saving…');
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  closeWorkspaceItemModal();
  renderWorkspaceTree();
}

function wireAlarmPreviewInputs() {
  const inputs = [
    els.editAlarmId,
    els.editAlarmName,
    els.editAlarmGroup,
    els.editAlarmSite,
    els.editAlarmConn,
    els.editAlarmTagFilter,
    els.editAlarmTag,
    els.editAlarmType,
    els.editAlarmEnabled,
    els.editAlarmAudibleMode,
    els.editAlarmAudioMode,
    els.editAlarmAudioGap,
    els.editAlarmSpeechText,
    els.editAlarmSeverity,
    els.editAlarmThreshold,
    els.editAlarmHysteresis,
    els.editAlarmValue
  ].filter(Boolean);

  // Some browsers can "lose" a listbox selection if the mouse is released outside the control.
  // Commit selection on mousedown so the chosen tag sticks even if the user slips off the modal.
  if (els.editAlarmTag && els.editAlarmTag.dataset.forceSelectWired !== '1') {
    els.editAlarmTag.dataset.forceSelectWired = '1';
    els.editAlarmTag.addEventListener('mousedown', (e) => {
      const opt = e.target && e.target.tagName === 'OPTION' ? e.target : null;
      if (!opt) return;
      const v = String(opt.value || '').trim();
      if (!v) return;
      els.editAlarmTag.value = v;
      opt.selected = true;
      // prevent accidental text selection/drag causing selection rollback
      e.preventDefault();
      updateAlarmPreview();
    }, true);
  }

  inputs.forEach((el) => {
    if (el.dataset.alarmPreviewWired === '1') return;
    el.dataset.alarmPreviewWired = '1';
    el.addEventListener('input', () => {
      if (el === els.editAlarmSeverity) syncSeverityPresetFromValue();
      if (el === els.editAlarmTagFilter) refreshAlarmTagSelect();
      if ([els.editAlarmConn, els.editAlarmTag, els.editAlarmType].includes(el)) syncNewAlarmDefaults();
      if (el === els.editAlarmGroup) {
        const g = String(els.editAlarmGroup?.value || '').trim();
        fillAlarmSiteSelect(g, g ? String(els.editAlarmSite?.value || '') : '');
      }
      if ([els.editAlarmGroup, els.editAlarmSite, els.editAlarmAudibleMode, els.editAlarmAudioMode, els.editAlarmAudioGap, els.editAlarmSpeechText].includes(el)) refreshAlarmAudioUi(readAlarmAudioFromUi());
      updateAlarmPreview();
    });
    el.addEventListener('change', () => {
      if (el === els.editAlarmSeverity) syncSeverityPresetFromValue();
      if (el === els.editAlarmConn) {
        refreshAlarmTagSelect();
        syncNewAlarmDefaults();
      }
      if ([els.editAlarmTag, els.editAlarmType].includes(el)) syncNewAlarmDefaults();
      if (el === els.editAlarmGroup) {
        const g = String(els.editAlarmGroup?.value || '').trim();
        fillAlarmSiteSelect(g, g ? String(els.editAlarmSite?.value || '') : '');
      }
      if ([els.editAlarmGroup, els.editAlarmSite, els.editAlarmAudibleMode, els.editAlarmAudioMode, els.editAlarmAudioGap, els.editAlarmSpeechText].includes(el)) refreshAlarmAudioUi(readAlarmAudioFromUi());
      updateAlarmPreview();
    });
  });

  if (els.editAlarmSeverityPreset && els.editAlarmSeverityPreset.dataset.alarmPreviewWired !== '1') {
    els.editAlarmSeverityPreset.dataset.alarmPreviewWired = '1';
    els.editAlarmSeverityPreset.addEventListener('change', () => {
      const val = String(els.editAlarmSeverityPreset.value || '');
      if (val && els.editAlarmSeverity) els.editAlarmSeverity.value = val;
      updateAlarmPreview();
    });
  }

  updateAlarmPreview();
}

// ---------------- Configure ----------------

function setScadaSettingsStatus(msg) {
  if (els.scadaSettingsStatus) els.scadaSettingsStatus.textContent = String(msg || '');
}

function setAuthAdminStatus(msg) {
  if (els.authAdminStatus) els.authAdminStatus.textContent = String(msg || '');
}

function setSoundSettingsStatus(msg) {
  if (els.soundSettingsStatus) els.soundSettingsStatus.textContent = String(msg || '');
}

function setSipStatus(msg) {
  if (els.sipStatus) els.sipStatus.textContent = String(msg || '');
}

function setVoiceModemStatus(msg) {
  if (els.voiceModemStatus) els.voiceModemStatus.textContent = String(msg || '');
}

function setAlarmNotifStatus(msg) {
  if (els.alarmNotifStatus) els.alarmNotifStatus.textContent = String(msg || '');
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

function setProjectBackupStatus(msg) {
  if (els.projectBackupStatus) els.projectBackupStatus.textContent = String(msg || '');
}

function projectBackupOptionsFromUi() {
  return {
    include_secrets: Boolean(els.projectBackupIncludeSecrets?.checked),
    include_history: Boolean(els.projectBackupIncludeHistory?.checked),
    include_historian_data: Boolean(els.projectBackupIncludeHistorianData?.checked)
  };
}

function formatProjectBackupJobStatus(status) {
  const lines = [];
  lines.push(`${status.message || 'Preparing backup...'} (${Number(status.percent || 0)}%)`);
  lines.push(`State: ${status.state || '-'}`);
  if (status.summary) {
    lines.push(`Files: ${Number(status.summary.files || 0)}`);
    lines.push(`Bytes: ${Number(status.summary.bytes || 0)}`);
    lines.push(`Includes users/passwords/secrets: ${status.summary.include_secrets ? 'yes' : 'no'}`);
    lines.push(`Includes alarm/event history: ${status.summary.include_history ? 'yes' : 'no'}`);
    lines.push(`Includes historian data: ${status.summary.include_historian_data ? 'yes' : 'no'}`);
  }
  if (Array.isArray(status.warnings) && status.warnings.length) {
    lines.push('');
    lines.push('Warnings:');
    status.warnings.forEach((w) => lines.push(`- ${w}`));
  }
  return lines.join('\n');
}

async function downloadProjectBackup() {
  setProjectBackupStatus('Starting backup job...');
  if (els.projectBackupDownloadBtn) els.projectBackupDownloadBtn.disabled = true;
  try {
    const start = await apiPostJson('/api/project/backup/start', projectBackupOptionsFromUi(), { timeoutMs: 30000 });
    const id = String(start?.id || '').trim();
    if (!id) throw new Error('Backup job did not return an id.');

    let status = start;
    const deadline = Date.now() + (10 * 60 * 1000);
    while (Date.now() < deadline) {
      setProjectBackupStatus(formatProjectBackupJobStatus(status));
      if (status.state === 'done') break;
      if (status.state === 'error') throw new Error(status.error || 'Backup failed.');
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      status = await apiGet(`/api/project/backup/status?id=${encodeURIComponent(id)}`, { timeoutMs: 30000 });
    }
    if (status.state !== 'done') throw new Error('Backup did not finish before timeout.');

    const a = document.createElement('a');
    a.href = status.download_url || `/api/project/backup/download?id=${encodeURIComponent(id)}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setProjectBackupStatus(`${formatProjectBackupJobStatus(status)}\n\nDownload started.`);
  } catch (err) {
    setProjectBackupStatus(`Backup download failed: ${err.message}`);
  } finally {
    if (els.projectBackupDownloadBtn) els.projectBackupDownloadBtn.disabled = false;
  }
}

async function readSelectedProjectBackupFile() {
  const file = els.projectRestoreFile?.files?.[0] || null;
  if (!file) throw new Error('Choose a project backup JSON file first.');
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Backup file is not valid JSON: ${err.message}`);
  }
}

function formatProjectBackupPreview(preview) {
  const lines = [];
  lines.push(`Type: ${preview.type || '-'}`);
  lines.push(`Created: ${preview.created_at || '-'}`);
  lines.push(`Source host: ${preview.host || '-'}`);
  lines.push(`Suite version: ${preview.suite_version || '-'}`);
  lines.push(`Files: ${Number(preview.files || 0)}`);
  lines.push(`Bytes: ${Number(preview.bytes || 0)}`);
  lines.push(`Includes users/secrets: ${preview.include_secrets ? 'yes' : 'no'}`);
  lines.push(`Includes alarm/event history: ${preview.include_history ? 'yes' : 'no'}`);
  lines.push(`Includes historian data: ${preview.include_historian_data ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('Sections:');
  const sections = preview.sections && typeof preview.sections === 'object' ? preview.sections : {};
  Object.keys(sections).sort().forEach((name) => {
    const s = sections[name] || {};
    lines.push(`- ${name}: ${Number(s.files || 0)} file(s), ${Number(s.bytes || 0)} bytes`);
  });
  return lines.join('\n');
}

async function previewProjectRestore() {
  setProjectBackupStatus('Reading backup file...');
  try {
    const backup = await readSelectedProjectBackupFile();
    const preview = await apiPostJson('/api/project/restore/preview', { backup }, { timeoutMs: 120000 });
    setProjectBackupStatus(formatProjectBackupPreview(preview));
  } catch (err) {
    setProjectBackupStatus(`Preview failed: ${err.message}`);
  }
}

async function applyProjectRestore() {
  setProjectBackupStatus('Reading backup file...');
  try {
    const backup = await readSelectedProjectBackupFile();
    const preview = await apiPostJson('/api/project/restore/preview', { backup }, { timeoutMs: 120000 });
    const msg = [
      'Restore this project backup?',
      '',
      `Created: ${preview.created_at || '-'}`,
      `Source host: ${preview.host || '-'}`,
      `Files: ${Number(preview.files || 0)}`,
      `Includes users/secrets: ${preview.include_secrets ? 'yes' : 'no'}`,
      `Includes alarm/event history: ${preview.include_history ? 'yes' : 'no'}`,
      `Includes historian data: ${preview.include_historian_data ? 'yes' : 'no'}`,
      '',
      'This overwrites project files. A pre-restore backup will be written to /tmp first.'
    ].join('\n');
    if (!window.confirm(msg)) {
      setProjectBackupStatus('Restore cancelled.');
      return;
    }

    setProjectBackupStatus('Restoring project backup...');
    const result = await apiPostJson('/api/project/restore', { backup }, { timeoutMs: 120000 });
    const written = Array.isArray(result?.written) ? result.written.length : 0;
    setProjectBackupStatus([
      result?.message || 'Project backup restored.',
      `Files written: ${written}`,
      `Pre-restore backup: ${result?.pre_restore_backup || '-'}`,
      '',
      'Next step: restart/reload opcbridge, opcbridge-scada, opcbridge-alarms, and opcbridge-hmi.'
    ].join('\n'));
  } catch (err) {
    setProjectBackupStatus(`Restore failed: ${err.message}`);
  }
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

function isV2AlarmsConfig(cfg) {
  // Single supported schema in SCADA going forward.
  return Number(cfg?.schema_version) === 2;
}

function getNotificationContacts(cfg) {
  // v2-only: contacts are targets[] entries with type="phone".
  if (!Array.isArray(cfg.targets)) cfg.targets = [];
  return (Array.isArray(cfg.targets) ? cfg.targets : [])
    .filter((t) => t && typeof t === 'object' && !Array.isArray(t) && String(t.type || '') === 'phone')
    .map((t) => {
      const id = String(t.id || '').trim();
      return id ? {
        id,
        name: String(t.name || id).trim() || id,
        phone: String(t.value || '').trim(),
        enabled: t.enabled !== false,
        notes: String(t.notes || '').trim()
      } : null;
    })
    .filter(Boolean);
}

function getNotificationContactGroups(cfg) {
  // v2-only: groups are targets[] entries with type="group" and members[].
  if (!Array.isArray(cfg.targets)) cfg.targets = [];
  const targets = Array.isArray(cfg.targets) ? cfg.targets : [];
  const byId = new Map();
  targets.forEach((t) => {
    const id = String(t?.id || '').trim();
    if (id) byId.set(id, t);
  });
  return targets
    .filter((t) => t && typeof t === 'object' && !Array.isArray(t) && String(t.type || '') === 'group')
    .map((t) => {
      const id = String(t.id || '').trim();
      if (!id) return null;
      const members = (Array.isArray(t.members) ? t.members : [])
        .map((m) => String(m || '').trim())
        .filter(Boolean)
        .filter((mid) => String(byId.get(mid)?.type || '') === 'phone');
      return {
        id,
        name: String(t.name || id).trim() || id,
        enabled: t.enabled !== false,
        contacts: members
      };
    })
    .filter(Boolean);
}

function getNotificationPolicies(cfg) {
  // v2-only
  if (!Array.isArray(cfg.policies)) cfg.policies = [];
  return cfg.policies;
}

function getPolicyOutputType(policy) {
  const raw = String(policy?.output_type || policy?.type || '').trim().toLowerCase();
  if (raw === 'voice') return 'phone';
  // "sip" is now treated as a phone delivery backend, not a separate policy type.
  if (raw === 'sip') return 'phone';
  if (['phone', 'audio', 'sms', 'email'].includes(raw)) return raw;
  return 'phone';
}

function getSchedules(cfg) {
  if (!Array.isArray(cfg.schedules)) cfg.schedules = [];
  return cfg.schedules;
}

function normalizeScheduleDayList(values) {
  const dayOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((d) => String(d || '').trim().toLowerCase())
    .filter((d) => dayOrder.includes(d))
    .filter((d) => {
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });
}

function validateScheduleDefinition(schedule, { requireId = true } = {}) {
  const s = (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) ? schedule : {};
  const id = String(s.id || '').trim();
  if (requireId && !id) return 'Schedule ID is required.';
  const type = String(s.type || '').trim() || 'custom';
  if (!['always', 'custom', 'inverse_of'].includes(type)) return `Unsupported schedule type '${type}'.`;
  if (type === 'inverse_of') {
    const ref = String(s.schedule_id || '').trim();
    if (!ref) return 'Inverse Of schedule requires schedule_id.';
    if (id && ref === id) return 'Inverse schedule cannot reference itself.';
    return null;
  }
  if (type === 'custom') {
    const days = normalizeScheduleDayList(s.days);
    if (!days.length) return 'Custom schedule requires at least one day.';
    const startDate = String(s.start_date || '').trim();
    const endDate = String(s.end_date || '').trim();
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return 'Start Date must be YYYY-MM-DD.';
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return 'End Date must be YYYY-MM-DD.';
    if (startDate && endDate && endDate < startDate) return 'End Date must be on or after Start Date.';
    const startTime = String(s.start_time || '').trim();
    const endTime = String(s.end_time || '').trim();
    if ((startTime && !endTime) || (!startTime && endTime)) return 'Set both Start Time and End Time, or leave both blank.';
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) return 'Start Time must be HH:MM.';
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) return 'End Time must be HH:MM.';
    return null;
  }
  return null;
}

function evaluateScheduleActiveClient(scheduleId, schedulesInput, now = new Date(), visiting = new Set()) {
  const schedules = Array.isArray(schedulesInput) ? schedulesInput : [];
  const byId = new Map(schedules.map((s) => [String(s?.id || '').trim(), s]));
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const cleanId = String(scheduleId || '').trim() || 'always';
  const schedule = byId.get(cleanId);
  if (!schedule) return cleanId === 'always';
  if (schedule?.enabled === false) return false;
  if (visiting.has(cleanId)) return false;
  visiting.add(cleanId);
  const type = String(schedule?.type || '').trim();
  if (type === 'always') return true;
  if (type === 'inverse_of') {
    const ref = String(schedule?.schedule_id || '').trim() || 'always';
    return !evaluateScheduleActiveClient(ref, schedules, now, visiting);
  }
  if (type === 'custom') {
    const parseDate = (v) => {
      const m = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
      if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
      return y * 10000 + mo * 100 + d;
    };
    const parseMin = (value) => {
      const m = String(value || '').trim().match(/^(\d{2}):(\d{2})$/);
      if (!m) return null;
      const hh = Number(m[1]); const mm = Number(m[2]);
      if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
      return hh * 60 + mm;
    };
    const nowYmd = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const startDate = parseDate(schedule?.start_date);
    const endDate = parseDate(schedule?.end_date);
    if (startDate != null && nowYmd < startDate) return false;
    if (endDate != null && nowYmd > endDate) return false;
    const days = (Array.isArray(schedule?.days) ? schedule.days : []).map((d) => String(d || '').toLowerCase()).filter(Boolean);
    if (days.length) {
      const day = dayNames[now.getDay()];
      if (!days.includes(day)) return false;
    }
    const hasStart = String(schedule?.start_time || '').trim().length > 0;
    const hasEnd = String(schedule?.end_time || '').trim().length > 0;
    if (!hasStart && !hasEnd) return true;
    if (hasStart !== hasEnd) return false;
    const start = parseMin(schedule?.start_time);
    const end = parseMin(schedule?.end_time);
    if (start == null || end == null) return false;
    if (start === end) return true;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (start < end) return nowMin >= start && nowMin < end;
    return nowMin >= start || nowMin < end;
  }
  return false;
}

function getRoutingAlarmGroups(cfg) {
  if (!Array.isArray(cfg.alarm_groups)) cfg.alarm_groups = [];
  return cfg.alarm_groups;
}

function syncAlarmGroupMembershipFromRoutingGroups(cfg) {
  const alarms = Array.isArray(cfg?.alarms) ? cfg.alarms : [];
  const validIds = new Set(alarms.map((alarm) => String(alarm?.id || '').trim()).filter(Boolean));
  getRoutingAlarmGroups(cfg).forEach((group) => {
    group.alarms = dedupeStringsInOrder(group?.alarms).filter((id) => validIds.has(id));
  });
}

function dedupeStringsInOrder(values) {
  const seen = new Set();
  const out = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const id = String(value || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  });
  return out;
}

function makeLabeledCheckbox(text, checked, disabled = false) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(checked);
  checkbox.disabled = Boolean(disabled);
  const wrap = document.createElement('label');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '18px 1fr';
  wrap.style.alignItems = 'center';
  wrap.style.columnGap = '8px';
  const labelText = document.createElement('span');
  labelText.style.textAlign = 'left';
  labelText.textContent = String(text || '');
  wrap.appendChild(checkbox);
  wrap.appendChild(labelText);
  return { checkbox, wrap };
}

	function getPolicyTargets(policy) {
	  const targets = [];
	  const seen = new Set();
	  const add = (type, id) => {
    const cleanType = String(type || '').trim();
    const cleanId = String(id || '').trim();
    const key = `${cleanType}:${cleanId}`;
    if (!cleanId || (cleanType !== 'contact' && cleanType !== 'group') || seen.has(key)) return;
    seen.add(key);
    targets.push({ type: cleanType, id: cleanId });
  };
	  if (Array.isArray(policy?.targets)) {
	    policy.targets.forEach((target) => add(target?.type, target?.id));
	  }
	  return targets;
	}

function makeOrderedSelectionEditor({ availableItems, selectedItems, emptyText, addLabel = 'Add', canEdit = canEditConfig() }) {
  const root = document.createElement('div');
  root.style.display = 'grid';
  root.style.gap = '8px';

  const available = new Map();
  (Array.isArray(availableItems) ? availableItems : []).forEach((item) => {
    const key = String(item?.key || item?.id || '').trim();
    if (key) available.set(key, item);
  });

  const selected = [];
  const seen = new Set();
  (Array.isArray(selectedItems) ? selectedItems : []).forEach((item) => {
    const key = String(item?.key || item?.id || '').trim();
    if (!key || seen.has(key) || !available.has(key)) return;
    seen.add(key);
    selected.push(key);
  });

  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gap = '6px';
  list.style.maxHeight = '220px';
  list.style.overflow = 'auto';
  list.style.padding = '8px';
  list.style.border = '1px solid var(--border)';
  list.style.borderRadius = '8px';

  const controls = document.createElement('div');
  controls.className = 'row-actions';
  const select = document.createElement('select');
  select.disabled = !canEdit;
  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.type = 'button';
  addBtn.textContent = addLabel;
  addBtn.disabled = !canEdit;
  controls.appendChild(select);
  controls.appendChild(addBtn);

  const renderSelect = () => {
    select.textContent = '';
    const remaining = Array.from(available.values()).filter((item) => !selected.includes(String(item?.key || item?.id || '').trim()));
    if (!remaining.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No more items available';
      select.appendChild(opt);
      addBtn.disabled = true;
      return;
    }
    remaining.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = String(item?.key || item?.id || '').trim();
      opt.textContent = String(item?.label || item?.name || item?.id || opt.value);
      select.appendChild(opt);
    });
    addBtn.disabled = !canEdit;
  };

  const renderList = () => {
    list.textContent = '';
    if (!selected.length) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = emptyText;
      list.appendChild(empty);
      renderSelect();
      return;
    }
    selected.forEach((key, idx) => {
      const item = available.get(key) || { key, label: key };
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto auto auto';
      row.style.gap = '6px';
      row.style.alignItems = 'center';
      const text = document.createElement('div');
      text.style.display = 'grid';
      text.style.gap = '3px';
      const title = document.createElement('select');
      title.disabled = !canEdit;
      const usedByOthers = new Set(selected.filter((_, otherIdx) => otherIdx !== idx));
      Array.from(available.values()).forEach((candidate) => {
        const candidateKey = String(candidate?.key || candidate?.id || '').trim();
        if (!candidateKey || usedByOthers.has(candidateKey)) return;
        const opt = document.createElement('option');
        opt.value = candidateKey;
        opt.textContent = String(candidate?.label || candidate?.name || candidate?.id || candidateKey);
        title.appendChild(opt);
      });
      if (!available.has(key)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = String(item.label || item.name || key);
        title.appendChild(opt);
      }
      title.value = key;
      title.onchange = () => {
        const nextKey = String(title.value || '').trim();
        if (!nextKey || usedByOthers.has(nextKey)) {
          title.value = selected[idx] || '';
          return;
        }
        selected[idx] = nextKey;
        renderList();
      };
      const meta = document.createElement('div');
      meta.className = 'hint mono';
      meta.textContent = String(item.meta || key);
      text.appendChild(title);
      text.appendChild(meta);
      const upBtn = document.createElement('button');
      upBtn.className = 'btn';
      upBtn.type = 'button';
      upBtn.textContent = 'Up';
      upBtn.disabled = !canEdit || idx === 0;
      upBtn.onclick = () => {
        [selected[idx - 1], selected[idx]] = [selected[idx], selected[idx - 1]];
        renderList();
      };
      const downBtn = document.createElement('button');
      downBtn.className = 'btn';
      downBtn.type = 'button';
      downBtn.textContent = 'Down';
      downBtn.disabled = !canEdit || idx >= selected.length - 1;
      downBtn.onclick = () => {
        [selected[idx], selected[idx + 1]] = [selected[idx + 1], selected[idx]];
        renderList();
      };
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn bad';
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.disabled = !canEdit;
      removeBtn.onclick = () => {
        selected.splice(idx, 1);
        renderList();
      };
      row.appendChild(text);
      row.appendChild(upBtn);
      row.appendChild(downBtn);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });
    renderSelect();
  };

  addBtn.onclick = () => {
    const key = String(select.value || '').trim();
    if (!key || selected.includes(key)) return;
    selected.push(key);
    renderList();
  };

  root.appendChild(list);
  root.appendChild(controls);
  root.getSelectedKeys = () => selected.slice();
  renderList();
  return root;
}

	function getVoiceModemConfig(cfg) {
	  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return {};
	  if (!cfg.voice_modem || typeof cfg.voice_modem !== 'object' || Array.isArray(cfg.voice_modem)) cfg.voice_modem = {};
	  return cfg.voice_modem;
	}

	function getAlarmNotificationRoutes(cfg) {
	  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return [];
	  if (!Array.isArray(cfg.routes)) cfg.routes = [];
	  return cfg.routes;
	}

function findDefaultAudioRoute(cfg) {
  const routes = getAlarmNotificationRoutes(cfg);
  return routes.find((r) => r && typeof r === 'object' && String(r.name || '') === 'default_audio')
    || routes.find((r) => r && typeof r === 'object' && String(r.type || '') === 'audio_command')
    || null;
}

	function getConfiguredAudioOutput(cfg) {
	  const raw = String(cfg?.audio?.output_device || '').trim();
	  return raw || 'default';
	}

function buildAudioRouteArgsForOutput(outputRaw) {
  const output = String(outputRaw || 'default').trim() || 'default';
  return output === 'default' ? ['{audio_path}'] : ['-D', output, '{audio_path}'];
}

function audioOutputFromRoute(route) {
  const args = Array.isArray(route?.args) ? route.args.map((a) => String(a || '')) : [];
  const idx = args.indexOf('-D');
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return 'default';
}

function normalizeRepeatMs(raw, def = 0) {
  if (raw == null) return def;
  const s = String(raw).trim();
  if (s === '') return def;
  const n = Number(s);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.trunc(n));
}

function normalizeRepeatSec(raw, defSec = 0) {
  if (raw == null) return defSec;
  const s = String(raw).trim();
  if (s === '') return defSec;
  const n = Number(s);
  if (!Number.isFinite(n)) return defSec;
  return Math.max(0, Math.trunc(n));
}

	async function loadAlarmNotificationSettings() {
	  setAlarmNotifStatus('Loading…');
	  try {
    const [devicesResp, cfg] = await Promise.all([
      apiGet('/api/scada/audio/devices').catch(() => ({ ok: false, devices: [] })),
      loadOpcbridgeAlarmsConfig()
	    ]);
	    const route = findDefaultAudioRoute(cfg) || {};

	    if (els.alarmNotifEnabled) els.alarmNotifEnabled.checked = Boolean(cfg?.audio?.notifications_enabled);

    const repeatMs = normalizeRepeatMs(route?.repeat_ms, 0);
    if (els.alarmNotifRepeatMs) els.alarmNotifRepeatMs.value = String(Math.max(0, Math.trunc(repeatMs / 1000)));

    const until = String(route?.until || 'acked_or_returned');
    if (els.alarmNotifUntil) els.alarmNotifUntil.value = until;

    const selected = getConfiguredAudioOutput(cfg) || audioOutputFromRoute(route);
    if (els.alarmNotifOutputDevice) {
      els.alarmNotifOutputDevice.textContent = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'default';
      defaultOpt.textContent = 'System default';
      els.alarmNotifOutputDevice.appendChild(defaultOpt);

      const devices = Array.isArray(devicesResp?.devices) ? devicesResp.devices : [];
      devices.forEach((d) => {
        const value = String(d?.alsa || d?.id || '').trim();
        if (!value) return;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = String(d?.label || value);
        els.alarmNotifOutputDevice.appendChild(opt);
      });

      if (selected && !Array.from(els.alarmNotifOutputDevice.options || []).some((opt) => opt.value === selected)) {
        const opt = document.createElement('option');
        opt.value = selected;
        opt.textContent = `${selected} (configured)`;
        els.alarmNotifOutputDevice.appendChild(opt);
      }
      els.alarmNotifOutputDevice.value = selected || 'default';
	    }

	    const count = Array.isArray(devicesResp?.devices) ? devicesResp.devices.length : 0;
	    const enabledText = (cfg?.audio?.notifications_enabled === true) ? 'enabled' : 'disabled';
	    const suffix = devicesResp?.ok === false ? ` (${devicesResp.error || 'device scan failed'})` : '';
	    setAlarmNotifStatus(`Ready. Notifications ${enabledText}. ${count} hardware output(s) found.${suffix}`);
	  } catch (err) {
	    setAlarmNotifStatus(`Load failed: ${err.message}`);
	  }
	}

	async function saveAlarmNotificationSettings() {
	  setAlarmNotifStatus('Saving…');
	  try {
    const enabled = Boolean(els.alarmNotifEnabled?.checked);
    const repeatSec = normalizeRepeatSec(els.alarmNotifRepeatMs?.value, 0);
    const repeatMs = repeatSec * 1000;
    const until = String(els.alarmNotifUntil?.value || 'acked_or_returned').trim() || 'acked_or_returned';
	    const output = String(els.alarmNotifOutputDevice?.value || 'default').trim() || 'default';

	    const cfg = await loadOpcbridgeAlarmsConfig();
	    if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
	    cfg.audio.notifications_enabled = enabled;
	    cfg.audio.output_device = output;

	    const routes = getAlarmNotificationRoutes(cfg);
	    let route = routes.find((r) => r && typeof r === 'object' && String(r.name || '') === 'default_audio')
	      || routes.find((r) => r && typeof r === 'object' && String(r.type || '') === 'audio_command');
    if (!route) {
      route = {};
      routes.push(route);
    }

    route.name = String(route.name || 'default_audio');
    route.type = 'audio_command';
    route.enabled = true;
    route.min_severity = Number(route.min_severity ?? 0) || 0;
    route.on = Array.isArray(route.on) && route.on.length ? route.on : ['active'];
    route.command = '/usr/bin/aplay';
    route.args = buildAudioRouteArgsForOutput(output);
    route.repeat_ms = repeatMs;
    route.until = until;

    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();

    setAlarmNotifStatus('Saved.');
    // Keep the Configure->Sound Settings in sync if the user switches tabs.
    renderWorkspaceTree();
  } catch (err) {
    setAlarmNotifStatus(`Save failed: ${err.message}`);
  }
}

async function loadSoundSettings() {
  setSoundSettingsStatus('Loading outputs...');
  try {
    const devicesResp = await apiGet('/api/scada/audio/devices');
    const cfg = await loadOpcbridgeAlarmsConfig();
    const route = findDefaultAudioRoute(cfg);
    const selected = getConfiguredAudioOutput(cfg) || audioOutputFromRoute(route);

    if (els.soundOutputDevice) {
      els.soundOutputDevice.textContent = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'default';
      defaultOpt.textContent = 'System default';
      els.soundOutputDevice.appendChild(defaultOpt);

      const devices = Array.isArray(devicesResp?.devices) ? devicesResp.devices : [];
      devices.forEach((d) => {
        const value = String(d?.alsa || d?.id || '').trim();
        if (!value) return;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = String(d?.label || value);
        els.soundOutputDevice.appendChild(opt);
      });

      if (selected && !Array.from(els.soundOutputDevice.options || []).some((opt) => opt.value === selected)) {
        const opt = document.createElement('option');
        opt.value = selected;
        opt.textContent = `${selected} (configured)`;
        els.soundOutputDevice.appendChild(opt);
      }
      els.soundOutputDevice.value = selected || 'default';
    }

    if (els.soundTestAudioFile) {
      const prev = String(els.soundTestAudioFile.value || '').trim();
      els.soundTestAudioFile.textContent = '';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '(Use Speech Text)';
      els.soundTestAudioFile.appendChild(noneOpt);
      const files = Array.isArray(cfg?.audio?.files) ? cfg.audio.files : [];
      files
        .slice()
        .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }))
        .forEach((f) => {
          const id = String(f?.id || '').trim();
          if (!id) return;
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = `${String(f?.name || id)} (${id})`;
          els.soundTestAudioFile.appendChild(opt);
        });
      if (prev && Array.from(els.soundTestAudioFile.options).some((o) => o.value === prev)) {
        els.soundTestAudioFile.value = prev;
      } else {
        els.soundTestAudioFile.value = '';
      }
    }

    const count = Array.isArray(devicesResp?.devices) ? devicesResp.devices.length : 0;
    const suffix = devicesResp?.ok === false ? ` (${devicesResp.error || 'device scan failed'})` : '';
    setSoundSettingsStatus(`Ready. ${count} hardware output(s) found.${suffix}`);
  } catch (err) {
    setSoundSettingsStatus(`Load failed: ${err.message}`);
  }
}

	async function saveSoundSettings() {
	  setSoundSettingsStatus('Saving...');
	  try {
	    const output = String(els.soundOutputDevice?.value || 'default').trim() || 'default';
	    const cfg = await loadOpcbridgeAlarmsConfig();
    const routes = getAlarmNotificationRoutes(cfg);
    let route = routes.find((r) => r && typeof r === 'object' && String(r.name || '') === 'default_audio')
      || routes.find((r) => r && typeof r === 'object' && String(r.type || '') === 'audio_command');
    if (!route) {
      route = {};
      routes.push(route);
	    }

	    if (!cfg.audio || typeof cfg.audio !== 'object' || Array.isArray(cfg.audio)) cfg.audio = {};
	    cfg.audio.notifications_enabled = true;
	    cfg.audio.output_device = output;
	    route.name = String(route.name || 'default_audio');
	    route.type = 'audio_command';
	    route.enabled = true;
    route.min_severity = Number(route.min_severity ?? 0) || 0;
    route.on = Array.isArray(route.on) && route.on.length ? route.on : ['active'];
    route.command = '/usr/bin/aplay';
    route.args = buildAudioRouteArgsForOutput(output);
    // Preserve the existing repeat_ms exactly (including 0 = disabled). Default to 0 if unset.
    route.repeat_ms = normalizeRepeatMs(route.repeat_ms, 0);
    route.until = String(route.until || 'acked_or_returned');

    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
    setSoundSettingsStatus('Saved. Alarm server will reload the setting automatically.');
  } catch (err) {
    setSoundSettingsStatus(`Save failed: ${err.message}`);
  }
}

async function testSoundSettingsPlayback() {
  setSoundSettingsStatus('Testing audio playback...');
  try {
    const audio_file = String(els.soundTestAudioFile?.value || '').trim();
    const tts_text = String(els.soundTestTtsText?.value || '').trim();
    if (!audio_file && !tts_text) throw new Error('Select a test audio file or enter speech text.');
    const body = {};
    if (audio_file) body.audio_file = audio_file;
    if (tts_text) body.tts_text = tts_text;
    const resp = await apiPostJson('/api/alarms/alarm/api/audio/test', body);
    if (!resp?.ok) throw new Error(resp?.error || 'Audio test failed.');
    setSoundSettingsStatus(`Test OK. ${String(resp?.result || '').trim()}`);
  } catch (err) {
    setSoundSettingsStatus(`Test failed: ${err.message}`);
  }
}

async function loadSipSettings() {
  setSipStatus('Loading...');
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    const sip = (cfg && typeof cfg === 'object' && cfg.sip && typeof cfg.sip === 'object') ? cfg.sip : {};
    if (els.sipEnabled) els.sipEnabled.checked = Boolean(sip.enabled);
    if (els.sipServer) els.sipServer.value = String(sip.server || '').trim();
    if (els.sipExt) els.sipExt.value = String(sip.ext || '').trim();
    if (els.sipPass) els.sipPass.value = String(sip.pass || '').trim();
    if (els.sipTransport) els.sipTransport.value = String(sip.transport || 'udp').trim().toLowerCase() || 'udp';
    if (els.sipNetIf) els.sipNetIf.value = String(sip.net_if || '').trim();
    // This is the default SIP call duration used by runtime (not just the test).
    if (els.sipDurationSec) els.sipDurationSec.value = String(Number(sip.duration_sec ?? 20) || 20);
	    const files = Array.isArray(cfg?.audio?.files) ? cfg.audio.files : [];
	    const sortedFiles = files
	      .slice()
	      .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
	    const fillAudioSelect = (sel, { noneLabel, selectedId } = {}) => {
	      if (!sel) return;
	      sel.textContent = '';
	      const noneOpt = document.createElement('option');
	      noneOpt.value = '';
	      noneOpt.textContent = noneLabel || '(None)';
	      sel.appendChild(noneOpt);
	      sortedFiles.forEach((f) => {
	        const id = String(f?.id || '').trim();
	        if (!id) return;
	        const opt = document.createElement('option');
	        opt.value = id;
	        opt.textContent = `${String(f?.name || id)} (${id})`;
	        sel.appendChild(opt);
	      });
	      const saved = String(selectedId || '').trim();
	      if (saved && Array.from(sel.options).some((o) => o.value === saved)) sel.value = saved;
	      else sel.value = '';
	    };

	    fillAudioSelect(els.sipTestAudioFile, { noneLabel: '(Use Speech Text)', selectedId: sip.test_audio_file });
	    fillAudioSelect(els.sipAckConfirmAudioFile, { noneLabel: '(No Ack Confirm)', selectedId: sip.ack_confirm_audio_file });

	    if (els.sipTestTtsText) {
	      els.sipTestTtsText.value = String(sip.test_tts_text || '').trim();
	    }
	    if (els.sipAckConfirmTtsText) {
	      els.sipAckConfirmTtsText.value = String(sip.ack_confirm_tts_text || '').trim();
	    }
	    if (els.sipAckConfirmMaxMs) {
	      els.sipAckConfirmMaxMs.value = String(Math.max(0, Math.min(30000, Math.trunc(Number(sip.ack_confirm_max_ms ?? 4000) || 4000))));
	    }
	    if (els.sipAckPromptTts) {
	      // Default true when missing (more user-friendly for ack-based callouts).
	      els.sipAckPromptTts.checked = sip.ack_prompt_tts !== false;
	    }
	    if (els.sipTestTo) els.sipTestTo.value = String(sip.test_to || '').trim();

	    setSipStatus('Ready.');
	  } catch (err) {
    setSipStatus(`Load failed: ${err.message}`);
  }
  }

  async function saveSipSettings() {
  if (els.sipSaveBtn) els.sipSaveBtn.disabled = true;
  setSipStatus('Saving...');
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    cfg.sip = cfg.sip && typeof cfg.sip === 'object' ? cfg.sip : {};
    cfg.sip.enabled = Boolean(els.sipEnabled?.checked);
    cfg.sip.server = String(els.sipServer?.value || '').trim();
    cfg.sip.ext = String(els.sipExt?.value || '').trim();
    const pass = String(els.sipPass?.value || '').trim();
    cfg.sip.pass = pass;
    cfg.sip.transport = String(els.sipTransport?.value || 'udp').trim().toLowerCase() || 'udp';
    cfg.sip.net_if = String(els.sipNetIf?.value || '').trim();
	    cfg.sip.duration_sec = Math.max(5, Math.min(300, Math.trunc(Number(els.sipDurationSec?.value ?? 20) || 20)));
	    // Note: ring cadence/max rings were removed; use policy ring_timeout_sec only.
	    cfg.sip.test_to = String(els.sipTestTo?.value || '').trim();
	    cfg.sip.test_audio_file = String(els.sipTestAudioFile?.value || '').trim();
	    cfg.sip.test_tts_text = String(els.sipTestTtsText?.value || '').trim();
	    cfg.sip.ack_confirm_audio_file = String(els.sipAckConfirmAudioFile?.value || '').trim();
	    cfg.sip.ack_confirm_tts_text = String(els.sipAckConfirmTtsText?.value || '').trim();
	    cfg.sip.ack_confirm_max_ms = Math.max(0, Math.min(30000, Math.trunc(Number(els.sipAckConfirmMaxMs?.value ?? 4000) || 4000)));
	    cfg.sip.ack_prompt_tts = Boolean(els.sipAckPromptTts?.checked);
	    // Prefer the audio file when both are set.
	    if (cfg.sip.ack_confirm_audio_file) cfg.sip.ack_confirm_tts_text = '';
	    await saveOpcbridgeAlarmsConfig(cfg);
	    await loadOpcbridgeAlarmsConfig();
	    setSipStatus('Saved. Alarm server will reload the setting automatically.');
	  } catch (err) {
    setSipStatus(`Save failed: ${err.message}`);
  } finally {
    if (els.sipSaveBtn) els.sipSaveBtn.disabled = false;
  }
}

async function testSipCall() {
  if (els.sipTestBtn) els.sipTestBtn.disabled = true;
  setSipStatus('Placing SIP test call...');
  try {
    const to = String(els.sipTestTo?.value || '').trim();
    if (!to) throw new Error('Enter a destination phone number.');
    const audio_file = String(els.sipTestAudioFile?.value || '').trim();
    const tts_text = audio_file ? '' : String(els.sipTestTtsText?.value || '').trim();
    const body = {
      to,
      duration: Math.max(5, Math.min(300, Math.trunc(Number(els.sipDurationSec?.value ?? 20) || 20))),
      transport: String(els.sipTransport?.value || 'udp').trim().toLowerCase() || 'udp',
      net_if: String(els.sipNetIf?.value || '').trim()
    };
    // Allow testing before saving by passing explicit overrides when present.
    const server = String(els.sipServer?.value || '').trim();
    const ext = String(els.sipExt?.value || '').trim();
    const passRaw = els.sipPass?.value;
    const pass = String(passRaw ?? '').trim();
    // For Test, always use the current visible values (even if blank) so
    // users can validate changes without saving, and so blanks fail loudly.
    body.server = server;
    body.ext = ext;
    body.pass = pass;
    if (audio_file) body.audio_file = audio_file;
    if (tts_text) body.tts_text = tts_text;
    const resp = await apiPostJson('/api/alarms/alarm/api/sip/test', body, { timeoutMs: 180000 });
    if (!resp?.ok) throw new Error(resp?.error || 'SIP test call failed.');
    const codes = Array.isArray(resp?.codes) ? resp.codes.join(',') : '';
    setSipStatus(`OK. net_if=${resp?.net_if || ''} codes=[${codes}]`);
  } catch (err) {
    setSipStatus(`Test failed: ${err.message}`);
  } finally {
    if (els.sipTestBtn) els.sipTestBtn.disabled = false;
  }
}

async function loadVoiceModemSettings() {
  setVoiceModemStatus('Loading modem devices...');
  try {
    const [devicesResp, cfg] = await Promise.all([
      apiGet('/api/scada/modem/devices').catch(() => ({ ok: false, devices: [] })),
      loadOpcbridgeAlarmsConfig()
    ]);
    const vm = getVoiceModemConfig(cfg);
    const selected = String(vm.device || '').trim();
    const devices = Array.isArray(devicesResp?.devices) ? devicesResp.devices : [];

    if (els.voiceModemEnabled) els.voiceModemEnabled.checked = Boolean(vm.enabled);
    if (els.voiceModemVoiceInit) els.voiceModemVoiceInit.checked = Boolean(vm.voice_init);
    if (els.voiceModemVoiceLine) els.voiceModemVoiceLine.value = String(Number(vm.voice_line ?? 1) || 1);
    if (els.voiceModemDialSeconds) els.voiceModemDialSeconds.value = String(Number(vm.dial_seconds ?? 30) || 30);
    if (els.voiceModemAudioDelaySeconds) els.voiceModemAudioDelaySeconds.value = String(Number(vm.audio_delay_seconds ?? 8) || 8);
    if (els.voiceModemAudioGapMs) els.voiceModemAudioGapMs.value = String(Number(vm.audio_gap_ms ?? 50) || 0);
    // Shared TTS settings are loaded via loadTtsSettings().

    if (els.voiceModemBaud) {
      const baud = String(Number(vm.baud ?? 115200) || 115200);
      if (!Array.from(els.voiceModemBaud.options || []).some((opt) => opt.value === baud)) {
        const opt = document.createElement('option');
        opt.value = baud;
        opt.textContent = `${baud} (configured)`;
        els.voiceModemBaud.appendChild(opt);
      }
      els.voiceModemBaud.value = baud;
    }

    if (els.voiceModemDevice) {
      els.voiceModemDevice.textContent = '';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'Select detected device';
      els.voiceModemDevice.appendChild(emptyOpt);

      devices.forEach((d) => {
        const value = String(d?.path || d?.id || '').trim();
        if (!value) return;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = String(d?.label || value);
        els.voiceModemDevice.appendChild(opt);
      });

      if (selected && !Array.from(els.voiceModemDevice.options || []).some((opt) => opt.value === selected)) {
        const opt = document.createElement('option');
        opt.value = selected;
        opt.textContent = `${selected} (configured)`;
        els.voiceModemDevice.appendChild(opt);
      }
      els.voiceModemDevice.value = selected;
    }

    if (els.voiceModemManualDevice) els.voiceModemManualDevice.value = '';

    if (els.voiceModemTestContact) {
      els.voiceModemTestContact.textContent = '';
      const contacts = getNotificationContacts(cfg)
        .filter((c) => c?.enabled !== false && String(c?.phone || '').trim())
        .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
      contacts.forEach((contact) => {
        const id = String(contact?.id || '').trim();
        if (!id) return;
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${String(contact?.name || id)} - ${String(contact?.phone || '').trim()}`;
        els.voiceModemTestContact.appendChild(opt);
      });
      if (!contacts.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No enabled contacts with phone numbers';
        els.voiceModemTestContact.appendChild(opt);
      }
    }

    if (els.voiceModemTestAudioFile) {
      els.voiceModemTestAudioFile.textContent = '';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'No uploaded audio - use speech text if entered';
      els.voiceModemTestAudioFile.appendChild(emptyOpt);
      getAlarmAudioFiles(cfg).forEach((file) => {
        const opt = document.createElement('option');
        opt.value = file.id;
        opt.textContent = `${file.name || file.id} (${file.id})`;
        els.voiceModemTestAudioFile.appendChild(opt);
      });
      const defaultFile = String(cfg.audio?.default_file || '').trim();
      if (defaultFile && Array.from(els.voiceModemTestAudioFile.options || []).some((opt) => opt.value === defaultFile)) {
        els.voiceModemTestAudioFile.value = defaultFile;
      }
    }
    if (els.voiceModemTestTtsText && !String(els.voiceModemTestTtsText.value || '').trim()) {
      els.voiceModemTestTtsText.value = 'This is a test call from OPC Bridge.';
    }

    const suffix = devicesResp?.ok === false ? ` (${devicesResp.error || 'device scan failed'})` : '';
    setVoiceModemStatus(`Ready. ${devices.length} serial modem candidate(s) found.${suffix}`);
  } catch (err) {
    setVoiceModemStatus(`Load failed: ${err.message}`);
  }
  }

  async function saveVoiceModemSettings() {
  setVoiceModemStatus('Saving...');
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    const vm = getVoiceModemConfig(cfg);
    const manualDevice = String(els.voiceModemManualDevice?.value || '').trim();
    const selectedDevice = String(els.voiceModemDevice?.value || '').trim();
    const baud = Number(els.voiceModemBaud?.value ?? 115200) || 115200;
    const voiceLine = Number(els.voiceModemVoiceLine?.value ?? 1) || 1;
    const dialSeconds = Number(els.voiceModemDialSeconds?.value ?? 30) || 30;
    const audioDelaySeconds = Number(els.voiceModemAudioDelaySeconds?.value ?? 8) || 0;
    const audioGapMs = Number(els.voiceModemAudioGapMs?.value ?? 50) || 0;
    vm.enabled = Boolean(els.voiceModemEnabled?.checked);
    vm.device = manualDevice || selectedDevice;
    vm.baud = Math.max(300, Math.trunc(baud));
    vm.voice_init = Boolean(els.voiceModemVoiceInit?.checked);
    vm.voice_line = Math.max(0, Math.min(255, Math.trunc(voiceLine)));
    vm.dial_seconds = Math.max(5, Math.min(300, Math.trunc(dialSeconds)));
    vm.audio_delay_seconds = Math.max(0, Math.min(120, Math.trunc(audioDelaySeconds)));
    vm.audio_gap_ms = Math.max(0, Math.min(5000, Math.trunc(audioGapMs)));
    await saveOpcbridgeAlarmsConfig(cfg);
    await loadOpcbridgeAlarmsConfig();
    setVoiceModemStatus('Saved. Alarm server will reload the settings automatically.');
  } catch (err) {
    setVoiceModemStatus(`Save failed: ${err.message}`);
  }
}

async function testVoiceModemCall() {
  if (els.voiceModemTestBtn) els.voiceModemTestBtn.disabled = true;
  setVoiceModemStatus('Placing test call...');
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    const contactId = String(els.voiceModemTestContact?.value || '').trim();
    const contact = getNotificationContacts(cfg).find((c) => String(c?.id || '').trim() === contactId);
    if (!contact) throw new Error('Select a test contact first.');
    const phone = String(contact?.phone || '').trim();
    if (!phone) throw new Error('Selected contact has no phone number.');

    const audioFile = String(els.voiceModemTestAudioFile?.value || '').trim();
    const ttsText = audioFile ? '' : String(els.voiceModemTestTtsText?.value || '').trim();
    const resp = await apiPostJson('/api/alarms/alarm/api/voice-modem/test', {
      contact_id: contactId,
      contact_name: String(contact?.name || contactId),
      phone,
      audio_file: audioFile,
      tts_text: ttsText
    });
    if (!resp?.ok) throw new Error(resp?.error || 'Test call failed.');
    setVoiceModemStatus(`Test call complete. ${resp.result || ''}`);
  } catch (err) {
    setVoiceModemStatus(`Test call failed: ${err.message}`);
  } finally {
    if (els.voiceModemTestBtn) els.voiceModemTestBtn.disabled = false;
  }
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

async function loadAuthAdminPanel() {
  if (state.authAdminLoadInFlight) return;
  state.authAdminLoadInFlight = true;
  setAuthAdminStatus('Loading…');
  try {
    const payload = await apiGet('/api/scada/auth-admin');
    const adminConfigured = Boolean(payload?.auth?.admin_token_configured);
    const writeConfigured = Boolean(payload?.auth?.write_token_configured);
    const adminToken = String(payload?.tokens?.admin_token || '');
    const writeToken = String(payload?.tokens?.write_token || '');
    if (els.authAdminTokenValue) {
      els.authAdminTokenValue.value = adminToken;
      els.authAdminTokenValue.placeholder = adminConfigured ? '' : 'Not configured';
    }
    if (els.authWriteTokenValue) {
      els.authWriteTokenValue.value = writeToken;
      els.authWriteTokenValue.placeholder = writeConfigured ? '' : 'Not configured';
    }
    if (els.authAdminTokenCopyBtn) els.authAdminTokenCopyBtn.disabled = !adminToken;
    if (els.authWriteTokenCopyBtn) els.authWriteTokenCopyBtn.disabled = !writeToken;
    state.authAdminLoaded = true;
    setAuthAdminStatus(`Ready. admin_token=${adminConfigured ? 'yes' : 'no'} write_token=${writeConfigured ? 'yes' : 'no'}`);
  } catch (err) {
    state.authAdminLoaded = false;
    setAuthAdminStatus(`Failed: ${err.message}`);
  } finally {
    state.authAdminLoadInFlight = false;
  }
}

function ensureAuthAdminPanelLoaded() {
  if (!canAccessConfigureTab()) return;
  if (state.authAdminLoaded || state.authAdminLoadInFlight) return;
  loadAuthAdminPanel().catch(() => {});
}

async function testAuthAdminAlarmsAccess() {
  setAuthAdminStatus('Testing /config/alarms access…');
  try {
    const resp = await apiGet('/api/opcbridge/config/alarms');
    const alarms = Array.isArray(resp?.json?.alarms) ? resp.json.alarms : [];
    const rules = Array.isArray(resp?.json?.rules) ? resp.json.rules : [];
    setAuthAdminStatus(`OK. schema=${String(resp?.json?.schema_version ?? 'n/a')} alarms=${alarms.length} rules=${rules.length}`);
  } catch (err) {
    setAuthAdminStatus(`Failed: ${err.message}`);
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
  els.authAdminReloadBtn?.addEventListener('click', loadAuthAdminPanel);
  els.authAdminTestAlarmsBtn?.addEventListener('click', testAuthAdminAlarmsAccess);
  els.authAdminTokenCopyBtn?.addEventListener('click', async () => {
    const token = String(els.authAdminTokenValue?.value || '').trim();
    if (!token) return;
    try {
      await copyTextToClipboardSafe(token);
      setAuthAdminStatus('Copied admin token.');
    } catch (err) {
      setAuthAdminStatus(`Copy failed: ${err.message}`);
    }
  });
  els.authWriteTokenCopyBtn?.addEventListener('click', async () => {
    const token = String(els.authWriteTokenValue?.value || '').trim();
    if (!token) return;
    try {
      await copyTextToClipboardSafe(token);
      setAuthAdminStatus('Copied write token.');
    } catch (err) {
      setAuthAdminStatus(`Copy failed: ${err.message}`);
    }
  });
  els.projectBackupDownloadBtn?.addEventListener('click', downloadProjectBackup);
  els.projectRestorePreviewBtn?.addEventListener('click', previewProjectRestore);
  els.projectRestoreApplyBtn?.addEventListener('click', applyProjectRestore);
  els.soundReloadBtn?.addEventListener('click', loadSoundSettings);
  els.soundTestBtn?.addEventListener('click', testSoundSettingsPlayback);
  els.soundSaveBtn?.addEventListener('click', saveSoundSettings);
  els.sipSaveBtn?.addEventListener('click', saveSipSettings);
  els.sipTestBtn?.addEventListener('click', testSipCall);
  els.ttsSaveBtn?.addEventListener('click', saveTtsSettings);
  els.voiceModemReloadBtn?.addEventListener('click', loadVoiceModemSettings);
  els.voiceModemSaveBtn?.addEventListener('click', saveVoiceModemSettings);
  els.voiceModemTestBtn?.addEventListener('click', testVoiceModemCall);
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

function wireAlarmNotificationUi() {
  if (els.alarmNotifReloadBtn && els.alarmNotifReloadBtn.dataset.wired !== '1') {
    els.alarmNotifReloadBtn.dataset.wired = '1';
    els.alarmNotifReloadBtn.addEventListener('click', loadAlarmNotificationSettings);
  }
  if (els.alarmNotifSaveBtn && els.alarmNotifSaveBtn.dataset.wired !== '1') {
    els.alarmNotifSaveBtn.dataset.wired = '1';
    els.alarmNotifSaveBtn.addEventListener('click', saveAlarmNotificationSettings);
  }
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
    const resp = await fetchWithTimeout('/api/opcbridge/cert/upload', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/x-pem-file' },
      body: buf
    }, 120000);
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

function normalizePollingMode(value) {
  return String(value || '').trim() === 'time_sliced' ? 'time_sliced' : 'standard';
}

function normalizePollingPacing(value) {
  const v = String(value || '').trim();
  return ['gentle', 'balanced', 'fast'].includes(v) ? v : 'balanced';
}

function readOptionalPositiveInt(el) {
  const raw = String(el?.value ?? '').trim();
  if (!raw) return null;
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function applyPollingConfigToConnection(obj, { mode, pacing, batchSize, timeBudgetMs }) {
  const out = obj || {};
  out.polling_mode = normalizePollingMode(mode);
  out.polling_pacing = normalizePollingPacing(pacing);
  const batch = Math.trunc(Number(batchSize || 0));
  const budget = Math.trunc(Number(timeBudgetMs || 0));
  if (Number.isFinite(batch) && batch > 0) out.poll_batch_size = batch;
  else delete out.poll_batch_size;
  if (Number.isFinite(budget) && budget > 0) out.poll_time_budget_ms = budget;
  else delete out.poll_time_budget_ms;
  return out;
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

    // Render immediately from filenames so Workspace does not appear empty while
    // individual config file reads are waiting behind a busy opcbridge process.
    renderConnList();
    renderWorkspaceTree();
    setConnStatus('Ready.');

    // Preload connection configs in the background so we can key devices/tags by
    // true connection_id (not filename) and fill detail columns when available.
    Promise.allSettled(state.connFiles.map(async (f) => {
      const rel = String(f?.path || '').trim();
      if (!rel) return;
      try {
        await getConnObjForPath(rel);
      } catch {
        // ignore
      }
    })).then(() => {
      renderConnList();
      renderWorkspaceTree();
    }).catch(() => {});
  } catch (err) {
    setConnStatus(`Failed: ${err.message}`);
    renderConnList();
    renderWorkspaceTree();
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
	    setConnStatus(reload ? 'Saved. Rebuilding full runtime…' : 'Saved.');

	    if (reload) {
	      await opcbridgeReload();
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

function listConnectionIdsFromTags(tags) {
  const set = new Set();
  (Array.isArray(tags) ? tags : []).forEach((t) => {
    const cid = String(t?.connection_id || '').trim();
    if (cid) set.add(cid);
  });
  return set;
}

function computeEmptiedTagConnectionIds(baseTags, nextTags) {
  const base = listConnectionIdsFromTags(baseTags);
  const next = listConnectionIdsFromTags(nextTags);
  const emptied = [];
  base.forEach((cid) => {
    if (cid && !next.has(cid)) emptied.push(cid);
  });
  emptied.sort();
  return emptied;
}

function computeChangedTagConnectionIds(baseTags, nextTags) {
  const changed = new Set();
  const baseMap = new Map();
  const nextMap = new Map();
  (Array.isArray(baseTags) ? baseTags : []).forEach((t) => {
    const key = makeTagKey(t);
    if (key) baseMap.set(key, sanitizeTagForPost(t));
  });
  (Array.isArray(nextTags) ? nextTags : []).forEach((t) => {
    const key = makeTagKey(t);
    if (key) nextMap.set(key, sanitizeTagForPost(t));
  });
  new Set([...baseMap.keys(), ...nextMap.keys()]).forEach((key) => {
    const a = baseMap.get(key);
    const b = nextMap.get(key);
    if (JSON.stringify(a || null) === JSON.stringify(b || null)) return;
    const cid = String((b || a)?.connection_id || key.split('::')[0] || '').trim();
    if (cid) changed.add(cid);
  });
  return changed;
}

async function saveTagsForChangedConnections(baseTags, nextTags) {
  const changed = computeChangedTagConnectionIds(baseTags, nextTags);
  const emptied = computeEmptiedTagConnectionIds(baseTags, nextTags);
  const tags = Array.isArray(nextTags) ? nextTags : [];
  const changedList = Array.from(changed);
  const tagsToWrite = changedList.length > 0
    ? tags.filter((t) => changed.has(String(t?.connection_id || '').trim()))
    : tags;

  if (tagsToWrite.length > 0) {
    await apiPostJson('/api/opcbridge/config/tags', { tags: tagsToWrite });
  }
  if (emptied.length > 0) {
    await writeEmptyCanonicalTagFilesForConnections(emptied);
  }
  return changed;
}

async function writeEmptyCanonicalTagFilesForConnections(connectionIds) {
  const ids = Array.isArray(connectionIds) ? connectionIds : [];
  for (const cid of ids) {
    const c = String(cid || '').trim();
    if (!c) continue;
    const content = prettyJson({ connection_id: c, tags: [] });
    await apiPostJson('/api/opcbridge/config/file', { path: `tags/${c}.json`, content });
  }
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
      <td class="cell-check"><input class="inline-check" id="${enabledInputId}" type="checkbox" ${enabled ? 'checked' : ''} /></td>
      <td class="cell-check"><input class="inline-check" id="${writableInputId}" type="checkbox" ${t.writable ? 'checked' : ''} /></td>
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
    // Keep an immutable snapshot of what was loaded so we can determine
    // which connections were emptied (e.g., deleting the last tag for a device).
    state.tagConfigLoadedAll = tags.map((t) => ({ ...(t || {}) }));
    state.tagConfigAll = tags.map((t) => ({ ...(t || {}) }));
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
    const baseTags = Array.isArray(state.tagConfigLoadedAll) ? state.tagConfigLoadedAll : state.tagConfigAll;
    const merged = state.tagConfigAll.map((t) => {
      const key = makeTagKey(t);
      return state.tagConfigEdited.get(key) || t;
    });

    await saveTagsForChangedConnections(baseTags, merged);

	    if (reload) {
	      setTagsConfigStatus('Saved. Rebuilding full runtime…');
	      await opcbridgeReload();
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
  if (els.newDevPath) els.newDevPath.value = '';
  if (els.newDevSlot) els.newDevSlot.value = '';
  if (els.newDevPlcType) els.newDevPlcType.value = 'lgx';
  if (els.newDevPollingMode) els.newDevPollingMode.value = 'standard';
  if (els.newDevPollingPacing) els.newDevPollingPacing.value = 'balanced';
  if (els.newDevPollBatchSize) els.newDevPollBatchSize.value = '';
  if (els.newDevPollTimeBudgetMs) els.newDevPollTimeBudgetMs.value = '';

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
  if (els.newTagSourceKind) els.newTagSourceKind.value = 'plc';
  if (els.newTagPlc) els.newTagPlc.value = '';
  if (els.newTagBit) els.newTagBit.value = '';
  fillTagDatatypeSelect(els.newTagDatatype, 'bool');
  if (els.newTagScan) els.newTagScan.value = '';
  if (els.newTagElemCount) els.newTagElemCount.value = '';
  if (els.newTagEnabled) els.newTagEnabled.checked = true;
  if (els.newTagWritable) els.newTagWritable.checked = false;
  if (els.newTagInvert) els.newTagInvert.checked = false;
  if (els.newTagMqttAllowed) els.newTagMqttAllowed.checked = false;
  if (els.newTagLogEvent) els.newTagLogEvent.checked = false;
  if (els.newTagScaling) {
    els.newTagScaling.value = 'none';
    els.newTagScaling.onchange = () => applyScalingModeUi(els.newTagScaling, els.newTagScalingLinearRow);
    applyScalingModeUi(els.newTagScaling, els.newTagScalingLinearRow);
  }
  fillScaledDatatypeSelect(els.newTagScaledDatatype, '');
  if (els.newTagRawLow) els.newTagRawLow.value = '';
  if (els.newTagRawHigh) els.newTagRawHigh.value = '';
  if (els.newTagScaledLow) els.newTagScaledLow.value = '';
  if (els.newTagScaledHigh) els.newTagScaledHigh.value = '';
  if (els.newTagClampLow) els.newTagClampLow.checked = false;
  if (els.newTagClampHigh) els.newTagClampHigh.checked = false;

  [els.newTagLogEvent, els.newTagScaling, els.newTagRawLow, els.newTagRawHigh, els.newTagScaledLow, els.newTagScaledHigh, els.newTagScaledDatatype, els.newTagClampLow, els.newTagClampHigh]
    .filter(Boolean)
    .forEach((e) => { e.disabled = !canEditConfig(); });

  if (els.newTagSourceKind) {
    els.newTagSourceKind.onchange = () => applyTagSourceKindUi({
      kindEl: els.newTagSourceKind,
      plcEl: els.newTagPlc,
      derivedRowEl: els.newTagDerivedRow,
      sourceEl: els.newTagSourceTag,
      bitBoxEl: els.newTagBitBox,
      bitEl: els.newTagBit,
      datatypeEl: els.newTagDatatype,
      elemCountEl: els.newTagElemCount,
      writableEl: els.newTagWritable,
      mqttAllowedEl: els.newTagMqttAllowed,
      scalingEl: els.newTagScaling,
      scalingLinearRowEl: els.newTagScalingLinearRow
    }, { connId: cid, excludeTagName: '' });
    applyTagSourceKindUi({
      kindEl: els.newTagSourceKind,
      plcEl: els.newTagPlc,
      derivedRowEl: els.newTagDerivedRow,
      sourceEl: els.newTagSourceTag,
      bitBoxEl: els.newTagBitBox,
      bitEl: els.newTagBit,
      datatypeEl: els.newTagDatatype,
      elemCountEl: els.newTagElemCount,
      writableEl: els.newTagWritable,
      mqttAllowedEl: els.newTagMqttAllowed,
      scalingEl: els.newTagScaling,
      scalingLinearRowEl: els.newTagScalingLinearRow
    }, { connId: cid, excludeTagName: '' });
    els.newTagSourceKind.disabled = !canEditConfig();
  }

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
    const baseTags = Array.isArray(state.tagConfigLoadedAll) ? state.tagConfigLoadedAll : state.tagConfigAll;
    const remaining = state.tagConfigAll.filter((t) => !(String(t?.connection_id || '') === cid && String(t?.name || '') === name));
    const tagsOut = remaining.map(sanitizeTagForPost);
    const emptied = computeEmptiedTagConnectionIds(baseTags, remaining);
    if (tagsOut.length > 0) {
      await apiPostJson('/api/opcbridge/config/tags', { tags: tagsOut });
    }
    if (emptied.length > 0) {
      await writeEmptyCanonicalTagFilesForConnections(emptied);
    }
    await loadTagsConfig();

    renderWorkspaceTree();
  } catch (err) {
    window.alert(`Failed to delete tag: ${err.message}`);
  }
}

function setTagEventLogging(connectionId, tagName, enabled) {
  const cid = String(connectionId || '').trim();
  const name = String(tagName || '').trim();
  if (!cid || !name) return;

  const idx = state.tagConfigAll.findIndex((t) => String(t?.connection_id || '') === cid && String(t?.name || '') === name);
  if (idx < 0) {
    window.alert(`Tag '${cid}:${name}' was not found in the tag config.`);
    return;
  }

  const next = { ...(state.tagConfigAll[idx] || {}), log_event_on_change: Boolean(enabled) };
  state.tagConfigAll[idx] = next;
  if (!state.tagConfigEdited) state.tagConfigEdited = new Map();
  const key = makeTagKey(next);
  if (key) state.tagConfigEdited.set(key, next);
  markTagsDirty(true);
  renderWorkspaceTree();
}

async function createNewTagFromModal() {
  const cid = String(state.pendingNewTag?.connection_id || '').trim();
  if (!cid) return;

  const name = String(els.newTagName?.value || '').trim();
  if (!name) { setNewTagStatus('Tag Name is required.'); return; }

  const sourceKind = String(els.newTagSourceKind?.value || 'plc').trim().toLowerCase();
  const isDerivedBit = (sourceKind === 'derived_bit');
  const isDerivedAlias = (sourceKind === 'derived_alias');
  const isDerived = (isDerivedBit || isDerivedAlias);

  const plc_tag_name = String(els.newTagPlc?.value || '').trim();
  const source_tag = String(els.newTagSourceTag?.value || '').trim();
  const bitRaw = String(els.newTagBit?.value || '').trim();
  const bit = bitRaw === '' ? null : Math.trunc(Number(bitRaw));

  if (!isDerived && !plc_tag_name) { setNewTagStatus('PLC Tag is required.'); return; }
  if (isDerivedBit) {
    if (!source_tag) { setNewTagStatus('Source Tag is required for a Derived Bit.'); return; }
    if (bit == null || !Number.isFinite(bit) || bit < 0 || bit > 63) { setNewTagStatus('Bit must be between 0 and 63.'); return; }
  }
  if (isDerivedAlias) {
    if (!source_tag) { setNewTagStatus('Source Tag is required for a Derived Alias.'); return; }
  }

  const datatype = isDerivedBit ? 'bool' : String(els.newTagDatatype?.value || '').trim();
  const elemCount = Math.max(1, Math.trunc(Number(String(els.newTagElemCount?.value || '').trim() || '1') || 1));
  const scanRaw = String(els.newTagScan?.value || '').trim();
  const scan_ms = scanRaw === '' ? null : Math.max(0, Math.trunc(Number(scanRaw) || 0));
  const enabled = Boolean(els.newTagEnabled?.checked);
  const writable = Boolean(els.newTagWritable?.checked);
  const invert = Boolean(els.newTagInvert?.checked);
  const mqtt_command_allowed = Boolean(els.newTagMqttAllowed?.checked);
  const log_event_on_change = Boolean(els.newTagLogEvent?.checked);
  const tag = {
    connection_id: cid,
    name,
    datatype,
    enabled,
    writable: isDerivedAlias ? false : writable,
    mqtt_command_allowed: isDerivedAlias ? false : mqtt_command_allowed,
    log_event_on_change
  };
  if (!isDerived) {
    tag.plc_tag_name = plc_tag_name;
    if (elemCount !== 1) tag.elem_count = elemCount;
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
    if (scalingRes.scaling === 'linear') Object.assign(tag, scalingRes.fields || {});
  } else if (isDerivedBit) {
    tag.source_tag = source_tag;
    tag.bit = bit;
  } else {
    tag.source_tag = source_tag;
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
    if (scalingRes.scaling === 'linear') Object.assign(tag, scalingRes.fields || {});
  }
  if (scan_ms != null) tag.scan_ms = scan_ms;
  if (invert) tag.invert = true;

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

  // Keep modal open unless explicitly closed via buttons.
  if (els.newTagModal && els.newTagModal.dataset.noOverlayClose !== '1') {
    els.newTagModal.dataset.noOverlayClose = '1';
    const swallow = (e) => {
      if (e.target === els.newTagModal) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    els.newTagModal.addEventListener('mousedown', swallow, true);
    els.newTagModal.addEventListener('mouseup', swallow, true);
    els.newTagModal.addEventListener('click', swallow, true);
  }

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
  setEditAudioScopeStatus('');
  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'none';
  if (els.workspaceItemEventEdit) els.workspaceItemEventEdit.style.display = 'none';
  if (els.workspaceItemAudioScopeEdit) els.workspaceItemAudioScopeEdit.style.display = 'none';
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

function setEditAudioScopeStatus(msg) {
  if (els.editAudioScopeStatus) els.editAudioScopeStatus.textContent = String(msg || '');
}

function setNewEventStatus(msg) {
  if (els.newEventStatus) els.newEventStatus.textContent = String(msg || '');
}

function getEventCandidateTags(connectionId) {
  const cid = String(connectionId || '').trim();
  return getEffectiveTagsAll()
    .filter((t) => String(t?.connection_id || '') === cid)
    .filter((t) => String(t?.name || '').trim())
    .filter((t) => t?.log_event_on_change !== true)
    .slice()
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

function refreshNewEventTagPicker() {
  if (!els.newEventTag) return;

  const cid = String(els.newEventConn?.value || '').trim();
  const q = String(els.newEventSearch?.value || '').trim().toLowerCase();
  const candidates = getEventCandidateTags(cid)
    .filter((t) => !q || String(t?.name || '').toLowerCase().includes(q) || String(t?.plc_tag_name || '').toLowerCase().includes(q));

  els.newEventTag.textContent = '';
  const frag = document.createDocumentFragment();
  candidates.forEach((t) => {
    const name = String(t?.name || '').trim();
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = String(t?.plc_tag_name || '').trim() && String(t.plc_tag_name) !== name
      ? `${name}  (${String(t.plc_tag_name)})`
      : name;
    frag.appendChild(opt);
  });
  els.newEventTag.appendChild(frag);

  if (els.newEventSaveBtn) els.newEventSaveBtn.disabled = !canEditConfig() || candidates.length === 0;
  if (!cid) setNewEventStatus('Select a connection.');
  else if (!candidates.length && q) setNewEventStatus('No matching tags found.');
  else if (!candidates.length) setNewEventStatus('All tags on this connection are already events.');
  else setNewEventStatus(`Showing ${candidates.length} matching tag(s).`);
}

function openNewEventModal(preferredConnectionId = '') {
  if (!els.workspaceItemModal) return;

  closeContextMenu?.();
  state.pendingWorkspaceItem = { id: 'event:new', type: 'event', mode: 'new' };

  const titleEl = document.getElementById('workspaceItemModalTitle');
  if (titleEl) titleEl.textContent = 'New Event';
  if (els.workspaceItemHint) els.workspaceItemHint.textContent = 'Select an existing tag to log as an event on change.';
  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'none';
  if (els.workspaceItemEventEdit) els.workspaceItemEventEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';
  if (els.workspaceItemEventEdit) els.workspaceItemEventEdit.style.display = 'block';

  const conns = Array.from(new Set(getEffectiveTagsAll().map((t) => String(t?.connection_id || '').trim()).filter(Boolean)));
  conns.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
  if (els.newEventConn) {
    els.newEventConn.textContent = '';
    conns.forEach((cid) => {
      const opt = document.createElement('option');
      opt.value = cid;
      opt.textContent = cid;
      els.newEventConn.appendChild(opt);
    });
    const preferred = String(preferredConnectionId || '').trim();
    if (preferred && conns.includes(preferred)) els.newEventConn.value = preferred;
    els.newEventConn.disabled = !canEditConfig();
  }
  if (els.newEventSearch) {
    els.newEventSearch.value = '';
    els.newEventSearch.disabled = !canEditConfig();
  }
  if (els.newEventTag) els.newEventTag.disabled = !canEditConfig();

  refreshNewEventTagPicker();
  els.workspaceItemModal.style.display = 'flex';
  els.newEventSearch?.focus?.();
}

function saveNewEventFromModal() {
  const cid = String(els.newEventConn?.value || '').trim();
  const name = String(els.newEventTag?.value || '').trim();
  if (!canEditConfig()) { setNewEventStatus('Login required to edit events.'); return; }
  if (!cid) { setNewEventStatus('Connection is required.'); return; }
  if (!name) { setNewEventStatus('Select a tag.'); return; }

  setTagEventLogging(cid, name, true);
  closeWorkspaceItemModal();
}

function openWorkspaceItemModal(node) {
  if (!els.workspaceItemModal) return;
  if (!node) return;

  // Show immediately so any async loads (or errors) still present feedback.
  els.workspaceItemModal.style.display = 'flex';

  state.pendingWorkspaceItem = { id: String(node.id || '') };

  if (els.workspaceItemHint) els.workspaceItemHint.textContent = '';
  if (els.workspaceItemTbody) els.workspaceItemTbody.textContent = '';
  els.workspaceItemGeneric?.querySelectorAll?.('.workspace-audio-actions')?.forEach((el) => el.remove());
  setWorkspaceItemStatus('');
  setEditDevStatus('');

  if (els.workspaceItemDeviceEdit) els.workspaceItemDeviceEdit.style.display = 'none';
  if (els.workspaceItemTagEdit) els.workspaceItemTagEdit.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'none';
  if (els.workspaceItemEventEdit) els.workspaceItemEventEdit.style.display = 'none';
  if (els.workspaceItemAudioScopeEdit) els.workspaceItemAudioScopeEdit.style.display = 'none';
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
        if (els.editDevPollingMode) els.editDevPollingMode.value = normalizePollingMode(obj?.polling_mode);
        if (els.editDevPollingPacing) els.editDevPollingPacing.value = normalizePollingPacing(obj?.polling_pacing);
        if (els.editDevPollBatchSize) els.editDevPollBatchSize.value = obj?.poll_batch_size == null ? '' : String(obj.poll_batch_size);
        if (els.editDevPollTimeBudgetMs) els.editDevPollTimeBudgetMs.value = obj?.poll_time_budget_ms == null ? '' : String(obj.poll_time_budget_ms);
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
      if (els.editTagSourceKind) els.editTagSourceKind.value = 'plc';
      if (els.editTagPlc) els.editTagPlc.value = '';
      if (els.editTagSourceTag) els.editTagSourceTag.textContent = '';
      if (els.editTagBit) els.editTagBit.value = '0';
      fillTagDatatypeSelect(els.editTagDatatype, 'bool');
      if (els.editTagScan) els.editTagScan.value = '';
      if (els.editTagEnabled) els.editTagEnabled.checked = true;
      if (els.editTagWritable) els.editTagWritable.checked = false;
      if (els.editTagInvert) els.editTagInvert.checked = false;
      if (els.editTagMqttAllowed) els.editTagMqttAllowed.checked = false;
      if (els.editTagLogEvent) els.editTagLogEvent.checked = false;
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
      const hasSource = (String(row?.source_tag || '').trim() !== '');
      const bitNum = (row?.bit == null) ? -1 : Number(row.bit);
      if (els.editTagSourceKind) {
        els.editTagSourceKind.value = hasSource
          ? ((Number.isFinite(bitNum) && bitNum >= 0) ? 'derived_bit' : 'derived_alias')
          : 'plc';
      }
      if (els.editTagPlc) els.editTagPlc.value = String(row?.plc_tag_name || '');
      if (els.editTagSourceTag) els.editTagSourceTag.value = String(row?.source_tag || '');
      if (els.editTagBit) els.editTagBit.value = (row?.bit == null) ? '0' : String(row.bit);
      fillTagDatatypeSelect(els.editTagDatatype, String(row?.datatype || 'bool'));
      if (els.editTagScan) els.editTagScan.value = (row?.scan_ms == null) ? '' : String(row.scan_ms);
      if (els.editTagElemCount) els.editTagElemCount.value = (row?.elem_count == null) ? '1' : String(row.elem_count);
      if (els.editTagEnabled) els.editTagEnabled.checked = (row?.enabled !== false);
      if (els.editTagWritable) els.editTagWritable.checked = (row?.writable === true);
      if (els.editTagInvert) els.editTagInvert.checked = (row?.invert === true);
      if (els.editTagMqttAllowed) els.editTagMqttAllowed.checked = (row?.mqtt_command_allowed === true);
      if (els.editTagLogEvent) els.editTagLogEvent.checked = (row?.log_event_on_change === true);
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

    if (els.editTagSourceKind) {
      els.editTagSourceKind.onchange = () => applyTagSourceKindUi({
        kindEl: els.editTagSourceKind,
        plcEl: els.editTagPlc,
        derivedRowEl: els.editTagDerivedRow,
        sourceEl: els.editTagSourceTag,
        bitBoxEl: els.editTagBitBox,
        bitEl: els.editTagBit,
        datatypeEl: els.editTagDatatype,
        elemCountEl: els.editTagElemCount,
        writableEl: els.editTagWritable,
        mqttAllowedEl: els.editTagMqttAllowed,
        scalingEl: els.editTagScaling,
        scalingLinearRowEl: els.editTagScalingLinearRow
      }, { connId: conn, excludeTagName: name });
      applyTagSourceKindUi({
        kindEl: els.editTagSourceKind,
        plcEl: els.editTagPlc,
        derivedRowEl: els.editTagDerivedRow,
        sourceEl: els.editTagSourceTag,
        bitBoxEl: els.editTagBitBox,
        bitEl: els.editTagBit,
        datatypeEl: els.editTagDatatype,
        elemCountEl: els.editTagElemCount,
        writableEl: els.editTagWritable,
        mqttAllowedEl: els.editTagMqttAllowed,
        scalingEl: els.editTagScaling,
        scalingLinearRowEl: els.editTagScalingLinearRow
      }, { connId: conn, excludeTagName: name });
      els.editTagSourceKind.disabled = !canEditConfig();
    }

    if (els.editTagScaling) {
      els.editTagScaling.onchange = () => applyScalingModeUi(els.editTagScaling, els.editTagScalingLinearRow);
      applyScalingModeUi(els.editTagScaling, els.editTagScalingLinearRow);
      els.editTagScaling.disabled = !canEditConfig();
    }
    [els.editTagLogEvent, els.editTagRawLow, els.editTagRawHigh, els.editTagScaledLow, els.editTagScaledHigh, els.editTagScaledDatatype, els.editTagClampLow, els.editTagClampHigh]
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
      els.editAlarmId.disabled = !canEditConfig();
    }
    if (els.editAlarmName) els.editAlarmName.value = existing ? String(existing.name || '') : String(node.label || '');
    const wantGroup = existing ? String(existing.group || '') : String(node.meta?.group || '');
    const wantSite = existing ? String(existing.site || '') : String(node.meta?.site || '');
    fillAlarmGroupSelect(wantGroup);
    fillAlarmSiteSelect(wantGroup, wantSite);

    const want = existing ? String(existing.connection_id || '') : String(node.meta?.source?.connection_id || '');
    const wantTag = existing ? String(existing.tag_name || '') : String(node.meta?.source?.tag || '');
    if (els.editAlarmTagFilter) els.editAlarmTagFilter.value = '';
    fillAlarmConnectionSelect(want);
    refreshAlarmTagSelect(wantTag);

    if (els.editAlarmType) els.editAlarmType.value = existing ? String(existing.type || 'high') : 'high';
    if (els.editAlarmEnabled) els.editAlarmEnabled.checked = existing ? (existing.enabled !== false) : true;
    if (els.editAlarmSeverity) els.editAlarmSeverity.value = existing && existing.severity != null ? String(existing.severity) : '500';
    syncSeverityPresetFromValue();
    if (els.editAlarmThreshold) els.editAlarmThreshold.value = existing && existing.threshold != null ? String(existing.threshold) : '';
    if (els.editAlarmHysteresis) els.editAlarmHysteresis.value = existing && existing.hysteresis != null ? String(existing.hysteresis) : '';
    if (els.editAlarmValue) els.editAlarmValue.value = alarmCompareValueToText(existing);
    if (els.editAlarmMsgOn) els.editAlarmMsgOn.value = existing ? String(existing.message_on_active || '') : '';
    if (els.editAlarmMsgOff) els.editAlarmMsgOff.value = existing ? String(existing.message_on_return || '') : '';
    if (els.editAlarmAudioMode) els.editAlarmAudioMode.value = String(existing?.audio_mode || '').trim() || 'inherit';
    if (els.editAlarmAudioGap) {
      const gap = Number(existing?.audio_gap_ms);
      els.editAlarmAudioGap.value = Number.isFinite(gap) && gap >= 0 ? String(Math.trunc(gap)) : '';
      els.editAlarmAudioGap.disabled = !canEditConfig();
    }
    renderAlarmModalAudioSequence(cfg, Array.isArray(existing?.audio_files) ? existing.audio_files : (existing?.audio_file ? [existing.audio_file] : []));
    refreshAlarmAudioUi(existing || {});
    if (els.editAlarmType) {
      els.editAlarmType.onchange = applyAlarmTypeUi;
      applyAlarmTypeUi();
    }
    wireAlarmPreviewInputs();

    (els.editAlarmName || els.editAlarmGroup || els.editAlarmSite || els.editAlarmConn)?.focus?.();
    return;
  }

  if (type === 'audio_files_root') {
    if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'block';
    addRow('Type', 'Audio Files');
    addRow('Root', 'audio');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const folderBtn = document.createElement('button');
    folderBtn.className = 'btn';
    folderBtn.type = 'button';
    folderBtn.textContent = 'New Folder';
    folderBtn.disabled = !canEditConfig();
    folderBtn.onclick = () => createAlarmAudioFolderInteractive().catch((err) => window.alert(`Audio folder create failed: ${err.message}`));
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn primary';
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload Audio File';
    uploadBtn.disabled = !canEditConfig();
    uploadBtn.onclick = () => chooseAndUploadAlarmAudioFile();
    const scopeBtn = document.createElement('button');
    scopeBtn.className = 'btn';
    scopeBtn.type = 'button';
    scopeBtn.textContent = 'Global Audio Settings';
    scopeBtn.onclick = () => openAudioScopeModal({ scope: 'global' });
    actions.classList.add('workspace-audio-actions');
    actions.appendChild(folderBtn);
    actions.appendChild(uploadBtn);
    actions.appendChild(scopeBtn);
    if (els.workspaceItemGeneric) els.workspaceItemGeneric.appendChild(actions);
    return;
  }

  if (type === 'audio_folder') {
    const folder = String(node.meta?.folder || '').trim();
    if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'block';
    addRow('Type', 'Audio Folder');
    addRow('Folder', folder ? `audio/${folder}` : 'audio');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const folderBtn = document.createElement('button');
    folderBtn.className = 'btn';
    folderBtn.type = 'button';
    folderBtn.textContent = 'New Subfolder';
    folderBtn.disabled = !canEditConfig();
    folderBtn.onclick = () => createAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder create failed: ${err.message}`));
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn primary';
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload Here';
    uploadBtn.disabled = !canEditConfig();
    uploadBtn.onclick = () => chooseAndUploadAlarmAudioFile(folder);
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn bad';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete Folder';
    deleteBtn.disabled = !canEditConfig();
    deleteBtn.onclick = () => deleteAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder delete failed: ${err.message}`));
    actions.classList.add('workspace-audio-actions');
    actions.appendChild(folderBtn);
    actions.appendChild(uploadBtn);
    actions.appendChild(deleteBtn);
    if (els.workspaceItemGeneric) els.workspaceItemGeneric.appendChild(actions);
    return;
  }

  if (type === 'alarm_group') {
    openAudioScopeModal({ scope: 'group', group: String(node.meta?.group || node.label || '') });
    return;
  }

  if (type === 'alarm_site') {
    openAudioScopeModal({ scope: 'site', group: String(node.meta?.group || ''), site: String(node.meta?.site || node.label || '') });
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
  if (els.workspaceItemEventEdit) els.workspaceItemEventEdit.style.display = 'none';
  if (els.workspaceItemAudioScopeEdit) els.workspaceItemAudioScopeEdit.style.display = 'none';
  if (els.workspaceItemGeneric) els.workspaceItemGeneric.style.display = 'none';
  if (els.workspaceItemAlarmEdit) els.workspaceItemAlarmEdit.style.display = 'block';

  const titleEl = document.getElementById('workspaceItemModalTitle');
  if (titleEl) titleEl.textContent = 'New Alarm';

  if (els.editAlarmId) { els.editAlarmId.value = ''; els.editAlarmId.disabled = false; }
  if (els.editAlarmName) els.editAlarmName.value = '';
  const wantGroup = String(group || '');
  const wantSite = String(site || '');
  if (!state.alarmsConfig) {
    loadOpcbridgeAlarmsConfig().then(() => {
      fillAlarmGroupSelect(wantGroup);
      fillAlarmSiteSelect(wantGroup, wantGroup ? wantSite : '');
    }).catch(() => {});
  }
  fillAlarmGroupSelect(wantGroup);
  fillAlarmSiteSelect(wantGroup, wantGroup ? wantSite : '');

  if (els.editAlarmTagFilter) els.editAlarmTagFilter.value = '';
  fillAlarmConnectionSelect();
  refreshAlarmTagSelect();

  if (els.editAlarmType) els.editAlarmType.value = 'high';
  if (els.editAlarmEnabled) els.editAlarmEnabled.checked = true;
  if (els.editAlarmSeverity) els.editAlarmSeverity.value = '';
  syncSeverityPresetFromValue();
  if (els.editAlarmThreshold) els.editAlarmThreshold.value = '';
  if (els.editAlarmHysteresis) els.editAlarmHysteresis.value = '';
  if (els.editAlarmValue) els.editAlarmValue.value = '';
  if (els.editAlarmMsgOn) els.editAlarmMsgOn.value = '';
  if (els.editAlarmMsgOff) els.editAlarmMsgOff.value = '';
  if (els.editAlarmAudioMode) els.editAlarmAudioMode.value = 'inherit';
  if (els.editAlarmAudioGap) {
    els.editAlarmAudioGap.value = '';
    els.editAlarmAudioGap.disabled = !canEditConfig();
  }
  renderAlarmModalAudioSequence(state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } }, []);
  refreshAlarmAudioUi({});
  if (els.editAlarmType) {
    els.editAlarmType.onchange = applyAlarmTypeUi;
    applyAlarmTypeUi();
  }
  wireAlarmPreviewInputs();
  syncNewAlarmDefaults();

  els.workspaceItemModal.style.display = 'flex';
  els.editAlarmId?.focus?.();
}

async function saveEditedTagFromModal() {
  const conn = String(state.pendingWorkspaceItem?.connection_id || '').trim();
  const name = String(state.pendingWorkspaceItem?.name || '').trim();
  if (!conn || !name) return;

  const idx = state.tagConfigAll.findIndex((t) => String(t?.connection_id || '') === conn && String(t?.name || '') === name);
  if (idx < 0) { setEditTagStatus('Tag not found in config (try Refresh).'); return; }
  const row = state.tagConfigAll[idx] || {};

  const newName = String(els.editTagName?.value || '').trim();
  if (!newName) { setEditTagStatus('Tag name is required.'); return; }
  if (!canEditConfig() && newName !== name) { setEditTagStatus('Login required to rename tags.'); return; }

  const sourceKind = String(els.editTagSourceKind?.value || 'plc').trim().toLowerCase();
  const isDerivedBit = (sourceKind === 'derived_bit');
  const isDerivedAlias = (sourceKind === 'derived_alias');
  const isDerived = (isDerivedBit || isDerivedAlias);

  const plc_tag_name = String(els.editTagPlc?.value || '').trim();
  const source_tag = String(els.editTagSourceTag?.value || '').trim();
  const elemCount = Math.max(1, Math.trunc(Number(String(els.editTagElemCount?.value || '').trim() || '1') || 1));
  const bitRaw = String(els.editTagBit?.value || '').trim();
  const bit = bitRaw === '' ? null : Math.trunc(Number(bitRaw));

  const datatype = isDerivedBit ? 'bool' : String(els.editTagDatatype?.value || '').trim();
  const scanRaw = String(els.editTagScan?.value || '').trim();
  const enabled = Boolean(els.editTagEnabled?.checked);
  const writable = Boolean(els.editTagWritable?.checked);
  const invert = Boolean(els.editTagInvert?.checked);
  const mqtt_command_allowed = Boolean(els.editTagMqttAllowed?.checked);
  const log_event_on_change = Boolean(els.editTagLogEvent?.checked);

  if (!datatype) { setEditTagStatus('Datatype is required.'); return; }

  if (!isDerived && !plc_tag_name) { setEditTagStatus('PLC Tag is required.'); return; }
  if (isDerivedBit) {
    if (!source_tag) { setEditTagStatus('Source Tag is required for a Derived Bit.'); return; }
    if (bit == null || !Number.isFinite(bit) || bit < 0 || bit > 63) { setEditTagStatus('Bit must be between 0 and 63.'); return; }
  }
  if (isDerivedAlias) {
    if (!source_tag) { setEditTagStatus('Source Tag is required for a Derived Alias.'); return; }
  }

  const scalingRes = isDerivedBit
    ? { ok: true, scaling: 'none', fields: {} }
    : readLinearScalingFromUi({
      scalingEl: els.editTagScaling,
      rawLowEl: els.editTagRawLow,
      rawHighEl: els.editTagRawHigh,
      scaledLowEl: els.editTagScaledLow,
      scaledHighEl: els.editTagScaledHigh,
      scaledDatatypeEl: els.editTagScaledDatatype,
      clampLowEl: els.editTagClampLow,
      clampHighEl: els.editTagClampHigh,
    }, datatype);
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
  if (!isDerived) {
    next.plc_tag_name = plc_tag_name;
    if (elemCount === 1) delete next.elem_count;
    else next.elem_count = elemCount;
    delete next.source_tag;
    delete next.bit;
  } else if (isDerivedBit) {
    delete next.plc_tag_name;
    delete next.elem_count;
    next.source_tag = source_tag;
    next.bit = bit;
  } else {
    delete next.plc_tag_name;
    delete next.elem_count;
    next.source_tag = source_tag;
    delete next.bit;
  }
  next.datatype = datatype;
  next.enabled = enabled;
  next.writable = isDerivedAlias ? false : writable;
  next.mqtt_command_allowed = isDerivedAlias ? false : mqtt_command_allowed;
  next.log_event_on_change = log_event_on_change;
  if (invert) next.invert = true;
  else delete next.invert;
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
  const severityRaw = String(els.editAlarmSeverity?.value ?? '').trim();
  const severity = Math.trunc(Number(severityRaw || '500'));
  const thresholdRaw = String(els.editAlarmThreshold?.value ?? '').trim();
  const hysteresisRaw = String(els.editAlarmHysteresis?.value ?? '').trim();
  const compareValueRaw = String(els.editAlarmValue?.value ?? '').trim();
  const message_on_active = String(els.editAlarmMsgOn?.value || '').trim();
  const message_on_return = String(els.editAlarmMsgOff?.value || '').trim();
  const audio_files = state.alarmModalAudioSequenceInput?.getValues?.() || [];
  const audio_file = audio_files.length ? String(audio_files[0] || '').trim() : '';
  const audio_mode_raw = String(els.editAlarmAudioMode?.value || 'inherit').trim();
  const audio_mode = ['inherit', 'audio_only', 'speech_only', 'audio_then_speech', 'speech_then_audio'].includes(audio_mode_raw) ? audio_mode_raw : 'inherit';
  const audio_gap_raw = String(els.editAlarmAudioGap?.value ?? '').trim();
  const speech_text = String(els.editAlarmSpeechText?.value || '').trim();
  const cfg = state.alarmsConfig || { alarms: [], groups: [], audio: { files: [] } };
  if (!Array.isArray(cfg.alarms)) cfg.alarms = [];

  if (!id) { setEditAlarmStatus('Alarm ID is required.'); return; }
  if (!/^[A-Za-z0-9_.:-]+$/.test(id)) { setEditAlarmStatus('Alarm ID may only contain letters, numbers, underscore, dash, period, or colon.'); return; }
  if (!connection_id) { setEditAlarmStatus('Connection is required.'); return; }
  if (!tag_name) { setEditAlarmStatus('Tag is required.'); return; }
  if (!['high', 'low', 'equals', 'not_equals'].includes(type)) { setEditAlarmStatus('Type is invalid.'); return; }
  if (!Number.isFinite(severity) || severity < 0 || severity > 1000) { setEditAlarmStatus('Severity must be a number from 0 to 1000.'); return; }
  const selectedTagExists = getEffectiveTagsAll().some((t) => String(t?.connection_id || '') === connection_id && String(t?.name || '') === tag_name);
  if (!selectedTagExists) { setEditAlarmStatus(`Tag '${connection_id}:${tag_name}' was not found in the tag config.`); return; }
  if (audio_files.some((id) => !getAlarmAudioFiles(cfg).some((f) => f.id === id))) {
    setEditAlarmStatus('One or more audio files are not in the audio files list.');
    return;
  }
  if (audio_gap_raw !== '') {
    const gap = Math.trunc(Number(audio_gap_raw));
    if (!Number.isFinite(gap) || gap < 0 || gap > 5000) {
      setEditAlarmStatus('Audio Gap must be between 0 and 5000 ms.');
      return;
    }
  }
  if ((type === 'high' || type === 'low') && thresholdRaw === '') {
    setEditAlarmStatus('Threshold is required for high/low alarms.');
    return;
  }
  const compareValue = (type === 'equals' || type === 'not_equals') ? parseAlarmCompareValue(compareValueRaw) : null;
  if (compareValue && !compareValue.ok) {
    setEditAlarmStatus(compareValue.error);
    return;
  }

  const idx = cfg.alarms.findIndex((a) => String(a?.id || '').trim() === id);
  if (mode === 'new' && idx >= 0) { setEditAlarmStatus('Alarm ID already exists.'); return; }
  if (mode === 'edit' && !alarm_id) { setEditAlarmStatus('Missing alarm id.'); return; }
  if (mode === 'edit' && id !== alarm_id && idx >= 0) { setEditAlarmStatus('Alarm ID already exists.'); return; }

  const next = {
    id,
    name: name || id,
    group: group,
    site: group ? site : '',
    connection_id,
    tag_name,
    type,
    enabled,
    severity,
    message_on_active,
    message_on_return
  };
  if (audio_file) next.audio_file = audio_file;
  if (audio_files.length) next.audio_files = audio_files.slice();
  if (audio_mode === 'inherit') delete next.audio_mode;
  else next.audio_mode = audio_mode;
  if (audio_gap_raw !== '') next.audio_gap_ms = Math.trunc(Number(audio_gap_raw) || 0);
  if (speech_text) next.speech_text = speech_text;
  if (type === 'high' || type === 'low') {
    next.threshold = Number(thresholdRaw);
    if (!Number.isFinite(next.threshold)) { setEditAlarmStatus('Threshold must be numeric.'); return; }
    if (hysteresisRaw !== '') {
      next.hysteresis = Number(hysteresisRaw);
      if (!Number.isFinite(next.hysteresis)) { setEditAlarmStatus('Hysteresis must be numeric.'); return; }
      if (next.hysteresis < 0) { setEditAlarmStatus('Hysteresis cannot be negative.'); return; }
    }
    delete next.value;
    delete next.equals_value;
  } else if (type === 'equals' || type === 'not_equals') {
    next.value = compareValue.value;
    delete next.threshold;
    delete next.hysteresis;
    delete next.equals_value;
  } else {
    delete next.value;
    delete next.equals_value;
    delete next.threshold;
    delete next.hysteresis;
  }

  // Ensure folder nodes exist if user filled group/site.
  if (group || site) {
    try { ensureGroupSiteInConfig(cfg, group, site); } catch { /* ignore */ }
  }

  if (mode === 'new') {
    cfg.alarms.push(next);
  } else {
    // Update by alarm_id (original id), allowing ID rename.
    const origId = alarm_id;
    const origIdx = cfg.alarms.findIndex((a) => String(a?.id || '').trim() === origId);
    if (origIdx < 0) { setEditAlarmStatus('Alarm not found in config (try Refresh).'); return; }
    const merged = { ...(cfg.alarms[origIdx] || {}), ...next };
    delete merged.audible_enabled;
    if (!audio_file) delete merged.audio_file;
    if (!audio_files.length) delete merged.audio_files;
    if (!speech_text) delete merged.speech_text;
    if (audio_gap_raw === '') delete merged.audio_gap_ms;
    if (type === 'high' || type === 'low') {
      delete merged.value;
      delete merged.equals_value;
    } else {
      delete merged.threshold;
      delete merged.hysteresis;
      delete merged.value_json;
      if (type !== 'equals' && type !== 'not_equals') {
        delete merged.value;
        delete merged.equals_value;
      }
    }
    cfg.alarms[origIdx] = merged;
  }

  setEditAlarmStatus('Saving…');
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  closeWorkspaceItemModal();
  renderWorkspaceTree();
  if (mode === 'new') {
    selectAlarmEventsAlarm(id, group, site);
  } else {
    selectAlarmEventsAlarm(id, group, site);
  }
  renderAlarmsEventsTree();
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
  const obj = applyPollingConfigToConnection(
    { id: newId, description, driver, gateway, path: pathVal, slot, plc_type },
    {
      mode: els.editDevPollingMode?.value,
      pacing: els.editDevPollingPacing?.value,
      batchSize: readOptionalPositiveInt(els.editDevPollBatchSize),
      timeBudgetMs: readOptionalPositiveInt(els.editDevPollTimeBudgetMs)
    }
  );

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
  els.editAlarmAudioUploadBtn?.addEventListener('click', () => uploadAlarmAudioFileFromUi().catch((err) => setEditAlarmStatus(`Audio upload failed: ${err.message}`)));
  els.editAlarmAudioDeleteBtn?.addEventListener('click', () => deleteSelectedAlarmAudioFileFromUi().catch((err) => setEditAlarmStatus(`Audio delete failed: ${err.message}`)));

  els.editAudioScopeCancelBtn?.addEventListener('click', close);
  els.editAudioScopeSaveBtn?.addEventListener('click', () => saveAudioScopeFromModal().catch((err) => setEditAudioScopeStatus(`Save failed: ${err.message}`)));
  els.editAudioScopeAudibleMode?.addEventListener('change', refreshAudioScopeUi);
  els.editAudioScopeAudioFile?.addEventListener('change', refreshAudioScopeUi);
  els.editAudioScopeSpeechText?.addEventListener('input', refreshAudioScopeUi);

  els.newEventCancelBtn?.addEventListener('click', close);
  els.newEventSaveBtn?.addEventListener('click', saveNewEventFromModal);
  els.newEventConn?.addEventListener('change', refreshNewEventTagPicker);
  els.newEventSearch?.addEventListener('input', refreshNewEventTagPicker);
  els.newEventTag?.addEventListener('dblclick', saveNewEventFromModal);

  if (els.newEventTag && els.newEventTag.dataset.forceSelectWired !== '1') {
    els.newEventTag.dataset.forceSelectWired = '1';
    els.newEventTag.addEventListener('mousedown', (e) => {
      const opt = e.target && e.target.tagName === 'OPTION' ? e.target : null;
      if (!opt) return;
      const v = String(opt.value || '').trim();
      if (!v) return;
      els.newEventTag.value = v;
      opt.selected = true;
      e.preventDefault();
    }, true);
  }

  // Keep modal open unless explicitly closed via buttons.
  if (els.workspaceItemModal && els.workspaceItemModal.dataset.noOverlayClose !== '1') {
    els.workspaceItemModal.dataset.noOverlayClose = '1';
    const swallow = (e) => {
      if (e.target === els.workspaceItemModal) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    els.workspaceItemModal.addEventListener('mousedown', swallow, true);
    els.workspaceItemModal.addEventListener('mouseup', swallow, true);
    els.workspaceItemModal.addEventListener('click', swallow, true);
  }

  // Intentionally do not close modals on overlay click or Escape. Close via explicit UI buttons.
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

  [els.newEventSearch, els.newEventTag]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && els.workspaceItemModal?.style.display === 'flex' && els.workspaceItemEventEdit?.style.display === 'block') {
        e.preventDefault();
        saveNewEventFromModal();
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
  const obj = applyPollingConfigToConnection(
    { id: connection_id, description: '', driver, gateway, path: pathVal, slot, plc_type },
    {
      mode: els.newDevPollingMode?.value,
      pacing: els.newDevPollingPacing?.value,
      batchSize: readOptionalPositiveInt(els.newDevPollBatchSize),
      timeBudgetMs: readOptionalPositiveInt(els.newDevPollTimeBudgetMs)
    }
  );
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
  els.newDevCreateBtn?.addEventListener('click', createNewDeviceFromWorkspace);

  // Keep modal open unless explicitly closed via buttons.
  if (els.workspaceNewDevicePanel && els.workspaceNewDevicePanel.dataset.noOverlayClose !== '1') {
    els.workspaceNewDevicePanel.dataset.noOverlayClose = '1';
    const swallow = (e) => {
      if (e.target === els.workspaceNewDevicePanel) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    els.workspaceNewDevicePanel.addEventListener('mousedown', swallow, true);
    els.workspaceNewDevicePanel.addEventListener('mouseup', swallow, true);
    els.workspaceNewDevicePanel.addEventListener('click', swallow, true);
  }

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
      const baseTags = Array.isArray(state.tagConfigLoadedAll) ? state.tagConfigLoadedAll : state.tagConfigAll;
      const remaining = state.tagConfigAll.filter((t) => String(t?.connection_id || '') !== cid);
      const tagsOut = remaining.map(sanitizeTagForPost);
      const emptied = computeEmptiedTagConnectionIds(baseTags, remaining);
      if (tagsOut.length > 0) {
        await apiPostJson('/api/opcbridge/config/tags', { tags: tagsOut });
      }
      if (emptied.length > 0) {
        await writeEmptyCanonicalTagFilesForConnections(emptied);
      }
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

async function deleteAlarmGroupInteractive(groupName) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const group = normalizeAlarmGroupName(groupName);
  if (!group) return false;

  const cfg = await loadOpcbridgeAlarmsConfig();
  ensureAlarmGroupsTree(cfg || {});
  const groupIdx = (Array.isArray(cfg.groups) ? cfg.groups : []).findIndex((g) => String(g?.name || '').trim().toLowerCase() === group.toLowerCase());
  const assigned = alarmsForGroup(cfg, group);
  if (groupIdx < 0 && !assigned.length) throw new Error(`Group '${group}' not found.`);

  const msg = assigned.length
    ? `Delete group '${group}' and delete ${assigned.length} alarm${assigned.length === 1 ? '' : 's'} in that group (and its sites)?`
    : `Delete group '${group}'?`;
  if (!window.confirm(msg)) return false;

  if (groupIdx >= 0) cfg.groups.splice(groupIdx, 1);
  if (assigned.length) {
    const want = group.toLowerCase();
    cfg.alarms = (Array.isArray(cfg.alarms) ? cfg.alarms : []).filter((a) => String(a?.group || '').trim().toLowerCase() !== want);
  }

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = 'folder:alarms';
  state.alarmsEventsSelectedChildId = '';
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  if (els.alarmsEventsPropsStatus) {
    els.alarmsEventsPropsStatus.textContent = assigned.length
      ? `Deleted group '${group}' and deleted ${assigned.length} alarm${assigned.length === 1 ? '' : 's'}.`
      : `Deleted group '${group}'.`;
  }
  return true;
}

async function deleteAlarmSiteInteractive(groupName, siteName) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const group = normalizeAlarmGroupName(groupName);
  const site = normalizeAlarmSiteName(siteName);
  if (!group || !site) return false;

  const cfg = await loadOpcbridgeAlarmsConfig();
  ensureAlarmGroupsTree(cfg || {});
  const g = findAlarmGroupConfig(cfg, group);
  if (!g) throw new Error(`Group '${group}' not found.`);
  const sites = Array.isArray(g.sites) ? g.sites : [];
  const siteIdx = sites.findIndex((s) => String(s?.name || '').trim().toLowerCase() === site.toLowerCase());
  if (siteIdx < 0) throw new Error(`Site '${site}' not found under group '${group}'.`);

  const assigned = alarmsForSite(cfg, group, site);
  const msg = assigned.length
    ? `Delete site '${site}' and delete ${assigned.length} alarm${assigned.length === 1 ? '' : 's'} in that site?`
    : `Delete site '${site}'?`;
  if (!window.confirm(msg)) return false;

  g.sites.splice(siteIdx, 1);
  if (assigned.length) {
    const gWant = group.toLowerCase();
    const sWant = site.toLowerCase();
    cfg.alarms = (Array.isArray(cfg.alarms) ? cfg.alarms : []).filter((a) => !(
      String(a?.group || '').trim().toLowerCase() === gWant &&
      String(a?.site || '').trim().toLowerCase() === sWant
    ));
  }

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = `alarm_group:${alarmTreeSafeKey(group)}`;
  state.alarmsEventsSelectedChildId = '';
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  if (els.alarmsEventsPropsStatus) {
    els.alarmsEventsPropsStatus.textContent = assigned.length
      ? `Deleted site '${site}' and deleted ${assigned.length} alarm${assigned.length === 1 ? '' : 's'}.`
      : `Deleted site '${site}'.`;
  }
  return true;
}

async function deleteAlarmGroupsBulk(groupNames) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const names = Array.from(new Set((Array.isArray(groupNames) ? groupNames : [])
    .map((x) => normalizeAlarmGroupName(x))
    .filter(Boolean)));
  if (!names.length) return false;

  const cfg = await loadOpcbridgeAlarmsConfig();
  ensureAlarmGroupsTree(cfg || {});

  const wantSet = new Set(names.map((n) => n.toLowerCase()));
  const beforeGroups = Array.isArray(cfg.groups) ? cfg.groups.length : 0;
  cfg.groups = (Array.isArray(cfg.groups) ? cfg.groups : []).filter((g) => !wantSet.has(String(g?.name || '').trim().toLowerCase()));
  const removedGroups = beforeGroups - cfg.groups.length;

  const assigned = (Array.isArray(cfg.alarms) ? cfg.alarms : []).filter((a) => wantSet.has(String(a?.group || '').trim().toLowerCase()));
  if (assigned.length) {
    cfg.alarms = (Array.isArray(cfg.alarms) ? cfg.alarms : []).filter((a) => !wantSet.has(String(a?.group || '').trim().toLowerCase()));
  }

  if (removedGroups === 0 && assigned.length === 0) throw new Error('No matching alarm groups found to delete.');

  const msg = `Delete ${removedGroups || names.length} alarm group${(removedGroups || names.length) === 1 ? '' : 's'} and delete ${assigned.length} alarm${assigned.length === 1 ? '' : 's'} in those groups/sites?`;
  if (!window.confirm(msg)) return false;

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = 'folder:alarms';
  state.alarmsEventsSelectedChildId = '';
  state.alarmsEventsSelectedChildIds = [];
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  return true;
}

async function deleteAlarmSitesBulk(groupName, siteNames) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const group = normalizeAlarmGroupName(groupName);
  if (!group) return false;
  const sites = Array.from(new Set((Array.isArray(siteNames) ? siteNames : [])
    .map((x) => normalizeAlarmSiteName(x))
    .filter(Boolean)));
  if (!sites.length) return false;

  const cfg = await loadOpcbridgeAlarmsConfig();
  ensureAlarmGroupsTree(cfg || {});
  const g = findAlarmGroupConfig(cfg, group);
  if (!g) throw new Error(`Group '${group}' not found.`);

  const wantSet = new Set(sites.map((s) => s.toLowerCase()));
  const beforeSites = Array.isArray(g.sites) ? g.sites.length : 0;
  g.sites = (Array.isArray(g.sites) ? g.sites : []).filter((s) => !wantSet.has(String(s?.name || '').trim().toLowerCase()));
  const removedSites = beforeSites - g.sites.length;

  const assigned = (Array.isArray(cfg.alarms) ? cfg.alarms : []).filter((a) =>
    String(a?.group || '').trim().toLowerCase() === group.toLowerCase() &&
    wantSet.has(String(a?.site || '').trim().toLowerCase())
  );
  if (assigned.length) {
    const gWant = group.toLowerCase();
    cfg.alarms = (Array.isArray(cfg.alarms) ? cfg.alarms : []).filter((a) => !(
      String(a?.group || '').trim().toLowerCase() === gWant &&
      wantSet.has(String(a?.site || '').trim().toLowerCase())
    ));
  }

  if (removedSites === 0 && assigned.length === 0) throw new Error('No matching sites found to delete.');

  const msg = `Delete ${removedSites || sites.length} site${(removedSites || sites.length) === 1 ? '' : 's'} under group '${group}' and delete ${assigned.length} alarm${assigned.length === 1 ? '' : 's'} in those sites?`;
  if (!window.confirm(msg)) return false;

  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = `alarm_group:${alarmTreeSafeKey(group)}`;
  state.alarmsEventsSelectedChildId = '';
  state.alarmsEventsSelectedChildIds = [];
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  return true;
}

async function deleteAlarmById(alarmId) {
  const id = String(alarmId || '').trim();
  if (!id) return;
  if (!window.confirm(`Delete alarm '${id}'?`)) return;
  const setDeleteStatus = (msg) => {
    if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = String(msg || '');
  };
  const delBtn = els.alarmsEventsPropsDeleteBtn;
  const oldText = delBtn?.textContent || 'Delete…';
  try {
    if (delBtn) {
      delBtn.disabled = true;
      delBtn.textContent = 'Deleting…';
    }
    setDeleteStatus(`Deleting alarm '${id}'…`);
    const cfg = await loadOpcbridgeAlarmsConfig();
    const oldAlarm = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).find((a) => String(a?.id || '').trim() === id) || {};
    const oldGroup = String(oldAlarm?.group || '').trim();
    const oldSite = String(oldAlarm?.site || '').trim();
    const before = Array.isArray(cfg?.alarms) ? cfg.alarms.length : 0;
    cfg.alarms = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).filter((a) => String(a?.id || '').trim() !== id);
    const after = cfg.alarms.length;
    if (after === before) {
      setDeleteStatus(`Alarm '${id}' was not found in alarms.json. Refreshing view…`);
      await loadOpcbridgeAlarmsConfig().catch(() => {});
      renderAlarmsEventsTree();
      return;
    }
    cfg.__allow_alarm_drop = true;
    await saveOpcbridgeAlarmsConfig(cfg);
    state.alarmsConfig = cfg;
    selectAlarmEventsAlarm('', oldGroup, oldSite);
    renderAlarmsEventsTree();
    renderWorkspaceTree();
    setDeleteStatus(`Deleted alarm '${id}'. Reloading alarm runtime…`);
    await opcbridgeReload().catch((err) => {
      setDeleteStatus(`Deleted alarm '${id}', but reload failed: ${err.message}`);
    });
    await refreshAll().catch(() => {});
    setDeleteStatus(`Deleted alarm '${id}'.`);
  } catch (err) {
    setDeleteStatus(`Delete failed: ${err.message}`);
    window.alert(`Failed to delete alarm: ${err.message}`);
  } finally {
    if (delBtn) {
      delBtn.disabled = false;
      delBtn.textContent = oldText;
    }
  }
}

// ---------------- Alarms & Events tab (tree) ----------------

function buildAlarmsEventsTree() {
  const root = { id: 'folder:alarms_events', type: 'folder', label: 'Alarms & Events', children: [] };

  const alarmsRoot = { id: 'folder:alarms', type: 'alarms_root', label: 'Alarms', children: [] };
  const alarmGroupsRoot = { id: 'folder:alarm_groups', type: 'alarm_groups_root', label: 'Alarm Groups', children: [] };
  const eventLoggingRoot = { id: 'folder:events', type: 'event_logging_root', label: 'Events', children: [] };
  const routingGroupsRoot = { id: 'folder:routing_groups', type: 'routing_groups_root', label: 'Alarm Routes', children: [] };
  const schedulesRoot = { id: 'folder:schedules', type: 'schedules_root', label: 'Schedules', children: [] };
  const audioFilesRoot = { id: 'folder:audio_files', type: 'audio_files_root', label: 'Audio Files', children: [] };
  const contactsRoot = { id: 'folder:notification_contacts', type: 'notification_contacts_root', label: 'Notification Contacts', children: [] };
  const contactGroupsRoot = { id: 'folder:notification_contact_groups', type: 'notification_contact_groups_root', label: 'Contact Groups', children: [] };
  const policiesRoot = { id: 'folder:notification_policies', type: 'notification_policies_root', label: 'Notification Policies', children: [] };

  // Keep top-level tree simple: Alarms + Events.
  root.children.push(alarmsRoot, eventLoggingRoot);

  const cfg = state.alarmsConfig || null;
  const cfgAlarms = Array.isArray(cfg?.alarms) ? cfg.alarms : [];
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

  // Place alarms into folders.
  cfgAlarms.forEach((a) => {
    const alarm_id = String(a?.id || '').trim();
    if (!alarm_id) return;

    const groupRaw = String(a?.group || '').trim();
    const siteRaw = String(a?.site || '').trim();
    const groupLabel = groupRaw || 'Unassigned';
    const siteLabel = siteRaw || 'Unassigned';

    const groupId = `alarm_group:${safeKey(groupLabel)}`;
    let groupNode = groups.get(groupId);
    if (!groupNode) {
      groupNode = { id: groupId, type: 'alarm_group', label: groupLabel, meta: { group: groupRaw }, children: [] };
      groups.set(groupId, groupNode);
    }

    const siteId = `${groupId}:site:${safeKey(siteLabel)}`;
    let siteNode = (groupNode.children || []).find((n) => String(n?.id || '') === siteId) || null;
    if (!siteNode) {
      siteNode = { id: siteId, type: 'alarm_site', label: siteLabel, meta: { group: groupRaw, site: siteRaw, alarms_enabled: isAlarmSiteProcessingEnabled(cfg, groupRaw, siteRaw) }, children: [] };
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
        site_enabled: runtimeRow?.site_enabled !== false && isAlarmSiteProcessingEnabled(cfg, groupRaw, siteRaw),
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
    alarmGroupsRoot.children.push(g);
  });

  if (!alarmGroupsRoot.children.length) {
    alarmGroupsRoot.children.push({ id: 'hint:no_alarms', type: 'hint', label: '(no alarms configured)', children: [] });
  }
  // Alarm-related configuration sections live under the Alarms root.
  alarmsRoot.children.push(alarmGroupsRoot, routingGroupsRoot, schedulesRoot, audioFilesRoot, contactsRoot, contactGroupsRoot, policiesRoot);

  const eventTags = getEffectiveTagsAll()
    .filter((t) => t?.log_event_on_change === true)
    .slice()
    .sort((a, b) => {
      return `${String(a?.connection_id || '')}:${String(a?.name || '')}`.localeCompare(`${String(b?.connection_id || '')}:${String(b?.name || '')}`, undefined, { numeric: true, sensitivity: 'base' });
    });
  const eventConnections = new Map();
  eventTags.forEach((t) => {
    const conn = String(t?.connection_id || '').trim();
    const name = String(t?.name || '').trim();
    if (!conn || !name) return;
    let connNode = eventConnections.get(conn);
    if (!connNode) {
      connNode = {
        id: `event_connection:${conn}`,
        type: 'event_connection',
        label: conn,
        meta: { connection_id: conn },
        children: []
      };
      eventConnections.set(conn, connNode);
    }
    connNode.children.push({
      id: `event_tag:${conn}::${name}`,
      type: 'event_tag',
      label: name,
      meta: { connection_id: conn, name, enabled: t?.log_event_on_change === true },
      children: []
    });
  });
  Array.from(eventConnections.values())
    .sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }))
    .forEach((node) => {
      node.children = (node.children || []).slice().sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }));
      eventLoggingRoot.children.push(node);
    });
  if (!eventLoggingRoot.children.length) {
    eventLoggingRoot.children.push({ id: 'hint:no_events', type: 'hint', label: '(no events configured)', children: [] });
  }

  getRoutingAlarmGroups(cfg || {}).forEach((group) => {
    const id = String(group?.id || '').trim();
    if (!id) return;
    routingGroupsRoot.children.push({
      id: `routing_group:${id}`,
      type: 'routing_group',
      label: String(group?.name || id),
      meta: { ...group, id },
      children: []
    });
  });
  routingGroupsRoot.children.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }));
  if (!routingGroupsRoot.children.length) {
    routingGroupsRoot.children.push({ id: 'hint:no_routing_groups', type: 'hint', label: '(no alarm routes configured)', children: [] });
  }

  let invalidScheduleCount = 0;
  getSchedules(cfg || {}).forEach((schedule) => {
    const scheduleErr = validateScheduleDefinition(schedule, { requireId: true });
    if (scheduleErr) {
      invalidScheduleCount += 1;
      return;
    }
    const id = String(schedule?.id || '').trim();
    if (!id) return;
    schedulesRoot.children.push({
      id: `schedule:${id}`,
      type: 'schedule',
      label: String(schedule?.name || id),
      meta: { ...schedule, id },
      children: []
    });
  });
  schedulesRoot.children.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }));
  if (!schedulesRoot.children.length) {
    schedulesRoot.children.push({ id: 'hint:no_schedules', type: 'hint', label: '(no schedules configured)', children: [] });
  } else if (invalidScheduleCount > 0) {
    schedulesRoot.children.push({ id: 'hint:invalid_schedules', type: 'hint', label: `(${invalidScheduleCount} invalid schedule(s) hidden)`, children: [] });
  }

  const audioFolderNodes = new Map();
  const ensureAudioFolderNode = (folderPath) => {
    const clean = normalizeAudioFolderName(folderPath);
    if (!clean) return audioFilesRoot;
    if (audioFolderNodes.has(clean)) return audioFolderNodes.get(clean);
    const parts = clean.split('/').filter(Boolean);
    let parent = audioFilesRoot;
    let cur = '';
    parts.forEach((part) => {
      cur = cur ? `${cur}/${part}` : part;
      let node = audioFolderNodes.get(cur);
      if (!node) {
        node = { id: `audio_folder:${cur}`, type: 'audio_folder', label: part, meta: { folder: cur }, children: [] };
        audioFolderNodes.set(cur, node);
        parent.children.push(node);
      }
      parent = node;
    });
    return parent;
  };

  getConfiguredAudioFolders(cfg || {}).forEach((folder) => ensureAudioFolderNode(folder));
  getAlarmAudioFiles(cfg || {}).forEach((f) => {
    const id = String(f?.id || '').trim();
    if (!id) return;
    const parent = ensureAudioFolderNode(audioFolderFromPath(f?.path));
    parent.children.push({
      id: `audio_file:${id}`,
      type: 'audio_file',
      label: String(f?.name || id),
      meta: { ...f, id },
      children: []
    });
  });
  const sortAudioChildren = (node) => {
    node.children = (node.children || []).slice().sort((a, b) => {
      const at = String(a?.type || '');
      const bt = String(b?.type || '');
      if (at !== bt) return at === 'audio_folder' ? -1 : 1;
      return String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
    node.children.forEach((c) => { if (String(c?.type || '') === 'audio_folder') sortAudioChildren(c); });
  };
  sortAudioChildren(audioFilesRoot);
  if (!audioFilesRoot.children.length) {
    audioFilesRoot.children.push({ id: 'hint:no_audio_files', type: 'hint', label: '(no audio files configured)', children: [] });
  }

  getNotificationContacts(cfg || {}).forEach((contact) => {
    const id = String(contact?.id || '').trim();
    if (!id) return;
    contactsRoot.children.push({
      id: `notification_contact:${id}`,
      type: 'notification_contact',
      label: String(contact?.name || id),
      meta: { ...contact, id },
      children: []
    });
  });
  contactsRoot.children.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }));
  if (!contactsRoot.children.length) {
    contactsRoot.children.push({ id: 'hint:no_notification_contacts', type: 'hint', label: '(no contacts configured)', children: [] });
  }

  getNotificationContactGroups(cfg || {}).forEach((group) => {
    const id = String(group?.id || '').trim();
    if (!id) return;
    contactGroupsRoot.children.push({
      id: `notification_contact_group:${id}`,
      type: 'notification_contact_group',
      label: String(group?.name || id),
      meta: { ...group, id },
      children: []
    });
  });
  contactGroupsRoot.children.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }));
  if (!contactGroupsRoot.children.length) {
    contactGroupsRoot.children.push({ id: 'hint:no_notification_contact_groups', type: 'hint', label: '(no contact groups configured)', children: [] });
  }

  const policyTypeLabels = { phone: 'Phone', audio: 'Audio', sms: 'SMS', email: 'Email' };
  const policyTypeRoots = {};
  Object.entries(policyTypeLabels).forEach(([type, label]) => {
    const node = {
      id: `notification_policy_type:${type}`,
      type: 'notification_policy_type_root',
      label,
      meta: { policy_type: type },
      children: []
    };
    policyTypeRoots[type] = node;
    policiesRoot.children.push(node);
  });
  getNotificationPolicies(cfg || {}).forEach((policy) => {
    const id = String(policy?.id || '').trim();
    if (!id) return;
    const ptype = getPolicyOutputType(policy);
    const parent = policyTypeRoots[ptype] || policyTypeRoots.phone;
    parent.children.push({
      id: `notification_policy:${id}`,
      type: 'notification_policy',
      label: String(policy?.name || id),
      meta: { ...policy, id, output_type: ptype },
      children: []
    });
  });
  Object.values(policyTypeRoots).forEach((rootNode) => {
    rootNode.children.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { numeric: true, sensitivity: 'base' }));
    if (!rootNode.children.length) rootNode.children.push({ id: `hint:no_notification_policies:${rootNode.meta.policy_type}`, type: 'hint', label: `(no ${rootNode.label.toLowerCase()} policies)`, children: [] });
  });
  if (!getNotificationPolicies(cfg || {}).length) {
    policiesRoot.children.push({ id: 'hint:no_notification_policies', type: 'hint', label: '(no policies configured)', children: [] });
  }

  return root;
}

function findAlarmsEventsNodeById(node, id) {
  if (!node) return null;
  if (String(node.id) === String(id)) return node;
  const children = Array.isArray(node.children) ? node.children : [];
  for (const c of children) {
    const found = findAlarmsEventsNodeById(c, id);
    if (found) return found;
  }
  return null;
}

function alarmEventsSortValue(row, column, parentNode) {
  const col = String(column || '').trim();
  const type = String(row?.type || '');
  const meta = row?.meta || {};
  const cfg = state.alarmsConfig || {};

  if (col === 'Name') return String(meta?.name || row?.label || meta?.alarm_id || row?.id || '').toLowerCase();
  if (col === 'ID') return String(meta?.id || meta?.alarm_id || row?.id || '').toLowerCase();
  if (col === 'Group') return String(meta?.group || '').toLowerCase();
  if (col === 'Site') return String(meta?.site || '').toLowerCase();
  if (col === 'Source') {
    const src = meta?.source || {};
    return `${String(src?.connection_id || '').toLowerCase()}:${String(src?.tag || '').toLowerCase()}`;
  }
  if (col === 'Severity') return Number(meta?.severity ?? -1);
  if (col === 'State') {
    const siteEnabled = meta?.site_enabled !== false;
    if (meta?.enabled === false) return 0;
    if (!siteEnabled) return 1;
    if (meta?.active) return 3;
    return 2;
  }
  if (col === 'Acked') return meta?.acked ? 1 : 0;
  if (col === 'Enabled') return meta?.enabled === false ? 0 : 1;
  if (col === 'Audible') {
    if (type === 'alarm') {
      const alarmId = String(meta?.alarm_id || '').trim();
      const alarmConfig = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).find((a) => String(a?.id || '').trim() === alarmId) || {};
      return resolveAlarmAudio(cfg, alarmConfig).audible_enabled ? 1 : 0;
    }
    const group = type === 'alarm_group' ? String(meta?.group || row?.label || '') : String(meta?.group || '');
    const site = type === 'alarm_site' ? String(meta?.site || row?.label || '') : '';
    const target = type === 'alarm_group' ? findAlarmGroupConfig(cfg, group) : findAlarmSiteConfig(cfg, group, site);
    const effective = type === 'alarm_group'
      ? { ...getInheritedAudioForScope(cfg, 'group', group, ''), ...(target || {}) }
      : resolveInheritedAlarmAudio(cfg, group, site);
    return effective?.audible_enabled ? 1 : 0;
  }
  if (col === 'Policy') {
    const alarmId = String(meta?.alarm_id || '').trim();
    const alarmConfig = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).find((a) => String(a?.id || '').trim() === alarmId) || {};
    return String(alarmConfig?.notification_policy || '').toLowerCase();
  }
  if (col === 'Processing') {
    const group = type === 'alarm_site' ? String(meta?.group || '') : '';
    const site = type === 'alarm_site' ? String(meta?.site || row?.label || '') : '';
    return isAlarmSiteProcessingEnabled(cfg, group, site) ? 1 : 0;
  }
  if (col === 'Audio Sequence') return String(row?.label || '').toLowerCase();
  if (col === 'Phone') return String(meta?.phone || '').toLowerCase();
  if (col === 'Contacts') return Array.isArray(meta?.contacts) ? meta.contacts.length : 0;
  if (col === 'Targets') return getPolicyTargets(meta).length;
  if (col === 'Policies') return Array.isArray(meta?.policy_ids) ? meta.policy_ids.length : 0;
  if (col === 'Alarms') return Array.isArray(meta?.alarms) ? meta.alarms.length : 0;
  if (col === 'Schedule') return String(meta?.schedule_id || 'always').toLowerCase();
  if (col === 'Min Severity') return Number(meta?.min_severity ?? 0);
  if (col === 'Events') return Array.isArray(meta?.on) ? meta.on.join(', ').toLowerCase() : '';
  if (col === 'Playback') {
    const delay = meta?.audio_delay_seconds == null ? -1 : Number(meta.audio_delay_seconds);
    const gap = meta?.audio_gap_ms == null ? -1 : Number(meta.audio_gap_ms);
    return (Number.isFinite(delay) ? delay : -1) * 10000 + (Number.isFinite(gap) ? gap : -1);
  }
  if (col === 'Path') return String(meta?.path || '').toLowerCase();
  if (col === 'Datatype') return String(meta?.datatype || '').toLowerCase();
  if (col === 'Writable') return meta?.writable === true ? 1 : 0;
  return String(row?.label || row?.id || '').toLowerCase();
}

function compareAlarmEventsRows(a, b, column, dir, parentNode) {
  const av = alarmEventsSortValue(a, column, parentNode);
  const bv = alarmEventsSortValue(b, column, parentNode);
  let cmp = 0;
  if (typeof av === 'number' || typeof bv === 'number') {
    cmp = (Number(av) || 0) - (Number(bv) || 0);
  } else {
    cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
  }
  if (cmp === 0) {
    cmp = String(a?.label || a?.id || '').localeCompare(String(b?.label || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' });
  }
  return dir === 'desc' ? -cmp : cmp;
}

function notificationSlug(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function uniqueNotificationId(base, usedIds) {
  const root = notificationSlug(base) || 'item';
  let id = root;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${root}_${n}`;
    n += 1;
  }
  return id;
}

function uniqueCopyId(sourceId, usedIds) {
  const src = String(sourceId || '').trim();
  const root = src ? `${src}_copy` : 'copy';
  let id = root;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${root}_${n}`;
    n += 1;
  }
  return id;
}

function copyName(value) {
  const name = String(value || '').trim();
  return name ? `${name} Copy` : 'Copy';
}

function validateConfigId(id, label = 'ID') {
  const clean = String(id || '').trim();
  if (!clean) throw new Error(`${label} is required.`);
  if (!/^[A-Za-z0-9_.:-]+$/.test(clean)) throw new Error(`${label} may only contain letters, numbers, underscore, dash, period, or colon.`);
  return clean;
}

async function duplicateAlarmById(alarmId) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const id = String(alarmId || '').trim();
  if (!id) return false;
  const cfg = await loadOpcbridgeAlarmsConfig();
  const alarms = Array.isArray(cfg?.alarms) ? cfg.alarms : [];
  const source = alarms.find((a) => String(a?.id || '').trim() === id) || null;
  if (!source) throw new Error(`Alarm '${id}' not found.`);
  const used = new Set(alarms.map((a) => String(a?.id || '').trim()).filter(Boolean));
  const newId = uniqueCopyId(id, used);
  const next = JSON.parse(JSON.stringify(source));
  next.id = newId;
  next.name = copyName(next.name || source.name || id);
  alarms.push(next);
  cfg.alarms = alarms;
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  selectAlarmEventsAlarm(newId, next.group, next.site);
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  return true;
}

async function setSiteAlarmProcessing(groupName, siteName, enabled) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const group = String(groupName || '').trim();
  const site = String(siteName || '').trim();
  if (!group || !site) return false;
  if (!window.confirm(`${enabled ? 'Enable' : 'Disable'} alarm processing for site '${site}'? This does not change individual alarm Enabled checkboxes.`)) return false;

  const cfg = await loadOpcbridgeAlarmsConfig();
  ensureGroupSiteInConfig(cfg, group, site);
  const s = findAlarmSiteConfig(cfg, group, site);
  if (!s) throw new Error(`Site '${site}' not found under group '${group}'.`);
  s.alarms_enabled = Boolean(enabled);
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = alarmEventsSiteNodeId(group, site);
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = `Site alarm processing ${enabled ? 'enabled' : 'disabled'}.`;
  return true;
}

async function setAllAlarmsInSiteEnabled(groupName, siteName, enabled) {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const group = String(groupName || '').trim();
  const site = String(siteName || '').trim();
  if (!group || !site) return false;
  const cfg = await loadOpcbridgeAlarmsConfig();
  const alarms = alarmsForSite(cfg, group, site);
  if (!alarms.length) {
    window.alert(`No alarms found in site '${site}'.`);
    return false;
  }
  const count = alarms.length;
  const word = enabled ? 'Enable' : 'Disable';
  const doneWord = enabled ? 'Enabled' : 'Disabled';
  if (!window.confirm(`${word} ${count} individual alarm${count === 1 ? '' : 's'} in site '${site}'? This changes each alarm's Enabled setting.`)) return false;
  alarms.forEach((a) => { a.enabled = Boolean(enabled); });
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = alarmEventsSiteNodeId(group, site);
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = `${doneWord} ${count} individual alarm${count === 1 ? '' : 's'} in '${site}'.`;
  return true;
}

async function setAudioFileForAlarmScope(scope, groupName, siteName = '') {
  if (!canEditConfig()) { window.alert('Login required to edit alarms.'); return false; }
  const group = String(groupName || '').trim();
  const site = String(siteName || '').trim();
  if (!group || (scope === 'site' && !site)) return false;

  const cfg = await loadOpcbridgeAlarmsConfig();
  const alarms = scope === 'group' ? alarmsForGroup(cfg, group) : alarmsForSite(cfg, group, site);
  if (!alarms.length) {
    window.alert(`No alarms found in ${scope === 'group' ? `group '${group}'` : `site '${site}'`}.`);
    return false;
  }

  const targetLabel = scope === 'group' ? `group '${group}'` : `site '${site}'`;
  const current = String(alarms.find((a) => String(a?.audio_file || '').trim())?.audio_file || '').trim();
  const raw = window.prompt(`Audio file ID to set on ${alarms.length} alarm${alarms.length === 1 ? '' : 's'} in ${targetLabel}.\n\nLeave blank to clear the alarm-level audio file and inherit from group/site.`, current);
  if (raw == null) return false;
  const audioFileId = validateAlarmAudioFileId(cfg, raw);
  const actionText = audioFileId ? `Set audio file '${audioFileId}' on` : 'Clear alarm-level audio file from';
  if (!window.confirm(`${actionText} ${alarms.length} alarm${alarms.length === 1 ? '' : 's'} in ${targetLabel}?`)) return false;

  alarms.forEach((alarm) => {
    if (audioFileId) alarm.audio_file = audioFileId;
    else delete alarm.audio_file;
  });
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  if (scope === 'group') state.alarmsEventsSelectedNodeId = `alarm_group:${alarmTreeSafeKey(group)}`;
  else state.alarmsEventsSelectedNodeId = alarmEventsSiteNodeId(group, site);
  renderAlarmsEventsTree();
  await opcbridgeReload().catch(() => {});
  await refreshAll().catch(() => {});
  if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = `${audioFileId ? 'Updated' : 'Cleared'} alarm audio file for ${alarms.length} alarm${alarms.length === 1 ? '' : 's'}.`;
  return true;
}

	async function duplicateNotificationItem(kind, id) {
	  if (!canEditConfig()) { window.alert('Login required to edit notifications.'); return false; }
	  const cleanId = String(id || '').trim();
	  if (!cleanId) return false;
	  const cfg = await loadOpcbridgeAlarmsConfig();
  let items = [];
  let selectedNodeId = '';
  let selectedChildPrefix = '';
  if (kind === 'contact') {
    items = getNotificationContacts(cfg);
    selectedNodeId = 'folder:notification_contacts';
    selectedChildPrefix = 'notification_contact';
  } else if (kind === 'group') {
    items = getNotificationContactGroups(cfg);
    selectedNodeId = 'folder:notification_contact_groups';
    selectedChildPrefix = 'notification_contact_group';
  } else if (kind === 'policy') {
    items = getNotificationPolicies(cfg);
    selectedNodeId = 'folder:notification_policies';
    selectedChildPrefix = 'notification_policy';
  } else {
    return false;
  }

  const source = items.find((item) => String(item?.id || '').trim() === cleanId) || null;
  if (!source) throw new Error(`Item '${cleanId}' not found.`);
  const used = new Set(items.map((item) => String(item?.id || '').trim()).filter(Boolean));
	  const newId = uniqueCopyId(cleanId, used);
	  const next = JSON.parse(JSON.stringify(source));
	  next.id = newId;
	  next.name = copyName(next.name || source.name || cleanId);
	  if (kind === 'contact' || kind === 'group') {
	    if (!Array.isArray(cfg.targets)) cfg.targets = [];
	    cfg.targets.push(next);
	  } else if (kind === 'policy') {
	    if (!Array.isArray(cfg.policies)) cfg.policies = [];
	    cfg.policies.push(next);
	  }

	  await saveOpcbridgeAlarmsConfig(cfg);
	  await loadOpcbridgeAlarmsConfig();
	  state.alarmsEventsSelectedNodeId = selectedNodeId;
	  state.alarmsEventsSelectedChildId = `${selectedChildPrefix}:${newId}`;
  renderAlarmsEventsTree();
  return true;
}

async function createNotificationContactInteractive() {
  if (!canEditConfig()) { window.alert('Login required to edit notification contacts.'); return; }
  const name = String(window.prompt('Contact name:', '') || '').trim();
  if (!name) return;
  const phone = String(window.prompt('Phone number:', '') || '').trim();
  if (!phone) return;
  const cfg = await loadOpcbridgeAlarmsConfig();
  if (!Array.isArray(cfg.targets)) cfg.targets = [];
  const used = new Set((Array.isArray(cfg.targets) ? cfg.targets : []).map((t) => String(t?.id || '').trim()).filter(Boolean));
  const id = uniqueNotificationId(name, used);
  cfg.targets.push({ id, name, type: 'phone', value: phone, enabled: true });
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = 'folder:notification_contacts';
  state.alarmsEventsSelectedChildId = `notification_contact:${id}`;
  renderAlarmsEventsTree();
}

async function createNotificationContactGroupInteractive() {
  if (!canEditConfig()) { window.alert('Login required to edit contact groups.'); return; }
  const name = String(window.prompt('Contact group name:', '') || '').trim();
  if (!name) return;
  const cfg = await loadOpcbridgeAlarmsConfig();
  if (!Array.isArray(cfg.targets)) cfg.targets = [];
  const used = new Set((Array.isArray(cfg.targets) ? cfg.targets : []).map((t) => String(t?.id || '').trim()).filter(Boolean));
  const id = uniqueNotificationId(name, used);
  cfg.targets.push({ id, name, type: 'group', enabled: true, members: [] });
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = 'folder:notification_contact_groups';
  state.alarmsEventsSelectedChildId = `notification_contact_group:${id}`;
  renderAlarmsEventsTree();
}

async function createNotificationPolicyInteractive(outputType = 'phone') {
  if (!canEditConfig()) { window.alert('Login required to edit notification policies.'); return; }
  const type = ['phone', 'audio', 'sms', 'email'].includes(String(outputType || '').trim().toLowerCase())
    ? String(outputType).trim().toLowerCase()
    : 'phone';
  const name = String(window.prompt(`${type.toUpperCase()} policy name:`, '') || '').trim();
  if (!name) return;
  const cfg = await loadOpcbridgeAlarmsConfig();
  const policies = getNotificationPolicies(cfg);
  const used = new Set(policies.map((p) => String(p?.id || '').trim()).filter(Boolean));
  const id = uniqueNotificationId(name, used);
  const base = { id, name, output_type: type, enabled: true, min_severity: 500, on: ['active'], targets: [] };
  if (type === 'phone') base.call_backend = 'auto';
  policies.push(base);
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  // After creating, focus the policy type group so the user can see it in context.
  state.alarmsEventsSelectedNodeId = `notification_policy_type:${type}`;
  state.alarmsEventsSelectedChildId = `notification_policy:${id}`;
  renderAlarmsEventsTree();
}

async function createScheduleInteractive() {
  if (!canEditConfig()) { window.alert('Login required to edit schedules.'); return; }
  const name = String(window.prompt('Schedule name/ID:', '') || '').trim();
  if (!name) return;
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    const schedules = getSchedules(cfg);
    const used = new Set(schedules.map((s) => String(s?.id || '').trim()).filter(Boolean));
    const id = uniqueNotificationId(name, used);
    if (id === 'always') throw new Error("Schedule ID 'always' is reserved (virtual). Choose a different ID.");
    schedules.push({
      id,
      name,
      type: 'custom',
      enabled: true,
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      start_time: '',
      end_time: '',
      start_date: '',
      end_date: '',
      targets: []
    });
    await saveOpcbridgeAlarmsConfig(cfg);
    const reloaded = await loadOpcbridgeAlarmsConfig();
    const ok = getSchedules(reloaded).some((s) => String(s?.id || '').trim() === id);
    if (!ok) throw new Error(`Saved but did not persist (wanted schedule '${id}', got missing).`);
    state.alarmsEventsSelectedNodeId = 'folder:schedules';
    state.alarmsEventsSelectedChildId = `schedule:${id}`;
    renderAlarmsEventsTree();
  } catch (err) {
    const msg = String(err?.message || err);
    if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = `Create failed: ${msg}`;
    window.alert(`Create schedule failed: ${msg}`);
  }
}

async function createRoutingGroupInteractive() {
  if (!canEditConfig()) { window.alert('Login required to edit alarm routes.'); return; }
  const name = String(window.prompt('Alarm route name/ID:', '') || '').trim();
  if (!name) return;
  try {
    const cfg = await loadOpcbridgeAlarmsConfig();
    const groups = getRoutingAlarmGroups(cfg);
    const used = new Set(groups.map((g) => String(g?.id || '').trim()).filter(Boolean));
    const id = uniqueNotificationId(name, used);
    groups.push({ id, name, enabled: true, schedule_id: 'always', alarms: [], policy_ids: [] });
    await saveOpcbridgeAlarmsConfig(cfg);
    // Verify persistence via both endpoints:
    // - /config/file?path=alarms.json (raw stored document)
    // - /config/alarms (API wrapper)
    let rawHas = null;
    try {
      const raw = await apiGetText(`/api/opcbridge/config/file?path=${encodeURIComponent('alarms.json')}`);
      const j = JSON.parse(String(raw || '{}'));
      const arr = Array.isArray(j?.alarm_groups) ? j.alarm_groups : [];
      rawHas = arr.some((g) => String(g?.id || '').trim() === id);
    } catch {
      // ignore raw check errors; rely on /config/alarms reload
    }

    const reloaded = await loadOpcbridgeAlarmsConfig();
    const ok = getRoutingAlarmGroups(reloaded).some((g) => String(g?.id || '').trim() === id);
    if (!ok) {
      const hint = (rawHas === true) ? 'It appears in alarms.json raw, but is missing via /config/alarms (something is rewriting the DB).' :
        (rawHas === false ? 'It is missing from alarms.json raw after save (save path likely stripped it).' : 'Could not verify via alarms.json raw.');
      throw new Error(`Saved but did not persist (wanted routing group '${id}', but it was missing after reload). ${hint}`);
    }
    state.alarmsEventsSelectedNodeId = 'folder:routing_groups';
    state.alarmsEventsSelectedChildId = `routing_group:${id}`;
    renderAlarmsEventsTree();
  } catch (err) {
    const msg = String(err?.message || err);
    if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = `Create failed: ${msg}`;
    window.alert(`Create alarm route failed: ${msg}`);
  }
}

async function deleteRoutingGroupItem(id) {
  if (!canEditConfig()) { window.alert('Login required to edit alarm routes.'); return false; }
  const cleanId = String(id || '').trim();
  if (!cleanId) return false;
  if (!window.confirm(`Delete alarm route '${cleanId}'?`)) return false;
  const cfg = await loadOpcbridgeAlarmsConfig();
  cfg.alarm_groups = getRoutingAlarmGroups(cfg).filter((g) => String(g?.id || '').trim() !== cleanId);
  syncAlarmGroupMembershipFromRoutingGroups(cfg);
  await saveOpcbridgeAlarmsConfig(cfg);
  await loadOpcbridgeAlarmsConfig();
  state.alarmsEventsSelectedNodeId = 'folder:routing_groups';
  state.alarmsEventsSelectedChildId = '';
  renderAlarmsEventsTree();
  return true;
}

	async function deleteScheduleItem(id) {
	  if (!canEditConfig()) { window.alert('Login required to edit schedules.'); return false; }
	  const cleanId = String(id || '').trim();
	  if (!cleanId) return false;
	  if (!window.confirm(`Delete schedule '${cleanId}'?`)) return false;
	  const cfg = await loadOpcbridgeAlarmsConfig();
	  cfg.schedules = getSchedules(cfg).filter((s) => String(s?.id || '').trim() !== cleanId);
	  getRoutingAlarmGroups(cfg).forEach((route) => {
	    if (String(route?.schedule_id || '').trim() === cleanId) route.schedule_id = 'always';
	  });
	  await saveOpcbridgeAlarmsConfig(cfg);
	  await loadOpcbridgeAlarmsConfig();
	  state.alarmsEventsSelectedNodeId = 'folder:schedules';
	  state.alarmsEventsSelectedChildId = '';
	  renderAlarmsEventsTree();
	  return true;
	}

	async function deleteNotificationItem(kind, id) {
	  if (!canEditConfig()) { window.alert('Login required to edit notifications.'); return false; }
	  const cleanId = String(id || '').trim();
	  if (!cleanId) return false;
	  const label = kind === 'contact' ? 'contact' : (kind === 'group' ? 'contact group' : 'notification policy');
	  if (!window.confirm(`Delete ${label} '${cleanId}'?`)) return false;
	  const cfg = await loadOpcbridgeAlarmsConfig();
	  if (kind === 'contact') {
	    if (!Array.isArray(cfg.targets)) cfg.targets = [];
	    cfg.targets = cfg.targets.filter((t) => {
	      const tid = String(t?.id || '').trim();
	      if (tid !== cleanId) return true;
	      return String(t?.type || '').trim() !== 'phone';
	    });
	    cfg.targets.forEach((t) => {
	      if (!t || typeof t !== 'object' || Array.isArray(t)) return;
	      if (String(t.type || '').trim() !== 'group') return;
	      t.members = (Array.isArray(t.members) ? t.members : []).filter((mid) => String(mid || '').trim() !== cleanId);
	    });
	    (Array.isArray(cfg.policies) ? cfg.policies : []).forEach((p) => {
	      if (!p || typeof p !== 'object' || Array.isArray(p)) return;
	      p.targets = (Array.isArray(p.targets) ? p.targets : []).filter((ref) => !(String(ref?.type || '').trim() === 'contact' && String(ref?.id || '').trim() === cleanId));
	    });
	  } else if (kind === 'group') {
	    if (!Array.isArray(cfg.targets)) cfg.targets = [];
	    cfg.targets = cfg.targets.filter((t) => {
	      const tid = String(t?.id || '').trim();
	      if (tid !== cleanId) return true;
	      return String(t?.type || '').trim() !== 'group';
	    });
	    (Array.isArray(cfg.policies) ? cfg.policies : []).forEach((p) => {
	      if (!p || typeof p !== 'object' || Array.isArray(p)) return;
	      p.targets = (Array.isArray(p.targets) ? p.targets : []).filter((ref) => !(String(ref?.type || '').trim() === 'group' && String(ref?.id || '').trim() === cleanId));
	    });
	  } else if (kind === 'policy') {
	    cfg.policies = (Array.isArray(cfg.policies) ? cfg.policies : []).filter((p) => String(p?.id || '').trim() !== cleanId);
	    getRoutingAlarmGroups(cfg).forEach((route) => {
	      route.policy_ids = (Array.isArray(route.policy_ids) ? route.policy_ids : []).filter((pid) => String(pid || '').trim() !== cleanId);
	    });
	  }
	  await saveOpcbridgeAlarmsConfig(cfg);
	  await loadOpcbridgeAlarmsConfig();
	  renderAlarmsEventsTree();
	  return true;
	}

function isAlarmsEventsLeafType(type) {
  const t = String(type || '').trim();
  // These are displayed in the right-side list, not in the left tree.
  return ['alarm', 'event_tag', 'audio_file', 'notification_contact', 'notification_contact_group', 'notification_policy', 'routing_group', 'schedule', 'hint'].includes(t);
}

function renderAlarmsEventsTreeNode(node, container) {
  if (isAlarmsEventsLeafType(node?.type)) return;
  const canExpand = ['folder', 'alarms_root', 'alarm_groups_root', 'alarm_group', 'alarm_site', 'event_logging_root', 'event_connection', 'routing_groups_root', 'audio_files_root', 'audio_folder', 'notification_contacts_root', 'notification_contact_groups_root', 'notification_policies_root', 'notification_policy_type_root', 'schedules_root'].includes(String(node.type || ''));
  const expanded = state.alarmsEventsExpanded?.has?.(node.id);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tree-item';
  btn.classList.toggle('is-active', state.alarmsEventsSelectedNodeId === node.id);

  const twisty = document.createElement('span');
  twisty.className = 'twisty';
  twisty.classList.toggle('is-empty', !canExpand);
  twisty.textContent = canExpand ? (expanded ? '−' : '+') : '';
  if (canExpand) {
    twisty.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.alarmsEventsExpanded) state.alarmsEventsExpanded = new Set();
      if (state.alarmsEventsExpanded.has(node.id)) state.alarmsEventsExpanded.delete(node.id);
      else state.alarmsEventsExpanded.add(node.id);
      renderAlarmsEventsTree();
    });
  }

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = node.label;

  const meta = document.createElement('span');
  meta.className = 'meta';
  if (node.type === 'event_connection') {
    const n = Array.isArray(node.children) ? node.children.length : 0;
    meta.textContent = n ? `${n} event(s)` : '';
  } else if (node.type === 'audio_files_root') {
    const n = getAlarmAudioFiles(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} file(s)` : '';
  } else if (node.type === 'audio_folder') {
    const countFiles = (n) => (Array.isArray(n?.children) ? n.children.reduce((sum, c) => sum + (String(c?.type || '') === 'audio_file' ? 1 : countFiles(c)), 0) : 0);
    const n = countFiles(node);
    meta.textContent = n ? `${n} file(s)` : '';
  } else if (node.type === 'notification_contacts_root') {
    const n = getNotificationContacts(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} contact(s)` : '';
  } else if (node.type === 'notification_contact_groups_root') {
    const n = getNotificationContactGroups(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} group(s)` : '';
  } else if (node.type === 'notification_policies_root') {
    const n = getNotificationPolicies(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} policy(s)` : '';
  } else if (node.type === 'notification_policy_type_root') {
    const n = Array.isArray(node.children) ? node.children.filter((c) => String(c?.type || '') === 'notification_policy').length : 0;
    meta.textContent = n ? `${n} policy(s)` : '';
  } else if (node.type === 'routing_groups_root') {
    const n = getRoutingAlarmGroups(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} group(s)` : '';
  } else if (node.type === 'schedules_root') {
    const n = getSchedules(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} schedule(s)` : '';
  }

  btn.appendChild(twisty);
  btn.appendChild(label);
  btn.appendChild(meta);

  btn.addEventListener('click', () => {
    state.alarmsEventsSelectedNodeId = node.id;
    if (node.type === 'audio_files_root' || node.type === 'audio_folder') {
      state.alarmsEventsSelectedChildId = '';
    }
    renderAlarmsEventsTree();
  });

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.alarmsEventsSelectedNodeId = node.id;
    if (node.type === 'audio_files_root' || node.type === 'audio_folder') {
      state.alarmsEventsSelectedChildId = '';
    }
    renderAlarmsEventsTree();

    const items = [];

    if (node.type === 'alarms_root') {
      items.push({ label: 'Add Group…', onClick: () => addAlarmGroupInteractive() });
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal() });
      items.push({ label: 'Download CSV', onClick: () => downloadAlarmsCsv() });
      items.push({ label: 'Upload CSV…', onClick: () => importAlarmsCsv().catch((err) => window.alert(`CSV import failed: ${err.message}`)) });
      items.push('sep');
    }
    if (node.type === 'alarm_groups_root') {
      items.push({ label: 'Add Group…', onClick: () => addAlarmGroupInteractive() });
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal() });
      items.push({ label: 'Download CSV', onClick: () => downloadAlarmsCsv() });
      items.push({ label: 'Upload CSV…', onClick: () => importAlarmsCsv().catch((err) => window.alert(`CSV import failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'alarm_group') {
      const group = String(node.meta?.group || node.label || '').trim();
      items.push({ label: 'Add Site…', onClick: () => addAlarmSiteInteractive(String(node.meta?.group || node.label || '')) });
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal({ group: String(node.meta?.group || node.label || '') }) });
      items.push({ label: 'Download CSV (Group)', onClick: () => downloadAlarmsCsv({ group }) });
      items.push({ label: 'Upload CSV…', onClick: () => importAlarmsCsv().catch((err) => window.alert(`CSV import failed: ${err.message}`)) });
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'Set Audio File For Group Alarms…', onClick: () => setAudioFileForAlarmScope('group', group).catch((err) => window.alert(`Bulk audio update failed: ${err.message}`)) });
      items.push({ label: 'Delete Group…', onClick: () => deleteAlarmGroupInteractive(group).catch((err) => window.alert(`Group delete failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'alarm_site') {
      const group = String(node.meta?.group || '').trim();
      const site = String(node.meta?.site || '').trim();
      const processingEnabled = isAlarmSiteProcessingEnabled(state.alarmsConfig || {}, group, site);
      items.push({ label: 'Add Alarm…', onClick: () => openNewAlarmModal({ group: String(node.meta?.group || ''), site: String(node.meta?.site || '') }) });
      items.push({ label: 'Download CSV (Site)', onClick: () => downloadAlarmsCsv({ group, site }) });
      items.push({ label: 'Upload CSV…', onClick: () => importAlarmsCsv().catch((err) => window.alert(`CSV import failed: ${err.message}`)) });
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: processingEnabled ? 'Disable Site Alarm Processing' : 'Enable Site Alarm Processing', onClick: () => setSiteAlarmProcessing(group, site, !processingEnabled).catch((err) => window.alert(`Site alarm processing update failed: ${err.message}`)) });
      items.push({ label: 'Set All Alarms Enabled…', onClick: () => setAllAlarmsInSiteEnabled(group, site, true).catch((err) => window.alert(`Bulk alarm update failed: ${err.message}`)) });
      items.push({ label: 'Set All Alarms Disabled…', onClick: () => setAllAlarmsInSiteEnabled(group, site, false).catch((err) => window.alert(`Bulk alarm update failed: ${err.message}`)) });
      items.push({ label: 'Set Audio File For Site Alarms…', onClick: () => setAudioFileForAlarmScope('site', group, site).catch((err) => window.alert(`Bulk audio update failed: ${err.message}`)) });
      items.push({ label: 'Delete Site…', onClick: () => deleteAlarmSiteInteractive(group, site).catch((err) => window.alert(`Site delete failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'alarm') {
      const aid = String(node.meta?.alarm_id || '').trim();
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'Duplicate Alarm', onClick: () => duplicateAlarmById(aid).catch((err) => window.alert(`Alarm duplicate failed: ${err.message}`)) });
      items.push({ label: 'Delete Alarm…', onClick: () => deleteAlarmById(aid) });
      items.push('sep');
    }

    if (node.type === 'event_logging_root') {
      items.push({ label: 'Add Event…', onClick: () => openNewEventModal() });
      items.push('sep');
    }

    if (node.type === 'event_connection') {
      const cid = String(node.meta?.connection_id || node.label || '').trim();
      items.push({ label: 'Add Event…', onClick: () => openNewEventModal(cid) });
      items.push('sep');
    }

    if (node.type === 'event_tag') {
      const cid = String(node.meta?.connection_id || '').trim();
      const name = String(node.meta?.name || node.label || '').trim();
      const eventTag = getEffectiveTagsAll().find((t) => String(t?.connection_id || '') === cid && String(t?.name || '') === name) || {};
      const eventLoggingEnabled = eventTag?.log_event_on_change === true;
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal({ id: `tag:${cid}::${name}`, type: 'tag', label: name, meta: { connection_id: cid, name }, children: [] }) });
      items.push({ label: eventLoggingEnabled ? 'Delete Event…' : 'Add Event', onClick: () => setTagEventLogging(cid, name, !eventLoggingEnabled) });
      items.push('sep');
    }

    if (node.type === 'audio_files_root') {
      items.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(node) });
      items.push({ label: 'New Folder…', onClick: () => createAlarmAudioFolderInteractive().catch((err) => window.alert(`Audio folder create failed: ${err.message}`)) });
      items.push({ label: 'Upload Audio File…', onClick: () => chooseAndUploadAlarmAudioFile() });
      items.push('sep');
    }

    if (node.type === 'audio_folder') {
      const folder = String(node.meta?.folder || '').trim();
      items.push({ label: 'New Folder…', onClick: () => createAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder create failed: ${err.message}`)) });
      items.push({ label: 'Upload Audio File…', onClick: () => chooseAndUploadAlarmAudioFile(folder) });
      items.push({ label: 'Delete Folder…', onClick: () => deleteAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder delete failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'audio_file') {
      const audioId = String(node.meta?.id || '').trim();
      items.push({ label: 'Copy Audio File ID', onClick: () => navigator.clipboard?.writeText(audioId).catch(() => window.prompt('Audio file ID:', audioId)) });
      items.push({ label: 'Move Audio File…', onClick: () => moveAlarmAudioFileInteractive(audioId).catch((err) => window.alert(`Audio move failed: ${err.message}`)) });
      items.push({ label: 'Delete Audio File…', onClick: () => deleteAlarmAudioFileById(audioId).then((result) => { if (result) { state.alarmsEventsSelectedNodeId = 'folder:audio_files'; renderAlarmsEventsTree(); } }).catch((err) => window.alert(`Audio delete failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'notification_contacts_root') {
      items.push({ label: 'Add Contact…', onClick: () => createNotificationContactInteractive().catch((err) => window.alert(`Contact create failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'notification_contact_groups_root') {
      items.push({ label: 'Add Contact Group…', onClick: () => createNotificationContactGroupInteractive().catch((err) => window.alert(`Contact group create failed: ${err.message}`)) });
      items.push('sep');
    }

    if (node.type === 'notification_policies_root') {
      items.push({ label: 'Add Phone Policy…', onClick: () => createNotificationPolicyInteractive('phone').catch((err) => window.alert(`Policy create failed: ${err.message}`)) });
      items.push('sep');
    }
    if (node.type === 'notification_policy_type_root') {
      const ptype = String(node?.meta?.policy_type || 'phone').trim().toLowerCase();
      const label = ptype === 'sms' ? ptype.toUpperCase() : `${ptype.charAt(0).toUpperCase()}${ptype.slice(1)}`;
      items.push({ label: `Add ${label} Policy…`, onClick: () => createNotificationPolicyInteractive(ptype).catch((err) => window.alert(`Policy create failed: ${err.message}`)) });
      items.push('sep');
    }
    if (node.type === 'schedules_root') {
      items.push({ label: 'Add Schedule…', onClick: () => createScheduleInteractive().catch((err) => window.alert(`Schedule create failed: ${err.message}`)) });
      items.push('sep');
    }
    if (node.type === 'routing_groups_root') {
      items.push({ label: 'Add Alarm Route…', onClick: () => createRoutingGroupInteractive().catch((err) => window.alert(`Alarm route create failed: ${err.message}`)) });
      items.push('sep');
    }

    items.push({ label: 'Refresh', onClick: async () => { await loadTagsConfig().catch(() => {}); await refreshAll().catch(() => {}); renderAlarmsEventsTree(); } });

    if (!items.length) return;
    showContextMenu(e.clientX, e.clientY, items);
  });

  container.appendChild(btn);

  if (canExpand && expanded) {
    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tree-children';
    (node.children || []).forEach((c) => renderAlarmsEventsTreeNode(c, childrenWrap));
    container.appendChild(childrenWrap);
  }
}

function renderAlarmsEventsDetails(node) {
  if (!node) return;

  const isAlarmsEvents = node.id === 'folder:alarms_events';
  const isAlarmsRoot = String(node.type || '') === 'alarms_root';
  const isAlarmGroupsRoot = String(node.type || '') === 'alarm_groups_root';
  const isAlarmGroup = String(node.type || '') === 'alarm_group';
  const isAlarmSite = String(node.type || '') === 'alarm_site';
  const isAlarm = String(node.type || '') === 'alarm';
  const isEventLoggingRoot = String(node.type || '') === 'event_logging_root';
  const isEventConnection = String(node.type || '') === 'event_connection';
  const isEventTag = String(node.type || '') === 'event_tag';
  const isRoutingGroupsRoot = String(node.type || '') === 'routing_groups_root';
  const isRoutingGroup = String(node.type || '') === 'routing_group';
  const isSchedulesRoot = String(node.type || '') === 'schedules_root';
  const isSchedule = String(node.type || '') === 'schedule';
  const isAudioFilesRoot = String(node.type || '') === 'audio_files_root';
  const isAudioFolder = String(node.type || '') === 'audio_folder';
  const isAudioFile = String(node.type || '') === 'audio_file';
  const isNotificationContactsRoot = String(node.type || '') === 'notification_contacts_root';
  const isNotificationContact = String(node.type || '') === 'notification_contact';
  const isNotificationContactGroupsRoot = String(node.type || '') === 'notification_contact_groups_root';
  const isNotificationContactGroup = String(node.type || '') === 'notification_contact_group';
  const isNotificationPoliciesRoot = String(node.type || '') === 'notification_policies_root';
  const isNotificationPolicyTypeRoot = String(node.type || '') === 'notification_policy_type_root';
  const isNotificationPolicy = String(node.type || '') === 'notification_policy';

  const columns = (isEventConnection || isEventTag)
    ? ['Name', 'Source', 'Datatype', 'Writable', 'Enabled']
    : (isAudioFilesRoot || isAudioFolder || isAudioFile)
    ? ['Name', 'ID', 'Path']
    : (isNotificationContactsRoot || isNotificationContact)
    ? ['Name', 'Phone', 'Enabled', 'ID']
    : (isNotificationContactGroupsRoot || isNotificationContactGroup)
    ? ['Name', 'Contacts', 'Enabled', 'ID']
    : (isNotificationPoliciesRoot)
    ? ['Name', 'Policies']
    : ((isNotificationPolicyTypeRoot || isNotificationPolicy))
    ? ['Name', 'Targets', 'Min Severity', 'Events', 'Playback', 'Enabled', 'ID']
    : (isRoutingGroupsRoot || isRoutingGroup)
    ? ['Name', 'Schedule', 'Policies', 'Alarms', 'Enabled', 'ID']
    : (isSchedulesRoot || isSchedule)
    ? ['Name', 'Type', 'Days', 'Start', 'End', 'Enabled', 'Targets', 'ID']
    : (isAlarmGroupsRoot || isAlarmGroup)
    ? ['Name', 'Processing', 'Audible', 'Audio Sequence']
    : (isAlarmSite || isAlarm)
    ? ['Name', 'Severity', 'Source', 'State', 'Acked', 'Enabled', 'Audible', 'Audio Sequence', 'Policy', 'Group', 'Site']
    : ['Name'];

  const colCount = columns.length;
  const sortKey = String(node?.id || 'default');
  const defaultSortColumn = columns.includes('Name') ? 'Name' : columns[0];
  if (!state.alarmsEventsChildrenSort || typeof state.alarmsEventsChildrenSort !== 'object') state.alarmsEventsChildrenSort = {};
  const sortState = state.alarmsEventsChildrenSort[sortKey] || { column: defaultSortColumn, dir: 'asc' };
  if (!columns.includes(sortState.column)) sortState.column = defaultSortColumn;
  if (sortState.dir !== 'desc') sortState.dir = 'asc';
  state.alarmsEventsChildrenSort[sortKey] = sortState;

  if (els.alarmsEventsChildrenTable) {
    const headRow = els.alarmsEventsChildrenTable.querySelector('thead tr');
    if (headRow) {
      headRow.textContent = '';
      columns.forEach((c) => {
        const th = document.createElement('th');
        th.className = 'sortable';
        th.title = `Sort by ${c}`;
        th.textContent = c === sortState.column ? `${c} ${sortState.dir === 'desc' ? '▼' : '▲'}` : c;
        th.addEventListener('click', () => {
          const cur = state.alarmsEventsChildrenSort?.[sortKey] || {};
          const nextDir = cur.column === c && cur.dir === 'asc' ? 'desc' : 'asc';
          state.alarmsEventsChildrenSort[sortKey] = { column: c, dir: nextDir };
          renderAlarmsEventsDetails(node);
        });
        headRow.appendChild(th);
      });
    }
  }

  if (!els.alarmsEventsChildrenTbody) return;
  els.alarmsEventsChildrenTbody.textContent = '';

  if (els.alarmsEventsListHint) {
    const label = String(node?.label || '').trim();
    const title = label ? `Children · ${label}` : 'Children';
    els.alarmsEventsListHint.textContent = title;
  }

  const addCell = (tr, text, dim = false) => {
    const td = document.createElement('td');
    td.textContent = String(text ?? '');
    if (dim) td.className = 'audit-cell-dim';
    tr.appendChild(td);
    return td;
  };
  const addBadgeCell = (tr, text, className) => {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.className = `badge ${className || ''}`.trim();
    span.textContent = String(text ?? '');
    td.appendChild(span);
    tr.appendChild(td);
    return td;
  };

  const policyRowsForNode = () => {
    if (isNotificationPolicy) return [node];
    if (isNotificationPolicyTypeRoot) return (Array.isArray(node.children) ? node.children : []).filter((c) => String(c?.type || '') === 'notification_policy');
    if (isNotificationPoliciesRoot) {
      return (Array.isArray(node.children) ? node.children : []).filter((c) => String(c?.type || '') === 'notification_policy_type_root');
    }
    return null;
  };
  const policyRows = policyRowsForNode();
  const rows = ((isAlarm || isEventTag || isAudioFile || isNotificationContact || isNotificationContactGroup || isRoutingGroup || isSchedule) ? [node] : (policyRows || (Array.isArray(node.children) ? node.children : [])))
    .slice()
    .sort((a, b) => compareAlarmEventsRows(a, b, sortState.column, sortState.dir, node));

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colCount;
    td.className = 'audit-cell-dim';
    td.textContent = 'No items.';
    tr.appendChild(td);
    els.alarmsEventsChildrenTbody.appendChild(tr);
    renderAlarmsEventsProperties(null, node);
    return;
  }

  const rowIds = rows.map((r) => String(r?.id || '')).filter(Boolean);
  const selId = String(state.alarmsEventsSelectedChildId || '').trim();
  const multiSelect = Boolean(isAudioFilesRoot || isAudioFolder || isAlarmGroupsRoot || isAlarmGroup);
  if (!Array.isArray(state.alarmsEventsSelectedChildIds)) state.alarmsEventsSelectedChildIds = [];

  if (multiSelect) {
    const nextSel = state.alarmsEventsSelectedChildIds
      .map((id) => String(id || '').trim())
      .filter((id) => id && rowIds.includes(id));
    state.alarmsEventsSelectedChildIds = nextSel;
    state.alarmsEventsSelectedChildId = nextSel[0] || '';
  } else {
    state.alarmsEventsSelectedChildIds = [];
    if (!selId || !rowIds.includes(selId)) {
      state.alarmsEventsSelectedChildId = rowIds[0] || '';
    }
  }

  let selectedRow = rows.find((r) => String(r?.id || '') === String(state.alarmsEventsSelectedChildId || '')) || null;
  const selectedSet = new Set(
    multiSelect
      ? (state.alarmsEventsSelectedChildIds || []).map((x) => String(x || '').trim()).filter(Boolean)
      : [String(state.alarmsEventsSelectedChildId || '').trim()].filter(Boolean)
  );

  rows.forEach((c) => {
    const tr = document.createElement('tr');
    const type = String(c?.type || '');
    const childId = String(c?.id || '');
    if (childId) tr.dataset.rowId = childId;
    tr.classList.toggle('is-selected', childId && selectedSet.has(childId));

    if ((isEventConnection || isEventTag) && type === 'event_tag') {
      const meta = c?.meta || {};
      const conn = String(meta?.connection_id || '').trim();
      const name = String(meta?.name || c?.label || '').trim();
      const tagRow = getEffectiveTagsAll().find((t) => String(t?.connection_id || '') === conn && String(t?.name || '') === name) || {};
      addCell(tr, name, false);
      addCell(tr, `${conn}:${name}`, false);
      addCell(tr, String(tagRow?.datatype || ''), !String(tagRow?.datatype || '').trim());
      addBadgeCell(tr, tagRow?.writable === true ? 'WRITABLE' : 'READ', tagRow?.writable === true ? 'warn' : 'ok');
      addBadgeCell(tr, tagRow?.log_event_on_change === true ? 'ENABLED' : 'DISABLED', tagRow?.log_event_on_change === true ? 'ok' : 'bad');
    } else if ((isAudioFilesRoot || isAudioFolder || isAudioFile) && type === 'audio_folder') {
      addCell(tr, String(c?.label || ''), false);
      addCell(tr, 'folder', false);
      addCell(tr, `audio/${String(c?.meta?.folder || '').trim()}`, false);
    } else if ((isAudioFilesRoot || isAudioFolder || isAudioFile) && type === 'audio_file') {
      const meta = c?.meta || {};
      addCell(tr, String(meta?.name || c?.label || ''), false);
      addCell(tr, String(meta?.id || '').trim(), !String(meta?.id || '').trim());
      addCell(tr, String(meta?.path || '').trim(), !String(meta?.path || '').trim());
    } else if ((isNotificationContactsRoot || isNotificationContact) && type === 'notification_contact') {
      const meta = c?.meta || {};
      addCell(tr, String(meta?.name || c?.label || ''), false);
      addCell(tr, String(meta?.phone || '').trim(), !String(meta?.phone || '').trim());
      addBadgeCell(tr, meta?.enabled === false ? 'DISABLED' : 'ENABLED', meta?.enabled === false ? 'bad' : 'ok');
      addCell(tr, String(meta?.id || '').trim(), false);
    } else if ((isNotificationContactGroupsRoot || isNotificationContactGroup) && type === 'notification_contact_group') {
      const meta = c?.meta || {};
      const contacts = Array.isArray(meta?.contacts) ? meta.contacts : [];
      addCell(tr, String(meta?.name || c?.label || ''), false);
      addCell(tr, String(contacts.length), contacts.length === 0);
      addBadgeCell(tr, meta?.enabled === false ? 'DISABLED' : 'ENABLED', meta?.enabled === false ? 'bad' : 'ok');
      addCell(tr, String(meta?.id || '').trim(), false);
    } else if (isNotificationPoliciesRoot && type === 'notification_policy_type_root') {
      const policyCount = Array.isArray(c?.children)
        ? c.children.filter((x) => String(x?.type || '') === 'notification_policy').length
        : 0;
      addCell(tr, String(c?.label || c?.id || ''), false);
      addCell(tr, String(policyCount), policyCount === 0);
	    } else if ((isNotificationPolicyTypeRoot || isNotificationPolicy) && type === 'notification_policy') {
	      const meta = c?.meta || {};
	      const targets = getPolicyTargets(meta);
	      const events = Array.isArray(meta?.on) ? meta.on.join(', ') : '';
      const delay = meta?.audio_delay_seconds == null ? 'default' : `${Math.max(0, Math.trunc(Number(meta.audio_delay_seconds) || 0))}s`;
      const gap = meta?.audio_gap_ms == null ? 'default' : `${Math.max(0, Math.trunc(Number(meta.audio_gap_ms) || 0))}ms`;
      addCell(tr, String(meta?.name || c?.label || ''), false);
      addCell(tr, String(targets.length), targets.length === 0);
      addBadgeCell(tr, `${severityLabel(meta?.min_severity ?? 0)} ${Number(meta?.min_severity ?? 0) || 0}`, severityClass(meta?.min_severity ?? 0));
      addCell(tr, events, !events);
      addCell(tr, `delay ${delay}, gap ${gap}`, delay === 'default' && gap === 'default');
      addBadgeCell(tr, meta?.enabled === false ? 'DISABLED' : 'ENABLED', meta?.enabled === false ? 'bad' : 'ok');
      addCell(tr, String(meta?.id || '').trim(), false);
    } else if ((isRoutingGroupsRoot || isRoutingGroup) && type === 'routing_group') {
      const meta = c?.meta || {};
      addCell(tr, String(meta?.name || c?.label || ''), false);
      addCell(tr, String(meta?.schedule_id || 'always'), false);
      addCell(tr, String(Array.isArray(meta?.policy_ids) ? meta.policy_ids.length : 0), false);
      addCell(tr, String(Array.isArray(meta?.alarms) ? meta.alarms.length : 0), false);
      addBadgeCell(tr, meta?.enabled === false ? 'DISABLED' : 'ENABLED', meta?.enabled === false ? 'bad' : 'ok');
      addCell(tr, String(meta?.id || '').trim(), false);
    } else if ((isSchedulesRoot || isSchedule) && type === 'schedule') {
      const meta = c?.meta || {};
      const isCustom = String(meta?.type || '') === 'custom';
      const days = isCustom ? (Array.isArray(meta?.days) && meta.days.length ? meta.days.join(',') : 'all') : '';
      const startText = isCustom ? (String(meta?.start_time || '').trim() || 'all day') : '';
      const endText = isCustom ? (String(meta?.end_time || '').trim() || 'all day') : '';
      addCell(tr, String(meta?.name || c?.label || ''), false);
      addCell(tr, String(meta?.type || ''), !String(meta?.type || '').trim());
      addCell(tr, days, !days);
      addCell(tr, startText, !String(startText || '').trim());
      addCell(tr, endText, !String(endText || '').trim());
      addBadgeCell(tr, meta?.enabled === false ? 'DISABLED' : 'ENABLED', meta?.enabled === false ? 'bad' : 'ok');
      addCell(tr, String(Array.isArray(meta?.targets) ? meta.targets.length : 0), false);
      addCell(tr, String(meta?.id || '').trim(), false);
    } else if ((isAlarmsRoot || isAlarmGroupsRoot || isAlarmGroup) && (type === 'alarm_group' || type === 'alarm_site')) {
      const cfg = state.alarmsConfig || {};
      const group = type === 'alarm_group' ? String(c?.meta?.group || c?.label || '') : String(c?.meta?.group || '');
      const site = type === 'alarm_site' ? String(c?.meta?.site || c?.label || '') : '';
      const target = type === 'alarm_group' ? findAlarmGroupConfig(cfg, group) : findAlarmSiteConfig(cfg, group, site);
      const effective = type === 'alarm_group'
        ? { ...getInheritedAudioForScope(cfg, 'group', group, ''), ...(target || {}) }
        : resolveInheritedAlarmAudio(cfg, group, site);
      const processingText = type === 'alarm_site' ? (target?.alarms_enabled === false ? 'DISABLED' : 'ENABLED') : '';
      addCell(tr, String(c?.label || c?.id || ''), false);
      if (type === 'alarm_site') addBadgeCell(tr, processingText, target?.alarms_enabled === false ? 'bad' : 'ok');
      else addCell(tr, '', true);
      addBadgeCell(tr, effective?.audible_enabled ? 'ENABLED' : 'DISABLED', effective?.audible_enabled ? 'ok' : 'bad');
      addCell(tr, alarmAudioSequenceText(effective?.audio_files || (effective?.audio_file ? [effective.audio_file] : []), cfg, effective?.speech_texts || (effective?.speech_text ? [effective.speech_text] : [])), !(effective?.audio_files || []).length && !effective?.audio_file && !(effective?.speech_texts || []).length && !effective?.speech_text);
    } else if ((isAlarmSite || isAlarm) && type === 'alarm') {
      const cfg = state.alarmsConfig || {};
      const meta = c?.meta || {};
      const alarmId = String(meta?.alarm_id || '').trim();
      const alarmConfig = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).find((a) => String(a?.id || '').trim() === alarmId) || null;
      const effectiveAudio = resolveAlarmAudio(cfg, alarmConfig || { group: meta?.group, site: meta?.site });
      const src = meta?.source || {};
      const siteEnabled = meta?.site_enabled !== false;
      const stateStr = (meta?.enabled === false) ? 'DISABLED' : (!siteEnabled ? 'SITE DISABLED' : (meta?.active ? 'ACTIVE' : 'OK'));
      addCell(tr, String(c?.label || meta?.alarm_id || ''), false);
      addBadgeCell(tr, meta?.severity == null ? '' : `${severityLabel(meta.severity)} ${meta.severity}`, severityClass(meta.severity));
      addCell(tr, `${String(src?.connection_id || '')}:${String(src?.tag || '')}`.replace(/^:$/, ''), !(src?.connection_id || src?.tag));
      addBadgeCell(tr, stateStr, (meta?.enabled === false || !siteEnabled) ? 'bad' : (meta?.active ? 'warn' : 'ok'));
      addBadgeCell(tr, meta?.acked ? 'ACKED' : 'UNACKED', meta?.acked ? 'ok' : (meta?.active ? 'warn' : ''));
      addBadgeCell(tr, meta?.enabled === false ? 'DISABLED' : 'ENABLED', meta?.enabled === false ? 'bad' : 'ok');
      addBadgeCell(tr, effectiveAudio.audible_enabled ? 'ENABLED' : 'DISABLED', effectiveAudio.audible_enabled ? 'ok' : 'bad');
      addCell(tr, alarmAudioSequenceText(effectiveAudio.audio_files || (effectiveAudio.audio_file ? [effectiveAudio.audio_file] : []), cfg, effectiveAudio.speech_texts || (effectiveAudio.speech_text ? [effectiveAudio.speech_text] : [])), !(effectiveAudio.audio_files || []).length && !effectiveAudio.audio_file && !(effectiveAudio.speech_texts || []).length && !effectiveAudio.speech_text);
      addCell(tr, String(alarmConfig?.notification_policy || ''), !String(alarmConfig?.notification_policy || '').trim());
      addCell(tr, String(meta?.group || ''), !String(meta?.group || '').trim());
      addCell(tr, String(meta?.site || ''), !String(meta?.site || '').trim());
    } else {
      addCell(tr, String(c?.label || c?.id || ''), false);
    }

    tr.style.cursor = 'default';

    tr.addEventListener('click', (e) => {
      if (!multiSelect) {
        const trs = Array.from(els.alarmsEventsChildrenTbody.querySelectorAll('tr'));
        trs.forEach((r) => r.classList.remove('is-selected'));
        tr.classList.add('is-selected');
        state.alarmsEventsSelectedChildId = childId;
        renderAlarmsEventsProperties(c, node);
        return;
      }

      const ids = rowIds;
      const idx = ids.indexOf(childId);
      if (idx < 0) return;

      let sel = new Set((state.alarmsEventsSelectedChildIds || []).map((x) => String(x || '').trim()).filter(Boolean));

      if (e.shiftKey) {
        const anchor = String(state.alarmsEventsSelectedChildAnchorId || state.alarmsEventsSelectedChildId || childId).trim();
        const aidx = ids.indexOf(anchor);
        const from = (aidx >= 0) ? Math.min(aidx, idx) : idx;
        const to = (aidx >= 0) ? Math.max(aidx, idx) : idx;
        sel = new Set(ids.slice(from, to + 1));
      } else if (e.ctrlKey || e.metaKey) {
        if (sel.has(childId)) sel.delete(childId);
        else sel.add(childId);
        state.alarmsEventsSelectedChildAnchorId = childId;
      } else {
        sel = new Set([childId]);
        state.alarmsEventsSelectedChildAnchorId = childId;
      }

      const next = Array.from(sel).filter(Boolean);
      state.alarmsEventsSelectedChildIds = next;
      state.alarmsEventsSelectedChildId = next[0] || '';

      // Update row highlights in-place.
      const trs = Array.from(els.alarmsEventsChildrenTbody.querySelectorAll('tr'));
      trs.forEach((r) => {
        const rid = String(r.dataset.rowId || '').trim();
        r.classList.toggle('is-selected', rid && sel.has(rid));
      });

      const primary = rows.find((r) => String(r?.id || '') === String(state.alarmsEventsSelectedChildId || '')) || null;
      renderAlarmsEventsProperties(primary, node);
    });

    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ptype = String(node?.type || '').trim();
      const allowMulti = (ptype === 'audio_files_root' || ptype === 'audio_folder' || ptype === 'alarm_groups_root' || ptype === 'alarm_group');
      const currentSel = new Set((allowMulti ? (state.alarmsEventsSelectedChildIds || []) : [state.alarmsEventsSelectedChildId])
        .map((x) => String(x || '').trim()).filter(Boolean));
      // If multi-select is active and the right-clicked row is already selected, keep selection.
      // Otherwise, select only that row (consistent with most UIs).
      const keepMulti = allowMulti && childId && currentSel.has(childId);
      const trs = Array.from(els.alarmsEventsChildrenTbody.querySelectorAll('tr'));
      trs.forEach((r) => r.classList.remove('is-selected'));
      if (keepMulti) {
        trs.forEach((r) => {
          const rid = String(r.dataset.rowId || '').trim();
          if (rid && currentSel.has(rid)) r.classList.add('is-selected');
        });
        state.alarmsEventsSelectedChildIds = Array.from(currentSel);
        state.alarmsEventsSelectedChildId = Array.from(currentSel)[0] || childId;
      } else {
        tr.classList.add('is-selected');
        state.alarmsEventsSelectedChildId = childId;
        state.alarmsEventsSelectedChildIds = allowMulti ? [childId] : [];
      }
      renderAlarmsEventsProperties(c, node);

      const menu = [];
      if (allowMulti) {
        const selectedIds = Array.isArray(state.alarmsEventsSelectedChildIds) ? state.alarmsEventsSelectedChildIds : [];
        const selected = selectedIds.map((x) => String(x || '').trim()).filter(Boolean);
        if (ptype === 'alarm_groups_root' && selected.length > 1) {
          menu.push({
            label: `Delete Selected (${selected.length})…`,
            onClick: async () => {
              const tree = state.alarmsEventsTreeRoot;
              const nodes = selected.map((id) => findAlarmsEventsNodeById(tree, id)).filter(Boolean);
              const names = nodes.filter((n) => String(n?.type || '') === 'alarm_group')
                .map((n) => String(n?.meta?.group || n?.label || '').trim()).filter(Boolean);
              await deleteAlarmGroupsBulk(names);
            }
          });
          menu.push('sep');
        }
        if (ptype === 'alarm_group' && selected.length > 1) {
          const group = String(node?.meta?.group || node?.label || '').trim();
          menu.push({
            label: `Delete Selected (${selected.length})…`,
            onClick: async () => {
              const tree = state.alarmsEventsTreeRoot;
              const nodes = selected.map((id) => findAlarmsEventsNodeById(tree, id)).filter(Boolean);
              const sites = nodes.filter((n) => String(n?.type || '') === 'alarm_site')
                .map((n) => String(n?.meta?.site || n?.label || '').trim()).filter(Boolean);
              await deleteAlarmSitesBulk(group, sites);
            }
          });
          menu.push('sep');
        }
      }
      if (type === 'alarm') {
        const aid = String(c?.meta?.alarm_id || '').trim();
        menu.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(c) });
        menu.push({ label: 'Duplicate Alarm', onClick: () => duplicateAlarmById(aid).catch((err) => window.alert(`Alarm duplicate failed: ${err.message}`)) });
        menu.push({ label: 'Delete Alarm…', onClick: () => deleteAlarmById(aid) });
      } else if (type === 'alarm_group') {
        const group = String(c?.meta?.group || c?.label || '').trim();
        if (group) {
          menu.push({ label: 'Download CSV (Group)', onClick: () => downloadAlarmsCsv({ group }) });
          menu.push({ label: 'Delete Group…', onClick: () => deleteAlarmGroupInteractive(group).catch((err) => window.alert(`Group delete failed: ${err.message}`)) });
        }
      } else if (type === 'alarm_site') {
        const group = String(c?.meta?.group || '').trim();
        const site = String(c?.meta?.site || c?.label || '').trim();
        if (group && site) {
          menu.push({ label: 'Download CSV (Site)', onClick: () => downloadAlarmsCsv({ group, site }) });
          menu.push({ label: 'Delete Site…', onClick: () => deleteAlarmSiteInteractive(group, site).catch((err) => window.alert(`Site delete failed: ${err.message}`)) });
        }
      } else if (type === 'notification_contact') {
        const id = String(c?.meta?.id || '').trim();
        menu.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(c) });
        menu.push({ label: 'Duplicate Contact', onClick: () => duplicateNotificationItem('contact', id).catch((err) => window.alert(`Contact duplicate failed: ${err.message}`)) });
        menu.push({ label: 'Delete Contact…', onClick: () => deleteNotificationItem('contact', id).catch((err) => window.alert(`Contact delete failed: ${err.message}`)) });
      } else if (type === 'notification_contact_group') {
        const id = String(c?.meta?.id || '').trim();
        menu.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(c) });
        menu.push({ label: 'Duplicate Contact Group', onClick: () => duplicateNotificationItem('group', id).catch((err) => window.alert(`Contact group duplicate failed: ${err.message}`)) });
        menu.push({ label: 'Delete Group…', onClick: () => deleteNotificationItem('group', id).catch((err) => window.alert(`Group delete failed: ${err.message}`)) });
      } else if (type === 'notification_policy') {
        const id = String(c?.meta?.id || '').trim();
        menu.push({ label: 'Properties…', onClick: () => openWorkspaceItemModal(c) });
        menu.push({ label: 'Duplicate Notification Policy', onClick: () => duplicateNotificationItem('policy', id).catch((err) => window.alert(`Policy duplicate failed: ${err.message}`)) });
        menu.push({ label: 'Delete Policy…', onClick: () => deleteNotificationItem('policy', id).catch((err) => window.alert(`Policy delete failed: ${err.message}`)) });
      } else if (type === 'schedule') {
        const id = String(c?.meta?.id || '').trim();
        menu.push({ label: 'Delete Schedule…', onClick: () => deleteScheduleItem(id).catch((err) => window.alert(`Schedule delete failed: ${err.message}`)) });
      } else if (type === 'routing_group') {
        const id = String(c?.meta?.id || '').trim();
        menu.push({ label: 'Delete Alarm Route…', onClick: () => deleteRoutingGroupItem(id).catch((err) => window.alert(`Alarm route delete failed: ${err.message}`)) });
      } else if (type === 'audio_file') {
        const id = String(c?.meta?.id || '').trim();
        menu.push({ label: 'Copy Audio File ID', onClick: () => navigator.clipboard?.writeText(id).catch(() => window.prompt('Audio file ID:', id)) });
        menu.push({ label: 'Move Audio File…', onClick: () => moveAlarmAudioFileInteractive(id).catch((err) => window.alert(`Audio move failed: ${err.message}`)) });
      }
      if (!menu.length) return;
      showContextMenu(e.clientX, e.clientY, menu);
    });

    tr.addEventListener('dblclick', () => {
      if (String(c?.type || '') === 'event_connection') {
        state.alarmsEventsSelectedNodeId = String(c?.id || '');
        renderAlarmsEventsTree();
        renderAlarmsEventsDetails(c);
        return;
      }
      if (String(c?.type || '') === 'event_tag') {
        const cid = String(c?.meta?.connection_id || '').trim();
        const name = String(c?.meta?.name || c?.label || '').trim();
        openWorkspaceItemModal({ id: `tag:${cid}::${name}`, type: 'tag', label: name, meta: { connection_id: cid, name }, children: [] });
        return;
      }
      if (String(c?.type || '') === 'audio_file') {
        state.alarmsEventsSelectedNodeId = String(c?.id || '');
        renderAlarmsEventsTree();
        return;
      }
      if (isAlarmsEvents || isAlarmsRoot || isAlarmGroup || isAlarmSite || isAlarm || isEventLoggingRoot || isEventConnection || isEventTag || isRoutingGroupsRoot || isRoutingGroup || isSchedulesRoot || isSchedule || isAudioFilesRoot || isAudioFile || isNotificationContactsRoot || isNotificationContact || isNotificationContactGroupsRoot || isNotificationContactGroup || isNotificationPoliciesRoot || isNotificationPolicy) {
        openWorkspaceItemModal(c);
      }
    });

    els.alarmsEventsChildrenTbody.appendChild(tr);
  });

  selectedRow = rows.find((r) => String(r?.id || '') === String(state.alarmsEventsSelectedChildId || '')) || selectedRow;
  renderAlarmsEventsProperties(selectedRow, node);
}

function updateAlarmsEventsLiveCells() {
  if (!els.alarmsEventsChildrenTable || !els.alarmsEventsChildrenTbody) return;
  const selectedNodeId = String(state.alarmsEventsSelectedNodeId || '').trim();
  const tree = state.alarmsEventsTreeRoot;
  if (!selectedNodeId || !tree) return;
  const node = findAlarmsEventsNodeById(tree, selectedNodeId);
  const nodeType = String(node?.type || '').trim();
  if (!['alarms_root', 'alarm_groups_root', 'alarm_group', 'alarm_site', 'alarm'].includes(nodeType)) return;

  const cfg = state.alarmsConfig || {};
  const alarmsCfg = Array.isArray(cfg?.alarms) ? cfg.alarms : [];
  const runtime = Array.isArray(state.alarmsAll) ? state.alarmsAll : [];
  const runtimeById = new Map(runtime.map((a) => [String(a?.alarm_id || a?.id || '').trim(), a]));

  const headCells = Array.from(els.alarmsEventsChildrenTable.querySelectorAll('thead th'));
  const colIdx = new Map();
  headCells.forEach((th, idx) => {
    const raw = String(th.textContent || '').replace('▲', '').replace('▼', '').trim();
    if (raw) colIdx.set(raw, idx);
  });

  const setBadge = (td, text, tone) => {
    td.innerHTML = `<span class="badge ${tone}">${escapeHtml(String(text || ''))}</span>`;
  };
  const setText = (td, text) => {
    td.textContent = String(text ?? '');
  };

  Array.from(els.alarmsEventsChildrenTbody.querySelectorAll('tr')).forEach((tr) => {
    const rowId = String(tr.dataset.rowId || '').trim();
    const tds = Array.from(tr.children);
    const put = (name, fn) => {
      const idx = colIdx.get(name);
      if (idx == null || idx < 0 || idx >= tds.length) return;
      fn(tds[idx]);
    };

    if (rowId.startsWith('alarm:')) {
      const alarmId = rowId.slice('alarm:'.length);
      if (!alarmId) return;
      const alarmCfg = alarmsCfg.find((a) => String(a?.id || '').trim() === alarmId) || null;
      if (!alarmCfg) return;
      const rt = runtimeById.get(alarmId) || {};
      const group = String(alarmCfg?.group || '').trim();
      const site = String(alarmCfg?.site || '').trim();
      const siteEnabled = rt?.site_enabled !== false && isAlarmSiteProcessingEnabled(cfg, group, site);
      const enabled = alarmCfg?.enabled !== false;
      const active = Boolean(rt?.active);
      const acked = Boolean(rt?.acked);
      const stateStr = (!enabled) ? 'DISABLED' : (!siteEnabled ? 'SITE DISABLED' : (active ? 'ACTIVE' : 'OK'));
      const effectiveAudio = resolveAlarmAudio(cfg, alarmCfg);

      put('State', (td) => setBadge(td, stateStr, (!enabled || !siteEnabled) ? 'bad' : (active ? 'warn' : 'ok')));
      put('Acked', (td) => setBadge(td, acked ? 'ACKED' : 'UNACKED', acked ? 'ok' : (active ? 'warn' : '')));
      put('Enabled', (td) => setBadge(td, enabled ? 'ENABLED' : 'DISABLED', enabled ? 'ok' : 'bad'));
      put('Audio Sequence', (td) => setText(td, alarmAudioSequenceText(
        effectiveAudio.audio_files || (effectiveAudio.audio_file ? [effectiveAudio.audio_file] : []),
        cfg,
        effectiveAudio.speech_texts || (effectiveAudio.speech_text ? [effectiveAudio.speech_text] : [])
      )));
      return;
    }

    if (rowId.startsWith('alarm_group:') || rowId.includes(':site:')) {
      let group = '';
      let site = '';
      const mSite = rowId.match(/^alarm_group:([^:]+):site:(.+)$/);
      if (mSite) {
        const siteNode = findAlarmsEventsNodeById(tree, rowId);
        group = String(siteNode?.meta?.group || '').trim();
        site = String(siteNode?.meta?.site || '').trim();
      } else {
        const groupNode = findAlarmsEventsNodeById(tree, rowId);
        group = String(groupNode?.meta?.group || '').trim();
      }
      if (!group && !site) return;
      const target = site ? findAlarmSiteConfig(cfg, group, site) : findAlarmGroupConfig(cfg, group);
      const effective = site ? resolveInheritedAlarmAudio(cfg, group, site) : { ...getInheritedAudioForScope(cfg, 'group', group, ''), ...(target || {}) };
      put('Processing', (td) => {
        if (!site) return;
        setBadge(td, target?.alarms_enabled === false ? 'DISABLED' : 'ENABLED', target?.alarms_enabled === false ? 'bad' : 'ok');
      });
      put('Audible', (td) => setBadge(td, effective?.audible_enabled ? 'ENABLED' : 'DISABLED', effective?.audible_enabled ? 'ok' : 'bad'));
      put('Audio Sequence', (td) => setText(td, alarmAudioSequenceText(
        effective?.audio_files || (effective?.audio_file ? [effective.audio_file] : []),
        cfg,
        effective?.speech_texts || (effective?.speech_text ? [effective.speech_text] : [])
      )));
    }
  });
}

function renderAlarmsEventsProperties(item, parentNode) {
  state.alarmsEventsPropsDirty = false;
  const tbody = els.alarmsEventsPropsTbody;
  if (tbody) tbody.textContent = '';
  if (els.alarmsEventsPropsJson) els.alarmsEventsPropsJson.textContent = '';
  if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = '';
  if (els.alarmsEventsPropsEditor) {
    els.alarmsEventsPropsEditor.textContent = '';
    els.alarmsEventsPropsEditor.style.display = 'none';
  }
  if (els.alarmsEventsPropsTable) els.alarmsEventsPropsTable.style.display = '';

  const delBtn = els.alarmsEventsPropsDeleteBtn;
  if (delBtn) delBtn.style.display = 'none';
  if (delBtn) delBtn.onclick = null;
  if (delBtn) delBtn.textContent = 'Delete…';
  const staleAddScheduleBtn = document.getElementById('alarmsEventsAddScheduleBtn');
  if (staleAddScheduleBtn) staleAddScheduleBtn.remove();
  const staleAddPolicyBtn = document.getElementById('alarmsEventsAddPolicyBtn');
  if (staleAddPolicyBtn) staleAddPolicyBtn.remove();
  const staleAddAlarmRouteBtn = document.getElementById('alarmsEventsAddAlarmRouteBtn');
  if (staleAddAlarmRouteBtn) staleAddAlarmRouteBtn.remove();

  const addPropRow = (k, v) => {
    if (!tbody) return;
    const tr = document.createElement('tr');
    const tdK = document.createElement('td');
    const tdV = document.createElement('td');
    tdK.textContent = String(k || '');
    tdK.className = 'audit-cell-dim';
    tdV.textContent = String(v ?? '');
    tr.appendChild(tdK);
    tr.appendChild(tdV);
    tbody.appendChild(tr);
  };

  const setHint = (text) => {
    if (els.alarmsEventsPropsHint) els.alarmsEventsPropsHint.textContent = String(text || 'Properties');
  };

  const setStatus = (text) => {
    if (els.alarmsEventsPropsStatus) els.alarmsEventsPropsStatus.textContent = String(text || '');
  };

  const showEditor = () => {
    if (els.alarmsEventsPropsEditor) els.alarmsEventsPropsEditor.style.display = 'block';
    if (els.alarmsEventsPropsTable) els.alarmsEventsPropsTable.style.display = 'none';
  };

  // Multi-select delete for audio files (children list supports multi-select in audio folders/root).
  {
    const ptype = String(parentNode?.type || '').trim();
    const selectedIds = Array.isArray(state.alarmsEventsSelectedChildIds) ? state.alarmsEventsSelectedChildIds : [];
    if ((ptype === 'audio_files_root' || ptype === 'audio_folder') && selectedIds.length > 1 && delBtn) {
      const tree = state.alarmsEventsTreeRoot;
      const selectedNodes = selectedIds
        .map((id) => findAlarmsEventsNodeById(tree, String(id || '')))
        .filter(Boolean);
      const selectedAudio = selectedNodes.filter((c) => String(c?.type || '') === 'audio_file');
      if (selectedAudio.length) {
        delBtn.style.display = '';
        delBtn.textContent = `Delete Selected (${selectedAudio.length})…`;
        delBtn.onclick = async () => {
          if (!canEditConfig()) { window.alert('Login required to delete.'); return; }
          const ids = selectedAudio.map((n) => String(n?.meta?.id || '').trim()).filter(Boolean);
          try {
            await deleteAlarmAudioFilesByIds(ids);
          } catch (err) {
            window.alert(`Delete failed: ${err.message}`);
          } finally {
            state.alarmsEventsSelectedChildIds = [];
            state.alarmsEventsSelectedChildId = '';
            renderAlarmsEventsTree();
          }
        };
        // Keep the properties pane as-is (single-item properties still render below).
      }
    }
  }

  // Multi-select delete for alarm groups/sites (children list supports multi-select in Alarm Groups).
  {
    const ptype = String(parentNode?.type || '').trim();
    const selectedIds = Array.isArray(state.alarmsEventsSelectedChildIds) ? state.alarmsEventsSelectedChildIds : [];
    if ((ptype === 'alarm_groups_root' || ptype === 'alarm_group') && selectedIds.length > 1 && delBtn) {
      const tree = state.alarmsEventsTreeRoot;
      const selectedNodes = selectedIds
        .map((id) => findAlarmsEventsNodeById(tree, String(id || '')))
        .filter(Boolean);

      if (ptype === 'alarm_groups_root') {
        const selectedGroups = selectedNodes.filter((c) => String(c?.type || '') === 'alarm_group');
        if (selectedGroups.length) {
          delBtn.style.display = '';
          delBtn.textContent = `Delete Selected (${selectedGroups.length})…`;
          delBtn.onclick = async () => {
            const names = selectedGroups.map((n) => String(n?.meta?.group || n?.label || '').trim()).filter(Boolean);
            try {
              await deleteAlarmGroupsBulk(names);
            } catch (err) {
              window.alert(`Delete failed: ${err.message}`);
            } finally {
              state.alarmsEventsSelectedChildIds = [];
              state.alarmsEventsSelectedChildId = '';
              renderAlarmsEventsTree();
            }
          };
        }
      } else if (ptype === 'alarm_group') {
        const group = String(parentNode?.meta?.group || parentNode?.label || '').trim();
        const selectedSites = selectedNodes.filter((c) => String(c?.type || '') === 'alarm_site');
        if (group && selectedSites.length) {
          delBtn.style.display = '';
          delBtn.textContent = `Delete Selected (${selectedSites.length})…`;
          delBtn.onclick = async () => {
            const names = selectedSites.map((n) => String(n?.meta?.site || n?.label || '').trim()).filter(Boolean);
            try {
              await deleteAlarmSitesBulk(group, names);
            } catch (err) {
              window.alert(`Delete failed: ${err.message}`);
            } finally {
              state.alarmsEventsSelectedChildIds = [];
              state.alarmsEventsSelectedChildId = '';
              renderAlarmsEventsTree();
            }
          };
        }
      }
    }
  }

  if (!item) {
    const label = String(parentNode?.label || '').trim();
    setHint(label ? `Properties · ${label}` : 'Properties');
    const ptype = String(parentNode?.type || '').trim();
    if (['notification_contacts_root', 'notification_contact_groups_root', 'notification_policies_root', 'notification_policy_type_root', 'routing_groups_root', 'schedules_root'].includes(ptype)) {
      showEditor();
      const host = els.alarmsEventsPropsEditor;
      if (!host) return;
      const wrap = document.createElement('div');
      wrap.className = 'form';
      wrap.style.maxWidth = '900px';
      const note = document.createElement('div');
      note.className = 'hint';
      note.textContent = 'No items configured yet.';
      wrap.appendChild(note);
      const actions = document.createElement('div');
      actions.className = 'row-actions';
      actions.style.marginTop = '10px';
      const addBtn = document.createElement('button');
      addBtn.className = 'btn primary';
      addBtn.type = 'button';
      addBtn.disabled = !canEditConfig();
      if (ptype === 'notification_contacts_root') {
        addBtn.textContent = 'Add Contact';
        addBtn.onclick = () => createNotificationContactInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
      } else if (ptype === 'notification_contact_groups_root') {
        addBtn.textContent = 'Add Contact Group';
        addBtn.onclick = () => createNotificationContactGroupInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
      } else if (ptype === 'schedules_root') {
        addBtn.textContent = 'Add Schedule';
        addBtn.onclick = () => createScheduleInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
      } else if (ptype === 'routing_groups_root') {
        addBtn.textContent = 'Add Alarm Route';
        addBtn.onclick = () => createRoutingGroupInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
      } else if (ptype === 'notification_policy_type_root') {
        const outputType = String(parentNode?.meta?.policy_type || 'phone').trim().toLowerCase();
        addBtn.textContent = `Add ${outputType.toUpperCase()} Policy`;
        addBtn.onclick = () => createNotificationPolicyInteractive(outputType).catch((err) => setStatus(`Create failed: ${err.message}`));
      } else {
        addBtn.textContent = 'Add Phone Policy';
        addBtn.onclick = () => createNotificationPolicyInteractive('phone').catch((err) => setStatus(`Create failed: ${err.message}`));
      }
      actions.appendChild(addBtn);
      wrap.appendChild(actions);
      host.appendChild(wrap);
      return;
    }
    if (ptype === 'audio_files_root' || ptype === 'audio_folder') {
      showEditor();
      const host = els.alarmsEventsPropsEditor;
      if (!host) return;
      const folder = ptype === 'audio_folder' ? String(parentNode?.meta?.folder || '').trim() : '';
      const wrap = document.createElement('div');
      wrap.className = 'form';
      wrap.style.maxWidth = '900px';
      const note = document.createElement('div');
      note.className = 'hint';
      note.textContent = folder ? `Audio folder: audio/${folder}` : 'Audio root folder.';
      wrap.appendChild(note);
      const actions = document.createElement('div');
      actions.className = 'row-actions';
      actions.style.marginTop = '10px';
      const newBtn = document.createElement('button');
      newBtn.className = 'btn';
      newBtn.type = 'button';
      newBtn.textContent = folder ? 'New Subfolder' : 'New Folder';
      newBtn.disabled = !canEditConfig();
      newBtn.onclick = () => createAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder create failed: ${err.message}`));
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'btn primary';
      uploadBtn.type = 'button';
      uploadBtn.textContent = folder ? 'Upload Here' : 'Upload Audio File';
      uploadBtn.disabled = !canEditConfig();
      uploadBtn.onclick = () => chooseAndUploadAlarmAudioFile(folder);
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn bad';
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete Folder';
      deleteBtn.disabled = !canEditConfig() || !folder;
      deleteBtn.onclick = () => deleteAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder delete failed: ${err.message}`));
      actions.appendChild(newBtn);
      actions.appendChild(uploadBtn);
      if (folder) actions.appendChild(deleteBtn);
      wrap.appendChild(actions);
      host.appendChild(wrap);
      return;
    }
    addPropRow('Selection', 'Select an item above to view properties.');
    return;
  }

  const type = String(item?.type || '').trim();
  const label = String(item?.label || item?.id || '').trim();
  setHint(label ? `Properties · ${label}` : 'Properties');

  const cfg = state.alarmsConfig || {};

  const raw = (() => {
    try { return JSON.stringify(item, null, 2); } catch { return String(item || ''); }
  })();
  if (els.alarmsEventsPropsJson) els.alarmsEventsPropsJson.textContent = raw;

  if (type === 'hint' && ['notification_contacts_root', 'notification_contact_groups_root', 'notification_policies_root', 'notification_policy_type_root', 'routing_groups_root', 'schedules_root'].includes(String(parentNode?.type || ''))) {
    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.className = 'form';
    wrap.style.maxWidth = '900px';
    const note = document.createElement('div');
    note.className = 'hint';
    note.textContent = String(item?.label || 'No items configured yet.');
    wrap.appendChild(note);
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn primary';
    addBtn.type = 'button';
    addBtn.disabled = !canEditConfig();
    const ptype = String(parentNode?.type || '');
    if (ptype === 'notification_contacts_root') {
      addBtn.textContent = 'Add Contact';
      addBtn.onclick = () => createNotificationContactInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
    } else if (ptype === 'notification_contact_groups_root') {
      addBtn.textContent = 'Add Contact Group';
      addBtn.onclick = () => createNotificationContactGroupInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
    } else if (ptype === 'schedules_root') {
      addBtn.textContent = 'Add Schedule';
      addBtn.onclick = () => createScheduleInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
    } else if (ptype === 'routing_groups_root') {
      addBtn.textContent = 'Add Alarm Route';
      addBtn.onclick = () => createRoutingGroupInteractive().catch((err) => setStatus(`Create failed: ${err.message}`));
    } else if (ptype === 'notification_policy_type_root') {
      const outputType = String(parentNode?.meta?.policy_type || 'phone').trim().toLowerCase();
      addBtn.textContent = `Add ${outputType.toUpperCase()} Policy`;
      addBtn.onclick = () => createNotificationPolicyInteractive(outputType).catch((err) => setStatus(`Create failed: ${err.message}`));
    } else {
      addBtn.textContent = 'Add Phone Policy';
      addBtn.onclick = () => createNotificationPolicyInteractive('phone').catch((err) => setStatus(`Create failed: ${err.message}`));
    }
    actions.appendChild(addBtn);
    wrap.appendChild(actions);
    host.appendChild(wrap);
    return;
  }

  if (type === 'notification_contact') {
    const contactId = String(item?.meta?.id || '').trim();
    const cur = getNotificationContacts(cfg).find((c) => String(c?.id || '').trim() === contactId) || item?.meta || {};
    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';
    state.alarmsEventsPropsDirty = false;
    const markPropsDirty = () => { state.alarmsEventsPropsDirty = true; };
    const addRow = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const idBox = document.createElement('input');
    idBox.type = 'text';
    idBox.value = contactId;
    idBox.disabled = !canEditConfig();
    addRow('Contact ID', idBox);

    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.value = String(cur?.name || item?.label || contactId);
    nameBox.disabled = !canEditConfig();
    addRow('Name', nameBox);

    const phoneBox = document.createElement('input');
    phoneBox.type = 'text';
    phoneBox.value = String(cur?.phone || '');
    phoneBox.placeholder = '+15551234567';
    phoneBox.disabled = !canEditConfig();
    addRow('Phone', phoneBox);

    const { checkbox: enabledBox, wrap: enabledWrap } = makeLabeledCheckbox('Enabled', cur?.enabled !== false, !canEditConfig());
    addRow('Enabled', enabledWrap);

    const notesBox = document.createElement('textarea');
    notesBox.rows = 3;
    notesBox.value = String(cur?.notes || '');
    notesBox.disabled = !canEditConfig();
    addRow('Notes', notesBox);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = !canEditConfig();
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.type = 'button';
    addBtn.textContent = 'Add Contact';
    addBtn.disabled = !canEditConfig();
    actions.appendChild(saveBtn);
    actions.appendChild(addBtn);
    form.appendChild(actions);

    saveBtn.addEventListener('click', async () => {
      if (!canEditConfig()) { setStatus('Login required to edit contacts.'); return; }
      setStatus('Saving…');
	      try {
	        const nextCfg = await loadOpcbridgeAlarmsConfig();
	        if (!Array.isArray(nextCfg.targets)) nextCfg.targets = [];
	        const idx = nextCfg.targets.findIndex((t) => t && typeof t === 'object' && !Array.isArray(t) && String(t.type || '') === 'phone' && String(t.id || '').trim() === contactId);
	        if (idx < 0) throw new Error(`Contact '${contactId}' not found.`);
	        const nextId = validateConfigId(idBox.value, 'Contact ID');
	        if (nextId !== contactId && nextCfg.targets.some((t) => t && typeof t === 'object' && !Array.isArray(t) && String(t.type || '') === 'phone' && String(t.id || '').trim() === nextId)) {
	          throw new Error(`Contact ID '${nextId}' already exists.`);
	        }
	        const phone = String(phoneBox.value || '').trim();
	        if (!phone) throw new Error('Phone is required.');
	        nextCfg.targets[idx] = {
	          ...(nextCfg.targets[idx] || {}),
	          id: nextId,
	          type: 'phone',
	          name: String(nameBox.value || '').trim() || nextId,
	          value: phone,
	          enabled: Boolean(enabledBox.checked),
	          notes: String(notesBox.value || '').trim()
	        };
	        if (nextId !== contactId) {
	          nextCfg.targets.forEach((t) => {
	            if (!t || typeof t !== 'object' || Array.isArray(t)) return;
	            if (String(t.type || '').trim() !== 'group') return;
	            t.members = (Array.isArray(t.members) ? t.members : []).map((cid) => String(cid || '').trim() === contactId ? nextId : cid);
	          });
	          getNotificationPolicies(nextCfg).forEach((p) => {
	            p.targets = (Array.isArray(p.targets) ? p.targets : []).map((target) => {
	              if (String(target?.type || '') === 'contact' && String(target?.id || '').trim() === contactId) return { ...target, id: nextId };
	              return target;
	            });
	          });
	        }
        await saveOpcbridgeAlarmsConfig(nextCfg);
        await loadOpcbridgeAlarmsConfig();
        state.alarmsEventsSelectedNodeId = 'folder:notification_contacts';
        state.alarmsEventsSelectedChildId = `notification_contact:${nextId}`;
        renderAlarmsEventsTree();
        setStatus('Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });
    addBtn.addEventListener('click', () => createNotificationContactInteractive().catch((err) => setStatus(`Create failed: ${err.message}`)));

    host.appendChild(form);
    if (delBtn) {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete Contact…';
      delBtn.onclick = () => deleteNotificationItem('contact', contactId).catch((err) => window.alert(`Contact delete failed: ${err.message}`));
    }
    return;
  }

  if (type === 'notification_contact_group') {
    const groupId = String(item?.meta?.id || '').trim();
    const cur = getNotificationContactGroups(cfg).find((g) => String(g?.id || '').trim() === groupId) || item?.meta || {};
    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';
    const addRow = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const idBox = document.createElement('input');
    idBox.type = 'text';
    idBox.value = groupId;
    idBox.disabled = !canEditConfig();
    addRow('Group ID', idBox);

    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.value = String(cur?.name || item?.label || groupId);
    nameBox.disabled = !canEditConfig();
    addRow('Name', nameBox);

    const { checkbox: enabledBox, wrap: enabledWrap } = makeLabeledCheckbox('Enabled', cur?.enabled !== false, !canEditConfig());
    addRow('Enabled', enabledWrap);

    const availableContacts = getNotificationContacts(cfg)
      .slice()
      .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
    const contactsList = makeOrderedSelectionEditor({
      emptyText: 'No contacts selected.',
      addLabel: 'Add Contact',
      availableItems: availableContacts.map((contact) => {
        const id = String(contact?.id || '').trim();
        return {
          key: id,
          label: String(contact?.name || id),
          meta: `${String(contact?.phone || 'no phone')} · ${id}${contact?.enabled === false ? ' · disabled' : ''}`
        };
      }),
      selectedItems: dedupeStringsInOrder(cur?.contacts).map((id) => ({ key: id }))
    });
    addRow('Contacts In Call Order', contactsList);

    const orderHint = document.createElement('div');
    orderHint.className = 'hint';
    orderHint.textContent = 'Contacts in this group are called in the order shown. Duplicate contacts from a policy are skipped at call time.';
    form.appendChild(orderHint);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = !canEditConfig();
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.type = 'button';
    addBtn.textContent = 'Add Contact Group';
    addBtn.disabled = !canEditConfig();
    actions.appendChild(saveBtn);
    actions.appendChild(addBtn);
    form.appendChild(actions);

    saveBtn.addEventListener('click', async () => {
      if (!canEditConfig()) { setStatus('Login required to edit contact groups.'); return; }
	      setStatus('Saving…');
	      try {
	        const nextCfg = await loadOpcbridgeAlarmsConfig();
	        if (!Array.isArray(nextCfg.targets)) nextCfg.targets = [];
	        const idx = nextCfg.targets.findIndex((t) => t && typeof t === 'object' && !Array.isArray(t) && String(t.type || '') === 'group' && String(t.id || '').trim() === groupId);
	        if (idx < 0) throw new Error(`Contact group '${groupId}' not found.`);
	        const nextId = validateConfigId(idBox.value, 'Group ID');
	        if (nextId !== groupId && nextCfg.targets.some((t) => t && typeof t === 'object' && !Array.isArray(t) && String(t.type || '') === 'group' && String(t.id || '').trim() === nextId)) {
	          throw new Error(`Group ID '${nextId}' already exists.`);
	        }
	        const validContacts = new Set(getNotificationContacts(nextCfg).map((c) => String(c?.id || '').trim()).filter(Boolean));
	        const contacts = contactsList.getSelectedKeys();
	        const missing = contacts.filter((cid) => !validContacts.has(cid));
	        if (missing.length) throw new Error(`Unknown contact ID(s): ${missing.join(', ')}`);
	        nextCfg.targets[idx] = {
	          ...(nextCfg.targets[idx] || {}),
	          id: nextId,
	          type: 'group',
	          name: String(nameBox.value || '').trim() || nextId,
	          enabled: Boolean(enabledBox.checked),
	          members: contacts
	        };
	        if (nextId !== groupId) {
	          getNotificationPolicies(nextCfg).forEach((p) => {
	            p.targets = (Array.isArray(p.targets) ? p.targets : []).map((target) => {
	              if (String(target?.type || '') === 'group' && String(target?.id || '').trim() === groupId) return { ...target, id: nextId };
	              return target;
	            });
	          });
	        }
        await saveOpcbridgeAlarmsConfig(nextCfg);
        await loadOpcbridgeAlarmsConfig();
        state.alarmsEventsSelectedNodeId = 'folder:notification_contact_groups';
        state.alarmsEventsSelectedChildId = `notification_contact_group:${nextId}`;
        renderAlarmsEventsTree();
        setStatus('Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });
    addBtn.addEventListener('click', () => createNotificationContactGroupInteractive().catch((err) => setStatus(`Create failed: ${err.message}`)));

    host.appendChild(form);
    if (delBtn) {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete Group…';
      delBtn.onclick = () => deleteNotificationItem('group', groupId).catch((err) => window.alert(`Group delete failed: ${err.message}`));
    }
    return;
  }

  if (type === 'routing_group') {
    const routingGroupId = String(item?.meta?.id || '').trim();
    const cur = getRoutingAlarmGroups(cfg).find((g) => String(g?.id || '').trim() === routingGroupId) || item?.meta || {};
    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';
    const addRow = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const idBox = document.createElement('input');
    idBox.type = 'text';
    idBox.value = routingGroupId;
    idBox.disabled = !canEditConfig();
    addRow('Group ID', idBox);

    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.value = String(cur?.name || item?.label || routingGroupId);
    nameBox.disabled = !canEditConfig();
    addRow('Name', nameBox);

    const { checkbox: enabledBox, wrap: enabledWrap } = makeLabeledCheckbox('Enabled', cur?.enabled !== false, !canEditConfig());
    addRow('Enabled', enabledWrap);

    const scheduleSel = document.createElement('select');
    scheduleSel.disabled = !canEditConfig();
    const schedules = getSchedules(cfg)
      .map((s) => ({ id: String(s?.id || '').trim(), type: String(s?.type || '').trim() }))
      .filter((s) => s.id);
    if (!schedules.some((s) => s.id === 'always')) schedules.unshift({ id: 'always', type: 'always' });
    schedules.forEach((s) => scheduleSel.appendChild(new Option(`${s.id} (${s.type || 'always'})`, s.id)));
    const scheduleWant = String(cur?.schedule_id || 'always').trim() || 'always';
    if (!schedules.some((s) => s.id === scheduleWant)) scheduleSel.appendChild(new Option(`${scheduleWant} (missing)`, scheduleWant));
    scheduleSel.value = scheduleWant;
    addRow('Schedule', scheduleSel);

    const alarms = (Array.isArray(cfg?.alarms) ? cfg.alarms : [])
      .slice()
      .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
    const selectedAlarms = new Set(dedupeStringsInOrder(cur?.alarms));
    const pickWrap = document.createElement('div');
    pickWrap.style.display = 'grid';
    pickWrap.style.gap = '8px';
    const filtersWrap = document.createElement('div');
    filtersWrap.style.display = 'grid';
    filtersWrap.style.gridTemplateColumns = '1fr 1fr 1fr';
    filtersWrap.style.gap = '8px';
    const groupFilter = document.createElement('select');
    const siteFilter = document.createElement('select');
    const alarmFilter = document.createElement('input');
    alarmFilter.type = 'text';
    alarmFilter.placeholder = 'Filter by alarm name or ID';
    alarmFilter.disabled = !canEditConfig();
    const groups = Array.from(new Set(alarms.map((a) => String(a?.group || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    groupFilter.appendChild(new Option('All groups', ''));
    groups.forEach((g) => groupFilter.appendChild(new Option(g, g)));
    groupFilter.disabled = !canEditConfig();
    const sites = Array.from(new Set(alarms.map((a) => String(a?.site || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    siteFilter.appendChild(new Option('All sites', ''));
    sites.forEach((s) => siteFilter.appendChild(new Option(s, s)));
    siteFilter.disabled = !canEditConfig();
    filtersWrap.appendChild(groupFilter);
    filtersWrap.appendChild(siteFilter);
    filtersWrap.appendChild(alarmFilter);
    const listsWrap = document.createElement('div');
    listsWrap.style.display = 'grid';
    listsWrap.style.gridTemplateColumns = '1fr auto 1fr';
    listsWrap.style.gap = '8px';
    const available = document.createElement('select');
    available.size = 12;
    available.multiple = true;
    available.disabled = !canEditConfig();
    const pickActions = document.createElement('div');
    pickActions.className = 'row-actions';
    pickActions.style.flexDirection = 'column';
    const addPickBtn = document.createElement('button');
    addPickBtn.className = 'btn';
    addPickBtn.type = 'button';
    addPickBtn.textContent = '→';
    addPickBtn.disabled = !canEditConfig();
    const removePickBtn = document.createElement('button');
    removePickBtn.className = 'btn bad';
    removePickBtn.type = 'button';
    removePickBtn.textContent = '←';
    removePickBtn.disabled = !canEditConfig();
    pickActions.appendChild(addPickBtn);
    pickActions.appendChild(removePickBtn);
    const bulkActions = document.createElement('div');
    bulkActions.className = 'row-actions';
    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'btn';
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select All Filtered';
    selectAllBtn.disabled = !canEditConfig();
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'btn bad';
    clearAllBtn.type = 'button';
    clearAllBtn.textContent = 'Clear Selected';
    clearAllBtn.disabled = !canEditConfig();
    bulkActions.appendChild(selectAllBtn);
    bulkActions.appendChild(clearAllBtn);
    const selected = document.createElement('select');
    selected.size = 12;
    selected.multiple = true;
    selected.disabled = !canEditConfig();
    const renderAlarmLists = () => {
      available.textContent = '';
      selected.textContent = '';
      const groupWant = String(groupFilter.value || '').trim();
      const siteWant = String(siteFilter.value || '').trim();
      const textWant = String(alarmFilter.value || '').trim().toLowerCase();
      alarms.forEach((alarm) => {
        const aid = String(alarm?.id || '').trim();
        if (!aid) return;
        const alarmName = String(alarm?.name || aid);
        const groupName = String(alarm?.group || '').trim();
        const siteName = String(alarm?.site || '').trim();
        const label = `${alarmName} (${aid})`;
        const matchGroup = !groupWant || groupName === groupWant;
        const matchSite = !siteWant || siteName === siteWant;
        const matchText = !textWant || label.toLowerCase().includes(textWant);
        if (!matchGroup || !matchSite || !matchText) return;
        if (!selectedAlarms.has(aid)) {
          const opt = document.createElement('option');
          opt.value = aid;
          opt.textContent = `${label} · ${groupName || '-'} / ${siteName || '-'}`;
          available.appendChild(opt);
        }
      });
      alarms.forEach((alarm) => {
        const aid = String(alarm?.id || '').trim();
        if (!aid || !selectedAlarms.has(aid)) return;
        const alarmName = String(alarm?.name || aid);
        const groupName = String(alarm?.group || '').trim();
        const siteName = String(alarm?.site || '').trim();
        const opt = document.createElement('option');
        opt.value = aid;
        opt.textContent = `${alarmName} (${aid}) · ${groupName || '-'} / ${siteName || '-'}`;
        selected.appendChild(opt);
      });
    };
    addPickBtn.onclick = () => {
      Array.from(available.selectedOptions).forEach((opt) => selectedAlarms.add(String(opt.value || '').trim()));
      renderAlarmLists();
    };
    removePickBtn.onclick = () => {
      Array.from(selected.selectedOptions).forEach((opt) => selectedAlarms.delete(String(opt.value || '').trim()));
      renderAlarmLists();
    };
    selectAllBtn.onclick = () => {
      Array.from(available.options).forEach((opt) => selectedAlarms.add(String(opt.value || '').trim()));
      renderAlarmLists();
    };
    clearAllBtn.onclick = () => {
      selectedAlarms.clear();
      renderAlarmLists();
    };
    [groupFilter, siteFilter].forEach((el) => el.addEventListener('change', renderAlarmLists));
    alarmFilter.addEventListener('input', renderAlarmLists);
    listsWrap.appendChild(available);
    listsWrap.appendChild(pickActions);
    listsWrap.appendChild(selected);
    pickWrap.appendChild(filtersWrap);
    pickWrap.appendChild(listsWrap);
    pickWrap.appendChild(bulkActions);
    const multiHint = document.createElement('div');
    multiHint.className = 'hint';
    multiHint.textContent = 'Tip: use Ctrl+Click (Cmd+Click on Mac) or Shift+Click for multi-select in each list.';
    pickWrap.appendChild(multiHint);
    pickWrap.getSelectedKeys = () => Array.from(selectedAlarms.values());
    renderAlarmLists();
    addRow('Alarms', pickWrap);

    const selectedPolicies = new Set(dedupeStringsInOrder(cur?.policy_ids));
    const outputsWrap = document.createElement('div');
    outputsWrap.style.display = 'grid';
    outputsWrap.style.gap = '4px';
    outputsWrap.style.maxHeight = '220px';
    outputsWrap.style.overflow = 'auto';
    outputsWrap.style.padding = '8px';
    outputsWrap.style.border = '1px solid var(--border)';
    outputsWrap.style.borderRadius = '8px';
    const policies = getNotificationPolicies(cfg)
      .slice()
      .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
    if (!policies.length) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'No policies configured.';
      outputsWrap.appendChild(empty);
    } else {
      policies.forEach((policy) => {
        const id = String(policy?.id || '').trim();
        if (!id) return;
        const row = document.createElement('label');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '18px 1fr';
        row.style.alignItems = 'center';
        row.style.columnGap = '8px';
        row.style.padding = '4px 2px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedPolicies.has(id);
        cb.disabled = !canEditConfig();
        cb.addEventListener('change', () => {
          if (cb.checked) selectedPolicies.add(id);
          else selectedPolicies.delete(id);
        });
        const ptype = getPolicyOutputType(policy).toUpperCase();
        const text = document.createElement('span');
        text.style.textAlign = 'left';
        text.textContent = `[${ptype}] ${String(policy?.name || id)} (${id})${policy?.enabled === false ? ' · disabled' : ''}`;
        row.appendChild(cb);
        row.appendChild(text);
        outputsWrap.appendChild(row);
      });
    }
    outputsWrap.getSelectedKeys = () => Array.from(selectedPolicies.values());
    addRow('Outputs', outputsWrap);
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Route membership is separate from alarm creation. This route uses the selected schedule and notification policies for alarms in this list.';
    form.appendChild(hint);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = !canEditConfig();
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    saveBtn.addEventListener('click', async () => {
      if (!canEditConfig()) { setStatus('Login required to edit alarm routes.'); return; }
      setStatus('Saving…');
      try {
        const nextCfg = await loadOpcbridgeAlarmsConfig();
        const groups = getRoutingAlarmGroups(nextCfg);
        const idx = groups.findIndex((g) => String(g?.id || '').trim() === routingGroupId);
        if (idx < 0) throw new Error(`Routing group '${routingGroupId}' not found.`);
        const nextId = validateConfigId(idBox.value, 'Group ID');
        if (nextId !== routingGroupId && groups.some((g) => String(g?.id || '').trim() === nextId)) throw new Error(`Group ID '${nextId}' already exists.`);
        const alarmsNow = pickWrap.getSelectedKeys();
        const validAlarmIds = new Set((Array.isArray(nextCfg?.alarms) ? nextCfg.alarms : []).map((a) => String(a?.id || '').trim()).filter(Boolean));
        const missing = alarmsNow.filter((id) => !validAlarmIds.has(id));
        const alarmsFiltered = alarmsNow.filter((id) => validAlarmIds.has(id));
        groups[idx] = {
          ...(groups[idx] || {}),
          id: nextId,
          name: String(nameBox.value || '').trim() || nextId,
          enabled: Boolean(enabledBox.checked),
          schedule_id: String(scheduleSel.value || 'always').trim() || 'always',
          policy_ids: dedupeStringsInOrder(outputsWrap.getSelectedKeys()),
          alarms: alarmsFiltered
        };
        syncAlarmGroupMembershipFromRoutingGroups(nextCfg);
        await saveOpcbridgeAlarmsConfig(nextCfg);
        await loadOpcbridgeAlarmsConfig();
        state.alarmsEventsSelectedNodeId = 'folder:routing_groups';
        state.alarmsEventsSelectedChildId = `routing_group:${nextId}`;
        renderAlarmsEventsTree();
        setStatus(missing.length
          ? `Saved. Removed missing alarm ID(s): ${missing.join(', ')}`
          : 'Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });
    host.appendChild(form);
    if (delBtn) {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete Alarm Route…';
      delBtn.onclick = () => deleteRoutingGroupItem(routingGroupId).catch((err) => window.alert(`Alarm route delete failed: ${err.message}`));
      const existingAdd = document.getElementById('alarmsEventsAddAlarmRouteBtn');
      if (existingAdd) existingAdd.remove();
      const addAlarmRouteBtn = document.createElement('button');
      addAlarmRouteBtn.id = 'alarmsEventsAddAlarmRouteBtn';
      addAlarmRouteBtn.className = 'btn';
      addAlarmRouteBtn.type = 'button';
      addAlarmRouteBtn.textContent = 'Add Alarm Route';
      addAlarmRouteBtn.disabled = !canEditConfig();
      addAlarmRouteBtn.addEventListener('click', () => createRoutingGroupInteractive().catch((err) => setStatus(`Create failed: ${err.message}`)));
      delBtn.insertAdjacentElement('beforebegin', addAlarmRouteBtn);
    }
    return;
  }

  if (type === 'schedule') {
    try {
      const scheduleId = String(
        item?.meta?.id ||
        (String(item?.id || '').startsWith('schedule:') ? String(item.id).slice('schedule:'.length) : '')
      ).trim();
      const cur = getSchedules(cfg).find((s) => String(s?.id || '').trim() === scheduleId) || item?.meta || {};
      const scheduleTypes = ['always', 'custom', 'inverse_of'];
      const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      showEditor();
      const host = els.alarmsEventsPropsEditor;
      if (!host) return;

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';
    const addRow = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const idBox = document.createElement('input');
    idBox.type = 'text';
    idBox.value = scheduleId;
    idBox.disabled = !canEditConfig();
    addRow('Schedule ID', idBox);

    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.value = String(cur?.name || item?.label || scheduleId);
    nameBox.disabled = !canEditConfig();
    addRow('Name', nameBox);

    const { checkbox: enabledBox, wrap: enabledWrap } = makeLabeledCheckbox('Enabled', cur?.enabled !== false, !canEditConfig());
    addRow('Enabled', enabledWrap);

    const typeSel = document.createElement('select');
    typeSel.disabled = !canEditConfig();
    scheduleTypes.forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      typeSel.appendChild(opt);
    });
    typeSel.value = scheduleTypes.includes(String(cur?.type || '')) ? String(cur?.type || '') : 'custom';
    addRow('Type', typeSel);

    const calendarStub = document.createElement('input');
    calendarStub.type = 'text';
    calendarStub.value = '';
    calendarStub.placeholder = 'Calendar/date exceptions (future enhancement)';
    calendarStub.disabled = true;
    addRow('Calendar Overrides', calendarStub);

    const inverseSel = document.createElement('select');
    inverseSel.disabled = !canEditConfig();
    const schedules = getSchedules(cfg)
      .map((s) => ({ id: String(s?.id || '').trim(), name: String(s?.name || s?.id || '').trim() }))
      .filter((s) => s.id && s.id !== scheduleId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    inverseSel.appendChild(new Option('Select schedule…', ''));
    schedules.forEach((s) => inverseSel.appendChild(new Option(`${s.name} (${s.id})`, s.id)));
    inverseSel.value = String(cur?.schedule_id || '').trim();
    addRow('Inverse Of', inverseSel);

    const customDaysWrap = document.createElement('div');
    customDaysWrap.style.display = 'flex';
    customDaysWrap.style.flexWrap = 'wrap';
    customDaysWrap.style.gap = '8px';
    const customDayChecks = new Map();
    const curCustomDays = new Set((Array.isArray(cur?.days) ? cur.days : ['mon', 'tue', 'wed', 'thu', 'fri'])
      .map((d) => String(d || '').toLowerCase())
      .filter((d) => dayOrder.includes(d)));
    dayOrder.forEach((day) => {
      const lab = document.createElement('label');
      lab.style.display = 'inline-flex';
      lab.style.alignItems = 'center';
      lab.style.gap = '5px';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = curCustomDays.has(day);
      cb.disabled = !canEditConfig();
      customDayChecks.set(day, cb);
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(day.toUpperCase()));
      customDaysWrap.appendChild(lab);
    });
    addRow('Days', customDaysWrap);

    const customDateWrap = document.createElement('div');
    customDateWrap.style.display = 'grid';
    customDateWrap.style.gridTemplateColumns = '1fr 1fr';
    customDateWrap.style.gap = '10px';
    const customStartDate = document.createElement('input');
    customStartDate.type = 'date';
    customStartDate.value = String(cur?.start_date || '').trim();
    customStartDate.disabled = !canEditConfig();
    const customEndDate = document.createElement('input');
    customEndDate.type = 'date';
    customEndDate.value = String(cur?.end_date || '').trim();
    customEndDate.disabled = !canEditConfig();
    customDateWrap.appendChild(customStartDate);
    customDateWrap.appendChild(customEndDate);
    addRow('Start/End Date', customDateWrap);

    const customTimeWrap = document.createElement('div');
    customTimeWrap.style.display = 'grid';
    customTimeWrap.style.gridTemplateColumns = '1fr 1fr';
    customTimeWrap.style.gap = '10px';
    const customStartTime = document.createElement('input');
    customStartTime.type = 'time';
    customStartTime.value = String(cur?.start_time || '').trim();
    customStartTime.disabled = !canEditConfig();
    const customEndTime = document.createElement('input');
    customEndTime.type = 'time';
    customEndTime.value = String(cur?.end_time || '').trim();
    customEndTime.disabled = !canEditConfig();
    customTimeWrap.appendChild(customStartTime);
    customTimeWrap.appendChild(customEndTime);
    addRow('Start/End Time', customTimeWrap);

    const scheduleHint = document.createElement('div');
    scheduleHint.className = 'hint';
    scheduleHint.textContent = 'Custom supports optional dates and optional times (blank times = all day). Inverse Of negates another schedule.';
    form.appendChild(scheduleHint);
    const schedulePreview = document.createElement('div');
    schedulePreview.className = 'hint';
    form.appendChild(schedulePreview);

    const renderSchedulePreview = () => {
      const previewId = String(idBox.value || scheduleId).trim() || scheduleId;
      const previewType = String(typeSel.value || 'custom').trim();
      const preview = {
        id: previewId,
        enabled: Boolean(enabledBox.checked),
        type: previewType
      };
      if (previewType === 'custom') {
        preview.days = dayOrder.filter((day) => customDayChecks.get(day)?.checked);
        preview.start_date = String(customStartDate.value || '').trim();
        preview.end_date = String(customEndDate.value || '').trim();
        preview.start_time = String(customStartTime.value || '').trim();
        preview.end_time = String(customEndTime.value || '').trim();
      } else if (previewType === 'inverse_of') {
        preview.schedule_id = String(inverseSel.value || '').trim();
      }
      const schedulesForPreview = getSchedules(cfg).filter((s) => String(s?.id || '').trim() !== previewId).concat([preview]);
      const active = evaluateScheduleActiveClient(previewId, schedulesForPreview, new Date());
      const nowText = new Date().toLocaleString();
      schedulePreview.textContent = `Preview now (${nowText}): ${active ? 'ACTIVE' : 'INACTIVE'}`;
    };

    const syncTypeVisibility = () => {
      const type = String(typeSel.value || 'custom');
      const custom = type === 'custom';
      const inverse = type === 'inverse_of';
      customDayChecks.forEach((cb) => {
        cb.disabled = !canEditConfig() || !custom;
        cb.addEventListener('change', renderSchedulePreview);
      });
      customStartDate.disabled = !canEditConfig() || !custom;
      customEndDate.disabled = !canEditConfig() || !custom;
      customStartTime.disabled = !canEditConfig() || !custom;
      customEndTime.disabled = !canEditConfig() || !custom;
      customStartDate.addEventListener('change', renderSchedulePreview);
      customEndDate.addEventListener('change', renderSchedulePreview);
      customStartTime.addEventListener('change', renderSchedulePreview);
      customEndTime.addEventListener('change', renderSchedulePreview);
      inverseSel.disabled = !canEditConfig() || !inverse;
      renderSchedulePreview();
    };
    typeSel.addEventListener('change', syncTypeVisibility);
    idBox.addEventListener('input', renderSchedulePreview);
    enabledBox.addEventListener('change', renderSchedulePreview);
    inverseSel.addEventListener('change', renderSchedulePreview);
    syncTypeVisibility();

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = !canEditConfig();
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    saveBtn.addEventListener('click', async () => {
      if (!canEditConfig()) { setStatus('Login required to edit schedules.'); return; }
      setStatus('Saving…');
      try {
        const nextCfg = await loadOpcbridgeAlarmsConfig();
        const schedulesNow = getSchedules(nextCfg);
        const idx = schedulesNow.findIndex((s) => String(s?.id || '').trim() === scheduleId);
        if (idx < 0) throw new Error(`Schedule '${scheduleId}' not found.`);
        const nextId = validateConfigId(idBox.value, 'Schedule ID');
        if (nextId !== scheduleId && schedulesNow.some((s) => String(s?.id || '').trim() === nextId)) throw new Error(`Schedule ID '${nextId}' already exists.`);
        const nextType = String(typeSel.value || 'custom').trim();
        const nextSchedule = {
          ...(schedulesNow[idx] || {}),
          id: nextId,
          name: String(nameBox.value || '').trim() || nextId,
          type: nextType,
          enabled: Boolean(enabledBox.checked)
        };
        if (nextType === 'custom') {
          const days = dayOrder.filter((day) => customDayChecks.get(day)?.checked);
          if (!days.length) throw new Error('Select at least one day.');
          const startDate = String(customStartDate.value || '').trim();
          const endDate = String(customEndDate.value || '').trim();
          if (startDate && endDate && endDate < startDate) throw new Error('End Date must be on or after Start Date.');
          const startTime = String(customStartTime.value || '').trim();
          const endTime = String(customEndTime.value || '').trim();
          if ((startTime && !endTime) || (!startTime && endTime)) throw new Error('Set both Start Time and End Time, or leave both blank for all day.');
          nextSchedule.days = days;
          nextSchedule.start_date = startDate;
          nextSchedule.end_date = endDate;
          nextSchedule.start_time = startTime;
          nextSchedule.end_time = endTime;
          delete nextSchedule.windows;
          delete nextSchedule.schedule_id;
        } else if (nextType === 'inverse_of') {
          const baseId = String(inverseSel.value || '').trim();
          if (!baseId) throw new Error('Select a schedule for Inverse Of.');
          if (baseId === nextId) throw new Error('Inverse schedule cannot reference itself.');
          nextSchedule.schedule_id = baseId;
          delete nextSchedule.windows;
          delete nextSchedule.days;
          delete nextSchedule.start_date;
          delete nextSchedule.end_date;
          delete nextSchedule.start_time;
          delete nextSchedule.end_time;
        } else {
          delete nextSchedule.windows;
          delete nextSchedule.schedule_id;
          delete nextSchedule.days;
          delete nextSchedule.start_date;
          delete nextSchedule.end_date;
          delete nextSchedule.start_time;
          delete nextSchedule.end_time;
        }
        const scheduleValidationError = validateScheduleDefinition(nextSchedule, { requireId: true });
        if (scheduleValidationError) throw new Error(scheduleValidationError);
        schedulesNow[idx] = nextSchedule;
        if (nextId !== scheduleId) {
          getNotificationPolicies(nextCfg).forEach((policy) => {
            if (String(policy?.schedule_id || '').trim() === scheduleId) policy.schedule_id = nextId;
          });
          schedulesNow.forEach((schedule) => {
            if (String(schedule?.schedule_id || '').trim() === scheduleId) schedule.schedule_id = nextId;
          });
        }
        await saveOpcbridgeAlarmsConfig(nextCfg);
        await loadOpcbridgeAlarmsConfig();
        state.alarmsEventsSelectedNodeId = 'folder:schedules';
        state.alarmsEventsSelectedChildId = `schedule:${nextId}`;
        renderAlarmsEventsTree();
        setStatus('Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });
      host.appendChild(form);
      if (delBtn) {
        delBtn.style.display = '';
        delBtn.textContent = 'Delete Schedule…';
        delBtn.onclick = () => deleteScheduleItem(scheduleId).catch((err) => window.alert(`Schedule delete failed: ${err.message}`));
        const existingAdd = document.getElementById('alarmsEventsAddScheduleBtn');
        if (existingAdd) existingAdd.remove();
        const addScheduleBtn = document.createElement('button');
        addScheduleBtn.id = 'alarmsEventsAddScheduleBtn';
        addScheduleBtn.className = 'btn';
        addScheduleBtn.type = 'button';
        addScheduleBtn.textContent = 'Add Schedule';
        addScheduleBtn.disabled = !canEditConfig();
        addScheduleBtn.addEventListener('click', () => createScheduleInteractive().catch((err) => setStatus(`Create failed: ${err.message}`)));
        delBtn.insertAdjacentElement('beforebegin', addScheduleBtn);
      }
      return;
    } catch (err) {
      showEditor();
      setStatus(`Schedule editor failed: ${err.message}`);
      addPropRow('Schedule ID', String(item?.meta?.id || item?.id || ''));
      addPropRow('Error', String(err?.message || err));
      return;
    }
  }

  if (type === 'notification_policy') {
    const policyId = String(item?.meta?.id || '').trim();
    const isV2 = isV2AlarmsConfig(cfg);
    const cur = getNotificationPolicies(cfg).find((p) => String(p?.id || '').trim() === policyId) || item?.meta || {};
    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';
    const addRow = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const idBox = document.createElement('input');
    idBox.type = 'text';
    idBox.value = policyId;
    idBox.disabled = !canEditConfig();
    addRow('Policy ID', idBox);

    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.value = String(cur?.name || item?.label || policyId);
    nameBox.disabled = !canEditConfig();
    addRow('Name', nameBox);

    const { checkbox: enabledBox, wrap: enabledWrap } = makeLabeledCheckbox('Enabled', cur?.enabled !== false, !canEditConfig());
    addRow('Enabled', enabledWrap);

    const sevBox = document.createElement('input');
    sevBox.type = 'number';
    sevBox.step = '1';
    sevBox.value = String(Number(cur?.min_severity ?? 500) || 0);
    sevBox.disabled = !canEditConfig();
    addRow('Min Severity', sevBox);

    const eventOptions = ['active', 'ack', 'return'];
    const eventSelect = document.createElement('select');
    eventSelect.disabled = !canEditConfig();
    eventOptions.forEach((ev) => {
      const opt = document.createElement('option');
      opt.value = ev;
      opt.textContent = ev;
      eventSelect.appendChild(opt);
    });
    const currentEvents = (isV2 ? (Array.isArray(cur?.triggers) ? cur.triggers : []) : (Array.isArray(cur?.on) ? cur.on : []))
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    const firstEvent = currentEvents.find((ev) => eventOptions.includes(ev)) || 'active';
    eventSelect.value = firstEvent;
    addRow('Event', eventSelect);
    const eventHint = document.createElement('div');
    eventHint.className = 'hint';
    eventHint.textContent = 'Use normal lifecycle events only. Shelve/unshelve are operator actions and are intentionally hidden.';
    form.appendChild(eventHint);

    const curRepeat = (cur?.repeat && typeof cur.repeat === 'object' && !Array.isArray(cur.repeat)) ? cur.repeat : null;
    const repeatEnabled = isV2
      ? Boolean(curRepeat?.enabled)
      : Number(cur?.repeat_ms || 0) > 0;
    const repeatInitial = isV2 ? Math.max(0, Math.trunc(Number(curRepeat?.initial_delay_ms || 0) || 0)) : 0;
    const repeatInterval = isV2
      ? Math.max(1, Math.trunc(Number(curRepeat?.interval_ms || 60000) || 60000))
      : Math.max(1, Math.trunc(Number(cur?.repeat_ms || 60000) || 60000));
    const repeatMax = isV2
      ? Math.max(0, Math.trunc(Number(curRepeat?.max_repeats || 0) || 0))
      : (Number(cur?.repeat_ms || 0) > 0 ? 1 : 0);
    const repeatStop = String(isV2 ? (curRepeat?.stop_on || 'acked_or_returned') : (cur?.until || 'acked_or_returned')).trim() || 'acked_or_returned';

    const { checkbox: repeatEnabledBox, wrap: repeatEnabledWrap } = makeLabeledCheckbox('Enabled', repeatEnabled, !canEditConfig());
    addRow('Repeat', repeatEnabledWrap);

    const repeatInitialBox = document.createElement('input');
    repeatInitialBox.type = 'number';
    repeatInitialBox.min = '0';
    repeatInitialBox.step = '1';
    repeatInitialBox.value = String(repeatInitial);
    repeatInitialBox.disabled = !canEditConfig();
    addRow('Initial Delay (ms)', repeatInitialBox);

    const repeatIntervalBox = document.createElement('input');
    repeatIntervalBox.type = 'number';
    repeatIntervalBox.min = '1';
    repeatIntervalBox.step = '1';
    repeatIntervalBox.value = String(repeatInterval);
    repeatIntervalBox.disabled = !canEditConfig();
    addRow('Repeat Interval (ms)', repeatIntervalBox);

    const repeatMaxBox = document.createElement('input');
    repeatMaxBox.type = 'number';
    repeatMaxBox.min = '0';
    repeatMaxBox.step = '1';
    repeatMaxBox.value = String(repeatMax);
    repeatMaxBox.disabled = !canEditConfig();
    addRow('Max Repeats', repeatMaxBox);

    const repeatStopSel = document.createElement('select');
    repeatStopSel.disabled = !canEditConfig();
    ['acked_or_returned', 'acked', 'returned', 'manual'].forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      repeatStopSel.appendChild(opt);
    });
    repeatStopSel.value = ['acked_or_returned', 'acked', 'returned', 'manual'].includes(repeatStop) ? repeatStop : 'acked_or_returned';
    addRow('Repeat Stop On', repeatStopSel);

    const vmDefaults = getVoiceModemConfig(cfg);
    const policyAudioDelayBox = document.createElement('input');
    policyAudioDelayBox.type = 'number';
    policyAudioDelayBox.min = '0';
    policyAudioDelayBox.max = '120';
    policyAudioDelayBox.step = '1';
    policyAudioDelayBox.placeholder = `Default (${Number(vmDefaults.audio_delay_seconds ?? 8) || 8})`;
    policyAudioDelayBox.value = cur?.audio_delay_seconds == null ? '' : String(Math.max(0, Math.trunc(Number(cur.audio_delay_seconds) || 0)));
    policyAudioDelayBox.disabled = !canEditConfig();
    addRow('Playback Delay Seconds', policyAudioDelayBox);

    const policyAudioGapBox = document.createElement('input');
    policyAudioGapBox.type = 'number';
    policyAudioGapBox.min = '0';
    policyAudioGapBox.max = '5000';
    policyAudioGapBox.step = '1';
    policyAudioGapBox.placeholder = `Default (${Number(vmDefaults.audio_gap_ms ?? 50) || 0})`;
    policyAudioGapBox.value = cur?.audio_gap_ms == null ? '' : String(Math.max(0, Math.trunc(Number(cur.audio_gap_ms) || 0)));
    policyAudioGapBox.disabled = !canEditConfig();
    addRow('Playback Gap Milliseconds', policyAudioGapBox);

    const policyOutputType = String(getPolicyOutputType(cur) || 'phone').trim().toLowerCase();
    const outputTypeHint = document.createElement('div');
    outputTypeHint.className = 'hint';
    outputTypeHint.textContent = `Output Type: ${String(policyOutputType || 'phone').toUpperCase()}`;
    form.appendChild(outputTypeHint);

    let targetList = null;
    const targetHint = document.createElement('div');
    targetHint.className = 'hint';
    targetHint.textContent = 'Select contacts and/or contact groups in call order. Calls stop when acknowledged.';

    const insertRowBefore = (labelText, inputEl, beforeEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.insertBefore(row, beforeEl);
      return row;
    };

    // Marker so we can insert the call-target editor above the acknowledge fields.
    const beforeAckMarker = document.createElement('div');
    beforeAckMarker.style.display = 'none';
    form.appendChild(beforeAckMarker);

    const ensureTargetEditor = () => {
      if (targetList) return;
      const currentTargets = getPolicyTargets(cur);
      const contacts = getNotificationContacts(cfg)
        .slice()
        .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
      const groups = getNotificationContactGroups(cfg)
        .slice()
        .sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
      targetList = makeOrderedSelectionEditor({
        emptyText: 'No callout targets selected.',
        addLabel: 'Add Target',
        availableItems: [
          ...contacts.map((contact) => {
            const id = String(contact?.id || '').trim();
            return {
              key: `contact:${id}`,
              label: `${String(contact?.name || id)} (Contact)`,
              meta: `${String(contact?.phone || 'no phone')} · ${id}${contact?.enabled === false ? ' · disabled' : ''}`
            };
          }),
          ...groups.map((group) => {
            const id = String(group?.id || '').trim();
            const members = Array.isArray(group?.contacts) ? group.contacts.length : 0;
            return {
              key: `group:${id}`,
              label: `${String(group?.name || id)} (Group)`,
              meta: `${members} contact(s) · ${id}${group?.enabled === false ? ' · disabled' : ''}`
            };
          })
        ],
        selectedItems: currentTargets.map((target) => ({ key: `${String(target?.type || '')}:${String(target?.id || '')}` }))
      });
      // Insert the row/hint above the acknowledge fields.
      insertRowBefore('Callout Targets', targetList, beforeAckMarker);
      form.insertBefore(targetHint, beforeAckMarker);
    };

    const isPhonePolicyNow = () => policyOutputType === 'phone';

    // For phone policies only: choose which call backend to use.
    const callBackendSel = document.createElement('select');
    callBackendSel.disabled = !canEditConfig() || !isPhonePolicyNow();
    [
      { v: 'auto', l: 'Auto (prefer SIP)' },
      { v: 'sip', l: 'SIP' },
      { v: 'voice_modem', l: 'Voice Modem' }
    ].forEach((o) => callBackendSel.appendChild(new Option(o.l, o.v)));
    callBackendSel.value = ['auto', 'sip', 'voice_modem'].includes(String(cur?.call_backend || 'auto')) ? String(cur?.call_backend || 'auto') : 'auto';
    addRow('Call Backend', callBackendSel);

    const ackDtmfBox = document.createElement('input');
    ackDtmfBox.type = 'text';
    ackDtmfBox.value = Array.isArray(cur?.ack_dtmf) && cur.ack_dtmf.length
      ? cur.ack_dtmf.map((v) => String(v || '').trim()).filter(Boolean).join(',')
      : '1';
    ackDtmfBox.placeholder = '1';
    ackDtmfBox.disabled = !canEditConfig() || !isPhonePolicyNow();
    addRow('Acknowledge Keys', ackDtmfBox);

    const ackWaitBox = document.createElement('input');
    ackWaitBox.type = 'number';
    ackWaitBox.min = '0';
    ackWaitBox.max = '120';
    ackWaitBox.step = '1';
    ackWaitBox.value = String(Math.max(0, Math.trunc(Number(cur?.ack_wait_sec ?? 8) || 8)));
    ackWaitBox.disabled = !canEditConfig() || !isPhonePolicyNow();
    addRow('Acknowledge Wait (sec)', ackWaitBox);

    const ringTimeoutBox = document.createElement('input');
    ringTimeoutBox.type = 'number';
    ringTimeoutBox.min = '5';
    ringTimeoutBox.max = '600';
    ringTimeoutBox.step = '1';
    ringTimeoutBox.value = String(Math.max(5, Math.trunc(Number(cur?.ring_timeout_sec ?? 15) || 15)));
    ringTimeoutBox.placeholder = '15';
    ringTimeoutBox.disabled = !canEditConfig() || !isPhonePolicyNow();
    addRow('Ring Timeout (sec)', ringTimeoutBox);

    const syncPolicyTypeUiLocal = () => {
      const phone = isPhonePolicyNow();
      if (phone) {
        ensureTargetEditor();
      } else {
        // Hide targets hint if present; the selection editor row will remain but
        // is irrelevant for non-phone policies.
        if (targetHint) targetHint.style.display = 'none';
      }
      ackDtmfBox.disabled = !canEditConfig() || !phone;
      ackWaitBox.disabled = !canEditConfig() || !phone;
      ringTimeoutBox.disabled = !canEditConfig() || !phone;
      callBackendSel.disabled = !canEditConfig() || !phone;
      if (targetHint) targetHint.style.display = phone ? '' : 'none';
    };
    syncPolicyTypeUiLocal();


    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = !canEditConfig();
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    saveBtn.addEventListener('click', async () => {
      if (!canEditConfig()) { setStatus('Login required to edit policies.'); return; }
      setStatus('Saving…');
      try {
        const nextCfg = await loadOpcbridgeAlarmsConfig();
        const policies = getNotificationPolicies(nextCfg);
        const idx = policies.findIndex((p) => String(p?.id || '').trim() === policyId);
        if (idx < 0) throw new Error(`Policy '${policyId}' not found.`);
        const nextId = validateConfigId(idBox.value, 'Policy ID');
        if (nextId !== policyId && policies.some((p) => String(p?.id || '').trim() === nextId)) throw new Error(`Policy ID '${nextId}' already exists.`);
        const selectedEvent = String(eventSelect.value || 'active').trim() || 'active';
        const repeatInitialMs = Math.max(0, Math.trunc(Number(repeatInitialBox.value ?? 0) || 0));
        const repeatIntervalMs = Math.max(1, Math.trunc(Number(repeatIntervalBox.value ?? 1) || 1));
        const repeatMaxRepeats = Math.max(0, Math.trunc(Number(repeatMaxBox.value ?? 0) || 0));
        const repeatStopOn = String(repeatStopSel.value || 'acked_or_returned').trim() || 'acked_or_returned';
        const repeatEnabledNow = Boolean(repeatEnabledBox.checked);
        const delayRaw = String(policyAudioDelayBox.value ?? '').trim();
        const gapRaw = String(policyAudioGapBox.value ?? '').trim();
	        const ackRaw = String(ackDtmfBox.value ?? '').trim();
	        const ackWaitRaw = String(ackWaitBox.value ?? '').trim();
          const ringTimeoutRaw = String(ringTimeoutBox.value ?? '').trim();
          const maxRingsRaw = '';
	        const policyAudioDelay = delayRaw === '' ? null : Math.trunc(Number(delayRaw));
	        const policyAudioGap = gapRaw === '' ? null : Math.trunc(Number(gapRaw));
	        const ackWaitSec = ackWaitRaw === '' ? 8 : Math.trunc(Number(ackWaitRaw));
          const ringTimeoutSec = ringTimeoutRaw === '' ? 15 : Math.trunc(Number(ringTimeoutRaw));
          const maxRings = 0;
        if (policyAudioDelay != null && (!Number.isFinite(policyAudioDelay) || policyAudioDelay < 0 || policyAudioDelay > 120)) throw new Error('Playback Delay Seconds must be blank or 0-120.');
        if (policyAudioGap != null && (!Number.isFinite(policyAudioGap) || policyAudioGap < 0 || policyAudioGap > 5000)) throw new Error('Playback Gap Milliseconds must be blank or 0-5000.');
        if (!Number.isFinite(ackWaitSec) || ackWaitSec < 0 || ackWaitSec > 120) throw new Error('Acknowledge Wait (sec) must be 0-120.');
          if (!Number.isFinite(ringTimeoutSec) || ringTimeoutSec < 5 || ringTimeoutSec > 600) throw new Error('Ring Timeout (sec) must be 5-600.');
          // max_rings removed; use Ring Timeout (sec) only.
	        const selectedOutputType = getPolicyOutputType(policies[idx] || cur);
	        const isPhonePolicyNow = selectedOutputType === 'phone';
	        const ackDtmf = dedupeStringsInOrder(ackRaw.split(',').map((v) => String(v || '').trim()).filter(Boolean)).map((k) => k.slice(0, 1));
	        if (isPhonePolicyNow && !ackDtmf.length) ackDtmf.push('1');
	        // Guardrail: if repeat is enabled and stop condition includes ACK, ensure ACK is actually enabled.
	        if (isPhonePolicyNow && repeatEnabledNow && ['acked', 'acked_or_returned'].includes(repeatStopOn)) {
	          const ackEnabled = Number.isFinite(ackWaitSec) && ackWaitSec > 0 && ackDtmf.length > 0;
	          if (!ackEnabled) {
	            const fix = window.confirm(
	              'This policy is set to repeat and stop on ACK, but ACK is disabled.\n\n' +
	              'Click OK to auto-fix by setting:\n' +
	              '- Acknowledge Wait (sec) = 8\n' +
	              '- Acknowledge Keys = 1\n\n' +
	              'Click Cancel to go back and edit manually.'
	            );
	            if (!fix) throw new Error('Repeat Stop On requires ACK to be enabled.');
	            // Apply fix to UI inputs so the user sees the effective values.
	            if (ackWaitBox) ackWaitBox.value = '8';
	            if (ackDtmfBox) ackDtmfBox.value = '1';
	          }
	        }
	        const normalizedTargets = [];
	        const contactsSelected = [];
	        const groupsSelected = [];
        if (isPhonePolicyNow && targetList) {
          const selectedTargets = targetList.getSelectedKeys();
          const validContactIds = new Set(getNotificationContacts(nextCfg).map((c) => String(c?.id || '').trim()).filter(Boolean));
          const validGroupIds = new Set(getNotificationContactGroups(nextCfg).map((g) => String(g?.id || '').trim()).filter(Boolean));
          selectedTargets.forEach((key) => {
            const parts = String(key || '').split(':');
            const t = String(parts[0] || '').trim();
            const id = String(parts.slice(1).join(':') || '').trim();
            if (!id) return;
            if (t === 'contact') {
              if (!validContactIds.has(id)) throw new Error(`Unknown contact target '${id}'.`);
              normalizedTargets.push({ type: 'contact', id });
              contactsSelected.push(id);
              return;
            }
            if (t === 'group') {
              if (!validGroupIds.has(id)) throw new Error(`Unknown contact group target '${id}'.`);
              normalizedTargets.push({ type: 'group', id });
              groupsSelected.push(id);
            }
          });
        }
	        const basePolicy = {
	          ...(policies[idx] || {}),
	          id: nextId,
	          name: String(nameBox.value || '').trim() || nextId,
	          output_type: selectedOutputType,
	          enabled: Boolean(enabledBox.checked),
	          min_severity: Math.trunc(Number(sevBox.value ?? 0) || 0),
	          targets: isPhonePolicyNow ? normalizedTargets : (Array.isArray((policies[idx] || {}).targets) ? (policies[idx] || {}).targets : [])
	        };
	        // v2-only: legacy per-policy contact arrays are not supported.
	        delete basePolicy.contacts;
	        delete basePolicy.contact_groups;
        if (isV2) {
          basePolicy.schedule_id = 'always';
          basePolicy.triggers = [selectedEvent];
          basePolicy.repeat = {
            enabled: repeatEnabledNow,
            initial_delay_ms: repeatInitialMs,
            interval_ms: repeatIntervalMs,
            max_repeats: repeatMaxRepeats,
            stop_on: repeatStopOn
          };
        } else {
          basePolicy.on = [selectedEvent];
          basePolicy.repeat_ms = (repeatEnabledNow && repeatMaxRepeats > 0) ? repeatIntervalMs : 0;
          basePolicy.until = repeatStopOn;
        }
        policies[idx] = basePolicy;
        if (policyAudioDelay == null) delete policies[idx].audio_delay_seconds;
        else policies[idx].audio_delay_seconds = policyAudioDelay;
        if (policyAudioGap == null) delete policies[idx].audio_gap_ms;
        else policies[idx].audio_gap_ms = policyAudioGap;
          if (isPhonePolicyNow) {
            policies[idx].call_backend = String(callBackendSel.value || 'auto').trim() || 'auto';
            policies[idx].ack_dtmf = ackDtmf;
            policies[idx].ack_wait_sec = ackWaitSec;
            policies[idx].ring_timeout_sec = ringTimeoutSec;
          } else {
            delete policies[idx].call_backend;
            delete policies[idx].ack_dtmf;
            delete policies[idx].ack_wait_sec;
            delete policies[idx].ring_timeout_sec;
          }
        if (nextId !== policyId) {
          (Array.isArray(nextCfg.alarms) ? nextCfg.alarms : []).forEach((alarm) => {
            if (String(alarm?.notification_policy || '').trim() === policyId) alarm.notification_policy = nextId;
            if (String(alarm?.policy_id || '').trim() === policyId) alarm.policy_id = nextId;
            if (Array.isArray(alarm?.policy_ids)) {
              alarm.policy_ids = alarm.policy_ids.map((pid) => String(pid || '').trim() === policyId ? nextId : pid);
            }
          });
        }
        await saveOpcbridgeAlarmsConfig(nextCfg);
        await loadOpcbridgeAlarmsConfig();
        state.alarmsEventsSelectedNodeId = `notification_policy_type:${selectedOutputType}`;
        state.alarmsEventsSelectedChildId = `notification_policy:${nextId}`;
        renderAlarmsEventsTree();
        setStatus('Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });
    host.appendChild(form);
    if (delBtn) {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete Policy…';
      delBtn.onclick = () => deleteNotificationItem('policy', policyId).catch((err) => window.alert(`Policy delete failed: ${err.message}`));
    }
    return;
  }

  if (type === 'alarm') {
    const alarmId = String(item?.meta?.alarm_id || '').trim();
    const alarmCfg = (Array.isArray(cfg?.alarms) ? cfg.alarms : []).find((a) => String(a?.id || '').trim() === alarmId) || null;
    const effectiveAudio = resolveAlarmAudio(cfg, alarmCfg || item?.meta || {});

    // Inline editor (replaces modal behavior for this tab)
    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;

    const cur = alarmCfg || {};

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';
    state.alarmsEventsPropsDirty = false;
    const markPropsDirty = () => { state.alarmsEventsPropsDirty = true; };

    const addRow = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const idBox = document.createElement('input');
    idBox.type = 'text';
    idBox.value = alarmId;
    idBox.disabled = !canEditConfig();
    addRow('Alarm ID', idBox);

    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.value = String(cur?.name || item?.label || alarmId);
    addRow('Name', nameBox);

    const connSel = document.createElement('select');
    const connWant = String(cur?.connection_id || item?.meta?.source?.connection_id || '').trim();
    const conns = state.connFiles.slice().map((f) => connectionIdForConnFilePath(String(f?.path || ''))).filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
    connSel.innerHTML = conns.map((cid) => `<option value="${escapeHtml(cid)}">${escapeHtml(cid)}</option>`).join('');
    if (connWant && !conns.includes(connWant)) {
      const opt = document.createElement('option');
      opt.value = connWant;
      opt.textContent = `${connWant} (missing)`;
      connSel.appendChild(opt);
    }
    connSel.value = connWant;
    addRow('Connection', connSel);

    const tagFilter = document.createElement('input');
    tagFilter.type = 'search';
    tagFilter.placeholder = 'Type part of a tag name';
    addRow('Filter Tags', tagFilter);

    const tagSel = document.createElement('select');
    tagSel.size = 8;
    tagSel.style.minHeight = '180px';
    const tagWant = String(cur?.tag_name || item?.meta?.source?.tag || '').trim();
    const refreshTagSelectLocal = (wantTag = '') => {
      const cid = String(connSel.value || '').trim();
      const filter = String(tagFilter.value || '').trim().toLowerCase();
      tagSel.textContent = '';
      const tags = getEffectiveTagsAll()
        .filter((t) => String(t?.connection_id || '') === cid)
        .filter((t) => {
          if (!filter) return true;
          return String(t?.name || '').toLowerCase().includes(filter) || String(t?.plc_tag_name || '').toLowerCase().includes(filter);
        })
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
      tags.forEach((t) => {
        const name = String(t?.name || '');
        const plc = String(t?.plc_tag_name || '').trim();
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = plc && plc !== name ? `${name}  (${plc})` : name;
        tagSel.appendChild(opt);
      });
      if (wantTag) tagSel.value = wantTag;
      else if (tagSel.options.length) tagSel.value = String(tagSel.options[0].value || '');
    };
    refreshTagSelectLocal(tagWant);
    addRow('Tag', tagSel);

    const typeSel = document.createElement('select');
    [
      { v: 'high', l: 'High' },
      { v: 'low', l: 'Low' },
      { v: 'equals', l: 'Equals' },
      { v: 'not_equals', l: 'Not-equals' }
    ].forEach((o) => typeSel.appendChild(new Option(o.l, o.v)));
    typeSel.value = String(cur?.type || 'high').trim();
    addRow('Type', typeSel);

    const thresholdBox = document.createElement('input');
    thresholdBox.type = 'number';
    thresholdBox.step = 'any';
    thresholdBox.placeholder = '1000';
    thresholdBox.value = cur?.threshold == null ? '' : String(cur.threshold);
    const thresholdRow = addRow('Threshold', thresholdBox).closest('.form-row');

    const hysteresisBox = document.createElement('input');
    hysteresisBox.type = 'number';
    hysteresisBox.step = 'any';
    hysteresisBox.placeholder = '0';
    hysteresisBox.value = cur?.hysteresis == null ? '' : String(cur.hysteresis);
    const hysteresisRow = addRow('Hysteresis', hysteresisBox).closest('.form-row');

    const compareBox = document.createElement('input');
    compareBox.type = 'text';
    compareBox.placeholder = 'true, false, 1, or text';
    compareBox.value = alarmCompareValueToText(cur);
    const compareRow = addRow('Compare Value', compareBox).closest('.form-row');

    const syncTypeUiLocal = () => {
      const type = String(typeSel.value || '').trim();
      const isEquals = type === 'equals' || type === 'not_equals';
      const isLimit = type === 'high' || type === 'low';
      if (compareRow) compareRow.style.display = isEquals ? '' : 'none';
      if (thresholdRow) thresholdRow.style.display = isLimit ? '' : 'none';
      if (hysteresisRow) hysteresisRow.style.display = isLimit ? '' : 'none';
    };
    syncTypeUiLocal();

    const enabledControl = makeLabeledCheckbox('Enabled', cur?.enabled !== false, false);
    const enabledBox = enabledControl.checkbox;
    const enabledWrap = document.createElement('div');
    enabledWrap.className = 'row-actions';
    enabledWrap.style.justifyContent = 'flex-start';
    enabledWrap.appendChild(enabledControl.wrap);
    addRow('Enabled', enabledWrap);

    const sevBox = document.createElement('input');
    sevBox.type = 'number';
    sevBox.step = '1';
    sevBox.min = '0';
    sevBox.max = '1000';
    sevBox.value = String(Number(cur?.severity ?? item?.meta?.severity ?? 500) || 0);
    const sevPreset = document.createElement('select');
    [
      { v: '', l: 'Custom' },
      { v: '100', l: 'Info (100)' },
      { v: '300', l: 'Low (300)' },
      { v: '500', l: 'Medium (500)' },
      { v: '700', l: 'High (700)' },
      { v: '900', l: 'Critical (900)' }
    ].forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.l;
      sevPreset.appendChild(opt);
    });
    const sevWrap = document.createElement('div');
    sevWrap.style.display = 'grid';
    sevWrap.style.gridTemplateColumns = '180px 1fr';
    sevWrap.style.gap = '10px';
    sevWrap.appendChild(sevPreset);
    sevWrap.appendChild(sevBox);
    addRow('Severity', sevWrap);
    const syncLocalSeverityPreset = () => {
      const val = String(Math.trunc(Number(sevBox.value ?? 0) || 0));
      const matches = Array.from(sevPreset.options || []).some((opt) => opt.value === val);
      sevPreset.value = matches ? val : '';
    };
    syncLocalSeverityPreset();
    sevPreset.addEventListener('change', () => {
      const val = String(sevPreset.value || '').trim();
      if (val) sevBox.value = val;
      syncLocalSeverityPreset();
      markPropsDirty();
    });
    sevBox.addEventListener('input', syncLocalSeverityPreset);
    sevBox.addEventListener('change', syncLocalSeverityPreset);

    const msgOnBox = document.createElement('input');
    msgOnBox.type = 'text';
    msgOnBox.value = String(cur?.message_on_active || '');
    addRow('Message on active', msgOnBox);

    const msgOffBox = document.createElement('input');
    msgOffBox.type = 'text';
    msgOffBox.value = String(cur?.message_on_return || '');
    addRow('Message on return', msgOffBox);

    const groupSel = document.createElement('select');
    const groupWant = String(cur?.group || item?.meta?.group || '').trim();
    const groups = alarmGroupsSorted(cfg);
    const groupNames = groups.map((g) => String(g?.name || '').trim()).filter(Boolean);
    groupSel.innerHTML = [{ v: '', l: 'Unassigned' }]
      .concat(groupNames.map((g) => ({ v: g, l: g })))
      .map((o) => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</option>`).join('');
    if (groupWant && !groupNames.some((g) => g.toLowerCase() === groupWant.toLowerCase())) {
      const opt = document.createElement('option');
      opt.value = groupWant;
      opt.textContent = `${groupWant} (missing)`;
      groupSel.appendChild(opt);
    }
    groupSel.value = groupWant;
    addRow('Group', groupSel);

    const siteSel = document.createElement('select');
    const siteWant = String(cur?.site || item?.meta?.site || '').trim();
    const fillSites = (groupName, want) => {
      const g = groupName ? findAlarmGroupConfig(cfg, groupName) : null;
      const sites = Array.isArray(g?.sites) ? g.sites : [];
      const names = sites.map((s) => String(s?.name || '').trim()).filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
      siteSel.textContent = '';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = 'Unassigned';
      siteSel.appendChild(none);
      names.forEach((n) => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        siteSel.appendChild(opt);
      });
      if (want && !names.some((n) => n.toLowerCase() === want.toLowerCase())) {
        const opt = document.createElement('option');
        opt.value = want;
        opt.textContent = `${want} (missing)`;
        siteSel.appendChild(opt);
      }
      siteSel.value = want || '';
      siteSel.disabled = !groupName;
    };
    fillSites(groupWant, siteWant);
    groupSel.addEventListener('change', () => {
      fillSites(String(groupSel.value || '').trim(), '');
    });
    addRow('Site', siteSel);
    const modeSel = document.createElement('select');
    [
      { v: 'inherit', l: 'Use inherited mode' },
      { v: 'audio_then_speech', l: 'Audio then Speech' },
      { v: 'speech_then_audio', l: 'Speech then Audio' },
      { v: 'audio_only', l: 'Audio Only' },
      { v: 'speech_only', l: 'Speech Only' }
    ].forEach((o) => modeSel.appendChild(new Option(o.l, o.v)));
    modeSel.value = ['inherit', 'audio_only', 'speech_only', 'audio_then_speech', 'speech_then_audio'].includes(String(cur?.audio_mode || '').trim())
      ? String(cur.audio_mode).trim()
      : 'inherit';
    modeSel.disabled = !canEditConfig();
    addRow('Playback Mode', modeSel);

    const initialSequence = (() => {
      const ids = Array.isArray(cur?.audio_files) ? cur.audio_files : [];
      const clean = ids.map((v) => String(v || '').trim()).filter(Boolean);
      if (clean.length) return clean;
      const one = String(cur?.audio_file || '').trim();
      return one ? [one] : [];
    })();
    const audioSeqField = createAlarmAudioSequenceInput(cfg || {}, initialSequence, { disabled: !canEditConfig(), onDirty: markPropsDirty });
    addRow('Audio Sequence', audioSeqField.wrap);

    const gapBox = document.createElement('input');
    gapBox.type = 'number';
    gapBox.min = '0';
    gapBox.max = '5000';
    gapBox.step = '1';
    gapBox.placeholder = 'Use policy default';
    const curGap = Number(cur?.audio_gap_ms);
    gapBox.value = Number.isFinite(curGap) && curGap >= 0 ? String(Math.trunc(curGap)) : '';
    gapBox.disabled = !canEditConfig();
    addRow('Audio Gap (ms)', gapBox);
    const speechBox = document.createElement('textarea');
    speechBox.rows = 3;
    speechBox.value = String(cur?.speech_text || '');
    speechBox.placeholder = 'Optional text-to-speech for this alarm';
    speechBox.disabled = !canEditConfig();
    addRow('Speech Text', speechBox);
    [idBox, nameBox, connSel, tagFilter, tagSel, typeSel, thresholdBox, hysteresisBox, compareBox, enabledBox, sevPreset, sevBox, groupSel, siteSel, modeSel, speechBox, gapBox, msgOnBox, msgOffBox].forEach((el) => {
      if (!el) return;
      el.addEventListener('input', markPropsDirty);
      el.addEventListener('change', markPropsDirty);
    });
    connSel.addEventListener('change', () => refreshTagSelectLocal(''));
    tagFilter.addEventListener('input', () => refreshTagSelectLocal(String(tagSel.value || '').trim()));
    typeSel.addEventListener('change', syncTypeUiLocal);


    const effectiveLine = document.createElement('div');
    effectiveLine.className = 'hint';
    effectiveLine.style.marginTop = '6px';
    effectiveLine.textContent = `Effective: audio sequence=${alarmAudioSequenceText(effectiveAudio.audio_files || (effectiveAudio.audio_file ? [effectiveAudio.audio_file] : []), cfg, effectiveAudio.speech_texts || (effectiveAudio.speech_text ? [effectiveAudio.speech_text] : []), effectiveAudio.audio_mode)}`;
    form.appendChild(effectiveLine);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    const revertBtn = document.createElement('button');
    revertBtn.className = 'btn';
    revertBtn.type = 'button';
    revertBtn.textContent = 'Revert';
    actions.appendChild(saveBtn);
    actions.appendChild(revertBtn);
    form.appendChild(actions);

    const doReload = async () => {
      await loadOpcbridgeAlarmsConfig().catch(() => null);
      await refreshAll().catch(() => {});
      renderAlarmsEventsTree();
    };

    saveBtn.addEventListener('click', async () => {
      setStatus('Saving…');
      try {
        const nextCfg = await loadOpcbridgeAlarmsConfig();
        if (!Array.isArray(nextCfg.alarms)) nextCfg.alarms = [];
        const idx = nextCfg.alarms.findIndex((a) => String(a?.id || '').trim() === alarmId);
        if (idx < 0) throw new Error(`Alarm '${alarmId}' not found in config.`);
        const nextId = validateConfigId(idBox.value, 'Alarm ID');
        if (nextId !== alarmId && nextCfg.alarms.some((a) => String(a?.id || '').trim() === nextId)) throw new Error(`Alarm ID '${nextId}' already exists.`);

        const next = { ...(nextCfg.alarms[idx] || {}) };
        next.id = nextId;
        next.name = String(nameBox.value || '').trim() || nextId;
        next.connection_id = String(connSel.value || '').trim();
        next.tag_name = String(tagSel.value || '').trim();
        next.type = String(typeSel.value || '').trim();
        next.enabled = Boolean(enabledBox.checked);
        next.severity = Math.trunc(Number(sevBox.value ?? 0) || 0);
        next.message_on_active = String(msgOnBox.value || '').trim();
        next.message_on_return = String(msgOffBox.value || '').trim();
        next.group = String(groupSel.value || '').trim();
        next.site = String(siteSel.value || '').trim();
        if (next.site && !next.group) next.site = '';

        delete next.audible_enabled;
        if (!next.connection_id) throw new Error('Connection is required.');
        if (!next.tag_name) throw new Error('Tag is required.');
        if (!['high', 'low', 'equals', 'not_equals'].includes(next.type)) throw new Error('Type is invalid.');
        if (!getEffectiveTagsAll().some((t) => String(t?.connection_id || '') === next.connection_id && String(t?.name || '') === next.tag_name)) {
          throw new Error(`Tag '${next.connection_id}:${next.tag_name}' was not found in the tag config.`);
        }
        const thresholdRaw = String(thresholdBox.value ?? '').trim();
        const hysteresisRaw = String(hysteresisBox.value ?? '').trim();
        const compareRaw = String(compareBox.value ?? '').trim();
        if ((next.type === 'high' || next.type === 'low') && thresholdRaw === '') throw new Error('Threshold is required for high/low alarms.');
        if (next.type === 'high' || next.type === 'low') {
          next.threshold = Number(thresholdRaw);
          if (!Number.isFinite(next.threshold)) throw new Error('Threshold must be numeric.');
          if (hysteresisRaw !== '') {
            next.hysteresis = Number(hysteresisRaw);
            if (!Number.isFinite(next.hysteresis)) throw new Error('Hysteresis must be numeric.');
            if (next.hysteresis < 0) throw new Error('Hysteresis cannot be negative.');
          } else {
            delete next.hysteresis;
          }
          delete next.value;
          delete next.equals_value;
        } else {
          delete next.threshold;
          delete next.hysteresis;
          const cmp = parseAlarmCompareValue(compareRaw);
          if (!cmp.ok) throw new Error(cmp.error);
          next.value = cmp.value;
          delete next.equals_value;
        }

        const seqRaw = audioSeqField.getValues();
        const seq = seqRaw
          .map((v) => validateAlarmAudioFileId(nextCfg, v))
          .filter(Boolean)
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        if (!seq.length) {
          delete next.audio_files;
          delete next.audio_file;
        } else {
          next.audio_files = seq;
          next.audio_file = seq[0];
        }
        const st = String(speechBox.value || '').trim();
        if (!st) delete next.speech_text;
        else next.speech_text = st;
        const modeValue = String(modeSel.value || 'inherit').trim();
        if (modeValue === 'inherit') delete next.audio_mode;
        else next.audio_mode = modeValue;
        const gapRaw = String(gapBox.value ?? '').trim();
        if (!gapRaw) {
          delete next.audio_gap_ms;
        } else {
          const gap = Math.trunc(Number(gapRaw));
          if (!Number.isFinite(gap) || gap < 0 || gap > 5000) throw new Error('Audio Gap must be between 0 and 5000 ms.');
          next.audio_gap_ms = gap;
        }

        nextCfg.alarms[idx] = next;
        await saveOpcbridgeAlarmsConfig(nextCfg);
        state.alarmsEventsPropsDirty = false;
        selectAlarmEventsAlarm(nextId, next.group, next.site);
        await doReload();
        setStatus('Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });

    revertBtn.addEventListener('click', async () => {
      setStatus('Reverting…');
      state.alarmsEventsPropsDirty = false;
      await doReload();
      setStatus('Reverted.');
    });

    host.appendChild(form);

    if (delBtn) {
      delBtn.style.display = '';
      delBtn.onclick = () => deleteAlarmById(alarmId);
    }
    return;
  }

  if (type === 'alarm_group' || type === 'alarm_site') {
    const group = String(item?.meta?.group || '').trim();
    const site = type === 'alarm_site' ? String(item?.meta?.site || '').trim() : '';
    const scope = (type === 'alarm_site') ? 'site' : 'group';

    // Unassigned buckets in the tree are not real config scopes.
    if (!group || (scope === 'site' && !site)) {
      addPropRow('Type', type === 'alarm_group' ? 'Alarm Group' : 'Alarm Site');
      addPropRow('Group', group || '(Unassigned)');
      if (scope === 'site') addPropRow('Site', site || '(Unassigned)');
      addPropRow('Note', 'Unassigned alarms do not have group/site properties.');
      return;
    }

    const target = getAudioScopeConfig(cfg, scope, group, site) || {};
    const inherited = getInheritedAudioForScope(cfg, scope, group, site);
    const selectedFile = String(target?.audio_file || '').trim();
    const effective = (scope === 'group')
      ? { ...inherited, ...(findAlarmGroupConfig(cfg, group) || {}) }
      : resolveInheritedAlarmAudio(cfg, group, site);

    showEditor();
    const host = els.alarmsEventsPropsEditor;
    if (!host) return;

    const form = document.createElement('div');
    form.className = 'form';
    form.style.maxWidth = '900px';

    const addRow2 = (labelText, inputEl) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const lab = document.createElement('label');
      lab.textContent = labelText;
      row.appendChild(lab);
      row.appendChild(inputEl);
      form.appendChild(row);
      return inputEl;
    };

    const groupBox = document.createElement('input');
    groupBox.type = 'text';
    groupBox.value = group;
    groupBox.disabled = true;
    addRow2('Group', groupBox);

    if (scope === 'site') {
      const siteBox = document.createElement('input');
      siteBox.type = 'text';
      siteBox.value = site;
      siteBox.disabled = true;
      addRow2('Site', siteBox);
    }

    let processingBox = null;
    if (scope === 'site') {
      processingBox = document.createElement('input');
      processingBox.type = 'checkbox';
      processingBox.checked = target?.alarms_enabled !== false;
      processingBox.disabled = !canEditConfig();
      const processingWrap = document.createElement('div');
      processingWrap.className = 'row-actions';
      processingWrap.style.justifyContent = 'flex-start';
      const processingLab = document.createElement('label');
      processingLab.style.display = 'flex';
      processingLab.style.alignItems = 'center';
      processingLab.style.gap = '8px';
      processingLab.appendChild(processingBox);
      processingLab.appendChild(document.createTextNode('Enable alarm processing for this site'));
      processingWrap.appendChild(processingLab);
      addRow2('Site Alarm Processing', processingWrap);
    }

    const audioField = createAlarmAudioFileInput(cfg || {}, selectedFile, {
      placeholder: inherited.audio_file ? `Blank = inherited ${inherited.audio_file}` : 'Blank = inherit none',
      disabled: !canEditConfig()
    });
    addRow2('Audio File', audioField.wrap);
    const modeSel = document.createElement('select');
    const playbackModeOptions = [
      { v: 'inherit', l: 'Use inherited mode' },
      { v: 'audio_then_speech', l: 'Audio then Speech' },
      { v: 'speech_then_audio', l: 'Speech then Audio' },
      { v: 'audio_only', l: 'Audio Only' },
      { v: 'speech_only', l: 'Speech Only' }
    ];
    playbackModeOptions.forEach((o) => modeSel.appendChild(new Option(o.l, o.v)));
    const modeRaw = String(target?.audio_mode || '').trim() || 'inherit';
    modeSel.value = playbackModeOptions.some((o) => o.v === modeRaw) ? modeRaw : 'inherit';
    modeSel.disabled = !canEditConfig();
    addRow2('Playback Mode', modeSel);

    const speechBox = document.createElement('textarea');
    speechBox.rows = 3;
    speechBox.value = String(target?.speech_text || '');
    speechBox.placeholder = 'Optional text-to-speech for this scope';
    speechBox.disabled = !canEditConfig();
    addRow2('Speech Text', speechBox);

    const inheritedRepeat = getInheritedRepeatForScope(cfg, scope, group, site);
    const hasRepeatField = Object.prototype.hasOwnProperty.call(target, 'repeat_ms');
    const repeatMs = hasRepeatField ? Math.trunc(Number(target?.repeat_ms ?? 0) || 0) : 0;
    const repeatMode = document.createElement('select');
    repeatMode.innerHTML = [
      { v: 'inherit', l: 'Use inherited setting' },
      { v: 'on', l: 'Enabled' },
      { v: 'off', l: 'Disabled' }
    ].map((o) => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</option>`).join('');
    repeatMode.value = hasRepeatField ? (repeatMs > 0 ? 'on' : 'off') : 'inherit';
    repeatMode.disabled = !canEditConfig();

    const repeatSec = document.createElement('input');
    repeatSec.type = 'number';
    repeatSec.min = '1';
    repeatSec.step = '1';
    repeatSec.placeholder = 'Seconds (e.g. 30)';
    repeatSec.value = repeatMs > 0 ? String(Math.max(1, Math.trunc(repeatMs / 1000))) : '';
    repeatSec.disabled = (repeatMode.value !== 'on') || !canEditConfig();
    repeatMode.addEventListener('change', () => {
      repeatSec.disabled = (String(repeatMode.value || 'inherit') !== 'on') || !canEditConfig();
    });
    const repeatWrap = document.createElement('div');
    repeatWrap.style.display = 'grid';
    repeatWrap.style.gridTemplateColumns = '180px 1fr';
    repeatWrap.style.gap = '10px';
    repeatWrap.appendChild(repeatMode);
    repeatWrap.appendChild(repeatSec);
    addRow2('Repeat', repeatWrap);

    const effectiveLine = document.createElement('div');
    effectiveLine.className = 'hint';
    effectiveLine.style.marginTop = '6px';
    {
      const effectiveRepeatMs = hasRepeatField ? repeatMs : inheritedRepeat.repeat_ms;
      const repeatText = effectiveRepeatMs > 0 ? `every ${Math.max(1, Math.trunc(effectiveRepeatMs / 1000))}s` : 'off';
      const processingText = scope === 'site' ? `processing=${target?.alarms_enabled === false ? 'disabled' : 'enabled'} · ` : '';
      const modeNow = String((modeSel.value === 'inherit' ? (inherited.audio_mode || effective?.audio_mode || 'audio_then_speech') : modeSel.value) || 'audio_then_speech');
      effectiveLine.textContent = `Effective: ${processingText}audio sequence=${alarmAudioSequenceText(effective?.audio_files || (effective?.audio_file ? [effective.audio_file] : []), cfg, effective?.speech_texts || (effective?.speech_text ? [effective.speech_text] : []), modeNow)} · repeat=${repeatText}`;
    }
    form.appendChild(effectiveLine);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = !canEditConfig();
    const revertBtn = document.createElement('button');
    revertBtn.className = 'btn';
    revertBtn.type = 'button';
    revertBtn.textContent = 'Revert';
    actions.appendChild(saveBtn);
    actions.appendChild(revertBtn);
    form.appendChild(actions);

    const doReload = async () => {
      await loadOpcbridgeAlarmsConfig().catch(() => null);
      await refreshAll().catch(() => {});
      renderAlarmsEventsTree();
    };

    saveBtn.addEventListener('click', async () => {
      if (!canEditConfig()) { setStatus('Login required to edit.'); return; }
      setStatus('Saving…');
      try {
        const nextCfg = await loadOpcbridgeAlarmsConfig();
        ensureAlarmGroupsTree(nextCfg || {});
        if (scope === 'group') {
          upsertAlarmGroup(nextCfg, group);
          const g = findAlarmGroupConfig(nextCfg, group);
          if (!g) throw new Error(`Group '${group}' not found.`);
          delete g.audible_enabled;
          const af = validateAlarmAudioFileId(nextCfg, audioField.input.value);
          if (!af) delete g.audio_file;
          else g.audio_file = af;
          const mode = String(modeSel.value || 'inherit').trim();
          if (mode === 'inherit') delete g.audio_mode;
          else g.audio_mode = mode;
          const st = String(speechBox.value || '').trim();
          if (!st) delete g.speech_text;
          else g.speech_text = st;

          const repMode = String(repeatMode.value || 'inherit');
          if (repMode === 'inherit') {
            delete g.repeat_ms;
          } else if (repMode === 'off') {
            g.repeat_ms = 0;
          } else if (repMode === 'on') {
            const sec = Math.trunc(Number(String(repeatSec.value ?? '').trim() || '0') || 0);
            if (!Number.isFinite(sec) || sec <= 0) throw new Error('Repeat interval is required when Repeat is enabled.');
            if (sec > 86400) throw new Error('Repeat interval is too large.');
            g.repeat_ms = sec * 1000;
          }
        } else {
          ensureGroupSiteInConfig(nextCfg, group, site);
          const s = findAlarmSiteConfig(nextCfg, group, site);
          if (!s) throw new Error(`Site '${site}' not found under group '${group}'.`);
          s.alarms_enabled = Boolean(processingBox?.checked);
          delete s.audible_enabled;
          const af = validateAlarmAudioFileId(nextCfg, audioField.input.value);
          if (!af) delete s.audio_file;
          else s.audio_file = af;
          const mode = String(modeSel.value || 'inherit').trim();
          if (mode === 'inherit') delete s.audio_mode;
          else s.audio_mode = mode;
          const st = String(speechBox.value || '').trim();
          if (!st) delete s.speech_text;
          else s.speech_text = st;

          const repMode = String(repeatMode.value || 'inherit');
          if (repMode === 'inherit') {
            delete s.repeat_ms;
          } else if (repMode === 'off') {
            s.repeat_ms = 0;
          } else if (repMode === 'on') {
            const sec = Math.trunc(Number(String(repeatSec.value ?? '').trim() || '0') || 0);
            if (!Number.isFinite(sec) || sec <= 0) throw new Error('Repeat interval is required when Repeat is enabled.');
            if (sec > 86400) throw new Error('Repeat interval is too large.');
            s.repeat_ms = sec * 1000;
          }
        }

        await saveOpcbridgeAlarmsConfig(nextCfg);
        await opcbridgeReload().catch(() => {});
        await doReload();
        setStatus('Saved.');
      } catch (err) {
        setStatus(`Save failed: ${err.message}`);
      }
    });

    revertBtn.addEventListener('click', async () => {
      setStatus('Reverting…');
      await doReload();
      setStatus('Reverted.');
    });

    host.appendChild(form);
    if (delBtn && scope === 'group') {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete Group…';
      delBtn.onclick = () => deleteAlarmGroupInteractive(group).catch((err) => window.alert(`Group delete failed: ${err.message}`));
    }
    if (delBtn && scope === 'site') {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete Site…';
      delBtn.onclick = () => deleteAlarmSiteInteractive(group, site).catch((err) => window.alert(`Site delete failed: ${err.message}`));
    }
    return;
  }

  if (type === 'event_tag') {
    const conn = String(item?.meta?.connection_id || '').trim();
    const name = String(item?.meta?.name || item?.label || '').trim();
    const tagRow = getEffectiveTagsAll().find((t) => String(t?.connection_id || '') === conn && String(t?.name || '') === name) || {};

    addPropRow('Type', 'Event');
    addPropRow('Connection', conn);
    addPropRow('Tag', name);
    addPropRow('Datatype', String(tagRow?.datatype || ''));
    addPropRow('Writable', tagRow?.writable === true ? 'yes' : 'no');
    addPropRow('Event logging', tagRow?.log_event_on_change === true ? 'enabled' : 'disabled');

    if (delBtn) {
      delBtn.style.display = '';
      delBtn.textContent = (tagRow?.log_event_on_change === true) ? 'Delete Event…' : 'Add Event…';
      delBtn.onclick = () => setTagEventLogging(conn, name, !(tagRow?.log_event_on_change === true));
    }
    return;
  }

  if (type === 'audio_file') {
    const audioId = String(item?.meta?.id || '').trim();
    const folder = audioFolderFromPath(item?.meta?.path);
    const host = els.alarmsEventsPropsEditor;
    addPropRow('Type', 'Audio File');
    addPropRow('ID', audioId);
    addPropRow('Name', String(item?.meta?.name || item?.label || ''));
    addPropRow('Path', String(item?.meta?.path || ''));

    if (delBtn) {
      delBtn.style.display = '';
      delBtn.textContent = 'Delete…';
      delBtn.onclick = () => deleteAlarmAudioFileById(audioId).then((ok) => { if (ok) renderAlarmsEventsTree(); }).catch((err) => window.alert(`Audio delete failed: ${err.message}`));
    }
    const moveBtn = document.createElement('button');
    moveBtn.className = 'btn';
    moveBtn.type = 'button';
    moveBtn.textContent = 'Move…';
    moveBtn.disabled = !canEditConfig();
    moveBtn.onclick = () => moveAlarmAudioFileInteractive(audioId).catch((err) => window.alert(`Audio move failed: ${err.message}`));
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const folderBtn = document.createElement('button');
    folderBtn.className = 'btn';
    folderBtn.type = 'button';
    folderBtn.textContent = 'New Folder';
    folderBtn.disabled = !canEditConfig();
    folderBtn.onclick = () => createAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder create failed: ${err.message}`));
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn primary';
    uploadBtn.type = 'button';
    uploadBtn.textContent = folder ? 'Upload Here' : 'Upload Audio File';
    uploadBtn.disabled = !canEditConfig();
    uploadBtn.onclick = () => chooseAndUploadAlarmAudioFile(folder);
    actions.appendChild(moveBtn);
    actions.appendChild(folderBtn);
    actions.appendChild(uploadBtn);
    if (host) {
      host.style.display = 'block';
      host.appendChild(actions);
    }
    return;
  }

  if (type === 'audio_folder') {
    const folder = String(item?.meta?.folder || '').trim();
    const host = els.alarmsEventsPropsEditor;
    addPropRow('Type', 'Audio Folder');
    addPropRow('Folder', folder ? `audio/${folder}` : 'audio');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.style.marginTop = '10px';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.type = 'button';
    addBtn.textContent = 'New Subfolder';
    addBtn.disabled = !canEditConfig();
    addBtn.onclick = () => createAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder create failed: ${err.message}`));
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn primary';
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload Here';
    uploadBtn.disabled = !canEditConfig();
    uploadBtn.onclick = () => chooseAndUploadAlarmAudioFile(folder);
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn bad';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete Folder';
    deleteBtn.disabled = !canEditConfig();
    deleteBtn.onclick = () => deleteAlarmAudioFolderInteractive(folder).catch((err) => window.alert(`Audio folder delete failed: ${err.message}`));
    actions.appendChild(addBtn);
    actions.appendChild(uploadBtn);
    actions.appendChild(deleteBtn);
    if (host) {
      host.style.display = 'block';
      host.appendChild(actions);
    }
    return;
  }

  if (type === 'event_connection') {
    const conn = String(item?.meta?.connection_id || item?.label || '').trim();
    const count = Array.isArray(item?.children) ? item.children.length : 0;
    addPropRow('Type', 'Event Connection');
    addPropRow('Connection', conn);
    addPropRow('Events', String(count));
    return;
  }

  addPropRow('Type', type || '(unknown)');
  addPropRow('ID', String(item?.id || ''));
}

function renderAlarmsEventsTree() {
  if (!els.alarmsEventsTreeView) return;
  els.alarmsEventsTreeView.textContent = '';

  const tree = buildAlarmsEventsTree();
  state.alarmsEventsTreeRoot = tree;
  (tree.children || []).forEach((node) => renderAlarmsEventsTreeNode(node, els.alarmsEventsTreeView));

  if (els.alarmsEventsTreeNote) {
    const alarmCount = Array.isArray(state.alarmsConfig?.alarms) ? state.alarmsConfig.alarms.length : 0;
    const eventCount = getEffectiveTagsAll().filter((t) => t?.log_event_on_change === true).length;
    const audioCount = getAlarmAudioFiles(state.alarmsConfig || {}).length;
    const contactCount = getNotificationContacts(state.alarmsConfig || {}).length;
    const policyCount = getNotificationPolicies(state.alarmsConfig || {}).length;
    els.alarmsEventsTreeNote.textContent = `Alarms: ${alarmCount} · Events: ${eventCount} · Audio: ${audioCount} · Contacts: ${contactCount} · Policies: ${policyCount}`;
  }

  const selectedId = String(state.alarmsEventsSelectedNodeId || '').trim();
  const selected = selectedId ? findAlarmsEventsNodeById(tree, selectedId) : null;
  if (selected && !isAlarmsEventsLeafType(selected.type)) {
    renderAlarmsEventsDetails(selected);
    return;
  }

  state.alarmsEventsSelectedNodeId = 'folder:alarms';
  const fallback = findAlarmsEventsNodeById(tree, state.alarmsEventsSelectedNodeId) || (tree.children || [])[0] || tree;
  renderAlarmsEventsDetails(fallback);
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

  return root;
}

function renderTreeNode(node, container) {
  const canExpand = ['project', 'folder', 'device'].includes(String(node.type || ''));
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
  } else if (node.type === 'event_connection') {
    const n = Array.isArray(node.children) ? node.children.length : 0;
    meta.textContent = n ? `${n} event(s)` : '';
  } else if (node.type === 'audio_files_root') {
    const n = getAlarmAudioFiles(state.alarmsConfig || {}).length;
    meta.textContent = n ? `${n} file(s)` : '';
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

    items.push({ label: 'Refresh', onClick: async () => { await loadConnectionsList(); await loadTagsConfig(); await refreshAll(); renderWorkspaceTree(); } });

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
  if (els.workspaceChildrenHint) {
    const label = String(node?.label || '').trim();
    const count = rowsToRender.length;
    els.workspaceChildrenHint.textContent = showTagCols
      ? `${count} tag${count === 1 ? '' : 's'}${connectionId ? ` · ${connectionId}` : ''}`
      : `${count} item${count === 1 ? '' : 's'}${label ? ` · ${label}` : ''}`;
  }

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
        const cur = state.workspaceChildrenSort || { key: 'name', dir: 'asc' };
        const isActiveSort = c.sortable && String(cur.key || '') === String(c.key || '');
        th.textContent = isActiveSort ? `${c.label} ${cur.dir === 'desc' ? '▼' : '▲'}` : c.label;
        if (c.sortable) {
          th.classList.add('sortable');
          th.title = `Sort by ${c.label}`;
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

  const stageDuplicateSelectedTags = () => {
    const keys = Array.from(state.workspaceChildrenSel || []);
    const tagKeys = keys.filter((k) => k.includes('::'));
    if (!tagKeys.length) return;

    const effective = getEffectiveTagsAll();
    const usedByConn = new Map();
    (state.tagConfigAll || []).forEach((t) => {
      const cid = String(t?.connection_id || '').trim();
      const name = String(t?.name || '').trim();
      if (!cid || !name) return;
      if (!usedByConn.has(cid)) usedByConn.set(cid, new Set());
      usedByConn.get(cid).add(name);
    });

    const addedKeys = [];
    tagKeys.forEach((key) => {
      const source = effective.find((t) => makeTagKey(t) === key) || null;
      if (!source) return;
      const cid = String(source?.connection_id || '').trim();
      const name = String(source?.name || '').trim();
      if (!cid || !name) return;
      if (!usedByConn.has(cid)) usedByConn.set(cid, new Set());
      const used = usedByConn.get(cid);
      const nextName = uniqueCopyId(name, used);
      used.add(nextName);

      const copy = sanitizeTagForPost({ ...source, name: nextName });
      state.tagConfigAll.push(copy);
      addedKeys.push(makeTagKey(copy));
    });

    if (!addedKeys.length) return;
    markTagsDirty(true);
    state.workspaceChildrenSel = new Set(addedKeys);
    state.workspaceChildrenLastIndex = -1;
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
        const selectedCount = state.workspaceChildrenSel.size;
        showContextMenu(e.clientX, e.clientY, [
          { label: selectedCount === 1 ? 'Duplicate Tag' : `Duplicate selected tag(s) (${selectedCount})`, onClick: stageDuplicateSelectedTags },
          { label: `Delete selected tag(s) (${selectedCount})`, onClick: stageDeleteSelectedTags }
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
      const baseTags = Array.isArray(state.tagConfigLoadedAll) ? state.tagConfigLoadedAll : state.tagConfigAll;
      const effective = getEffectiveTagsAll();
      await saveTagsForChangedConnections(baseTags, effective);
    }

    // 3) Save alarms config (only if we staged updates, e.g., renaming a device)
    if (state.alarmsConfigDirty) {
      const cfg = state.alarmsConfig || { alarms: [], groups: [] };
      await saveOpcbridgeAlarmsConfig(cfg);
      state.alarmsConfigDirty = false;
    }

	    if (reload) {
	      setWorkspaceSaveStatus('Saved. Rebuilding full runtime…');
	      renderWorkspaceSaveBar();
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
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('upstream timeout') || lowerMsg.includes('request timed out')) {
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
  const isArrayRoot = (t?.is_array_root === true);

  let status = 'BAD';
  let cls = 'status-error';

  if (!handleOk) {
    status = 'BAD_HANDLE';
  } else if (!hasSnap && isArrayRoot) {
    status = 'ARRAY';
    cls = 'status-ok';
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

    const value = (() => {
      if (status === 'ARRAY') return '(array)';
      if (t?.value == null) return '';
      return (typeof t.value === 'string' ? t.value : JSON.stringify(t.value));
    })();

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

function renderAlarmsSchemaStatus(alarmsStatus) {
  if (!els.alarmsSchemaStatus) return;
  // Config schema/version messaging is intentionally suppressed. We support a
  // single current config shape and avoid surfacing schema/version terms in UI.
  els.alarmsSchemaStatus.style.display = 'none';
  els.alarmsSchemaStatus.textContent = '';
}

function setAlarmRuntimeWarningUi(text) {
  const has = Boolean(String(text || '').trim());
  if (els.overviewAlarmRuntimeWarning) {
    els.overviewAlarmRuntimeWarning.style.display = has ? '' : 'none';
    els.overviewAlarmRuntimeWarning.textContent = has ? String(text) : '';
  }
  if (els.overviewAlarmRuntimeWarningActions) els.overviewAlarmRuntimeWarningActions.style.display = has ? '' : 'none';
  if (els.alarmsEventsRuntimeWarning) {
    els.alarmsEventsRuntimeWarning.style.display = has ? '' : 'none';
    els.alarmsEventsRuntimeWarning.textContent = has ? String(text) : '';
  }
  if (els.alarmsEventsRuntimeWarningActions) els.alarmsEventsRuntimeWarningActions.style.display = has ? '' : 'none';
}

function computeAlarmRuntimeWarning(alarmsStatus) {
  const cfgAlarms = Array.isArray(state.alarmsConfig?.alarms) ? state.alarmsConfig.alarms.length : 0;
  const subCount = Number(alarmsStatus?.config?.subscription_key_count || 0);
  const stale = Boolean(alarmsStatus?.opcbridge?.feed_stale);
  const wsConnected = Boolean(alarmsStatus?.opcbridge?.ws_connected);
  const lastTagUpdateMs = Number(alarmsStatus?.opcbridge?.last_tag_update_ms || 0);
  if (cfgAlarms > 0 && subCount === 0) return `Alarm runtime mismatch: ${cfgAlarms} configured alarm(s), 0 subscribed keys. Use Re-test or Restart Alarm Runtime.`;
  // Do not warn for normal idle periods after at least one successful tag update.
  // Warn only when subscriptions exist and we have never seen a tag update,
  // or WS is disconnected while feed is stale.
  if (subCount > 0 && stale && (!wsConnected || lastTagUpdateMs <= 0)) {
    return `Alarm tag feed is unavailable. Alarms may not evaluate until tag updates resume.`;
  }
  return '';
}

async function restartAlarmRuntimeService() {
  if (!window.confirm('Restart opcbridge-alarms service now?')) return;
  setAlarmRuntimeWarningUi('Restarting alarm runtime…');
  try {
    const res = await apiPostJson('/api/alarms/systemd/restart', {});
    if (!res?.ok) throw new Error(res?.error || 'Restart failed.');
    await refreshAll();
  } catch (err) {
    setAlarmRuntimeWarningUi(`Restart failed: ${err.message}`);
  }
}

async function refreshAll() {
  const started = Date.now();
  try {
    const [health, alarmsStatus, reloadStatus] = await Promise.all([
      apiGet('/api/opcbridge/health'),
      apiGet('/api/alarms/alarm/api/status'),
      apiGet('/api/opcbridge/reload/status').catch(() => null)
    ]);

    renderOverviewHealth(health);
    renderRuntimeRebuildStatus(reloadStatus);
    renderJson(els.healthJson, health);
    renderJson(els.alarmsStatusJson, alarmsStatus);
    state.alarmsStatusLast = alarmsStatus;
    renderAlarmsSchemaStatus(alarmsStatus);

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
setAlarmRuntimeWarningUi(computeAlarmRuntimeWarning(alarmsStatus));

// If the user is browsing alarms/events in Workspace, refresh that view.
const sid = String(state.selectedNodeId || '');
if (sid.includes('alarms') || sid.includes('alarm')) {
  renderWorkspaceTree();
}

if (isPanelActive('tab-workspace') && !els.workspaceItemModal?.contains?.(document.activeElement) && !els.newTagModal?.contains?.(document.activeElement)) {
  renderWorkspaceTree();
}

// Keep the Alarms & Events child status columns live while the tab is open.
// Do not repaint over an active properties edit form.
if (isPanelActive('tab-alarms_events') && !isAlarmsEventsPropertiesEditorOpen()) {
  if (els.alarmsEventsChildrenTbody?.children?.length) updateAlarmsEventsLiveCells();
  else renderAlarmsEventsTree();
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

// Visible-scope refresh:
// - Always fetch a small baseline for the top status line.
// - Only fetch "heavy" data sets for the currently visible tab(s).
async function refreshVisible() {
  const started = Date.now();
  try {
    const [health, alarmsStatus, reloadStatus] = await Promise.all([
      apiGet('/api/opcbridge/health'),
      apiGet('/api/alarms/alarm/api/status'),
      apiGet('/api/opcbridge/reload/status').catch(() => null)
    ]);

    // Baseline render (safe even if tab not visible).
    renderJson(els.healthJson, health);
    renderJson(els.alarmsStatusJson, alarmsStatus);
    state.alarmsStatusLast = alarmsStatus;
    renderRuntimeRebuildStatus(reloadStatus);
    renderAlarmsSchemaStatus(alarmsStatus);
    renderOverviewHealth(health);

    const wantLiveTags = isPanelActive('tab-overview') || isPanelActive('tab-workspace');
    if (wantLiveTags) {
      const tags = await apiGet('/api/opcbridge/tags');
      renderLiveTags(tags);
    }

    const wantAlarmsEvents = isPanelActive('tab-alarms_events');
    if (wantAlarmsEvents) {
      const [active, history, all] = await Promise.all([
        apiGet('/api/alarms/alarm/api/alarms/active').catch(() => ({ ok: false, alarms: [] })),
        apiGet('/api/alarms/alarm/api/alarms/history?limit=200').catch(() => ({ ok: false, events: [] })),
        apiGet('/api/alarms/alarm/api/alarms/all').catch(() => ({ ok: false, alarms: [] }))
      ]);
      renderActiveAlarms(active);
      renderAlarmEvents(history);

      state.alarmsAllLast = all;
      state.alarmsAll = Array.isArray(all?.alarms) ? all.alarms : [];

      // Keep alarms config fresh for Alarms & Events editing (and runtime warning accuracy).
      try { await loadOpcbridgeAlarmsConfig(); } catch { /* ignore */ }
      setAlarmRuntimeWarningUi(computeAlarmRuntimeWarning(alarmsStatus));

      // Keep the Alarms & Events child status columns live while the tab is open.
      // Do not repaint over an active properties edit form.
      if (!isAlarmsEventsPropertiesEditorOpen()) {
        if (els.alarmsEventsChildrenTbody?.children?.length) updateAlarmsEventsLiveCells();
        else renderAlarmsEventsTree();
      }
    }

    // Workspace is mostly local state; avoid network chatter during edits.
    if (isPanelActive('tab-workspace') &&
        !els.workspaceItemModal?.contains?.(document.activeElement) &&
        !els.newTagModal?.contains?.(document.activeElement)) {
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
    updateAuthAdminPanelVisibility();
    updateWorkspaceTabVisibility();
    updateAlarmsEventsTabVisibility();
    updateLogsTabVisibility();
    updateUsersTabVisibility();
    updateLoggerTabVisibility();
    ensureAuthAdminPanelLoaded();
    const configured = Boolean(s?.configured);
    const loggedIn = Boolean(s?.user_logged_in ?? s?.logged_in);
    const username = String(s?.user?.username || '').trim();
    const role = String(s?.user?.role || '').trim();

    if (state.authWasLoggedIn && configured && !loggedIn) {
      const sinceLogout = Date.now() - (Number(state.authLastLogoutAtMs) || 0);
      if (sinceLogout > 5000) {
        setWorkspaceSaveStatus('Session expired. Press Login to continue.');
      }
    }
    state.authWasLoggedIn = loggedIn;

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
    updateAuthAdminPanelVisibility();
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
  // Keep modal open unless explicitly closed via buttons.
  if (els.loginModal.dataset.noOverlayClose !== '1') {
    els.loginModal.dataset.noOverlayClose = '1';
    const swallow = (e) => {
      if (e.target === els.loginModal) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    els.loginModal.addEventListener('mousedown', swallow, true);
    els.loginModal.addEventListener('mouseup', swallow, true);
    els.loginModal.addEventListener('click', swallow, true);
  }
  els.loginModal.addEventListener('keydown', (e) => {
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
    state.authLastLogoutAtMs = Date.now();
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
  state.refreshTimer = window.setInterval(refreshVisible, ms);
}

async function main() {
  setTab('overview');
  updateConfigureTabVisibility();
  updateAuthAdminPanelVisibility();
  updateWorkspaceTabVisibility();
  updateAlarmsEventsTabVisibility();
  updateLoggerTabVisibility();
  updateLogsTabVisibility();
  updateUsersTabVisibility();

  startUserAuthPolling();

  wireScadaSettingsUi();
  wireAlarmNotificationUi();
  wireSvcUi();
  wireMqttCaUi();
  wireLoggerUi();
  wireOverviewRuntimeUi();
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
    await loadAuthAdminPanel();
    await loadSoundSettings();
    await loadTtsSettings();
    await loadSipSettings();
    await loadVoiceModemSettings();
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
    await refreshVisible();
  } catch {
    // ignore
  }

  restartRefreshLoop();
}

main();
