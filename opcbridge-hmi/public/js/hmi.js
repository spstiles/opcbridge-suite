const toolbar = document.getElementById("toolbar");
const editorPane = document.getElementById("editor-pane");
const editorResizer = document.getElementById("editor-resizer");
const runtimeBtn = document.getElementById("runtimeBtn");
const wsStatus = document.getElementById("wsStatus");
const alarmsBadge = document.getElementById("alarmsBadge");
const wsBadge = document.getElementById("wsBadge");
const projectTitleEl = document.querySelector(".project-title");
const screenWrapper = document.getElementById("screen-wrapper");
const screen = document.getElementById("screen");
const screenTitle = document.getElementById("screen-title");
const groupBreadcrumb = document.getElementById("groupBreadcrumb");
const toolHint = document.getElementById("toolHint");
const editorFilename = document.getElementById("editor-filename");
const jsoncEditor = document.getElementById("jsoncEditor");
const editorStatus = document.getElementById("editorStatus");
const screenList = document.getElementById("screenList");
const screenOpenBtn = document.getElementById("screenOpenBtn");
const screenNewBtn = document.getElementById("screenNewBtn");
const screenDuplicateBtn = document.getElementById("screenDuplicateBtn");
const screenDeleteBtn = document.getElementById("screenDeleteBtn");
const textToolBtn = document.getElementById("textToolBtn");
const buttonToolBtn = document.getElementById("buttonToolBtn");
const navToolBtn = document.getElementById("navToolBtn");
const numberInputToolBtn = document.getElementById("numberInputToolBtn");
const indicatorToolBtn = document.getElementById("indicatorToolBtn");
const viewportToolBtn = document.getElementById("viewportToolBtn");
const rectToolBtn = document.getElementById("rectToolBtn");
const polylineToolBtn = document.getElementById("polylineToolBtn");
const polygonToolBtn = document.getElementById("polygonToolBtn");
const regularPolygonToolBtn = document.getElementById("regularPolygonToolBtn");
const stretchedPolygonToolBtn = document.getElementById("stretchedPolygonToolBtn");
const barToolBtn = document.getElementById("barToolBtn");
const circleToolBtn = document.getElementById("circleToolBtn");
const circleCenterToolBtn = document.getElementById("circleCenterToolBtn");
const lineToolBtn = document.getElementById("lineToolBtn");
const curveToolBtn = document.getElementById("curveToolBtn");
const alarmsPanelToolBtn = document.getElementById("alarmsPanelToolBtn");
const groupProps = document.getElementById("groupProps");
const groupXInput = document.getElementById("groupX");
const groupYInput = document.getElementById("groupY");
const groupWInput = document.getElementById("groupW");
const groupHInput = document.getElementById("groupH");
const groupActionTypeSelect = document.getElementById("groupActionType");
const groupActionViewportRow = document.getElementById("groupActionViewportRow");
const groupActionViewportIdSelect = document.getElementById("groupActionViewportId");
const groupActionScreenRow = document.getElementById("groupActionScreenRow");
const groupActionScreenIdSelect = document.getElementById("groupActionScreenId");
const numberInputProps = document.getElementById("numberInputProps");
const numberInputXInput = document.getElementById("numberInputX");
const numberInputYInput = document.getElementById("numberInputY");
const numberInputConnectionInput = document.getElementById("numberInputConnection");
const numberInputTagSelect = document.getElementById("numberInputTag");
const numberInputDigitsInput = document.getElementById("numberInputDigits");
const numberInputDecimalsInput = document.getElementById("numberInputDecimals");
const numberInputMultiplierInput = document.getElementById("numberInputMultiplier");
const numberInputWidthInput = document.getElementById("numberInputWidth");
const numberInputHeightInput = document.getElementById("numberInputHeight");
const numberInputRadiusInput = document.getElementById("numberInputRadius");
const numberInputFillInput = document.getElementById("numberInputFill");
const numberInputFillTextInput = document.getElementById("numberInputFillText");
const numberInputFillSwatches = document.getElementById("numberInputFillSwatches");
const numberInputFillSwatchBtn = document.getElementById("numberInputFillSwatchBtn");
const numberInputTextColorInput = document.getElementById("numberInputTextColor");
const numberInputTextColorTextInput = document.getElementById("numberInputTextColorText");
const numberInputTextColorSwatches = document.getElementById("numberInputTextColorSwatches");
const numberInputTextColorSwatchBtn = document.getElementById("numberInputTextColorSwatchBtn");
const numberInputFontSizeInput = document.getElementById("numberInputFontSize");
const numberInputBoldInput = document.getElementById("numberInputBold");
const numberInputBorderEnabledInput = document.getElementById("numberInputBorderEnabled");
const numberInputBevelRow = document.getElementById("numberInputBevelRow");
const numberInputBevelInput = document.getElementById("numberInputBevel");
const numberInputStrokeRow = document.getElementById("numberInputStrokeRow");
const numberInputStrokeInput = document.getElementById("numberInputStroke");
const numberInputStrokeTextInput = document.getElementById("numberInputStrokeText");
const numberInputStrokeSwatches = document.getElementById("numberInputStrokeSwatches");
const numberInputStrokeSwatchBtn = document.getElementById("numberInputStrokeSwatchBtn");
const numberInputStrokeWidthRow = document.getElementById("numberInputStrokeWidthRow");
const numberInputStrokeWidthInput = document.getElementById("numberInputStrokeWidth");
const indicatorProps = document.getElementById("indicatorProps");
const indicatorXInput = document.getElementById("indicatorX");
const indicatorYInput = document.getElementById("indicatorY");
const indicatorWInput = document.getElementById("indicatorW");
const indicatorHInput = document.getElementById("indicatorH");
const indicatorRadiusInput = document.getElementById("indicatorRadius");
const indicatorBackgroundEnabledInput = document.getElementById("indicatorBackgroundEnabled");
const indicatorShadowInput = document.getElementById("indicatorShadow");
const indicatorFillRow = document.getElementById("indicatorFillRow");
const indicatorFillInput = document.getElementById("indicatorFill");
const indicatorFillTextInput = document.getElementById("indicatorFillText");
const indicatorFillSwatches = document.getElementById("indicatorFillSwatches");
const indicatorFillSwatchBtn = document.getElementById("indicatorFillSwatchBtn");
const indicatorTextColorInput = document.getElementById("indicatorTextColor");
const indicatorTextColorTextInput = document.getElementById("indicatorTextColorText");
const indicatorTextColorSwatches = document.getElementById("indicatorTextColorSwatches");
const indicatorTextColorSwatchBtn = document.getElementById("indicatorTextColorSwatchBtn");
const indicatorFontSizeInput = document.getElementById("indicatorFontSize");
const indicatorBoldInput = document.getElementById("indicatorBold");
const indicatorBorderEnabledInput = document.getElementById("indicatorBorderEnabled");
const indicatorBevelRow = document.getElementById("indicatorBevelRow");
const indicatorBevelInput = document.getElementById("indicatorBevel");
const indicatorStrokeRow = document.getElementById("indicatorStrokeRow");
const indicatorStrokeInput = document.getElementById("indicatorStroke");
const indicatorStrokeTextInput = document.getElementById("indicatorStrokeText");
const indicatorStrokeSwatches = document.getElementById("indicatorStrokeSwatches");
const indicatorStrokeSwatchBtn = document.getElementById("indicatorStrokeSwatchBtn");
const indicatorStrokeWidthRow = document.getElementById("indicatorStrokeWidthRow");
const indicatorStrokeWidthInput = document.getElementById("indicatorStrokeWidth");
const indicatorConnectionInput = document.getElementById("indicatorConnection");
const indicatorTagSelect = document.getElementById("indicatorTag");
const indicatorStateModeSelect = document.getElementById("indicatorStateMode");
const indicatorLabelOverlayInput = document.getElementById("indicatorLabelOverlay");
const indicatorLabelValignSelect = document.getElementById("indicatorLabelValign");
const indicatorAddStateBtn = document.getElementById("indicatorAddStateBtn");
const indicatorRemoveStateBtn = document.getElementById("indicatorRemoveStateBtn");
const indicatorStatesList = document.getElementById("indicatorStatesList");
const libraryImagesGrid = document.getElementById("libraryImagesGrid");
const hmiSvg = document.getElementById("hmi-svg");
const jsoncApplyBtn = document.getElementById("jsoncApplyBtn");
const jsoncSaveBtn = document.getElementById("jsoncSaveBtn");
const jsoncReloadBtn = document.getElementById("jsoncReloadBtn");
const screenSaveBtn = document.getElementById("screenSaveBtn");
const snapToggleBtn = document.getElementById("snapToggleBtn");
const groupToggleBtn = document.getElementById("groupToggleBtn");
const menuToggleBtn = document.getElementById("menuToggleBtn");
const menuDropdown = document.getElementById("menuDropdown");
const groupMenuBtn = document.getElementById("groupMenuBtn");
const ungroupMenuBtn = document.getElementById("ungroupMenuBtn");
const alignMenuLeft = document.getElementById("alignMenuLeft");
const alignMenuCenter = document.getElementById("alignMenuCenter");
const alignMenuRight = document.getElementById("alignMenuRight");
const alignMenuTop = document.getElementById("alignMenuTop");
const alignMenuMiddle = document.getElementById("alignMenuMiddle");
const alignMenuBottom = document.getElementById("alignMenuBottom");
const matchMenuWidth = document.getElementById("matchMenuWidth");
const matchMenuHeight = document.getElementById("matchMenuHeight");
const matchMenuSize = document.getElementById("matchMenuSize");
const spaceMenuHorizontal = document.getElementById("spaceMenuHorizontal");
const spaceMenuVertical = document.getElementById("spaceMenuVertical");
const flipMenuHorizontal = document.getElementById("flipMenuHorizontal");
const flipMenuVertical = document.getElementById("flipMenuVertical");
const moveToFrontMenuBtn = document.getElementById("moveToFrontMenuBtn");
const moveToBackMenuBtn = document.getElementById("moveToBackMenuBtn");
const exportSelectionSvgBtn = document.getElementById("exportSelectionSvgBtn");
const explodeSelectedSvgBtn = document.getElementById("explodeSelectedSvgBtn");
const aboutMenuBtn = document.getElementById("aboutMenuBtn");
const settingsMenuBtn = document.getElementById("settingsMenuBtn");
const alarmsMenuBtn = document.getElementById("alarmsMenuBtn");

const setEditorStatusSafe = (message) => {
  if (!editorStatus) return;
  editorStatus.textContent = String(message ?? "").slice(0, 400);
};
const loginMenuBtn = document.getElementById("loginMenuBtn");
const usersMenuBtn = document.getElementById("usersMenuBtn");
const auditMenuBtn = document.getElementById("auditMenuBtn");
const logoutMenuBtn = document.getElementById("logoutMenuBtn");
const aboutOverlay = document.getElementById("aboutOverlay");
const aboutCloseBtn = document.getElementById("aboutCloseBtn");
const aboutRefreshBtn = document.getElementById("aboutRefreshBtn");
const aboutCopyBtn = document.getElementById("aboutCopyBtn");
const aboutText = document.getElementById("aboutText");
const aboutStatus = document.getElementById("aboutStatus");
const auditOverlay = document.getElementById("auditOverlay");
const auditCloseBtn = document.getElementById("auditCloseBtn");
const auditRefreshBtn = document.getElementById("auditRefreshBtn");
const auditCopyBtn = document.getElementById("auditCopyBtn");
const auditDownloadBtn = document.getElementById("auditDownloadBtn");
const auditTableBody = document.getElementById("auditTableBody");
const auditStatus = document.getElementById("auditStatus");
const alarmsOverlay = document.getElementById("alarmsOverlay");
const alarmsCloseBtn = document.getElementById("alarmsCloseBtn");
const alarmsRefreshBtn = document.getElementById("alarmsRefreshBtn");
const alarmsStatus = document.getElementById("alarmsStatus");
const alarmsActiveTableBody = document.getElementById("alarmsActiveTableBody");
const alarmsEventsTableBody = document.getElementById("alarmsEventsTableBody");
const authOverlay = document.getElementById("authOverlay");
const authCloseBtn = document.getElementById("authCloseBtn");
const authSessionSummary = document.getElementById("authSessionSummary");
const authLogoutBtn = document.getElementById("authLogoutBtn");
const authRefreshBtn = document.getElementById("authRefreshBtn");
const authStatusEl = document.getElementById("authStatus");
const authSetupSection = document.getElementById("authSetupSection");
const authSetupUsername = document.getElementById("authSetupUsername");
const authSetupPassword = document.getElementById("authSetupPassword");
const authSetupPasswordConfirm = document.getElementById("authSetupPasswordConfirm");
const authSetupTimeout = document.getElementById("authSetupTimeout");
const authSetupBtn = document.getElementById("authSetupBtn");
const authLoginSection = document.getElementById("authLoginSection");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authLoginBtn = document.getElementById("authLoginBtn");
const usersOverlay = document.getElementById("usersOverlay");
const usersCloseBtn = document.getElementById("usersCloseBtn");
const usersList = document.getElementById("usersList");
const usersAddUsername = document.getElementById("usersAddUsername");
const usersAddPassword = document.getElementById("usersAddPassword");
const usersAddPasswordConfirm = document.getElementById("usersAddPasswordConfirm");
const usersAddRole = document.getElementById("usersAddRole");
const usersAddUserBtn = document.getElementById("usersAddUserBtn");
const usersTimeoutMinutes = document.getElementById("usersTimeoutMinutes");
const usersSaveTimeoutBtn = document.getElementById("usersSaveTimeoutBtn");
const usersRefreshBtn = document.getElementById("usersRefreshBtn");
const usersStatusEl = document.getElementById("usersStatus");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsCloseBtn = document.getElementById("settingsCloseBtn");
const settingsHostInput = document.getElementById("settingsHost");
const settingsHttpPortInput = document.getElementById("settingsHttpPort");
const settingsWsPortInput = document.getElementById("settingsWsPort");
const settingsWriteTokenInput = document.getElementById("settingsWriteToken");
const settingsAlarmsHostInput = document.getElementById("settingsAlarmsHost");
const settingsAlarmsHttpPortInput = document.getElementById("settingsAlarmsHttpPort");
const settingsAlarmsWsPortInput = document.getElementById("settingsAlarmsWsPort");
const settingsDefaultScreenSelect = document.getElementById("settingsDefaultScreen");
const settingsTouchscreenModeInput = document.getElementById("settingsTouchscreenMode");
const settingsViewOnlyModeInput = document.getElementById("settingsViewOnlyMode");
const settingsTestBtn = document.getElementById("settingsTestBtn");
const settingsApplyBtn = document.getElementById("settingsApplyBtn");
const settingsSaveBtn = document.getElementById("settingsSaveBtn");
const settingsStatus = document.getElementById("settingsStatus");
const keypadOverlay = document.getElementById("keypadOverlay");
const keypadCancelBtn = document.getElementById("keypadCancelBtn");
const keypadDisplay = document.getElementById("keypadDisplay");
const keypadTitle = document.getElementById("keypadTitle");
const screenWidthInput = document.getElementById("screenWidth");
const screenHeightInput = document.getElementById("screenHeight");
const screenBgInput = document.getElementById("screenBg");
const screenBgTextInput = document.getElementById("screenBgText");
const screenBorderEnabledInput = document.getElementById("screenBorderEnabled");
const screenBorderColorInput = document.getElementById("screenBorderColor");
const screenBorderColorTextInput = document.getElementById("screenBorderColorText");
const screenBorderWidthInput = document.getElementById("screenBorderWidth");
const screenBorderColorRow = document.getElementById("screenBorderColorRow");
const screenBorderWidthRow = document.getElementById("screenBorderWidthRow");
const screenBgSwatches = document.getElementById("screenBgSwatches");
const screenBorderSwatches = document.getElementById("screenBorderSwatches");
const screenBgSwatchBtn = document.getElementById("screenBgSwatchBtn");
const screenBorderSwatchBtn = document.getElementById("screenBorderSwatchBtn");
const screenProps = document.getElementById("screenProps");
const textProps = document.getElementById("textProps");
const textValueInput = document.getElementById("textValue");
const textFontSizeInput = document.getElementById("textFontSize");
const textBoldInput = document.getElementById("textBold");
const textFillInput = document.getElementById("textFill");
const textFillTextInput = document.getElementById("textFillText");
const textFillSwatches = document.getElementById("textFillSwatches");
const textFillSwatchBtn = document.getElementById("textFillSwatchBtn");
const textAlignSelect = document.getElementById("textAlign");
const textValignSelect = document.getElementById("textValign");
const textBgInput = document.getElementById("textBg");
const textBgTextInput = document.getElementById("textBgText");
const textBgSwatches = document.getElementById("textBgSwatches");
const textBgSwatchBtn = document.getElementById("textBgSwatchBtn");
const textBorderColorInput = document.getElementById("textBorderColor");
const textBorderColorTextInput = document.getElementById("textBorderColorText");
const textBorderSwatches = document.getElementById("textBorderSwatches");
const textBorderSwatchBtn = document.getElementById("textBorderSwatchBtn");
const textRadiusInput = document.getElementById("textRadius");
const textBindConnectionInput = document.getElementById("textBindConnection");
const textBindTagSelect = document.getElementById("textBindTag");
const textBindDigitsInput = document.getElementById("textBindDigits");
const textBindDecimalsInput = document.getElementById("textBindDecimals");
const textBindMultiplierInput = document.getElementById("textBindMultiplier");
const textAutoEnabledInput = document.getElementById("textAutoEnabled");
const textAutoInvertInput = document.getElementById("textAutoInvert");
const textAutoFields = document.getElementById("textAutoFields");
const textAutoConnectionInput = document.getElementById("textAutoConnection");
const textAutoTagSelect = document.getElementById("textAutoTag");
const textAutoModeSelect = document.getElementById("textAutoMode");
const textAutoThresholdRow = document.getElementById("textAutoThresholdRow");
const textAutoThresholdInput = document.getElementById("textAutoThreshold");
const textAutoMatchRow = document.getElementById("textAutoMatchRow");
const textAutoMatchInput = document.getElementById("textAutoMatch");
const textAutoOnInput = document.getElementById("textAutoOn");
const textAutoOnTextInput = document.getElementById("textAutoOnText");
const textAutoOffInput = document.getElementById("textAutoOff");
const textAutoOffTextInput = document.getElementById("textAutoOffText");
const textAutoOnSwatches = document.getElementById("textAutoOnSwatches");
const textAutoOnSwatchBtn = document.getElementById("textAutoOnSwatchBtn");
const textAutoOffSwatches = document.getElementById("textAutoOffSwatches");
const textAutoOffSwatchBtn = document.getElementById("textAutoOffSwatchBtn");
const buttonProps = document.getElementById("buttonProps");
const buttonLabelInput = document.getElementById("buttonLabel");
const buttonActionSelect = document.getElementById("buttonActionType");
const buttonTargetSelect = document.getElementById("buttonTarget");
const buttonViewportSelect = document.getElementById("buttonViewportTarget");
const buttonViewportRow = document.getElementById("buttonViewportRow");
const buttonTargetRow = document.getElementById("buttonTargetRow");
const buttonWriteFields = document.getElementById("buttonWriteFields");
const buttonWriteConnectionInput = document.getElementById("buttonWriteConnection");
const buttonWriteTagSelect = document.getElementById("buttonWriteTag");
const buttonWriteOnRow = document.getElementById("buttonWriteOnRow");
const buttonWriteOnValueInput = document.getElementById("buttonWriteOnValue");
const buttonWriteOffValueInput = document.getElementById("buttonWriteOffValue");
const buttonWriteOnLabel = document.getElementById("buttonWriteOnLabel");
const buttonWriteOffRow = document.getElementById("buttonWriteOffRow");
const buttonPromptDefaultRow = document.getElementById("buttonPromptDefaultRow");
const buttonPromptDefaultInput = document.getElementById("buttonPromptDefault");
const buttonPromptMinRow = document.getElementById("buttonPromptMinRow");
const buttonPromptMinInput = document.getElementById("buttonPromptMin");
const buttonPromptMaxRow = document.getElementById("buttonPromptMaxRow");
const buttonPromptMaxInput = document.getElementById("buttonPromptMax");
const buttonPromptStepRow = document.getElementById("buttonPromptStepRow");
const buttonPromptStepInput = document.getElementById("buttonPromptStep");
const buttonWidthInput = document.getElementById("buttonWidth");
const buttonXInput = document.getElementById("buttonX");
const buttonYInput = document.getElementById("buttonY");
const buttonHeightInput = document.getElementById("buttonHeight");
const buttonRadiusInput = document.getElementById("buttonRadius");
const buttonFillInput = document.getElementById("buttonFill");
const buttonFillTextInput = document.getElementById("buttonFillText");
const buttonFillSwatches = document.getElementById("buttonFillSwatches");
const buttonFillSwatchBtn = document.getElementById("buttonFillSwatchBtn");
const buttonTextColorInput = document.getElementById("buttonTextColor");
const buttonTextColorTextInput = document.getElementById("buttonTextColorText");
const buttonTextColorSwatches = document.getElementById("buttonTextColorSwatches");
const buttonTextColorSwatchBtn = document.getElementById("buttonTextColorSwatchBtn");
const buttonFontSizeInput = document.getElementById("buttonFontSize");
const buttonBoldInput = document.getElementById("buttonBold");
const buttonStrokeInput = document.getElementById("buttonStroke");
const buttonStrokeTextInput = document.getElementById("buttonStrokeText");
const buttonStrokeSwatches = document.getElementById("buttonStrokeSwatches");
const buttonStrokeSwatchBtn = document.getElementById("buttonStrokeSwatchBtn");
const buttonAlignSelect = document.getElementById("buttonAlign");
const buttonValignSelect = document.getElementById("buttonValign");
const buttonBorderEnabledInput = document.getElementById("buttonBorderEnabled");
const buttonStrokeRow = document.getElementById("buttonStrokeRow");
const buttonShadowInput = document.getElementById("buttonShadow");
const buttonBevelInput = document.getElementById("buttonBevel");
const buttonLabelBindConnectionInput = document.getElementById("buttonLabelBindConnection");
const buttonLabelBindTagSelect = document.getElementById("buttonLabelBindTag");
const buttonLabelBindMultiplierInput = document.getElementById("buttonLabelBindMultiplier");
const buttonLabelBindDigitsInput = document.getElementById("buttonLabelBindDigits");
const buttonLabelBindDecimalsInput = document.getElementById("buttonLabelBindDecimals");
const buttonFillAutoEnabledInput = document.getElementById("buttonFillAutoEnabled");
const buttonFillAutoInvertInput = document.getElementById("buttonFillAutoInvert");
const buttonFillAutoFields = document.getElementById("buttonFillAutoFields");
const buttonFillAutoConnectionInput = document.getElementById("buttonFillAutoConnection");
const buttonFillAutoTagSelect = document.getElementById("buttonFillAutoTag");
const buttonFillAutoModeSelect = document.getElementById("buttonFillAutoMode");
const buttonFillAutoThresholdRow = document.getElementById("buttonFillAutoThresholdRow");
const buttonFillAutoThresholdInput = document.getElementById("buttonFillAutoThreshold");
const buttonFillAutoMatchRow = document.getElementById("buttonFillAutoMatchRow");
const buttonFillAutoMatchInput = document.getElementById("buttonFillAutoMatch");
const buttonFillAutoOnInput = document.getElementById("buttonFillAutoOn");
const buttonFillAutoOnTextInput = document.getElementById("buttonFillAutoOnText");
const buttonFillAutoOffInput = document.getElementById("buttonFillAutoOff");
const buttonFillAutoOffTextInput = document.getElementById("buttonFillAutoOffText");
const buttonFillAutoOnSwatches = document.getElementById("buttonFillAutoOnSwatches");
const buttonFillAutoOnSwatchBtn = document.getElementById("buttonFillAutoOnSwatchBtn");
const buttonFillAutoOffSwatches = document.getElementById("buttonFillAutoOffSwatches");
const buttonFillAutoOffSwatchBtn = document.getElementById("buttonFillAutoOffSwatchBtn");
const buttonTextAutoEnabledInput = document.getElementById("buttonTextAutoEnabled");
const buttonTextAutoInvertInput = document.getElementById("buttonTextAutoInvert");
const buttonTextAutoFields = document.getElementById("buttonTextAutoFields");
const buttonTextAutoConnectionInput = document.getElementById("buttonTextAutoConnection");
const buttonTextAutoTagSelect = document.getElementById("buttonTextAutoTag");
const buttonTextAutoModeSelect = document.getElementById("buttonTextAutoMode");
const buttonTextAutoThresholdRow = document.getElementById("buttonTextAutoThresholdRow");
const buttonTextAutoThresholdInput = document.getElementById("buttonTextAutoThreshold");
const buttonTextAutoMatchRow = document.getElementById("buttonTextAutoMatchRow");
const buttonTextAutoMatchInput = document.getElementById("buttonTextAutoMatch");
const buttonTextAutoOnInput = document.getElementById("buttonTextAutoOn");
const buttonTextAutoOnTextInput = document.getElementById("buttonTextAutoOnText");
const buttonTextAutoOffInput = document.getElementById("buttonTextAutoOff");
const buttonTextAutoOffTextInput = document.getElementById("buttonTextAutoOffText");
const buttonTextAutoOnSwatches = document.getElementById("buttonTextAutoOnSwatches");
const buttonTextAutoOnSwatchBtn = document.getElementById("buttonTextAutoOnSwatchBtn");
const buttonTextAutoOffSwatches = document.getElementById("buttonTextAutoOffSwatches");
const buttonTextAutoOffSwatchBtn = document.getElementById("buttonTextAutoOffSwatchBtn");
const viewportProps = document.getElementById("viewportProps");
const viewportIdInput = document.getElementById("viewportId");
const viewportXInput = document.getElementById("viewportX");
const viewportYInput = document.getElementById("viewportY");
const viewportWInput = document.getElementById("viewportW");
const viewportHInput = document.getElementById("viewportH");
const viewportRadiusInput = document.getElementById("viewportRadius");
const viewportTargetSelect = document.getElementById("viewportTarget");
const viewportScaleModeSelect = document.getElementById("viewportScaleMode");
const viewportBorderEnabledInput = document.getElementById("viewportBorderEnabled");
const viewportBevelRow = document.getElementById("viewportBevelRow");
const viewportBevelInput = document.getElementById("viewportBevel");
const viewportBorderColorInput = document.getElementById("viewportBorderColor");
const viewportBorderColorTextInput = document.getElementById("viewportBorderColorText");
const viewportBorderSwatches = document.getElementById("viewportBorderSwatches");
const viewportBorderSwatchBtn = document.getElementById("viewportBorderSwatchBtn");
const viewportBorderWidthInput = document.getElementById("viewportBorderWidth");
const viewportBorderColorRow = document.getElementById("viewportBorderColorRow");
const viewportBorderWidthRow = document.getElementById("viewportBorderWidthRow");
const rectProps = document.getElementById("rectProps");
const rectXInput = document.getElementById("rectX");
const rectYInput = document.getElementById("rectY");
const rectWInput = document.getElementById("rectW");
const rectHInput = document.getElementById("rectH");
const rectRadiusInput = document.getElementById("rectRadius");
const rectShadowInput = document.getElementById("rectShadow");
const rectBorderEnabledInput = document.getElementById("rectBorderEnabled");
const rectBevelRow = document.getElementById("rectBevelRow");
const rectBevelInput = document.getElementById("rectBevel");
const rectFillInput = document.getElementById("rectFill");
const rectFillTextInput = document.getElementById("rectFillText");
const rectFillSwatches = document.getElementById("rectFillSwatches");
const rectFillSwatchBtn = document.getElementById("rectFillSwatchBtn");
const rectStrokeInput = document.getElementById("rectStroke");
const rectStrokeTextInput = document.getElementById("rectStrokeText");
const rectStrokeSwatches = document.getElementById("rectStrokeSwatches");
const rectStrokeSwatchBtn = document.getElementById("rectStrokeSwatchBtn");
const rectStrokeWidthInput = document.getElementById("rectStrokeWidth");
const rectStrokeRow = document.getElementById("rectStrokeRow");
const rectStrokeWidthRow = document.getElementById("rectStrokeWidthRow");
const rectStrokeAutoHeader = document.getElementById("rectStrokeAutoHeader");
const rectStrokeAutoEnabledInput = document.getElementById("rectStrokeAutoEnabled");
const rectStrokeAutoInvertInput = document.getElementById("rectStrokeAutoInvert");
const rectStrokeAutoFields = document.getElementById("rectStrokeAutoFields");
const rectStrokeAutoConnectionInput = document.getElementById("rectStrokeAutoConnection");
const rectStrokeAutoTagSelect = document.getElementById("rectStrokeAutoTag");
const rectStrokeAutoModeSelect = document.getElementById("rectStrokeAutoMode");
const rectStrokeAutoThresholdRow = document.getElementById("rectStrokeAutoThresholdRow");
const rectStrokeAutoThresholdInput = document.getElementById("rectStrokeAutoThreshold");
const rectStrokeAutoMatchRow = document.getElementById("rectStrokeAutoMatchRow");
const rectStrokeAutoMatchInput = document.getElementById("rectStrokeAutoMatch");
const rectStrokeAutoOnInput = document.getElementById("rectStrokeAutoOn");
const rectStrokeAutoOnTextInput = document.getElementById("rectStrokeAutoOnText");
const rectStrokeAutoOnSwatches = document.getElementById("rectStrokeAutoOnSwatches");
const rectStrokeAutoOnSwatchBtn = document.getElementById("rectStrokeAutoOnSwatchBtn");
const rectStrokeAutoOffInput = document.getElementById("rectStrokeAutoOff");
const rectStrokeAutoOffTextInput = document.getElementById("rectStrokeAutoOffText");
const rectStrokeAutoOffSwatches = document.getElementById("rectStrokeAutoOffSwatches");
const rectStrokeAutoOffSwatchBtn = document.getElementById("rectStrokeAutoOffSwatchBtn");
const rectPropsTitle = document.getElementById("rectPropsTitle");
const alarmsPanelPropsFields = document.getElementById("alarmsPanelPropsFields");
const alarmsPanelMaxRowsInput = document.getElementById("alarmsPanelMaxRows");
const alarmsPanelOnlyUnackedInput = document.getElementById("alarmsPanelOnlyUnacked");
const alarmsPanelShowSourceInput = document.getElementById("alarmsPanelShowSource");
const alarmsPanelFontSizeInput = document.getElementById("alarmsPanelFontSize");
const alarmsPanelHeaderBgInput = document.getElementById("alarmsPanelHeaderBg");
const alarmsPanelHeaderBgTextInput = document.getElementById("alarmsPanelHeaderBgText");
const alarmsPanelHeaderBgSwatches = document.getElementById("alarmsPanelHeaderBgSwatches");
const alarmsPanelHeaderBgSwatchBtn = document.getElementById("alarmsPanelHeaderBgSwatchBtn");
const alarmsPanelHeaderTextInput = document.getElementById("alarmsPanelHeaderText");
const alarmsPanelHeaderTextTextInput = document.getElementById("alarmsPanelHeaderTextText");
const alarmsPanelHeaderTextSwatches = document.getElementById("alarmsPanelHeaderTextSwatches");
const alarmsPanelHeaderTextSwatchBtn = document.getElementById("alarmsPanelHeaderTextSwatchBtn");
const alarmsPanelRowBgNormalInput = document.getElementById("alarmsPanelRowBgNormal");
const alarmsPanelRowBgNormalTextInput = document.getElementById("alarmsPanelRowBgNormalText");
const alarmsPanelRowBgNormalSwatches = document.getElementById("alarmsPanelRowBgNormalSwatches");
const alarmsPanelRowBgNormalSwatchBtn = document.getElementById("alarmsPanelRowBgNormalSwatchBtn");
const alarmsPanelRowBgActiveUnackedInput = document.getElementById("alarmsPanelRowBgActiveUnacked");
const alarmsPanelRowBgActiveUnackedTextInput = document.getElementById("alarmsPanelRowBgActiveUnackedText");
const alarmsPanelRowBgActiveUnackedSwatches = document.getElementById("alarmsPanelRowBgActiveUnackedSwatches");
const alarmsPanelRowBgActiveUnackedSwatchBtn = document.getElementById("alarmsPanelRowBgActiveUnackedSwatchBtn");
const alarmsPanelRowBgActiveAckedInput = document.getElementById("alarmsPanelRowBgActiveAcked");
const alarmsPanelRowBgActiveAckedTextInput = document.getElementById("alarmsPanelRowBgActiveAckedText");
const alarmsPanelRowBgActiveAckedSwatches = document.getElementById("alarmsPanelRowBgActiveAckedSwatches");
const alarmsPanelRowBgActiveAckedSwatchBtn = document.getElementById("alarmsPanelRowBgActiveAckedSwatchBtn");
const alarmsPanelRowBgReturnedInput = document.getElementById("alarmsPanelRowBgReturned");
const alarmsPanelRowBgReturnedTextInput = document.getElementById("alarmsPanelRowBgReturnedText");
const alarmsPanelRowBgReturnedSwatches = document.getElementById("alarmsPanelRowBgReturnedSwatches");
const alarmsPanelRowBgReturnedSwatchBtn = document.getElementById("alarmsPanelRowBgReturnedSwatchBtn");
const alarmsPanelRowBgBadQualityInput = document.getElementById("alarmsPanelRowBgBadQuality");
const alarmsPanelRowBgBadQualityTextInput = document.getElementById("alarmsPanelRowBgBadQualityText");
const alarmsPanelRowBgBadQualitySwatches = document.getElementById("alarmsPanelRowBgBadQualitySwatches");
const alarmsPanelRowBgBadQualitySwatchBtn = document.getElementById("alarmsPanelRowBgBadQualitySwatchBtn");
const alarmsPanelRowTextNormalInput = document.getElementById("alarmsPanelRowTextNormal");
const alarmsPanelRowTextNormalTextInput = document.getElementById("alarmsPanelRowTextNormalText");
const alarmsPanelRowTextNormalSwatches = document.getElementById("alarmsPanelRowTextNormalSwatches");
const alarmsPanelRowTextNormalSwatchBtn = document.getElementById("alarmsPanelRowTextNormalSwatchBtn");
const alarmsPanelRowTextActiveUnackedInput = document.getElementById("alarmsPanelRowTextActiveUnacked");
const alarmsPanelRowTextActiveUnackedTextInput = document.getElementById("alarmsPanelRowTextActiveUnackedText");
const alarmsPanelRowTextActiveUnackedSwatches = document.getElementById("alarmsPanelRowTextActiveUnackedSwatches");
const alarmsPanelRowTextActiveUnackedSwatchBtn = document.getElementById("alarmsPanelRowTextActiveUnackedSwatchBtn");
const alarmsPanelRowTextActiveAckedInput = document.getElementById("alarmsPanelRowTextActiveAcked");
const alarmsPanelRowTextActiveAckedTextInput = document.getElementById("alarmsPanelRowTextActiveAckedText");
const alarmsPanelRowTextActiveAckedSwatches = document.getElementById("alarmsPanelRowTextActiveAckedSwatches");
const alarmsPanelRowTextActiveAckedSwatchBtn = document.getElementById("alarmsPanelRowTextActiveAckedSwatchBtn");
const alarmsPanelRowTextReturnedInput = document.getElementById("alarmsPanelRowTextReturned");
const alarmsPanelRowTextReturnedTextInput = document.getElementById("alarmsPanelRowTextReturnedText");
const alarmsPanelRowTextReturnedSwatches = document.getElementById("alarmsPanelRowTextReturnedSwatches");
const alarmsPanelRowTextReturnedSwatchBtn = document.getElementById("alarmsPanelRowTextReturnedSwatchBtn");
const alarmsPanelRowTextBadQualityInput = document.getElementById("alarmsPanelRowTextBadQuality");
const alarmsPanelRowTextBadQualityTextInput = document.getElementById("alarmsPanelRowTextBadQualityText");
const alarmsPanelRowTextBadQualitySwatches = document.getElementById("alarmsPanelRowTextBadQualitySwatches");
const alarmsPanelRowTextBadQualitySwatchBtn = document.getElementById("alarmsPanelRowTextBadQualitySwatchBtn");
const alarmsPanelStripeActiveUnackedInput = document.getElementById("alarmsPanelStripeActiveUnacked");
const alarmsPanelStripeActiveUnackedTextInput = document.getElementById("alarmsPanelStripeActiveUnackedText");
const alarmsPanelStripeActiveUnackedSwatches = document.getElementById("alarmsPanelStripeActiveUnackedSwatches");
const alarmsPanelStripeActiveUnackedSwatchBtn = document.getElementById("alarmsPanelStripeActiveUnackedSwatchBtn");
const alarmsPanelStripeActiveAckedInput = document.getElementById("alarmsPanelStripeActiveAcked");
const alarmsPanelStripeActiveAckedTextInput = document.getElementById("alarmsPanelStripeActiveAckedText");
const alarmsPanelStripeActiveAckedSwatches = document.getElementById("alarmsPanelStripeActiveAckedSwatches");
const alarmsPanelStripeActiveAckedSwatchBtn = document.getElementById("alarmsPanelStripeActiveAckedSwatchBtn");
const alarmsPanelStripeReturnedInput = document.getElementById("alarmsPanelStripeReturned");
const alarmsPanelStripeReturnedTextInput = document.getElementById("alarmsPanelStripeReturnedText");
const alarmsPanelStripeReturnedSwatches = document.getElementById("alarmsPanelStripeReturnedSwatches");
const alarmsPanelStripeReturnedSwatchBtn = document.getElementById("alarmsPanelStripeReturnedSwatchBtn");
const alarmsPanelStripeBadQualityInput = document.getElementById("alarmsPanelStripeBadQuality");
const alarmsPanelStripeBadQualityTextInput = document.getElementById("alarmsPanelStripeBadQualityText");
const alarmsPanelStripeBadQualitySwatches = document.getElementById("alarmsPanelStripeBadQualitySwatches");
const alarmsPanelStripeBadQualitySwatchBtn = document.getElementById("alarmsPanelStripeBadQualitySwatchBtn");
const rectFillAutoEnabledInput = document.getElementById("rectFillAutoEnabled");
const rectFillAutoInvertInput = document.getElementById("rectFillAutoInvert");
const rectFillAutoFields = document.getElementById("rectFillAutoFields");
const rectFillAutoConnectionInput = document.getElementById("rectFillAutoConnection");
const rectFillAutoTagSelect = document.getElementById("rectFillAutoTag");
const rectFillAutoModeSelect = document.getElementById("rectFillAutoMode");
const rectFillAutoThresholdRow = document.getElementById("rectFillAutoThresholdRow");
const rectFillAutoThresholdInput = document.getElementById("rectFillAutoThreshold");
const rectFillAutoMatchRow = document.getElementById("rectFillAutoMatchRow");
const rectFillAutoMatchInput = document.getElementById("rectFillAutoMatch");
const rectFillAutoOnInput = document.getElementById("rectFillAutoOn");
const rectFillAutoOnTextInput = document.getElementById("rectFillAutoOnText");
const rectFillAutoOffInput = document.getElementById("rectFillAutoOff");
const rectFillAutoOffTextInput = document.getElementById("rectFillAutoOffText");
const rectFillAutoOnSwatches = document.getElementById("rectFillAutoOnSwatches");
const rectFillAutoOnSwatchBtn = document.getElementById("rectFillAutoOnSwatchBtn");
const rectFillAutoOffSwatches = document.getElementById("rectFillAutoOffSwatches");
const rectFillAutoOffSwatchBtn = document.getElementById("rectFillAutoOffSwatchBtn");
const circleProps = document.getElementById("circleProps");
const circleCxInput = document.getElementById("circleCx");
const circleCyInput = document.getElementById("circleCy");
const circleRInput = document.getElementById("circleR");
const circleShadowInput = document.getElementById("circleShadow");
const circleBorderEnabledInput = document.getElementById("circleBorderEnabled");
const circleFillInput = document.getElementById("circleFill");
const circleFillTextInput = document.getElementById("circleFillText");
const circleFillSwatches = document.getElementById("circleFillSwatches");
const circleFillSwatchBtn = document.getElementById("circleFillSwatchBtn");
const circleStrokeInput = document.getElementById("circleStroke");
const circleStrokeTextInput = document.getElementById("circleStrokeText");
const circleStrokeSwatches = document.getElementById("circleStrokeSwatches");
const circleStrokeSwatchBtn = document.getElementById("circleStrokeSwatchBtn");
const circleStrokeWidthInput = document.getElementById("circleStrokeWidth");
const circleStrokeRow = document.getElementById("circleStrokeRow");
const circleStrokeWidthRow = document.getElementById("circleStrokeWidthRow");
const circleStrokeAutoHeader = document.getElementById("circleStrokeAutoHeader");
const circleStrokeAutoEnabledInput = document.getElementById("circleStrokeAutoEnabled");
const circleStrokeAutoInvertInput = document.getElementById("circleStrokeAutoInvert");
const circleStrokeAutoFields = document.getElementById("circleStrokeAutoFields");
const circleStrokeAutoConnectionInput = document.getElementById("circleStrokeAutoConnection");
const circleStrokeAutoTagSelect = document.getElementById("circleStrokeAutoTag");
const circleStrokeAutoModeSelect = document.getElementById("circleStrokeAutoMode");
const circleStrokeAutoThresholdRow = document.getElementById("circleStrokeAutoThresholdRow");
const circleStrokeAutoThresholdInput = document.getElementById("circleStrokeAutoThreshold");
const circleStrokeAutoMatchRow = document.getElementById("circleStrokeAutoMatchRow");
const circleStrokeAutoMatchInput = document.getElementById("circleStrokeAutoMatch");
const circleStrokeAutoOnInput = document.getElementById("circleStrokeAutoOn");
const circleStrokeAutoOnTextInput = document.getElementById("circleStrokeAutoOnText");
const circleStrokeAutoOnSwatches = document.getElementById("circleStrokeAutoOnSwatches");
const circleStrokeAutoOnSwatchBtn = document.getElementById("circleStrokeAutoOnSwatchBtn");
const circleStrokeAutoOffInput = document.getElementById("circleStrokeAutoOff");
const circleStrokeAutoOffTextInput = document.getElementById("circleStrokeAutoOffText");
const circleStrokeAutoOffSwatches = document.getElementById("circleStrokeAutoOffSwatches");
const circleStrokeAutoOffSwatchBtn = document.getElementById("circleStrokeAutoOffSwatchBtn");
const circleFillAutoEnabledInput = document.getElementById("circleFillAutoEnabled");
const circleFillAutoInvertInput = document.getElementById("circleFillAutoInvert");
const circleFillAutoFields = document.getElementById("circleFillAutoFields");
const circleFillAutoConnectionInput = document.getElementById("circleFillAutoConnection");
const circleFillAutoTagSelect = document.getElementById("circleFillAutoTag");
const circleFillAutoModeSelect = document.getElementById("circleFillAutoMode");
const circleFillAutoThresholdRow = document.getElementById("circleFillAutoThresholdRow");
const circleFillAutoThresholdInput = document.getElementById("circleFillAutoThreshold");
const circleFillAutoMatchRow = document.getElementById("circleFillAutoMatchRow");
const circleFillAutoMatchInput = document.getElementById("circleFillAutoMatch");
const circleFillAutoOnInput = document.getElementById("circleFillAutoOn");
const circleFillAutoOnTextInput = document.getElementById("circleFillAutoOnText");
const circleFillAutoOffInput = document.getElementById("circleFillAutoOff");
const circleFillAutoOffTextInput = document.getElementById("circleFillAutoOffText");
const circleFillAutoOnSwatches = document.getElementById("circleFillAutoOnSwatches");
const circleFillAutoOnSwatchBtn = document.getElementById("circleFillAutoOnSwatchBtn");
const circleFillAutoOffSwatches = document.getElementById("circleFillAutoOffSwatches");
const circleFillAutoOffSwatchBtn = document.getElementById("circleFillAutoOffSwatchBtn");
const lineStrokeAutoEnabledInput = document.getElementById("lineStrokeAutoEnabled");
const lineStrokeAutoInvertInput = document.getElementById("lineStrokeAutoInvert");
const lineStrokeAutoFields = document.getElementById("lineStrokeAutoFields");
const lineStrokeAutoConnectionInput = document.getElementById("lineStrokeAutoConnection");
const lineStrokeAutoTagSelect = document.getElementById("lineStrokeAutoTag");
const lineStrokeAutoModeSelect = document.getElementById("lineStrokeAutoMode");
const lineStrokeAutoThresholdRow = document.getElementById("lineStrokeAutoThresholdRow");
const lineStrokeAutoThresholdInput = document.getElementById("lineStrokeAutoThreshold");
const lineStrokeAutoMatchRow = document.getElementById("lineStrokeAutoMatchRow");
const lineStrokeAutoMatchInput = document.getElementById("lineStrokeAutoMatch");
const lineStrokeAutoOnInput = document.getElementById("lineStrokeAutoOn");
const lineStrokeAutoOnTextInput = document.getElementById("lineStrokeAutoOnText");
const lineStrokeAutoOnSwatches = document.getElementById("lineStrokeAutoOnSwatches");
const lineStrokeAutoOnSwatchBtn = document.getElementById("lineStrokeAutoOnSwatchBtn");
const lineStrokeAutoOffInput = document.getElementById("lineStrokeAutoOff");
const lineStrokeAutoOffTextInput = document.getElementById("lineStrokeAutoOffText");
const lineStrokeAutoOffSwatches = document.getElementById("lineStrokeAutoOffSwatches");
const lineStrokeAutoOffSwatchBtn = document.getElementById("lineStrokeAutoOffSwatchBtn");
const lineProps = document.getElementById("lineProps");
const lineX1Input = document.getElementById("lineX1");
const lineY1Input = document.getElementById("lineY1");
const lineX2Input = document.getElementById("lineX2");
const lineY2Input = document.getElementById("lineY2");
const lineStrokeInput = document.getElementById("lineStroke");
const lineStrokeTextInput = document.getElementById("lineStrokeText");
const lineStrokeSwatches = document.getElementById("lineStrokeSwatches");
const lineStrokeSwatchBtn = document.getElementById("lineStrokeSwatchBtn");
const lineStrokeWidthInput = document.getElementById("lineStrokeWidth");
const curveProps = document.getElementById("curveProps");
const curveX1Input = document.getElementById("curveX1");
const curveY1Input = document.getElementById("curveY1");
const curveCXInput = document.getElementById("curveCX");
const curveCYInput = document.getElementById("curveCY");
const curveX2Input = document.getElementById("curveX2");
const curveY2Input = document.getElementById("curveY2");
const curveStrokeInput = document.getElementById("curveStroke");
const curveStrokeTextInput = document.getElementById("curveStrokeText");
const curveStrokeSwatches = document.getElementById("curveStrokeSwatches");
const curveStrokeSwatchBtn = document.getElementById("curveStrokeSwatchBtn");
const curveStrokeWidthInput = document.getElementById("curveStrokeWidth");
const polylineProps = document.getElementById("polylineProps");
const polylineStrokeInput = document.getElementById("polylineStroke");
const polylineStrokeTextInput = document.getElementById("polylineStrokeText");
const polylineStrokeSwatches = document.getElementById("polylineStrokeSwatches");
const polylineStrokeSwatchBtn = document.getElementById("polylineStrokeSwatchBtn");
const polylineStrokeWidthInput = document.getElementById("polylineStrokeWidth");
const polygonProps = document.getElementById("polygonProps");
const polygonFillInput = document.getElementById("polygonFill");
const polygonFillTextInput = document.getElementById("polygonFillText");
const polygonFillSwatches = document.getElementById("polygonFillSwatches");
const polygonFillSwatchBtn = document.getElementById("polygonFillSwatchBtn");
const polygonStrokeInput = document.getElementById("polygonStroke");
const polygonStrokeTextInput = document.getElementById("polygonStrokeText");
const polygonStrokeSwatches = document.getElementById("polygonStrokeSwatches");
const polygonStrokeSwatchBtn = document.getElementById("polygonStrokeSwatchBtn");
const polygonStrokeWidthInput = document.getElementById("polygonStrokeWidth");
const polygonFillAutoEnabledInput = document.getElementById("polygonFillAutoEnabled");
const polygonFillAutoInvertInput = document.getElementById("polygonFillAutoInvert");
const polygonFillAutoFields = document.getElementById("polygonFillAutoFields");
const polygonFillAutoConnectionInput = document.getElementById("polygonFillAutoConnection");
const polygonFillAutoTagSelect = document.getElementById("polygonFillAutoTag");
const polygonFillAutoModeSelect = document.getElementById("polygonFillAutoMode");
const polygonFillAutoThresholdRow = document.getElementById("polygonFillAutoThresholdRow");
const polygonFillAutoThresholdInput = document.getElementById("polygonFillAutoThreshold");
const polygonFillAutoMatchRow = document.getElementById("polygonFillAutoMatchRow");
const polygonFillAutoMatchInput = document.getElementById("polygonFillAutoMatch");
const polygonFillAutoOnInput = document.getElementById("polygonFillAutoOn");
const polygonFillAutoOnTextInput = document.getElementById("polygonFillAutoOnText");
const polygonFillAutoOnSwatches = document.getElementById("polygonFillAutoOnSwatches");
const polygonFillAutoOnSwatchBtn = document.getElementById("polygonFillAutoOnSwatchBtn");
const polygonFillAutoOffInput = document.getElementById("polygonFillAutoOff");
const polygonFillAutoOffTextInput = document.getElementById("polygonFillAutoOffText");
const polygonFillAutoOffSwatches = document.getElementById("polygonFillAutoOffSwatches");
const polygonFillAutoOffSwatchBtn = document.getElementById("polygonFillAutoOffSwatchBtn");
const polygonStrokeAutoEnabledInput = document.getElementById("polygonStrokeAutoEnabled");
const polygonStrokeAutoInvertInput = document.getElementById("polygonStrokeAutoInvert");
const polygonStrokeAutoFields = document.getElementById("polygonStrokeAutoFields");
const polygonStrokeAutoConnectionInput = document.getElementById("polygonStrokeAutoConnection");
const polygonStrokeAutoTagSelect = document.getElementById("polygonStrokeAutoTag");
const polygonStrokeAutoModeSelect = document.getElementById("polygonStrokeAutoMode");
const polygonStrokeAutoThresholdRow = document.getElementById("polygonStrokeAutoThresholdRow");
const polygonStrokeAutoThresholdInput = document.getElementById("polygonStrokeAutoThreshold");
const polygonStrokeAutoMatchRow = document.getElementById("polygonStrokeAutoMatchRow");
const polygonStrokeAutoMatchInput = document.getElementById("polygonStrokeAutoMatch");
const polygonStrokeAutoOnInput = document.getElementById("polygonStrokeAutoOn");
const polygonStrokeAutoOnTextInput = document.getElementById("polygonStrokeAutoOnText");
const polygonStrokeAutoOnSwatches = document.getElementById("polygonStrokeAutoOnSwatches");
const polygonStrokeAutoOnSwatchBtn = document.getElementById("polygonStrokeAutoOnSwatchBtn");
const polygonStrokeAutoOffInput = document.getElementById("polygonStrokeAutoOff");
const polygonStrokeAutoOffTextInput = document.getElementById("polygonStrokeAutoOffText");
const polygonStrokeAutoOffSwatches = document.getElementById("polygonStrokeAutoOffSwatches");
const polygonStrokeAutoOffSwatchBtn = document.getElementById("polygonStrokeAutoOffSwatchBtn");
const barProps = document.getElementById("barProps");
const barXInput = document.getElementById("barX");
const barYInput = document.getElementById("barY");
const barWInput = document.getElementById("barW");
const barHInput = document.getElementById("barH");
const barOrientationSelect = document.getElementById("barOrientation");
const barMinInput = document.getElementById("barMin");
const barMaxInput = document.getElementById("barMax");
const barMinTagEnabledInput = document.getElementById("barMinTagEnabled");
const barMinTagFields = document.getElementById("barMinTagFields");
const barMinConnectionInput = document.getElementById("barMinConnection");
const barMinTagSelect = document.getElementById("barMinTag");
const barMaxTagEnabledInput = document.getElementById("barMaxTagEnabled");
const barMaxTagFields = document.getElementById("barMaxTagFields");
const barMaxConnectionInput = document.getElementById("barMaxConnection");
const barMaxTagSelect = document.getElementById("barMaxTag");
const barBindConnectionInput = document.getElementById("barBindConnection");
const barBindTagSelect = document.getElementById("barBindTag");
const barDigitsInput = document.getElementById("barDigits");
const barDecimalsInput = document.getElementById("barDecimals");
const barMultiplierInput = document.getElementById("barMultiplier");
const barFillInput = document.getElementById("barFill");
const barFillTextInput = document.getElementById("barFillText");
const barFillSwatches = document.getElementById("barFillSwatches");
const barFillSwatchBtn = document.getElementById("barFillSwatchBtn");
const barBackgroundInput = document.getElementById("barBackground");
const barBackgroundTextInput = document.getElementById("barBackgroundText");
const barBackgroundSwatches = document.getElementById("barBackgroundSwatches");
const barBackgroundSwatchBtn = document.getElementById("barBackgroundSwatchBtn");
const barTicksEnabledInput = document.getElementById("barTicksEnabled");
const barTicksFields = document.getElementById("barTicksFields");
const barTicksMajorInput = document.getElementById("barTicksMajor");
const barTicksMinorInput = document.getElementById("barTicksMinor");
const barBorderEnabledInput = document.getElementById("barBorderEnabled");
const barBevelRow = document.getElementById("barBevelRow");
const barBevelInput = document.getElementById("barBevel");
const barBorderColorRow = document.getElementById("barBorderColorRow");
const barBorderWidthRow = document.getElementById("barBorderWidthRow");
const barBorderColorInput = document.getElementById("barBorderColor");
const barBorderColorTextInput = document.getElementById("barBorderColorText");
const barBorderSwatches = document.getElementById("barBorderSwatches");
const barBorderSwatchBtn = document.getElementById("barBorderSwatchBtn");
const barBorderWidthInput = document.getElementById("barBorderWidth");
const visibilityProps = document.getElementById("visibilityProps");
const visibilityFields = document.getElementById("visibilityFields");
const visibilityEnabledInput = document.getElementById("visibilityEnabled");
const visibilityConnectionInput = document.getElementById("visibilityConnection");
const visibilityTagSelect = document.getElementById("visibilityTag");
const visibilityThresholdInput = document.getElementById("visibilityThreshold");
const visibilityInvertInput = document.getElementById("visibilityInvert");
const alignTools = document.getElementById("alignTools");
const alignLeftBtn = document.getElementById("alignLeftBtn");
const alignCenterBtn = document.getElementById("alignCenterBtn");
const alignRightBtn = document.getElementById("alignRightBtn");
const alignTopBtn = document.getElementById("alignTopBtn");
const alignMiddleBtn = document.getElementById("alignMiddleBtn");
const alignBottomBtn = document.getElementById("alignBottomBtn");
const popupOverlay = document.getElementById("popupOverlay");
const popupCloseBtn = document.getElementById("popupCloseBtn");
const popupTitle = document.getElementById("popupTitle");
const popupSvg = document.getElementById("popupSvg");
const setpointOverlay = document.getElementById("setpointOverlay");
const setpointTitle = document.getElementById("setpointTitle");
const setpointValueInput = document.getElementById("setpointValue");
const setpointOkBtn = document.getElementById("setpointOkBtn");
const setpointCancelBtn = document.getElementById("setpointCancelBtn");
const tagsRefreshBtn = document.getElementById("tagsRefreshBtn");
const tagsStatus = document.getElementById("tagsStatus");
const tagsList = document.getElementById("tagsList");

const EDITOR_WIDTH_KEY = "opcbridge-hmi.editorWidth";
const DEFAULT_SCREEN_ID = "overview";
const DEFAULT_SCREEN_FILE = `${DEFAULT_SCREEN_ID}.jsonc`;
const HMI_BUILD = "2025-12-28-alarms-panel-v18";
try { window.__HMI_BUILD = HMI_BUILD; } catch {}

const applyBuildMarker = () => {
  const el = document.querySelector(".project-title");
  if (el) el.title = `Build: ${HMI_BUILD}`;
};
applyBuildMarker();
window.addEventListener("DOMContentLoaded", applyBuildMarker);

const installAuditActorHeaders = () => {
  if (typeof window.fetch !== "function") return;
  const originalFetch = window.fetch.bind(window);
  if (originalFetch.__hmiWrapped) return;

  const getActor = () => {
    const session = authSession || loadAuthSession();
    const username = String(session?.username || "").trim();
    const role = String(session?.role || "").trim();
    return { username, role };
  };

  window.fetch = (input, init) => {
    try {
      const url = typeof input === "string" ? input : String(input?.url || "");
      const isApi = url.startsWith("/api/") || url.includes(`${window.location.origin}/api/`);
      if (!isApi) return originalFetch(input, init);
      const { username, role } = getActor();
      if (!username) return originalFetch(input, init);
      const nextInit = { ...(init || {}) };
      const headers = new Headers(nextInit.headers || (typeof input === "object" ? input.headers : undefined) || {});
      headers.set("X-OPCBRIDGE-HMI-User", username);
      if (role) headers.set("X-OPCBRIDGE-HMI-Role", role);
      nextInit.headers = headers;
      return originalFetch(input, nextInit);
    } catch {
      return originalFetch(input, init);
    }
  };
  window.fetch.__hmiWrapped = true;
};

const closeAudit = () => {
  if (!auditOverlay) return;
  setOverlayOpen(auditOverlay, false);
  if (auditStatus) auditStatus.textContent = "Ready.";
};

const closeAlarms = () => {
  if (!alarmsOverlay) return;
  setOverlayOpen(alarmsOverlay, false);
  if (alarmsStatus) alarmsStatus.textContent = "Ready.";
};

let lastAuditCopyText = "";
let lastAuditRecords = [];

const formatAuditCell = (value) => {
  const raw = value === undefined || value === null ? "" : String(value);
  return raw.length > 300 ? `${raw.slice(0, 297)}…` : raw;
};

const formatAuditTime = (iso) => {
  const ts = Date.parse(String(iso || ""));
  if (!Number.isFinite(ts)) return String(iso || "");
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return new Date(ts).toISOString();
  }
};

const renderAuditRows = (records) => {
  if (!auditTableBody) return;
  auditTableBody.textContent = "";
  if (!Array.isArray(records) || records.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "audit-cell-dim";
    cell.textContent = "No events.";
    row.appendChild(cell);
    auditTableBody.appendChild(row);
    return;
  }
  records.forEach((rec) => {
    const row = document.createElement("tr");
    const cells = [
      { text: formatAuditTime(rec?.ts), mono: true },
      { text: formatAuditCell(rec?.ip), mono: true },
      { text: formatAuditCell(rec?.username || rec?.user), mono: true },
      { text: formatAuditCell(rec?.event), mono: true },
      { text: formatAuditCell(rec?.connection_id), mono: true },
      { text: formatAuditCell(rec?.tag), mono: true },
      { text: formatAuditCell(rec?.value), mono: true }
    ];
    cells.forEach((info) => {
      const td = document.createElement("td");
      td.textContent = info.text;
      if (info.mono) td.classList.add("audit-cell-mono");
      row.appendChild(td);
    });
    auditTableBody.appendChild(row);
  });
};

const refreshAudit = async () => {
  if (auditStatus) auditStatus.textContent = "Loading…";
  renderAuditRows([]);
  try {
    const response = await fetch("/api/audit/tail?lines=400", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json().catch(() => ({}));
    const lines = Array.isArray(data?.lines) ? data.lines : [];
    lastAuditCopyText = lines.join("\n");
    const parsed = lines.map((line) => {
      try {
        return JSON.parse(String(line || ""));
      } catch {
        return { ts: "", ip: "", event: "unparsed", tag: "", value: String(line || "") };
      }
    });
    lastAuditRecords = parsed.reverse();
    renderAuditRows(lastAuditRecords);
    if (auditStatus) auditStatus.textContent = data?.exists ? `Ready. (${data?.total ?? lines.length} total)` : "No log yet.";
  } catch (error) {
    if (auditStatus) auditStatus.textContent = `Failed: ${error.message}`;
  }
};

const openAudit = async () => {
  if (!auditOverlay) return;
  if (!canAdmin()) {
    openAuth();
    if (authStatusEl) authStatusEl.textContent = "Admin login required for Audit Log.";
    return;
  }
  setMenuOpen(false);
  setOverlayOpen(auditOverlay, true);
  await refreshAudit();
};

const formatAlarmValue = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getAlarmDisplayDescription = (alarm) => {
  const isActive = Boolean(alarm?.active);
  const messageOn = String(alarm?.message_on_active ?? "").trim();
  const messageOff = String(alarm?.message_on_return ?? "").trim();
  const lastMessage = String(alarm?.message ?? "").trim();
  const name = String(alarm?.name ?? "").trim();
  const id = String(alarm?.alarm_id ?? "").trim();
  if (isActive) return messageOn || lastMessage || name || id;
  return messageOff || messageOn || lastMessage || name || id;
};

const formatAlarmTimeMs = (ms) => {
  const ts = Number(ms);
  if (!Number.isFinite(ts) || ts <= 0) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return new Date(ts).toISOString();
  }
};

const applyAlarmsPanelTheme = (panelEl, obj) => {
  if (!panelEl || !obj) return;
  const setVar = (name, value) => {
    const v = String(value ?? "").trim();
    if (!v) return;
    panelEl.style.setProperty(name, v);
  };
  setVar("--hmi-alarms-header-bg", obj.headerBg);
  setVar("--hmi-alarms-header-text", obj.headerText);
  setVar("--hmi-alarms-row-bg", obj.rowBg);
  setVar("--hmi-alarms-row-text", obj.rowText);
  setVar("--hmi-alarms-row-active-unacked-bg", obj.rowBgActiveUnacked);
  setVar("--hmi-alarms-row-active-acked-bg", obj.rowBgActiveAcked);
  setVar("--hmi-alarms-row-returned-bg", obj.rowBgReturned);
  setVar("--hmi-alarms-row-bad-quality-bg", obj.rowBgBadQuality);
  setVar("--hmi-alarms-row-active-unacked-text", obj.rowTextActiveUnacked);
  setVar("--hmi-alarms-row-active-acked-text", obj.rowTextActiveAcked);
  setVar("--hmi-alarms-row-returned-text", obj.rowTextReturned);
  setVar("--hmi-alarms-row-bad-quality-text", obj.rowTextBadQuality);
  setVar("--hmi-alarms-stripe-active-unacked", obj.stripeActiveUnacked);
  setVar("--hmi-alarms-stripe-active-acked", obj.stripeActiveAcked);
  setVar("--hmi-alarms-stripe-returned", obj.stripeReturned);
  setVar("--hmi-alarms-stripe-bad-quality", obj.stripeBadQuality);
};

const isAlarmShelvedNow = (alarm, nowMs) => {
  const until = Number(alarm?.shelved_until_ms);
  if (!Number.isFinite(until) || until <= 0) return false;
  return until > nowMs;
};

const getActiveAlarmCount = () => {
  const nowMs = Date.now();
  let count = 0;
  alarmsStateById.forEach((alarm) => {
    if (!alarm?.enabled) return;
    if (!alarm?.active) return;
    if (isAlarmShelvedNow(alarm, nowMs)) return;
    count += 1;
  });
  return count;
};

const renderAlarmsBadge = () => {
  if (!alarmsBadge) return;
  const count = getActiveAlarmCount();
  const label = `Alarms: ${count}`;
  alarmsBadge.textContent = label;
  alarmsBadge.classList.toggle("is-active", count > 0);
  alarmsBadge.classList.toggle("is-connected", alarmsWsConnected);
  alarmsBadge.title = alarmsWsConnected
    ? (alarmsWsCurrentUrl ? `Connected: ${alarmsWsCurrentUrl}` : "Alarm WebSocket connected")
    : "Alarm WebSocket disconnected";
  alarmsBadge.setAttribute("aria-label", label);
};

const renderActiveAlarmsRows = () => {
  if (!alarmsActiveTableBody) return;
  alarmsActiveTableBody.textContent = "";
  const nowMs = Date.now();
  const active = [];
  alarmsStateById.forEach((alarm) => {
    if (!alarm?.enabled) return;
    if (!alarm?.active) return;
    active.push(alarm);
  });
  if (!active.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "audit-cell-dim";
    cell.textContent = "No active alarms.";
    row.appendChild(cell);
    alarmsActiveTableBody.appendChild(row);
    return;
  }
  active.sort((a, b) => {
    const sa = Number(a?.severity) || 0;
    const sb = Number(b?.severity) || 0;
    if (sb !== sa) return sb - sa;
    const ta = Number(a?.active_since_ms) || 0;
    const tb = Number(b?.active_since_ms) || 0;
    return tb - ta;
  });
  active.forEach((alarm) => {
    const row = document.createElement("tr");
    row.classList.toggle("alarm-row-shelved", isAlarmShelvedNow(alarm, nowMs));
    row.classList.toggle("alarm-row-acked", Boolean(alarm?.acked));

    const src = alarm?.source || {};
    const sourceText = `${String(src?.connection_id || alarm?.connection_id || "")}:${String(src?.tag || alarm?.tag || "")}`.trim();
	    const cols = [
	      { text: String(alarm?.alarm_id || ""), mono: true },
	      { text: String(alarm?.severity ?? ""), mono: true },
	      { text: sourceText, mono: true },
	      { text: formatAlarmValue(alarm?.last_value), mono: true },
	      { text: getAlarmDisplayDescription(alarm), mono: false },
	      { text: alarm?.acked ? "yes" : "no", mono: true },
	      { text: isAlarmShelvedNow(alarm, nowMs) ? formatAlarmTimeMs(alarm?.shelved_until_ms) : "", mono: true },
	      { text: formatAlarmTimeMs(alarm?.active_since_ms), mono: true }
	    ];
    cols.forEach((info) => {
      const td = document.createElement("td");
      td.textContent = info.text;
      if (info.mono) td.classList.add("audit-cell-mono");
      row.appendChild(td);
    });
    alarmsActiveTableBody.appendChild(row);
  });
};

const renderAlarmEventRows = () => {
  if (!alarmsEventsTableBody) return;
  alarmsEventsTableBody.textContent = "";
  if (!alarmsEvents.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "audit-cell-dim";
    cell.textContent = "No events yet.";
    row.appendChild(cell);
    alarmsEventsTableBody.appendChild(row);
    return;
  }
  const rows = alarmsEvents.slice(-200).slice().reverse();
  rows.forEach((ev) => {
    const row = document.createElement("tr");
    const src = ev?.source || {};
    const sourceText = `${String(src?.connection_id || "")}:${String(src?.tag || "")}`.trim();
    const cols = [
      { text: formatAlarmTimeMs(ev?.ts_ms), mono: true },
      { text: String(ev?.type || ""), mono: true },
      { text: String(ev?.alarm_id || ""), mono: true },
      { text: sourceText, mono: true },
      { text: formatAlarmValue(ev?.value), mono: true },
      { text: String(ev?.message || ""), mono: false }
    ];
    cols.forEach((info) => {
      const td = document.createElement("td");
      td.textContent = info.text;
      if (info.mono) td.classList.add("audit-cell-mono");
      row.appendChild(td);
    });
    alarmsEventsTableBody.appendChild(row);
  });
};

const renderAlarmsOverlay = () => {
  if (!alarmsOverlay || alarmsOverlay.classList.contains("is-hidden")) return;
  renderActiveAlarmsRows();
  renderAlarmEventRows();
  if (alarmsStatus) {
    const count = getActiveAlarmCount();
    alarmsStatus.textContent = alarmsWsConnected
      ? `Connected. (${count} active)`
      : `Disconnected. (${count} active)`;
  }
};

const screenHasAlarmsPanel = () => {
  const walk = (objects) => {
    if (!Array.isArray(objects)) return false;
    for (const obj of objects) {
      if (!obj) continue;
      if (obj.type === "alarms-panel") return true;
      if (obj.type === "group" && Array.isArray(obj.children) && walk(obj.children)) return true;
    }
    return false;
  };
  return Boolean(currentScreenObj && walk(currentScreenObj.objects));
};

const scheduleAlarmsRender = () => {
  if (alarmsRenderRaf != null) return;
  alarmsRenderRaf = window.requestAnimationFrame(() => {
    alarmsRenderRaf = null;
    renderAlarmsBadge();
    renderAlarmsOverlay();
    if (!isEditMode && screenHasAlarmsPanel() && !isEditingGestureActive() && !isKeypadOpen) {
      renderScreen();
    }
  });
};

const openAlarms = () => {
  if (!alarmsOverlay) return;
  setMenuOpen(false);
  setOverlayOpen(alarmsOverlay, true);
  loadAlarmTimelineFromHistory();
  loadAlarmsStateFromHttp();
  scheduleAlarmsRender();
};

const apiGetAlarmsHistory = async (limit) => {
  const query = limit != null ? `?limit=${encodeURIComponent(String(limit))}` : "";
  const tryFetchJson = async (path) => {
    const response = await fetch(path, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  try {
    // Prefer the alarm server history (includes ack/shelve workflow events).
    return await tryFetchJson(`/api/alarms/history${query}`);
  } catch (error) {
    // Fallback: opcbridge’s built-in alarm history DB.
    // This keeps the alarm panel populated even without opcbridge-alarms.
    return tryFetchJson(`/api/opcbridge/alarm-history${query}`);
  }
};

const apiGetAlarmsAll = async () => {
  const response = await fetch(`/api/alarms/all`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const loadAlarmsStateFromHttp = async () => {
  try {
    const data = await apiGetAlarmsAll();
    const alarms = Array.isArray(data?.alarms) ? data.alarms : [];
    alarmsStateById = new Map();
    const cutoffMs = Date.now() - ALARM_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    alarms.forEach((alarm) => {
      const id = String(alarm?.alarm_id || "").trim();
      if (!id) return;
      alarmsStateById.set(id, alarm);
      const lastChange = Number(alarm?.last_change_ms) || 0;
      const isRecent = lastChange >= cutoffMs;
      upsertTimelineFromAlarmState(alarm, { createIfMissing: Boolean(alarm?.active) || isRecent });
    });
    scheduleAlarmsRender();
  } catch (error) {
    console.warn("[alarms] Failed to load current alarms snapshot:", error);
  }
};

const normalizeAlarmTimelineId = (value) => {
  const id = String(value || "").trim();
  return id || null;
};

const upsertTimelineFromAlarmState = (alarm, opts = {}) => {
  const createIfMissing = opts.createIfMissing !== false;
  const id = normalizeAlarmTimelineId(alarm?.alarm_id);
  if (!id) return;
  if (!createIfMissing && !alarmTimelineById.has(id)) return;
  const prev = alarmTimelineById.get(id) || {};
  const next = { ...prev };
  next.alarm_id = id;
  next.source = alarm?.source || prev.source || {};
  next.name = alarm?.name ?? prev.name ?? null;
  next.message_on_active = alarm?.message_on_active ?? prev.message_on_active ?? null;
  next.message_on_return = alarm?.message_on_return ?? prev.message_on_return ?? null;
  next.message = alarm?.message ?? prev.message ?? null;
  next.severity = alarm?.severity ?? prev.severity ?? null;
  next.area = alarm?.area ?? prev.area ?? null;
  next.enabled = alarm?.enabled ?? prev.enabled ?? true;
  next.active = alarm?.active ?? prev.active ?? false;
  next.acked = alarm?.acked ?? prev.acked ?? false;
  next.active_since_ms = alarm?.active_since_ms ?? prev.active_since_ms ?? 0;
  const lastChange = alarm?.last_change_ms ?? prev.last_change_ms ?? 0;
  next.last_change_ms = lastChange;
  if (!next.active && Number.isFinite(Number(lastChange)) && Number(lastChange) > 0) {
    next.cleared_ts_ms = Number(lastChange);
  }
  if (!next.last_event_type) {
    next.last_event_type = next.active ? "active" : (Number(next.cleared_ts_ms) > 0 ? "return" : "snapshot");
  }
  if (!next.last_event_ts_ms) {
    next.last_event_ts_ms = next.active ? (next.active_since_ms || Date.now()) : (Number(next.cleared_ts_ms) || Date.now());
  }
  alarmTimelineById.set(id, next);
};

const upsertTimelineFromAlarmEvent = (event) => {
  const id = normalizeAlarmTimelineId(event?.alarm_id);
  if (!id) return;
  const prev = alarmTimelineById.get(id) || {};
  const next = { ...prev };
  next.alarm_id = id;
  next.source = event?.source || prev.source || {};
  if (event?.severity != null) next.severity = event.severity;
  next.last_event_type = String(event?.type || "").trim() || "event";
  next.last_event_ts_ms = Number(event?.ts_ms) || Date.now();
  next.last_event_value = event?.value;
  const type = next.last_event_type;
  if (event?.message != null) {
    next.message = event.message;
    if (type === "active") next.message_on_active = event.message;
    if (type === "return" || type === "reset" || type === "clear") next.message_on_return = event.message;
  }
  if (type === "active") {
    next.active = true;
    next.active_since_ms = next.last_event_ts_ms;
    next.cleared_ts_ms = 0;
  } else if (type === "return" || type === "reset" || type === "clear") {
    next.active = false;
    next.cleared_ts_ms = next.last_event_ts_ms;
  } else if (type === "ack") {
    next.acked = true;
  } else if (type === "unack") {
    next.acked = false;
  }
  alarmTimelineById.set(id, next);
};

const ALARM_HISTORY_WINDOW_DAYS = 14;
const ALARM_HISTORY_MAX_EVENTS = 5000;

const loadAlarmTimelineFromHistory = async (opts = {}) => {
  const force = Boolean(opts.force);
  if (!force && (alarmHistoryLoaded || alarmHistoryLoading)) return;
  alarmHistoryLoading = true;
  try {
    const cutoffMs = Date.now() - ALARM_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const data = await apiGetAlarmsHistory(ALARM_HISTORY_MAX_EVENTS);
    const events = Array.isArray(data?.events) ? data.events : [];
    const filtered = events.filter((ev) => {
      const ts = Number(ev?.ts_ms) || 0;
      return ts >= cutoffMs;
    });

    alarmTimelineById = new Map();
    filtered
      .slice()
      .sort((a, b) => (Number(a?.ts_ms) || 0) - (Number(b?.ts_ms) || 0))
      .forEach((ev) => upsertTimelineFromAlarmEvent(ev));

    alarmHistoryLoaded = true;
    scheduleAlarmsRender();
  } catch (error) {
    console.warn("[alarms] Failed to load alarm history:", error);
  } finally {
    alarmHistoryLoading = false;
  }
};

const refreshAlarmsForScreenLoad = async () => {
  if (!screenHasAlarmsPanel()) return;
  alarmHistoryLoaded = false;
  await loadAlarmTimelineFromHistory({ force: true });
  await loadAlarmsStateFromHttp();
  scheduleAlarmsRender();
};

const getAlarmTimelineRows = () => {
  const rows = [];
  alarmTimelineById.forEach((row) => {
    const id = normalizeAlarmTimelineId(row?.alarm_id);
    if (!id) return;
    const state = alarmsStateById.get(id);
    if (state) upsertTimelineFromAlarmState(state, { createIfMissing: false });
    rows.push(alarmTimelineById.get(id) || row);
  });
  return rows;
};

const closeAbout = () => {
  if (!aboutOverlay) return;
  aboutOverlay.classList.add("is-hidden");
  aboutOverlay.setAttribute("aria-hidden", "true");
  if (aboutStatus) aboutStatus.textContent = "Ready.";
};

const buildAboutText = (data, serverHeader) => {
  const lines = [];
  lines.push(`Client build: ${String(window.__HMI_BUILD || "") || "(unknown)"}`);
  lines.push(`Location: ${window.location.href}`);
  if (serverHeader) lines.push(`Server header: ${serverHeader}`);
  lines.push("");
  if (data?.build) lines.push(`Server build: ${data.build}`);
  if (data?.root) lines.push(`Server root: ${data.root}`);
  if (data?.now) lines.push(`Server time: ${data.now}`);
  if (data?.index?.path) lines.push(`index.html: ${data.index.path}`);
  if (data?.index?.mtimeMs != null) lines.push(`index.html mtimeMs: ${data.index.mtimeMs}`);
  if (data?.hmi?.path) lines.push(`hmi.js: ${data.hmi.path}`);
  if (data?.hmi?.mtimeMs != null) lines.push(`hmi.js mtimeMs: ${data.hmi.mtimeMs}`);
  return lines.join("\n");
};

const refreshAbout = async () => {
  if (aboutStatus) aboutStatus.textContent = "Loading…";
  if (aboutText) aboutText.textContent = "";
  try {
    const response = await fetch("/api/build", { headers: { Accept: "application/json" } });
    const serverHeader = response.headers.get("X-OPCBRIDGE-HMI-Build") || "";
    const data = response.ok ? await response.json() : null;
    if (aboutText) aboutText.textContent = buildAboutText(data, serverHeader);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (aboutStatus) aboutStatus.textContent = "Ready.";
  } catch (error) {
    if (aboutText) aboutText.textContent = buildAboutText(null, "");
    if (aboutStatus) aboutStatus.textContent = `Failed: ${error.message}`;
  }
};

const openAbout = async () => {
  if (!aboutOverlay) return;
  setMenuOpen(false);
  aboutOverlay.classList.remove("is-hidden");
  aboutOverlay.setAttribute("aria-hidden", "false");
  await refreshAbout();
};

let isEditMode = false;
let defaultScreenId = DEFAULT_SCREEN_ID;
let currentScreenId = DEFAULT_SCREEN_ID;
let currentScreenFilename = DEFAULT_SCREEN_FILE;
let lastLoadedFilename = "";
let currentTab = "files";
let currentTool = "select";
let currentScreenObj = null;
let isDirty = false;
let renderedElements = [];
let renderedElementMeta = [];
let selectedIndices = [];
let selectionLayer = null;
let resizeLayer = null;
let selectionBox = null;
let isSelecting = false;
let selectionStart = null;
let lastScreenSize = { width: 1920, height: 1080 };
const TEXT_BG_PADDING_X = 10;
const TEXT_BG_PADDING_Y = 8;
const DRAG_START_THRESHOLD_PX = 2;
const TEXT_LINE_HEIGHT_FACTOR = 1.25;
let isDragging = false;
let isDragPending = false;
let dragStart = null;
let dragOrigins = [];
let isRotating = false;
let rotateStartAngle = 0;
let rotateCenter = null;
let rotateBase = [];
let isResizing = false;
let resizeStart = null;
let resizeStartBounds = null;
let resizeHandle = null;
let resizeIndex = null;
let resizeVertexIndex = null;
let resizeSelectionBase = [];
let resizeSelectionBounds = null;
let resizeSelectionHandle = null;
let snapEnabled = false;
const GRID_SIZE = 10;
const RESIZE_HANDLE_SIZE = 8;
const MIN_RESIZE_SIZE = 10;
let availableScreens = [];
let nextNumberInputId = 1;
let nextIndicatorId = 1;
let imageFilesCache = [];
let imageFilesLoading = false;
let imageFilesError = "";
let isDrawingViewport = false;
let viewportDraft = null;
let viewportDraftStart = null;
let isDrawingButton = false;
let buttonDraft = null;
let buttonDraftStart = null;
let isDrawingRect = false;
let rectDraft = null;
let rectDraftStart = null;
let isDrawingAlarmsPanel = false;
let isDrawingBar = false;
let barDraft = null;
let barDraftStart = null;
let isDrawingCircle = false;
let circleDraft = null;
let circleDraftStart = null;
let isDrawingCircleCenter = false;
let circleCenterDraftStart = null;
let isDrawingLine = false;
let lineDraft = null;
let lineDraftStart = null;
let isDrawingCurve = false;
let curveDraft = null;
let curveDraftStage = 0;
let curveDraftStart = null;
let curveDraftEnd = null;
let curveDraftControl = null;
let isDrawingPolyline = false;
let polylineDraft = null;
let polylineDraftPoints = [];
let isDrawingPolygon = false;
let polygonDraft = null;
let polygonDraftPoints = [];
let isDrawingRegularPolygon = false;
let regularPolygonDraft = null;
let regularPolygonDraftRect = null;
let regularPolygonDraftStart = null;
let regularPolygonSides = 6;
let regularPolygonFitMode = "inscribed";
const screenCache = new Map();
let opcbridgeConfig = {
  host: "127.0.0.1",
  httpPort: 8080,
  wsPort: 9000,
  writeToken: ""
};
let alarmsConfig = {
  host: "",
  httpPort: 8085,
  wsPort: 8086
};
let hmiUiConfig = {
  touchscreenMode: false,
  viewOnlyMode: false
};

const AUTH_SESSION_KEY = "opcbridge-hmi.session";
let authInfo = { initialized: false, timeoutMinutes: 0, users: [] };
let authSession = null;
let authActivityTimer = null;

const getAuthRole = () => String(authSession?.role || "viewer");
const canWrite = () => ["operator", "editor", "admin"].includes(getAuthRole());
const canEdit = () => ["editor", "admin"].includes(getAuthRole());
const canAdmin = () => getAuthRole() === "admin";

const loadAuthSession = () => {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const username = String(parsed?.username || "").trim();
    const role = String(parsed?.role || "").trim().toLowerCase();
    const timeoutMinutes = Number(parsed?.timeoutMinutes) || 0;
    const lastActivityMs = Number(parsed?.lastActivityMs) || 0;
    if (!username) return null;
    if (!["viewer", "operator", "editor", "admin"].includes(role)) return null;
    return { username, role, timeoutMinutes, lastActivityMs };
  } catch {
    return null;
  }
};

const saveAuthSession = (session) => {
  authSession = session;
  try {
    if (!session) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {}
};

const clearAuthSession = () => {
  saveAuthSession(null);
};

const markAuthActivity = () => {
  if (!authSession) return;
  const now = Date.now();
  authSession.lastActivityMs = now;
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession));
  } catch {}
};

const getAuthTimeoutMinutes = () => {
  const sessionTimeout = Number(authSession?.timeoutMinutes);
  if (Number.isFinite(sessionTimeout) && sessionTimeout >= 0) return sessionTimeout;
  const policyTimeout = Number(authInfo?.timeoutMinutes);
  return Number.isFinite(policyTimeout) && policyTimeout >= 0 ? policyTimeout : 0;
};

const isAuthSessionExpired = () => {
  if (!authSession) return false;
  const timeoutMinutes = getAuthTimeoutMinutes();
  if (!timeoutMinutes) return false;
  const lastActivityMs = Number(authSession.lastActivityMs) || 0;
  if (!lastActivityMs) return false;
  return Date.now() - lastActivityMs > timeoutMinutes * 60 * 1000;
};

const apiAuthStatus = async () => {
  const response = await fetch("/api/auth/status", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const apiAuthInit = async ({ username, password, timeoutMinutes }) => {
  const response = await fetch("/api/auth/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, timeoutMinutes })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json().catch(() => ({ ok: true }));
};

const apiAuthLogin = async ({ username, password }) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json();
};

const apiAuthAddUser = async ({ username, password, role }) => {
  const response = await fetch("/api/auth/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json().catch(() => ({ ok: true }));
};

const apiAuthDeleteUser = async (username) => {
  const response = await fetch(`/api/auth/users/${encodeURIComponent(username)}`, { method: "DELETE" });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json().catch(() => ({ ok: true }));
};

const apiAuthSaveTimeout = async (timeoutMinutes) => {
  const response = await fetch("/api/auth/timeout", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeoutMinutes })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json().catch(() => ({ ok: true }));
};

const renderUsersList = () => {
  if (!usersList) return;
  usersList.textContent = "";
  const users = Array.isArray(authInfo?.users) ? authInfo.users : [];
  if (!users.length) {
    const empty = document.createElement("div");
    empty.className = "tag-item";
    empty.textContent = "No users.";
    usersList.appendChild(empty);
    return;
  }
  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "auth-user-row";
    const name = document.createElement("div");
    name.className = "auth-user-name";
    name.textContent = user.username || "?";
    const role = document.createElement("div");
    role.className = "auth-user-role";
    role.textContent = user.role || "viewer";
    const del = document.createElement("button");
    del.className = "panel-btn auth-user-delete";
    del.type = "button";
    del.textContent = "Delete";
    del.disabled = !canAdmin();
    del.addEventListener("click", async () => {
      const ok = window.confirm(`Delete user "${user.username}"?`);
      if (!ok) return;
      if (usersStatusEl) usersStatusEl.textContent = "Deleting…";
      try {
        await apiAuthDeleteUser(user.username);
        await refreshUsersUi();
        if (usersStatusEl) usersStatusEl.textContent = "Deleted.";
      } catch (error) {
        if (usersStatusEl) usersStatusEl.textContent = `Delete failed: ${error.message}`;
      }
    });
    row.appendChild(name);
    row.appendChild(role);
    row.appendChild(del);
    usersList.appendChild(row);
  });
};

const updateAuthUiVisibility = () => {
  const initialized = Boolean(authInfo?.initialized);
  if (authSetupSection) authSetupSection.classList.toggle("is-hidden", initialized);
  if (authLoginSection) authLoginSection.classList.toggle("is-hidden", !initialized || Boolean(authSession));
  if (authLogoutBtn) authLogoutBtn.classList.toggle("is-hidden", !authSession);
  if (authSessionSummary) {
    if (!authSession) {
      authSessionSummary.textContent = "Not logged in. (Viewer)";
    } else {
      authSessionSummary.textContent = `Logged in as ${authSession.username} (${authSession.role}).`;
    }
  }
  if (authSetupTimeout) authSetupTimeout.value = !initialized ? "0" : authSetupTimeout.value;
  if (usersMenuBtn) usersMenuBtn.classList.toggle("is-hidden", !canAdmin());
  if (auditMenuBtn) auditMenuBtn.classList.toggle("is-hidden", !canAdmin());
  if (logoutMenuBtn) logoutMenuBtn.classList.toggle("is-hidden", !authSession);
  if (settingsMenuBtn) {
    const enabled = canAdmin();
    settingsMenuBtn.disabled = !enabled;
    settingsMenuBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
    settingsMenuBtn.classList.toggle("is-disabled", !enabled);
  }
};

const refreshAuthUi = async () => {
  if (authStatusEl) authStatusEl.textContent = "Loading…";
  try {
    const status = await apiAuthStatus();
    authInfo = status || { initialized: false };
    updateAuthUiVisibility();
    if (authStatusEl) authStatusEl.textContent = "Ready.";
  } catch (error) {
    authInfo = { initialized: false, timeoutMinutes: 0, users: [] };
    updateAuthUiVisibility();
    if (authStatusEl) authStatusEl.textContent = `Load failed: ${error.message}`;
  }
};

const refreshUsersUi = async () => {
  if (usersStatusEl) usersStatusEl.textContent = "Loading…";
  try {
    const status = await apiAuthStatus();
    authInfo = status || { initialized: false };
    updateAuthUiVisibility();
    if (usersTimeoutMinutes) usersTimeoutMinutes.value = String(Number(authInfo?.timeoutMinutes) || 0);
    renderUsersList();
    if (usersStatusEl) usersStatusEl.textContent = "Ready.";
  } catch (error) {
    if (usersStatusEl) usersStatusEl.textContent = `Load failed: ${error.message}`;
  }
};

const openAuth = async () => {
  if (!authOverlay) return;
  setMenuOpen(false);
  setOverlayOpen(authOverlay, true);
  await refreshAuthUi();
  if (authSession) return;
  const initialized = Boolean(authInfo?.initialized);
  const target = initialized ? authUsername : authSetupUsername;
  try { target?.focus?.(); } catch {}
};

const closeAuth = () => {
  setOverlayOpen(authOverlay, false);
  if (authStatusEl) authStatusEl.textContent = "Ready.";
};

const openUsers = async () => {
  if (!usersOverlay) return;
  if (!canAdmin()) {
    openAuth();
    if (authStatusEl) authStatusEl.textContent = "Admin login required for Users.";
    return;
  }
  setMenuOpen(false);
  setOverlayOpen(usersOverlay, true);
  await refreshUsersUi();
  try { usersAddUsername?.focus?.(); } catch {}
};

const closeUsers = () => {
  setOverlayOpen(usersOverlay, false);
  if (usersStatusEl) usersStatusEl.textContent = "Ready.";
};

authSession = loadAuthSession();
if (authSession && isAuthSessionExpired()) clearAuthSession();
updateAuthUiVisibility();
installAuditActorHeaders();

let wsClient = null;
let wsConnected = false;
let wsReconnectTimer = null;
let wsCurrentUrl = "";
let wsSubscribeTimer = null;
let wsLastSubscribeFingerprint = "";
let alarmsWsClient = null;
let alarmsWsConnected = false;
let alarmsWsReconnectTimer = null;
let alarmsWsCurrentUrl = "";
let alarmsStateById = new Map();
let alarmsEvents = [];
let alarmTimelineById = new Map();
let alarmHistoryLoaded = false;
let alarmHistoryLoading = false;
let alarmsRenderRaf = null;
let pendingScaleRaf = null;
const tagValueCache = new Map();
const tagQualityCache = new Map();
let tagsCache = [];
let isKeypadOpen = false;
let keypadTarget = null;
const undoStack = [];
let historySuspended = false;
let clipboardObjects = [];
let clipboardBounds = null;
let lastMouseScreenPoint = null;
let groupHotspotHover = null;
let groupHotspotHoverRect = null;
let hotspotLayer = null;

let textMeasureCtx = null;

let runtimeScreenHistory = [];
let runtimeScreenHistoryIndex = -1;
let runtimeHasNavigated = false;

window.addEventListener("error", (event) => {
  const message = event?.message || "Unknown error";
  setEditorStatusSafe(`Runtime error: ${message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "Unknown rejection");
  setEditorStatusSafe(`Unhandled: ${message}`);
});

const splitMultiline = (value) => {
  const raw = String(value ?? "");
  return raw.split(/\r?\n/);
};

const decodeNbspEntities = (value) => (
  String(value ?? "").replace(/&nbsp;|&#160;|\$nbsp;/gi, "\u00A0")
);

const getTextMeasureCtx = () => {
  if (textMeasureCtx) return textMeasureCtx;
  const canvas = document.createElement("canvas");
  textMeasureCtx = canvas.getContext("2d");
  return textMeasureCtx;
};

const measureTextBlock = (text, fontSize, isBold = false) => {
  const ctx = getTextMeasureCtx();
  const size = Number(fontSize) || 16;
  const lineHeight = size * TEXT_LINE_HEIGHT_FACTOR;
  ctx.font = `${isBold ? "700 " : ""}${size}px Arial, sans-serif`;
  const lines = splitMultiline(text);
  const metrics = lines.map((line) => ctx.measureText(line || " "));
  const widths = metrics.map((m) => m.width);
  const width = widths.length ? Math.ceil(Math.max(...widths)) : 0;
  const ascent = Math.max(
    0,
    ...metrics.map((m) => (Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : size * 0.8))
  );
  const descent = Math.max(
    0,
    ...metrics.map((m) => (Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : size * 0.2))
  );
  const singleLineHeight = Math.ceil(ascent + descent);
  const height = lines.length <= 1
    ? singleLineHeight
    : Math.ceil(lineHeight * Math.max(1, lines.length));
  return { lines, width, height, lineHeight, fontSize: size, ascent, descent, singleLineHeight };
};

const evalQuadratic = (p0, p1, p2, t) => {
  const mt = 1 - t;
  return (mt * mt * p0) + (2 * mt * t * p1) + (t * t * p2);
};

const getQuadraticBounds = (p0, p1, p2) => {
  const values = [p0, p2];
  const denom = (p0 - 2 * p1 + p2);
  if (denom !== 0) {
    const t = (p0 - p1) / denom;
    if (t > 0 && t < 1) values.push(evalQuadratic(p0, p1, p2, t));
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
};

const applyMultilineSvgText = (textEl, lines, x, yStart, lineHeight) => {
  if (!textEl) return;
  const ns = "http://www.w3.org/2000/svg";
  textEl.textContent = "";
  lines.forEach((line, idx) => {
    const tspan = document.createElementNS(ns, "tspan");
    tspan.setAttribute("xml:space", "preserve");
    tspan.setAttribute("x", x);
    if (idx === 0) {
      tspan.setAttribute("y", yStart);
    } else {
      tspan.setAttribute("dy", lineHeight);
    }
    tspan.textContent = line === "" ? "\u00a0" : line;
    textEl.appendChild(tspan);
  });
};
const groupEditStack = [];
let selectedPolygonVertex = null;

const updateGroupBreadcrumb = () => {
  if (!groupBreadcrumb) return;
  const depth = groupEditStack.length;
  const active = isEditMode && depth > 0;
  groupBreadcrumb.classList.toggle("is-hidden", !active);
  groupBreadcrumb.classList.toggle("is-active", active);
  if (!active) return;
  const label = depth === 1 ? "Group edit" : `Group edit (${depth})`;
  groupBreadcrumb.textContent = label;
  groupBreadcrumb.title = "Editing a group (Esc to exit). Click to exit one level. Shift+click to exit all.";
};

const exitAllGroupEdit = () => {
  if (!groupEditStack.length) return;
  groupEditStack.length = 0;
  selectedIndices = [];
  clearSelectedPolygonVertex();
  renderScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  updateGroupBreadcrumb();
};

const updateToolHint = () => {
  if (!toolHint) return;
  const show = isEditMode && currentTool === "curve";
  toolHint.classList.toggle("is-hidden", !show);
  if (!show) return;
  if (!isDrawingCurve || curveDraftStage === 0) {
    toolHint.textContent = "Curve tool: pick first end point";
    return;
  }
  if (curveDraftStage === 1) {
    toolHint.textContent = "Curve tool: pick second end point";
    return;
  }
  toolHint.textContent = "Curve tool: pick point on curve";
};

const setRuntimeHistoryBase = (id) => {
  const cleaned = String(id || "").trim();
  if (!cleaned) return;
  runtimeScreenHistory = [cleaned];
  runtimeScreenHistoryIndex = 0;
  runtimeHasNavigated = false;
};

const ensureRuntimeHistoryForCurrentScreen = () => {
  if (isEditMode) return;
  const cleaned = String(currentScreenId || "").trim();
  if (!cleaned) return;
  if (runtimeScreenHistoryIndex < 0 || !runtimeScreenHistory.length) {
    setRuntimeHistoryBase(cleaned);
    return;
  }
  if (!runtimeHasNavigated && runtimeScreenHistoryIndex === 0 && runtimeScreenHistory.length === 1 && runtimeScreenHistory[0] !== cleaned) {
    runtimeScreenHistory[0] = cleaned;
  }
};

const runtimeNavigateTo = (screenId) => {
  const id = String(screenId || "").trim();
  if (!id) return;
  if (runtimeScreenHistoryIndex >= 0 && runtimeScreenHistory[runtimeScreenHistoryIndex] === id) return;
  runtimeHasNavigated = true;
  if (runtimeScreenHistoryIndex >= 0 && runtimeScreenHistoryIndex < runtimeScreenHistory.length - 1) {
    runtimeScreenHistory = runtimeScreenHistory.slice(0, runtimeScreenHistoryIndex + 1);
  }
  runtimeScreenHistory.push(id);
  runtimeScreenHistoryIndex = runtimeScreenHistory.length - 1;
  loadScreenById(id);
};

const runtimeGoBack = () => {
  if (runtimeScreenHistoryIndex <= 0) return;
  runtimeHasNavigated = true;
  runtimeScreenHistoryIndex -= 1;
  loadScreenById(runtimeScreenHistory[runtimeScreenHistoryIndex]);
};

const runtimeGoForward = () => {
  if (runtimeScreenHistoryIndex < 0 || runtimeScreenHistoryIndex >= runtimeScreenHistory.length - 1) return;
  runtimeHasNavigated = true;
  runtimeScreenHistoryIndex += 1;
  loadScreenById(runtimeScreenHistory[runtimeScreenHistoryIndex]);
};

const clearSelectedPolygonVertex = () => {
  selectedPolygonVertex = null;
};

const syncSelectedPolygonVertex = () => {
  if (!selectedPolygonVertex) return;
  if (selectedPolygonVertex.groupDepth !== groupEditStack.length) {
    clearSelectedPolygonVertex();
    return;
  }
  if (selectedIndices.length !== 1 || selectedIndices[0] !== selectedPolygonVertex.objectIndex) {
    clearSelectedPolygonVertex();
    return;
  }
  const obj = getActiveObjects()?.[selectedPolygonVertex.objectIndex];
  if (!obj || obj.type !== "polygon") {
    clearSelectedPolygonVertex();
    return;
  }
  const points = Array.isArray(obj.points) ? obj.points : [];
  if (!Number.isInteger(selectedPolygonVertex.vertexIndex) || selectedPolygonVertex.vertexIndex < 0 || selectedPolygonVertex.vertexIndex >= points.length) {
    clearSelectedPolygonVertex();
  }
};

const isEditingGestureActive = () => (
  isDrawingViewport ||
  isDrawingButton ||
  isDrawingRect ||
  isDrawingAlarmsPanel ||
  isDrawingBar ||
  isDrawingCircle ||
  isDrawingCircleCenter ||
  isDrawingLine ||
  isDrawingCurve ||
  isDrawingPolyline ||
  isDrawingPolygon ||
  isDrawingRegularPolygon ||
  isDragging ||
  isResizing ||
  isSelecting
);

const cancelEditingGesture = () => {
  if (isDrawingViewport) {
    finishViewportDraft();
    isDrawingViewport = false;
    viewportDraft = null;
    viewportDraftStart = null;
  }
  if (isDrawingButton) {
    finishButtonDraft();
    isDrawingButton = false;
    buttonDraft = null;
    buttonDraftStart = null;
  }
  if (isDrawingRect) {
    finishRectDraft();
    isDrawingRect = false;
    rectDraft = null;
    rectDraftStart = null;
  }
  if (isDrawingAlarmsPanel) {
    finishRectDraft();
    isDrawingAlarmsPanel = false;
    rectDraft = null;
    rectDraftStart = null;
  }
  if (isDrawingBar) {
    finishBarDraft();
    isDrawingBar = false;
    barDraft = null;
    barDraftStart = null;
  }
  if (isDrawingCircle) {
    finishCircleDraft();
    isDrawingCircle = false;
    circleDraft = null;
    circleDraftStart = null;
  }
  if (isDrawingCircleCenter) {
    finishCircleDraft();
    isDrawingCircleCenter = false;
    circleDraft = null;
    circleCenterDraftStart = null;
  }
  if (isDrawingLine) {
    finishLineDraft();
    isDrawingLine = false;
    lineDraft = null;
    lineDraftStart = null;
  }
  if (isDrawingCurve) {
    finishCurveDraft();
    isDrawingCurve = false;
    curveDraft = null;
    curveDraftStage = 0;
    curveDraftStart = null;
    curveDraftEnd = null;
    curveDraftControl = null;
    updateToolHint();
  }
  if (isDrawingPolyline) {
    finishPolylineDraft();
    isDrawingPolyline = false;
    polylineDraft = null;
    polylineDraftPoints = [];
  }
  if (isDrawingPolygon) {
    finishPolygonDraft();
    isDrawingPolygon = false;
    polygonDraft = null;
    polygonDraftPoints = [];
  }
  if (isDrawingRegularPolygon) {
    finishRegularPolygonDraft();
    isDrawingRegularPolygon = false;
    regularPolygonDraft = null;
    regularPolygonDraftRect = null;
    regularPolygonDraftStart = null;
  }
  if (isResizing) {
    isResizing = false;
    resizeStart = null;
    resizeStartBounds = null;
    resizeHandle = null;
    resizeIndex = null;
    resizeVertexIndex = null;
    resizeSelectionBase = [];
    resizeSelectionBounds = null;
    resizeSelectionHandle = null;
  }
  if (isRotating) {
    isRotating = false;
    rotateCenter = null;
    rotateBase = [];
  }
  if (isDragging || isDragPending) {
    isDragging = false;
    isDragPending = false;
    dragStart = null;
    dragOrigins = [];
  }
  if (isSelecting) {
    isSelecting = false;
    selectionStart = null;
    if (selectionBox) selectionBox.style.display = "none";
  }
  if (hmiSvg) hmiSvg.style.cursor = "default";
};

const recordHistory = () => {
  if (historySuspended || !currentScreenObj) return;
  const snapshot = JSON.stringify(currentScreenObj);
  const last = undoStack[undoStack.length - 1];
  if (snapshot === last) return;
  undoStack.push(snapshot);
  if (undoStack.length > 100) {
    undoStack.shift();
  }
};

const getActiveGroup = () => (groupEditStack.length ? groupEditStack[groupEditStack.length - 1] : null);

const getActiveObjects = () => {
  const activeGroup = getActiveGroup();
  if (activeGroup?.children) return activeGroup.children;
  return currentScreenObj?.objects;
};

const setActiveObjects = (nextObjects) => {
  const activeGroup = getActiveGroup();
  if (activeGroup?.children) {
    activeGroup.children = nextObjects;
  } else if (currentScreenObj) {
    currentScreenObj.objects = nextObjects;
  }
};

const getActiveOffset = () => {
  return groupEditStack.reduce(
    (acc, group) => {
      acc.x += Number(group?.x ?? 0);
      acc.y += Number(group?.y ?? 0);
      return acc;
    },
    { x: 0, y: 0 }
  );
};

const toActivePoint = (point) => {
  const offset = getActiveOffset();
  return {
    x: point.x - offset.x,
    y: point.y - offset.y
  };
};

const ensureActiveObjects = () => {
  if (!currentScreenObj) return null;
  const activeObjects = getActiveObjects();
  if (!Array.isArray(activeObjects)) {
    setActiveObjects([]);
    return getActiveObjects();
  }
  return activeObjects;
};

const enterGroupEdit = (groupObj) => {
  if (!groupObj || !Array.isArray(groupObj.children)) return;
  groupEditStack.push(groupObj);
  selectedIndices = [];
  clearSelectedPolygonVertex();
  renderScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  updateGroupBreadcrumb();
};

const exitGroupEdit = () => {
  if (!groupEditStack.length) return;
  groupEditStack.pop();
  selectedIndices = [];
  clearSelectedPolygonVertex();
  renderScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  updateGroupBreadcrumb();
};

if (groupBreadcrumb) {
  groupBreadcrumb.addEventListener("click", (event) => {
    if (!isEditMode) return;
    if (!groupEditStack.length) return;
    event.preventDefault();
    if (event.shiftKey) {
      exitAllGroupEdit();
      return;
    }
    exitGroupEdit();
  });
}

const getWsUrl = () => {
  let host = String(opcbridgeConfig?.host || "").trim();
  const pageHost = window.location.hostname || "";
  if (!host || host === "127.0.0.1" || host === "localhost") {
    host = pageHost || host;
  }
  if (!host) return "";
  if (/^wss?:\/\//i.test(host)) return host;
  const port = Number(opcbridgeConfig?.wsPort) || 9000;
  return `ws://${host}:${port}`;
};

const updateWsStatus = () => {
  const label = wsConnected && wsCurrentUrl ? wsCurrentUrl : "ws://";
  if (wsStatus) {
    wsStatus.classList.toggle("is-connected", wsConnected);
    wsStatus.textContent = label;
    wsStatus.title = wsConnected && wsCurrentUrl ? `Connected: ${wsCurrentUrl}` : "WebSocket disconnected";
  }
  if (wsBadge) {
    wsBadge.classList.toggle("is-connected", wsConnected);
    wsBadge.textContent = label;
    wsBadge.title = wsConnected && wsCurrentUrl ? `Connected: ${wsCurrentUrl}` : "WebSocket disconnected";
    wsBadge.setAttribute("aria-label", wsBadge.title);
  }
};

const getAlarmsWsUrl = () => {
  let host = String(alarmsConfig?.host || "").trim();
  const pageHost = window.location.hostname || "";
  if (!host) host = String(opcbridgeConfig?.host || "").trim();
  if (!host || host === "127.0.0.1" || host === "localhost") {
    host = pageHost || host;
  }
  if (!host) return "";
  if (/^wss?:\/\//i.test(host)) return host;
  const port = Number(alarmsConfig?.wsPort) || 8086;
  return `ws://${host}:${port}`;
};

const scheduleAlarmsWsReconnect = () => {
  if (alarmsWsReconnectTimer) return;
  alarmsWsReconnectTimer = setTimeout(() => {
    alarmsWsReconnectTimer = null;
    connectAlarmsWebSocket();
  }, 3000);
};

const connectAlarmsWebSocket = () => {
  const nextUrl = getAlarmsWsUrl();
  alarmsWsCurrentUrl = nextUrl;

  if (alarmsWsClient) {
    alarmsWsClient.onopen = null;
    alarmsWsClient.onclose = null;
    alarmsWsClient.onerror = null;
    alarmsWsClient.onmessage = null;
    alarmsWsClient.close();
    alarmsWsClient = null;
  }

  alarmsWsConnected = false;
  scheduleAlarmsRender();

  // Always try to load history at least once, even if the WS can't connect (firewall, etc.).
  // This keeps the alarm overlay/panel useful without requiring a WS connection.
  loadAlarmTimelineFromHistory();
  loadAlarmsStateFromHttp();

  if (!nextUrl) return;

  try {
    alarmsWsClient = new WebSocket(nextUrl);
  } catch {
    scheduleAlarmsWsReconnect();
    return;
  }

  alarmsWsClient.onopen = () => {
    alarmsWsConnected = true;
    loadAlarmTimelineFromHistory();
    loadAlarmsStateFromHttp();
    scheduleAlarmsRender();
  };

  alarmsWsClient.onclose = () => {
    alarmsWsConnected = false;
    scheduleAlarmsRender();
    scheduleAlarmsWsReconnect();
  };

  alarmsWsClient.onerror = () => {
    alarmsWsConnected = false;
    scheduleAlarmsRender();
  };

  alarmsWsClient.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const type = String(payload?.type || "");
      if (type === "snapshot" && Array.isArray(payload?.alarms)) {
        alarmsStateById = new Map();
        payload.alarms.forEach((alarm) => {
          const id = String(alarm?.alarm_id || "");
          if (!id) return;
          alarmsStateById.set(id, alarm);
          // A snapshot may include many configured alarms, most of which will be inactive.
          // Only "seed" the timeline for active alarms so the on-screen panel shows
          // current actives immediately without flooding the list with every alarm.
          upsertTimelineFromAlarmState(alarm, { createIfMissing: Boolean(alarm?.active) });
        });
        scheduleAlarmsRender();
        return;
      }
      if (type === "alarm_state" && payload?.alarm) {
        const alarm = payload.alarm;
        const id = String(alarm?.alarm_id || "");
        if (id) alarmsStateById.set(id, alarm);
        upsertTimelineFromAlarmState(alarm, { createIfMissing: Boolean(alarm?.active) });
        scheduleAlarmsRender();
        return;
      }
      if (type === "alarm_event" && payload?.event) {
        alarmsEvents.push(payload.event);
        if (alarmsEvents.length > 400) alarmsEvents = alarmsEvents.slice(-300);
        upsertTimelineFromAlarmEvent(payload.event);
        scheduleAlarmsRender();
      }
    } catch {
      // ignore malformed payloads
    }
  };
};

const isTouchscreenRuntime = () => (!isEditMode && Boolean(hmiUiConfig?.touchscreenMode));
const isViewOnlyRuntime = () => (!isEditMode && (Boolean(hmiUiConfig?.viewOnlyMode) || !canWrite()));

const identityMatrix = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

const multiplyMatrix = (m1, m2) => ({
  a: m1.a * m2.a + m1.c * m2.b,
  b: m1.b * m2.a + m1.d * m2.b,
  c: m1.a * m2.c + m1.c * m2.d,
  d: m1.b * m2.c + m1.d * m2.d,
  e: m1.a * m2.e + m1.c * m2.f + m1.e,
  f: m1.b * m2.e + m1.d * m2.f + m1.f
});

const applyMatrixToPoint = (m, pt) => ({
  x: m.a * pt.x + m.c * pt.y + m.e,
  y: m.b * pt.x + m.d * pt.y + m.f
});

const parseSvgNumber = (raw) => {
  const value = typeof raw === "string" ? raw.trim() : raw;
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTransform = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return identityMatrix();
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match;
  let out = identityMatrix();
  while ((match = re.exec(value))) {
    const fn = match[1].toLowerCase();
    const nums = match[2]
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => parseSvgNumber(x))
      .filter((n) => n != null);
    if (fn === "matrix" && nums.length >= 6) {
      out = multiplyMatrix(out, { a: nums[0], b: nums[1], c: nums[2], d: nums[3], e: nums[4], f: nums[5] });
      continue;
    }
    if (fn === "translate") {
      const tx = Number(nums[0] ?? 0) || 0;
      const ty = Number(nums[1] ?? 0) || 0;
      out = multiplyMatrix(out, { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
      continue;
    }
    if (fn === "scale") {
      const sx = Number(nums[0] ?? 1);
      const sy = Number(nums[1] ?? nums[0] ?? 1);
      if (Number.isFinite(sx) && Number.isFinite(sy)) {
        out = multiplyMatrix(out, { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
      }
      continue;
    }
    if (fn === "rotate") {
      const deg = Number(nums[0] ?? 0) || 0;
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const cx = Number(nums[1] ?? 0) || 0;
      const cy = Number(nums[2] ?? 0) || 0;
      const translateTo = { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy };
      const rotate = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      const translateBack = { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy };
      out = multiplyMatrix(out, multiplyMatrix(multiplyMatrix(translateTo, rotate), translateBack));
      continue;
    }
  }
  return out;
};

const parseStyleAttribute = (raw) => {
  const style = {};
  const value = String(raw || "");
  value.split(";").forEach((pair) => {
    const [k, v] = pair.split(":");
    if (!k || !v) return;
    style[k.trim().toLowerCase()] = v.trim();
  });
  return style;
};

const getSvgAttr = (el, name) => {
  if (!el) return "";
  const direct = el.getAttribute(name);
  if (direct != null && direct !== "") return direct;
  const styleMap = parseStyleAttribute(el.getAttribute("style"));
  return styleMap[name.toLowerCase()] ?? "";
};

const parseViewBox = (svgEl) => {
  const raw = String(svgEl?.getAttribute("viewBox") || "").trim();
  const nums = raw.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (nums.length === 4) return { minX: nums[0], minY: nums[1], width: nums[2], height: nums[3] };
  const w = Number(svgEl?.getAttribute("width"));
  const h = Number(svgEl?.getAttribute("height"));
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { minX: 0, minY: 0, width: w, height: h };
  return { minX: 0, minY: 0, width: 0, height: 0 };
};

const svgUserToHmiPoint = (pt, viewBox, imageObj) => {
  const vbW = Number(viewBox?.width) || Number(imageObj?.w) || 1;
  const vbH = Number(viewBox?.height) || Number(imageObj?.h) || 1;
  const sx = (Number(imageObj?.w) || vbW) / vbW;
  const sy = (Number(imageObj?.h) || vbH) / vbH;
  return {
    x: Number(imageObj?.x ?? 0) + (pt.x - Number(viewBox?.minX ?? 0)) * sx,
    y: Number(imageObj?.y ?? 0) + (pt.y - Number(viewBox?.minY ?? 0)) * sy
  };
};

const almostZero = (n, eps = 1e-6) => Math.abs(n) <= eps;

const explodeSvgDocumentToObjects = (svgEl, imageObj) => {
  const viewBox = parseViewBox(svgEl);
  const vbW = Number(viewBox.width) || Number(imageObj?.w) || 1;
  const vbH = Number(viewBox.height) || Number(imageObj?.h) || 1;
  const sx = (Number(imageObj?.w) || vbW) / vbW;
  const sy = (Number(imageObj?.h) || vbH) / vbH;

  const out = [];
  const walk = (node, parentMatrix) => {
    if (!(node instanceof Element)) return;
    const nodeMatrix = parseTransform(node.getAttribute("transform"));
    const matrix = multiplyMatrix(parentMatrix, nodeMatrix);
    const tag = node.tagName.toLowerCase();

    const fill = getSvgAttr(node, "fill");
    const stroke = getSvgAttr(node, "stroke");
    const strokeWidthRaw = getSvgAttr(node, "stroke-width");
    const strokeWidth = parseSvgNumber(strokeWidthRaw);
    const strokeScale = (sx + sy) / 2;
    const scaledStrokeWidth = strokeWidth != null ? Math.max(0, strokeWidth * strokeScale) : null;

    const isAxisAligned = almostZero(matrix.b) && almostZero(matrix.c);

    if (tag === "rect") {
      if (!isAxisAligned) return;
      const x = parseSvgNumber(node.getAttribute("x")) ?? 0;
      const y = parseSvgNumber(node.getAttribute("y")) ?? 0;
      const w = parseSvgNumber(node.getAttribute("width")) ?? 0;
      const h = parseSvgNumber(node.getAttribute("height")) ?? 0;
      if (w <= 0 || h <= 0) return;
      const rx = parseSvgNumber(node.getAttribute("rx")) ?? 0;
      const topLeft = svgUserToHmiPoint(applyMatrixToPoint(matrix, { x, y }), viewBox, imageObj);
      const bottomRight = svgUserToHmiPoint(applyMatrixToPoint(matrix, { x: x + w, y: y + h }), viewBox, imageObj);
      out.push({
        type: "rect",
        x: Math.round(Math.min(topLeft.x, bottomRight.x)),
        y: Math.round(Math.min(topLeft.y, bottomRight.y)),
        w: Math.round(Math.abs(bottomRight.x - topLeft.x)),
        h: Math.round(Math.abs(bottomRight.y - topLeft.y)),
        rx: Number.isFinite(rx) ? Math.round(rx * strokeScale) : 0,
        fill: fill || "#3a3f4b",
        stroke: stroke || "none",
        strokeWidth: scaledStrokeWidth != null ? Math.max(0, Math.round(scaledStrokeWidth)) : 0
      });
      return;
    }

    if (tag === "circle" || tag === "ellipse") {
      const cx = parseSvgNumber(node.getAttribute("cx")) ?? 0;
      const cy = parseSvgNumber(node.getAttribute("cy")) ?? 0;
      const r = tag === "circle" ? (parseSvgNumber(node.getAttribute("r")) ?? 0) : null;
      const rx = tag === "ellipse" ? (parseSvgNumber(node.getAttribute("rx")) ?? 0) : r;
      const ry = tag === "ellipse" ? (parseSvgNumber(node.getAttribute("ry")) ?? 0) : r;
      if (rx == null || ry == null || rx <= 0 || ry <= 0) return;

      if (tag === "ellipse" && !isAxisAligned) return;

      const centerUser = applyMatrixToPoint(matrix, { x: cx, y: cy });
      const center = svgUserToHmiPoint(centerUser, viewBox, imageObj);
      const edgeXUser = applyMatrixToPoint(matrix, { x: cx + rx, y: cy });
      const edgeYUser = applyMatrixToPoint(matrix, { x: cx, y: cy + ry });
      const edgeX = svgUserToHmiPoint(edgeXUser, viewBox, imageObj);
      const edgeY = svgUserToHmiPoint(edgeYUser, viewBox, imageObj);
      const rX = Math.hypot(edgeX.x - center.x, edgeX.y - center.y);
      const rY = Math.hypot(edgeY.x - center.x, edgeY.y - center.y);
      if (!(rX > 0) || !(rY > 0)) return;

      if (tag === "ellipse" && Math.abs(rX - rY) > 0.5) return;

      const radius = (rX + rY) / 2;
      const localScale = (rx > 0 && ry > 0) ? ((rX / rx) + (rY / ry)) / 2 : strokeScale;
      const scaledStroke = strokeWidth != null ? Math.max(0, strokeWidth * localScale) : null;
      out.push({
        type: "circle",
        cx: Math.round(center.x),
        cy: Math.round(center.y),
        r: Math.round(radius),
        fill: fill === "none" ? "none" : (fill || "#3a3f4b"),
        stroke: stroke === "none" ? "none" : (stroke || "none"),
        strokeWidth: scaledStroke != null ? Math.max(0, Math.round(scaledStroke)) : 0
      });
      return;
    }

    if (tag === "line") {
      const x1 = parseSvgNumber(node.getAttribute("x1")) ?? 0;
      const y1 = parseSvgNumber(node.getAttribute("y1")) ?? 0;
      const x2 = parseSvgNumber(node.getAttribute("x2")) ?? 0;
      const y2 = parseSvgNumber(node.getAttribute("y2")) ?? 0;
      const p1 = svgUserToHmiPoint(applyMatrixToPoint(matrix, { x: x1, y: y1 }), viewBox, imageObj);
      const p2 = svgUserToHmiPoint(applyMatrixToPoint(matrix, { x: x2, y: y2 }), viewBox, imageObj);
      out.push({
        type: "line",
        x1: Math.round(p1.x),
        y1: Math.round(p1.y),
        x2: Math.round(p2.x),
        y2: Math.round(p2.y),
        stroke: stroke || "#ffffff",
        strokeWidth: scaledStrokeWidth != null ? Math.max(0, Math.round(scaledStrokeWidth)) : 1
      });
      return;
    }

    if (tag === "polyline" || tag === "polygon") {
      const rawPoints = String(node.getAttribute("points") || "").trim();
      if (!rawPoints) return;
      const nums = rawPoints
        .split(/[\s,]+/)
        .map(parseSvgNumber)
        .filter((n) => n != null);
      if (nums.length < 4) return;
      const points = [];
      for (let i = 0; i < nums.length - 1; i += 2) {
        const pUser = applyMatrixToPoint(matrix, { x: nums[i], y: nums[i + 1] });
        const p = svgUserToHmiPoint(pUser, viewBox, imageObj);
        points.push({ x: Math.round(p.x), y: Math.round(p.y) });
      }
      if (tag === "polygon" && points.length >= 3) {
        out.push({
          type: "polygon",
          points,
          fill: fill || "#3a3f4b",
          stroke: stroke || "#ffffff",
          strokeWidth: scaledStrokeWidth != null ? Math.max(0, Math.round(scaledStrokeWidth)) : 1
        });
        return;
      }
      if (tag === "polyline" && points.length >= 2) {
        out.push({
          type: "polyline",
          points,
          stroke: stroke || "#ffffff",
          strokeWidth: scaledStrokeWidth != null ? Math.max(0, Math.round(scaledStrokeWidth)) : 2
        });
      }
      return;
    }

    if (tag === "text") {
      if (!isAxisAligned) return;
      const x = parseSvgNumber(node.getAttribute("x")) ?? 0;
      const y = parseSvgNumber(node.getAttribute("y")) ?? 0;
      const fontSizeRaw = getSvgAttr(node, "font-size");
      const fontSize = parseSvgNumber(fontSizeRaw);
      const p = svgUserToHmiPoint(applyMatrixToPoint(matrix, { x, y }), viewBox, imageObj);
      const text = String(node.textContent || "").trim();
      if (!text) return;
      out.push({
        type: "text",
        x: Math.round(p.x),
        y: Math.round(p.y),
        text,
        fontSize: fontSize != null ? Math.max(1, Math.round(fontSize * strokeScale)) : 18,
        fill: fill === "none" ? "none" : (fill || "#ffffff")
      });
      return;
    }

    Array.from(node.children).forEach((child) => walk(child, matrix));
  };

  Array.from(svgEl.children).forEach((child) => walk(child, identityMatrix()));
  return out;
};

const explodeSelectedSvgImage = async () => {
  if (!isEditMode) return;
  if (selectedIndices.length !== 1) return;
  const activeObjects = getActiveObjects() || [];
  const idx = selectedIndices[0];
  const obj = activeObjects[idx];
  if (!obj || obj.type !== "image") return;
  const src = String(obj.src || "").trim();
  if (!/\.svg$/i.test(src)) return;

  const response = await fetch(`img/${encodeURIComponent(src)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = await response.text();
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) throw new Error("Invalid SVG.");
  const objects = explodeSvgDocumentToObjects(svgEl, obj);
  if (!objects.length) throw new Error("No supported primitives found.");

  recordHistory();
  const before = activeObjects.slice(0, idx);
  const after = activeObjects.slice(idx + 1);
  const nextObjects = before.concat(objects, after);
  setActiveObjects(nextObjects);
  selectedIndices = objects.map((_, i) => idx + i);
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const translateObjectForExport = (obj, dx, dy) => {
  if (!obj || typeof obj !== "object") return;
  if (obj.type === "group") {
    if ("x" in obj) obj.x = Number(obj.x ?? 0) + dx;
    if ("y" in obj) obj.y = Number(obj.y ?? 0) + dy;
    return;
  }
  if (obj.type === "circle") {
    obj.cx = Number(obj.cx ?? 0) + dx;
    obj.cy = Number(obj.cy ?? 0) + dy;
    return;
  }
  if (obj.type === "line") {
    obj.x1 = Number(obj.x1 ?? 0) + dx;
    obj.y1 = Number(obj.y1 ?? 0) + dy;
    obj.x2 = Number(obj.x2 ?? 0) + dx;
    obj.y2 = Number(obj.y2 ?? 0) + dy;
    return;
  }
  if (obj.type === "polyline" || obj.type === "polygon") {
    const points = Array.isArray(obj.points) ? obj.points : [];
    obj.points = points.map((pt) => ({
      x: Number(pt?.x ?? 0) + dx,
      y: Number(pt?.y ?? 0) + dy
    }));
    return;
  }
  if ("x" in obj) obj.x = Number(obj.x ?? 0) + dx;
  if ("y" in obj) obj.y = Number(obj.y ?? 0) + dy;
};

const exportSelectionToSvgRaw = () => {
  if (!hmiSvg) return null;
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects) || !selectedIndices.length) return null;
  const bounds = getSelectionBoundsActive();
  if (!bounds) return null;
  const pad = 4;
  const width = Math.max(1, Math.ceil(Number(bounds.width ?? 0) + pad * 2));
  const height = Math.max(1, Math.ceil(Number(bounds.height ?? 0) + pad * 2));
  const dx = -(Number(bounds.x ?? 0)) + pad;
  const dy = -(Number(bounds.y ?? 0)) + pad;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("xmlns", ns);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  selectedIndices.forEach((idx) => {
    const obj = activeObjects[idx];
    if (!obj) return;
    const clone = JSON.parse(JSON.stringify(obj));
    translateObjectForExport(clone, dx, dy);
    renderObjectInto(svg, clone);
  });

  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(svg);
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
  return header + raw + "\n";
};

const saveSvgToImageFolder = async (desiredName, raw) => {
  const name = String(desiredName || "").trim();
  if (!name) throw new Error("Missing filename.");
  const response = await fetch(`/api/svg-files/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json().catch(() => ({ ok: true }));
};

const getBindPlaceholder = (bind) => {
  const digits = Number.isFinite(Number(bind?.digits)) ? Math.max(1, Math.trunc(Number(bind.digits))) : 1;
  const decimals = Number.isFinite(Number(bind?.decimals)) ? Math.max(0, Math.trunc(Number(bind.decimals))) : 0;
  const intDigits = Math.max(1, digits - decimals);
  const intPart = "?".repeat(intDigits);
  if (!decimals) return intPart;
  return `${intPart}.${"?".repeat(decimals)}`;
};

const formatBoundNumber = (rawValue, bind) => {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return null;
  const multiplier = Number.isFinite(Number(bind?.multiplier)) ? Number(bind.multiplier) : 1;
  const digits = Number.isFinite(Number(bind?.digits)) ? Math.trunc(Number(bind.digits)) : 0;
  const decimals = Number.isFinite(Number(bind?.decimals)) ? Math.max(0, Math.trunc(Number(bind.decimals))) : 0;
  const scaled = numeric * multiplier;
  const fixed = scaled.toFixed(decimals);
  if (digits <= 0) return fixed;
  const [intPart, decPart] = fixed.split(".");
  const intDigits = Math.max(1, digits - decimals);
  const paddedInt = intPart.padStart(intDigits, " ");
  return decPart !== undefined ? `${paddedInt}.${decPart}` : paddedInt;
};

const coerceTagBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    if (["true", "on", "yes"].includes(trimmed)) return true;
    if (["false", "off", "no", "0"].includes(trimmed)) return false;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric !== 0;
    return true;
  }
  return Boolean(value);
};

const coerceTagNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const resolveBarLimit = (obj, which) => {
  const fallback = which === "max" ? 100 : 0;
  if (!obj) return fallback;
  const fixed = Number.isFinite(Number(obj[which])) ? Number(obj[which]) : fallback;
  if (isEditMode) return fixed;
  const binding = which === "max" ? obj.maxBinding : obj.minBinding;
  if (!binding || !binding.enabled) return fixed;
  const connectionId = String(binding.connection_id || "");
  const tagName = String(binding.tag || "");
  if (!connectionId || !tagName) return fixed;
  const raw = tagValueCache.get(`${connectionId}.${tagName}`);
  const numeric = coerceTagNumber(raw);
  return numeric === null ? fixed : numeric;
};

const appendBarTicks = (parent, x, y, w, h, orientation, tickConfig, colorFallback) => {
  if (!parent) return;
  if (!tickConfig?.enabled) return;
  const ns = "http://www.w3.org/2000/svg";
  const majorCount = Math.max(2, Math.trunc(Number(tickConfig.major ?? 5)) || 5);
  const minorCount = Math.max(0, Math.trunc(Number(tickConfig.minor ?? 4)) || 0);
  const stroke = tickConfig.color || colorFallback || "#ffffff";
  const strokeWidth = Math.max(0, Number(tickConfig.width ?? 2));
  if (!strokeWidth) return;
  const majorLen = 14;
  const minorLen = 10;
  const pad = 2;

  const addTick = (x1, y1, x2, y2) => {
    const tick = document.createElementNS(ns, "line");
    tick.setAttribute("x1", x1);
    tick.setAttribute("y1", y1);
    tick.setAttribute("x2", x2);
    tick.setAttribute("y2", y2);
    tick.setAttribute("stroke", stroke);
    tick.setAttribute("stroke-width", strokeWidth);
    tick.setAttribute("stroke-opacity", "0.9");
    tick.setAttribute("stroke-linecap", "round");
    tick.setAttribute("vector-effect", "non-scaling-stroke");
    parent.appendChild(tick);
  };

  for (let i = 0; i < majorCount; i += 1) {
    const t = majorCount === 1 ? 0 : i / (majorCount - 1);
    if (orientation === "horizontal") {
      const px = x + w * t;
      addTick(px, y + h - pad, px, y + h - pad - majorLen);
      if (i < majorCount - 1 && minorCount > 0) {
        for (let m = 1; m <= minorCount; m += 1) {
          const mt = (i + m / (minorCount + 1)) / (majorCount - 1);
          const mx = x + w * mt;
          addTick(mx, y + h - pad, mx, y + h - pad - minorLen);
        }
      }
    } else {
      const py = y + h * (1 - t);
      addTick(x + pad, py, x + pad + majorLen, py);
      if (i < majorCount - 1 && minorCount > 0) {
        for (let m = 1; m <= minorCount; m += 1) {
          const mt = (i + m / (minorCount + 1)) / (majorCount - 1);
          const my = y + h * (1 - mt);
          addTick(x + pad, my, x + pad + minorLen, my);
        }
      }
    }
  }
};

const shouldRenderObject = (obj) => {
  if (!obj) return false;
  if (isEditMode) return true;
  const vis = obj.visibility;
  if (!vis || vis.enabled === false) return true;
  const connectionId = String(vis.connection_id || "");
  const tag = String(vis.tag || "");
  if (!connectionId || !tag) return true;
  const key = `${connectionId}.${tag}`;
  const value = tagValueCache.get(key);
  if (value === undefined || value === null) return true;
  const hasThreshold = vis.threshold !== undefined && vis.threshold !== null && vis.threshold !== "";
  if (hasThreshold) {
    const thresholdValue = Number(vis.threshold);
    if (!Number.isFinite(thresholdValue)) return true;
    const numeric = coerceTagNumber(value);
    if (numeric === null) return true;
    const isOn = numeric >= thresholdValue;
    return vis.invert ? !isOn : isOn;
  }
  const isOn = coerceTagBoolean(value);
  return vis.invert ? !isOn : isOn;
};

const getAutomationState = (value, config) => {
  if (!config || !config.enabled) return null;

  const mode = (config.mode === "equals" || config.mode === "threshold") ? config.mode : "threshold";
  if (mode === "equals") {
    const matchRaw = String(config.match ?? "").trim();
    if (!matchRaw) return null;
    if (value === undefined || value === null) return null;

    const numericMatch = Number(matchRaw);
    const numericValue = coerceTagNumber(value);
    if (Number.isFinite(numericMatch) && numericValue !== null) {
      const isOn = numericValue === numericMatch;
      return config.invert ? !isOn : isOn;
    }

    const normalizedMatch = matchRaw.toLowerCase();
    const isBoolMatch = ["true", "false", "on", "off", "yes", "no"].includes(normalizedMatch);
    if (isBoolMatch) {
      const isOn = coerceTagBoolean(value) === coerceTagBoolean(matchRaw);
      return config.invert ? !isOn : isOn;
    }

    const isOn = String(value).trim() === matchRaw;
    return config.invert ? !isOn : isOn;
  }

  const hasThreshold = config.threshold !== undefined && config.threshold !== null && config.threshold !== "";
  if (hasThreshold) {
    const thresholdValue = Number(config.threshold);
    if (!Number.isFinite(thresholdValue)) return null;
    const numeric = coerceTagNumber(value);
    if (numeric === null) return null;
    const isOn = numeric >= thresholdValue;
    return config.invert ? !isOn : isOn;
  }

  const isOn = coerceTagBoolean(value);
  return config.invert ? !isOn : isOn;
};

const getAutomationColor = (config, baseColor) => {
  if (!config || !config.enabled || isEditMode) return baseColor;
  const connectionId = String(config.connection_id || "");
  const tag = String(config.tag || "");
  if (!connectionId || !tag) return baseColor;
  const rawValue = tagValueCache.get(`${connectionId}.${tag}`);
  const state = getAutomationState(rawValue, config);
  if (state === null) return config.offColor || baseColor;
  if (state) return config.onColor || baseColor;
  return config.offColor || baseColor;
};

const getObjectBounds = (obj) => {
  if (!obj) return null;
  if (obj.type === "group") {
    const base = {
      x: Number(obj.x ?? 0),
      y: Number(obj.y ?? 0),
      width: Number(obj.w ?? 0),
      height: Number(obj.h ?? 0)
    };
    if (!Array.isArray(obj.children) || !obj.children.length) return base;
    const content = getGroupContentBounds(obj);
    if (!content) return base;
    const contentBox = {
      x: Number(obj.x ?? 0) + Number(content.x ?? 0),
      y: Number(obj.y ?? 0) + Number(content.y ?? 0),
      width: Number(content.width ?? 0),
      height: Number(content.height ?? 0)
    };
    const left = Math.min(base.x, contentBox.x);
    const top = Math.min(base.y, contentBox.y);
    const right = Math.max(base.x + base.width, contentBox.x + contentBox.width);
    const bottom = Math.max(base.y + base.height, contentBox.y + contentBox.height);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  if (obj.type === "rect" || obj.type === "alarms-panel" || obj.type === "button" || obj.type === "viewport" || obj.type === "bar" || obj.type === "number-input" || obj.type === "indicator" || obj.type === "image") {
    return {
      x: Number(obj.x ?? 0),
      y: Number(obj.y ?? 0),
      width: Number(obj.w ?? 0),
      height: Number(obj.h ?? 0)
    };
  }
  if (obj.type === "circle") {
    const r = Number(obj.r ?? 0);
    const cx = Number(obj.cx ?? 0);
    const cy = Number(obj.cy ?? 0);
    return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
  }
  if (obj.type === "line") {
    const x1 = Number(obj.x1 ?? 0);
    const y1 = Number(obj.y1 ?? 0);
    const x2 = Number(obj.x2 ?? 0);
    const y2 = Number(obj.y2 ?? 0);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    return { x: minX, y: minY, width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  }
  if (obj.type === "curve") {
    const x1 = Number(obj.x1 ?? 0);
    const y1 = Number(obj.y1 ?? 0);
    const x2 = Number(obj.x2 ?? 0);
    const y2 = Number(obj.y2 ?? 0);
    const cx = Number(obj.cx ?? ((x1 + x2) / 2));
    const cy = Number(obj.cy ?? ((y1 + y2) / 2));
    const bx = getQuadraticBounds(x1, cx, x2);
    const by = getQuadraticBounds(y1, cy, y2);
    const strokeWidth = Math.max(0, Number(obj.strokeWidth ?? 2));
    const pad = strokeWidth / 2;
    return { x: bx.min - pad, y: by.min - pad, width: (bx.max - bx.min) + pad * 2, height: (by.max - by.min) + pad * 2 };
  }
  if (obj.type === "polyline" || obj.type === "polygon") {
    const points = Array.isArray(obj.points) ? obj.points : [];
    if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
    const xs = points.map((p) => Number(p?.x ?? 0));
    const ys = points.map((p) => Number(p?.y ?? 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const strokeWidth = Math.max(0, Number(obj.strokeWidth ?? 1));
    const pad = strokeWidth / 2;
    return { x: minX - pad, y: minY - pad, width: (maxX - minX) + pad * 2, height: (maxY - minY) + pad * 2 };
  }
  if (obj.type === "text") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    const fontSize = Number(obj.fontSize || 18);
    const raw = decodeNbspEntities(String(obj.text ?? ""));
    const sample = (obj.bindText && raw.includes("{value}"))
      ? raw.replace(/\{value\}/g, getBindPlaceholder(obj.bindText))
      : raw;
    const measured = measureTextBlock(sample, fontSize, Boolean(obj.bold));
    const hasBgBox = Boolean(obj.background || obj.borderColor);
    const rawW = Number(obj.w);
    const rawH = Number(obj.h);
    const explicitW = Number.isFinite(rawW) ? rawW : 0;
    const explicitH = Number.isFinite(rawH) ? rawH : 0;
    const contentW = Math.max(explicitW, measured.width);
    const contentH = Math.max(explicitH, measured.height);
    const align = obj.align || "left";
    const valign = obj.valign || "top";
    const padX = (hasBgBox || explicitW || explicitH) ? TEXT_BG_PADDING_X : 0;
    const padY = (hasBgBox || explicitW || explicitH) ? TEXT_BG_PADDING_Y : 0;
    let rectX = x - padX;
    if (align === "center") rectX = x - contentW / 2 - padX;
    if (align === "right") rectX = x - contentW - padX;
    const isMultiline = measured.lines?.length > 1;
    let rectY = y - padY;
    if (isMultiline) {
      if (valign === "middle") rectY = y - contentH / 2 - padY;
      if (valign === "bottom") rectY = y - contentH - padY;
    } else {
      if (valign === "top") rectY = (y - (measured.ascent ?? fontSize * 0.8)) - padY;
      if (valign === "middle") rectY = y - contentH / 2 - padY;
      if (valign === "bottom") rectY = y - contentH - padY;
    }
    return { x: rectX, y: rectY, width: contentW + padX * 2, height: contentH + padY * 2 };
  }
  return null;
};

const getGroupContentBounds = (groupObj) => {
  if (!groupObj || !Array.isArray(groupObj.children)) return null;
  const childBounds = groupObj.children.map(getObjectBounds).filter(Boolean);
  if (!childBounds.length) return null;
  const left = Math.min(...childBounds.map((b) => b.x));
  const top = Math.min(...childBounds.map((b) => b.y));
  const right = Math.max(...childBounds.map((b) => b.x + b.width));
  const bottom = Math.max(...childBounds.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const buildGroupEditMeta = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  const offset = getActiveOffset();
  renderedElementMeta = activeObjects
    .map((obj, index) => {
      const bounds = getObjectBounds(obj);
      if (!bounds) return null;
      return {
        index,
        type: obj.type,
        bounds: {
          x: bounds.x + offset.x,
          y: bounds.y + offset.y,
          width: bounds.width,
          height: bounds.height
        }
      };
    })
    .filter(Boolean);
};

const translateObject = (obj, dx, dy) => {
  if (!obj) return;
  if (obj.type === "line") {
    obj.x1 = Number(obj.x1 ?? 0) + dx;
    obj.y1 = Number(obj.y1 ?? 0) + dy;
    obj.x2 = Number(obj.x2 ?? 0) + dx;
    obj.y2 = Number(obj.y2 ?? 0) + dy;
    return;
  }
  if (obj.type === "curve") {
    obj.x1 = Number(obj.x1 ?? 0) + dx;
    obj.y1 = Number(obj.y1 ?? 0) + dy;
    obj.cx = Number(obj.cx ?? 0) + dx;
    obj.cy = Number(obj.cy ?? 0) + dy;
    obj.x2 = Number(obj.x2 ?? 0) + dx;
    obj.y2 = Number(obj.y2 ?? 0) + dy;
    return;
  }
  if (obj.type === "circle") {
    obj.cx = Number(obj.cx ?? 0) + dx;
    obj.cy = Number(obj.cy ?? 0) + dy;
    return;
  }
  if (obj.type === "text") {
    obj.x = Number(obj.x ?? 0) + dx;
    obj.y = Number(obj.y ?? 0) + dy;
    return;
  }
  if (obj.type === "polyline" || obj.type === "polygon") {
    if (!Array.isArray(obj.points)) return;
    obj.points = obj.points.map((pt) => ({
      x: Number(pt?.x ?? 0) + dx,
      y: Number(pt?.y ?? 0) + dy
    }));
    return;
  }
  if (obj.x != null) obj.x = Number(obj.x ?? 0) + dx;
  if (obj.y != null) obj.y = Number(obj.y ?? 0) + dy;
};

const canSizeMatchObject = (obj) => {
  if (!obj) return false;
  if (obj.type === "button" || obj.type === "viewport" || obj.type === "rect" || obj.type === "alarms-panel" || obj.type === "bar" || obj.type === "text" || obj.type === "number-input" || obj.type === "indicator" || obj.type === "image") return true;
  if (obj.type === "circle") return true;
  return false;
};

const applySizeToObject = (obj, refSize, mode) => {
  if (!obj || !refSize) return;
  const width = Math.max(1, Math.round(Number(refSize.width ?? 0)));
  const height = Math.max(1, Math.round(Number(refSize.height ?? 0)));
  if (obj.type === "circle") {
    const diameter = Math.max(1, Math.round(Math.min(width, height)));
    obj.r = Math.max(1, Math.round(diameter / 2));
    return;
  }
  if (obj.type === "text") {
    if (mode === "width" || mode === "size") obj.w = width;
    if (mode === "height" || mode === "size") obj.h = height;
    return;
  }
  if (obj.type === "button" || obj.type === "viewport" || obj.type === "rect" || obj.type === "alarms-panel" || obj.type === "bar" || obj.type === "number-input" || obj.type === "indicator" || obj.type === "image") {
    if (mode === "width" || mode === "size") obj.w = Math.max(MIN_RESIZE_SIZE, width);
    if (mode === "height" || mode === "size") obj.h = Math.max(MIN_RESIZE_SIZE, height);
  }
};

const matchSelectedSize = (mode) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length < 2) return;
  const targets = selectedIndices
    .map((idx) => activeObjects[idx])
    .filter((obj) => canSizeMatchObject(obj));
  if (targets.length < 2) return;
  const bounds = targets.map(getObjectBounds).filter(Boolean);
  if (!bounds.length) return;
  const targetSize = {
    width: Math.max(...bounds.map((b) => Number(b.width ?? 0))),
    height: Math.max(...bounds.map((b) => Number(b.height ?? 0)))
  };
  recordHistory();
  targets.forEach((obj) => applySizeToObject(obj, targetSize, mode));
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const spaceSelectedEvenly = (axis) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length < 3) return;
  const items = selectedIndices
    .map((idx) => ({ idx, obj: activeObjects[idx] }))
    .filter((item) => item.obj && canSizeMatchObject(item.obj))
    .map((item) => {
      const b = getObjectBounds(item.obj);
      if (!b) return null;
      return {
        idx: item.idx,
        obj: item.obj,
        bounds: b,
        cx: b.x + b.width / 2,
        cy: b.y + b.height / 2
      };
    })
    .filter(Boolean);
  if (items.length < 3) return;

  const sorted = [...items].sort((a, b) => (axis === "x" ? a.cx - b.cx : a.cy - b.cy));
  const start = axis === "x" ? sorted[0].cx : sorted[0].cy;
  const end = axis === "x" ? sorted[sorted.length - 1].cx : sorted[sorted.length - 1].cy;
  const span = end - start;
  if (!Number.isFinite(span) || span === 0) return;
  const step = span / (sorted.length - 1);
  recordHistory();
  sorted.forEach((item, index) => {
    const desired = start + step * index;
    const current = axis === "x" ? item.cx : item.cy;
    const delta = desired - current;
    if (axis === "x") translateObject(item.obj, delta, 0);
    else translateObject(item.obj, 0, delta);
  });
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const alignSelected = (mode) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length < 2) return;
  recordHistory();
  const targets = selectedIndices.map((idx) => activeObjects[idx]).filter(Boolean);
  const bounds = targets.map(getObjectBounds).filter(Boolean);
  if (!bounds.length) return;
  const left = Math.min(...bounds.map((b) => b.x));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const top = Math.min(...bounds.map((b) => b.y));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  targets.forEach((obj) => {
    const b = getObjectBounds(obj);
    if (!b) return;
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = left - b.x;
    if (mode === "right") dx = right - (b.x + b.width);
    if (mode === "center") dx = centerX - (b.x + b.width / 2);
    if (mode === "top") dy = top - b.y;
    if (mode === "bottom") dy = bottom - (b.y + b.height);
    if (mode === "middle") dy = centerY - (b.y + b.height / 2);
    translateObject(obj, dx, dy);
  });

  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const swapAlignHorizontal = (value) => {
  if (value === "left") return "right";
  if (value === "right") return "left";
  return value;
};

const swapAlignVertical = (value) => {
  if (value === "top") return "bottom";
  if (value === "bottom") return "top";
  return value;
};

const flipObjectInBox = (obj, axis, box) => {
  if (!obj || !box) return;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const applyRotationFlip = () => {
    if (obj.rotation == null) return;
    const rotationValue = Number(obj.rotation);
    if (!Number.isFinite(rotationValue) || rotationValue === 0) return;
    obj.rotation = -rotationValue;
  };

  if (obj.type === "group") {
    const groupX = Number(obj.x ?? 0);
    const groupY = Number(obj.y ?? 0);
    const groupW = Number(obj.w ?? 0);
    const groupH = Number(obj.h ?? 0);
    if (axis === "horizontal") obj.x = Math.round(2 * centerX - (groupX + groupW));
    if (axis === "vertical") obj.y = Math.round(2 * centerY - (groupY + groupH));
    applyRotationFlip();

    const children = Array.isArray(obj.children) ? obj.children : [];
    const childBox = { x: 0, y: 0, width: groupW, height: groupH };
    children.forEach((child) => flipObjectInBox(child, axis, childBox));
    return;
  }

  if (obj.type === "line") {
    const x1 = Number(obj.x1 ?? 0);
    const x2 = Number(obj.x2 ?? 0);
    const y1 = Number(obj.y1 ?? 0);
    const y2 = Number(obj.y2 ?? 0);
    if (axis === "horizontal") {
      obj.x1 = 2 * centerX - x1;
      obj.x2 = 2 * centerX - x2;
    } else {
      obj.y1 = 2 * centerY - y1;
      obj.y2 = 2 * centerY - y2;
    }
    applyRotationFlip();
    return;
  }

  if (obj.type === "circle") {
    const cx = Number(obj.cx ?? 0);
    const cy = Number(obj.cy ?? 0);
    if (axis === "horizontal") obj.cx = 2 * centerX - cx;
    else obj.cy = 2 * centerY - cy;
    applyRotationFlip();
    return;
  }

  if (obj.type === "polyline" || obj.type === "polygon") {
    if (!Array.isArray(obj.points)) return;
    obj.points = obj.points.map((pt) => ({
      x: axis === "horizontal" ? 2 * centerX - Number(pt?.x ?? 0) : Number(pt?.x ?? 0),
      y: axis === "vertical" ? 2 * centerY - Number(pt?.y ?? 0) : Number(pt?.y ?? 0)
    }));
    applyRotationFlip();
    return;
  }

  if (obj.type === "text") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    if (axis === "horizontal") {
      obj.x = 2 * centerX - x;
      if (obj.align) obj.align = swapAlignHorizontal(obj.align);
    } else {
      obj.y = 2 * centerY - y;
      if (obj.valign) obj.valign = swapAlignVertical(obj.valign);
    }
    applyRotationFlip();
    return;
  }

  const bounds = getObjectBounds(obj);
  if (!bounds) return;
  if (axis === "horizontal" && obj.x != null) {
    obj.x = Math.round(2 * centerX - (Number(obj.x ?? 0) + Number(bounds.width ?? 0)));
    if (obj.align) obj.align = swapAlignHorizontal(obj.align);
  }
  if (axis === "vertical" && obj.y != null) {
    obj.y = Math.round(2 * centerY - (Number(obj.y ?? 0) + Number(bounds.height ?? 0)));
    if (obj.valign) obj.valign = swapAlignVertical(obj.valign);
  }
  applyRotationFlip();
};

const flipSelected = (axis) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!selectedIndices.length) return;
  const bounds = getSelectionBoundsActive();
  if (!bounds) return;

  recordHistory();
  const indices = Array.from(new Set(selectedIndices))
    .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < activeObjects.length)
    .sort((a, b) => a - b);
  indices.forEach((idx) => flipObjectInBox(activeObjects[idx], axis, bounds));
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const groupSelected = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length < 2) return;
  const indices = Array.from(new Set(selectedIndices)).sort((a, b) => a - b);
  const targets = indices.map((idx) => activeObjects[idx]).filter(Boolean);
  const bounds = targets.map(getObjectBounds).filter(Boolean);
  if (!bounds.length) return;
  const left = Math.min(...bounds.map((b) => b.x));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const top = Math.min(...bounds.map((b) => b.y));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  const groupObj = {
    type: "group",
    x: Math.round(left),
    y: Math.round(top),
    w: Math.round(right - left),
    h: Math.round(bottom - top),
    rotation: 0,
    visibility: null,
    children: targets.map((obj) => {
      const clone = JSON.parse(JSON.stringify(obj));
      translateObject(clone, -left, -top);
      return clone;
    })
  };
  recordHistory();
  const deleteSet = new Set(indices);
  const nextObjects = activeObjects.filter((_, index) => !deleteSet.has(index));
  const insertIndex = indices[0];
  nextObjects.splice(insertIndex, 0, groupObj);
  setActiveObjects(nextObjects);
  selectedIndices = [insertIndex];
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const ungroupSelected = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!selectedIndices.length) return;
  const groupIndices = new Set(
    selectedIndices.filter((idx) => activeObjects[idx]?.type === "group")
  );
  if (!groupIndices.size) return;
  recordHistory();
  const nextObjects = [];
  const nextSelected = [];
  activeObjects.forEach((obj, index) => {
    if (!groupIndices.has(index)) {
      nextObjects.push(obj);
      return;
    }
    const offsetX = Number(obj.x ?? 0);
    const offsetY = Number(obj.y ?? 0);
    const children = Array.isArray(obj.children) ? obj.children : [];
    children.forEach((child) => {
      const clone = JSON.parse(JSON.stringify(child));
      translateObject(clone, offsetX, offsetY);
      nextObjects.push(clone);
      nextSelected.push(nextObjects.length - 1);
    });
  });
  setActiveObjects(nextObjects);
  selectedIndices = nextSelected;
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  refreshViewportIdOptions();
  setDirty(true);
};

const moveSelectionToFront = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!selectedIndices.length) return;

  const indices = Array.from(new Set(selectedIndices))
    .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < activeObjects.length)
    .sort((a, b) => a - b);
  if (!indices.length) return;

  recordHistory();
  const selectedSet = new Set(indices);
  const selected = [];
  const unselected = [];
  activeObjects.forEach((obj, index) => {
    if (selectedSet.has(index)) selected.push(obj);
    else unselected.push(obj);
  });
  const nextObjects = unselected.concat(selected);
  setActiveObjects(nextObjects);
  selectedIndices = selected.map((_, idx) => unselected.length + idx);
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const moveSelectionToBack = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!selectedIndices.length) return;

  const indices = Array.from(new Set(selectedIndices))
    .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < activeObjects.length)
    .sort((a, b) => a - b);
  if (!indices.length) return;

  recordHistory();
  const selectedSet = new Set(indices);
  const selected = [];
  const unselected = [];
  activeObjects.forEach((obj, index) => {
    if (selectedSet.has(index)) selected.push(obj);
    else unselected.push(obj);
  });
  const nextObjects = selected.concat(unselected);
  setActiveObjects(nextObjects);
  selectedIndices = selected.map((_, idx) => idx);
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
};

const updateMenuState = () => {
  const canAlign = selectedIndices.length > 1;
  const canGroup = selectedIndices.length > 1;
  const activeObjects = getActiveObjects() || [];
  const canUngroup = selectedIndices.some(
    (idx) => activeObjects[idx]?.type === "group"
  );
  const canExplodeSvg = selectedIndices.length === 1
    && activeObjects[selectedIndices[0]]?.type === "image"
    && /\.svg$/i.test(String(activeObjects[selectedIndices[0]]?.src || "").trim());
  const canMatchSize = selectedIndices.length > 1
    && selectedIndices.every((idx) => canSizeMatchObject(activeObjects[idx]));
  const canSpaceEvenly = selectedIndices.length > 2
    && selectedIndices.every((idx) => canSizeMatchObject(activeObjects[idx]));
  const canReorder = selectedIndices.length > 0;
  const canFlip = selectedIndices.length > 0;
  const toggleItem = (el) => {
    if (!el) return;
    const disabled = el === groupMenuBtn ? !canGroup
      : el === ungroupMenuBtn ? !canUngroup
      : !canAlign;
    el.classList.toggle("is-disabled", disabled);
  };
  const toggleSizeItem = (el) => {
    if (!el) return;
    el.classList.toggle("is-disabled", !canMatchSize);
  };
  const toggleSpaceItem = (el) => {
    if (!el) return;
    el.classList.toggle("is-disabled", !canSpaceEvenly);
  };
  const toggleReorderItem = (el) => {
    if (!el) return;
    el.classList.toggle("is-disabled", !canReorder);
  };
  const toggleFlipItem = (el) => {
    if (!el) return;
    el.classList.toggle("is-disabled", !canFlip);
  };
  if (explodeSelectedSvgBtn) {
    explodeSelectedSvgBtn.classList.toggle("is-disabled", !canExplodeSvg);
  }
  if (groupToggleBtn) {
    const activeObjects = getActiveObjects() || [];
    const isSingleGroup = selectedIndices.length === 1
      && activeObjects[selectedIndices[0]]?.type === "group";
    const shouldEnable = canGroup || isSingleGroup;
    groupToggleBtn.classList.toggle("is-disabled", !shouldEnable);
    groupToggleBtn.textContent = isSingleGroup ? "Ungroup" : "Group";
    groupToggleBtn.title = isSingleGroup ? "Ungroup selected group" : "Group selected items";
  }
  toggleItem(groupMenuBtn);
  toggleItem(ungroupMenuBtn);
  toggleItem(alignMenuLeft);
  toggleItem(alignMenuCenter);
  toggleItem(alignMenuRight);
  toggleItem(alignMenuTop);
  toggleItem(alignMenuMiddle);
  toggleItem(alignMenuBottom);
  toggleSizeItem(matchMenuWidth);
  toggleSizeItem(matchMenuHeight);
  toggleSizeItem(matchMenuSize);
  toggleSpaceItem(spaceMenuHorizontal);
  toggleSpaceItem(spaceMenuVertical);
  toggleFlipItem(flipMenuHorizontal);
  toggleFlipItem(flipMenuVertical);
  toggleReorderItem(moveToFrontMenuBtn);
  toggleReorderItem(moveToBackMenuBtn);
};

const setMenuOpen = (isOpen) => {
  if (!menuDropdown || !menuToggleBtn) return;
  menuDropdown.classList.toggle("is-open", isOpen);
  menuToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
};

const scheduleWsReconnect = () => {
  if (wsReconnectTimer) return;
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    connectWebSocket();
  }, 3000);
};

const normalizeWsTagKey = (connectionId, tagName) => {
  const conn = String(connectionId || "").trim();
  const tag = String(tagName || "").trim();
  if (!conn || !tag) return "";
  return `${conn}:${tag}`;
};

const collectTagKeysFromValue = (value, out, depth = 0) => {
  if (!value || depth > 10) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectTagKeysFromValue(item, out, depth + 1));
    return;
  }
  if (typeof value !== "object") return;

  const conn = value.connection_id;
  const tag = value.tag;
  if (typeof conn === "string" && typeof tag === "string") {
    const key = normalizeWsTagKey(conn, tag);
    if (key) out.add(key);
  }

  Object.values(value).forEach((v) => {
    if (v && (typeof v === "object")) collectTagKeysFromValue(v, out, depth + 1);
  });
};

const collectViewportTargetsFromValue = (value, out, depth = 0) => {
  if (!value || depth > 10) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectViewportTargetsFromValue(item, out, depth + 1));
    return;
  }
  if (typeof value !== "object") return;

  if (value.type === "viewport") {
    const targetId = String(value.target || "").trim();
    if (targetId) out.add(targetId);
  }

  Object.values(value).forEach((v) => {
    if (v && (typeof v === "object")) collectViewportTargetsFromValue(v, out, depth + 1);
  });
};

const collectActiveWsSubscriptions = () => {
  const out = new Set();
  if (currentScreenObj) {
    collectTagKeysFromValue(currentScreenObj, out);

    // Include any loaded viewport target screens (only those already in cache).
    const targetIds = new Set();
    collectViewportTargetsFromValue(currentScreenObj, targetIds);
    targetIds.forEach((targetId) => {
      const child = screenCache.get(targetId);
      if (child) collectTagKeysFromValue(child, out);
    });
  }

  // Include popup screen if open and loaded.
  if (typeof currentPopupScreenId !== "undefined" && currentPopupScreenId) {
    const child = screenCache.get(currentPopupScreenId);
    if (child) collectTagKeysFromValue(child, out);
  }

  return Array.from(out).sort();
};

const wsSendSubscribe = (tags) => {
  if (!wsConnected || !wsClient || wsClient.readyState !== WebSocket.OPEN) return;
  try {
    wsClient.send(JSON.stringify({ type: "subscribe", tags }));
  } catch {
    // ignore
  }
};

const updateWsSubscriptions = () => {
  if (!wsConnected) return;
  const tags = collectActiveWsSubscriptions();
  const fingerprint = tags.join("\n");
  if (fingerprint === wsLastSubscribeFingerprint) return;
  wsLastSubscribeFingerprint = fingerprint;
  wsSendSubscribe(tags);
};

const scheduleWsSubscribeRefresh = () => {
  if (wsSubscribeTimer) return;
  wsSubscribeTimer = setTimeout(() => {
    wsSubscribeTimer = null;
    updateWsSubscriptions();
  }, 100);
};

const connectWebSocket = () => {
  const nextUrl = getWsUrl();
  wsCurrentUrl = nextUrl;

  if (wsClient) {
    wsClient.onopen = null;
    wsClient.onclose = null;
    wsClient.onerror = null;
    wsClient.onmessage = null;
    wsClient.close();
    wsClient = null;
  }

  wsConnected = false;
  updateWsStatus();
  wsLastSubscribeFingerprint = "";

  if (!nextUrl) return;

  try {
    wsClient = new WebSocket(nextUrl);
  } catch {
    scheduleWsReconnect();
    return;
  }

  wsClient.onopen = () => {
    wsConnected = true;
    updateWsStatus();
    scheduleWsSubscribeRefresh();
  };

  wsClient.onclose = () => {
    wsConnected = false;
    updateWsStatus();
    wsLastSubscribeFingerprint = "";
    scheduleWsReconnect();
  };

  wsClient.onerror = () => {
    wsConnected = false;
    updateWsStatus();
  };

  wsClient.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "tag_update") {
        const key = `${payload.connection_id || ""}.${payload.name || ""}`;
        tagValueCache.set(key, payload.value);
        if (Object.prototype.hasOwnProperty.call(payload, "quality")) {
          tagQualityCache.set(key, payload.quality);
        }
        if (!isEditMode && !isEditingGestureActive() && !isKeypadOpen) {
          renderScreen();
        }
      }
    } catch {
      // ignore malformed payloads
    }
  };
};

const getCssNumber = (value) => {
  const parsed = Number.parseFloat(String(value || "").replace("px", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || "").trim());

const setInputValueSafe = (input, value) => {
  if (!input) return;
  if (document.activeElement === input) return;
  input.value = value;
};

const setSelectValueSafe = (select, value) => {
  if (!select) return;
  if (document.activeElement === select) return;
  select.value = value;
};

const parseOptionalNumber = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const getScreenSize = () => {
  const rootStyles = getComputedStyle(document.documentElement);
  const width = getCssNumber(rootStyles.getPropertyValue("--screen-width"));
  const height = getCssNumber(rootStyles.getPropertyValue("--screen-height"));
  return {
    width: width || 1920,
    height: height || 1080,
  };
};

const getViewportIds = () => {
  if (!currentScreenObj?.objects) return [];
  return currentScreenObj.objects
    .filter((obj) => obj?.type === "viewport" && obj.id)
    .map((obj) => String(obj.id));
};

const refreshViewportIdOptions = () => {
  const ids = getViewportIds();
  const fillSelect = (selectEl) => {
    if (!selectEl) return;
    const previous = selectEl.value;
    selectEl.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "None";
    selectEl.appendChild(empty);
    ids.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = id;
      selectEl.appendChild(opt);
    });
    if (ids.includes(previous)) {
      selectEl.value = previous;
    }
  };
  fillSelect(buttonViewportSelect);
  fillSelect(groupActionViewportIdSelect);
};

const updateButtonActionUI = (actionType) => {
  const isWriteAction = actionType === "momentary-write" || actionType === "toggle-write" || actionType === "set-write" || actionType === "prompt-write";
  const isHistoryAction = actionType === "history-back" || actionType === "history-forward";
  const isPromptWrite = actionType === "prompt-write";
  const showOffValue = actionType === "momentary-write" || actionType === "toggle-write";
  if (buttonTargetRow) buttonTargetRow.classList.toggle("is-hidden", isWriteAction || isHistoryAction);
  if (buttonViewportRow) buttonViewportRow.classList.toggle("is-hidden", actionType !== "load-viewport");
  if (buttonWriteFields) {
    const showWrite = isWriteAction;
    buttonWriteFields.classList.toggle("is-hidden", !showWrite);
    buttonWriteFields.hidden = !showWrite;
  }
  if (buttonWriteOnRow) buttonWriteOnRow.classList.toggle("is-hidden", isPromptWrite);
  if (buttonWriteOffRow) buttonWriteOffRow.classList.toggle("is-hidden", isPromptWrite || (isWriteAction && !showOffValue));
  if (buttonWriteOnLabel) buttonWriteOnLabel.textContent = actionType === "set-write" ? "Value" : "On Value";
  if (buttonPromptDefaultRow) buttonPromptDefaultRow.classList.toggle("is-hidden", !isPromptWrite);
  if (buttonPromptMinRow) buttonPromptMinRow.classList.toggle("is-hidden", !isPromptWrite);
  if (buttonPromptMaxRow) buttonPromptMaxRow.classList.toggle("is-hidden", !isPromptWrite);
  if (buttonPromptStepRow) buttonPromptStepRow.classList.toggle("is-hidden", !isPromptWrite);
};

const refreshGroupActionScreenOptions = () => {
  if (!groupActionScreenIdSelect) return;
  const previous = groupActionScreenIdSelect.value;
  groupActionScreenIdSelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Select screen…";
  groupActionScreenIdSelect.appendChild(empty);
  availableScreens.forEach((screenItem) => {
    const opt = document.createElement("option");
    opt.value = screenItem.id;
    opt.textContent = screenItem.id;
    groupActionScreenIdSelect.appendChild(opt);
  });
  if (availableScreens.some((s) => s.id === previous)) {
    groupActionScreenIdSelect.value = previous;
  }
};

const setGroupActionRows = (actionType) => {
  const type = String(actionType || "");
  const hasAction = Boolean(type);
  const isLoadViewport = type === "load-viewport";
  if (groupActionViewportRow) {
    groupActionViewportRow.classList.toggle("is-hidden", !isLoadViewport);
    groupActionViewportRow.hidden = !isLoadViewport;
  }
  if (groupActionScreenRow) {
    groupActionScreenRow.classList.toggle("is-hidden", !hasAction);
    groupActionScreenRow.hidden = !hasAction;
  }
};

const createViewportId = () => {
  const ids = new Set(getViewportIds());
  let index = 1;
  while (ids.has(`vp_${index}`)) index += 1;
  return `vp_${index}`;
};

const createNumberInputId = () => {
  const ids = new Set(
    (currentScreenObj?.objects || [])
      .filter((obj) => obj?.type === "number-input" && obj.id)
      .map((obj) => String(obj.id))
  );
  while (ids.has(`ni_${nextNumberInputId}`)) nextNumberInputId += 1;
  const id = `ni_${nextNumberInputId}`;
  nextNumberInputId += 1;
  return id;
};

const createIndicatorId = () => {
  const ids = new Set(
    (currentScreenObj?.objects || [])
      .filter((obj) => obj?.type === "indicator" && obj.id)
      .map((obj) => String(obj.id))
  );
  while (ids.has(`ind_${nextIndicatorId}`)) nextIndicatorId += 1;
  const id = `ind_${nextIndicatorId}`;
  nextIndicatorId += 1;
  return id;
};

const populateTagSelect = (selectEl) => {
  if (!selectEl) return;
  const previous = selectEl.value;
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select tag…";
  selectEl.appendChild(placeholder);
  const groups = new Map();
  tagsCache.forEach((tag) => {
    const connectionId = String(tag.connection_id || "");
    const tagName = String(tag.name || "");
    const value = `${connectionId}::${tagName}`;
    if (!groups.has(connectionId)) groups.set(connectionId, []);
    groups.get(connectionId).push({ value, tagName });
  });
  Array.from(groups.entries()).forEach(([connectionId, entries]) => {
    const group = document.createElement("optgroup");
    group.label = connectionId || "?";
    entries.forEach((entry) => {
      const opt = document.createElement("option");
      opt.value = entry.value;
      opt.textContent = entry.tagName || "?";
      group.appendChild(opt);
    });
    selectEl.appendChild(group);
  });
  if (previous && Array.from(selectEl.options).some((opt) => opt.value === previous)) {
    selectEl.value = previous;
  }
};

const refreshTextBindTagOptions = () => {
  populateTagSelect(textBindTagSelect);
};

const refreshBarBindTagOptions = () => {
  populateTagSelect(barBindTagSelect);
};

const refreshBarRangeTagOptions = () => {
  populateTagSelect(barMinTagSelect);
  populateTagSelect(barMaxTagSelect);
};

const refreshNumberInputTagOptions = () => {
  populateTagSelect(numberInputTagSelect);
};

const refreshIndicatorTagOptions = () => {
  populateTagSelect(indicatorTagSelect);
};

const refreshVisibilityTagOptions = () => {
  populateTagSelect(visibilityTagSelect);
};

const refreshAutomationTagOptions = () => {
  populateTagSelect(textAutoTagSelect);
  populateTagSelect(buttonFillAutoTagSelect);
  populateTagSelect(buttonTextAutoTagSelect);
  populateTagSelect(buttonLabelBindTagSelect);
  populateTagSelect(rectFillAutoTagSelect);
  populateTagSelect(rectStrokeAutoTagSelect);
  populateTagSelect(circleFillAutoTagSelect);
  populateTagSelect(circleStrokeAutoTagSelect);
  populateTagSelect(lineStrokeAutoTagSelect);
  populateTagSelect(polygonFillAutoTagSelect);
  populateTagSelect(polygonStrokeAutoTagSelect);
  populateTagSelect(buttonWriteTagSelect);
};

const renderTagsList = (tags) => {
  if (!tagsList) return;
  tagsList.textContent = "";
  if (!Array.isArray(tags) || tags.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tag-item";
    empty.textContent = "No tags available.";
    tagsList.appendChild(empty);
    return;
  }
  const sorted = [...tags].sort((a, b) => {
    const aKey = `${a.connection_id || ""}.${a.name || ""}`;
    const bKey = `${b.connection_id || ""}.${b.name || ""}`;
    return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: "base" });
  });
  tagsCache = sorted;
  refreshTextBindTagOptions();
  refreshBarBindTagOptions();
  refreshBarRangeTagOptions();
  refreshNumberInputTagOptions();
  refreshIndicatorTagOptions();
  refreshVisibilityTagOptions();
  refreshAutomationTagOptions();
  const groups = new Map();
  sorted.forEach((tag) => {
    const connectionId = String(tag.connection_id || "");
    if (!groups.has(connectionId)) groups.set(connectionId, []);
    groups.get(connectionId).push(tag);
  });
  Array.from(groups.entries()).forEach(([connectionId, entries]) => {
    const header = document.createElement("div");
    header.className = "tag-group";
    header.textContent = connectionId || "?";
    tagsList.appendChild(header);
    entries.forEach((tag) => {
      const item = document.createElement("div");
      item.className = "tag-item";
      const name = document.createElement("div");
      name.className = "tag-name";
      name.textContent = tag.name || "?";
      const meta = document.createElement("div");
      meta.className = "tag-meta";
      const datatype = document.createElement("span");
      datatype.textContent = `type: ${tag.datatype || "?"}`;
      const quality = document.createElement("span");
      quality.textContent = `q: ${tag.quality ?? "-"}`;
      meta.appendChild(datatype);
      meta.appendChild(quality);
      item.appendChild(name);
      item.appendChild(meta);
	      item.addEventListener("click", () => {
	        if (selectedIndices.length !== 1) return;
	        const obj = getActiveObjects()?.[selectedIndices[0]];
	        if (!obj || (obj.type !== "text" && obj.type !== "bar" && obj.type !== "number-input" && obj.type !== "button" && obj.type !== "indicator")) return;
	        const tagConnectionId = String(tag.connection_id || "");
	        const tagName = String(tag.name || "");
	        if (obj.type === "text") {
	          if (textBindConnectionInput) textBindConnectionInput.value = tagConnectionId;
	          if (textBindTagSelect) textBindTagSelect.value = `${tagConnectionId}::${tagName}`;
	          updateTextBindProperty({ connection_id: tagConnectionId, tag: tagName });
	          return;
	        }
	        if (obj.type === "indicator") {
	          if (indicatorConnectionInput) indicatorConnectionInput.value = tagConnectionId;
	          if (indicatorTagSelect) indicatorTagSelect.value = `${tagConnectionId}::${tagName}`;
	          updateIndicatorBindProperty({ connection_id: tagConnectionId, tag: tagName });
	          return;
	        }
	        if (obj.type === "number-input") {
	          if (numberInputConnectionInput) numberInputConnectionInput.value = tagConnectionId;
	          if (numberInputTagSelect) numberInputTagSelect.value = `${tagConnectionId}::${tagName}`;
	          updateNumberInputBindProperty({ connection_id: tagConnectionId, tag: tagName });
	          return;
	        }
	  if (obj.type === "button") {
          if (buttonLabelBindConnectionInput) buttonLabelBindConnectionInput.value = tagConnectionId;
          if (buttonLabelBindTagSelect) buttonLabelBindTagSelect.value = `${tagConnectionId}::${tagName}`;
          updateButtonLabelBindProperty({ connection_id: tagConnectionId, tag: tagName });
          return;
        }
        if (barBindConnectionInput) barBindConnectionInput.value = tagConnectionId;
        if (barBindTagSelect) barBindTagSelect.value = `${tagConnectionId}::${tagName}`;
        updateBarBindProperty({ connection_id: tagConnectionId, tag: tagName });
      });
      tagsList.appendChild(item);
    });
  });
};

const loadTags = async () => {
  if (tagsStatus) tagsStatus.textContent = "Loading…";
  try {
    const response = await fetch("/api/opc/tags", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const tags = data?.tags || [];
    renderTagsList(tags);
    if (Array.isArray(tags)) {
      tags.forEach((tag) => {
        const connectionId = String(tag?.connection_id || "");
        const name = String(tag?.name || "");
        if (!connectionId || !name) return;
        const key = `${connectionId}.${name}`;
        if (Object.prototype.hasOwnProperty.call(tag, "value")) {
          tagValueCache.set(key, tag.value);
        }
        if (Object.prototype.hasOwnProperty.call(tag, "quality")) {
          tagQualityCache.set(key, tag.quality);
        }
      });
      if (!isEditMode) {
        renderScreen();
        if (currentPopupScreenId) openPopup(currentPopupScreenId);
      }
    }
    if (tagsStatus) tagsStatus.textContent = `${tags.length} tags`;
  } catch (error) {
    if (tagsStatus) tagsStatus.textContent = `Failed to load tags: ${error.message}`;
    tagsCache = [];
    refreshTextBindTagOptions();
    refreshBarBindTagOptions();
	    refreshBarRangeTagOptions();
	    refreshNumberInputTagOptions();
	    refreshIndicatorTagOptions();
	    refreshVisibilityTagOptions();
	    refreshAutomationTagOptions();
	  }
};

const loadImageFiles = async () => {
  if (imageFilesLoading) return;
  imageFilesLoading = true;
  imageFilesError = "";
  try {
    const response = await fetch("/api/img-files", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const files = Array.isArray(data?.files) ? data.files : [];
    imageFilesCache = files;
  } catch (error) {
    console.error("[img-files] load failed:", error);
    imageFilesError = error instanceof Error ? error.message : String(error);
    imageFilesCache = [];
  }
  imageFilesLoading = false;
  renderLibraryImages();
  updatePropertiesPanel();
};

const renderLibraryImages = () => {
  if (!libraryImagesGrid) return;
  libraryImagesGrid.textContent = "";
  if (!imageFilesCache.length) {
    const empty = document.createElement("div");
    empty.className = "screen-hint";
    if (imageFilesLoading) {
      empty.textContent = "Loading images…";
    } else if (imageFilesError) {
      empty.textContent = `Failed to load image library: ${imageFilesError}`;
    } else {
      empty.textContent = "No images found in public/img.";
    }
    libraryImagesGrid.appendChild(empty);
    if (!imageFilesLoading) {
      const retry = document.createElement("button");
      retry.className = "panel-btn";
      retry.type = "button";
      retry.textContent = "Retry";
      retry.addEventListener("click", () => loadImageFiles());
      libraryImagesGrid.appendChild(retry);
    }
    return;
  }
  imageFilesCache.forEach((file) => {
    const item = document.createElement("div");
    item.className = "library-image-item";
    item.draggable = true;
    item.title = file;

    const thumb = document.createElement("img");
    thumb.className = "library-image-thumb";
    thumb.alt = file;
    thumb.loading = "eager";
    thumb.decoding = "async";
    thumb.src = `img/${encodeURIComponent(file)}`;
    thumb.addEventListener("error", () => {
      thumb.style.display = "none";
      const fallback = document.createElement("div");
      fallback.className = "library-image-thumb library-image-thumb-fallback";
      fallback.textContent = "Image failed";
      fallback.title = `Failed to load img/${file}`;
      item.insertBefore(fallback, item.firstChild);
    });

    const name = document.createElement("div");
    name.className = "library-image-name";
    name.textContent = file;

    item.appendChild(thumb);
    item.appendChild(name);

    item.addEventListener("dragstart", (event) => {
      const payload = `image:${file}`;
      event.dataTransfer?.setData("text/plain", payload);
      event.dataTransfer?.setData("application/x-opcbridge-hmi", payload);
      if (thumb instanceof HTMLImageElement) {
        event.dataTransfer?.setDragImage(thumb, 12, 12);
      }
    });

    libraryImagesGrid.appendChild(item);
  });
};

const applyScale = () => {
  if (!screen || !screenWrapper) return;
  const { width, height } = getScreenSize();
  screen.style.width = `${width}px`;
  screen.style.height = `${height}px`;
  lastScreenSize = { width, height };

  if (isEditMode) {
    screen.style.transform = "none";
    return;
  }

  const bounds = screenWrapper.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    if (pendingScaleRaf == null) {
      pendingScaleRaf = window.requestAnimationFrame(() => {
        pendingScaleRaf = null;
        applyScale();
      });
    }
    return;
  }
  const scale = Math.min(bounds.width / width, bounds.height / height) || 1;
  screen.style.transform = `scale(${scale})`;
};

const stripJsonComments = (raw) => {
  if (!raw) return "";
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
};

const parseJsonc = (raw) => {
  const cleaned = stripJsonComments(raw);
  return JSON.parse(cleaned);
};

const loadClientConfig = async () => {
  try {
    let parsed = null;
    try {
      const response = await fetch("/js/config.jsonc", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      parsed = parseJsonc(raw);
    } catch {
      const response = await fetch("/js/config.jsonc.example", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      parsed = parseJsonc(raw);
    }
    if (parsed?.opcbridge) {
      opcbridgeConfig = {
        ...opcbridgeConfig,
        ...parsed.opcbridge
      };
      if (editorStatus) {
        editorStatus.textContent = `Loaded opcbridge config (${opcbridgeConfig.host}).`;
      }
    }
    if (parsed?.alarms) {
      alarmsConfig = {
        ...alarmsConfig,
        ...parsed.alarms
      };
    }
    if (parsed?.hmi) {
      hmiUiConfig = {
        ...hmiUiConfig,
        ...parsed.hmi
      };
      const nextDefault = String(parsed.hmi.defaultScreen || "")
        .trim()
        .replace(/\.jsonc$/i, "");
      if (nextDefault) defaultScreenId = nextDefault;
    }
    return opcbridgeConfig;
  } catch (error) {
    if (editorStatus) {
      editorStatus.textContent = `Config load failed: ${error.message}`;
    }
    return opcbridgeConfig;
  }
};

const apiGetConfig = async () => {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const apiSaveConfig = async (config) => {
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  return response.json().catch(() => ({ ok: true }));
};

const setOverlayOpen = (overlayEl, open) => {
  if (!overlayEl) return;
  overlayEl.classList.toggle("is-hidden", !open);
  overlayEl.setAttribute("aria-hidden", open ? "false" : "true");
};

const populateDefaultScreenOptions = (targetSelect, preferredId) => {
  if (!targetSelect) return;
  const prev = String(preferredId || targetSelect.value || "");
  targetSelect.innerHTML = "";
  const ids = Array.isArray(availableScreens) && availableScreens.length
    ? availableScreens.map((s) => s.id).filter(Boolean)
    : [];
  const unique = Array.from(new Set(ids));
  const fallback = defaultScreenId || DEFAULT_SCREEN_ID;
  const options = unique.length ? unique : [fallback];
  options.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    targetSelect.appendChild(opt);
  });
  const next = prev || fallback;
  targetSelect.value = options.includes(next) ? next : options[0];
};

const readSettingsForm = () => {
  const host = String(settingsHostInput?.value || "").trim();
  const httpPort = Number(settingsHttpPortInput?.value || 0) || 8080;
  const wsPort = Number(settingsWsPortInput?.value || 0) || 8090;
  const writeToken = String(settingsWriteTokenInput?.value || "");
  const alarmsHost = String(settingsAlarmsHostInput?.value || "").trim();
  const alarmsHttpPort = Number(settingsAlarmsHttpPortInput?.value || 0) || 8085;
  const alarmsWsPort = Number(settingsAlarmsWsPortInput?.value || 0) || 8086;
  const defaultScreen = String(settingsDefaultScreenSelect?.value || "").trim();
  const touchscreenMode = Boolean(settingsTouchscreenModeInput?.checked);
  const viewOnlyMode = Boolean(settingsViewOnlyModeInput?.checked);
  return {
    opcbridge: { host, httpPort, wsPort, writeToken },
    alarms: { host: alarmsHost, httpPort: alarmsHttpPort, wsPort: alarmsWsPort },
    hmi: { defaultScreen, touchscreenMode, viewOnlyMode }
  };
};

const populateSettingsForm = (config) => {
  const opc = config?.opcbridge || {};
  const alarms = config?.alarms || {};
  const hmi = config?.hmi || {};
  if (settingsHostInput) settingsHostInput.value = String(opc.host || "");
  if (settingsHttpPortInput) settingsHttpPortInput.value = String(Number(opc.httpPort) || "");
  if (settingsWsPortInput) settingsWsPortInput.value = String(Number(opc.wsPort) || "");
  if (settingsWriteTokenInput) settingsWriteTokenInput.value = String(opc.writeToken || "");
  if (settingsAlarmsHostInput) settingsAlarmsHostInput.value = String(alarms.host || "");
  if (settingsAlarmsHttpPortInput) settingsAlarmsHttpPortInput.value = String(Number(alarms.httpPort) || "");
  if (settingsAlarmsWsPortInput) settingsAlarmsWsPortInput.value = String(Number(alarms.wsPort) || "");
  populateDefaultScreenOptions(settingsDefaultScreenSelect, String(hmi.defaultScreen || ""));
  if (settingsTouchscreenModeInput) settingsTouchscreenModeInput.checked = Boolean(hmi.touchscreenMode);
  if (settingsViewOnlyModeInput) settingsViewOnlyModeInput.checked = Boolean(hmi.viewOnlyMode);
};

const openSettings = async () => {
  if (!settingsOverlay) return;
  if (settingsStatus) settingsStatus.textContent = "Loading…";
  setOverlayOpen(settingsOverlay, true);
  try {
    const data = await apiGetConfig();
    populateSettingsForm(data?.config || {});
    if (settingsStatus) settingsStatus.textContent = "Ready.";
  } catch (error) {
    if (settingsStatus) settingsStatus.textContent = `Load failed: ${error.message}`;
  }
};

const closeSettings = () => {
  setOverlayOpen(settingsOverlay, false);
};

const applySettingsToRuntime = async () => {
  await loadClientConfig();
  connectWebSocket();
  connectAlarmsWebSocket();
  if (!isEditMode) renderScreen();
};

const saveSettings = async (apply) => {
  if (settingsStatus) settingsStatus.textContent = apply ? "Applying…" : "Saving…";
  try {
    const next = readSettingsForm();
    await apiSaveConfig(next);
    opcbridgeConfig = { ...opcbridgeConfig, ...next.opcbridge };
    alarmsConfig = { ...alarmsConfig, ...next.alarms };
    hmiUiConfig = { ...hmiUiConfig, ...next.hmi };
    if (apply) await applySettingsToRuntime();
    if (settingsStatus) settingsStatus.textContent = apply ? "Applied." : "Saved.";
  } catch (error) {
    if (settingsStatus) settingsStatus.textContent = `Save failed: ${error.message}`;
  }
};

const testSettings = async () => {
  if (settingsStatus) settingsStatus.textContent = "Testing…";
  try {
    const response = await fetch("/api/opc/tags", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json().catch(() => ({}));
    const count = Array.isArray(data?.tags) ? data.tags.length : Array.isArray(data) ? data.length : null;
    if (settingsStatus) settingsStatus.textContent = count != null ? `OK (${count} tags).` : "OK.";
  } catch (error) {
    if (settingsStatus) settingsStatus.textContent = `Test failed: ${error.message}`;
  }
};

const matchesIndicatorEquals = (value, matchRaw) => {
  const match = String(matchRaw ?? "").trim();
  if (!match) return false;
  if (value === undefined || value === null) return false;

  const numericMatch = Number(match);
  const numericValue = coerceTagNumber(value);
  if (Number.isFinite(numericMatch) && numericValue !== null) {
    return numericValue === numericMatch;
  }

  const normalizedMatch = match.toLowerCase();
  const isBoolMatch = ["true", "false", "on", "off", "yes", "no"].includes(normalizedMatch);
  if (isBoolMatch) {
    return coerceTagBoolean(value) === coerceTagBoolean(match);
  }

  return String(value).trim() === match;
};

const resolveIndicatorState = (obj) => {
  const states = Array.isArray(obj?.states) ? obj.states : [];
  if (!states.length) return null;
  const mode = obj?.stateMode === "threshold" ? "threshold" : "equals";
  const bind = obj?.bindValue || {};
  const connectionId = String(bind.connection_id || "");
  const tagName = String(bind.tag || "");
  const key = connectionId && tagName ? `${connectionId}.${tagName}` : "";
  if (isEditMode || !key) {
    return states[0] || null;
  }
  const raw = tagValueCache.get(key);
  if (raw === undefined || raw === null) return states[0] || null;
  if (mode === "equals") {
    return states.find((state) => matchesIndicatorEquals(raw, state?.value)) || states[0] || null;
  }
  const numeric = coerceTagNumber(raw);
  if (numeric === null) return states[0] || null;
  let best = null;
  let bestThreshold = -Infinity;
  states.forEach((state) => {
    const threshold = Number(state?.value);
    if (!Number.isFinite(threshold)) return;
    if (numeric >= threshold && threshold >= bestThreshold) {
      bestThreshold = threshold;
      best = state;
    }
  });
  return best || states[0] || null;
};

let nextClipPathId = 1;
const getOrCreateDefs = (svgRoot) => {
  if (!svgRoot) return null;
  const existing = svgRoot.querySelector("defs");
  if (existing) return existing;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svgRoot.insertBefore(defs, svgRoot.firstChild);
  return defs;
};

const setImageHref = (imageEl, href) => {
  if (!imageEl) return;
  imageEl.setAttribute("href", href);
  try {
    imageEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
  } catch {
    /* ignore */
  }
};

const appendBevelPaths = (parent, x, y, w, h, transform) => {
  if (!parent) return;
  const ns = "http://www.w3.org/2000/svg";
  const width = Number(w);
  const height = Number(h);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const left = Number(x);
  const top = Number(y);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;

  const highlight = document.createElementNS(ns, "path");
  highlight.setAttribute("d", `M ${left + 1} ${top + height - 1} L ${left + 1} ${top + 1} L ${left + width - 1} ${top + 1}`);
  highlight.setAttribute("fill", "none");
  highlight.setAttribute("stroke", "#ffffff");
  highlight.setAttribute("stroke-opacity", "0.6");
  highlight.setAttribute("stroke-width", "3");
  highlight.setAttribute("stroke-linecap", "round");
  highlight.setAttribute("stroke-linejoin", "round");
  highlight.setAttribute("pointer-events", "none");
  if (transform) highlight.setAttribute("transform", transform);
  parent.appendChild(highlight);

  const shade = document.createElementNS(ns, "path");
  shade.setAttribute("d", `M ${left + 1} ${top + height - 1} L ${left + width - 1} ${top + height - 1} L ${left + width - 1} ${top + 1}`);
  shade.setAttribute("fill", "none");
  shade.setAttribute("stroke", "#000000");
  shade.setAttribute("stroke-opacity", "0.6");
  shade.setAttribute("stroke-width", "3");
  shade.setAttribute("stroke-linecap", "round");
  shade.setAttribute("stroke-linejoin", "round");
  shade.setAttribute("pointer-events", "none");
  if (transform) shade.setAttribute("transform", transform);
  parent.appendChild(shade);
};

const renderIndicatorInto = (parent, obj) => {
  if (!parent || !obj) return null;
  const ns = "http://www.w3.org/2000/svg";
  const x = Number(obj.x ?? 0);
  const y = Number(obj.y ?? 0);
  const w = Number(obj.w ?? 160);
  const h = Number(obj.h ?? 64);
  const rx = Math.max(0, Number(obj.rx ?? 8));
  const fontSize = Math.max(1, Number(obj.fontSize ?? 16));
  const state = resolveIndicatorState(obj);
  const backgroundEnabled = obj.backgroundEnabled !== false;

  const rootSvg = parent.ownerSVGElement || (parent.tagName && parent.tagName.toLowerCase() === "svg" ? parent : null);
  const defs = getOrCreateDefs(rootSvg);
  const clipId = `clip_ind_${nextClipPathId++}`;
  if (defs) {
    const clip = document.createElementNS(ns, "clipPath");
    clip.setAttribute("id", clipId);
    const clipRect = document.createElementNS(ns, "rect");
    clipRect.setAttribute("x", x);
    clipRect.setAttribute("y", y);
    clipRect.setAttribute("width", w);
    clipRect.setAttribute("height", h);
    clipRect.setAttribute("rx", rx);
    clip.appendChild(clipRect);
    defs.appendChild(clip);
  }

  const group = document.createElementNS(ns, "g");
  if (backgroundEnabled && obj.shadow) {
    const shadow = document.createElementNS(ns, "rect");
    shadow.setAttribute("x", x + 4);
    shadow.setAttribute("y", y + 4);
    shadow.setAttribute("width", w);
    shadow.setAttribute("height", h);
    shadow.setAttribute("rx", rx);
    shadow.setAttribute("fill", "#000000");
    shadow.setAttribute("fill-opacity", "0.5");
    shadow.setAttribute("stroke", "none");
    group.appendChild(shadow);
  }

  const content = document.createElementNS(ns, "g");
  if (defs) content.setAttribute("clip-path", `url(#${clipId})`);

  const strokeWidth = Number(obj.strokeWidth ?? 1);
  const stroke = obj.stroke || "#ffffff";
  const hasStroke = stroke !== "none" && strokeWidth > 0;
  if (backgroundEnabled) {
    const baseFill = obj.fill || "#3a3f4b";
    const fill = String(state?.color || baseFill);
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", rx);
    rect.setAttribute("fill", fill);
    rect.setAttribute("stroke", hasStroke ? stroke : "none");
    rect.setAttribute("stroke-width", hasStroke ? strokeWidth : 0);
    content.appendChild(rect);
  } else if (hasStroke) {
    const borderRect = document.createElementNS(ns, "rect");
    borderRect.setAttribute("x", x);
    borderRect.setAttribute("y", y);
    borderRect.setAttribute("width", w);
    borderRect.setAttribute("height", h);
    borderRect.setAttribute("rx", rx);
    borderRect.setAttribute("fill", "none");
    borderRect.setAttribute("stroke", stroke);
    borderRect.setAttribute("stroke-width", strokeWidth);
    content.appendChild(borderRect);
  }

  const labelText = String(state?.label ?? "").trim();
  const imageName = String(state?.image ?? "").trim();
  const hasLabel = Boolean(labelText);
  const hasImage = Boolean(imageName);
  const overlay = Boolean(obj.labelOverlay);
  const valign = obj.labelValign || "middle";

  const padding = 6;
  let imageX = x;
  let imageY = y;
  let imageW = w;
  let imageH = h;
  let labelX = x + w / 2;
  let labelY = y + h / 2;

  if (hasLabel && !overlay) {
    const desired = Math.max(fontSize * 1.6 + padding * 2, 18);
    const labelH = Math.min(h * 0.45, desired);
    if (valign === "top") {
      labelY = y + labelH / 2;
      imageY = y + labelH;
      imageH = Math.max(1, h - labelH);
    } else {
      labelY = y + (h - labelH / 2);
      imageH = Math.max(1, h - labelH);
    }
  } else if (hasLabel) {
    const vPad = 8;
    if (valign === "top") labelY = y + vPad;
    if (valign === "middle") labelY = y + h / 2;
    if (valign === "bottom") labelY = y + h - vPad;
  }

  if (hasImage) {
    const image = document.createElementNS(ns, "image");
    image.setAttribute("x", imageX);
    image.setAttribute("y", imageY);
    image.setAttribute("width", imageW);
    image.setAttribute("height", imageH);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    setImageHref(image, `img/${encodeURIComponent(imageName)}`);
    content.appendChild(image);
  }

  if (hasLabel) {
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", labelX);
    text.setAttribute("y", labelY);
    text.setAttribute("text-anchor", "middle");
    if (overlay) {
      if (valign === "top") text.setAttribute("dominant-baseline", "hanging");
      if (valign === "middle") text.setAttribute("dominant-baseline", "middle");
      if (valign === "bottom") text.setAttribute("dominant-baseline", "text-after-edge");
    } else {
      text.setAttribute("dominant-baseline", "middle");
    }
    text.setAttribute("fill", obj.textColor || "#ffffff");
    text.setAttribute("font-size", fontSize);
    text.setAttribute("font-weight", obj.bold ? "700" : "400");
    text.textContent = labelText;
    content.appendChild(text);
  }

  if (!hasLabel && !hasImage) {
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", x + w / 2);
    text.setAttribute("y", y + h / 2);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", obj.textColor || "#ffffff");
    text.setAttribute("font-size", fontSize);
    text.setAttribute("font-weight", obj.bold ? "700" : "400");
    text.textContent = "Indicator";
    content.appendChild(text);
  }

  if (obj.bevel && hasStroke) {
    appendBevelPaths(content, x, y, w, h);
  }

  group.appendChild(content);
  parent.appendChild(group);
  return group;
};

const renderObjectInto = (parent, obj) => {
  if (!parent || !obj) return;
  if (!shouldRenderObject(obj)) return;
  const ns = "http://www.w3.org/2000/svg";
  const xhtml = "http://www.w3.org/1999/xhtml";
  const rotation = Number(obj.rotation ?? 0);
  const hasRotation = Number.isFinite(rotation) && rotation !== 0;
  if (obj.type === "group") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    const w = Number(obj.w ?? 0);
    const h = Number(obj.h ?? 0);
    const groupEl = document.createElementNS(ns, "g");
    let transform = `translate(${x} ${y})`;
    if (hasRotation && w && h) {
      transform += ` rotate(${rotation} ${w / 2} ${h / 2})`;
    }
    groupEl.setAttribute("transform", transform);
    parent.appendChild(groupEl);
    const children = Array.isArray(obj.children) ? obj.children : [];
    children.forEach((child) => renderObjectIntoWithOffset(groupEl, child, 0, 0));
    return;
  }
  if (obj.type === "image") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    const w = Number(obj.w ?? 120);
    const h = Number(obj.h ?? 120);
    const href = String(obj.src || "").trim();
    if (!href) return;
    const image = document.createElementNS(ns, "image");
    image.setAttribute("x", x);
    image.setAttribute("y", y);
    image.setAttribute("width", w);
    image.setAttribute("height", h);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    setImageHref(image, `img/${encodeURIComponent(href)}`);
    if (hasRotation) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      image.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
    }
    parent.appendChild(image);
    return;
  }
  if (obj.type === "indicator") {
    if (hasRotation) {
      const x = Number(obj.x ?? 0);
      const y = Number(obj.y ?? 0);
      const w = Number(obj.w ?? 160);
      const h = Number(obj.h ?? 64);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const wrapper = document.createElementNS(ns, "g");
      wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
      renderIndicatorInto(wrapper, obj);
      parent.appendChild(wrapper);
      return;
    }
    renderIndicatorInto(parent, obj);
    return;
  }
  if (obj.type === "number-input") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    const w = Number(obj.w ?? 140);
    const h = Number(obj.h ?? 36);
    const rx = Number(obj.rx ?? 6);
    const containerParent = hasRotation
      ? (() => {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    if (isEditMode) {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", w);
      rect.setAttribute("height", h);
      rect.setAttribute("rx", rx);
      rect.setAttribute("fill", obj.fill || "#2b2f3a");
      const stroke = obj.stroke || "#ffffff";
      const strokeWidth = Number(obj.strokeWidth ?? 1);
      rect.setAttribute("stroke", stroke);
      rect.setAttribute("stroke-width", strokeWidth);
      containerParent.appendChild(rect);
      if (obj.bevel && stroke !== "none" && strokeWidth > 0) {
        appendBevelPaths(containerParent, x, y, w, h);
      }
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", x + w / 2);
      label.setAttribute("y", y + h / 2);
      label.setAttribute("fill", obj.textColor || "#ffffff");
      label.setAttribute("font-size", Number(obj.fontSize ?? 16));
      label.setAttribute("font-weight", obj.bold ? "700" : "400");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      const bind = obj.bindValue || {};
      label.textContent = getBindPlaceholder(bind);
      containerParent.appendChild(label);
      return;
    }

    const xhtml = "http://www.w3.org/1999/xhtml";
    const fo = document.createElementNS(ns, "foreignObject");
    fo.setAttribute("x", x);
    fo.setAttribute("y", y);
    fo.setAttribute("width", w);
    fo.setAttribute("height", h);
	    const container = document.createElementNS(xhtml, "div");
	    container.className = "hmi-number-input";
	    const bg = obj.fill === "none" ? "transparent" : (obj.fill || "#2b2f3a");
	    container.style.background = bg;
	    container.style.borderRadius = `${Math.max(0, rx)}px`;
	    const borderWidth = Number(obj.strokeWidth ?? 1);
	    const borderColor = obj.stroke || "#ffffff";
	    container.style.border = borderColor === "none" || borderWidth <= 0 ? "none" : `${borderWidth}px solid ${borderColor}`;
	    const input = document.createElementNS(xhtml, "input");
	    input.type = "text";
	    input.inputMode = "decimal";
    if (isTouchscreenRuntime() || isViewOnlyRuntime()) {
      input.readOnly = true;
      input.inputMode = "none";
    }
	    input.autocomplete = "off";
	    input.spellcheck = false;
	    input.dataset.hmiInputId = String(obj.id || "");
	    input.dataset.hmiInputKind = "number-input";
	    const fg = obj.textColor === "none" ? "transparent" : (obj.textColor || "#ffffff");
	    input.style.color = fg;
	    input.style.fontSize = `${Number(obj.fontSize ?? 16)}px`;
	    input.style.fontWeight = obj.bold ? "700" : "400";
	    input.style.textAlign = "center";
    const bind = obj.bindValue || {};
    input.placeholder = getBindPlaceholder(bind);
    const connectionId = String(bind.connection_id || "");
    const tagName = String(bind.tag || "");
    const key = connectionId && tagName ? `${connectionId}.${tagName}` : "";
	    if (key) {
	      const raw = tagValueCache.get(key);
	      const formatted = formatBoundNumber(raw, bind);
	      if (formatted !== null) input.value = formatted.trimEnd();
	    }
		    container.appendChild(input);
		    fo.appendChild(container);
		    containerParent.appendChild(fo);
		    if (obj.bevel && borderColor !== "none" && borderWidth > 0) {
		      appendBevelPaths(containerParent, x, y, w, h);
		    }
		    return;
		  }
	  if (obj.type === "rect") {
	    const x = Number(obj.x ?? 0);
	    const y = Number(obj.y ?? 0);
	    const w = Number(obj.w ?? 120);
	    const h = Number(obj.h ?? 80);
	    const containerParent = hasRotation
	      ? (() => {
	          const cx = x + w / 2;
	          const cy = y + h / 2;
	          const wrapper = document.createElementNS(ns, "g");
	          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
	          parent.appendChild(wrapper);
	          return wrapper;
	        })()
	      : parent;
	    if (obj.shadow) {
	      const shadow = document.createElementNS(ns, "rect");
	      shadow.setAttribute("x", x + 4);
	      shadow.setAttribute("y", y + 4);
      shadow.setAttribute("width", w);
      shadow.setAttribute("height", h);
      shadow.setAttribute("rx", obj.rx ?? 0);
      shadow.setAttribute("fill", "#000000");
      shadow.setAttribute("fill-opacity", "0.5");
      shadow.setAttribute("stroke", "none");
      containerParent.appendChild(shadow);
    }
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", obj.rx ?? 0);
    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#3a3f4b");
    rect.setAttribute("fill", fillColor);
	    const baseStroke = obj.stroke || "#ffffff";
	    const strokeColor = baseStroke === "none" ? "none" : getAutomationColor(obj.strokeAutomation, baseStroke);
	    rect.setAttribute("stroke", strokeColor);
	    const strokeWidth = Number(obj.strokeWidth ?? 1);
	    rect.setAttribute("stroke-width", strokeWidth);
	    containerParent.appendChild(rect);
	    if (obj.bevel && strokeColor !== "none" && strokeWidth > 0) {
	      appendBevelPaths(containerParent, x, y, w, h);
	    }
	    return;
	  }

	  if (obj.type === "alarms-panel") {
	    const x = Number(obj.x ?? 0);
	    const y = Number(obj.y ?? 0);
	    const w = Number(obj.w ?? 320);
	    const h = Number(obj.h ?? 180);
	    const containerParent = hasRotation
	      ? (() => {
	          const cx = x + w / 2;
	          const cy = y + h / 2;
	          const wrapper = document.createElementNS(ns, "g");
	          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
	          parent.appendChild(wrapper);
	          return wrapper;
	        })()
	      : parent;

	    const rect = document.createElementNS(ns, "rect");
	    rect.setAttribute("x", x);
	    rect.setAttribute("y", y);
	    rect.setAttribute("width", w);
	    rect.setAttribute("height", h);
	    rect.setAttribute("rx", obj.rx ?? 0);
	    rect.setAttribute("fill", obj.fill || "#ffffff");
	    const strokeColor = obj.stroke || "#000000";
	    const strokeWidth = Number(obj.strokeWidth ?? 2);
	    rect.setAttribute("stroke", strokeColor === "none" || strokeWidth <= 0 ? "none" : strokeColor);
	    rect.setAttribute("stroke-width", strokeWidth);
	    containerParent.appendChild(rect);

		    const fo = document.createElementNS(ns, "foreignObject");
		    fo.setAttribute("x", x);
		    fo.setAttribute("y", y);
		    fo.setAttribute("width", w);
		    fo.setAttribute("height", h);
		    fo.style.pointerEvents = isEditMode ? "none" : "auto";
		    fo.setAttribute("pointer-events", isEditMode ? "none" : "auto");

		    const panel = document.createElementNS(xhtml, "div");
		    panel.className = "hmi-alarms-panel";
		    panel.style.width = "100%";
		    panel.style.height = "100%";
		    panel.style.boxSizing = "border-box";
		    panel.style.padding = "0";
		    panel.style.fontSize = `${Number(obj.fontSize ?? 14)}px`;
		    applyAlarmsPanelTheme(panel, obj);

		    const cols = document.createElementNS(xhtml, "div");
		    cols.className = "hmi-alarms-panel-cols";
		    ["Active", "Cleared", "Tag", "Area", "Description", "Status", "Quality"].forEach((label) => {
		      const cell = document.createElementNS(xhtml, "div");
		      cell.className = "hmi-alarms-panel-cell hmi-alarms-panel-col";
		      cell.textContent = label;
		      cols.appendChild(cell);
		    });
	    panel.appendChild(cols);

	    const list = document.createElementNS(xhtml, "div");
	    list.className = "hmi-alarms-panel-list";

	    const nowMs = Date.now();
	    const onlyUnacked = Boolean(obj.onlyUnacked);
	    const showSource = obj.showSource !== false;
	    const maxRows = Math.max(1, Math.min(50, Math.round(Number(obj.maxRows ?? 8) || 8)));
	    const items = getAlarmTimelineRows()
	      .filter((row) => {
	        if (row?.enabled === false) return false;
	        const alarmForShelve = alarmsStateById.get(String(row?.alarm_id || "")) || row;
	        if (isAlarmShelvedNow(alarmForShelve, nowMs)) return false;
	        if (onlyUnacked && row?.acked) return false;
	        return true;
	      })
	      .sort((a, b) => {
	        const ta = Number(a?.last_event_ts_ms) || Number(a?.active_since_ms) || 0;
	        const tb = Number(b?.last_event_ts_ms) || Number(b?.active_since_ms) || 0;
	        if (tb !== ta) return tb - ta;
	        const sa = Number(a?.severity) || 0;
	        const sb = Number(b?.severity) || 0;
	        return sb - sa;
	      });

	    if (!items.length) {
	      const empty = document.createElementNS(xhtml, "div");
	      empty.className = "hmi-alarms-panel-empty";
	      empty.textContent = "No alarms.";
	      list.appendChild(empty);
		    } else {
		      items.slice(0, maxRows).forEach((alarm) => {
		        const src = alarm?.source || {};
		        const connectionId = String(src?.connection_id || "");
		        const tagName = String(src?.tag || "");
			        const sourceText = showSource ? `${connectionId}:${tagName}`.trim() : tagName.trim();
			        const areaText = String(alarm?.area || src?.area || "").trim();
			        const baseDescText = getAlarmDisplayDescription(alarm);
			        const activeTs = Number(alarm?.active_since_ms) || 0;
			        const clearedTs = Number(alarm?.cleared_ts_ms) || 0;
			        const activeText = activeTs ? formatAlarmTimeMs(activeTs) : "";
			        const clearedText = clearedTs ? formatAlarmTimeMs(clearedTs) : "";
		        const statusText = String(alarm?.last_event_type || (alarm?.active ? "active" : "return") || "").toUpperCase();
		        const rawQuality = tagQualityCache.get(`${connectionId}.${tagName}`);
		        const qualityText = rawQuality === 1 ? "GOOD" : rawQuality === 0 ? "BAD" : rawQuality == null ? "-" : String(rawQuality);

		        const row = document.createElementNS(xhtml, "div");
		        row.className = "hmi-alarms-panel-row";
	        if (alarm?.active && !alarm?.acked) row.classList.add("is-active-unacked");
	        else if (alarm?.active && alarm?.acked) row.classList.add("is-active-acked");
	        else row.classList.add("is-returned");
	        if (rawQuality === 0) row.classList.add("is-bad-quality");
		        const makeCell = (text) => {
		          const cell = document.createElementNS(xhtml, "div");
		          cell.className = "hmi-alarms-panel-cell";
		          cell.textContent = text;
		          return cell;
		        };
		        row.appendChild(makeCell(activeText));
		        row.appendChild(makeCell(clearedText));
		        row.appendChild(makeCell(sourceText));
		        row.appendChild(makeCell(areaText));
		        row.appendChild(makeCell(baseDescText));
		        row.appendChild(makeCell(statusText));
		        row.appendChild(makeCell(qualityText));
		        list.appendChild(row);
		      });
		    }

	    panel.appendChild(list);
	    fo.appendChild(panel);
	    containerParent.appendChild(fo);
	    return;
	  }

  if (obj.type === "circle") {
    const cx = Number(obj.cx ?? 0);
    const cy = Number(obj.cy ?? 0);
    const r = Number(obj.r ?? 40);
    const containerParent = hasRotation
      ? (() => {
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    if (obj.shadow) {
      const shadow = document.createElementNS(ns, "circle");
      shadow.setAttribute("cx", cx + 4);
      shadow.setAttribute("cy", cy + 4);
      shadow.setAttribute("r", r);
      shadow.setAttribute("fill", "#000000");
      shadow.setAttribute("fill-opacity", "0.5");
      shadow.setAttribute("stroke", "none");
      containerParent.appendChild(shadow);
    }
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#3a3f4b");
    circle.setAttribute("fill", fillColor);
    const baseStroke = obj.stroke || "#ffffff";
    const strokeColor = baseStroke === "none" ? "none" : getAutomationColor(obj.strokeAutomation, baseStroke);
    circle.setAttribute("stroke", strokeColor);
    circle.setAttribute("stroke-width", obj.strokeWidth ?? 1);
    containerParent.appendChild(circle);
    return;
  }

  if (obj.type === "line") {
    const x1 = Number(obj.x1 ?? 0);
    const y1 = Number(obj.y1 ?? 0);
    const x2 = Number(obj.x2 ?? 0);
    const y2 = Number(obj.y2 ?? 0);
    const containerParent = hasRotation
      ? (() => {
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    const strokeColor = getAutomationColor(obj.strokeAutomation, obj.stroke || "#ffffff");
    line.setAttribute("stroke", strokeColor);
    line.setAttribute("stroke-width", obj.strokeWidth ?? 2);
    containerParent.appendChild(line);
    return;
  }
  if (obj.type === "curve") {
    const x1 = Number(obj.x1 ?? 0);
    const y1 = Number(obj.y1 ?? 0);
    const x2 = Number(obj.x2 ?? 0);
    const y2 = Number(obj.y2 ?? 0);
    const cx = Number(obj.cx ?? ((x1 + x2) / 2));
    const cy = Number(obj.cy ?? ((y1 + y2) / 2));
    const containerParent = hasRotation
      ? (() => {
          const bounds = getObjectBounds(obj);
          const centerX = bounds ? (bounds.x + bounds.width / 2) : ((x1 + x2) / 2);
          const centerY = bounds ? (bounds.y + bounds.height / 2) : ((y1 + y2) / 2);
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${centerX} ${centerY})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
    path.setAttribute("fill", "none");
    const strokeColor = getAutomationColor(obj.strokeAutomation, obj.stroke || "#ffffff");
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", obj.strokeWidth ?? 2);
    path.setAttribute("vector-effect", "non-scaling-stroke");
    containerParent.appendChild(path);
    return;
  }
  if (obj.type === "polyline") {
    const points = Array.isArray(obj.points) ? obj.points : [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach((pt) => {
      const x = Number(pt?.x ?? 0);
      const y = Number(pt?.y ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    const containerParent = hasRotation
      ? (() => {
          const cx = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
          const cy = Number.isFinite(minY) ? (minY + maxY) / 2 : 0;
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    const el = document.createElementNS(ns, "polyline");
    const attr = points.map((pt) => `${Number(pt?.x ?? 0)},${Number(pt?.y ?? 0)}`).join(" ");
    el.setAttribute("points", attr);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", obj.stroke || "#ffffff");
    el.setAttribute("stroke-width", obj.strokeWidth ?? 2);
    el.setAttribute("vector-effect", "non-scaling-stroke");
    containerParent.appendChild(el);
    return;
  }
  if (obj.type === "polygon") {
    const points = Array.isArray(obj.points) ? obj.points : [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach((pt) => {
      const x = Number(pt?.x ?? 0);
      const y = Number(pt?.y ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    const containerParent = hasRotation
      ? (() => {
          const cx = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
          const cy = Number.isFinite(minY) ? (minY + maxY) / 2 : 0;
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    const el = document.createElementNS(ns, "polygon");
    const attr = points.map((pt) => `${Number(pt?.x ?? 0)},${Number(pt?.y ?? 0)}`).join(" ");
    el.setAttribute("points", attr);
    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#3a3f4b");
    el.setAttribute("fill", fillColor);
    const baseStroke = obj.stroke || "#ffffff";
    const strokeColor = baseStroke === "none" ? "none" : getAutomationColor(obj.strokeAutomation, baseStroke);
    el.setAttribute("stroke", strokeColor);
    el.setAttribute("stroke-width", obj.strokeWidth ?? 1);
    el.setAttribute("vector-effect", "non-scaling-stroke");
    containerParent.appendChild(el);
    return;
  }
  if (obj.type === "bar") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    const w = Number(obj.w ?? 120);
    const h = Number(obj.h ?? 120);
    const containerParent = hasRotation
      ? (() => {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const wrapper = document.createElementNS(ns, "g");
          wrapper.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
          parent.appendChild(wrapper);
          return wrapper;
        })()
      : parent;
    const bg = obj.background ?? "transparent";
    if (bg && bg !== "none") {
      const bgRect = document.createElementNS(ns, "rect");
      bgRect.setAttribute("x", x);
      bgRect.setAttribute("y", y);
      bgRect.setAttribute("width", w);
      bgRect.setAttribute("height", h);
      bgRect.setAttribute("fill", bg);
      bgRect.setAttribute("stroke", "none");
      containerParent.appendChild(bgRect);
    }

    const min = resolveBarLimit(obj, "min");
    const max = resolveBarLimit(obj, "max");
    const range = max - min;
    let value = min;
    const bind = obj.bindValue || {};
    const connectionId = String(bind.connection_id || "");
    const tagName = String(bind.tag || "");
    if (!isEditMode && connectionId && tagName) {
      const raw = tagValueCache.get(`${connectionId}.${tagName}`);
      const numeric = coerceTagNumber(raw);
      if (numeric !== null) {
        const multiplier = Number.isFinite(Number(bind.multiplier)) ? Number(bind.multiplier) : 1;
        value = numeric * multiplier;
      }
    }
    if (Number.isFinite(range) && range !== 0) {
      value = Math.min(max, Math.max(min, value));
    }
    const ratio = Number.isFinite(range) && range !== 0 ? (value - min) / range : 0;
    const clamped = Math.min(1, Math.max(0, ratio));
    const orientation = obj.orientation === "horizontal" ? "horizontal" : "vertical";
    const fill = obj.fill ?? "#46ff64";
    if (fill && fill !== "none") {
      const fillRect = document.createElementNS(ns, "rect");
      let isFull = false;
      if (orientation === "horizontal") {
        const fillW = w * clamped;
        isFull = fillW >= w - 0.001;
        fillRect.setAttribute("x", x);
        fillRect.setAttribute("y", y);
        fillRect.setAttribute("width", fillW);
        fillRect.setAttribute("height", h);
      } else {
        const fillH = h * clamped;
        isFull = fillH >= h - 0.001;
        fillRect.setAttribute("x", x);
        fillRect.setAttribute("y", y + (h - fillH));
        fillRect.setAttribute("width", w);
        fillRect.setAttribute("height", fillH);
      }
      fillRect.setAttribute("fill", fill);
      fillRect.setAttribute("stroke", "none");
      containerParent.appendChild(fillRect);
    }

    const border = obj.border || {};
    if (border.enabled) {
      const strokeWidth = Math.max(0, Number(border.width ?? 1));
      if (strokeWidth > 0) {
        const borderRect = document.createElementNS(ns, "rect");
        borderRect.setAttribute("x", x);
        borderRect.setAttribute("y", y);
        borderRect.setAttribute("width", w);
        borderRect.setAttribute("height", h);
        borderRect.setAttribute("fill", "none");
        borderRect.setAttribute("stroke", border.color || "#ffffff");
        borderRect.setAttribute("stroke-width", strokeWidth);
        borderRect.setAttribute("vector-effect", "non-scaling-stroke");
        containerParent.appendChild(borderRect);
      }
    }
    appendBarTicks(containerParent, x, y, w, h, orientation, obj.ticks, border.color || "#ffffff");
    return;
  }
  if (obj.type === "text") {
	    const textEl = document.createElementNS(ns, "text");
	    textEl.setAttribute("xml:space", "preserve");
	    textEl.style.whiteSpace = "pre";
	    const x = Number(obj.x ?? 0);
	    const y = Number(obj.y ?? 0);
    const rawText = obj.text || "";
    let displayText = rawText;
    if (obj.bindText && rawText.includes("{value}")) {
      const connectionId = String(obj.bindText.connection_id || "");
      const tag = String(obj.bindText.tag || "");
      const key = `${connectionId}.${tag}`;
      const boundValue = tagValueCache.get(key);
      const formatted = (!isEditMode) ? formatBoundNumber(boundValue, obj.bindText) : null;
      const replacement = formatted !== null ? formatted : getBindPlaceholder(obj.bindText);
      displayText = rawText.replace(/\{value\}/g, replacement);
    }

    if (obj.background || obj.borderColor) {
      const bgRect = document.createElementNS(ns, "rect");
      const bounds = getObjectBounds({ ...obj, text: displayText, bindText: null });
      if (bounds) {
        bgRect.setAttribute("x", bounds.x);
        bgRect.setAttribute("y", bounds.y);
        bgRect.setAttribute("width", bounds.width);
        bgRect.setAttribute("height", bounds.height);
      } else {
        bgRect.setAttribute("x", x - TEXT_BG_PADDING_X);
        bgRect.setAttribute("y", y - TEXT_BG_PADDING_Y);
        bgRect.setAttribute("width", TEXT_BG_PADDING_X * 2);
        bgRect.setAttribute("height", TEXT_BG_PADDING_Y * 2);
      }
      if (hasRotation) bgRect.setAttribute("transform", `rotate(${rotation} ${x} ${y})`);
      bgRect.setAttribute("rx", obj.rx ?? 0);
      bgRect.setAttribute("fill", obj.background || "transparent");
      if (obj.borderColor) {
        bgRect.setAttribute("stroke", obj.borderColor);
        bgRect.setAttribute("stroke-width", obj.borderWidth ?? 1);
        bgRect.setAttribute("vector-effect", "non-scaling-stroke");
      }
      parent.appendChild(bgRect);
    }
    textEl.setAttribute("x", x);
    textEl.setAttribute("y", y);
    if (hasRotation) textEl.setAttribute("transform", `rotate(${rotation} ${x} ${y})`);
    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#ffffff");
    textEl.setAttribute("fill", fillColor);
    const fontSize = Number(obj.fontSize || 18);
    textEl.setAttribute("font-size", fontSize);
    textEl.setAttribute("font-weight", obj.bold ? "700" : "400");
    if (obj.align === "center") textEl.setAttribute("text-anchor", "middle");
    if (obj.align === "right") textEl.setAttribute("text-anchor", "end");
	    const decodedText = decodeNbspEntities(displayText);
	    const lines = splitMultiline(decodedText);
    if (lines.length > 1) {
      textEl.setAttribute("dominant-baseline", "hanging");
      const valign = obj.valign || "top";
      const measured = measureTextBlock(decodedText, fontSize, Boolean(obj.bold));
      let yStart = y;
      if (valign === "middle") yStart = y - measured.height / 2;
      if (valign === "bottom") yStart = y - measured.height;
	      applyMultilineSvgText(textEl, measured.lines, x, yStart, measured.lineHeight);
	    } else {
      if (obj.valign === "middle") textEl.setAttribute("dominant-baseline", "middle");
      if (obj.valign === "bottom") textEl.setAttribute("dominant-baseline", "text-after-edge");
	      textEl.textContent = decodedText;
	    }
    parent.appendChild(textEl);
    return;
  }

  if (obj.type === "button") {
    const x = Number(obj.x ?? 0);
    const y = Number(obj.y ?? 0);
    const w = Number(obj.w ?? 160);
    const h = Number(obj.h ?? 48);
    const wrapper = document.createElementNS(ns, "g");
    wrapper.setAttribute("transform", `translate(${x} ${y})`);
    const group = document.createElementNS(ns, "g");
    const rx = Number(obj.rx ?? 8);
    if (hasRotation) {
      group.setAttribute("transform", `rotate(${rotation} ${w / 2} ${h / 2})`);
    }
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", 0);
    rect.setAttribute("y", 0);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", rx);
    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#2b2f3a");
    if (obj.shadow) {
      const shadow = document.createElementNS(ns, "rect");
      shadow.setAttribute("x", 4);
      shadow.setAttribute("y", 4);
      shadow.setAttribute("width", w);
      shadow.setAttribute("height", h);
      shadow.setAttribute("rx", rx);
      shadow.setAttribute("fill", "#000000");
      shadow.setAttribute("fill-opacity", "0.5");
      shadow.setAttribute("stroke", "none");
      group.appendChild(shadow);
    }
    const isWriteActive = !isEditMode
      && (obj.action?.type === "toggle-write" || obj.action?.type === "set-write")
      && getWriteActionActiveState(obj.action);
    rect.setAttribute("fill", fillColor);
    rect.setAttribute("stroke", obj.stroke || "#ffffff");
    rect.setAttribute("stroke-width", obj.strokeWidth ?? 1);
    group.appendChild(rect);

    if (isWriteActive) {
      const activeRing = document.createElementNS(ns, "rect");
      activeRing.setAttribute("x", 2);
      activeRing.setAttribute("y", 2);
      activeRing.setAttribute("width", Math.max(0, w - 4));
      activeRing.setAttribute("height", Math.max(0, h - 4));
      activeRing.setAttribute("rx", Math.max(0, rx - 2));
      activeRing.setAttribute("fill", "none");
      activeRing.setAttribute("stroke", "#4aa3ff");
      activeRing.setAttribute("stroke-width", "2");
      activeRing.setAttribute("vector-effect", "non-scaling-stroke");
      group.appendChild(activeRing);
    }

    if (obj.bevel) {
      const highlight = document.createElementNS(ns, "path");
      highlight.setAttribute("d", `M 1 ${h - 1} L 1 1 L ${w - 1} 1`);
      highlight.setAttribute("fill", "none");
      highlight.setAttribute("stroke", "#ffffff");
      highlight.setAttribute("stroke-opacity", "0.6");
      highlight.setAttribute("stroke-width", "3");
      highlight.setAttribute("stroke-linecap", "round");
      highlight.setAttribute("stroke-linejoin", "round");
      group.appendChild(highlight);

      const shade = document.createElementNS(ns, "path");
      shade.setAttribute("d", `M 1 ${h - 1} L ${w - 1} ${h - 1} L ${w - 1} 1`);
      shade.setAttribute("fill", "none");
      shade.setAttribute("stroke", "#000000");
      shade.setAttribute("stroke-opacity", "0.6");
      shade.setAttribute("stroke-width", "3");
      shade.setAttribute("stroke-linecap", "round");
      shade.setAttribute("stroke-linejoin", "round");
      group.appendChild(shade);
    }

	    const label = document.createElementNS(ns, "text");
	    label.setAttribute("xml:space", "preserve");
	    label.style.whiteSpace = "pre";
	    const align = obj.align || "center";
	    const valign = obj.valign || "middle";
    let labelX = w / 2;
    if (align === "left") labelX = 8;
    if (align === "right") labelX = w - 8;
    const vPad = 8;
    let labelY = h / 2;
    if (valign === "top") labelY = vPad;
    if (valign === "bottom") labelY = h - vPad;
    label.setAttribute("x", labelX);
    label.setAttribute("y", labelY);
    const textColor = getAutomationColor(obj.textColorAutomation, obj.textColor || "#ffffff");
    label.setAttribute("fill", textColor);
    const fontSize = Number(obj.fontSize || 16);
    label.setAttribute("font-size", fontSize);
    label.setAttribute("font-weight", obj.bold ? "700" : "400");
    if (align === "center") label.setAttribute("text-anchor", "middle");
    if (align === "right") label.setAttribute("text-anchor", "end");
    let labelText = decodeNbspEntities(obj.label || "Button");
    if (obj.bindLabel && labelText.includes("{value}")) {
      const connectionId = String(obj.bindLabel.connection_id || "");
      const tag = String(obj.bindLabel.tag || "");
      const key = `${connectionId}.${tag}`;
      const boundValue = tagValueCache.get(key);
      const formatted = (!isEditMode) ? formatBoundNumber(boundValue, obj.bindLabel) : null;
      const replacement = formatted !== null ? formatted : getBindPlaceholder(obj.bindLabel);
      labelText = labelText.replace(/\{value\}/g, replacement);
    }
    labelText = decodeNbspEntities(labelText);
    const labelLines = splitMultiline(labelText);
    if (labelLines.length > 1) {
      const measured = measureTextBlock(labelText, fontSize, Boolean(obj.bold));
      label.setAttribute("dominant-baseline", "hanging");
      let yStart = vPad;
      if (valign === "middle") yStart = (h - measured.height) / 2;
      if (valign === "bottom") yStart = h - vPad - measured.height;
      applyMultilineSvgText(label, measured.lines, labelX, yStart, measured.lineHeight);
    } else {
      if (valign === "top") label.setAttribute("dominant-baseline", "hanging");
      if (valign === "middle") label.setAttribute("dominant-baseline", "middle");
      if (valign === "bottom") label.setAttribute("dominant-baseline", "text-after-edge");
      label.textContent = labelText;
    }
    group.appendChild(label);

    wrapper.appendChild(group);
    parent.appendChild(wrapper);
  }
};

const renderObjectIntoWithOffset = (parent, obj, offsetX, offsetY) => {
  if (!parent || !obj) return;
  if (!shouldRenderObject(obj)) return;
  const clone = JSON.parse(JSON.stringify(obj));
  translateObject(clone, offsetX, offsetY);
  renderObjectInto(parent, clone);
};

const pendingScreens = new Set();
let currentPopupScreenId = null;

const queueScreenLoad = (id) => {
  if (!id || pendingScreens.has(id)) return;
  pendingScreens.add(id);
  fetch(`/api/screens/${encodeURIComponent(id)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.parsed) {
        screenCache.set(id, data.parsed);
        renderScreen();
        scheduleWsSubscribeRefresh();
      }
    })
    .finally(() => {
      pendingScreens.delete(id);
    });
};

const loadViewportTarget = (viewportId, screenId) => {
  if (!viewportId || !screenId || !currentScreenObj?.objects) return;
  const viewport = currentScreenObj.objects.find(
    (obj) => obj?.type === "viewport" && obj.id === viewportId
  );
  if (!viewport) return;
  viewport.target = screenId;
  renderScreen();
  scheduleWsSubscribeRefresh();
};

const closePopup = () => {
  if (!popupOverlay) return;
  popupOverlay.classList.add("is-hidden");
  popupOverlay.setAttribute("aria-hidden", "true");
  if (popupSvg) popupSvg.textContent = "";
  currentPopupScreenId = null;
  scheduleWsSubscribeRefresh();
};

let pendingSetpointAction = null;

const closeSetpointPrompt = () => {
  if (!setpointOverlay) return;
  setpointOverlay.classList.add("is-hidden");
  setpointOverlay.setAttribute("aria-hidden", "true");
  pendingSetpointAction = null;
};

const openSetpointPrompt = (action, buttonLabel) => {
  if (isViewOnlyRuntime()) return;
  if (!setpointOverlay || !setpointValueInput) return;
  pendingSetpointAction = action || null;
  const connectionId = String(action?.connection_id || "").trim();
  const tagName = String(action?.tag || "").trim();
  const titleParts = [];
  if (buttonLabel) titleParts.push(buttonLabel);
  if (connectionId && tagName) titleParts.push(`${connectionId}.${tagName}`);
  const title = titleParts.join(" • ") || "Setpoint";
  if (setpointTitle) setpointTitle.textContent = title;

  const minValue = parseOptionalNumber(action?.min);
  const maxValue = parseOptionalNumber(action?.max);
  const stepValue = parseOptionalNumber(action?.step);
  if (minValue != null) setpointValueInput.min = String(minValue);
  else setpointValueInput.removeAttribute("min");
  if (maxValue != null) setpointValueInput.max = String(maxValue);
  else setpointValueInput.removeAttribute("max");
  if (stepValue != null) setpointValueInput.step = String(stepValue);
  else setpointValueInput.step = "any";

  let initialValue = null;
  if (connectionId && tagName) {
    const raw = tagValueCache.get(`${connectionId}.${tagName}`);
    const numeric = coerceTagNumber(raw);
    if (numeric != null) initialValue = numeric;
  }
  if (initialValue == null) {
    const fallback = parseOptionalNumber(action?.defaultValue);
    initialValue = fallback != null ? fallback : 0;
  }

  if (isTouchscreenRuntime()) {
    const hasTarget = connectionId && tagName;
    if (!hasTarget) return;
    openKeypad({
      kind: "setpoint",
      connection_id: connectionId,
      tag: tagName,
      title,
      value: String(initialValue),
      min: minValue,
      max: maxValue,
      step: stepValue
    });
    return;
  }
  setpointValueInput.value = String(initialValue);

  setpointOverlay.classList.remove("is-hidden");
  setpointOverlay.setAttribute("aria-hidden", "false");
  setpointValueInput.focus();
  setpointValueInput.select();
};

const submitSetpointPrompt = async () => {
  const action = pendingSetpointAction;
  if (!action || !setpointValueInput) return;
  if (isViewOnlyRuntime() || isTouchscreenRuntime()) {
    closeSetpointPrompt();
    return;
  }
  const connectionId = String(action.connection_id || "").trim();
  const tagName = String(action.tag || "").trim();
  if (!connectionId || !tagName) {
    closeSetpointPrompt();
    return;
  }
  const raw = String(setpointValueInput.value || "").trim();
  const value = raw === "" ? null : Number(raw);
  if (value == null || !Number.isFinite(value)) return;
  closeSetpointPrompt();
  try {
    await apiWriteTag({ connection_id: connectionId, tag: tagName, value });
  } catch (error) {
    console.error("[prompt-write] failed:", error);
  }
};

const openPopup = (screenId) => {
  if (!popupOverlay || !popupSvg) return;
  currentPopupScreenId = screenId;
  const child = screenCache.get(screenId);
  if (!child) {
    queueScreenLoad(screenId);
    return;
  }
  const childW = Number(child.width) || 1920;
  const childH = Number(child.height) || 1080;
  const maxW = Math.floor(window.innerWidth * 0.8);
  const maxH = Math.floor(window.innerHeight * 0.8);
  const scale = Math.min(1, maxW / childW, maxH / childH);
  const scaledW = Math.round(childW * scale);
  const scaledH = Math.round(childH * scale);

  popupSvg.textContent = "";
  popupSvg.setAttribute("viewBox", `0 0 ${childW} ${childH}`);
  popupSvg.setAttribute("width", scaledW);
  popupSvg.setAttribute("height", scaledH);
  popupSvg.style.transform = "";

  const ns = "http://www.w3.org/2000/svg";
  const bgRect = document.createElementNS(ns, "rect");
  bgRect.setAttribute("x", 0);
  bgRect.setAttribute("y", 0);
  bgRect.setAttribute("width", childW);
  bgRect.setAttribute("height", childH);
  bgRect.setAttribute("fill", child.background || "transparent");
  popupSvg.appendChild(bgRect);
  child.objects?.forEach((childObj) => renderObjectInto(popupSvg, childObj));

  if (popupTitle) popupTitle.textContent = screenId;
  popupOverlay.classList.remove("is-hidden");
  popupOverlay.setAttribute("aria-hidden", "false");
  scheduleWsSubscribeRefresh();
};

const renderScreen = () => {
  if (!hmiSvg || !currentScreenObj) return;
  const prevNodes = Array.from(hmiSvg.childNodes);
  const prevRenderedElements = renderedElements;
  const prevRenderedMeta = renderedElementMeta;
  let didClear = false;
  try {
  const activeEl = document.activeElement;
  const activeNumberInput = (!isEditMode && activeEl instanceof HTMLInputElement && activeEl.dataset?.hmiInputKind === "number-input")
    ? {
      id: String(activeEl.dataset?.hmiInputId || ""),
      value: String(activeEl.value ?? ""),
      selectionStart: activeEl.selectionStart,
      selectionEnd: activeEl.selectionEnd
    }
    : null;
  let numberInputRestore = null;
  const { width, height, background, border, objects = [] } = currentScreenObj;
  const screenWidth = Number(width) || 1920;
  const screenHeight = Number(height) || 1080;

  document.documentElement.style.setProperty("--screen-width", `${screenWidth}px`);
  document.documentElement.style.setProperty("--screen-height", `${screenHeight}px`);
  hmiSvg.setAttribute("viewBox", `0 0 ${screenWidth} ${screenHeight}`);
  const resolvedBg = (background && background !== "none") ? background : "transparent";
  hmiSvg.style.background = resolvedBg;
  document.documentElement.style.setProperty("--screen-bg", resolvedBg);
  hmiSvg.textContent = "";
  didClear = true;
  renderedElements = [];
  renderedElementMeta = [];
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  hmiSvg.appendChild(defs);

  const ns = "http://www.w3.org/2000/svg";
  if (border?.enabled) {
    const borderRect = document.createElementNS(ns, "rect");
    const strokeWidth = Number(border.width) || 1;
    borderRect.setAttribute("x", strokeWidth / 2);
    borderRect.setAttribute("y", strokeWidth / 2);
    borderRect.setAttribute("width", screenWidth - strokeWidth);
    borderRect.setAttribute("height", screenHeight - strokeWidth);
    borderRect.setAttribute("fill", "none");
    borderRect.setAttribute("stroke", border.color || "#ffffff");
    borderRect.setAttribute("stroke-width", strokeWidth);
    borderRect.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(borderRect);
  }

  objects.forEach((obj, index) => {
    if (!shouldRenderObject(obj)) return;
    if (obj?.type === "group") {
      const groupEl = document.createElementNS(ns, "g");
      const rotation = Number(obj.rotation ?? 0);
      const hasRotation = Number.isFinite(rotation) && rotation !== 0;
      hmiSvg.appendChild(groupEl);
      const offsetX = Number(obj.x ?? 0);
      const offsetY = Number(obj.y ?? 0);
      let transform = `translate(${offsetX} ${offsetY})`;
      if (hasRotation) {
        const w = Number(obj.w ?? 0);
        const h = Number(obj.h ?? 0);
        if (w && h) transform += ` rotate(${rotation} ${w / 2} ${h / 2})`;
      }
      groupEl.setAttribute("transform", transform);
      const children = Array.isArray(obj.children) ? obj.children : [];
      children.forEach((child) => renderObjectIntoWithOffset(groupEl, child, 0, 0));
      renderedElements.push(groupEl);
      renderedElementMeta.push({ el: groupEl, index, type: "group" });
      return;
    }
	    if (obj?.type === "image") {
	      const x = Number(obj.x ?? 0);
	      const y = Number(obj.y ?? 0);
	      const w = Number(obj.w ?? 120);
	      const h = Number(obj.h ?? 120);
	      const href = String(obj.src || "").trim();
	      if (!href) return;
	      const image = document.createElementNS(ns, "image");
	      image.setAttribute("x", x);
	      image.setAttribute("y", y);
	      image.setAttribute("width", w);
	      image.setAttribute("height", h);
	      image.setAttribute("preserveAspectRatio", "xMidYMid meet");
	      const rotation = Number(obj.rotation ?? 0);
	      if (rotation) {
	        const cx = x + w / 2;
	        const cy = y + h / 2;
	        image.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
	      }
	      setImageHref(image, `img/${encodeURIComponent(href)}`);
	      hmiSvg.appendChild(image);
	      renderedElements.push(image);
	      renderedElementMeta.push({ el: image, index, type: "image" });
	      return;
	    }
	    if (obj?.type === "indicator") {
	      const group = renderIndicatorInto(hmiSvg, obj);
	      if (group) {
	        const x = Number(obj.x ?? 0);
	        const y = Number(obj.y ?? 0);
	        const w = Number(obj.w ?? 160);
	        const h = Number(obj.h ?? 64);
	        const rotation = Number(obj.rotation ?? 0);
	        if (rotation) {
	          const cx = x + w / 2;
	          const cy = y + h / 2;
	          group.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
	        }
	        renderedElements.push(group);
	        renderedElementMeta.push({ el: group, index, type: "indicator" });
	      }
	      return;
	    }
		    if (obj?.type === "number-input") {
		      const group = document.createElementNS(ns, "g");
		      const x = Number(obj.x ?? 0);
		      const y = Number(obj.y ?? 0);
		      const w = Number(obj.w ?? 140);
		      const h = Number(obj.h ?? 36);
	      const rx = Number(obj.rx ?? 6);
	      if (isEditMode) {
	        const rect = document.createElementNS(ns, "rect");
	        rect.setAttribute("x", x);
	        rect.setAttribute("y", y);
	        rect.setAttribute("width", w);
	        rect.setAttribute("height", h);
	        rect.setAttribute("rx", rx);
	        rect.setAttribute("fill", obj.fill || "#2b2f3a");
	        const stroke = obj.stroke || "#ffffff";
	        const strokeWidth = Number(obj.strokeWidth ?? 1);
	        rect.setAttribute("stroke", stroke);
	        rect.setAttribute("stroke-width", strokeWidth);
	        group.appendChild(rect);
	        if (obj.bevel && stroke !== "none" && strokeWidth > 0) {
	          appendBevelPaths(group, x, y, w, h);
	        }
	        const label = document.createElementNS(ns, "text");
	        label.setAttribute("x", x + w / 2);
	        label.setAttribute("y", y + h / 2);
	        label.setAttribute("fill", obj.textColor || "#ffffff");
        label.setAttribute("font-size", Number(obj.fontSize ?? 16));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        const bind = obj.bindValue || {};
        label.textContent = getBindPlaceholder(bind);
        group.appendChild(label);
      } else {
        const xhtml = "http://www.w3.org/1999/xhtml";
        const fo = document.createElementNS(ns, "foreignObject");
        fo.setAttribute("x", x);
        fo.setAttribute("y", y);
        fo.setAttribute("width", w);
        fo.setAttribute("height", h);
        const container = document.createElementNS(xhtml, "div");
        container.className = "hmi-number-input";
	        container.style.background = obj.fill || "#2b2f3a";
	        container.style.borderRadius = `${Math.max(0, rx)}px`;
	        const borderWidth = Number(obj.strokeWidth ?? 1);
	        const borderColor = obj.stroke || "#ffffff";
	        container.style.border = borderColor === "none" || borderWidth <= 0 ? "none" : `${borderWidth}px solid ${borderColor}`;
        const input = document.createElementNS(xhtml, "input");
        input.type = "text";
        input.inputMode = "decimal";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.dataset.hmiInputId = String(obj.id || "");
        input.dataset.hmiInputKind = "number-input";
        input.style.color = obj.textColor || "#ffffff";
        input.style.fontSize = `${Number(obj.fontSize ?? 16)}px`;
        input.style.textAlign = "center";
        const bind = obj.bindValue || {};
        input.placeholder = getBindPlaceholder(bind);
        const shouldRestore = Boolean(activeNumberInput && activeNumberInput.id && String(obj.id || "") === activeNumberInput.id);
        if (shouldRestore) {
          input.value = activeNumberInput.value;
          numberInputRestore = { input, selectionStart: activeNumberInput.selectionStart, selectionEnd: activeNumberInput.selectionEnd };
        }
        const connectionId = String(bind.connection_id || "");
        const tagName = String(bind.tag || "");
        const key = connectionId && tagName ? `${connectionId}.${tagName}` : "";
        if (key && !shouldRestore) {
          const raw = tagValueCache.get(key);
          const formatted = formatBoundNumber(raw, bind);
          if (formatted !== null) input.value = formatted.trimEnd();
        }
	        container.appendChild(input);
	        fo.appendChild(container);
	        group.appendChild(fo);
	        if (obj.bevel && borderColor !== "none" && borderWidth > 0) {
	          appendBevelPaths(group, x, y, w, h);
	        }
		      }
		      const rotation = Number(obj.rotation ?? 0);
		      if (rotation) {
		        const cx = x + w / 2;
	        const cy = y + h / 2;
	        group.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
	      }
	      hmiSvg.appendChild(group);
	      renderedElements.push(group);
	      renderedElementMeta.push({ el: group, index, type: "number-input" });
	      return;
	    }
		  if (obj?.type === "rect") {
		    const x = Number(obj.x ?? 0);
		    const y = Number(obj.y ?? 0);
		    const w = Number(obj.w ?? 120);
		    const h = Number(obj.h ?? 80);
		    const rotation = Number(obj.rotation ?? 0);
		    const cx = x + w / 2;
		    const cy = y + h / 2;
		    if (obj.shadow) {
		      const shadow = document.createElementNS(ns, "rect");
		      shadow.setAttribute("x", x + 4);
		      shadow.setAttribute("y", y + 4);
	      shadow.setAttribute("width", w);
	      shadow.setAttribute("height", h);
	      shadow.setAttribute("rx", obj.rx ?? 0);
	      shadow.setAttribute("fill", "#000000");
	      shadow.setAttribute("fill-opacity", "0.5");
	      shadow.setAttribute("stroke", "none");
	      if (rotation) shadow.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
	      hmiSvg.appendChild(shadow);
	    }
	    const rect = document.createElementNS(ns, "rect");
	      rect.setAttribute("x", x);
	      rect.setAttribute("y", y);
	      rect.setAttribute("width", w);
	      rect.setAttribute("height", h);
	      rect.setAttribute("rx", obj.rx ?? 0);
		    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#3a3f4b");
		    rect.setAttribute("fill", fillColor);
		    const baseStroke = obj.stroke || "#ffffff";
		    const strokeColor = baseStroke === "none" ? "none" : getAutomationColor(obj.strokeAutomation, baseStroke);
		    rect.setAttribute("stroke", strokeColor);
		    const strokeWidth = Number(obj.strokeWidth ?? 1);
		    rect.setAttribute("stroke-width", strokeWidth);
		    if (rotation) rect.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
		    hmiSvg.appendChild(rect);
		    if (obj.bevel && strokeColor !== "none" && strokeWidth > 0) {
		      const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : "";
		      appendBevelPaths(hmiSvg, x, y, w, h, transform || undefined);
		    }
			      renderedElements.push(rect);
				      renderedElementMeta.push({ el: rect, index, type: "rect" });
					      return;
					    }

      if (obj?.type === "alarms-panel") {
        const group = document.createElementNS(ns, "g");
        const x = Number(obj.x ?? 0);
        const y = Number(obj.y ?? 0);
        const w = Number(obj.w ?? 320);
        const h = Number(obj.h ?? 180);
        const rotation = Number(obj.rotation ?? 0);
        const cx = x + w / 2;
        const cy = y + h / 2;

        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", w);
        rect.setAttribute("height", h);
        rect.setAttribute("rx", obj.rx ?? 0);
        rect.setAttribute("fill", obj.fill || "#ffffff");
        const strokeColor = obj.stroke || "#000000";
        const strokeWidth = Number(obj.strokeWidth ?? 1);
        rect.setAttribute("stroke", strokeColor === "none" || strokeWidth <= 0 ? "none" : strokeColor);
        rect.setAttribute("stroke-width", strokeWidth);
        group.appendChild(rect);

	        const fo = document.createElementNS(ns, "foreignObject");
	        fo.setAttribute("x", x);
	        fo.setAttribute("y", y);
	        fo.setAttribute("width", w);
	        fo.setAttribute("height", h);
	        fo.style.pointerEvents = isEditMode ? "none" : "auto";
	        fo.setAttribute("pointer-events", isEditMode ? "none" : "auto");

        const panel = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        panel.className = "hmi-alarms-panel";
        panel.style.width = "100%";
        panel.style.height = "100%";
        panel.style.boxSizing = "border-box";
        panel.style.padding = "0";
        panel.style.fontSize = `${Number(obj.fontSize ?? 14)}px`;
        applyAlarmsPanelTheme(panel, obj);

        const cols = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        cols.className = "hmi-alarms-panel-cols";
        ["Active", "Cleared", "Tag", "Area", "Description", "Status", "Quality"].forEach((label) => {
          const cell = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
          cell.className = "hmi-alarms-panel-cell hmi-alarms-panel-col";
          cell.textContent = label;
          cols.appendChild(cell);
        });
        panel.appendChild(cols);

        const list = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        list.className = "hmi-alarms-panel-list";

        const nowMs = Date.now();
        const onlyUnacked = Boolean(obj.onlyUnacked);
        const showSource = obj.showSource !== false;
        const maxRows = Math.max(1, Math.min(50, Math.round(Number(obj.maxRows ?? 8) || 8)));
        const items = getAlarmTimelineRows()
          .filter((row) => {
            if (row?.enabled === false) return false;
            const alarmForShelve = alarmsStateById.get(String(row?.alarm_id || "")) || row;
            if (isAlarmShelvedNow(alarmForShelve, nowMs)) return false;
            if (onlyUnacked && row?.acked) return false;
            return true;
          })
          .sort((a, b) => {
            const ta = Number(a?.last_event_ts_ms) || Number(a?.active_since_ms) || 0;
            const tb = Number(b?.last_event_ts_ms) || Number(b?.active_since_ms) || 0;
            if (tb !== ta) return tb - ta;
            const sa = Number(a?.severity) || 0;
            const sb = Number(b?.severity) || 0;
            return sb - sa;
          });

        if (!items.length) {
          const empty = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
          empty.className = "hmi-alarms-panel-empty";
          empty.textContent = "No alarms.";
          list.appendChild(empty);
        } else {
          items.slice(0, maxRows).forEach((alarm) => {
            const src = alarm?.source || {};
            const connectionId = String(src?.connection_id || "");
            const tagName = String(src?.tag || "");
            const sourceText = showSource ? `${connectionId}:${tagName}`.trim() : tagName.trim();
            const areaText = String(alarm?.area || src?.area || "").trim();
            const baseDescText = getAlarmDisplayDescription(alarm);
            const activeTs = Number(alarm?.active_since_ms) || 0;
            const clearedTs = Number(alarm?.cleared_ts_ms) || 0;
            const activeText = activeTs ? formatAlarmTimeMs(activeTs) : "";
            const clearedText = clearedTs ? formatAlarmTimeMs(clearedTs) : "";
            const statusText = String(alarm?.last_event_type || (alarm?.active ? "active" : "return") || "").toUpperCase();
            const rawQuality = tagQualityCache.get(`${connectionId}.${tagName}`);
            const qualityText = rawQuality === 1 ? "GOOD" : rawQuality === 0 ? "BAD" : rawQuality == null ? "-" : String(rawQuality);

            const row = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
            row.className = "hmi-alarms-panel-row";
            if (alarm?.active && !alarm?.acked) row.classList.add("is-active-unacked");
            else if (alarm?.active && alarm?.acked) row.classList.add("is-active-acked");
            else row.classList.add("is-returned");
            if (rawQuality === 0) row.classList.add("is-bad-quality");

            const makeCell = (text) => {
              const cell = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
              cell.className = "hmi-alarms-panel-cell";
              cell.textContent = text;
              return cell;
            };
            row.appendChild(makeCell(activeText));
            row.appendChild(makeCell(clearedText));
            row.appendChild(makeCell(sourceText));
            row.appendChild(makeCell(areaText));
            row.appendChild(makeCell(baseDescText));
            row.appendChild(makeCell(statusText));
            row.appendChild(makeCell(qualityText));
            list.appendChild(row);
          });
        }

        panel.appendChild(list);
        fo.appendChild(panel);
        group.appendChild(fo);

        if (rotation) {
          group.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
        }

        hmiSvg.appendChild(group);
        renderedElements.push(group);
        renderedElementMeta.push({ el: group, index, type: "alarms-panel" });
        return;
      }

		  if (obj?.type === "polyline") {
		    const el = document.createElementNS(ns, "polyline");
		    const points = Array.isArray(obj.points) ? obj.points : [];
		    const attr = points.map((pt) => `${Number(pt?.x ?? 0)},${Number(pt?.y ?? 0)}`).join(" ");
	    el.setAttribute("points", attr);
	    el.setAttribute("fill", "none");
	    el.setAttribute("stroke", obj.stroke || "#ffffff");
	    el.setAttribute("stroke-width", obj.strokeWidth ?? 2);
	    el.setAttribute("vector-effect", "non-scaling-stroke");
	    hmiSvg.appendChild(el);
	    renderedElements.push(el);
	    renderedElementMeta.push({ el, index, type: "polyline" });
	    return;
	  }

	  if (obj?.type === "polygon") {
	    const el = document.createElementNS(ns, "polygon");
	    const points = Array.isArray(obj.points) ? obj.points : [];
	    const attr = points.map((pt) => `${Number(pt?.x ?? 0)},${Number(pt?.y ?? 0)}`).join(" ");
	    el.setAttribute("points", attr);
	    const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#3a3f4b");
	    el.setAttribute("fill", fillColor);
	    const baseStroke = obj.stroke || "#ffffff";
	    const strokeColor = baseStroke === "none" ? "none" : getAutomationColor(obj.strokeAutomation, baseStroke);
	    el.setAttribute("stroke", strokeColor);
	    el.setAttribute("stroke-width", obj.strokeWidth ?? 1);
	    el.setAttribute("vector-effect", "non-scaling-stroke");
	    hmiSvg.appendChild(el);
	    renderedElements.push(el);
	    renderedElementMeta.push({ el, index, type: "polygon" });
	    return;
	  }

				  if (obj?.type === "bar") {
				    const group = document.createElementNS(ns, "g");
				    const x = Number(obj.x ?? 0);
				    const y = Number(obj.y ?? 0);
				    const w = Number(obj.w ?? 120);
			    const h = Number(obj.h ?? 120);
		    const bg = obj.background ?? "transparent";
		    if (bg && bg !== "none") {
		      const bgRect = document.createElementNS(ns, "rect");
		      bgRect.setAttribute("x", x);
		      bgRect.setAttribute("y", y);
		      bgRect.setAttribute("width", w);
		      bgRect.setAttribute("height", h);
		      bgRect.setAttribute("fill", bg);
		      bgRect.setAttribute("stroke", "none");
		      group.appendChild(bgRect);
		    }

	    const min = resolveBarLimit(obj, "min");
	    const max = resolveBarLimit(obj, "max");
	    const range = max - min;
	    let value = min;
	    const bind = obj.bindValue || {};
	    const connectionId = String(bind.connection_id || "");
	    const tagName = String(bind.tag || "");
	    if (!isEditMode && connectionId && tagName) {
	      const raw = tagValueCache.get(`${connectionId}.${tagName}`);
	      const numeric = coerceTagNumber(raw);
	      if (numeric !== null) {
	        const multiplier = Number.isFinite(Number(bind.multiplier)) ? Number(bind.multiplier) : 1;
	        value = numeric * multiplier;
	      }
	    }
	    if (Number.isFinite(range) && range !== 0) {
	      value = Math.min(max, Math.max(min, value));
	    }
	    const ratio = Number.isFinite(range) && range !== 0 ? (value - min) / range : 0;
	    const clamped = Math.min(1, Math.max(0, ratio));
	    const orientation = obj.orientation === "horizontal" ? "horizontal" : "vertical";
		    const fill = obj.fill ?? "#46ff64";
		    if (fill && fill !== "none") {
		      const fillRect = document.createElementNS(ns, "rect");
		      if (orientation === "horizontal") {
		        const fillW = w * clamped;
		        fillRect.setAttribute("x", x);
		        fillRect.setAttribute("y", y);
		        fillRect.setAttribute("width", fillW);
		        fillRect.setAttribute("height", h);
		      } else {
		        const fillH = h * clamped;
		        fillRect.setAttribute("x", x);
		        fillRect.setAttribute("y", y + (h - fillH));
		        fillRect.setAttribute("width", w);
		        fillRect.setAttribute("height", fillH);
		      }
		      fillRect.setAttribute("fill", fill);
		      fillRect.setAttribute("stroke", "none");
		      group.appendChild(fillRect);
		    }

			    const border = obj.border || {};
				    if (border.enabled) {
			      const strokeWidth = Math.max(0, Number(border.width ?? 1));
			      if (strokeWidth > 0) {
			        const borderRect = document.createElementNS(ns, "rect");
			        borderRect.setAttribute("x", x);
			        borderRect.setAttribute("y", y);
			        borderRect.setAttribute("width", w);
			        borderRect.setAttribute("height", h);
			        borderRect.setAttribute("fill", "none");
			        borderRect.setAttribute("stroke", border.color || "#ffffff");
			        borderRect.setAttribute("stroke-width", strokeWidth);
			        borderRect.setAttribute("vector-effect", "non-scaling-stroke");
		        group.appendChild(borderRect);
		      }
			    }
			    if (obj.bevel && border.enabled && (border.color || "#ffffff") !== "none" && Number(border.width ?? 1) > 0) {
			      appendBevelPaths(group, x, y, w, h);
			    }
			    appendBarTicks(group, x, y, w, h, orientation, obj.ticks, border.color || "#ffffff");
			    const rotation = Number(obj.rotation ?? 0);
			    if (rotation) {
			      const cx = x + w / 2;
		      const cy = y + h / 2;
		      group.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
		    }
		    hmiSvg.appendChild(group);
		    renderedElements.push(group);
		    renderedElementMeta.push({ el: group, index, type: "bar" });
		    return;
		  }

	  if (obj?.type === "circle") {
	    if (obj.shadow) {
	      const shadow = document.createElementNS(ns, "circle");
	      shadow.setAttribute("cx", Number(obj.cx ?? 0) + 4);
      shadow.setAttribute("cy", Number(obj.cy ?? 0) + 4);
      shadow.setAttribute("r", obj.r ?? 40);
      shadow.setAttribute("fill", "#000000");
      shadow.setAttribute("fill-opacity", "0.5");
      shadow.setAttribute("stroke", "none");
      hmiSvg.appendChild(shadow);
    }
    const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", obj.cx ?? 0);
      circle.setAttribute("cy", obj.cy ?? 0);
      circle.setAttribute("r", obj.r ?? 40);
      const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#3a3f4b");
    circle.setAttribute("fill", fillColor);
    const baseStroke = obj.stroke || "#ffffff";
    const strokeColor = baseStroke === "none" ? "none" : getAutomationColor(obj.strokeAutomation, baseStroke);
    circle.setAttribute("stroke", strokeColor);
    circle.setAttribute("stroke-width", obj.strokeWidth ?? 1);
    hmiSvg.appendChild(circle);
      renderedElements.push(circle);
      renderedElementMeta.push({ el: circle, index, type: "circle" });
      return;
    }

    if (obj?.type === "line") {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", obj.x1 ?? 0);
      line.setAttribute("y1", obj.y1 ?? 0);
      line.setAttribute("x2", obj.x2 ?? 0);
      line.setAttribute("y2", obj.y2 ?? 0);
      const strokeColor = getAutomationColor(obj.strokeAutomation, obj.stroke || "#ffffff");
      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", obj.strokeWidth ?? 2);
      hmiSvg.appendChild(line);
      renderedElements.push(line);
      renderedElementMeta.push({ el: line, index, type: "line" });
      return;
    }

    if (obj?.type === "curve") {
      const x1 = Number(obj.x1 ?? 0);
      const y1 = Number(obj.y1 ?? 0);
      const x2 = Number(obj.x2 ?? 0);
      const y2 = Number(obj.y2 ?? 0);
      const cx = Number(obj.cx ?? ((x1 + x2) / 2));
      const cy = Number(obj.cy ?? ((y1 + y2) / 2));
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
      path.setAttribute("fill", "none");
      const strokeColor = getAutomationColor(obj.strokeAutomation, obj.stroke || "#ffffff");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", obj.strokeWidth ?? 2);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      hmiSvg.appendChild(path);
      renderedElements.push(path);
      renderedElementMeta.push({ el: path, index, type: "curve" });
      return;
    }

	    if (obj?.type === "button") {
      const group = document.createElementNS(ns, "g");
      const x = Number(obj.x ?? 0);
      const y = Number(obj.y ?? 0);
      const w = Number(obj.w ?? 160);
      const h = Number(obj.h ?? 48);
      const rx = Number(obj.rx ?? 8);
      if (obj.shadow) {
        const shadow = document.createElementNS(ns, "rect");
        shadow.setAttribute("x", x + 4);
        shadow.setAttribute("y", y + 4);
        shadow.setAttribute("width", w);
        shadow.setAttribute("height", h);
        shadow.setAttribute("rx", rx);
        shadow.setAttribute("fill", "#000000");
        shadow.setAttribute("fill-opacity", "0.5");
        shadow.setAttribute("stroke", "none");
        group.appendChild(shadow);
      }
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", w);
      rect.setAttribute("height", h);
      rect.setAttribute("rx", rx);
      const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#2b2f3a");
      const isWriteActive = !isEditMode
        && (obj.action?.type === "toggle-write" || obj.action?.type === "set-write")
        && getWriteActionActiveState(obj.action);
      rect.setAttribute("fill", fillColor);
      rect.setAttribute("stroke", obj.stroke || "#ffffff");
      rect.setAttribute("stroke-width", obj.strokeWidth ?? 1);
      group.appendChild(rect);

      if (isWriteActive) {
        const activeRing = document.createElementNS(ns, "rect");
        activeRing.setAttribute("x", x + 2);
        activeRing.setAttribute("y", y + 2);
        activeRing.setAttribute("width", Math.max(0, w - 4));
        activeRing.setAttribute("height", Math.max(0, h - 4));
        activeRing.setAttribute("rx", Math.max(0, rx - 2));
        activeRing.setAttribute("fill", "none");
        activeRing.setAttribute("stroke", "#4aa3ff");
        activeRing.setAttribute("stroke-width", "2");
        activeRing.setAttribute("vector-effect", "non-scaling-stroke");
        group.appendChild(activeRing);
      }

      if (obj.bevel) {
        const highlight = document.createElementNS(ns, "path");
        highlight.setAttribute("d", `M ${x + 1} ${y + h - 1} L ${x + 1} ${y + 1} L ${x + w - 1} ${y + 1}`);
        highlight.setAttribute("fill", "none");
        highlight.setAttribute("stroke", "#ffffff");
        highlight.setAttribute("stroke-opacity", "0.6");
        highlight.setAttribute("stroke-width", "3");
        highlight.setAttribute("stroke-linecap", "round");
        highlight.setAttribute("stroke-linejoin", "round");
        group.appendChild(highlight);

        const shade = document.createElementNS(ns, "path");
        shade.setAttribute("d", `M ${x + 1} ${y + h - 1} L ${x + w - 1} ${y + h - 1} L ${x + w - 1} ${y + 1}`);
        shade.setAttribute("fill", "none");
        shade.setAttribute("stroke", "#000000");
        shade.setAttribute("stroke-opacity", "0.6");
        shade.setAttribute("stroke-width", "3");
        shade.setAttribute("stroke-linecap", "round");
        shade.setAttribute("stroke-linejoin", "round");
        group.appendChild(shade);
      }

	      const label = document.createElementNS(ns, "text");
	      label.setAttribute("xml:space", "preserve");
	      label.style.whiteSpace = "pre";
	      const align = obj.align || "center";
	      const valign = obj.valign || "middle";
      let labelX = x + w / 2;
      if (align === "left") labelX = x + 8;
      if (align === "right") labelX = x + w - 8;
      const vPad = 8;
      let labelY = y + h / 2;
      if (valign === "top") labelY = y + vPad;
      if (valign === "bottom") labelY = y + h - vPad;
      label.setAttribute("x", labelX);
      label.setAttribute("y", labelY);
      const textColor = getAutomationColor(obj.textColorAutomation, obj.textColor || "#ffffff");
      label.setAttribute("fill", textColor);
      const fontSize = Number(obj.fontSize || 16);
      label.setAttribute("font-size", fontSize);
      label.setAttribute("font-weight", obj.bold ? "700" : "400");
      if (align === "center") label.setAttribute("text-anchor", "middle");
      if (align === "right") label.setAttribute("text-anchor", "end");
	      let labelText = decodeNbspEntities(obj.label || "Button");
	      if (obj.bindLabel && labelText.includes("{value}")) {
	        const connectionId = String(obj.bindLabel.connection_id || "");
	        const tag = String(obj.bindLabel.tag || "");
	        const key = `${connectionId}.${tag}`;
	        const boundValue = tagValueCache.get(key);
	        const formatted = (!isEditMode) ? formatBoundNumber(boundValue, obj.bindLabel) : null;
	        const replacement = formatted !== null ? formatted : getBindPlaceholder(obj.bindLabel);
	        labelText = labelText.replace(/\{value\}/g, replacement);
	      }
	      labelText = decodeNbspEntities(labelText);
	      const labelLines = splitMultiline(labelText);
	      if (labelLines.length > 1) {
	        const measured = measureTextBlock(labelText, fontSize, Boolean(obj.bold));
	        label.setAttribute("dominant-baseline", "hanging");
	        let yStart = y + vPad;
        if (valign === "middle") yStart = y + (h - measured.height) / 2;
        if (valign === "bottom") yStart = y + h - vPad - measured.height;
        applyMultilineSvgText(label, measured.lines, labelX, yStart, measured.lineHeight);
      } else {
        if (valign === "top") label.setAttribute("dominant-baseline", "hanging");
        if (valign === "middle") label.setAttribute("dominant-baseline", "middle");
        if (valign === "bottom") label.setAttribute("dominant-baseline", "text-after-edge");
        label.textContent = labelText;
      }
      group.appendChild(label);

      const rotation = Number(obj.rotation ?? 0);
      if (rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        group.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
      }

      hmiSvg.appendChild(group);
      renderedElements.push(group);
      renderedElementMeta.push({ el: group, index, type: "button" });
      return;
    }

    if (obj?.type === "viewport") {
      const group = document.createElementNS(ns, "g");
      const x = Number(obj.x ?? 0);
      const y = Number(obj.y ?? 0);
      const w = Number(obj.w ?? 320);
      const h = Number(obj.h ?? 200);
      const radius = Number(obj.rx ?? 0);
      const borderCfg = obj.border || {};
      const borderEnabled = Boolean(borderCfg.enabled);
      const borderColor = borderCfg.color || "#ffffff";
      const borderWidth = Number(borderCfg.width ?? 1);

      const viewportSvg = document.createElementNS(ns, "svg");
      viewportSvg.setAttribute("x", x);
      viewportSvg.setAttribute("y", y);
      viewportSvg.setAttribute("width", w);
      viewportSvg.setAttribute("height", h);
      viewportSvg.setAttribute("overflow", "hidden");
      group.appendChild(viewportSvg);

	      const frame = document.createElementNS(ns, "rect");
	      frame.setAttribute("x", x);
	      frame.setAttribute("y", y);
	      frame.setAttribute("width", w);
	      frame.setAttribute("height", h);
	      if (radius > 0) frame.setAttribute("rx", radius);
	      frame.setAttribute("fill", "none");
	      if (borderEnabled) {
	        frame.setAttribute("stroke", borderColor);
	        frame.setAttribute("stroke-width", borderWidth);
	      }
	      group.appendChild(frame);
	      if (obj.bevel && borderEnabled && borderColor !== "none" && borderWidth > 0) {
	        appendBevelPaths(group, x, y, w, h);
	      }

	      const contentGroup = document.createElementNS(ns, "g");
	      if (radius > 0) {
	        const defs = document.createElementNS(ns, "defs");
	        const clip = document.createElementNS(ns, "clipPath");
        const clipId = `viewport-inner-${index}`;
        clip.setAttribute("id", clipId);
        const clipRect = document.createElementNS(ns, "rect");
        clipRect.setAttribute("x", 0);
        clipRect.setAttribute("y", 0);
        clipRect.setAttribute("width", w);
        clipRect.setAttribute("height", h);
        clipRect.setAttribute("rx", radius);
        clip.appendChild(clipRect);
        defs.appendChild(clip);
        viewportSvg.appendChild(defs);
        contentGroup.setAttribute("clip-path", `url(#${clipId})`);
      }
      viewportSvg.appendChild(contentGroup);

      const targetId = obj.target || obj.screenId || obj.targetScreen || obj.targetId;
      if (targetId) {
        const child = screenCache.get(targetId);
        if (child) {
          const rawScaleMode = String(obj.scaleMode || "actual-size");
          const normalizedScaleMode = rawScaleMode
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/_/g, "-");
          const scaleMode = normalizedScaleMode;
          const childW = Number(child.width) || 1920;
          const childH = Number(child.height) || 1080;
          let scale = 1;
          if (scaleMode === "contain") {
            scale = Math.min(w / childW, h / childH);
          } else if (scaleMode === "fit-width") {
            scale = w / childW;
          } else if (scaleMode === "fit-height") {
            scale = h / childH;
          } else {
            scale = 1;
          }
          const contentW = childW * scale;
          const contentH = childH * scale;
          let offsetX = (w - contentW) / 2;
          let offsetY = (h - contentH) / 2;
          if (scaleMode === "actual-size") {
            if (childW > w) offsetX = 0;
            if (childH > h) offsetY = 0;
          }
          const positionedGroup = document.createElementNS(ns, "g");
          positionedGroup.setAttribute("transform", `translate(${offsetX} ${offsetY})`);
          contentGroup.appendChild(positionedGroup);
          const scaledGroup = document.createElementNS(ns, "g");
          scaledGroup.setAttribute("transform", `scale(${scale})`);
          positionedGroup.appendChild(scaledGroup);
          const bgRect = document.createElementNS(ns, "rect");
          bgRect.setAttribute("x", 0);
          bgRect.setAttribute("y", 0);
          bgRect.setAttribute("width", childW);
          bgRect.setAttribute("height", childH);
          bgRect.setAttribute("fill", child.background || "transparent");
          scaledGroup.appendChild(bgRect);
          child.objects?.forEach((childObj) => {
            renderObjectInto(scaledGroup, childObj);
          });
        } else {
          queueScreenLoad(targetId);
        }
      }

      const rotation = Number(obj.rotation ?? 0);
      if (rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        group.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
      }

      hmiSvg.appendChild(group);
      renderedElements.push(group);
      renderedElementMeta.push({ el: group, index, type: "viewport" });
      return;
    }

	    if (obj?.type === "text") {
	      const textEl = document.createElementNS(ns, "text");
	      textEl.setAttribute("xml:space", "preserve");
	      textEl.style.whiteSpace = "pre";
	      const x = Number(obj.x ?? 0);
	      const y = Number(obj.y ?? 0);
      textEl.setAttribute("x", x);
      textEl.setAttribute("y", y);
      const fillColor = getAutomationColor(obj.fillAutomation, obj.fill || "#ffffff");
      textEl.setAttribute("fill", fillColor);
      const fontSize = Number(obj.fontSize || 18);
      textEl.setAttribute("font-size", fontSize);
      textEl.setAttribute("font-weight", obj.bold ? "700" : "400");
    if (obj.align === "center") textEl.setAttribute("text-anchor", "middle");
    if (obj.align === "right") textEl.setAttribute("text-anchor", "end");
    const valign = obj.valign || "top";
    const rawText = obj.text || "";
    let displayText = rawText;
    if (obj.bindText && rawText.includes("{value}")) {
      const connectionId = String(obj.bindText.connection_id || "");
      const tag = String(obj.bindText.tag || "");
      const key = `${connectionId}.${tag}`;
      const boundValue = tagValueCache.get(key);
      const formatted = (!isEditMode) ? formatBoundNumber(boundValue, obj.bindText) : null;
      const replacement = formatted !== null ? formatted : getBindPlaceholder(obj.bindText);
      displayText = rawText.replace(/\{value\}/g, replacement);
    }
	    const decodedText = decodeNbspEntities(displayText);
	    const lines = splitMultiline(decodedText);
	    if (lines.length > 1) {
	      textEl.setAttribute("dominant-baseline", "hanging");
	      const measured = measureTextBlock(decodedText, fontSize, Boolean(obj.bold));
	      let yStart = y;
	      if (valign === "middle") yStart = y - measured.height / 2;
	      if (valign === "bottom") yStart = y - measured.height;
	      applyMultilineSvgText(textEl, measured.lines, x, yStart, measured.lineHeight);
	    } else {
	      if (valign === "middle") textEl.setAttribute("dominant-baseline", "middle");
	      if (valign === "bottom") textEl.setAttribute("dominant-baseline", "text-after-edge");
	      textEl.textContent = decodedText;
	    }
	    if (obj.background || obj.borderColor) {
	      const bgRect = document.createElementNS(ns, "rect");
	      const bounds = getObjectBounds({ ...obj, text: decodedText, bindText: null });
	      if (bounds) {
	        bgRect.setAttribute("x", bounds.x);
	        bgRect.setAttribute("y", bounds.y);
	        bgRect.setAttribute("width", bounds.width);
	        bgRect.setAttribute("height", bounds.height);
      } else {
        bgRect.setAttribute("x", x - TEXT_BG_PADDING_X);
        bgRect.setAttribute("y", y - TEXT_BG_PADDING_Y);
        bgRect.setAttribute("width", TEXT_BG_PADDING_X * 2);
        bgRect.setAttribute("height", TEXT_BG_PADDING_Y * 2);
      }
      bgRect.setAttribute("rx", obj.rx ?? 0);
      bgRect.setAttribute("fill", obj.background || "transparent");
      if (obj.borderColor) {
        bgRect.setAttribute("stroke", obj.borderColor);
        bgRect.setAttribute("stroke-width", obj.borderWidth ?? 1);
        bgRect.setAttribute("vector-effect", "non-scaling-stroke");
      }
      hmiSvg.appendChild(bgRect);
    }
      hmiSvg.appendChild(textEl);
      renderedElements.push(textEl);
      renderedElementMeta.push({ el: textEl, index, type: "text" });
    }
  });

  if (groupEditStack.length) {
    buildGroupEditMeta();
  }

  hotspotLayer = document.createElementNS(ns, "g");
  hotspotLayer.setAttribute("pointer-events", "none");
  hotspotLayer.setAttribute("data-layer", "hotzones");
  hmiSvg.appendChild(hotspotLayer);

  groupHotspotHoverRect = document.createElementNS(ns, "rect");
  groupHotspotHoverRect.setAttribute("fill", "none");
  groupHotspotHoverRect.setAttribute("stroke", "#7CFF7C");
  groupHotspotHoverRect.setAttribute("stroke-width", "1");
  groupHotspotHoverRect.setAttribute("vector-effect", "non-scaling-stroke");
  groupHotspotHoverRect.setAttribute("stroke-dasharray", "6 4");
  groupHotspotHoverRect.style.display = "none";
  hotspotLayer.appendChild(groupHotspotHoverRect);

  if (isEditMode) {
    const drawGroupOutlines = (list, offsetX, offsetY) => {
      if (!Array.isArray(list)) return;
      list.forEach((obj) => {
        if (!obj || obj.type !== "group") return;
        const bounds = getGroupHotspotBounds(obj);
        if (bounds && obj.action && obj.action.type) {
          const rectEl = document.createElementNS(ns, "rect");
          rectEl.setAttribute("x", bounds.x + offsetX);
          rectEl.setAttribute("y", bounds.y + offsetY);
          rectEl.setAttribute("width", bounds.width);
          rectEl.setAttribute("height", bounds.height);
          rectEl.setAttribute("fill", "none");
          rectEl.setAttribute("stroke", "#7CFF7C");
          rectEl.setAttribute("stroke-width", "1");
          rectEl.setAttribute("vector-effect", "non-scaling-stroke");
          rectEl.setAttribute("stroke-dasharray", "4 3");
          hotspotLayer.appendChild(rectEl);
        }
        drawGroupOutlines(obj.children, offsetX + Number(obj.x ?? 0), offsetY + Number(obj.y ?? 0));
      });
    };
    drawGroupOutlines(objects, 0, 0);
  }

  selectionLayer = document.createElementNS(ns, "g");
  selectionLayer.setAttribute("pointer-events", "none");
  selectionLayer.setAttribute("data-layer", "selection");
  hmiSvg.appendChild(selectionLayer);

  resizeLayer = document.createElementNS(ns, "g");
  resizeLayer.setAttribute("pointer-events", "all");
  resizeLayer.setAttribute("data-layer", "resize");
  hmiSvg.appendChild(resizeLayer);

  selectionBox = document.createElementNS(ns, "rect");
  selectionBox.setAttribute("fill", "rgba(74, 163, 255, 0.15)");
  selectionBox.setAttribute("stroke", "#4aa3ff");
  selectionBox.setAttribute("stroke-dasharray", "4 3");
  selectionBox.setAttribute("vector-effect", "non-scaling-stroke");
  selectionBox.style.display = "none";
  hmiSvg.appendChild(selectionBox);

  applyScale();
  updateSelectionOverlays();
  updatePropertiesPanel();
  wireNumberInputs();
  if (numberInputRestore?.input) {
    const { input, selectionStart, selectionEnd } = numberInputRestore;
    input.focus();
    if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
      try {
        input.setSelectionRange(selectionStart, selectionEnd);
      } catch {}
    }
  }
  } catch (error) {
    console.error("[renderScreen] failed:", error);
    setEditorStatusSafe(`Render failed: ${error instanceof Error ? error.message : String(error)}`);
    if (didClear) {
      hmiSvg.textContent = "";
      prevNodes.forEach((node) => hmiSvg.appendChild(node));
    }
    renderedElements = prevRenderedElements;
    renderedElementMeta = prevRenderedMeta;
  }
};

const syncEditorFromScreen = () => {
  if (!jsoncEditor || !currentScreenObj) return;
  jsoncEditor.value = JSON.stringify(currentScreenObj, null, 2);
  if (editorStatus) editorStatus.textContent = `Updated ${currentScreenFilename}.`;
};

const syncPropertiesFromScreen = () => {
  if (!currentScreenObj) return;
  const { width, height, background, border } = currentScreenObj;
  if (screenWidthInput) screenWidthInput.value = Number(width) || "";
  if (screenHeightInput) screenHeightInput.value = Number(height) || "";
  if (screenBgInput) screenBgInput.value = background || "#202533";
  if (screenBgTextInput) screenBgTextInput.value = background || "";
  const borderEnabled = Boolean(border?.enabled);
  if (screenBorderEnabledInput) screenBorderEnabledInput.checked = borderEnabled;
  if (screenBorderColorRow) screenBorderColorRow.classList.toggle("is-hidden", !borderEnabled);
  if (screenBorderWidthRow) screenBorderWidthRow.classList.toggle("is-hidden", !borderEnabled);
  if (screenBorderColorInput) screenBorderColorInput.value = border?.color || "#ffffff";
  if (screenBorderColorTextInput) screenBorderColorTextInput.value = border?.color || "";
  if (screenBorderWidthInput) screenBorderWidthInput.value = Number(border?.width ?? 1);
};

const renderIndicatorStatesEditor = (obj) => {
  if (!indicatorStatesList) return;
  if (!obj || obj.type !== "indicator") return;
  const states = Array.isArray(obj.states) ? obj.states : [];
  indicatorStatesList.textContent = "";
  if (!imageFilesCache.length && !imageFilesLoading) {
    loadImageFiles();
  }

  const commit = (index, patch) => {
    const next = states.map((s) => ({ ...(s || {}) }));
    if (!next[index]) next[index] = {};
    Object.assign(next[index], patch);
    updateIndicatorStates(next);
    renderIndicatorStatesEditor(getActiveObjects()?.[selectedIndices[0]]);
  };

  const removeAt = (index) => {
    const next = states.filter((_, idx) => idx !== index);
    updateIndicatorStates(next);
    renderIndicatorStatesEditor(getActiveObjects()?.[selectedIndices[0]]);
  };

  states.forEach((state, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "prop-group";

    const header = document.createElement("div");
    header.className = "prop-row prop-row-compact";
    const title = document.createElement("div");
    title.className = "prop-group-title";
    title.textContent = `State ${idx + 1}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "panel-btn danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeAt(idx));
    header.appendChild(title);
    header.appendChild(removeBtn);
    wrapper.appendChild(header);

    const valueRow = document.createElement("div");
    valueRow.className = "prop-row";
    const valueLabel = document.createElement("label");
    valueLabel.textContent = "Value / Threshold";
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.value = state?.value ?? "";
    valueInput.addEventListener("change", () => commit(idx, { value: valueInput.value }));
    valueRow.appendChild(valueLabel);
    valueRow.appendChild(valueInput);
    wrapper.appendChild(valueRow);

    const labelRow = document.createElement("div");
    labelRow.className = "prop-row";
    const labelLabel = document.createElement("label");
    labelLabel.textContent = "Label";
    const labelInput = document.createElement("textarea");
    labelInput.rows = 2;
    labelInput.value = state?.label ?? "";
    labelInput.addEventListener("change", () => commit(idx, { label: labelInput.value }));
    labelRow.appendChild(labelLabel);
    labelRow.appendChild(labelInput);
    wrapper.appendChild(labelRow);

    const colorRow = document.createElement("div");
    colorRow.className = "prop-row";
    const colorLabel = document.createElement("label");
    colorLabel.textContent = "Color";
    const inline = document.createElement("div");
    inline.className = "prop-inline";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    const colorValue = String(state?.color || "");
    colorInput.value = isHexColor(colorValue) ? colorValue : "#3a3f4b";
    colorInput.addEventListener("input", () => {
      commit(idx, { color: colorInput.value });
      colorText.value = colorInput.value;
    });
    const colorText = document.createElement("input");
    colorText.type = "text";
    colorText.placeholder = "#3a3f4b";
    colorText.value = colorValue;
    colorText.addEventListener("change", () => {
      const value = colorText.value.trim();
      if (!value) return;
      commit(idx, { color: value });
      if (isHexColor(value)) colorInput.value = value;
    });
    const swatchBtn = document.createElement("button");
    swatchBtn.type = "button";
    swatchBtn.className = "swatch-btn";
    swatchBtn.title = "Pick a swatch";
    swatchBtn.setAttribute("aria-label", "Pick a swatch");
    swatchBtn.textContent = "🎨";
    const swatches = document.createElement("div");
    swatches.className = "swatch-popover";
    swatches.setAttribute("aria-label", "Indicator state swatches");
    buildSwatches(swatches, (color) => {
      commit(idx, { color });
      colorText.value = color;
      if (isHexColor(color)) colorInput.value = color;
      closeSwatches();
    });
    swatchBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleSwatches(swatches);
    });
    inline.appendChild(colorInput);
    inline.appendChild(colorText);
    inline.appendChild(swatchBtn);
    inline.appendChild(swatches);
    colorRow.appendChild(colorLabel);
    colorRow.appendChild(inline);
    wrapper.appendChild(colorRow);

    const imageRow = document.createElement("div");
    imageRow.className = "prop-row";
    const imageLabel = document.createElement("label");
    imageLabel.textContent = "Image";
    const imageSelect = document.createElement("select");
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "None";
    imageSelect.appendChild(emptyOpt);
    imageFilesCache.forEach((file) => {
      const opt = document.createElement("option");
      opt.value = file;
      opt.textContent = file;
      imageSelect.appendChild(opt);
    });
    const imageValue = String(state?.image || "");
    if (imageValue) imageSelect.value = imageValue;
    imageSelect.addEventListener("change", () => commit(idx, { image: imageSelect.value }));
    imageRow.appendChild(imageLabel);
    imageRow.appendChild(imageSelect);
    wrapper.appendChild(imageRow);

    indicatorStatesList.appendChild(wrapper);
  });
};

const syncPropertiesFromSelection = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj) return;
  if (obj.type === "group") {
    setInputValueSafe(groupXInput, Number(obj.x ?? 0));
    setInputValueSafe(groupYInput, Number(obj.y ?? 0));
    setInputValueSafe(groupWInput, Number(obj.w ?? 0));
    setInputValueSafe(groupHInput, Number(obj.h ?? 0));

    refreshViewportIdOptions();
    refreshGroupActionScreenOptions();

    const actionType = String(obj.action?.type || "");
    if (groupActionTypeSelect) setSelectValueSafe(groupActionTypeSelect, actionType);
    setGroupActionRows(actionType);

    if (groupActionViewportIdSelect) {
      setSelectValueSafe(groupActionViewportIdSelect, String(obj.action?.viewportId || ""));
    }
    if (groupActionScreenIdSelect) {
      setSelectValueSafe(groupActionScreenIdSelect, String(obj.action?.screenId || ""));
    }
    return;
  }
  if (obj.type === "text") {
    const bind = obj.bindText || {};
    if (textValueInput) textValueInput.value = obj.text || "";
    if (textFontSizeInput) textFontSizeInput.value = Number(obj.fontSize) || 18;
    if (textBoldInput) textBoldInput.checked = Boolean(obj.bold);
    if (textFillInput) textFillInput.value = obj.fill || "#ffffff";
    if (textFillTextInput) textFillTextInput.value = obj.fill || "";
    if (textAlignSelect) textAlignSelect.value = obj.align || "left";
    if (textValignSelect) textValignSelect.value = obj.valign || "top";
    if (textBgInput) textBgInput.value = obj.background || "#000000";
    if (textBgTextInput) textBgTextInput.value = obj.background || "";
    if (textBorderColorInput) textBorderColorInput.value = obj.borderColor || "#000000";
    if (textBorderColorTextInput) textBorderColorTextInput.value = obj.borderColor || "";
    if (textRadiusInput) textRadiusInput.value = Number(obj.rx ?? 0);
    setInputValueSafe(textBindConnectionInput, bind.connection_id || "");
    if (textBindTagSelect) {
      const connectionId = String(bind.connection_id || "");
      const tagName = String(bind.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(textBindTagSelect, combined);
    }
    const digitsValue = Number.isFinite(Number(bind.digits)) ? Number(bind.digits) : "";
    setInputValueSafe(textBindDigitsInput, digitsValue);
    const decimalsValue = Number.isFinite(Number(bind.decimals)) ? Number(bind.decimals) : 0;
    setInputValueSafe(textBindDecimalsInput, decimalsValue);
    const multiplierValue = Number.isFinite(Number(bind.multiplier)) ? Number(bind.multiplier) : 1;
    setInputValueSafe(textBindMultiplierInput, multiplierValue);

    const automation = obj.fillAutomation || {};
    const autoEnabled = Boolean(automation.enabled);
    if (textAutoEnabledInput) textAutoEnabledInput.checked = autoEnabled;
    if (textAutoInvertInput) textAutoInvertInput.checked = Boolean(automation.invert);
    if (textAutoFields) {
      textAutoFields.classList.toggle("is-hidden", !autoEnabled);
      textAutoFields.hidden = !autoEnabled;
    }
    const textAutoMode = automation.mode === "equals" ? "equals" : "threshold";
    if (textAutoModeSelect) textAutoModeSelect.value = textAutoMode;
    if (textAutoThresholdRow && textAutoMatchRow) {
      const showMatch = textAutoMode === "equals";
      textAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      textAutoThresholdRow.hidden = showMatch;
      textAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      textAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(textAutoConnectionInput, automation.connection_id || "");
    if (textAutoTagSelect) {
      const connectionId = String(automation.connection_id || "");
      const tagName = String(automation.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(textAutoTagSelect, combined);
    }
    if (textAutoThresholdInput) setInputValueSafe(textAutoThresholdInput, automation.threshold ?? "");
    if (textAutoMatchInput) setInputValueSafe(textAutoMatchInput, automation.match ?? "");
    if (textAutoOnInput) textAutoOnInput.value = automation.onColor || (obj.fill || "#ffffff");
    if (textAutoOnTextInput) setInputValueSafe(textAutoOnTextInput, automation.onColor || "");
    if (textAutoOffInput) textAutoOffInput.value = automation.offColor || (obj.fill || "#ffffff");
    if (textAutoOffTextInput) setInputValueSafe(textAutoOffTextInput, automation.offColor || "");
  }
	  if (obj.type === "button") {
	    if (buttonLabelInput) buttonLabelInput.value = obj.label || "";
    const labelBind = obj.bindLabel || {};
    setInputValueSafe(buttonLabelBindConnectionInput, labelBind.connection_id || "");
    if (buttonLabelBindTagSelect) {
      const connectionId = String(labelBind.connection_id || "");
      const tagName = String(labelBind.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(buttonLabelBindTagSelect, combined);
    }
    const labelDigitsValue = Number.isFinite(Number(labelBind.digits)) ? Number(labelBind.digits) : "";
    setInputValueSafe(buttonLabelBindDigitsInput, labelDigitsValue);
    const labelDecimalsValue = Number.isFinite(Number(labelBind.decimals)) ? Number(labelBind.decimals) : 0;
    setInputValueSafe(buttonLabelBindDecimalsInput, labelDecimalsValue);
    const labelMultiplierValue = Number.isFinite(Number(labelBind.multiplier)) ? Number(labelBind.multiplier) : 1;
    setInputValueSafe(buttonLabelBindMultiplierInput, labelMultiplierValue);
    if (buttonWidthInput) buttonWidthInput.value = Number(obj.w) || 160;
    if (buttonXInput) buttonXInput.value = Number(obj.x) || 0;
    if (buttonYInput) buttonYInput.value = Number(obj.y) || 0;
    if (buttonHeightInput) buttonHeightInput.value = Number(obj.h) || 48;
    if (buttonRadiusInput) buttonRadiusInput.value = Number(obj.rx ?? 0);
    if (buttonShadowInput) buttonShadowInput.checked = Boolean(obj.shadow);
    if (buttonBevelInput) buttonBevelInput.checked = Boolean(obj.bevel);
	    if (buttonFillInput) buttonFillInput.value = obj.fill || "#2b2f3a";
	    if (buttonFillTextInput) buttonFillTextInput.value = obj.fill || "";
	    if (buttonTextColorInput) buttonTextColorInput.value = obj.textColor || "#ffffff";
	    if (buttonTextColorTextInput) buttonTextColorTextInput.value = obj.textColor || "";
	    if (buttonFontSizeInput) buttonFontSizeInput.value = Number(obj.fontSize ?? 16);
	    if (buttonBoldInput) buttonBoldInput.checked = Boolean(obj.bold);
	    if (buttonStrokeInput) buttonStrokeInput.value = obj.stroke || "#ffffff";
	    if (buttonStrokeTextInput) buttonStrokeTextInput.value = obj.stroke || "";
    if (buttonBorderEnabledInput) {
      const hasStroke = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
      buttonBorderEnabledInput.checked = Boolean(hasStroke);
      if (buttonStrokeRow) buttonStrokeRow.classList.toggle("is-hidden", !hasStroke);
    }
    if (buttonAlignSelect) buttonAlignSelect.value = obj.align || "center";
    if (buttonValignSelect) buttonValignSelect.value = obj.valign || "middle";
    if (buttonTargetSelect) buttonTargetSelect.value = obj.action?.screenId || "";
    if (buttonActionSelect) buttonActionSelect.value = obj.action?.type || "navigate";
    refreshViewportIdOptions();
    if (buttonViewportSelect) buttonViewportSelect.value = obj.action?.viewportId || "";
    updateButtonActionUI(obj.action?.type || "navigate");

    const writeAction = (obj.action?.type === "momentary-write" || obj.action?.type === "toggle-write" || obj.action?.type === "set-write" || obj.action?.type === "prompt-write") ? obj.action : null;
    if (buttonWriteConnectionInput) setInputValueSafe(buttonWriteConnectionInput, writeAction?.connection_id || "");
    if (buttonWriteTagSelect) {
      const connectionId = String(writeAction?.connection_id || "");
      const tagName = String(writeAction?.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(buttonWriteTagSelect, combined);
    }
    if (buttonWriteOnValueInput) setInputValueSafe(buttonWriteOnValueInput, writeAction?.onValue ?? "1");
    if (buttonWriteOffValueInput) setInputValueSafe(buttonWriteOffValueInput, writeAction?.offValue ?? "0");
    if (buttonPromptDefaultInput) setInputValueSafe(buttonPromptDefaultInput, writeAction?.defaultValue ?? "");
    if (buttonPromptMinInput) setInputValueSafe(buttonPromptMinInput, writeAction?.min ?? "");
    if (buttonPromptMaxInput) setInputValueSafe(buttonPromptMaxInput, writeAction?.max ?? "");
    if (buttonPromptStepInput) setInputValueSafe(buttonPromptStepInput, writeAction?.step ?? "");

    const fillAuto = obj.fillAutomation || {};
    const fillEnabled = Boolean(fillAuto.enabled);
    if (buttonFillAutoEnabledInput) buttonFillAutoEnabledInput.checked = fillEnabled;
    if (buttonFillAutoInvertInput) buttonFillAutoInvertInput.checked = Boolean(fillAuto.invert);
    if (buttonFillAutoFields) {
      buttonFillAutoFields.classList.toggle("is-hidden", !fillEnabled);
      buttonFillAutoFields.hidden = !fillEnabled;
    }
    const buttonFillMode = fillAuto.mode === "equals" ? "equals" : "threshold";
    if (buttonFillAutoModeSelect) buttonFillAutoModeSelect.value = buttonFillMode;
    if (buttonFillAutoThresholdRow && buttonFillAutoMatchRow) {
      const showMatch = buttonFillMode === "equals";
      buttonFillAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      buttonFillAutoThresholdRow.hidden = showMatch;
      buttonFillAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      buttonFillAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(buttonFillAutoConnectionInput, fillAuto.connection_id || "");
    if (buttonFillAutoTagSelect) {
      const connectionId = String(fillAuto.connection_id || "");
      const tagName = String(fillAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(buttonFillAutoTagSelect, combined);
    }
    if (buttonFillAutoThresholdInput) setInputValueSafe(buttonFillAutoThresholdInput, fillAuto.threshold ?? "");
    if (buttonFillAutoMatchInput) setInputValueSafe(buttonFillAutoMatchInput, fillAuto.match ?? "");
    if (buttonFillAutoOnInput) buttonFillAutoOnInput.value = fillAuto.onColor || (obj.fill || "#2b2f3a");
    if (buttonFillAutoOnTextInput) setInputValueSafe(buttonFillAutoOnTextInput, fillAuto.onColor || "");
    if (buttonFillAutoOffInput) buttonFillAutoOffInput.value = fillAuto.offColor || (obj.fill || "#2b2f3a");
    if (buttonFillAutoOffTextInput) setInputValueSafe(buttonFillAutoOffTextInput, fillAuto.offColor || "");

    const textAuto = obj.textColorAutomation || {};
    const textEnabled = Boolean(textAuto.enabled);
    if (buttonTextAutoEnabledInput) buttonTextAutoEnabledInput.checked = textEnabled;
    if (buttonTextAutoInvertInput) buttonTextAutoInvertInput.checked = Boolean(textAuto.invert);
    if (buttonTextAutoFields) {
      buttonTextAutoFields.classList.toggle("is-hidden", !textEnabled);
      buttonTextAutoFields.hidden = !textEnabled;
    }
    const buttonTextMode = textAuto.mode === "equals" ? "equals" : "threshold";
    if (buttonTextAutoModeSelect) buttonTextAutoModeSelect.value = buttonTextMode;
    if (buttonTextAutoThresholdRow && buttonTextAutoMatchRow) {
      const showMatch = buttonTextMode === "equals";
      buttonTextAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      buttonTextAutoThresholdRow.hidden = showMatch;
      buttonTextAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      buttonTextAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(buttonTextAutoConnectionInput, textAuto.connection_id || "");
    if (buttonTextAutoTagSelect) {
      const connectionId = String(textAuto.connection_id || "");
      const tagName = String(textAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(buttonTextAutoTagSelect, combined);
    }
    if (buttonTextAutoThresholdInput) setInputValueSafe(buttonTextAutoThresholdInput, textAuto.threshold ?? "");
    if (buttonTextAutoMatchInput) setInputValueSafe(buttonTextAutoMatchInput, textAuto.match ?? "");
    if (buttonTextAutoOnInput) buttonTextAutoOnInput.value = textAuto.onColor || (obj.textColor || "#ffffff");
    if (buttonTextAutoOnTextInput) setInputValueSafe(buttonTextAutoOnTextInput, textAuto.onColor || "");
    if (buttonTextAutoOffInput) buttonTextAutoOffInput.value = textAuto.offColor || (obj.textColor || "#ffffff");
    if (buttonTextAutoOffTextInput) setInputValueSafe(buttonTextAutoOffTextInput, textAuto.offColor || "");
  }
  if (obj.type === "number-input") {
    const bind = obj.bindValue || {};
    setInputValueSafe(numberInputConnectionInput, bind.connection_id || "");
    if (numberInputTagSelect) {
      const connectionId = String(bind.connection_id || "");
      const tagName = String(bind.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(numberInputTagSelect, combined);
    }
    const digitsValue = Number.isFinite(Number(bind.digits)) ? Number(bind.digits) : 7;
    setInputValueSafe(numberInputDigitsInput, digitsValue);
    const decimalsValue = Number.isFinite(Number(bind.decimals)) ? Number(bind.decimals) : 0;
    setInputValueSafe(numberInputDecimalsInput, decimalsValue);
    const multiplierValue = Number.isFinite(Number(bind.multiplier)) ? Number(bind.multiplier) : 1;
    setInputValueSafe(numberInputMultiplierInput, multiplierValue);
    setInputValueSafe(numberInputXInput, Number(obj.x) || 0);
    setInputValueSafe(numberInputYInput, Number(obj.y) || 0);
    if (numberInputWidthInput) numberInputWidthInput.value = Number(obj.w) || 140;
    if (numberInputHeightInput) numberInputHeightInput.value = Number(obj.h) || 36;
    setInputValueSafe(numberInputRadiusInput, Number(obj.rx ?? 6));

    const fillValue = String(obj.fill || "#2b2f3a");
    if (numberInputFillInput) numberInputFillInput.value = isHexColor(fillValue) ? fillValue : "#2b2f3a";
    setInputValueSafe(numberInputFillTextInput, fillValue);

    const textColorValue = String(obj.textColor || "#ffffff");
    if (numberInputTextColorInput) numberInputTextColorInput.value = isHexColor(textColorValue) ? textColorValue : "#ffffff";
    setInputValueSafe(numberInputTextColorTextInput, textColorValue);

    setInputValueSafe(numberInputFontSizeInput, Number(obj.fontSize ?? 16));
    if (numberInputBoldInput) numberInputBoldInput.checked = Boolean(obj.bold);

    const hasStroke = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
    if (numberInputBorderEnabledInput) numberInputBorderEnabledInput.checked = Boolean(hasStroke);
    if (numberInputBevelInput) numberInputBevelInput.checked = Boolean(obj.bevel);
    if (numberInputBevelRow) {
      numberInputBevelRow.classList.toggle("is-hidden", !hasStroke);
      numberInputBevelRow.hidden = !hasStroke;
    }
    if (numberInputStrokeRow) {
      numberInputStrokeRow.classList.toggle("is-hidden", !hasStroke);
      numberInputStrokeRow.hidden = !hasStroke;
    }
    if (numberInputStrokeWidthRow) {
      numberInputStrokeWidthRow.classList.toggle("is-hidden", !hasStroke);
      numberInputStrokeWidthRow.hidden = !hasStroke;
    }
    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : String(obj.stroke);
    if (numberInputStrokeInput) numberInputStrokeInput.value = isHexColor(strokeValue) ? strokeValue : "#ffffff";
    setInputValueSafe(numberInputStrokeTextInput, strokeValue);
    setInputValueSafe(numberInputStrokeWidthInput, Number(obj.strokeWidth ?? 1));
  }
  if (obj.type === "indicator") {
    setInputValueSafe(indicatorXInput, Number(obj.x) || 0);
    setInputValueSafe(indicatorYInput, Number(obj.y) || 0);
    setInputValueSafe(indicatorWInput, Number(obj.w) || 160);
    setInputValueSafe(indicatorHInput, Number(obj.h) || 64);
    setInputValueSafe(indicatorRadiusInput, Number(obj.rx ?? 8));
    const backgroundEnabled = obj.backgroundEnabled !== false;
    if (indicatorBackgroundEnabledInput) indicatorBackgroundEnabledInput.checked = backgroundEnabled;
    if (indicatorFillRow) {
      indicatorFillRow.classList.toggle("is-hidden", !backgroundEnabled);
      indicatorFillRow.hidden = !backgroundEnabled;
    }
    if (indicatorShadowInput) {
      indicatorShadowInput.checked = backgroundEnabled && Boolean(obj.shadow);
      indicatorShadowInput.disabled = !backgroundEnabled;
    }

    const fillValue = String(obj.fill || "#3a3f4b");
    if (indicatorFillInput) indicatorFillInput.value = isHexColor(fillValue) ? fillValue : "#3a3f4b";
    setInputValueSafe(indicatorFillTextInput, fillValue);

    const textColorValue = String(obj.textColor || "#ffffff");
    if (indicatorTextColorInput) indicatorTextColorInput.value = isHexColor(textColorValue) ? textColorValue : "#ffffff";
    setInputValueSafe(indicatorTextColorTextInput, textColorValue);

    setInputValueSafe(indicatorFontSizeInput, Number(obj.fontSize ?? 16));
    if (indicatorBoldInput) indicatorBoldInput.checked = Boolean(obj.bold);

    const hasStroke = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
    if (indicatorBorderEnabledInput) indicatorBorderEnabledInput.checked = Boolean(hasStroke);
    if (indicatorBevelInput) indicatorBevelInput.checked = Boolean(obj.bevel);
    if (indicatorBevelRow) {
      indicatorBevelRow.classList.toggle("is-hidden", !hasStroke);
      indicatorBevelRow.hidden = !hasStroke;
    }
    if (indicatorStrokeRow) {
      indicatorStrokeRow.classList.toggle("is-hidden", !hasStroke);
      indicatorStrokeRow.hidden = !hasStroke;
    }
    if (indicatorStrokeWidthRow) {
      indicatorStrokeWidthRow.classList.toggle("is-hidden", !hasStroke);
      indicatorStrokeWidthRow.hidden = !hasStroke;
    }
    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : String(obj.stroke);
    if (indicatorStrokeInput) indicatorStrokeInput.value = isHexColor(strokeValue) ? strokeValue : "#ffffff";
    setInputValueSafe(indicatorStrokeTextInput, strokeValue);
    setInputValueSafe(indicatorStrokeWidthInput, Number(obj.strokeWidth ?? 1));

    const bind = obj.bindValue || {};
    setInputValueSafe(indicatorConnectionInput, bind.connection_id || "");
    if (indicatorTagSelect) {
      const connectionId = String(bind.connection_id || "");
      const tagName = String(bind.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(indicatorTagSelect, combined);
    }
    if (indicatorStateModeSelect) indicatorStateModeSelect.value = obj.stateMode === "threshold" ? "threshold" : "equals";
    if (indicatorLabelOverlayInput) indicatorLabelOverlayInput.checked = Boolean(obj.labelOverlay);
    if (indicatorLabelValignSelect) indicatorLabelValignSelect.value = obj.labelValign || "middle";
    renderIndicatorStatesEditor(obj);
  }
  if (obj.type === "viewport") {
    if (viewportIdInput) viewportIdInput.value = obj.id || "";
    if (viewportXInput) viewportXInput.value = Number(obj.x) || 0;
    if (viewportYInput) viewportYInput.value = Number(obj.y) || 0;
    if (viewportWInput) viewportWInput.value = Number(obj.w) || 320;
    if (viewportHInput) viewportHInput.value = Number(obj.h) || 200;
    if (viewportRadiusInput) viewportRadiusInput.value = Number(obj.rx ?? 0);
    if (viewportTargetSelect) viewportTargetSelect.value = obj.target || "";
    if (viewportScaleModeSelect) viewportScaleModeSelect.value = obj.scaleMode || "actual-size";
    const borderCfg = obj.border || {};
    const borderEnabled = Boolean(borderCfg.enabled);
    if (viewportBorderEnabledInput) viewportBorderEnabledInput.checked = borderEnabled;
    if (viewportBorderColorRow) viewportBorderColorRow.classList.toggle("is-hidden", !borderEnabled);
    if (viewportBorderWidthRow) viewportBorderWidthRow.classList.toggle("is-hidden", !borderEnabled);
    if (viewportBevelInput) viewportBevelInput.checked = Boolean(obj.bevel);
    if (viewportBevelRow) {
      viewportBevelRow.classList.toggle("is-hidden", !borderEnabled);
      viewportBevelRow.hidden = !borderEnabled;
    }
    if (viewportBorderColorInput) viewportBorderColorInput.value = borderCfg.color || "#ffffff";
    if (viewportBorderColorTextInput) viewportBorderColorTextInput.value = borderCfg.color || "";
    if (viewportBorderWidthInput) viewportBorderWidthInput.value = Number(borderCfg.width ?? 1);
  }
  if (obj.type === "rect" || obj.type === "alarms-panel") {
    if (rectPropsTitle) rectPropsTitle.textContent = obj.type === "alarms-panel" ? "Alarms Panel" : "Rectangle";
    if (alarmsPanelPropsFields) {
      const show = obj.type === "alarms-panel";
      alarmsPanelPropsFields.classList.toggle("is-hidden", !show);
      alarmsPanelPropsFields.hidden = !show;
    }
    if (rectXInput) rectXInput.value = Number(obj.x) || 0;
    if (rectYInput) rectYInput.value = Number(obj.y) || 0;
    if (rectWInput) rectWInput.value = Number(obj.w) || 120;
    if (rectHInput) rectHInput.value = Number(obj.h) || 80;
    if (rectRadiusInput) rectRadiusInput.value = Number(obj.rx ?? 0);
    if (rectShadowInput) rectShadowInput.checked = Boolean(obj.shadow);
    if (obj.type === "alarms-panel") {
      if (alarmsPanelMaxRowsInput) setInputValueSafe(alarmsPanelMaxRowsInput, Number(obj.maxRows ?? 8));
      if (alarmsPanelOnlyUnackedInput) alarmsPanelOnlyUnackedInput.checked = Boolean(obj.onlyUnacked);
      if (alarmsPanelShowSourceInput) alarmsPanelShowSourceInput.checked = obj.showSource !== false;
      if (alarmsPanelFontSizeInput) setInputValueSafe(alarmsPanelFontSizeInput, Number(obj.fontSize ?? 14));

      const setPanelColor = (colorInput, textInput, value, fallback) => {
        const v = String(value || fallback || "").trim();
        if (colorInput) colorInput.value = isHexColor(v) ? v : String(fallback || "#000000");
        if (textInput) setInputValueSafe(textInput, value || "");
      };
      setPanelColor(alarmsPanelHeaderBgInput, alarmsPanelHeaderBgTextInput, obj.headerBg, "#000000");
      setPanelColor(alarmsPanelHeaderTextInput, alarmsPanelHeaderTextTextInput, obj.headerText, "#ffffff");
      setPanelColor(alarmsPanelRowBgNormalInput, alarmsPanelRowBgNormalTextInput, obj.rowBg, "#ffffff");
      setPanelColor(alarmsPanelRowBgActiveUnackedInput, alarmsPanelRowBgActiveUnackedTextInput, obj.rowBgActiveUnacked, "#ffcccc");
      setPanelColor(alarmsPanelRowBgActiveAckedInput, alarmsPanelRowBgActiveAckedTextInput, obj.rowBgActiveAcked, "#ffe3a3");
      setPanelColor(alarmsPanelRowBgReturnedInput, alarmsPanelRowBgReturnedTextInput, obj.rowBgReturned, "#e9ecef");
      setPanelColor(alarmsPanelRowBgBadQualityInput, alarmsPanelRowBgBadQualityTextInput, obj.rowBgBadQuality, "#ffd1ea");
      setPanelColor(alarmsPanelRowTextNormalInput, alarmsPanelRowTextNormalTextInput, obj.rowText, "#000000");
      setPanelColor(alarmsPanelRowTextActiveUnackedInput, alarmsPanelRowTextActiveUnackedTextInput, obj.rowTextActiveUnacked, "#000000");
      setPanelColor(alarmsPanelRowTextActiveAckedInput, alarmsPanelRowTextActiveAckedTextInput, obj.rowTextActiveAcked, "#000000");
      setPanelColor(alarmsPanelRowTextReturnedInput, alarmsPanelRowTextReturnedTextInput, obj.rowTextReturned, "#000000");
      setPanelColor(alarmsPanelRowTextBadQualityInput, alarmsPanelRowTextBadQualityTextInput, obj.rowTextBadQuality, "#000000");
      setPanelColor(alarmsPanelStripeActiveUnackedInput, alarmsPanelStripeActiveUnackedTextInput, obj.stripeActiveUnacked, "#dc2626");
      setPanelColor(alarmsPanelStripeActiveAckedInput, alarmsPanelStripeActiveAckedTextInput, obj.stripeActiveAcked, "#d97706");
      setPanelColor(alarmsPanelStripeReturnedInput, alarmsPanelStripeReturnedTextInput, obj.stripeReturned, "#6b7280");
      setPanelColor(alarmsPanelStripeBadQualityInput, alarmsPanelStripeBadQualityTextInput, obj.stripeBadQuality, "#be185d");
    }
    if (rectBorderEnabledInput) {
      const hasStroke = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
      rectBorderEnabledInput.checked = Boolean(hasStroke);
      if (rectBevelInput) rectBevelInput.checked = Boolean(obj.bevel);
      if (rectBevelRow) {
        rectBevelRow.classList.toggle("is-hidden", !hasStroke);
        rectBevelRow.hidden = !hasStroke;
      }
      if (rectStrokeRow) rectStrokeRow.classList.toggle("is-hidden", !hasStroke);
      if (rectStrokeWidthRow) rectStrokeWidthRow.classList.toggle("is-hidden", !hasStroke);
      if (rectStrokeAutoHeader) rectStrokeAutoHeader.classList.toggle("is-hidden", !hasStroke);
      if (rectStrokeAutoFields && !hasStroke) {
        rectStrokeAutoFields.classList.add("is-hidden");
        rectStrokeAutoFields.hidden = true;
      }
    }
    if (rectFillInput) rectFillInput.value = obj.fill || "#3a3f4b";
    if (rectFillTextInput) rectFillTextInput.value = obj.fill || "";
    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
    if (rectStrokeInput) rectStrokeInput.value = strokeValue;
    if (rectStrokeTextInput) rectStrokeTextInput.value = strokeValue;
    if (rectStrokeWidthInput) rectStrokeWidthInput.value = Number(obj.strokeWidth ?? 1);

    const fillAuto = obj.fillAutomation || {};
    const fillEnabled = Boolean(fillAuto.enabled);
    if (rectFillAutoEnabledInput) rectFillAutoEnabledInput.checked = fillEnabled;
    if (rectFillAutoInvertInput) rectFillAutoInvertInput.checked = Boolean(fillAuto.invert);
    if (rectFillAutoFields) {
      rectFillAutoFields.classList.toggle("is-hidden", !fillEnabled);
      rectFillAutoFields.hidden = !fillEnabled;
    }
    const rectFillMode = fillAuto.mode === "equals" ? "equals" : "threshold";
    if (rectFillAutoModeSelect) rectFillAutoModeSelect.value = rectFillMode;
    if (rectFillAutoThresholdRow && rectFillAutoMatchRow) {
      const showMatch = rectFillMode === "equals";
      rectFillAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      rectFillAutoThresholdRow.hidden = showMatch;
      rectFillAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      rectFillAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(rectFillAutoConnectionInput, fillAuto.connection_id || "");
    if (rectFillAutoTagSelect) {
      const connectionId = String(fillAuto.connection_id || "");
      const tagName = String(fillAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(rectFillAutoTagSelect, combined);
    }
    if (rectFillAutoThresholdInput) setInputValueSafe(rectFillAutoThresholdInput, fillAuto.threshold ?? "");
    if (rectFillAutoMatchInput) setInputValueSafe(rectFillAutoMatchInput, fillAuto.match ?? "");
    if (rectFillAutoOnInput) rectFillAutoOnInput.value = fillAuto.onColor || (obj.fill || "#3a3f4b");
    if (rectFillAutoOnTextInput) setInputValueSafe(rectFillAutoOnTextInput, fillAuto.onColor || "");
    if (rectFillAutoOffInput) rectFillAutoOffInput.value = fillAuto.offColor || (obj.fill || "#3a3f4b");
    if (rectFillAutoOffTextInput) setInputValueSafe(rectFillAutoOffTextInput, fillAuto.offColor || "");

    const strokeAuto = obj.strokeAutomation || {};
    const strokeEnabled = Boolean(strokeAuto.enabled);
    const strokePresent = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
    if (rectStrokeAutoEnabledInput) rectStrokeAutoEnabledInput.checked = strokeEnabled;
    if (rectStrokeAutoInvertInput) rectStrokeAutoInvertInput.checked = Boolean(strokeAuto.invert);
    if (rectStrokeAutoFields) {
      const showFields = strokePresent && strokeEnabled;
      rectStrokeAutoFields.classList.toggle("is-hidden", !showFields);
      rectStrokeAutoFields.hidden = !showFields;
    }
    const rectStrokeMode = strokeAuto.mode === "equals" ? "equals" : "threshold";
    if (rectStrokeAutoModeSelect) rectStrokeAutoModeSelect.value = rectStrokeMode;
    if (rectStrokeAutoThresholdRow && rectStrokeAutoMatchRow) {
      const showMatch = rectStrokeMode === "equals";
      rectStrokeAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      rectStrokeAutoThresholdRow.hidden = showMatch;
      rectStrokeAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      rectStrokeAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(rectStrokeAutoConnectionInput, strokeAuto.connection_id || "");
    if (rectStrokeAutoTagSelect) {
      const connectionId = String(strokeAuto.connection_id || "");
      const tagName = String(strokeAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(rectStrokeAutoTagSelect, combined);
    }
    if (rectStrokeAutoThresholdInput) setInputValueSafe(rectStrokeAutoThresholdInput, strokeAuto.threshold ?? "");
    if (rectStrokeAutoMatchInput) setInputValueSafe(rectStrokeAutoMatchInput, strokeAuto.match ?? "");
    if (rectStrokeAutoOnInput) rectStrokeAutoOnInput.value = strokeAuto.onColor || strokeValue;
    if (rectStrokeAutoOnTextInput) setInputValueSafe(rectStrokeAutoOnTextInput, strokeAuto.onColor || "");
    if (rectStrokeAutoOffInput) rectStrokeAutoOffInput.value = strokeAuto.offColor || strokeValue;
    if (rectStrokeAutoOffTextInput) setInputValueSafe(rectStrokeAutoOffTextInput, strokeAuto.offColor || "");
  }
  if (obj.type === "circle") {
    if (circleCxInput) circleCxInput.value = Number(obj.cx) || 0;
    if (circleCyInput) circleCyInput.value = Number(obj.cy) || 0;
    if (circleRInput) circleRInput.value = Number(obj.r) || 40;
    if (circleShadowInput) circleShadowInput.checked = Boolean(obj.shadow);
    if (circleBorderEnabledInput) {
      const hasStroke = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
      circleBorderEnabledInput.checked = Boolean(hasStroke);
      if (circleStrokeRow) circleStrokeRow.classList.toggle("is-hidden", !hasStroke);
      if (circleStrokeWidthRow) circleStrokeWidthRow.classList.toggle("is-hidden", !hasStroke);
      if (circleStrokeAutoHeader) circleStrokeAutoHeader.classList.toggle("is-hidden", !hasStroke);
      if (circleStrokeAutoFields && !hasStroke) {
        circleStrokeAutoFields.classList.add("is-hidden");
        circleStrokeAutoFields.hidden = true;
      }
    }
    if (circleFillInput) circleFillInput.value = obj.fill || "#3a3f4b";
    if (circleFillTextInput) circleFillTextInput.value = obj.fill || "";
    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
    if (circleStrokeInput) circleStrokeInput.value = strokeValue;
    if (circleStrokeTextInput) circleStrokeTextInput.value = strokeValue;
    if (circleStrokeWidthInput) circleStrokeWidthInput.value = Number(obj.strokeWidth ?? 1);

    const fillAuto = obj.fillAutomation || {};
    const fillEnabled = Boolean(fillAuto.enabled);
    if (circleFillAutoEnabledInput) circleFillAutoEnabledInput.checked = fillEnabled;
    if (circleFillAutoInvertInput) circleFillAutoInvertInput.checked = Boolean(fillAuto.invert);
    if (circleFillAutoFields) {
      circleFillAutoFields.classList.toggle("is-hidden", !fillEnabled);
      circleFillAutoFields.hidden = !fillEnabled;
    }
    const circleFillMode = fillAuto.mode === "equals" ? "equals" : "threshold";
    if (circleFillAutoModeSelect) circleFillAutoModeSelect.value = circleFillMode;
    if (circleFillAutoThresholdRow && circleFillAutoMatchRow) {
      const showMatch = circleFillMode === "equals";
      circleFillAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      circleFillAutoThresholdRow.hidden = showMatch;
      circleFillAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      circleFillAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(circleFillAutoConnectionInput, fillAuto.connection_id || "");
    if (circleFillAutoTagSelect) {
      const connectionId = String(fillAuto.connection_id || "");
      const tagName = String(fillAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(circleFillAutoTagSelect, combined);
    }
    if (circleFillAutoThresholdInput) setInputValueSafe(circleFillAutoThresholdInput, fillAuto.threshold ?? "");
    if (circleFillAutoMatchInput) setInputValueSafe(circleFillAutoMatchInput, fillAuto.match ?? "");
    if (circleFillAutoOnInput) circleFillAutoOnInput.value = fillAuto.onColor || (obj.fill || "#3a3f4b");
    if (circleFillAutoOnTextInput) setInputValueSafe(circleFillAutoOnTextInput, fillAuto.onColor || "");
    if (circleFillAutoOffInput) circleFillAutoOffInput.value = fillAuto.offColor || (obj.fill || "#3a3f4b");
    if (circleFillAutoOffTextInput) setInputValueSafe(circleFillAutoOffTextInput, fillAuto.offColor || "");

    const strokeAuto = obj.strokeAutomation || {};
    const strokeEnabled = Boolean(strokeAuto.enabled);
    const strokePresent = obj.stroke && obj.stroke !== "none" && Number(obj.strokeWidth ?? 1) > 0;
    if (circleStrokeAutoEnabledInput) circleStrokeAutoEnabledInput.checked = strokeEnabled;
    if (circleStrokeAutoInvertInput) circleStrokeAutoInvertInput.checked = Boolean(strokeAuto.invert);
    if (circleStrokeAutoFields) {
      const showFields = strokePresent && strokeEnabled;
      circleStrokeAutoFields.classList.toggle("is-hidden", !showFields);
      circleStrokeAutoFields.hidden = !showFields;
    }
    const circleStrokeMode = strokeAuto.mode === "equals" ? "equals" : "threshold";
    if (circleStrokeAutoModeSelect) circleStrokeAutoModeSelect.value = circleStrokeMode;
    if (circleStrokeAutoThresholdRow && circleStrokeAutoMatchRow) {
      const showMatch = circleStrokeMode === "equals";
      circleStrokeAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      circleStrokeAutoThresholdRow.hidden = showMatch;
      circleStrokeAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      circleStrokeAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(circleStrokeAutoConnectionInput, strokeAuto.connection_id || "");
    if (circleStrokeAutoTagSelect) {
      const connectionId = String(strokeAuto.connection_id || "");
      const tagName = String(strokeAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(circleStrokeAutoTagSelect, combined);
    }
    if (circleStrokeAutoThresholdInput) setInputValueSafe(circleStrokeAutoThresholdInput, strokeAuto.threshold ?? "");
    if (circleStrokeAutoMatchInput) setInputValueSafe(circleStrokeAutoMatchInput, strokeAuto.match ?? "");
    if (circleStrokeAutoOnInput) circleStrokeAutoOnInput.value = strokeAuto.onColor || strokeValue;
    if (circleStrokeAutoOnTextInput) setInputValueSafe(circleStrokeAutoOnTextInput, strokeAuto.onColor || "");
    if (circleStrokeAutoOffInput) circleStrokeAutoOffInput.value = strokeAuto.offColor || strokeValue;
    if (circleStrokeAutoOffTextInput) setInputValueSafe(circleStrokeAutoOffTextInput, strokeAuto.offColor || "");
	  }
	    if (obj.type === "line") {
      if (lineX1Input) lineX1Input.value = Number(obj.x1) || 0;
      if (lineY1Input) lineY1Input.value = Number(obj.y1) || 0;
      if (lineX2Input) lineX2Input.value = Number(obj.x2) || 0;
      if (lineY2Input) lineY2Input.value = Number(obj.y2) || 0;
      const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
      if (lineStrokeInput) lineStrokeInput.value = strokeValue;
      if (lineStrokeTextInput) lineStrokeTextInput.value = strokeValue;
      if (lineStrokeWidthInput) lineStrokeWidthInput.value = Number(obj.strokeWidth ?? 2);

    const strokeAuto = obj.strokeAutomation || {};
    const strokeEnabled = Boolean(strokeAuto.enabled);
    if (lineStrokeAutoEnabledInput) lineStrokeAutoEnabledInput.checked = strokeEnabled;
    if (lineStrokeAutoInvertInput) lineStrokeAutoInvertInput.checked = Boolean(strokeAuto.invert);
    if (lineStrokeAutoFields) {
      lineStrokeAutoFields.classList.toggle("is-hidden", !strokeEnabled);
      lineStrokeAutoFields.hidden = !strokeEnabled;
    }
    const lineStrokeMode = strokeAuto.mode === "equals" ? "equals" : "threshold";
    if (lineStrokeAutoModeSelect) lineStrokeAutoModeSelect.value = lineStrokeMode;
    if (lineStrokeAutoThresholdRow && lineStrokeAutoMatchRow) {
      const showMatch = lineStrokeMode === "equals";
      lineStrokeAutoThresholdRow.classList.toggle("is-hidden", showMatch);
      lineStrokeAutoThresholdRow.hidden = showMatch;
      lineStrokeAutoMatchRow.classList.toggle("is-hidden", !showMatch);
      lineStrokeAutoMatchRow.hidden = !showMatch;
    }
    setInputValueSafe(lineStrokeAutoConnectionInput, strokeAuto.connection_id || "");
    if (lineStrokeAutoTagSelect) {
      const connectionId = String(strokeAuto.connection_id || "");
      const tagName = String(strokeAuto.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(lineStrokeAutoTagSelect, combined);
    }
    if (lineStrokeAutoThresholdInput) setInputValueSafe(lineStrokeAutoThresholdInput, strokeAuto.threshold ?? "");
    if (lineStrokeAutoMatchInput) setInputValueSafe(lineStrokeAutoMatchInput, strokeAuto.match ?? "");
    if (lineStrokeAutoOnInput) lineStrokeAutoOnInput.value = strokeAuto.onColor || strokeValue;
    if (lineStrokeAutoOnTextInput) setInputValueSafe(lineStrokeAutoOnTextInput, strokeAuto.onColor || "");
	  if (lineStrokeAutoOffInput) lineStrokeAutoOffInput.value = strokeAuto.offColor || strokeValue;
	  if (lineStrokeAutoOffTextInput) setInputValueSafe(lineStrokeAutoOffTextInput, strokeAuto.offColor || "");
	  }
	  if (obj.type === "curve") {
	    if (curveX1Input) curveX1Input.value = Number(obj.x1) || 0;
	    if (curveY1Input) curveY1Input.value = Number(obj.y1) || 0;
	    if (curveCXInput) curveCXInput.value = Number(obj.cx) || 0;
	    if (curveCYInput) curveCYInput.value = Number(obj.cy) || 0;
	    if (curveX2Input) curveX2Input.value = Number(obj.x2) || 0;
	    if (curveY2Input) curveY2Input.value = Number(obj.y2) || 0;
	    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
	    if (curveStrokeInput) curveStrokeInput.value = strokeValue;
	    if (curveStrokeTextInput) curveStrokeTextInput.value = strokeValue;
	    if (curveStrokeWidthInput) curveStrokeWidthInput.value = Number(obj.strokeWidth ?? 2);
	  }
	  if (obj.type === "polyline") {
	    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
	    if (polylineStrokeInput) polylineStrokeInput.value = strokeValue;
	    if (polylineStrokeTextInput) polylineStrokeTextInput.value = strokeValue;
	    if (polylineStrokeWidthInput) polylineStrokeWidthInput.value = Number(obj.strokeWidth ?? 2);
	  }
	  if (obj.type === "polygon") {
	    const fillValue = obj.fill || "#3a3f4b";
	    if (polygonFillInput) polygonFillInput.value = fillValue;
	    if (polygonFillTextInput) polygonFillTextInput.value = obj.fill || "";
	    const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
	    if (polygonStrokeInput) polygonStrokeInput.value = strokeValue;
	    if (polygonStrokeTextInput) polygonStrokeTextInput.value = obj.stroke || "";
	    if (polygonStrokeWidthInput) polygonStrokeWidthInput.value = Number(obj.strokeWidth ?? 1);

	    const fillAuto = obj.fillAutomation || {};
	    const fillEnabled = Boolean(fillAuto.enabled);
	    if (polygonFillAutoEnabledInput) polygonFillAutoEnabledInput.checked = fillEnabled;
	    if (polygonFillAutoInvertInput) polygonFillAutoInvertInput.checked = Boolean(fillAuto.invert);
	    if (polygonFillAutoFields) {
	      polygonFillAutoFields.classList.toggle("is-hidden", !fillEnabled);
	      polygonFillAutoFields.hidden = !fillEnabled;
	    }
	    const polygonFillMode = fillAuto.mode === "equals" ? "equals" : "threshold";
	    if (polygonFillAutoModeSelect) polygonFillAutoModeSelect.value = polygonFillMode;
	    if (polygonFillAutoThresholdRow && polygonFillAutoMatchRow) {
	      const showMatch = polygonFillMode === "equals";
	      polygonFillAutoThresholdRow.classList.toggle("is-hidden", showMatch);
	      polygonFillAutoThresholdRow.hidden = showMatch;
	      polygonFillAutoMatchRow.classList.toggle("is-hidden", !showMatch);
	      polygonFillAutoMatchRow.hidden = !showMatch;
	    }
	    setInputValueSafe(polygonFillAutoConnectionInput, fillAuto.connection_id || "");
	    if (polygonFillAutoTagSelect) {
	      const connectionId = String(fillAuto.connection_id || "");
	      const tagName = String(fillAuto.tag || "");
	      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
	      setSelectValueSafe(polygonFillAutoTagSelect, combined);
	    }
	    if (polygonFillAutoThresholdInput) setInputValueSafe(polygonFillAutoThresholdInput, fillAuto.threshold ?? "");
	    if (polygonFillAutoMatchInput) setInputValueSafe(polygonFillAutoMatchInput, fillAuto.match ?? "");
	    if (polygonFillAutoOnInput) polygonFillAutoOnInput.value = fillAuto.onColor || fillValue;
	    if (polygonFillAutoOnTextInput) setInputValueSafe(polygonFillAutoOnTextInput, fillAuto.onColor || "");
	    if (polygonFillAutoOffInput) polygonFillAutoOffInput.value = fillAuto.offColor || fillValue;
	    if (polygonFillAutoOffTextInput) setInputValueSafe(polygonFillAutoOffTextInput, fillAuto.offColor || "");

	    const strokeAuto = obj.strokeAutomation || {};
	    const strokeEnabled = Boolean(strokeAuto.enabled);
	    if (polygonStrokeAutoEnabledInput) polygonStrokeAutoEnabledInput.checked = strokeEnabled;
	    if (polygonStrokeAutoInvertInput) polygonStrokeAutoInvertInput.checked = Boolean(strokeAuto.invert);
	    if (polygonStrokeAutoFields) {
	      polygonStrokeAutoFields.classList.toggle("is-hidden", !strokeEnabled);
	      polygonStrokeAutoFields.hidden = !strokeEnabled;
	    }
	    const polygonStrokeMode = strokeAuto.mode === "equals" ? "equals" : "threshold";
	    if (polygonStrokeAutoModeSelect) polygonStrokeAutoModeSelect.value = polygonStrokeMode;
	    if (polygonStrokeAutoThresholdRow && polygonStrokeAutoMatchRow) {
	      const showMatch = polygonStrokeMode === "equals";
	      polygonStrokeAutoThresholdRow.classList.toggle("is-hidden", showMatch);
	      polygonStrokeAutoThresholdRow.hidden = showMatch;
	      polygonStrokeAutoMatchRow.classList.toggle("is-hidden", !showMatch);
	      polygonStrokeAutoMatchRow.hidden = !showMatch;
	    }
	    setInputValueSafe(polygonStrokeAutoConnectionInput, strokeAuto.connection_id || "");
	    if (polygonStrokeAutoTagSelect) {
	      const connectionId = String(strokeAuto.connection_id || "");
	      const tagName = String(strokeAuto.tag || "");
	      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
	      setSelectValueSafe(polygonStrokeAutoTagSelect, combined);
	    }
	    if (polygonStrokeAutoThresholdInput) setInputValueSafe(polygonStrokeAutoThresholdInput, strokeAuto.threshold ?? "");
	    if (polygonStrokeAutoMatchInput) setInputValueSafe(polygonStrokeAutoMatchInput, strokeAuto.match ?? "");
	    if (polygonStrokeAutoOnInput) polygonStrokeAutoOnInput.value = strokeAuto.onColor || strokeValue;
	    if (polygonStrokeAutoOnTextInput) setInputValueSafe(polygonStrokeAutoOnTextInput, strokeAuto.onColor || "");
	    if (polygonStrokeAutoOffInput) polygonStrokeAutoOffInput.value = strokeAuto.offColor || strokeValue;
	    if (polygonStrokeAutoOffTextInput) setInputValueSafe(polygonStrokeAutoOffTextInput, strokeAuto.offColor || "");
	  }
	  if (obj.type === "bar") {
	    if (barXInput) barXInput.value = Number(obj.x) || 0;
	    if (barYInput) barYInput.value = Number(obj.y) || 0;
	    if (barWInput) barWInput.value = Number(obj.w) || 120;
	    if (barHInput) barHInput.value = Number(obj.h) || 120;
	    if (barOrientationSelect) barOrientationSelect.value = obj.orientation === "horizontal" ? "horizontal" : "vertical";
	    if (barMinInput) setInputValueSafe(barMinInput, obj.min ?? "");
	    if (barMaxInput) setInputValueSafe(barMaxInput, obj.max ?? "");
    const minBinding = obj.minBinding || {};
    const minTagEnabled = Boolean(minBinding.enabled);
    if (barMinTagEnabledInput) barMinTagEnabledInput.checked = minTagEnabled;
    if (barMinTagFields) {
      barMinTagFields.classList.toggle("is-hidden", !minTagEnabled);
      barMinTagFields.hidden = !minTagEnabled;
    }
    setInputValueSafe(barMinConnectionInput, minBinding.connection_id || "");
    if (barMinTagSelect) {
      const connectionId = String(minBinding.connection_id || "");
      const tagName = String(minBinding.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(barMinTagSelect, combined);
    }

    const maxBinding = obj.maxBinding || {};
    const maxTagEnabled = Boolean(maxBinding.enabled);
    if (barMaxTagEnabledInput) barMaxTagEnabledInput.checked = maxTagEnabled;
    if (barMaxTagFields) {
      barMaxTagFields.classList.toggle("is-hidden", !maxTagEnabled);
      barMaxTagFields.hidden = !maxTagEnabled;
    }
    setInputValueSafe(barMaxConnectionInput, maxBinding.connection_id || "");
    if (barMaxTagSelect) {
      const connectionId = String(maxBinding.connection_id || "");
      const tagName = String(maxBinding.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(barMaxTagSelect, combined);
    }

    const bind = obj.bindValue || {};
    setInputValueSafe(barBindConnectionInput, bind.connection_id || "");
    if (barBindTagSelect) {
      const connectionId = String(bind.connection_id || "");
      const tagName = String(bind.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(barBindTagSelect, combined);
    }
    const digitsValue = Number.isFinite(Number(bind.digits)) ? Number(bind.digits) : 7;
    setInputValueSafe(barDigitsInput, digitsValue);
    const decimalsValue = Number.isFinite(Number(bind.decimals)) ? Number(bind.decimals) : 0;
    setInputValueSafe(barDecimalsInput, decimalsValue);
    const multiplierValue = Number.isFinite(Number(bind.multiplier)) ? Number(bind.multiplier) : 1;
    setInputValueSafe(barMultiplierInput, multiplierValue);

    const fillValue = obj.fill ?? "#46ff64";
    if (barFillInput) barFillInput.value = fillValue;
    if (barFillTextInput) setInputValueSafe(barFillTextInput, obj.fill ?? "");
    const bgValue = obj.background ?? "transparent";
    if (barBackgroundInput) barBackgroundInput.value = bgValue;
    if (barBackgroundTextInput) setInputValueSafe(barBackgroundTextInput, obj.background ?? "");

    const border = obj.border || {};
    const borderEnabled = Boolean(border.enabled);
    if (barBorderEnabledInput) barBorderEnabledInput.checked = borderEnabled;
    if (barBevelInput) barBevelInput.checked = Boolean(obj.bevel);
    if (barBevelRow) {
      barBevelRow.classList.toggle("is-hidden", !borderEnabled);
      barBevelRow.hidden = !borderEnabled;
    }
    if (barBorderColorRow) {
      barBorderColorRow.classList.toggle("is-hidden", !borderEnabled);
      barBorderColorRow.hidden = !borderEnabled;
    }
    if (barBorderWidthRow) {
      barBorderWidthRow.classList.toggle("is-hidden", !borderEnabled);
      barBorderWidthRow.hidden = !borderEnabled;
    }
    const borderColorValue = border.color || "#ffffff";
    if (barBorderColorInput) barBorderColorInput.value = borderColorValue;
    if (barBorderColorTextInput) setInputValueSafe(barBorderColorTextInput, border.color || "");
    if (barBorderWidthInput) setInputValueSafe(barBorderWidthInput, border.width ?? 1);

    const ticks = obj.ticks || {};
    const ticksEnabled = Boolean(ticks.enabled);
    if (barTicksEnabledInput) barTicksEnabledInput.checked = ticksEnabled;
    if (barTicksFields) {
      barTicksFields.classList.toggle("is-hidden", !ticksEnabled);
      barTicksFields.hidden = !ticksEnabled;
    }
    if (barTicksMajorInput) setInputValueSafe(barTicksMajorInput, ticks.major ?? 5);
    if (barTicksMinorInput) setInputValueSafe(barTicksMinorInput, ticks.minor ?? 4);
  }
  if (visibilityEnabledInput || visibilityConnectionInput || visibilityTagSelect || visibilityThresholdInput || visibilityInvertInput) {
    const vis = obj.visibility || {};
    const isEnabled = Boolean(vis.enabled);
    if (visibilityEnabledInput) visibilityEnabledInput.checked = isEnabled;
    if (visibilityFields) {
      visibilityFields.classList.toggle("is-hidden", !isEnabled);
      visibilityFields.hidden = !isEnabled;
    }
    setInputValueSafe(visibilityConnectionInput, vis.connection_id || "");
    if (visibilityTagSelect) {
      const connectionId = String(vis.connection_id || "");
      const tagName = String(vis.tag || "");
      const combined = connectionId && tagName ? `${connectionId}::${tagName}` : "";
      setSelectValueSafe(visibilityTagSelect, combined);
    }
    if (visibilityThresholdInput) {
      const thresholdValue = vis.threshold;
      setInputValueSafe(visibilityThresholdInput, thresholdValue ?? "");
    }
    if (visibilityInvertInput) visibilityInvertInput.checked = Boolean(vis.invert);
  }
};

const updatePropertiesPanel = () => {
  const isSingle = selectedIndices.length === 1;
  const isMulti = selectedIndices.length > 1;
  const activeObjects = getActiveObjects();
  const obj = isSingle ? activeObjects?.[selectedIndices[0]] : null;
  const showText = Boolean(obj && obj.type === "text");
  const showButton = Boolean(obj && obj.type === "button");
  const showGroup = Boolean(obj && obj.type === "group");
  const showViewport = Boolean(obj && obj.type === "viewport");
  const showRect = Boolean(obj && (obj.type === "rect" || obj.type === "alarms-panel"));
  const showCircle = Boolean(obj && obj.type === "circle");
  const showLine = Boolean(obj && obj.type === "line");
  const showCurve = Boolean(obj && obj.type === "curve");
  const showPolyline = Boolean(obj && obj.type === "polyline");
  const showPolygon = Boolean(obj && obj.type === "polygon");
  const showBar = Boolean(obj && obj.type === "bar");
  const showNumberInput = Boolean(obj && obj.type === "number-input");
  const showIndicator = Boolean(obj && obj.type === "indicator");
  const showVisibility = Boolean(obj);
  if (screenProps) screenProps.classList.toggle("is-hidden", isMulti || showText || showButton || showGroup || showViewport || showRect || showCircle || showLine || showCurve || showPolyline || showPolygon || showBar || showNumberInput || showIndicator);
  if (textProps) textProps.classList.toggle("is-hidden", !showText);
  if (buttonProps) buttonProps.classList.toggle("is-hidden", !showButton);
  if (groupProps) groupProps.classList.toggle("is-hidden", !showGroup);
  if (numberInputProps) numberInputProps.classList.toggle("is-hidden", !showNumberInput);
  if (indicatorProps) indicatorProps.classList.toggle("is-hidden", !showIndicator);
  if (viewportProps) viewportProps.classList.toggle("is-hidden", !showViewport);
  if (rectProps) rectProps.classList.toggle("is-hidden", !showRect);
  if (circleProps) circleProps.classList.toggle("is-hidden", !showCircle);
  if (lineProps) lineProps.classList.toggle("is-hidden", !showLine);
  if (curveProps) curveProps.classList.toggle("is-hidden", !showCurve);
  if (polylineProps) polylineProps.classList.toggle("is-hidden", !showPolyline);
  if (polygonProps) polygonProps.classList.toggle("is-hidden", !showPolygon);
  if (barProps) barProps.classList.toggle("is-hidden", !showBar);
  if (visibilityProps) visibilityProps.classList.toggle("is-hidden", !showVisibility);
  if (alignTools) alignTools.classList.toggle("is-hidden", !isMulti);
  updateMenuState();
  if (isMulti) {
    return;
  }
  if (showText || showButton || showGroup || showViewport || showRect || showCircle || showLine || showCurve || showPolyline || showPolygon || showBar || showNumberInput || showIndicator) {
    syncPropertiesFromSelection();
  } else {
    syncPropertiesFromScreen();
  }
  refreshViewportIdOptions();
};

const updateScreenProperty = (patch) => {
  if (!currentScreenObj) return;
  recordHistory();
  Object.assign(currentScreenObj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateScreenBorder = (patch) => {
  if (!currentScreenObj) return;
  recordHistory();
  if (!currentScreenObj.border) currentScreenObj.border = { enabled: false, color: "#ffffff", width: 1 };
  Object.assign(currentScreenObj.border, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateTextProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "text") return;
  recordHistory();
  Object.assign(obj, patch);
  const hasW = Number.isFinite(Number(obj.w));
  const hasH = Number.isFinite(Number(obj.h));
  if (hasW || hasH) {
    const autoPatch = autosizeTextObject(obj);
    if (autoPatch) Object.assign(obj, autoPatch);
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateTextBindProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "text") return;
  recordHistory();
  const nextBind = { ...(obj.bindText || {}), ...patch };
  const hasValue = Object.values(nextBind).some((value) => value !== "" && value !== null && value !== undefined);
  if (hasValue) {
    obj.bindText = nextBind;
  } else {
    delete obj.bindText;
  }
  const hasW = Number.isFinite(Number(obj.w));
  const hasH = Number.isFinite(Number(obj.h));
  if (hasW || hasH) {
    const autoPatch = autosizeTextObject(obj);
    if (autoPatch) Object.assign(obj, autoPatch);
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const getTextAutosizeSample = (obj) => {
  const raw = String(obj?.text ?? "");
  if (obj?.bindText && raw.includes("{value}")) {
    const replacement = getBindPlaceholder(obj.bindText);
    return raw.replace(/\{value\}/g, replacement);
  }
  return raw;
};

const autosizeTextObject = (obj) => {
  if (!obj || obj.type !== "text") return null;
  const sample = getTextAutosizeSample(obj);
  const metrics = measureTextBlock(sample, obj.fontSize || 18, Boolean(obj.bold));
  return {
    w: Math.max(10, metrics.width),
    h: Math.max(10, metrics.height)
  };
};

const autosizeButtonObject = (obj) => {
  if (!obj || obj.type !== "button") return null;
  const label = decodeNbspEntities(String(obj.label ?? ""));
  const metrics = measureTextBlock(label, obj.fontSize || 16, Boolean(obj.bold));
  const width = metrics.width + 16;
  const height = metrics.height + 16;
  return {
    w: Math.max(40, Math.round(width)),
    h: Math.max(24, Math.round(height))
  };
};

const updateButtonProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "button") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateGroupProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "group") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateButtonLabelBindProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "button") return;
  recordHistory();
  const nextBind = { ...(obj.bindLabel || {}), ...patch };
  const hasValue = Object.values(nextBind).some((value) => value !== "" && value !== null && value !== undefined);
  if (hasValue) {
    obj.bindLabel = nextBind;
  } else {
    delete obj.bindLabel;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateRectProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || (obj.type !== "rect" && obj.type !== "alarms-panel")) return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateCircleProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "circle") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateLineProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "line") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateCurveProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "curve") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updatePolylineProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "polyline") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updatePolygonProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "polygon") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateBarProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "bar") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateBarBorder = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "bar") return;
  recordHistory();
  if (!obj.border) obj.border = { enabled: false, color: "#ffffff", width: 1 };
  Object.assign(obj.border, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateBarBindProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "bar") return;
  recordHistory();
  const nextBind = { ...(obj.bindValue || {}), ...patch };
  const hasValue = Object.values(nextBind).some((value) => value !== "" && value !== null && value !== undefined);
  if (hasValue) {
    obj.bindValue = nextBind;
  } else {
    delete obj.bindValue;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateNumberInputProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "number-input") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateNumberInputBindProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "number-input") return;
  recordHistory();
  const nextBind = { ...(obj.bindValue || {}), ...patch };
  const hasValue = Object.values(nextBind).some((value) => value !== "" && value !== null && value !== undefined);
  if (hasValue) {
    obj.bindValue = nextBind;
  } else {
    delete obj.bindValue;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateIndicatorProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "indicator") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateIndicatorBindProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "indicator") return;
  recordHistory();
  const nextBind = { ...(obj.bindValue || {}), ...patch };
  const hasValue = Object.values(nextBind).some((value) => value !== "" && value !== null && value !== undefined);
  if (hasValue) {
    obj.bindValue = nextBind;
  } else {
    delete obj.bindValue;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateIndicatorStates = (nextStates) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "indicator") return;
  recordHistory();
  if (Array.isArray(nextStates) && nextStates.length) {
    obj.states = nextStates;
  } else {
    delete obj.states;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateBarRangeBinding = (which, patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "bar") return;
  const key = which === "max" ? "maxBinding" : "minBinding";
  recordHistory();
  const current = obj[key] || { enabled: false };
  const next = { ...current, ...patch };
  if ("connection_id" in patch && !patch.connection_id) delete next.connection_id;
  if ("tag" in patch && !patch.tag) delete next.tag;
  if (patch.enabled === false) {
    delete obj[key];
  } else {
    if (next.enabled == null) next.enabled = true;
    obj[key] = next;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateVisibilityProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj) return;
  recordHistory();
  const current = obj.visibility || { enabled: true };
  const next = { ...current, ...patch };
  if ("threshold" in patch) {
    if (patch.threshold === "" || patch.threshold === null || patch.threshold === undefined) {
      delete next.threshold;
    }
    if (obj.type === "polyline") {
      const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
      if (polylineStrokeInput) polylineStrokeInput.value = strokeValue;
      if (polylineStrokeTextInput) polylineStrokeTextInput.value = strokeValue;
      if (polylineStrokeWidthInput) polylineStrokeWidthInput.value = Number(obj.strokeWidth ?? 2);
    }
    if (obj.type === "polygon") {
      const fillValue = obj.fill ?? "#3a3f4b";
      if (polygonFillInput) polygonFillInput.value = fillValue;
      if (polygonFillTextInput) setInputValueSafe(polygonFillTextInput, obj.fill ?? "");
      const strokeValue = (!obj.stroke || obj.stroke === "none") ? "#ffffff" : obj.stroke;
      if (polygonStrokeInput) polygonStrokeInput.value = strokeValue;
      if (polygonStrokeTextInput) setInputValueSafe(polygonStrokeTextInput, obj.stroke ?? "");
      if (polygonStrokeWidthInput) polygonStrokeWidthInput.value = Number(obj.strokeWidth ?? 1);
    }
  }
  if (patch.enabled === false) {
    delete obj.visibility;
  } else {
    if (next.enabled == null) next.enabled = true;
    obj.visibility = next;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateAutomationProperty = (key, patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj) return;
  if (obj.type === "viewport") return;
  recordHistory();
  const current = obj[key] || { enabled: true };
  const next = { ...current, ...patch };
  if ("threshold" in patch) {
    if (patch.threshold === "" || patch.threshold === null || patch.threshold === undefined) {
      delete next.threshold;
    }
  }
  if ("match" in patch) {
    if (patch.match === "" || patch.match === null || patch.match === undefined) {
      delete next.match;
    }
  }
  if ("mode" in patch) {
    if (!patch.mode) {
      delete next.mode;
    }
  }
  if ("connection_id" in patch && !patch.connection_id) delete next.connection_id;
  if ("tag" in patch && !patch.tag) delete next.tag;
  if ("onColor" in patch && !patch.onColor) delete next.onColor;
  if ("offColor" in patch && !patch.offColor) delete next.offColor;
  if ("enabled" in patch && patch.enabled === false) {
    next.enabled = false;
    obj[key] = next;
  } else {
    if (next.enabled == null) next.enabled = true;
    obj[key] = next;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const updateViewportProperty = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "viewport") return;
  recordHistory();
  Object.assign(obj, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
  refreshViewportIdOptions();
};

const updateViewportBorder = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const index = selectedIndices[0];
  const obj = activeObjects[index];
  if (!obj || obj.type !== "viewport") return;
  if (!obj.border) obj.border = { enabled: false, color: "#ffffff", width: 1 };
  Object.assign(obj.border, patch);
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

const SWATCH_COLORS = [
  { value: "transparent", label: "Transparent" },
  { value: "none", label: "None" },
  { value: "#000000", label: "#000000" },
  { value: "#333333", label: "#333333" },
  { value: "#666666", label: "#666666" },
  { value: "#999999", label: "#999999" },
  { value: "#cccccc", label: "#CCCCCC" },
  { value: "#ffffff", label: "#FFFFFF" },
  { value: "#002878", label: "#002878" },
  { value: "#506484", label: "#506484" },
  { value: "#c8ecfa", label: "#C8ECFA" },
  { value: "#008c3c", label: "#008C3C" },
  { value: "#fa3232", label: "#FA3232" },
  { value: "#fff546", label: "#FFF546" },
  { value: "#ff9600", label: "#FF9600" },
  { value: "#ff64c8", label: "#FF64C8" },
  { value: "#46ff64", label: "#46FF64" }
];

const buildSwatches = (container, onPick) => {
  if (!container) return;
  container.textContent = "";
  SWATCH_COLORS.forEach((swatch) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-swatch";
    btn.style.background = swatch.value;
    btn.setAttribute("aria-label", `Color ${swatch.label}`);
    btn.title = swatch.label;
    if (swatch.value === "transparent") {
      btn.style.background = "linear-gradient(135deg, #ffffff 0%, #ffffff 50%, #d32f2f 50%, #d32f2f 60%, #ffffff 60%, #ffffff 100%)";
    }
    if (swatch.value === "none") {
      btn.style.background = "linear-gradient(135deg, #ffffff 0%, #ffffff 50%, #455a64 50%, #455a64 60%, #ffffff 60%, #ffffff 100%)";
    }
    btn.addEventListener("click", () => onPick(swatch.value));
    container.appendChild(btn);
  });
};

const closeSwatches = () => {
  if (screenBgSwatches) screenBgSwatches.classList.remove("is-open");
  if (screenBorderSwatches) screenBorderSwatches.classList.remove("is-open");
  if (textFillSwatches) textFillSwatches.classList.remove("is-open");
  if (textBgSwatches) textBgSwatches.classList.remove("is-open");
  if (textBorderSwatches) textBorderSwatches.classList.remove("is-open");
  if (buttonFillSwatches) buttonFillSwatches.classList.remove("is-open");
  if (buttonTextColorSwatches) buttonTextColorSwatches.classList.remove("is-open");
  if (viewportBorderSwatches) viewportBorderSwatches.classList.remove("is-open");
  if (buttonStrokeSwatches) buttonStrokeSwatches.classList.remove("is-open");
  if (rectFillSwatches) rectFillSwatches.classList.remove("is-open");
  if (rectStrokeSwatches) rectStrokeSwatches.classList.remove("is-open");
  if (circleFillSwatches) circleFillSwatches.classList.remove("is-open");
  if (circleStrokeSwatches) circleStrokeSwatches.classList.remove("is-open");
  if (lineStrokeSwatches) lineStrokeSwatches.classList.remove("is-open");
  if (curveStrokeSwatches) curveStrokeSwatches.classList.remove("is-open");
  if (polylineStrokeSwatches) polylineStrokeSwatches.classList.remove("is-open");
  if (polygonFillSwatches) polygonFillSwatches.classList.remove("is-open");
  if (polygonStrokeSwatches) polygonStrokeSwatches.classList.remove("is-open");
  if (barFillSwatches) barFillSwatches.classList.remove("is-open");
  if (barBackgroundSwatches) barBackgroundSwatches.classList.remove("is-open");
  if (barBorderSwatches) barBorderSwatches.classList.remove("is-open");
  if (numberInputFillSwatches) numberInputFillSwatches.classList.remove("is-open");
  if (numberInputTextColorSwatches) numberInputTextColorSwatches.classList.remove("is-open");
  if (numberInputStrokeSwatches) numberInputStrokeSwatches.classList.remove("is-open");
  if (textAutoOnSwatches) textAutoOnSwatches.classList.remove("is-open");
  if (textAutoOffSwatches) textAutoOffSwatches.classList.remove("is-open");
  if (buttonFillAutoOnSwatches) buttonFillAutoOnSwatches.classList.remove("is-open");
  if (buttonFillAutoOffSwatches) buttonFillAutoOffSwatches.classList.remove("is-open");
  if (buttonTextAutoOnSwatches) buttonTextAutoOnSwatches.classList.remove("is-open");
  if (buttonTextAutoOffSwatches) buttonTextAutoOffSwatches.classList.remove("is-open");
  if (rectFillAutoOnSwatches) rectFillAutoOnSwatches.classList.remove("is-open");
  if (rectFillAutoOffSwatches) rectFillAutoOffSwatches.classList.remove("is-open");
  if (circleFillAutoOnSwatches) circleFillAutoOnSwatches.classList.remove("is-open");
  if (circleFillAutoOffSwatches) circleFillAutoOffSwatches.classList.remove("is-open");
  if (rectStrokeAutoOnSwatches) rectStrokeAutoOnSwatches.classList.remove("is-open");
  if (rectStrokeAutoOffSwatches) rectStrokeAutoOffSwatches.classList.remove("is-open");
  if (circleStrokeAutoOnSwatches) circleStrokeAutoOnSwatches.classList.remove("is-open");
  if (circleStrokeAutoOffSwatches) circleStrokeAutoOffSwatches.classList.remove("is-open");
  if (lineStrokeAutoOnSwatches) lineStrokeAutoOnSwatches.classList.remove("is-open");
  if (lineStrokeAutoOffSwatches) lineStrokeAutoOffSwatches.classList.remove("is-open");
  if (polygonFillAutoOnSwatches) polygonFillAutoOnSwatches.classList.remove("is-open");
  if (polygonFillAutoOffSwatches) polygonFillAutoOffSwatches.classList.remove("is-open");
  if (polygonStrokeAutoOnSwatches) polygonStrokeAutoOnSwatches.classList.remove("is-open");
  if (polygonStrokeAutoOffSwatches) polygonStrokeAutoOffSwatches.classList.remove("is-open");
  if (alarmsPanelHeaderBgSwatches) alarmsPanelHeaderBgSwatches.classList.remove("is-open");
  if (alarmsPanelHeaderTextSwatches) alarmsPanelHeaderTextSwatches.classList.remove("is-open");
  if (alarmsPanelRowBgNormalSwatches) alarmsPanelRowBgNormalSwatches.classList.remove("is-open");
  if (alarmsPanelRowBgActiveUnackedSwatches) alarmsPanelRowBgActiveUnackedSwatches.classList.remove("is-open");
  if (alarmsPanelRowBgActiveAckedSwatches) alarmsPanelRowBgActiveAckedSwatches.classList.remove("is-open");
  if (alarmsPanelRowBgReturnedSwatches) alarmsPanelRowBgReturnedSwatches.classList.remove("is-open");
  if (alarmsPanelRowBgBadQualitySwatches) alarmsPanelRowBgBadQualitySwatches.classList.remove("is-open");
  if (alarmsPanelRowTextNormalSwatches) alarmsPanelRowTextNormalSwatches.classList.remove("is-open");
  if (alarmsPanelRowTextActiveUnackedSwatches) alarmsPanelRowTextActiveUnackedSwatches.classList.remove("is-open");
  if (alarmsPanelRowTextActiveAckedSwatches) alarmsPanelRowTextActiveAckedSwatches.classList.remove("is-open");
  if (alarmsPanelRowTextReturnedSwatches) alarmsPanelRowTextReturnedSwatches.classList.remove("is-open");
  if (alarmsPanelRowTextBadQualitySwatches) alarmsPanelRowTextBadQualitySwatches.classList.remove("is-open");
  if (alarmsPanelStripeActiveUnackedSwatches) alarmsPanelStripeActiveUnackedSwatches.classList.remove("is-open");
  if (alarmsPanelStripeActiveAckedSwatches) alarmsPanelStripeActiveAckedSwatches.classList.remove("is-open");
  if (alarmsPanelStripeReturnedSwatches) alarmsPanelStripeReturnedSwatches.classList.remove("is-open");
  if (alarmsPanelStripeBadQualitySwatches) alarmsPanelStripeBadQualitySwatches.classList.remove("is-open");
  document.querySelectorAll(".swatch-popover.is-open").forEach((el) => el.classList.remove("is-open"));
};

const toggleSwatches = (target) => {
  const isOpen = target.classList.contains("is-open");
  closeSwatches();
  if (!isOpen) target.classList.add("is-open");
};
const setDirty = (next) => {
  isDirty = next;
  if (screenTitle) screenTitle.classList.toggle("is-dirty", isDirty);
  if (screenSaveBtn) screenSaveBtn.classList.toggle("is-visible", isDirty);
  if (currentScreenObj && currentScreenId) {
    screenCache.set(currentScreenId, currentScreenObj);
  }
};

const confirmLoseUnsavedChanges = (actionLabel) => {
  if (!isEditMode) return true;
  if (!isDirty) return true;
  const action = String(actionLabel || 'This action');
  return window.confirm(`${action} will discard unsaved changes. Continue?`);
};


const applyJsoncEditor = () => {
  if (!jsoncEditor) return;
  try {
    const parsed = parseJsonc(jsoncEditor.value);
    currentScreenObj = parsed;
    selectedIndices = [];
    clearSelectedPolygonVertex();
    if (currentScreenId) screenCache.set(currentScreenId, currentScreenObj);
    renderScreen();
    scheduleWsSubscribeRefresh();
    if (editorStatus) editorStatus.textContent = "Applied JSONC changes.";
    setDirty(true);
  } catch (error) {
    if (editorStatus) editorStatus.textContent = `Apply failed: ${error.message}`;
  }
};

const saveJsoncEditor = async () => {
  if (!jsoncEditor) return;
  try {
    if (currentScreenObj && currentScreenId) {
      screenCache.set(currentScreenId, currentScreenObj);
    }
    const response = await fetch(`/api/screens/${encodeURIComponent(currentScreenId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: jsoncEditor.value })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (editorStatus) editorStatus.textContent = "Saved.";
    setDirty(false);
  } catch (error) {
    if (editorStatus) editorStatus.textContent = `Save failed: ${error.message}`;
  }
};

const reloadJsoncEditor = () => {
  lastLoadedFilename = "";
  loadJsonc();
  setDirty(false);
};

function applyScreenSelection(id, filename) {
  currentScreenId = id;
  currentScreenFilename = filename || `${id}.jsonc`;
  lastLoadedFilename = "";
  selectedIndices = [];
  clearSelectedPolygonVertex();
  if (screenTitle) screenTitle.textContent = currentScreenId;
  if (editorFilename) editorFilename.textContent = currentScreenFilename;
  loadJsonc();
}

const loadScreenById = (id) => {
  if (!id) return;
  currentScreenId = id;
  currentScreenFilename = `${id}.jsonc`;
  lastLoadedFilename = "";
  selectedIndices = [];
  clearSelectedPolygonVertex();
  if (screenTitle) screenTitle.textContent = currentScreenId;
  if (editorFilename) editorFilename.textContent = currentScreenFilename;
  if (screenList) screenList.value = id;
  loadJsonc();
};

async function refreshScreensList() {
  if (!screenList) return;
  screenList.innerHTML = "";
  try {
    const response = await fetch("/api/screens");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    availableScreens = data.screens || [];
    data.screens.forEach((screenItem) => {
      const opt = document.createElement("option");
      opt.value = screenItem.id;
      opt.textContent = screenItem.id;
      opt.dataset.filename = screenItem.filename;
      screenList.appendChild(opt);
    });

    if (buttonTargetSelect) {
      buttonTargetSelect.innerHTML = "";
      availableScreens.forEach((screenItem) => {
        const opt = document.createElement("option");
        opt.value = screenItem.id;
        opt.textContent = screenItem.id;
        buttonTargetSelect.appendChild(opt);
      });
    }
    if (buttonActionSelect) {
      updateButtonActionUI(buttonActionSelect.value || "navigate");
    }

    if (viewportTargetSelect) {
      viewportTargetSelect.innerHTML = "";
      availableScreens.forEach((screenItem) => {
        const opt = document.createElement("option");
        opt.value = screenItem.id;
        opt.textContent = screenItem.id;
        viewportTargetSelect.appendChild(opt);
      });
    }
    refreshGroupActionScreenOptions();

    const preferred = data.screens.find((s) => s.id === currentScreenId) || data.screens[0];
    if (preferred) {
      screenList.value = preferred.id;
      applyScreenSelection(preferred.id, preferred.filename);
    } else {
      if (jsoncEditor) jsoncEditor.value = "";
      if (editorStatus) editorStatus.textContent = "No screens found.";
    }
  } catch (error) {
    if (editorStatus) editorStatus.textContent = `Failed to list screens: ${error.message}`;
  }
}

function bindScreenManager() {
  if (screenList) {
    screenList.addEventListener("change", () => {
      const selected = screenList.options[screenList.selectedIndex];
      if (!selected) return;
      if (editorStatus) {
        editorStatus.textContent = `Selected "${selected.value}". Click Open to load.`;
      }
    });
  }

  if (screenOpenBtn) {
    screenOpenBtn.addEventListener("click", () => {
      const selected = screenList?.options[screenList.selectedIndex];
      if (!selected) return;
      applyScreenSelection(selected.value, selected.dataset.filename);
    });
  }

  if (screenNewBtn) {
    screenNewBtn.addEventListener("click", async () => {
      const desiredId = window.prompt("New screen id (optional):", "");
      try {
        const response = await fetch("/api/screens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(desiredId ? { id: desiredId } : {})
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        await refreshScreensList();
        applyScreenSelection(data.id, data.filename);
      } catch (error) {
        if (editorStatus) editorStatus.textContent = `Create failed: ${error.message}`;
      }
    });
  }

  if (screenDuplicateBtn) {
    screenDuplicateBtn.addEventListener("click", async () => {
      const selected = screenList?.options[screenList.selectedIndex];
      if (!selected) return;
      const desiredId = window.prompt("Duplicate to id (optional):", `${selected.value}_copy`);
      try {
        const response = await fetch(`/api/screens/${encodeURIComponent(selected.value)}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(desiredId ? { id: desiredId } : {})
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        await refreshScreensList();
        applyScreenSelection(data.id, data.filename);
      } catch (error) {
        if (editorStatus) editorStatus.textContent = `Duplicate failed: ${error.message}`;
      }
    });
  }

  if (screenDeleteBtn) {
    screenDeleteBtn.addEventListener("click", async () => {
      const selected = screenList?.options[screenList.selectedIndex];
      if (!selected) return;
      const ok = window.confirm(`Delete screen "${selected.value}"? This cannot be undone.`);
      if (!ok) return;
      try {
        const response = await fetch(`/api/screens/${encodeURIComponent(selected.value)}`, {
          method: "DELETE"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await refreshScreensList();
      } catch (error) {
        if (editorStatus) editorStatus.textContent = `Delete failed: ${error.message}`;
      }
    });
  }
}

const setMode = (next) => {
  const wasEditMode = isEditMode;
  isEditMode = next;
  document.body.classList.toggle("edit-mode", isEditMode);
  document.body.classList.toggle("runtime-mode", !isEditMode);
  if (toolbar) toolbar.classList.toggle("is-hidden", !isEditMode);
  if (editorPane) editorPane.classList.toggle("is-hidden", !isEditMode);
  if (screenTitle) screenTitle.textContent = currentScreenId || currentScreenFilename.replace(/\.jsonc$/i, "");
  if (editorFilename) editorFilename.textContent = currentScreenFilename;
  if (!isEditMode) {
    selectedIndices = [];
    groupEditStack.length = 0;
    clearSelectedPolygonVertex();
  }
  if (!isEditMode && wasEditMode) {
    const baseId = currentScreenId || currentScreenFilename.replace(/\.jsonc$/i, "");
    setRuntimeHistoryBase(baseId);
  }
  applyScale();
  renderScreen();
  if (isEditMode) refreshScreensList();
  updateSelectionOverlays();
  updatePropertiesPanel();
  updateGroupBreadcrumb();
  ensureRuntimeHistoryForCurrentScreen();
};

if (projectTitleEl) {
  projectTitleEl.title = `Build: ${HMI_BUILD}`;
}

window.addEventListener("keydown", (evt) => {
  const isToggle = (evt.ctrlKey || evt.metaKey) && (evt.key === "e" || evt.key === "E");
  if (!isToggle) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  evt.preventDefault();
  if (!isEditMode && !canEdit()) {
    openAuth();
    if (authStatusEl) authStatusEl.textContent = "Login required for edit mode.";
    return;
  }
  setMode(!isEditMode);
});

window.addEventListener("keydown", (evt) => {
  const isLogin = (evt.ctrlKey || evt.metaKey) && (evt.key === "l" || evt.key === "L");
  if (!isLogin) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  evt.preventDefault();
  openAuth();
});

window.addEventListener("keydown", (evt) => {
  if (!isEditMode) return;
  const isUndo = (evt.ctrlKey || evt.metaKey) && (evt.key === "z" || evt.key === "Z");
  if (!isUndo) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  if (!undoStack.length) return;
  evt.preventDefault();
  historySuspended = true;
  const snapshot = undoStack.pop();
  if (!snapshot) {
    historySuspended = false;
    return;
  }
	  try {
		    currentScreenObj = JSON.parse(snapshot);
		    screenCache.set(currentScreenId, currentScreenObj);
		    selectedIndices = [];
		    groupEditStack.length = 0;
		    clearSelectedPolygonVertex();
		    renderScreen();
		    scheduleWsSubscribeRefresh();
		    syncEditorFromScreen();
		    updateSelectionOverlays();
		    updatePropertiesPanel();
	      updateGroupBreadcrumb();
	    refreshViewportIdOptions();
	    setDirty(true);
  } catch {
    // ignore parse errors
  } finally {
    historySuspended = false;
  }
});

window.addEventListener("keydown", (evt) => {
  if (!isEditMode) return;
  if (evt.key !== "Escape") return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  evt.preventDefault();
  cancelEditingGesture();
  if (currentTool !== "select") setTool("select");
  updateSelectionOverlays();
  updatePropertiesPanel();
});

window.addEventListener("keydown", (evt) => {
  if (!isEditMode) return;
  const isCopy = (evt.ctrlKey || evt.metaKey) && (evt.key === "c" || evt.key === "C");
  if (!isCopy) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!selectedIndices.length) return;
  evt.preventDefault();
  const targets = selectedIndices.map((idx) => activeObjects[idx]).filter(Boolean);
  const bounds = targets.map(getObjectBounds).filter(Boolean);
  if (!bounds.length) return;
  const left = Math.min(...bounds.map((b) => b.x));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const top = Math.min(...bounds.map((b) => b.y));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  clipboardBounds = { x: left, y: top, width: right - left, height: bottom - top };
  clipboardObjects = targets.map((obj) => {
    const clone = JSON.parse(JSON.stringify(obj));
    translateObject(clone, -left, -top);
    return clone;
  });
});

window.addEventListener("keydown", (evt) => {
  if (!isEditMode) return;
  const isPaste = (evt.ctrlKey || evt.metaKey) && (evt.key === "v" || evt.key === "V");
  if (!isPaste) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!clipboardObjects.length) return;
  evt.preventDefault();
  recordHistory();
  const pasteScreenPoint = lastMouseScreenPoint;
  const rawAnchor = pasteScreenPoint ? toActivePoint(pasteScreenPoint) : { x: 10, y: 10 };
  const anchor = {
    x: snapValue(Math.round(rawAnchor.x)),
    y: snapValue(Math.round(rawAnchor.y))
  };
  const clones = clipboardObjects.map((obj) => JSON.parse(JSON.stringify(obj)));
  clones.forEach((obj) => translateObject(obj, anchor.x, anchor.y));
  const startIndex = activeObjects.length;
  activeObjects.push(...clones);
  selectedIndices = clones.map((_, offset) => startIndex + offset);
  renderScreen();
  syncEditorFromScreen();
  updateSelectionOverlays();
  updatePropertiesPanel();
  setDirty(true);
  refreshViewportIdOptions();
});

window.addEventListener("keydown", (evt) => {
  if (!isEditMode) return;
  const isDelete = evt.key === "Delete" || evt.key === "Backspace";
  if (!isDelete) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
  if (typing) return;
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (!selectedIndices.length) return;
  evt.preventDefault();
	  recordHistory();
	  const deleteSet = new Set(selectedIndices);
	  setActiveObjects(activeObjects.filter((_, index) => !deleteSet.has(index)));
	  selectedIndices = [];
	  clearSelectedPolygonVertex();
	  renderScreen();
	  syncEditorFromScreen();
	  setDirty(true);
	  refreshViewportIdOptions();
	});

	window.addEventListener("keydown", (evt) => {
	  if (!isEditMode) return;
	  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(evt.key)) return;
	  const el = document.activeElement;
	  const tag = el?.tagName?.toLowerCase?.() || "";
	  const typing = (tag === "input" || tag === "textarea" || el?.isContentEditable);
	  if (typing) return;
	  const activeObjects = getActiveObjects();
	  if (!activeObjects || !Array.isArray(activeObjects)) return;
	  if (!selectedIndices.length) return;
	  syncSelectedPolygonVertex();
	  evt.preventDefault();
	  recordHistory();
	  const delta = {
	    ArrowUp: { x: 0, y: -1 },
	    ArrowDown: { x: 0, y: 1 },
	    ArrowLeft: { x: -1, y: 0 },
	    ArrowRight: { x: 1, y: 0 }
	  }[evt.key];
	  if (selectedPolygonVertex && selectedIndices.length === 1 && selectedIndices[0] === selectedPolygonVertex.objectIndex) {
	    const obj = activeObjects[selectedPolygonVertex.objectIndex];
	    if (obj?.type === "polygon") {
	      const points = Array.isArray(obj.points) ? obj.points : [];
	      const vertexIndex = selectedPolygonVertex.vertexIndex;
	      const pt = points[vertexIndex];
	      if (pt) {
	        points[vertexIndex] = {
	          x: snapValue(Math.round(Number(pt.x ?? 0) + delta.x)),
	          y: snapValue(Math.round(Number(pt.y ?? 0) + delta.y))
	        };
	        obj.points = points;
	        renderScreen();
	        syncEditorFromScreen();
	        updateSelectionOverlays();
	        updatePropertiesPanel();
	        setDirty(true);
	        return;
	      }
	    }
	  }
	  selectedIndices.forEach((index) => {
		    const obj = activeObjects[index];
		    if (!obj) return;
		    if (obj.type === "line") {
		      obj.x1 = snapValue(Math.round((obj.x1 ?? 0) + delta.x));
		      obj.y1 = snapValue(Math.round((obj.y1 ?? 0) + delta.y));
	      obj.x2 = snapValue(Math.round((obj.x2 ?? 0) + delta.x));
	      obj.y2 = snapValue(Math.round((obj.y2 ?? 0) + delta.y));
	      return;
	    }
	    if (obj.type === "polyline" || obj.type === "polygon") {
	      const points = Array.isArray(obj.points) ? obj.points : [];
	      obj.points = points.map((pt) => ({
	        x: snapValue(Math.round(Number(pt?.x ?? 0) + delta.x)),
	        y: snapValue(Math.round(Number(pt?.y ?? 0) + delta.y))
	      }));
	      return;
	    }
	    if (obj.x != null || obj.y != null) {
	      obj.x = snapValue(Math.round((obj.x ?? 0) + delta.x));
	      obj.y = snapValue(Math.round((obj.y ?? 0) + delta.y));
	      return;
	    }
	    if (obj.cx != null || obj.cy != null) {
	      obj.cx = snapValue(Math.round((obj.cx ?? 0) + delta.x));
	      obj.cy = snapValue(Math.round((obj.cy ?? 0) + delta.y));
	    }
	  });
	  renderScreen();
	  syncEditorFromScreen();
	  updateSelectionOverlays();
	  updatePropertiesPanel();
	  setDirty(true);
	});

const bindEnterToApply = () => {
  if (!editorPane) return;
  editorPane.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tag = target.tagName.toLowerCase();
    if (tag === "textarea") return;
    if (tag === "input" || tag === "select") {
      event.preventDefault();
      target.blur();
    }
  });
};

const applyEditorWidth = (value) => {
  const nextWidth = Math.max(280, Math.min(value, Math.floor(window.innerWidth * 0.6)));
  document.documentElement.style.setProperty("--editor-pane-width", `${nextWidth}px`);
  try {
    window.localStorage.setItem(EDITOR_WIDTH_KEY, String(nextWidth));
  } catch {
    /* ignore storage errors */
  }
};

const restoreEditorWidth = () => {
  try {
    const saved = Number(window.localStorage.getItem(EDITOR_WIDTH_KEY));
    if (Number.isFinite(saved) && saved > 0) {
      applyEditorWidth(saved);
    }
  } catch {
    /* ignore storage errors */
  }
};

const bindResizer = () => {
  if (!editorResizer || !editorPane) return;
  let startX = 0;
  let startWidth = 0;
  let isResizing = false;

  const onMove = (event) => {
    if (!isResizing) return;
    const delta = event.clientX - startX;
    applyEditorWidth(startWidth - delta);
  };

  const onUp = () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  editorResizer.addEventListener("mousedown", (event) => {
    if (!isEditMode) return;
    isResizing = true;
    startX = event.clientX;
    startWidth = editorPane.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
};

window.addEventListener("resize", applyScale);

const loadJsonc = async () => {
  if (!jsoncEditor) return;
  if (lastLoadedFilename === currentScreenFilename) return;
  lastLoadedFilename = currentScreenFilename;
  if (editorStatus) editorStatus.textContent = `Loading ${currentScreenFilename}...`;
  try {
    const response = await fetch(`/api/screens/${encodeURIComponent(currentScreenId)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const raw = data.raw || "";
    jsoncEditor.value = raw;
    try {
      currentScreenObj = parseJsonc(raw);
      const migrateButtonFlags = (objects) => {
        if (!Array.isArray(objects)) return;
        objects.forEach((obj) => {
          if (!obj || typeof obj !== "object") return;
          if (obj.type === "group") {
            migrateButtonFlags(obj.children);
            return;
          }
          if (obj.type !== "button") return;
          if ("raised" in obj && !("shadow" in obj) && !("bevel" in obj)) {
            obj.shadow = Boolean(obj.raised);
            delete obj.raised;
          }
        });
      };
      migrateButtonFlags(currentScreenObj?.objects);
      screenCache.set(currentScreenId, currentScreenObj);
      selectedIndices = [];
      groupEditStack.length = 0;
      undoStack.length = 0;
      recordHistory();
      renderScreen();
      refreshAlarmsForScreenLoad();
      scheduleWsSubscribeRefresh();
      updateGroupBreadcrumb();
      refreshViewportIdOptions();
      ensureRuntimeHistoryForCurrentScreen();
      if (editorStatus) editorStatus.textContent = `Loaded ${currentScreenFilename}.`;
      setDirty(false);
    } catch (parseError) {
      currentScreenObj = null;
      if (editorStatus) {
        editorStatus.textContent = `Parse error in ${currentScreenFilename}: ${parseError.message}`;
      }
    }
  } catch (error) {
    if (editorStatus) {
      editorStatus.textContent = `Failed to load ${currentScreenFilename}: ${error.message}`;
    }
  }
};

const setEditorTab = (nextTab) => {
  const tabs = Array.from(document.querySelectorAll(".editor-tab"));
  const panels = Array.from(document.querySelectorAll(".editor-panel"));
  currentTab = nextTab;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === nextTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === nextTab);
  });
  if (nextTab === "jsonc") {
    loadJsonc();
  }
};

const bindEditorTabs = () => {
  const tabs = Array.from(document.querySelectorAll(".editor-tab"));
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setEditorTab(tab.dataset.tab || "library");
    });
  });
  setEditorTab(currentTab);
};

restoreEditorWidth();
bindResizer();
bindEditorTabs();
bindScreenManager();
bindEnterToApply();
{
  const params = new URLSearchParams(window.location.search);
  const requestedMode = String(params.get("mode") || "").toLowerCase();
  const hashMode = String(window.location.hash || "").replace(/^#/, "").toLowerCase();
  const startInEdit = requestedMode === "edit" || hashMode === "edit";
  setMode(startInEdit && canEdit());
  if (startInEdit) {
    if (requestedMode === "edit") params.delete("mode");
    const nextSearch = params.toString();
    const nextHash = hashMode === "edit" ? "" : window.location.hash;
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextHash}`;
    try {
      window.history.replaceState(null, "", nextUrl);
    } catch {
      /* ignore replaceState failures */
    }
  }
}
loadClientConfig()
  .then(() => {
    if (currentScreenId === DEFAULT_SCREEN_ID && defaultScreenId && defaultScreenId !== DEFAULT_SCREEN_ID) {
      currentScreenId = defaultScreenId;
      currentScreenFilename = `${defaultScreenId}.jsonc`;
    }
    return refreshScreensList();
  })
  .finally(() => {
    connectWebSocket();
    connectAlarmsWebSocket();
  });
loadTags();
loadImageFiles();

if (runtimeBtn) {
  runtimeBtn.addEventListener("click", () => {
    if (!isEditMode) return;
    if (!confirmLoseUnsavedChanges('Switching to runtime')) return;
    setMode(false);
  });
}

if (tagsRefreshBtn) {
  tagsRefreshBtn.addEventListener("click", () => {
    loadTags();
  });
}

if (popupCloseBtn) {
  popupCloseBtn.addEventListener("click", closePopup);
}

if (popupOverlay) {
  popupOverlay.addEventListener("click", (event) => {
    if (event.target === popupOverlay) closePopup();
  });
}

if (setpointCancelBtn) {
  setpointCancelBtn.addEventListener("click", closeSetpointPrompt);
}

if (setpointOkBtn) {
  setpointOkBtn.addEventListener("click", () => {
    submitSetpointPrompt();
  });
}

if (setpointOverlay) {
  setpointOverlay.addEventListener("click", (event) => {
    if (event.target === setpointOverlay) closeSetpointPrompt();
  });
}

if (setpointValueInput) {
  setpointValueInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitSetpointPrompt();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closePopup();
  closeSetpointPrompt();
  closeSettings();
  closeAbout();
  closeAudit();
  closeAlarms();
  closeAuth();
  closeUsers();
  closeKeypad();
});

window.addEventListener("keydown", (event) => {
  if (isEditMode) return;
  const isBack = event.altKey && !event.ctrlKey && !event.metaKey && event.key === "ArrowLeft";
  const isForward = event.altKey && !event.ctrlKey && !event.metaKey && event.key === "ArrowRight";
  if (!isBack && !isForward) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable;
  if (typing) return;
  event.preventDefault();
  if (isBack) runtimeGoBack();
  else runtimeGoForward();
});

if (settingsMenuBtn) {
  settingsMenuBtn.addEventListener("click", () => {
    if (!canAdmin()) {
      openAuth();
      if (authStatusEl) authStatusEl.textContent = "Admin login required for Settings.";
      setMenuOpen(false);
      return;
    }
    openSettings();
    setMenuOpen(false);
  });
}

if (aboutMenuBtn) {
  aboutMenuBtn.addEventListener("click", () => {
    openAbout();
  });
}

if (loginMenuBtn) {
  loginMenuBtn.addEventListener("click", () => {
    openAuth();
  });
}

if (usersMenuBtn) {
  usersMenuBtn.addEventListener("click", () => {
    openUsers();
  });
}

if (auditMenuBtn) {
  auditMenuBtn.addEventListener("click", () => {
    openAudit();
  });
}

if (alarmsMenuBtn) {
  alarmsMenuBtn.addEventListener("click", () => {
    openAlarms();
  });
}

if (alarmsBadge) {
  alarmsBadge.addEventListener("click", () => {
    openAlarms();
  });
}

if (logoutMenuBtn) {
  logoutMenuBtn.addEventListener("click", async () => {
    clearAuthSession();
    if (isEditMode) setMode(false);
    closeSettings();
    closeUsers();
    closeAudit();
    closeAlarms();
    closeAuth();
    updateAuthUiVisibility();
    setMenuOpen(false);
  });
}

if (settingsCloseBtn) {
  settingsCloseBtn.addEventListener("click", closeSettings);
}

if (settingsOverlay) {
  settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) closeSettings();
  });
}

if (settingsTestBtn) {
  settingsTestBtn.addEventListener("click", testSettings);
}

if (settingsSaveBtn) {
  settingsSaveBtn.addEventListener("click", () => {
    saveSettings(false);
  });
}

if (settingsApplyBtn) {
  settingsApplyBtn.addEventListener("click", () => {
    saveSettings(true);
  });
}

if (aboutCloseBtn) aboutCloseBtn.addEventListener("click", closeAbout);
if (aboutRefreshBtn) aboutRefreshBtn.addEventListener("click", refreshAbout);
if (aboutCopyBtn) {
  aboutCopyBtn.addEventListener("click", async () => {
    const text = String(aboutText?.textContent || "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (aboutStatus) aboutStatus.textContent = "Copied.";
    } catch (error) {
      if (aboutStatus) aboutStatus.textContent = `Copy failed: ${error.message}`;
    }
  });
}

if (aboutOverlay) {
  aboutOverlay.addEventListener("click", (event) => {
    if (event.target === aboutOverlay) closeAbout();
  });
}

if (auditCloseBtn) auditCloseBtn.addEventListener("click", closeAudit);
if (auditRefreshBtn) auditRefreshBtn.addEventListener("click", refreshAudit);
if (auditCopyBtn) {
  auditCopyBtn.addEventListener("click", async () => {
    const text = String(lastAuditCopyText || "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (auditStatus) auditStatus.textContent = "Copied.";
    } catch (error) {
      if (auditStatus) auditStatus.textContent = `Copy failed: ${error.message}`;
    }
  });
}

const downloadTextFile = (filename, text) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const csvEscape = (value) => {
  const raw = value === undefined || value === null ? "" : String(value);
  const needsQuotes = /[",\r\n]/.test(raw);
  const cleaned = raw.replace(/"/g, "\"\"");
  return needsQuotes ? `"${cleaned}"` : cleaned;
};

const buildAuditCsv = (records) => {
  const header = ["ts", "ip", "user", "role", "event", "connection_id", "tag", "value"];
  const lines = [header.join(",")];
  (Array.isArray(records) ? records : []).forEach((rec) => {
    const row = [
      rec?.ts || "",
      rec?.ip || "",
      rec?.user || rec?.username || "",
      rec?.role || "",
      rec?.event || "",
      rec?.connection_id || "",
      rec?.tag || "",
      rec?.value ?? ""
    ].map(csvEscape);
    lines.push(row.join(","));
  });
  return `${lines.join("\n")}\n`;
};

if (auditDownloadBtn) {
  auditDownloadBtn.addEventListener("click", () => {
    const records = Array.isArray(lastAuditRecords) ? lastAuditRecords : [];
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `opcbridge-hmi-audit-${stamp}.csv`;
    downloadTextFile(filename, buildAuditCsv(records));
    if (auditStatus) auditStatus.textContent = `Downloaded ${filename}`;
  });
}
if (auditOverlay) {
  auditOverlay.addEventListener("click", (event) => {
    if (event.target === auditOverlay) closeAudit();
  });
}

if (alarmsCloseBtn) alarmsCloseBtn.addEventListener("click", closeAlarms);
if (alarmsRefreshBtn) {
  alarmsRefreshBtn.addEventListener("click", () => {
    if (alarmsStatus) alarmsStatus.textContent = "Refreshing…";
    alarmHistoryLoaded = false;
    connectAlarmsWebSocket();
    loadAlarmTimelineFromHistory();
    loadAlarmsStateFromHttp();
  });
}
if (alarmsOverlay) {
  alarmsOverlay.addEventListener("click", (event) => {
    if (event.target === alarmsOverlay) closeAlarms();
  });
}

if (authCloseBtn) authCloseBtn.addEventListener("click", closeAuth);
if (authRefreshBtn) authRefreshBtn.addEventListener("click", refreshAuthUi);
if (authOverlay) {
  authOverlay.addEventListener("click", (event) => {
    if (event.target === authOverlay) closeAuth();
  });
}

if (usersCloseBtn) usersCloseBtn.addEventListener("click", closeUsers);
if (usersRefreshBtn) usersRefreshBtn.addEventListener("click", refreshUsersUi);
if (usersOverlay) {
  usersOverlay.addEventListener("click", (event) => {
    if (event.target === usersOverlay) closeUsers();
  });
}

if (usersAddUserBtn) {
  usersAddUserBtn.addEventListener("click", async () => {
    if (!canAdmin()) {
      if (usersStatusEl) usersStatusEl.textContent = "Admin login required.";
      return;
    }
    if (usersStatusEl) usersStatusEl.textContent = "Adding…";
    try {
      const username = String(usersAddUsername?.value || "").trim();
      const password = String(usersAddPassword?.value || "");
      const confirm = String(usersAddPasswordConfirm?.value || "");
      if (!username) throw new Error("Username required.");
      if (!password) throw new Error("Password required.");
      if (password !== confirm) throw new Error("Passwords do not match.");
      const role = String(usersAddRole?.value || "operator");
      await apiAuthAddUser({ username, password, role });
      if (usersAddPassword) usersAddPassword.value = "";
      if (usersAddPasswordConfirm) usersAddPasswordConfirm.value = "";
      if (usersAddUsername) usersAddUsername.value = "";
      await refreshUsersUi();
      if (usersStatusEl) usersStatusEl.textContent = "Added.";
    } catch (error) {
      if (usersStatusEl) usersStatusEl.textContent = `Add failed: ${error.message}`;
    }
  });
}

if (usersSaveTimeoutBtn) {
  usersSaveTimeoutBtn.addEventListener("click", async () => {
    if (!canAdmin()) {
      if (usersStatusEl) usersStatusEl.textContent = "Admin login required.";
      return;
    }
    if (usersStatusEl) usersStatusEl.textContent = "Saving…";
    try {
      const timeout = Math.max(0, Math.floor(Number(usersTimeoutMinutes?.value) || 0));
      await apiAuthSaveTimeout(timeout);
      await refreshUsersUi();
      if (usersStatusEl) usersStatusEl.textContent = "Saved.";
    } catch (error) {
      if (usersStatusEl) usersStatusEl.textContent = `Save failed: ${error.message}`;
    }
  });
}

if (authSetupBtn) {
  authSetupBtn.addEventListener("click", async () => {
    if (authStatusEl) authStatusEl.textContent = "Creating…";
    try {
      const username = String(authSetupUsername?.value || "").trim();
      const password = String(authSetupPassword?.value || "");
      const confirm = String(authSetupPasswordConfirm?.value || "");
      if (!username) throw new Error("Username required.");
      if (!password) throw new Error("Password required.");
      if (password !== confirm) throw new Error("Passwords do not match.");
      const timeoutMinutes = Math.max(0, Math.floor(Number(authSetupTimeout?.value) || 0));
      await apiAuthInit({ username, password, timeoutMinutes });
      if (authSetupPassword) authSetupPassword.value = "";
      if (authSetupPasswordConfirm) authSetupPasswordConfirm.value = "";
      await refreshAuthUi();
      if (authStatusEl) authStatusEl.textContent = "Created.";
    } catch (error) {
      if (authStatusEl) authStatusEl.textContent = `Create failed: ${error.message}`;
    }
  });
}

if (authLoginBtn) {
  authLoginBtn.addEventListener("click", async () => {
    if (authStatusEl) authStatusEl.textContent = "Logging in…";
    try {
      const username = String(authUsername?.value || "").trim();
      const password = String(authPassword?.value || "");
      const result = await apiAuthLogin({ username, password });
      if (!result?.ok) throw new Error("Login failed.");
      const session = {
        username: String(result.username || username),
        role: String(result.role || "viewer"),
        timeoutMinutes: Number(result.timeoutMinutes) || 0,
        lastActivityMs: Date.now()
      };
      saveAuthSession(session);
      if (authPassword) authPassword.value = "";
      await refreshAuthUi();
      if (authStatusEl) authStatusEl.textContent = "Logged in.";
      if (session.role === "admin" || session.role === "editor") {
        setMode(true);
        closeAuth();
      }
    } catch (error) {
      clearAuthSession();
      await refreshAuthUi();
      if (authStatusEl) authStatusEl.textContent = `Login failed: ${error.message}`;
    }
  });
}

if (authPassword) {
  authPassword.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    authLoginBtn?.click?.();
  });
}

if (authLogoutBtn) {
  authLogoutBtn.addEventListener("click", async () => {
    clearAuthSession();
    if (isEditMode) setMode(false);
    closeSettings();
    closeUsers();
    await refreshAuthUi();
    if (authStatusEl) authStatusEl.textContent = "Logged out.";
  });
}

window.addEventListener("pointerdown", () => markAuthActivity(), { capture: true });
window.addEventListener("keydown", () => markAuthActivity(), { capture: true });
if (!authActivityTimer) {
  authActivityTimer = window.setInterval(() => {
    if (!authSession) return;
    if (!isAuthSessionExpired()) return;
    clearAuthSession();
    if (isEditMode) setMode(false);
    closeSettings();
    if (authStatusEl) authStatusEl.textContent = "Session expired.";
    updateAuthUiVisibility();
  }, 2000);
}

if (keypadCancelBtn) {
  keypadCancelBtn.addEventListener("click", closeKeypad);
}

if (keypadOverlay) {
  keypadOverlay.addEventListener("click", (event) => {
    if (event.target === keypadOverlay) closeKeypad();
  });
}

document.addEventListener("click", (event) => {
  if (!isKeypadOpen) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const btn = target.closest("[data-keypad]");
  if (!(btn instanceof HTMLElement)) return;
  if (!keypadDisplay) return;

  const action = String(btn.dataset.keypad || "");
  const current = String(keypadDisplay.value || "");
  const setValue = (next) => {
    keypadDisplay.value = next;
    try {
      keypadDisplay.focus();
      keypadDisplay.setSelectionRange(next.length, next.length);
    } catch {
      // ignore
    }
  };

  if (action === "bksp") return setValue(current.slice(0, -1));
  if (action === "clear") return setValue("");
  if (action === "sign") {
    const trimmed = current.trim();
    if (!trimmed) return;
    return setValue(trimmed.startsWith("-") ? trimmed.slice(1) : `-${trimmed}`);
  }
  if (action === "ok") {
    const targetInfo = keypadTarget;
    const raw = String(keypadDisplay.value || "");
    closeKeypad();
    if (targetInfo?.kind === "number-input" && targetInfo.id) {
      writeNumberInputById(String(targetInfo.id), raw).catch((error) => {
        console.error("[keypad] write failed:", error);
      });
    }
    if (targetInfo?.kind === "setpoint") {
      const connectionId = String(targetInfo.connection_id || "").trim();
      const tagName = String(targetInfo.tag || "").trim();
      if (!connectionId || !tagName) return;
      const value = raw === "" ? null : Number(raw);
      if (value == null || !Number.isFinite(value)) return;
      const minValue = parseOptionalNumber(targetInfo.min);
      const maxValue = parseOptionalNumber(targetInfo.max);
      if (minValue != null && value < minValue) return;
      if (maxValue != null && value > maxValue) return;
      apiWriteTag({ connection_id: connectionId, tag: tagName, value }).catch((error) => {
        console.error("[keypad] write failed:", error);
      });
    }
    return;
  }
  if (action === ".") {
    if (current.includes(".")) return;
    return setValue(current ? `${current}.` : "0.");
  }
  if (/^[0-9]$/.test(action)) {
    setValue(`${current}${action}`);
  }
});

const apiWriteTag = async ({ connection_id, tag, value }) => {
  if (isViewOnlyRuntime()) {
    throw new Error("Writes are disabled in view-only mode.");
  }
  const connectionId = String(connection_id || "").trim();
  const tagName = String(tag || "").trim();
  if (!connectionId || !tagName) throw new Error("Missing connection_id or tag.");
  const response = await fetch("/api/opc/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connection_id: connectionId, tag: tagName, value })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${text}`.trim());
  }
  const payload = await response.json().catch(() => ({}));
  const cacheKey = `${connectionId}.${tagName}`;
  if (payload && Object.prototype.hasOwnProperty.call(payload, "value")) {
    tagValueCache.set(cacheKey, payload.value);
  } else {
    tagValueCache.set(cacheKey, value);
  }
  if (!isEditMode) {
    renderScreen();
    if (currentPopupScreenId) openPopup(currentPopupScreenId);
  }
  return payload;
};

const findNumberInputById = (id) => {
  const active = getActiveObjects();
  if (!id || !Array.isArray(active)) return null;
  return active.find((obj) => obj?.type === "number-input" && String(obj.id || "") === String(id));
};

const normalizeNumericString = (raw) => {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  let normalized = trimmed.replace(/\s+/g, "");
  if (normalized.includes(",") && !normalized.includes(".")) {
    normalized = normalized.replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }
  return normalized;
};

const writeNumberInputById = async (id, rawValue) => {
  const obj = findNumberInputById(id);
  const bind = obj?.bindValue || {};
  const connectionId = String(bind.connection_id || "").trim();
  const tagName = String(bind.tag || "").trim();
  if (!connectionId || !tagName) return false;
  const normalized = normalizeNumericString(rawValue);
  if (!normalized) return false;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return false;
  const multiplier = Number.isFinite(Number(bind.multiplier)) ? Number(bind.multiplier) : 1;
  const valueToWrite = multiplier && multiplier !== 0 ? numeric / multiplier : numeric;
  await apiWriteTag({ connection_id: connectionId, tag: tagName, value: valueToWrite });
  return true;
};

const commitNumberInputValue = async (inputEl) => {
  if (!inputEl) return;
  if (isTouchscreenRuntime() || isViewOnlyRuntime()) return;
  const id = String(inputEl.dataset?.hmiInputId || "");
  const raw = String(inputEl.value ?? "").trim();
  if (!raw) return;
  if (inputEl.dataset.hmiLastCommitted === raw) return;
  try {
    await writeNumberInputById(id, raw);
    inputEl.dataset.hmiLastCommitted = raw;
  } catch (error) {
    console.error("[number-input] write failed:", error);
  }
};

const openKeypad = (opts) => {
  if (!keypadOverlay || !keypadDisplay) return;
  keypadTarget = opts || null;
  isKeypadOpen = true;
  if (keypadTitle) keypadTitle.textContent = String(opts?.title || "Enter value");
  keypadDisplay.value = String(opts?.value ?? "");
  setOverlayOpen(keypadOverlay, true);
  try {
    keypadDisplay.focus();
    keypadDisplay.setSelectionRange(keypadDisplay.value.length, keypadDisplay.value.length);
  } catch {
    // ignore
  }
};

function closeKeypad() {
  isKeypadOpen = false;
  keypadTarget = null;
  setOverlayOpen(keypadOverlay, false);
}

const wireNumberInputs = () => {
  if (!hmiSvg || isEditMode) return;
  const inputs = hmiSvg.querySelectorAll('input[data-hmi-input-kind="number-input"]');
  inputs.forEach((inputEl) => {
    if (!(inputEl instanceof HTMLInputElement)) return;
    if (inputEl.dataset.hmiWired === "1") return;
    inputEl.dataset.hmiWired = "1";
    inputEl.addEventListener("click", (event) => {
      if (isViewOnlyRuntime()) {
        event.preventDefault();
        event.stopPropagation();
        inputEl.blur();
        return;
      }
      if (!isTouchscreenRuntime()) return;
      event.preventDefault();
      event.stopPropagation();
      inputEl.blur();
      const id = String(inputEl.dataset?.hmiInputId || "");
      if (!id) return;
      openKeypad({
        kind: "number-input",
        id,
        value: String(inputEl.value ?? ""),
        title: "Enter value"
      });
    });
    inputEl.addEventListener("keydown", (event) => {
      if (isTouchscreenRuntime() || isViewOnlyRuntime()) return;
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitNumberInputValue(inputEl);
      inputEl.blur();
    });
    inputEl.addEventListener("focus", () => {
      if (isTouchscreenRuntime() || isViewOnlyRuntime()) return;
      try {
        inputEl.select();
      } catch {
        // ignore
      }
    });
    inputEl.addEventListener("change", () => {
      if (isTouchscreenRuntime() || isViewOnlyRuntime()) return;
      commitNumberInputValue(inputEl);
    });
    inputEl.addEventListener("blur", () => {
      if (isTouchscreenRuntime() || isViewOnlyRuntime()) return;
      commitNumberInputValue(inputEl);
    });
  });
};

const matchesToggleOnValue = (rawValue, onValue) => {
  if (typeof rawValue === "boolean") return rawValue;
  const rawNum = coerceTagNumber(rawValue);
  const onNum = coerceTagNumber(onValue);
  if (rawNum !== null && onNum !== null) return rawNum === onNum;
  const rawStr = String(rawValue ?? "").trim().toLowerCase();
  const onStr = String(onValue ?? "").trim().toLowerCase();
  return rawStr !== "" && rawStr === onStr;
};

const runToggleWriteAction = async (action) => {
  if (!action) return;
  if (isViewOnlyRuntime()) return;
  const connectionId = String(action.connection_id || "").trim();
  const tagName = String(action.tag || "").trim();
  if (!connectionId || !tagName) return;
  const key = `${connectionId}.${tagName}`;
  const rawValue = tagValueCache.get(key);
  const isOn = matchesToggleOnValue(rawValue, action.onValue);
  const valueToWrite = isOn ? action.offValue : action.onValue;
  await apiWriteTag({ connection_id: connectionId, tag: tagName, value: valueToWrite });
};

const runSetWriteAction = async (action) => {
  if (!action) return;
  if (isViewOnlyRuntime()) return;
  const connectionId = String(action.connection_id || "").trim();
  const tagName = String(action.tag || "").trim();
  if (!connectionId || !tagName) return;
  const key = `${connectionId}.${tagName}`;
  const rawValue = tagValueCache.get(key);
  const isOn = matchesToggleOnValue(rawValue, action.onValue);
  if (isOn) return;
  await apiWriteTag({ connection_id: connectionId, tag: tagName, value: action.onValue });
};

const getWriteActionActiveState = (action) => {
  if (!action) return false;
  const connectionId = String(action.connection_id || "").trim();
  const tagName = String(action.tag || "").trim();
  if (!connectionId || !tagName) return false;
  const rawValue = tagValueCache.get(`${connectionId}.${tagName}`);
  return matchesToggleOnValue(rawValue, action.onValue);
};

const updateSnapButton = () => {
  if (!snapToggleBtn) return;
  snapToggleBtn.classList.toggle("is-active", snapEnabled);
};

if (snapToggleBtn) {
  snapToggleBtn.addEventListener("click", () => {
    snapEnabled = !snapEnabled;
    updateSnapButton();
  });
}

if (jsoncApplyBtn) jsoncApplyBtn.addEventListener("click", applyJsoncEditor);
if (jsoncSaveBtn) jsoncSaveBtn.addEventListener("click", saveJsoncEditor);
if (jsoncReloadBtn) jsoncReloadBtn.addEventListener("click", () => {
  if (!confirmLoseUnsavedChanges('Reloading')) return;
  reloadJsoncEditor();
});
if (screenSaveBtn) screenSaveBtn.addEventListener("click", saveJsoncEditor);
if (jsoncEditor) {
  jsoncEditor.addEventListener("input", () => {
    setDirty(true);
  });
}

if (screenWidthInput) {
  screenWidthInput.addEventListener("change", () => {
    const value = Number(screenWidthInput.value);
    if (Number.isFinite(value) && value > 0) {
      updateScreenProperty({ width: value });
    }
  });
}

if (screenHeightInput) {
  screenHeightInput.addEventListener("change", () => {
    const value = Number(screenHeightInput.value);
    if (Number.isFinite(value) && value > 0) {
      updateScreenProperty({ height: value });
    }
  });
}

if (screenBgInput) {
  screenBgInput.addEventListener("input", () => {
    updateScreenProperty({ background: screenBgInput.value });
    if (screenBgTextInput) screenBgTextInput.value = screenBgInput.value;
  });
}

if (screenBgTextInput) {
  screenBgTextInput.addEventListener("change", () => {
    const value = screenBgTextInput.value.trim();
    if (value) {
      updateScreenProperty({ background: value });
      if (screenBgInput) screenBgInput.value = value;
    }
  });
}

if (screenBorderEnabledInput) {
  screenBorderEnabledInput.addEventListener("change", () => {
    if (screenBorderColorRow) screenBorderColorRow.classList.toggle("is-hidden", !screenBorderEnabledInput.checked);
    if (screenBorderWidthRow) screenBorderWidthRow.classList.toggle("is-hidden", !screenBorderEnabledInput.checked);
    updateScreenBorder({ enabled: screenBorderEnabledInput.checked });
  });
}

if (screenBorderColorInput) {
  screenBorderColorInput.addEventListener("input", () => {
    updateScreenBorder({ color: screenBorderColorInput.value });
    if (screenBorderColorTextInput) screenBorderColorTextInput.value = screenBorderColorInput.value;
  });
}

if (screenBorderColorTextInput) {
  screenBorderColorTextInput.addEventListener("change", () => {
    const value = screenBorderColorTextInput.value.trim();
    if (value) {
      updateScreenBorder({ color: value });
      if (screenBorderColorInput) screenBorderColorInput.value = value;
    }
  });
}

  if (screenBorderWidthInput) {
    screenBorderWidthInput.addEventListener("change", () => {
      const value = Number(screenBorderWidthInput.value);
      if (Number.isFinite(value) && value >= 0) {
        updateScreenBorder({ width: value });
      }
    });
  }

  let textValueAutosizeSession = null;
  let buttonLabelAutosizeSession = null;

  if (textValueInput) {
    textValueInput.addEventListener("focus", () => {
      const activeObjects = getActiveObjects();
      const obj = selectedIndices.length === 1 ? activeObjects?.[selectedIndices[0]] : null;
      if (!obj || obj.type !== "text") return;
      textValueAutosizeSession = { obj, value: textValueInput.value };
    });
    textValueInput.addEventListener("blur", () => {
      if (!textValueAutosizeSession) return;
      const { obj, value } = textValueAutosizeSession;
      textValueAutosizeSession = null;
      if (textValueInput.value === value) return;
      const patch = autosizeTextObject(obj);
      if (!patch) return;
      const currentW = Number(obj.w ?? NaN);
      const currentH = Number(obj.h ?? NaN);
      if (currentW === patch.w && currentH === patch.h) return;
      recordHistory();
      Object.assign(obj, patch);
      renderScreen();
      syncEditorFromScreen();
      setDirty(true);
    });
    textValueInput.addEventListener("input", () => {
      updateTextProperty({ text: textValueInput.value });
    });
  }

if (textFontSizeInput) {
  textFontSizeInput.addEventListener("change", () => {
    const value = Number(textFontSizeInput.value);
    if (Number.isFinite(value) && value > 0) {
      updateTextProperty({ fontSize: value });
    }
  });
}

if (textBoldInput) {
  textBoldInput.addEventListener("change", () => {
    updateTextProperty({ bold: textBoldInput.checked });
  });
}

if (textFillInput) {
  textFillInput.addEventListener("input", () => {
    updateTextProperty({ fill: textFillInput.value });
    if (textFillTextInput) textFillTextInput.value = textFillInput.value;
  });
}

if (textFillTextInput) {
  textFillTextInput.addEventListener("change", () => {
    const value = textFillTextInput.value.trim();
    if (value) {
      updateTextProperty({ fill: value });
      if (textFillInput) textFillInput.value = value;
    }
  });
}

if (textBgInput) {
  textBgInput.addEventListener("input", () => {
    updateTextProperty({ background: textBgInput.value });
    if (textBgTextInput) textBgTextInput.value = textBgInput.value;
  });
}

if (textBgTextInput) {
  textBgTextInput.addEventListener("change", () => {
    const value = textBgTextInput.value.trim();
    if (value) {
      updateTextProperty({ background: value });
      if (textBgInput) textBgInput.value = value;
    }
  });
}

if (textAlignSelect) {
  textAlignSelect.addEventListener("change", () => {
    updateTextProperty({ align: textAlignSelect.value });
  });
}

if (textValignSelect) {
  textValignSelect.addEventListener("change", () => {
    updateTextProperty({ valign: textValignSelect.value });
  });
}

if (textBindConnectionInput) {
  textBindConnectionInput.addEventListener("change", () => {
    updateTextBindProperty({ connection_id: textBindConnectionInput.value.trim() });
  });
}

if (textBindTagSelect) {
  textBindTagSelect.addEventListener("change", () => {
    const value = textBindTagSelect.value;
    if (!value) {
      updateTextBindProperty({ tag: "", connection_id: textBindConnectionInput?.value?.trim() || "" });
      return;
    }
    const [connectionId, tagName] = value.split("::");
    if (textBindConnectionInput) textBindConnectionInput.value = connectionId || "";
    updateTextBindProperty({ connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (textBindDigitsInput) {
  textBindDigitsInput.addEventListener("input", () => {
    const value = Number(textBindDigitsInput.value);
    updateTextBindProperty({ digits: Number.isFinite(value) ? value : "" });
  });
}

if (textBindDecimalsInput) {
  textBindDecimalsInput.addEventListener("input", () => {
    const value = Number(textBindDecimalsInput.value);
    updateTextBindProperty({ decimals: Number.isFinite(value) ? value : 0 });
  });
}

if (textBindMultiplierInput) {
  textBindMultiplierInput.addEventListener("input", () => {
    const value = Number(textBindMultiplierInput.value);
    updateTextBindProperty({ multiplier: Number.isFinite(value) ? value : 1 });
  });
}

if (textBorderColorInput) {
  textBorderColorInput.addEventListener("input", () => {
    updateTextProperty({ borderColor: textBorderColorInput.value });
    if (textBorderColorTextInput) textBorderColorTextInput.value = textBorderColorInput.value;
  });
}

if (textBorderColorTextInput) {
  textBorderColorTextInput.addEventListener("change", () => {
    const value = textBorderColorTextInput.value.trim();
    if (value) {
      updateTextProperty({ borderColor: value });
      if (textBorderColorInput) textBorderColorInput.value = value;
    }
  });
}

  if (textRadiusInput) {
    textRadiusInput.addEventListener("change", () => {
      const value = Number(textRadiusInput.value);
      if (Number.isFinite(value) && value >= 0) {
        updateTextProperty({ rx: value });
      }
    });
  }

if (buttonLabelInput) {
  buttonLabelInput.addEventListener("focus", () => {
    const activeObjects = getActiveObjects();
    const obj = selectedIndices.length === 1 ? activeObjects?.[selectedIndices[0]] : null;
    if (!obj || obj.type !== "button") return;
    buttonLabelAutosizeSession = { obj, value: buttonLabelInput.value };
  });
	    buttonLabelInput.addEventListener("blur", () => {
	      if (!buttonLabelAutosizeSession) return;
	      const { obj, value } = buttonLabelAutosizeSession;
	      buttonLabelAutosizeSession = null;
	      if (buttonLabelInput.value === value) return;
	      const patch = autosizeButtonObject(obj);
	      if (!patch) return;
	      const currentW = Number(obj.w ?? NaN);
	      const currentH = Number(obj.h ?? NaN);
	      const nextW = Number.isFinite(currentW) ? Math.max(currentW, patch.w) : patch.w;
	      const nextH = Number.isFinite(currentH) ? Math.max(currentH, patch.h) : patch.h;
	      if (currentW === nextW && currentH === nextH) return;
	      recordHistory();
	      Object.assign(obj, { w: nextW, h: nextH });
	      renderScreen();
	      syncEditorFromScreen();
	      setDirty(true);
	    });
    buttonLabelInput.addEventListener("input", () => {
      updateButtonProperty({ label: buttonLabelInput.value });
  });
}

if (buttonLabelBindConnectionInput) {
  buttonLabelBindConnectionInput.addEventListener("change", () => {
    updateButtonLabelBindProperty({ connection_id: buttonLabelBindConnectionInput.value.trim() });
  });
}

if (buttonLabelBindTagSelect) {
  buttonLabelBindTagSelect.addEventListener("change", () => {
    const value = buttonLabelBindTagSelect.value;
    if (!value) {
      updateButtonLabelBindProperty({ tag: "", connection_id: buttonLabelBindConnectionInput?.value?.trim() || "" });
      return;
    }
    const [connectionId, tagName] = value.split("::");
    if (buttonLabelBindConnectionInput) buttonLabelBindConnectionInput.value = connectionId || "";
    updateButtonLabelBindProperty({ connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (buttonLabelBindDigitsInput) {
  buttonLabelBindDigitsInput.addEventListener("input", () => {
    const value = Number(buttonLabelBindDigitsInput.value);
    updateButtonLabelBindProperty({ digits: Number.isFinite(value) ? value : "" });
  });
}

if (buttonLabelBindDecimalsInput) {
  buttonLabelBindDecimalsInput.addEventListener("input", () => {
    const value = Number(buttonLabelBindDecimalsInput.value);
    updateButtonLabelBindProperty({ decimals: Number.isFinite(value) ? value : 0 });
  });
}

if (buttonLabelBindMultiplierInput) {
  buttonLabelBindMultiplierInput.addEventListener("input", () => {
    const value = Number(buttonLabelBindMultiplierInput.value);
    updateButtonLabelBindProperty({ multiplier: Number.isFinite(value) ? value : 1 });
  });
}

if (buttonActionSelect) {
  buttonActionSelect.addEventListener("change", () => {
    const actionType = buttonActionSelect.value || "navigate";
    const screenId = buttonTargetSelect?.value || availableScreens[0]?.id || "";
    const viewportId = buttonViewportSelect?.value || "";
    const promptDefaults = {
      defaultValue: parseOptionalNumber(buttonPromptDefaultInput?.value),
      min: parseOptionalNumber(buttonPromptMinInput?.value),
      max: parseOptionalNumber(buttonPromptMaxInput?.value),
      step: parseOptionalNumber(buttonPromptStepInput?.value)
    };
	    const action = actionType === "load-viewport"
	      ? { type: "load-viewport", viewportId, screenId }
	      : actionType === "popup"
	        ? { type: "popup", screenId }
	        : actionType === "history-back"
	          ? { type: "history-back" }
	          : actionType === "history-forward"
	            ? { type: "history-forward" }
	        : actionType === "prompt-write"
	          ? {
	            type: "prompt-write",
	            connection_id: buttonWriteConnectionInput?.value?.trim() || "",
            tag: (parseTagSelectValue(buttonWriteTagSelect?.value || "").tag) || "",
            ...promptDefaults
          }
        : actionType === "set-write"
          ? {
            type: "set-write",
            connection_id: buttonWriteConnectionInput?.value?.trim() || "",
            tag: (parseTagSelectValue(buttonWriteTagSelect?.value || "").tag) || "",
            onValue: buttonWriteOnValueInput?.value ?? "1"
          }
        : actionType === "toggle-write"
          ? {
            type: "toggle-write",
            connection_id: buttonWriteConnectionInput?.value?.trim() || "",
            tag: (parseTagSelectValue(buttonWriteTagSelect?.value || "").tag) || "",
            onValue: buttonWriteOnValueInput?.value ?? "1",
            offValue: buttonWriteOffValueInput?.value ?? "0"
          }
        : actionType === "momentary-write"
          ? {
            type: "momentary-write",
            connection_id: buttonWriteConnectionInput?.value?.trim() || "",
            tag: (parseTagSelectValue(buttonWriteTagSelect?.value || "").tag) || "",
            onValue: buttonWriteOnValueInput?.value ?? "1",
            offValue: buttonWriteOffValueInput?.value ?? "0"
          }
          : { type: "navigate", screenId };
    updateButtonProperty({ action });
    updateButtonActionUI(actionType);
  });
}

if (buttonTargetSelect) {
  buttonTargetSelect.addEventListener("change", () => {
    const actionType = buttonActionSelect?.value || "navigate";
    if (actionType === "momentary-write" || actionType === "toggle-write" || actionType === "set-write" || actionType === "prompt-write") return;
    if (actionType === "history-back" || actionType === "history-forward") return;
    const screenId = buttonTargetSelect.value;
    const viewportId = buttonViewportSelect?.value || "";
    const action = actionType === "load-viewport"
      ? { type: "load-viewport", viewportId, screenId }
      : actionType === "popup"
        ? { type: "popup", screenId }
      : { type: "navigate", screenId };
    updateButtonProperty({ action });
  });
}

if (buttonViewportSelect) {
  buttonViewportSelect.addEventListener("change", () => {
    const actionType = buttonActionSelect?.value || "navigate";
    if (actionType !== "load-viewport") return;
    const screenId = buttonTargetSelect?.value || "";
    const viewportId = buttonViewportSelect.value;
    updateButtonProperty({ action: { type: "load-viewport", viewportId, screenId } });
  });
}

const updateSelectedGroupAction = (patch) => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return;
  if (selectedIndices.length !== 1) return;
  const obj = activeObjects[selectedIndices[0]];
  if (!obj || obj.type !== "group") return;
  recordHistory();
  const next = { ...(obj.action || {}), ...patch };
  if (!next.type) {
    delete obj.action;
  } else {
    obj.action = next;
  }
  renderScreen();
  syncEditorFromScreen();
  setDirty(true);
};

if (groupXInput) {
  groupXInput.addEventListener("change", () => {
    const value = Number(groupXInput.value);
    if (Number.isFinite(value)) updateGroupProperty({ x: value });
  });
}

if (groupYInput) {
  groupYInput.addEventListener("change", () => {
    const value = Number(groupYInput.value);
    if (Number.isFinite(value)) updateGroupProperty({ y: value });
  });
}

if (groupWInput) {
  groupWInput.addEventListener("change", () => {
    const value = Number(groupWInput.value);
    if (Number.isFinite(value) && value > 0) updateGroupProperty({ w: value });
  });
}

if (groupHInput) {
  groupHInput.addEventListener("change", () => {
    const value = Number(groupHInput.value);
    if (Number.isFinite(value) && value > 0) updateGroupProperty({ h: value });
  });
}

if (groupActionTypeSelect) {
  groupActionTypeSelect.addEventListener("change", () => {
    const nextType = String(groupActionTypeSelect.value || "");
    setGroupActionRows(nextType);
    if (!nextType) {
      updateSelectedGroupAction({ type: "" });
      return;
    }
    if (nextType === "load-viewport") {
      const viewportId = groupActionViewportIdSelect?.value || getViewportIds()[0] || "";
      const screenId = groupActionScreenIdSelect?.value || availableScreens[0]?.id || DEFAULT_SCREEN_ID;
      updateSelectedGroupAction({ type: "load-viewport", viewportId, screenId });
      return;
    }
    const screenId = groupActionScreenIdSelect?.value || availableScreens[0]?.id || DEFAULT_SCREEN_ID;
    updateSelectedGroupAction({ type: nextType, screenId });
  });
}

if (groupActionViewportIdSelect) {
  groupActionViewportIdSelect.addEventListener("change", () => {
    if (groupActionTypeSelect?.value !== "load-viewport") return;
    const viewportId = groupActionViewportIdSelect.value || "";
    const screenId = groupActionScreenIdSelect?.value || "";
    updateSelectedGroupAction({ type: "load-viewport", viewportId, screenId });
  });
}

if (groupActionScreenIdSelect) {
  groupActionScreenIdSelect.addEventListener("change", () => {
    const type = String(groupActionTypeSelect?.value || "");
    if (!type) return;
    const screenId = groupActionScreenIdSelect.value || "";
    if (type === "load-viewport") {
      const viewportId = groupActionViewportIdSelect?.value || "";
      updateSelectedGroupAction({ type: "load-viewport", viewportId, screenId });
      return;
    }
    updateSelectedGroupAction({ type, screenId });
  });
}

if (buttonWriteConnectionInput) {
  buttonWriteConnectionInput.addEventListener("change", () => {
    const actionType = buttonActionSelect.value;
    if (actionType !== "momentary-write" && actionType !== "toggle-write" && actionType !== "set-write" && actionType !== "prompt-write") return;
    const active = parseTagSelectValue(buttonWriteTagSelect?.value || "");
    const base = {
      type: actionType,
      connection_id: buttonWriteConnectionInput.value.trim(),
      tag: active.tag || ""
    };
    if (actionType === "prompt-write") {
      updateButtonProperty({
        action: {
          ...base,
          defaultValue: parseOptionalNumber(buttonPromptDefaultInput?.value),
          min: parseOptionalNumber(buttonPromptMinInput?.value),
          max: parseOptionalNumber(buttonPromptMaxInput?.value),
          step: parseOptionalNumber(buttonPromptStepInput?.value)
        }
      });
      return;
    }
    updateButtonProperty({
      action: actionType === "set-write"
        ? {
          ...base,
          onValue: buttonWriteOnValueInput?.value ?? "1"
        }
        : {
        ...base,
        onValue: buttonWriteOnValueInput?.value ?? "1",
        offValue: buttonWriteOffValueInput?.value ?? "0"
      }
    });
  });
}

if (buttonWriteTagSelect) {
  buttonWriteTagSelect.addEventListener("change", () => {
    const actionType = buttonActionSelect.value;
    if (actionType !== "momentary-write" && actionType !== "toggle-write" && actionType !== "set-write" && actionType !== "prompt-write") return;
    const { connection_id, tag } = parseTagSelectValue(buttonWriteTagSelect.value);
    if (buttonWriteConnectionInput && connection_id) buttonWriteConnectionInput.value = connection_id;
    const base = {
      type: actionType,
      connection_id: connection_id || (buttonWriteConnectionInput?.value?.trim() || ""),
      tag
    };
    if (actionType === "prompt-write") {
      updateButtonProperty({
        action: {
          ...base,
          defaultValue: parseOptionalNumber(buttonPromptDefaultInput?.value),
          min: parseOptionalNumber(buttonPromptMinInput?.value),
          max: parseOptionalNumber(buttonPromptMaxInput?.value),
          step: parseOptionalNumber(buttonPromptStepInput?.value)
        }
      });
      return;
    }
    updateButtonProperty({
      action: actionType === "set-write"
        ? {
          ...base,
          onValue: buttonWriteOnValueInput?.value ?? "1"
        }
        : {
        ...base,
        onValue: buttonWriteOnValueInput?.value ?? "1",
        offValue: buttonWriteOffValueInput?.value ?? "0"
      }
    });
  });
}

if (buttonWriteOnValueInput) {
  buttonWriteOnValueInput.addEventListener("change", () => {
    if (buttonActionSelect?.value !== "momentary-write" && buttonActionSelect?.value !== "toggle-write" && buttonActionSelect?.value !== "set-write") return;
    const actionType = buttonActionSelect.value;
    const active = parseTagSelectValue(buttonWriteTagSelect?.value || "");
    updateButtonProperty({
      action: actionType === "set-write"
        ? {
          type: actionType,
          connection_id: active.connection_id || (buttonWriteConnectionInput?.value?.trim() || ""),
          tag: active.tag || "",
          onValue: buttonWriteOnValueInput.value
        }
        : {
        type: actionType,
        connection_id: active.connection_id || (buttonWriteConnectionInput?.value?.trim() || ""),
        tag: active.tag || "",
        onValue: buttonWriteOnValueInput.value,
        offValue: buttonWriteOffValueInput?.value ?? "0"
      }
    });
  });
}

if (buttonWriteOffValueInput) {
  buttonWriteOffValueInput.addEventListener("change", () => {
    if (buttonActionSelect?.value !== "momentary-write" && buttonActionSelect?.value !== "toggle-write") return;
    const active = parseTagSelectValue(buttonWriteTagSelect?.value || "");
    updateButtonProperty({
      action: {
        type: buttonActionSelect.value,
        connection_id: active.connection_id || (buttonWriteConnectionInput?.value?.trim() || ""),
        tag: active.tag || "",
        onValue: buttonWriteOnValueInput?.value ?? "1",
        offValue: buttonWriteOffValueInput.value
      }
    });
  });
}

const updatePromptWriteActionFromInputs = () => {
  if (buttonActionSelect?.value !== "prompt-write") return;
  const active = parseTagSelectValue(buttonWriteTagSelect?.value || "");
  updateButtonProperty({
    action: {
      type: "prompt-write",
      connection_id: active.connection_id || (buttonWriteConnectionInput?.value?.trim() || ""),
      tag: active.tag || "",
      defaultValue: parseOptionalNumber(buttonPromptDefaultInput?.value),
      min: parseOptionalNumber(buttonPromptMinInput?.value),
      max: parseOptionalNumber(buttonPromptMaxInput?.value),
      step: parseOptionalNumber(buttonPromptStepInput?.value)
    }
  });
};

if (buttonPromptDefaultInput) buttonPromptDefaultInput.addEventListener("change", updatePromptWriteActionFromInputs);
if (buttonPromptMinInput) buttonPromptMinInput.addEventListener("change", updatePromptWriteActionFromInputs);
if (buttonPromptMaxInput) buttonPromptMaxInput.addEventListener("change", updatePromptWriteActionFromInputs);
if (buttonPromptStepInput) buttonPromptStepInput.addEventListener("change", updatePromptWriteActionFromInputs);

if (buttonWidthInput) {
  buttonWidthInput.addEventListener("change", () => {
    const value = Number(buttonWidthInput.value);
    if (Number.isFinite(value) && value > 0) {
      updateButtonProperty({ w: value });
    }
  });
}

if (buttonXInput) {
  buttonXInput.addEventListener("change", () => {
    const value = Number(buttonXInput.value);
    if (Number.isFinite(value)) updateButtonProperty({ x: value });
  });
}

if (buttonYInput) {
  buttonYInput.addEventListener("change", () => {
    const value = Number(buttonYInput.value);
    if (Number.isFinite(value)) updateButtonProperty({ y: value });
  });
}

if (buttonHeightInput) {
  buttonHeightInput.addEventListener("change", () => {
    const value = Number(buttonHeightInput.value);
    if (Number.isFinite(value) && value > 0) {
      updateButtonProperty({ h: value });
    }
  });
}

if (buttonRadiusInput) {
  buttonRadiusInput.addEventListener("change", () => {
    const value = Number(buttonRadiusInput.value);
    if (Number.isFinite(value) && value >= 0) {
      updateButtonProperty({ rx: value });
    }
  });
}

if (buttonShadowInput) {
  buttonShadowInput.addEventListener("change", () => {
    updateButtonProperty({ shadow: buttonShadowInput.checked });
  });
}

if (buttonBevelInput) {
  buttonBevelInput.addEventListener("change", () => {
    updateButtonProperty({ bevel: buttonBevelInput.checked });
  });
}

if (buttonFillInput) {
  buttonFillInput.addEventListener("input", () => {
    updateButtonProperty({ fill: buttonFillInput.value });
    if (buttonFillTextInput) buttonFillTextInput.value = buttonFillInput.value;
  });
}

if (buttonFillTextInput) {
  buttonFillTextInput.addEventListener("change", () => {
    const value = buttonFillTextInput.value.trim();
    if (value) {
      updateButtonProperty({ fill: value });
      if (buttonFillInput) buttonFillInput.value = value;
    }
  });
}

if (buttonFontSizeInput) {
  buttonFontSizeInput.addEventListener("change", () => {
    const value = Number(buttonFontSizeInput.value);
    if (Number.isFinite(value) && value > 0) {
      updateButtonProperty({ fontSize: value });
    }
  });
}

if (buttonTextColorInput) {
  buttonTextColorInput.addEventListener("input", () => {
    updateButtonProperty({ textColor: buttonTextColorInput.value });
    if (buttonTextColorTextInput) buttonTextColorTextInput.value = buttonTextColorInput.value;
  });
}

if (buttonTextColorTextInput) {
  buttonTextColorTextInput.addEventListener("change", () => {
    const value = buttonTextColorTextInput.value.trim();
    if (value) {
      updateButtonProperty({ textColor: value });
      if (buttonTextColorInput) buttonTextColorInput.value = value;
    }
  });
}

if (buttonBoldInput) {
  buttonBoldInput.addEventListener("change", () => {
    updateButtonProperty({ bold: buttonBoldInput.checked });
  });
}

if (buttonAlignSelect) {
  buttonAlignSelect.addEventListener("change", () => {
    updateButtonProperty({ align: buttonAlignSelect.value });
  });
}

if (buttonValignSelect) {
  buttonValignSelect.addEventListener("change", () => {
    updateButtonProperty({ valign: buttonValignSelect.value });
  });
}

if (buttonStrokeInput) {
  buttonStrokeInput.addEventListener("input", () => {
    updateButtonProperty({ stroke: buttonStrokeInput.value });
    if (buttonStrokeTextInput) buttonStrokeTextInput.value = buttonStrokeInput.value;
  });
}

if (buttonStrokeTextInput) {
  buttonStrokeTextInput.addEventListener("change", () => {
    const value = buttonStrokeTextInput.value.trim();
    if (value) {
      updateButtonProperty({ stroke: value });
      if (buttonStrokeInput) buttonStrokeInput.value = value;
    }
  });
}

if (buttonBorderEnabledInput) {
  buttonBorderEnabledInput.addEventListener("change", () => {
    const enabled = buttonBorderEnabledInput.checked;
    if (buttonStrokeRow) buttonStrokeRow.classList.toggle("is-hidden", !enabled);
    if (!enabled) {
      updateButtonProperty({ stroke: "none" });
      return;
    }
    let nextStroke = buttonStrokeTextInput?.value?.trim() || buttonStrokeInput?.value || "#ffffff";
    if (!nextStroke || nextStroke === "none") nextStroke = "#ffffff";
    const obj = getActiveObjects()?.[selectedIndices[0]];
    const nextWidth = Number(obj?.strokeWidth ?? 1) || 1;
    updateButtonProperty({ stroke: nextStroke, strokeWidth: nextWidth });
    if (buttonStrokeInput) buttonStrokeInput.value = nextStroke;
    if (buttonStrokeTextInput) buttonStrokeTextInput.value = nextStroke;
  });
}

if (viewportXInput) {
  viewportXInput.addEventListener("change", () => {
    const value = Number(viewportXInput.value);
    if (Number.isFinite(value)) updateViewportProperty({ x: value });
  });
}

if (viewportIdInput) {
  viewportIdInput.addEventListener("change", () => {
    const value = viewportIdInput.value.trim();
    updateViewportProperty({ id: value });
  });
}

if (viewportYInput) {
  viewportYInput.addEventListener("change", () => {
    const value = Number(viewportYInput.value);
    if (Number.isFinite(value)) updateViewportProperty({ y: value });
  });
}

if (viewportWInput) {
  viewportWInput.addEventListener("change", () => {
    const value = Number(viewportWInput.value);
    if (Number.isFinite(value) && value > 0) updateViewportProperty({ w: value });
  });
}

if (viewportHInput) {
  viewportHInput.addEventListener("change", () => {
    const value = Number(viewportHInput.value);
    if (Number.isFinite(value) && value > 0) updateViewportProperty({ h: value });
  });
}

if (viewportRadiusInput) {
  viewportRadiusInput.addEventListener("change", () => {
    const value = Number(viewportRadiusInput.value);
    if (Number.isFinite(value) && value >= 0) updateViewportProperty({ rx: value });
  });
}

if (viewportTargetSelect) {
  viewportTargetSelect.addEventListener("change", () => {
    updateViewportProperty({ target: viewportTargetSelect.value });
  });
}

if (viewportScaleModeSelect) {
  viewportScaleModeSelect.addEventListener("change", () => {
    updateViewportProperty({ scaleMode: viewportScaleModeSelect.value });
  });
}

if (viewportBorderEnabledInput) {
  viewportBorderEnabledInput.addEventListener("change", () => {
    if (viewportBorderColorRow) viewportBorderColorRow.classList.toggle("is-hidden", !viewportBorderEnabledInput.checked);
    if (viewportBorderWidthRow) viewportBorderWidthRow.classList.toggle("is-hidden", !viewportBorderEnabledInput.checked);
    if (viewportBevelRow) {
      viewportBevelRow.classList.toggle("is-hidden", !viewportBorderEnabledInput.checked);
      viewportBevelRow.hidden = !viewportBorderEnabledInput.checked;
    }
    updateViewportBorder({ enabled: viewportBorderEnabledInput.checked });
  });
}

if (viewportBevelInput) {
  viewportBevelInput.addEventListener("change", () => {
    updateViewportProperty({ bevel: viewportBevelInput.checked });
  });
}

if (viewportBorderColorInput) {
  viewportBorderColorInput.addEventListener("input", () => {
    updateViewportBorder({ color: viewportBorderColorInput.value });
    if (viewportBorderColorTextInput) viewportBorderColorTextInput.value = viewportBorderColorInput.value;
  });
}

if (viewportBorderColorTextInput) {
  viewportBorderColorTextInput.addEventListener("change", () => {
    const value = viewportBorderColorTextInput.value.trim();
    if (value) {
      updateViewportBorder({ color: value });
      if (viewportBorderColorInput) viewportBorderColorInput.value = value;
    }
  });
}

if (viewportBorderWidthInput) {
  viewportBorderWidthInput.addEventListener("change", () => {
    const value = Number(viewportBorderWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updateViewportBorder({ width: value });
  });
}

if (rectXInput) {
  rectXInput.addEventListener("change", () => {
    const value = Number(rectXInput.value);
    if (Number.isFinite(value)) updateRectProperty({ x: value });
  });
}

if (rectYInput) {
  rectYInput.addEventListener("change", () => {
    const value = Number(rectYInput.value);
    if (Number.isFinite(value)) updateRectProperty({ y: value });
  });
}

if (rectWInput) {
  rectWInput.addEventListener("change", () => {
    const value = Number(rectWInput.value);
    if (Number.isFinite(value) && value > 0) updateRectProperty({ w: value });
  });
}

if (rectHInput) {
  rectHInput.addEventListener("change", () => {
    const value = Number(rectHInput.value);
    if (Number.isFinite(value) && value > 0) updateRectProperty({ h: value });
  });
}

if (rectRadiusInput) {
  rectRadiusInput.addEventListener("change", () => {
    const value = Number(rectRadiusInput.value);
    if (Number.isFinite(value) && value >= 0) updateRectProperty({ rx: value });
  });
}

if (rectShadowInput) {
  rectShadowInput.addEventListener("change", () => {
    updateRectProperty({ shadow: rectShadowInput.checked });
  });
}

if (rectBorderEnabledInput) {
  rectBorderEnabledInput.addEventListener("change", () => {
    const enabled = rectBorderEnabledInput.checked;
    if (rectBevelRow) {
      rectBevelRow.classList.toggle("is-hidden", !enabled);
      rectBevelRow.hidden = !enabled;
    }
    if (rectStrokeRow) rectStrokeRow.classList.toggle("is-hidden", !enabled);
    if (rectStrokeWidthRow) rectStrokeWidthRow.classList.toggle("is-hidden", !enabled);
    if (rectStrokeAutoHeader) rectStrokeAutoHeader.classList.toggle("is-hidden", !enabled);
    if (rectStrokeAutoFields && !enabled) {
      rectStrokeAutoFields.classList.add("is-hidden");
      rectStrokeAutoFields.hidden = true;
    }
    if (!enabled) {
      updateRectProperty({ stroke: "none" });
      return;
    }
    let nextStroke = rectStrokeTextInput?.value?.trim() || rectStrokeInput?.value || "#ffffff";
    if (!nextStroke || nextStroke === "none") nextStroke = "#ffffff";
    const nextWidth = Number(rectStrokeWidthInput?.value ?? 1) || 1;
    updateRectProperty({ stroke: nextStroke, strokeWidth: nextWidth });
    if (rectStrokeInput) rectStrokeInput.value = nextStroke;
    if (rectStrokeTextInput) rectStrokeTextInput.value = nextStroke;
  });
}

if (rectBevelInput) {
  rectBevelInput.addEventListener("change", () => {
    updateRectProperty({ bevel: rectBevelInput.checked });
  });
}

if (rectFillInput) {
  rectFillInput.addEventListener("input", () => {
    updateRectProperty({ fill: rectFillInput.value });
    if (rectFillTextInput) rectFillTextInput.value = rectFillInput.value;
  });
}

if (rectFillTextInput) {
  rectFillTextInput.addEventListener("change", () => {
    const value = rectFillTextInput.value.trim();
    if (value) {
      updateRectProperty({ fill: value });
      if (rectFillInput) rectFillInput.value = value;
    }
  });
}

if (rectStrokeInput) {
  rectStrokeInput.addEventListener("input", () => {
    updateRectProperty({ stroke: rectStrokeInput.value });
    if (rectStrokeTextInput) rectStrokeTextInput.value = rectStrokeInput.value;
  });
}

if (rectStrokeTextInput) {
  rectStrokeTextInput.addEventListener("change", () => {
    const value = rectStrokeTextInput.value.trim();
    if (value) {
      updateRectProperty({ stroke: value });
      if (rectStrokeInput) rectStrokeInput.value = value;
    }
  });
}

if (rectStrokeWidthInput) {
  rectStrokeWidthInput.addEventListener("change", () => {
    const value = Number(rectStrokeWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updateRectProperty({ strokeWidth: value });
  });
}

if (alarmsPanelMaxRowsInput) {
  alarmsPanelMaxRowsInput.addEventListener("change", () => {
    const value = Number(alarmsPanelMaxRowsInput.value);
    if (Number.isFinite(value) && value >= 1) updateRectProperty({ maxRows: Math.round(value) });
  });
}

if (alarmsPanelOnlyUnackedInput) {
  alarmsPanelOnlyUnackedInput.addEventListener("change", () => {
    updateRectProperty({ onlyUnacked: alarmsPanelOnlyUnackedInput.checked });
  });
}

if (alarmsPanelShowSourceInput) {
  alarmsPanelShowSourceInput.addEventListener("change", () => {
    updateRectProperty({ showSource: alarmsPanelShowSourceInput.checked });
  });
}

if (alarmsPanelFontSizeInput) {
  alarmsPanelFontSizeInput.addEventListener("change", () => {
    const value = Number(alarmsPanelFontSizeInput.value);
    if (Number.isFinite(value) && value >= 6) updateRectProperty({ fontSize: Math.round(value) });
  });
}

const bindAlarmsPanelColor = (colorInput, textInput, key, fallback) => {
  if (colorInput) {
    colorInput.addEventListener("input", () => {
      const value = colorInput.value;
      updateRectProperty({ [key]: value });
      if (textInput) textInput.value = value;
    });
  }
  if (textInput) {
    textInput.addEventListener("change", () => {
      const value = textInput.value.trim();
      if (!value) {
        updateRectProperty({ [key]: undefined });
        if (colorInput) colorInput.value = String(fallback || "#000000");
        return;
      }
      updateRectProperty({ [key]: value });
      if (colorInput && isHexColor(value)) colorInput.value = value;
    });
  }
};

bindAlarmsPanelColor(alarmsPanelHeaderBgInput, alarmsPanelHeaderBgTextInput, "headerBg", "#000000");
bindAlarmsPanelColor(alarmsPanelHeaderTextInput, alarmsPanelHeaderTextTextInput, "headerText", "#ffffff");
bindAlarmsPanelColor(alarmsPanelRowBgNormalInput, alarmsPanelRowBgNormalTextInput, "rowBg", "#ffffff");
bindAlarmsPanelColor(alarmsPanelRowBgActiveUnackedInput, alarmsPanelRowBgActiveUnackedTextInput, "rowBgActiveUnacked", "#ffcccc");
bindAlarmsPanelColor(alarmsPanelRowBgActiveAckedInput, alarmsPanelRowBgActiveAckedTextInput, "rowBgActiveAcked", "#ffe3a3");
bindAlarmsPanelColor(alarmsPanelRowBgReturnedInput, alarmsPanelRowBgReturnedTextInput, "rowBgReturned", "#e9ecef");
bindAlarmsPanelColor(alarmsPanelRowBgBadQualityInput, alarmsPanelRowBgBadQualityTextInput, "rowBgBadQuality", "#ffd1ea");
bindAlarmsPanelColor(alarmsPanelRowTextNormalInput, alarmsPanelRowTextNormalTextInput, "rowText", "#000000");
bindAlarmsPanelColor(alarmsPanelRowTextActiveUnackedInput, alarmsPanelRowTextActiveUnackedTextInput, "rowTextActiveUnacked", "#000000");
bindAlarmsPanelColor(alarmsPanelRowTextActiveAckedInput, alarmsPanelRowTextActiveAckedTextInput, "rowTextActiveAcked", "#000000");
bindAlarmsPanelColor(alarmsPanelRowTextReturnedInput, alarmsPanelRowTextReturnedTextInput, "rowTextReturned", "#000000");
bindAlarmsPanelColor(alarmsPanelRowTextBadQualityInput, alarmsPanelRowTextBadQualityTextInput, "rowTextBadQuality", "#000000");
bindAlarmsPanelColor(alarmsPanelStripeActiveUnackedInput, alarmsPanelStripeActiveUnackedTextInput, "stripeActiveUnacked", "#dc2626");
bindAlarmsPanelColor(alarmsPanelStripeActiveAckedInput, alarmsPanelStripeActiveAckedTextInput, "stripeActiveAcked", "#d97706");
bindAlarmsPanelColor(alarmsPanelStripeReturnedInput, alarmsPanelStripeReturnedTextInput, "stripeReturned", "#6b7280");
bindAlarmsPanelColor(alarmsPanelStripeBadQualityInput, alarmsPanelStripeBadQualityTextInput, "stripeBadQuality", "#be185d");

if (circleCxInput) {
  circleCxInput.addEventListener("change", () => {
    const value = Number(circleCxInput.value);
    if (Number.isFinite(value)) updateCircleProperty({ cx: value });
  });
}

if (circleCyInput) {
  circleCyInput.addEventListener("change", () => {
    const value = Number(circleCyInput.value);
    if (Number.isFinite(value)) updateCircleProperty({ cy: value });
  });
}

if (circleRInput) {
  circleRInput.addEventListener("change", () => {
    const value = Number(circleRInput.value);
    if (Number.isFinite(value) && value > 0) updateCircleProperty({ r: value });
  });
}

if (circleShadowInput) {
  circleShadowInput.addEventListener("change", () => {
    updateCircleProperty({ shadow: circleShadowInput.checked });
  });
}

if (circleBorderEnabledInput) {
  circleBorderEnabledInput.addEventListener("change", () => {
    const enabled = circleBorderEnabledInput.checked;
    if (circleStrokeRow) circleStrokeRow.classList.toggle("is-hidden", !enabled);
    if (circleStrokeWidthRow) circleStrokeWidthRow.classList.toggle("is-hidden", !enabled);
    if (circleStrokeAutoHeader) circleStrokeAutoHeader.classList.toggle("is-hidden", !enabled);
    if (circleStrokeAutoFields && !enabled) {
      circleStrokeAutoFields.classList.add("is-hidden");
      circleStrokeAutoFields.hidden = true;
    }
    if (!enabled) {
      updateCircleProperty({ stroke: "none" });
      return;
    }
    let nextStroke = circleStrokeTextInput?.value?.trim() || circleStrokeInput?.value || "#ffffff";
    if (!nextStroke || nextStroke === "none") nextStroke = "#ffffff";
    const nextWidth = Number(circleStrokeWidthInput?.value ?? 1) || 1;
    updateCircleProperty({ stroke: nextStroke, strokeWidth: nextWidth });
    if (circleStrokeInput) circleStrokeInput.value = nextStroke;
    if (circleStrokeTextInput) circleStrokeTextInput.value = nextStroke;
  });
}

if (circleFillInput) {
  circleFillInput.addEventListener("input", () => {
    updateCircleProperty({ fill: circleFillInput.value });
    if (circleFillTextInput) circleFillTextInput.value = circleFillInput.value;
  });
}

if (circleFillTextInput) {
  circleFillTextInput.addEventListener("change", () => {
    const value = circleFillTextInput.value.trim();
    if (value) {
      updateCircleProperty({ fill: value });
      if (circleFillInput) circleFillInput.value = value;
    }
  });
}

if (circleStrokeInput) {
  circleStrokeInput.addEventListener("input", () => {
    updateCircleProperty({ stroke: circleStrokeInput.value });
    if (circleStrokeTextInput) circleStrokeTextInput.value = circleStrokeInput.value;
  });
}

if (circleStrokeTextInput) {
  circleStrokeTextInput.addEventListener("change", () => {
    const value = circleStrokeTextInput.value.trim();
    if (value) {
      updateCircleProperty({ stroke: value });
      if (circleStrokeInput) circleStrokeInput.value = value;
    }
  });
}

if (circleStrokeWidthInput) {
  circleStrokeWidthInput.addEventListener("change", () => {
    const value = Number(circleStrokeWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updateCircleProperty({ strokeWidth: value });
  });
}

if (lineX1Input) {
  lineX1Input.addEventListener("change", () => {
    const value = Number(lineX1Input.value);
    if (Number.isFinite(value)) updateLineProperty({ x1: value });
  });
}

if (lineY1Input) {
  lineY1Input.addEventListener("change", () => {
    const value = Number(lineY1Input.value);
    if (Number.isFinite(value)) updateLineProperty({ y1: value });
  });
}

if (lineX2Input) {
  lineX2Input.addEventListener("change", () => {
    const value = Number(lineX2Input.value);
    if (Number.isFinite(value)) updateLineProperty({ x2: value });
  });
}

if (lineY2Input) {
  lineY2Input.addEventListener("change", () => {
    const value = Number(lineY2Input.value);
    if (Number.isFinite(value)) updateLineProperty({ y2: value });
  });
}

if (lineStrokeInput) {
  lineStrokeInput.addEventListener("input", () => {
    updateLineProperty({ stroke: lineStrokeInput.value });
    if (lineStrokeTextInput) lineStrokeTextInput.value = lineStrokeInput.value;
  });
}

if (lineStrokeTextInput) {
  lineStrokeTextInput.addEventListener("change", () => {
    const value = lineStrokeTextInput.value.trim();
    if (value) {
      updateLineProperty({ stroke: value });
      if (lineStrokeInput) lineStrokeInput.value = value;
    }
  });
}

if (lineStrokeWidthInput) {
  lineStrokeWidthInput.addEventListener("change", () => {
    const value = Number(lineStrokeWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updateLineProperty({ strokeWidth: value });
  });
}

if (curveX1Input) {
  curveX1Input.addEventListener("change", () => {
    const value = Number(curveX1Input.value);
    if (Number.isFinite(value)) updateCurveProperty({ x1: value });
  });
}

if (curveY1Input) {
  curveY1Input.addEventListener("change", () => {
    const value = Number(curveY1Input.value);
    if (Number.isFinite(value)) updateCurveProperty({ y1: value });
  });
}

if (curveCXInput) {
  curveCXInput.addEventListener("change", () => {
    const value = Number(curveCXInput.value);
    if (Number.isFinite(value)) updateCurveProperty({ cx: value });
  });
}

if (curveCYInput) {
  curveCYInput.addEventListener("change", () => {
    const value = Number(curveCYInput.value);
    if (Number.isFinite(value)) updateCurveProperty({ cy: value });
  });
}

if (curveX2Input) {
  curveX2Input.addEventListener("change", () => {
    const value = Number(curveX2Input.value);
    if (Number.isFinite(value)) updateCurveProperty({ x2: value });
  });
}

if (curveY2Input) {
  curveY2Input.addEventListener("change", () => {
    const value = Number(curveY2Input.value);
    if (Number.isFinite(value)) updateCurveProperty({ y2: value });
  });
}

if (curveStrokeInput) {
  curveStrokeInput.addEventListener("input", () => {
    updateCurveProperty({ stroke: curveStrokeInput.value });
    if (curveStrokeTextInput) curveStrokeTextInput.value = curveStrokeInput.value;
  });
}

if (curveStrokeTextInput) {
  curveStrokeTextInput.addEventListener("change", () => {
    const value = curveStrokeTextInput.value.trim();
    if (value) {
      updateCurveProperty({ stroke: value });
      if (curveStrokeInput) curveStrokeInput.value = value;
    }
  });
}

if (curveStrokeWidthInput) {
  curveStrokeWidthInput.addEventListener("change", () => {
    const value = Number(curveStrokeWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updateCurveProperty({ strokeWidth: value });
  });
}

if (polylineStrokeInput) {
  polylineStrokeInput.addEventListener("input", () => {
    updatePolylineProperty({ stroke: polylineStrokeInput.value });
    if (polylineStrokeTextInput) polylineStrokeTextInput.value = polylineStrokeInput.value;
  });
}

if (polylineStrokeTextInput) {
  polylineStrokeTextInput.addEventListener("change", () => {
    const value = polylineStrokeTextInput.value.trim();
    if (value) {
      updatePolylineProperty({ stroke: value });
      if (polylineStrokeInput) polylineStrokeInput.value = value;
    }
  });
}

if (polylineStrokeWidthInput) {
  polylineStrokeWidthInput.addEventListener("change", () => {
    const value = Number(polylineStrokeWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updatePolylineProperty({ strokeWidth: value });
  });
}

if (polygonFillInput) {
  polygonFillInput.addEventListener("input", () => {
    updatePolygonProperty({ fill: polygonFillInput.value });
    if (polygonFillTextInput) polygonFillTextInput.value = polygonFillInput.value;
  });
}

if (polygonFillTextInput) {
  polygonFillTextInput.addEventListener("change", () => {
    const value = polygonFillTextInput.value.trim();
    if (value) {
      updatePolygonProperty({ fill: value });
      if (polygonFillInput) polygonFillInput.value = value;
    }
  });
}

if (polygonStrokeInput) {
  polygonStrokeInput.addEventListener("input", () => {
    updatePolygonProperty({ stroke: polygonStrokeInput.value });
    if (polygonStrokeTextInput) polygonStrokeTextInput.value = polygonStrokeInput.value;
  });
}

if (polygonStrokeTextInput) {
  polygonStrokeTextInput.addEventListener("change", () => {
    const value = polygonStrokeTextInput.value.trim();
    if (value) {
      updatePolygonProperty({ stroke: value });
      if (polygonStrokeInput) polygonStrokeInput.value = value;
    }
  });
}

if (polygonStrokeWidthInput) {
  polygonStrokeWidthInput.addEventListener("change", () => {
    const value = Number(polygonStrokeWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updatePolygonProperty({ strokeWidth: value });
  });
}

if (barXInput) {
  barXInput.addEventListener("change", () => {
    const value = Number(barXInput.value);
    if (Number.isFinite(value)) updateBarProperty({ x: value });
  });
}

if (barYInput) {
  barYInput.addEventListener("change", () => {
    const value = Number(barYInput.value);
    if (Number.isFinite(value)) updateBarProperty({ y: value });
  });
}

if (barWInput) {
  barWInput.addEventListener("change", () => {
    const value = Number(barWInput.value);
    if (Number.isFinite(value) && value > 0) updateBarProperty({ w: value });
  });
}

if (barHInput) {
  barHInput.addEventListener("change", () => {
    const value = Number(barHInput.value);
    if (Number.isFinite(value) && value > 0) updateBarProperty({ h: value });
  });
}

if (barOrientationSelect) {
  barOrientationSelect.addEventListener("change", () => {
    const value = barOrientationSelect.value === "horizontal" ? "horizontal" : "vertical";
    updateBarProperty({ orientation: value });
  });
}

if (barMinInput) {
  barMinInput.addEventListener("change", () => {
    const raw = barMinInput.value.trim();
    if (!raw) {
      updateBarProperty({ min: undefined });
      return;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) updateBarProperty({ min: value });
  });
}

if (barMaxInput) {
  barMaxInput.addEventListener("change", () => {
    const raw = barMaxInput.value.trim();
    if (!raw) {
      updateBarProperty({ max: undefined });
      return;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) updateBarProperty({ max: value });
  });
}

if (barMinTagEnabledInput) {
  barMinTagEnabledInput.addEventListener("change", () => {
    const enabled = barMinTagEnabledInput.checked;
    if (barMinTagFields) {
      barMinTagFields.classList.toggle("is-hidden", !enabled);
      barMinTagFields.hidden = !enabled;
    }
    updateBarRangeBinding("min", { enabled });
  });
}

if (barMinConnectionInput) {
  barMinConnectionInput.addEventListener("change", () => {
    if (barMinTagEnabledInput && !barMinTagEnabledInput.checked) {
      barMinTagEnabledInput.checked = true;
      if (barMinTagFields) {
        barMinTagFields.classList.remove("is-hidden");
        barMinTagFields.hidden = false;
      }
    }
    updateBarRangeBinding("min", { enabled: true, connection_id: barMinConnectionInput.value.trim() });
  });
}

if (barMinTagSelect) {
  barMinTagSelect.addEventListener("change", () => {
    const value = barMinTagSelect.value;
    const [connectionId, tagName] = value ? value.split("::") : ["", ""];
    if (barMinConnectionInput && connectionId) barMinConnectionInput.value = connectionId || "";
    if (barMinTagEnabledInput && !barMinTagEnabledInput.checked) {
      barMinTagEnabledInput.checked = true;
      if (barMinTagFields) {
        barMinTagFields.classList.remove("is-hidden");
        barMinTagFields.hidden = false;
      }
    }
    updateBarRangeBinding("min", { enabled: true, connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (barMaxTagEnabledInput) {
  barMaxTagEnabledInput.addEventListener("change", () => {
    const enabled = barMaxTagEnabledInput.checked;
    if (barMaxTagFields) {
      barMaxTagFields.classList.toggle("is-hidden", !enabled);
      barMaxTagFields.hidden = !enabled;
    }
    updateBarRangeBinding("max", { enabled });
  });
}

if (barMaxConnectionInput) {
  barMaxConnectionInput.addEventListener("change", () => {
    if (barMaxTagEnabledInput && !barMaxTagEnabledInput.checked) {
      barMaxTagEnabledInput.checked = true;
      if (barMaxTagFields) {
        barMaxTagFields.classList.remove("is-hidden");
        barMaxTagFields.hidden = false;
      }
    }
    updateBarRangeBinding("max", { enabled: true, connection_id: barMaxConnectionInput.value.trim() });
  });
}

if (barMaxTagSelect) {
  barMaxTagSelect.addEventListener("change", () => {
    const value = barMaxTagSelect.value;
    const [connectionId, tagName] = value ? value.split("::") : ["", ""];
    if (barMaxConnectionInput && connectionId) barMaxConnectionInput.value = connectionId || "";
    if (barMaxTagEnabledInput && !barMaxTagEnabledInput.checked) {
      barMaxTagEnabledInput.checked = true;
      if (barMaxTagFields) {
        barMaxTagFields.classList.remove("is-hidden");
        barMaxTagFields.hidden = false;
      }
    }
    updateBarRangeBinding("max", { enabled: true, connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (barBindConnectionInput) {
  barBindConnectionInput.addEventListener("change", () => {
    updateBarBindProperty({ connection_id: barBindConnectionInput.value.trim() });
  });
}

if (barBindTagSelect) {
  barBindTagSelect.addEventListener("change", () => {
    const value = barBindTagSelect.value;
    if (!value) {
      updateBarBindProperty({ tag: "", connection_id: barBindConnectionInput?.value?.trim() || "" });
      return;
    }
    const [connectionId, tagName] = value.split("::");
    if (barBindConnectionInput) barBindConnectionInput.value = connectionId || "";
    updateBarBindProperty({ connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (barDigitsInput) {
  barDigitsInput.addEventListener("input", () => {
    const value = Number(barDigitsInput.value);
    updateBarBindProperty({ digits: Number.isFinite(value) ? value : "" });
  });
}

if (barDecimalsInput) {
  barDecimalsInput.addEventListener("input", () => {
    const value = Number(barDecimalsInput.value);
    updateBarBindProperty({ decimals: Number.isFinite(value) ? value : 0 });
  });
}

if (barMultiplierInput) {
  barMultiplierInput.addEventListener("input", () => {
    const value = Number(barMultiplierInput.value);
    updateBarBindProperty({ multiplier: Number.isFinite(value) ? value : 1 });
  });
}

if (numberInputConnectionInput) {
  numberInputConnectionInput.addEventListener("change", () => {
    updateNumberInputBindProperty({ connection_id: numberInputConnectionInput.value.trim() });
  });
}

if (numberInputTagSelect) {
  numberInputTagSelect.addEventListener("change", () => {
    const value = numberInputTagSelect.value;
    if (!value) {
      updateNumberInputBindProperty({ tag: "", connection_id: numberInputConnectionInput?.value?.trim() || "" });
      return;
    }
    const [connectionId, tagName] = value.split("::");
    if (numberInputConnectionInput) numberInputConnectionInput.value = connectionId || "";
    updateNumberInputBindProperty({ connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (numberInputDigitsInput) {
  numberInputDigitsInput.addEventListener("input", () => {
    const value = Number(numberInputDigitsInput.value);
    updateNumberInputBindProperty({ digits: Number.isFinite(value) ? value : "" });
  });
}

if (numberInputDecimalsInput) {
  numberInputDecimalsInput.addEventListener("input", () => {
    const value = Number(numberInputDecimalsInput.value);
    updateNumberInputBindProperty({ decimals: Number.isFinite(value) ? value : 0 });
  });
}

if (numberInputMultiplierInput) {
  numberInputMultiplierInput.addEventListener("input", () => {
    const value = Number(numberInputMultiplierInput.value);
    updateNumberInputBindProperty({ multiplier: Number.isFinite(value) ? value : 1 });
  });
}

if (numberInputWidthInput) {
  numberInputWidthInput.addEventListener("change", () => {
    const value = Number(numberInputWidthInput.value);
    if (!Number.isFinite(value)) return;
    updateNumberInputProperty({ w: Math.max(MIN_RESIZE_SIZE, Math.round(value)) });
  });
}

if (numberInputHeightInput) {
  numberInputHeightInput.addEventListener("change", () => {
    const value = Number(numberInputHeightInput.value);
    if (!Number.isFinite(value)) return;
    updateNumberInputProperty({ h: Math.max(MIN_RESIZE_SIZE, Math.round(value)) });
  });
}

if (numberInputXInput) {
  numberInputXInput.addEventListener("change", () => {
    const value = Number(numberInputXInput.value);
    if (!Number.isFinite(value)) return;
    updateNumberInputProperty({ x: Math.round(value) });
  });
}

if (numberInputYInput) {
  numberInputYInput.addEventListener("change", () => {
    const value = Number(numberInputYInput.value);
    if (!Number.isFinite(value)) return;
    updateNumberInputProperty({ y: Math.round(value) });
  });
}

if (numberInputRadiusInput) {
  numberInputRadiusInput.addEventListener("change", () => {
    const value = Number(numberInputRadiusInput.value);
    if (!Number.isFinite(value) || value < 0) return;
    updateNumberInputProperty({ rx: Math.round(value) });
  });
}

if (numberInputFillInput) {
  numberInputFillInput.addEventListener("input", () => {
    const value = numberInputFillInput.value;
    updateNumberInputProperty({ fill: value });
    if (numberInputFillTextInput) numberInputFillTextInput.value = value;
  });
}

if (numberInputFillTextInput) {
  numberInputFillTextInput.addEventListener("change", () => {
    const value = numberInputFillTextInput.value.trim();
    if (!value) return;
    updateNumberInputProperty({ fill: value });
    if (numberInputFillInput && isHexColor(value)) numberInputFillInput.value = value;
  });
}

if (numberInputTextColorInput) {
  numberInputTextColorInput.addEventListener("input", () => {
    const value = numberInputTextColorInput.value;
    updateNumberInputProperty({ textColor: value });
    if (numberInputTextColorTextInput) numberInputTextColorTextInput.value = value;
  });
}

if (numberInputTextColorTextInput) {
  numberInputTextColorTextInput.addEventListener("change", () => {
    const value = numberInputTextColorTextInput.value.trim();
    if (!value) return;
    updateNumberInputProperty({ textColor: value });
    if (numberInputTextColorInput && isHexColor(value)) numberInputTextColorInput.value = value;
  });
}

if (numberInputFontSizeInput) {
  numberInputFontSizeInput.addEventListener("change", () => {
    const value = Number(numberInputFontSizeInput.value);
    if (!Number.isFinite(value) || value <= 0) return;
    updateNumberInputProperty({ fontSize: Math.round(value) });
  });
}

if (numberInputBoldInput) {
  numberInputBoldInput.addEventListener("change", () => {
    updateNumberInputProperty({ bold: numberInputBoldInput.checked });
  });
}

if (numberInputBorderEnabledInput) {
  numberInputBorderEnabledInput.addEventListener("change", () => {
    const enabled = numberInputBorderEnabledInput.checked;
    if (numberInputBevelRow) {
      numberInputBevelRow.classList.toggle("is-hidden", !enabled);
      numberInputBevelRow.hidden = !enabled;
    }
    if (numberInputStrokeRow) {
      numberInputStrokeRow.classList.toggle("is-hidden", !enabled);
      numberInputStrokeRow.hidden = !enabled;
    }
    if (numberInputStrokeWidthRow) {
      numberInputStrokeWidthRow.classList.toggle("is-hidden", !enabled);
      numberInputStrokeWidthRow.hidden = !enabled;
    }
    if (!enabled) {
      updateNumberInputProperty({ stroke: "none" });
      return;
    }
    let nextStroke = numberInputStrokeTextInput?.value?.trim() || numberInputStrokeInput?.value || "#ffffff";
    if (!nextStroke || nextStroke === "none") nextStroke = "#ffffff";
    const nextWidth = Number(numberInputStrokeWidthInput?.value ?? 1) || 1;
    updateNumberInputProperty({ stroke: nextStroke, strokeWidth: nextWidth });
    if (numberInputStrokeInput && isHexColor(nextStroke)) numberInputStrokeInput.value = nextStroke;
    if (numberInputStrokeTextInput) numberInputStrokeTextInput.value = nextStroke;
    if (numberInputStrokeWidthInput) numberInputStrokeWidthInput.value = String(nextWidth);
  });
}

if (numberInputBevelInput) {
  numberInputBevelInput.addEventListener("change", () => {
    updateNumberInputProperty({ bevel: numberInputBevelInput.checked });
  });
}

if (numberInputStrokeInput) {
  numberInputStrokeInput.addEventListener("input", () => {
    const value = numberInputStrokeInput.value;
    updateNumberInputProperty({ stroke: value });
    if (numberInputStrokeTextInput) numberInputStrokeTextInput.value = value;
  });
}

if (numberInputStrokeTextInput) {
  numberInputStrokeTextInput.addEventListener("change", () => {
    const value = numberInputStrokeTextInput.value.trim();
    if (!value) return;
    updateNumberInputProperty({ stroke: value });
    if (numberInputStrokeInput && isHexColor(value)) numberInputStrokeInput.value = value;
  });
}

if (numberInputStrokeWidthInput) {
  numberInputStrokeWidthInput.addEventListener("change", () => {
    const value = Number(numberInputStrokeWidthInput.value);
    if (!Number.isFinite(value) || value < 0) return;
    updateNumberInputProperty({ strokeWidth: Math.round(value) });
  });
}

if (indicatorXInput) {
  indicatorXInput.addEventListener("change", () => {
    const value = Number(indicatorXInput.value);
    if (!Number.isFinite(value)) return;
    updateIndicatorProperty({ x: Math.round(value) });
  });
}

if (indicatorYInput) {
  indicatorYInput.addEventListener("change", () => {
    const value = Number(indicatorYInput.value);
    if (!Number.isFinite(value)) return;
    updateIndicatorProperty({ y: Math.round(value) });
  });
}

if (indicatorWInput) {
  indicatorWInput.addEventListener("change", () => {
    const value = Number(indicatorWInput.value);
    if (!Number.isFinite(value)) return;
    updateIndicatorProperty({ w: Math.max(MIN_RESIZE_SIZE, Math.round(value)) });
  });
}

if (indicatorHInput) {
  indicatorHInput.addEventListener("change", () => {
    const value = Number(indicatorHInput.value);
    if (!Number.isFinite(value)) return;
    updateIndicatorProperty({ h: Math.max(MIN_RESIZE_SIZE, Math.round(value)) });
  });
}

if (indicatorRadiusInput) {
  indicatorRadiusInput.addEventListener("change", () => {
    const value = Number(indicatorRadiusInput.value);
    if (!Number.isFinite(value) || value < 0) return;
    updateIndicatorProperty({ rx: Math.round(value) });
  });
}

if (indicatorBackgroundEnabledInput) {
  indicatorBackgroundEnabledInput.addEventListener("change", () => {
    const enabled = indicatorBackgroundEnabledInput.checked;
    if (indicatorFillRow) {
      indicatorFillRow.classList.toggle("is-hidden", !enabled);
      indicatorFillRow.hidden = !enabled;
    }
    if (indicatorShadowInput) {
      indicatorShadowInput.disabled = !enabled;
      if (!enabled) indicatorShadowInput.checked = false;
    }
    if (!enabled) {
      updateIndicatorProperty({ backgroundEnabled: false, shadow: false });
      return;
    }
    updateIndicatorProperty({ backgroundEnabled: true });
  });
}

if (indicatorShadowInput) {
  indicatorShadowInput.addEventListener("change", () => {
    if (indicatorShadowInput.disabled) return;
    updateIndicatorProperty({ shadow: indicatorShadowInput.checked });
  });
}

if (indicatorFillInput) {
  indicatorFillInput.addEventListener("input", () => {
    updateIndicatorProperty({ fill: indicatorFillInput.value });
    if (indicatorFillTextInput) indicatorFillTextInput.value = indicatorFillInput.value;
  });
}

if (indicatorFillTextInput) {
  indicatorFillTextInput.addEventListener("change", () => {
    const value = indicatorFillTextInput.value.trim();
    if (!value) return;
    updateIndicatorProperty({ fill: value });
    if (indicatorFillInput && isHexColor(value)) indicatorFillInput.value = value;
  });
}

if (indicatorTextColorInput) {
  indicatorTextColorInput.addEventListener("input", () => {
    updateIndicatorProperty({ textColor: indicatorTextColorInput.value });
    if (indicatorTextColorTextInput) indicatorTextColorTextInput.value = indicatorTextColorInput.value;
  });
}

if (indicatorTextColorTextInput) {
  indicatorTextColorTextInput.addEventListener("change", () => {
    const value = indicatorTextColorTextInput.value.trim();
    if (!value) return;
    updateIndicatorProperty({ textColor: value });
    if (indicatorTextColorInput && isHexColor(value)) indicatorTextColorInput.value = value;
  });
}

if (indicatorFontSizeInput) {
  indicatorFontSizeInput.addEventListener("change", () => {
    const value = Number(indicatorFontSizeInput.value);
    if (!Number.isFinite(value) || value <= 0) return;
    updateIndicatorProperty({ fontSize: Math.round(value) });
  });
}

if (indicatorBoldInput) {
  indicatorBoldInput.addEventListener("change", () => {
    updateIndicatorProperty({ bold: indicatorBoldInput.checked });
  });
}

if (indicatorBorderEnabledInput) {
  indicatorBorderEnabledInput.addEventListener("change", () => {
    const enabled = indicatorBorderEnabledInput.checked;
    if (indicatorBevelRow) {
      indicatorBevelRow.classList.toggle("is-hidden", !enabled);
      indicatorBevelRow.hidden = !enabled;
    }
    if (indicatorStrokeRow) {
      indicatorStrokeRow.classList.toggle("is-hidden", !enabled);
      indicatorStrokeRow.hidden = !enabled;
    }
    if (indicatorStrokeWidthRow) {
      indicatorStrokeWidthRow.classList.toggle("is-hidden", !enabled);
      indicatorStrokeWidthRow.hidden = !enabled;
    }
    if (!enabled) {
      updateIndicatorProperty({ stroke: "none" });
      return;
    }
    let nextStroke = indicatorStrokeTextInput?.value?.trim() || indicatorStrokeInput?.value || "#ffffff";
    if (!nextStroke || nextStroke === "none") nextStroke = "#ffffff";
    const nextWidth = Number(indicatorStrokeWidthInput?.value ?? 1) || 1;
    updateIndicatorProperty({ stroke: nextStroke, strokeWidth: nextWidth });
    if (indicatorStrokeInput && isHexColor(nextStroke)) indicatorStrokeInput.value = nextStroke;
    if (indicatorStrokeTextInput) indicatorStrokeTextInput.value = nextStroke;
    if (indicatorStrokeWidthInput) indicatorStrokeWidthInput.value = String(nextWidth);
  });
}

if (indicatorBevelInput) {
  indicatorBevelInput.addEventListener("change", () => {
    updateIndicatorProperty({ bevel: indicatorBevelInput.checked });
  });
}

if (indicatorStrokeInput) {
  indicatorStrokeInput.addEventListener("input", () => {
    const value = indicatorStrokeInput.value;
    updateIndicatorProperty({ stroke: value });
    if (indicatorStrokeTextInput) indicatorStrokeTextInput.value = value;
  });
}

if (indicatorStrokeTextInput) {
  indicatorStrokeTextInput.addEventListener("change", () => {
    const value = indicatorStrokeTextInput.value.trim();
    if (!value) return;
    updateIndicatorProperty({ stroke: value });
    if (indicatorStrokeInput && isHexColor(value)) indicatorStrokeInput.value = value;
  });
}

if (indicatorStrokeWidthInput) {
  indicatorStrokeWidthInput.addEventListener("change", () => {
    const value = Number(indicatorStrokeWidthInput.value);
    if (!Number.isFinite(value) || value < 0) return;
    updateIndicatorProperty({ strokeWidth: Math.round(value) });
  });
}

if (indicatorConnectionInput) {
  indicatorConnectionInput.addEventListener("change", () => {
    const value = indicatorConnectionInput.value.trim();
    updateIndicatorBindProperty({ connection_id: value });
  });
}

if (indicatorTagSelect) {
  indicatorTagSelect.addEventListener("change", () => {
    const combined = String(indicatorTagSelect.value || "");
    if (!combined) {
      updateIndicatorBindProperty({ tag: "" });
      return;
    }
    const [connectionId, tagName] = combined.split("::");
    if (indicatorConnectionInput) indicatorConnectionInput.value = connectionId || "";
    updateIndicatorBindProperty({ connection_id: connectionId || "", tag: tagName || "" });
  });
}

if (indicatorStateModeSelect) {
  indicatorStateModeSelect.addEventListener("change", () => {
    const value = String(indicatorStateModeSelect.value || "equals");
    updateIndicatorProperty({ stateMode: value === "threshold" ? "threshold" : "equals" });
  });
}

if (indicatorLabelOverlayInput) {
  indicatorLabelOverlayInput.addEventListener("change", () => {
    updateIndicatorProperty({ labelOverlay: indicatorLabelOverlayInput.checked });
  });
}

if (indicatorLabelValignSelect) {
  indicatorLabelValignSelect.addEventListener("change", () => {
    updateIndicatorProperty({ labelValign: String(indicatorLabelValignSelect.value || "middle") });
  });
}

if (indicatorAddStateBtn) {
  indicatorAddStateBtn.addEventListener("click", () => {
    const obj = getActiveObjects()?.[selectedIndices[0]];
    if (!obj || obj.type !== "indicator") return;
    const states = Array.isArray(obj.states) ? obj.states : [];
    updateIndicatorStates([
      ...states,
      { value: states.length, label: "", color: obj.fill || "#3a3f4b", image: "" }
    ]);
  });
}

if (indicatorRemoveStateBtn) {
  indicatorRemoveStateBtn.addEventListener("click", () => {
    const obj = getActiveObjects()?.[selectedIndices[0]];
    if (!obj || obj.type !== "indicator") return;
    const states = Array.isArray(obj.states) ? obj.states : [];
    if (states.length <= 1) return;
    updateIndicatorStates(states.slice(0, -1));
  });
}

if (barFillInput) {
  barFillInput.addEventListener("input", () => {
    updateBarProperty({ fill: barFillInput.value });
    if (barFillTextInput) barFillTextInput.value = barFillInput.value;
  });
}

if (barFillTextInput) {
  barFillTextInput.addEventListener("change", () => {
    const value = barFillTextInput.value.trim();
    if (value) {
      updateBarProperty({ fill: value });
      if (barFillInput) barFillInput.value = value;
    }
  });
}

if (barBackgroundInput) {
  barBackgroundInput.addEventListener("input", () => {
    updateBarProperty({ background: barBackgroundInput.value });
    if (barBackgroundTextInput) barBackgroundTextInput.value = barBackgroundInput.value;
  });
}

if (barBackgroundTextInput) {
  barBackgroundTextInput.addEventListener("change", () => {
    const value = barBackgroundTextInput.value.trim();
    if (value) {
      updateBarProperty({ background: value });
      if (barBackgroundInput) barBackgroundInput.value = value;
    }
  });
}

if (barTicksEnabledInput) {
  barTicksEnabledInput.addEventListener("change", () => {
    const enabled = barTicksEnabledInput.checked;
    if (barTicksFields) {
      barTicksFields.classList.toggle("is-hidden", !enabled);
      barTicksFields.hidden = !enabled;
    }
    updateBarProperty({ ticks: { ...(getActiveObjects()?.[selectedIndices[0]]?.ticks || {}), enabled } });
  });
}

if (barTicksMajorInput) {
  barTicksMajorInput.addEventListener("change", () => {
    const value = Number(barTicksMajorInput.value);
    if (!Number.isFinite(value)) return;
    const major = Math.max(2, Math.trunc(value));
    const active = getActiveObjects()?.[selectedIndices[0]];
    updateBarProperty({ ticks: { ...(active?.ticks || {}), enabled: true, major } });
  });
}

if (barTicksMinorInput) {
  barTicksMinorInput.addEventListener("change", () => {
    const value = Number(barTicksMinorInput.value);
    if (!Number.isFinite(value)) return;
    const minor = Math.max(0, Math.trunc(value));
    const active = getActiveObjects()?.[selectedIndices[0]];
    updateBarProperty({ ticks: { ...(active?.ticks || {}), enabled: true, minor } });
  });
}

if (barBorderEnabledInput) {
  barBorderEnabledInput.addEventListener("change", () => {
    const enabled = barBorderEnabledInput.checked;
    if (barBevelRow) {
      barBevelRow.classList.toggle("is-hidden", !enabled);
      barBevelRow.hidden = !enabled;
    }
    if (barBorderColorRow) {
      barBorderColorRow.classList.toggle("is-hidden", !enabled);
      barBorderColorRow.hidden = !enabled;
    }
    if (barBorderWidthRow) {
      barBorderWidthRow.classList.toggle("is-hidden", !enabled);
      barBorderWidthRow.hidden = !enabled;
    }
    updateBarBorder({ enabled });
  });
}

if (barBevelInput) {
  barBevelInput.addEventListener("change", () => {
    updateBarProperty({ bevel: barBevelInput.checked });
  });
}

if (barBorderColorInput) {
  barBorderColorInput.addEventListener("input", () => {
    updateBarBorder({ color: barBorderColorInput.value });
    if (barBorderColorTextInput) barBorderColorTextInput.value = barBorderColorInput.value;
  });
}

if (barBorderColorTextInput) {
  barBorderColorTextInput.addEventListener("change", () => {
    const value = barBorderColorTextInput.value.trim();
    if (value) {
      updateBarBorder({ color: value });
      if (barBorderColorInput) barBorderColorInput.value = value;
    }
  });
}

if (barBorderWidthInput) {
  barBorderWidthInput.addEventListener("change", () => {
    const value = Number(barBorderWidthInput.value);
    if (Number.isFinite(value) && value >= 0) updateBarBorder({ width: value });
  });
}

if (visibilityEnabledInput) {
  visibilityEnabledInput.addEventListener("change", () => {
    if (visibilityFields) {
      visibilityFields.classList.toggle("is-hidden", !visibilityEnabledInput.checked);
      visibilityFields.hidden = !visibilityEnabledInput.checked;
    }
    updateVisibilityProperty({ enabled: visibilityEnabledInput.checked });
  });
}

if (visibilityConnectionInput) {
  visibilityConnectionInput.addEventListener("change", () => {
    updateVisibilityProperty({ connection_id: visibilityConnectionInput.value.trim(), enabled: true });
  });
}

if (visibilityTagSelect) {
  visibilityTagSelect.addEventListener("change", () => {
    const value = visibilityTagSelect.value;
    if (!value) {
      updateVisibilityProperty({ tag: "", enabled: true });
      return;
    }
    const [connectionId, tagName] = value.split("::");
    if (visibilityConnectionInput) visibilityConnectionInput.value = connectionId || "";
    updateVisibilityProperty({ connection_id: connectionId || "", tag: tagName || "", enabled: true });
  });
}

if (visibilityThresholdInput) {
  visibilityThresholdInput.addEventListener("change", () => {
    const raw = visibilityThresholdInput.value.trim();
    if (!raw) {
      updateVisibilityProperty({ threshold: "" , enabled: true });
      return;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) {
      updateVisibilityProperty({ threshold: value, enabled: true });
    }
  });
}

if (visibilityInvertInput) {
  visibilityInvertInput.addEventListener("change", () => {
    updateVisibilityProperty({ invert: visibilityInvertInput.checked, enabled: true });
  });
}

const parseTagSelectValue = (value) => {
  if (!value) return { connection_id: "", tag: "" };
  const [connectionId, tagName] = value.split("::");
  return { connection_id: connectionId || "", tag: tagName || "" };
};

const bindAutomationControls = (opts) => {
  const {
    key,
    enabledInput,
    invertInput,
    fields,
    connectionInput,
    tagSelect,
    modeSelect,
    thresholdRow,
    thresholdInput,
    matchRow,
    matchInput,
    onInput,
    onTextInput,
    offInput,
    offTextInput
  } = opts;

  const setFieldsVisible = (visible) => {
    if (!fields) return;
    fields.classList.toggle("is-hidden", !visible);
    fields.hidden = !visible;
  };

  const setModeUi = (mode) => {
    if (!thresholdRow || !matchRow) return;
    const showMatch = mode === "equals";
    thresholdRow.classList.toggle("is-hidden", showMatch);
    thresholdRow.hidden = showMatch;
    matchRow.classList.toggle("is-hidden", !showMatch);
    matchRow.hidden = !showMatch;
  };

  const ensureEnabledUi = () => {
    if (enabledInput && !enabledInput.checked) enabledInput.checked = true;
    setFieldsVisible(true);
  };

  if (enabledInput) {
    enabledInput.addEventListener("change", () => {
      setFieldsVisible(enabledInput.checked);
      if (enabledInput.checked && modeSelect) {
        const mode = modeSelect.value === "equals" ? "equals" : "threshold";
        setModeUi(mode);
      }
      updateAutomationProperty(key, { enabled: enabledInput.checked });
    });
  }

  if (invertInput) {
    invertInput.addEventListener("change", () => {
      ensureEnabledUi();
      updateAutomationProperty(key, { invert: invertInput.checked, enabled: true });
    });
  }

  if (connectionInput) {
    connectionInput.addEventListener("change", () => {
      ensureEnabledUi();
      updateAutomationProperty(key, { connection_id: connectionInput.value.trim(), enabled: true });
    });
  }

  if (tagSelect) {
    tagSelect.addEventListener("change", () => {
      const { connection_id, tag } = parseTagSelectValue(tagSelect.value);
      if (connectionInput && connection_id) connectionInput.value = connection_id;
      ensureEnabledUi();
      updateAutomationProperty(key, { connection_id, tag, enabled: true });
    });
  }

  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      const mode = modeSelect.value === "equals" ? "equals" : "threshold";
      setModeUi(mode);
      ensureEnabledUi();
      if (mode === "equals") {
        updateAutomationProperty(key, { mode, threshold: "", enabled: true });
      } else {
        updateAutomationProperty(key, { mode, match: "", enabled: true });
      }
    });
  }

  if (thresholdInput) {
    thresholdInput.addEventListener("change", () => {
      const raw = thresholdInput.value.trim();
      if (!raw) {
        if (modeSelect) modeSelect.value = "threshold";
        setModeUi("threshold");
        ensureEnabledUi();
        updateAutomationProperty(key, { mode: "threshold", threshold: "", enabled: true });
        return;
      }
      const num = Number(raw);
      if (!Number.isFinite(num)) return;
      if (modeSelect) modeSelect.value = "threshold";
      setModeUi("threshold");
      ensureEnabledUi();
      updateAutomationProperty(key, { mode: "threshold", threshold: num, enabled: true });
    });
  }

  if (matchInput) {
    matchInput.addEventListener("change", () => {
      const value = matchInput.value.trim();
      if (modeSelect) modeSelect.value = "equals";
      setModeUi("equals");
      ensureEnabledUi();
      updateAutomationProperty(key, { mode: "equals", match: value, enabled: true });
    });
  }

  if (onInput) {
    onInput.addEventListener("input", () => {
      ensureEnabledUi();
      updateAutomationProperty(key, { onColor: onInput.value, enabled: true });
      if (onTextInput) onTextInput.value = onInput.value;
    });
  }

  if (onTextInput) {
    onTextInput.addEventListener("change", () => {
      const value = onTextInput.value.trim();
      if (!value) return;
      ensureEnabledUi();
      updateAutomationProperty(key, { onColor: value, enabled: true });
      if (onInput) onInput.value = value;
    });
  }

  if (offInput) {
    offInput.addEventListener("input", () => {
      ensureEnabledUi();
      updateAutomationProperty(key, { offColor: offInput.value, enabled: true });
      if (offTextInput) offTextInput.value = offInput.value;
    });
  }

  if (offTextInput) {
    offTextInput.addEventListener("change", () => {
      const value = offTextInput.value.trim();
      if (!value) return;
      ensureEnabledUi();
      updateAutomationProperty(key, { offColor: value, enabled: true });
      if (offInput) offInput.value = value;
    });
  }
};

bindAutomationControls({
  key: "fillAutomation",
  enabledInput: textAutoEnabledInput,
  invertInput: textAutoInvertInput,
  fields: textAutoFields,
  connectionInput: textAutoConnectionInput,
  tagSelect: textAutoTagSelect,
  modeSelect: textAutoModeSelect,
  thresholdRow: textAutoThresholdRow,
  thresholdInput: textAutoThresholdInput,
  matchRow: textAutoMatchRow,
  matchInput: textAutoMatchInput,
  onInput: textAutoOnInput,
  onTextInput: textAutoOnTextInput,
  offInput: textAutoOffInput,
  offTextInput: textAutoOffTextInput
});

bindAutomationControls({
  key: "fillAutomation",
  enabledInput: buttonFillAutoEnabledInput,
  invertInput: buttonFillAutoInvertInput,
  fields: buttonFillAutoFields,
  connectionInput: buttonFillAutoConnectionInput,
  tagSelect: buttonFillAutoTagSelect,
  modeSelect: buttonFillAutoModeSelect,
  thresholdRow: buttonFillAutoThresholdRow,
  thresholdInput: buttonFillAutoThresholdInput,
  matchRow: buttonFillAutoMatchRow,
  matchInput: buttonFillAutoMatchInput,
  onInput: buttonFillAutoOnInput,
  onTextInput: buttonFillAutoOnTextInput,
  offInput: buttonFillAutoOffInput,
  offTextInput: buttonFillAutoOffTextInput
});

bindAutomationControls({
  key: "textColorAutomation",
  enabledInput: buttonTextAutoEnabledInput,
  invertInput: buttonTextAutoInvertInput,
  fields: buttonTextAutoFields,
  connectionInput: buttonTextAutoConnectionInput,
  tagSelect: buttonTextAutoTagSelect,
  modeSelect: buttonTextAutoModeSelect,
  thresholdRow: buttonTextAutoThresholdRow,
  thresholdInput: buttonTextAutoThresholdInput,
  matchRow: buttonTextAutoMatchRow,
  matchInput: buttonTextAutoMatchInput,
  onInput: buttonTextAutoOnInput,
  onTextInput: buttonTextAutoOnTextInput,
  offInput: buttonTextAutoOffInput,
  offTextInput: buttonTextAutoOffTextInput
});

bindAutomationControls({
  key: "fillAutomation",
  enabledInput: rectFillAutoEnabledInput,
  invertInput: rectFillAutoInvertInput,
  fields: rectFillAutoFields,
  connectionInput: rectFillAutoConnectionInput,
  tagSelect: rectFillAutoTagSelect,
  modeSelect: rectFillAutoModeSelect,
  thresholdRow: rectFillAutoThresholdRow,
  thresholdInput: rectFillAutoThresholdInput,
  matchRow: rectFillAutoMatchRow,
  matchInput: rectFillAutoMatchInput,
  onInput: rectFillAutoOnInput,
  onTextInput: rectFillAutoOnTextInput,
  offInput: rectFillAutoOffInput,
  offTextInput: rectFillAutoOffTextInput
});

bindAutomationControls({
  key: "fillAutomation",
  enabledInput: circleFillAutoEnabledInput,
  invertInput: circleFillAutoInvertInput,
  fields: circleFillAutoFields,
  connectionInput: circleFillAutoConnectionInput,
  tagSelect: circleFillAutoTagSelect,
  modeSelect: circleFillAutoModeSelect,
  thresholdRow: circleFillAutoThresholdRow,
  thresholdInput: circleFillAutoThresholdInput,
  matchRow: circleFillAutoMatchRow,
  matchInput: circleFillAutoMatchInput,
  onInput: circleFillAutoOnInput,
  onTextInput: circleFillAutoOnTextInput,
  offInput: circleFillAutoOffInput,
  offTextInput: circleFillAutoOffTextInput
});

bindAutomationControls({
  key: "strokeAutomation",
  enabledInput: lineStrokeAutoEnabledInput,
  invertInput: lineStrokeAutoInvertInput,
  fields: lineStrokeAutoFields,
  connectionInput: lineStrokeAutoConnectionInput,
  tagSelect: lineStrokeAutoTagSelect,
  modeSelect: lineStrokeAutoModeSelect,
  thresholdRow: lineStrokeAutoThresholdRow,
  thresholdInput: lineStrokeAutoThresholdInput,
  matchRow: lineStrokeAutoMatchRow,
  matchInput: lineStrokeAutoMatchInput,
  onInput: lineStrokeAutoOnInput,
  onTextInput: lineStrokeAutoOnTextInput,
  offInput: lineStrokeAutoOffInput,
  offTextInput: lineStrokeAutoOffTextInput
});

bindAutomationControls({
  key: "strokeAutomation",
  enabledInput: rectStrokeAutoEnabledInput,
  invertInput: rectStrokeAutoInvertInput,
  fields: rectStrokeAutoFields,
  connectionInput: rectStrokeAutoConnectionInput,
  tagSelect: rectStrokeAutoTagSelect,
  modeSelect: rectStrokeAutoModeSelect,
  thresholdRow: rectStrokeAutoThresholdRow,
  thresholdInput: rectStrokeAutoThresholdInput,
  matchRow: rectStrokeAutoMatchRow,
  matchInput: rectStrokeAutoMatchInput,
  onInput: rectStrokeAutoOnInput,
  onTextInput: rectStrokeAutoOnTextInput,
  offInput: rectStrokeAutoOffInput,
  offTextInput: rectStrokeAutoOffTextInput
});

bindAutomationControls({
  key: "strokeAutomation",
  enabledInput: circleStrokeAutoEnabledInput,
  invertInput: circleStrokeAutoInvertInput,
  fields: circleStrokeAutoFields,
  connectionInput: circleStrokeAutoConnectionInput,
  tagSelect: circleStrokeAutoTagSelect,
  modeSelect: circleStrokeAutoModeSelect,
  thresholdRow: circleStrokeAutoThresholdRow,
  thresholdInput: circleStrokeAutoThresholdInput,
  matchRow: circleStrokeAutoMatchRow,
  matchInput: circleStrokeAutoMatchInput,
  onInput: circleStrokeAutoOnInput,
  onTextInput: circleStrokeAutoOnTextInput,
  offInput: circleStrokeAutoOffInput,
  offTextInput: circleStrokeAutoOffTextInput
});

bindAutomationControls({
  key: "fillAutomation",
  enabledInput: polygonFillAutoEnabledInput,
  invertInput: polygonFillAutoInvertInput,
  fields: polygonFillAutoFields,
  connectionInput: polygonFillAutoConnectionInput,
  tagSelect: polygonFillAutoTagSelect,
  modeSelect: polygonFillAutoModeSelect,
  thresholdRow: polygonFillAutoThresholdRow,
  thresholdInput: polygonFillAutoThresholdInput,
  matchRow: polygonFillAutoMatchRow,
  matchInput: polygonFillAutoMatchInput,
  onInput: polygonFillAutoOnInput,
  onTextInput: polygonFillAutoOnTextInput,
  offInput: polygonFillAutoOffInput,
  offTextInput: polygonFillAutoOffTextInput
});

bindAutomationControls({
  key: "strokeAutomation",
  enabledInput: polygonStrokeAutoEnabledInput,
  invertInput: polygonStrokeAutoInvertInput,
  fields: polygonStrokeAutoFields,
  connectionInput: polygonStrokeAutoConnectionInput,
  tagSelect: polygonStrokeAutoTagSelect,
  modeSelect: polygonStrokeAutoModeSelect,
  thresholdRow: polygonStrokeAutoThresholdRow,
  thresholdInput: polygonStrokeAutoThresholdInput,
  matchRow: polygonStrokeAutoMatchRow,
  matchInput: polygonStrokeAutoMatchInput,
  onInput: polygonStrokeAutoOnInput,
  onTextInput: polygonStrokeAutoOnTextInput,
  offInput: polygonStrokeAutoOffInput,
  offTextInput: polygonStrokeAutoOffTextInput
});

if (alignLeftBtn) {
  alignLeftBtn.addEventListener("click", () => alignSelected("left"));
}

if (alignCenterBtn) {
  alignCenterBtn.addEventListener("click", () => alignSelected("center"));
}

if (alignRightBtn) {
  alignRightBtn.addEventListener("click", () => alignSelected("right"));
}

if (alignTopBtn) {
  alignTopBtn.addEventListener("click", () => alignSelected("top"));
}

if (alignMiddleBtn) {
  alignMiddleBtn.addEventListener("click", () => alignSelected("middle"));
}

if (alignBottomBtn) {
  alignBottomBtn.addEventListener("click", () => alignSelected("bottom"));
}

if (groupToggleBtn) {
  groupToggleBtn.addEventListener("click", () => {
    if (groupToggleBtn.classList.contains("is-disabled")) return;
    const isSingleGroup = selectedIndices.length === 1
      && currentScreenObj?.objects?.[selectedIndices[0]]?.type === "group";
    if (isSingleGroup) {
      ungroupSelected();
    } else {
      groupSelected();
    }
  });
}

if (alignMenuLeft) {
  alignMenuLeft.addEventListener("click", () => {
    alignSelected("left");
    setMenuOpen(false);
  });
}

if (groupMenuBtn) {
  groupMenuBtn.addEventListener("click", () => {
    groupSelected();
    setMenuOpen(false);
  });
}

if (ungroupMenuBtn) {
  ungroupMenuBtn.addEventListener("click", () => {
    ungroupSelected();
    setMenuOpen(false);
  });
}

if (alignMenuCenter) {
  alignMenuCenter.addEventListener("click", () => {
    alignSelected("center");
    setMenuOpen(false);
  });
}

if (alignMenuRight) {
  alignMenuRight.addEventListener("click", () => {
    alignSelected("right");
    setMenuOpen(false);
  });
}

if (alignMenuTop) {
  alignMenuTop.addEventListener("click", () => {
    alignSelected("top");
    setMenuOpen(false);
  });
}

if (alignMenuMiddle) {
  alignMenuMiddle.addEventListener("click", () => {
    alignSelected("middle");
    setMenuOpen(false);
  });
}

if (alignMenuBottom) {
  alignMenuBottom.addEventListener("click", () => {
    alignSelected("bottom");
    setMenuOpen(false);
  });
}

if (matchMenuWidth) {
  matchMenuWidth.addEventListener("click", () => {
    if (matchMenuWidth.classList.contains("is-disabled")) return;
    matchSelectedSize("width");
    setMenuOpen(false);
  });
}

if (matchMenuHeight) {
  matchMenuHeight.addEventListener("click", () => {
    if (matchMenuHeight.classList.contains("is-disabled")) return;
    matchSelectedSize("height");
    setMenuOpen(false);
  });
}

if (matchMenuSize) {
  matchMenuSize.addEventListener("click", () => {
    if (matchMenuSize.classList.contains("is-disabled")) return;
    matchSelectedSize("size");
    setMenuOpen(false);
  });
}

if (spaceMenuHorizontal) {
  spaceMenuHorizontal.addEventListener("click", () => {
    if (spaceMenuHorizontal.classList.contains("is-disabled")) return;
    spaceSelectedEvenly("x");
    setMenuOpen(false);
  });
}

if (spaceMenuVertical) {
  spaceMenuVertical.addEventListener("click", () => {
    if (spaceMenuVertical.classList.contains("is-disabled")) return;
    spaceSelectedEvenly("y");
    setMenuOpen(false);
  });
}

if (flipMenuHorizontal) {
  flipMenuHorizontal.addEventListener("click", () => {
    if (flipMenuHorizontal.classList.contains("is-disabled")) return;
    flipSelected("horizontal");
    setMenuOpen(false);
  });
}

if (flipMenuVertical) {
  flipMenuVertical.addEventListener("click", () => {
    if (flipMenuVertical.classList.contains("is-disabled")) return;
    flipSelected("vertical");
    setMenuOpen(false);
  });
}

if (moveToFrontMenuBtn) {
  moveToFrontMenuBtn.addEventListener("click", () => {
    if (moveToFrontMenuBtn.classList.contains("is-disabled")) return;
    moveSelectionToFront();
    setMenuOpen(false);
  });
}

if (moveToBackMenuBtn) {
  moveToBackMenuBtn.addEventListener("click", () => {
    if (moveToBackMenuBtn.classList.contains("is-disabled")) return;
    moveSelectionToBack();
    setMenuOpen(false);
  });
}

if (exportSelectionSvgBtn) {
  exportSelectionSvgBtn.addEventListener("click", async () => {
    if (!isEditMode) return;
    if (!selectedIndices.length) return;
    const raw = exportSelectionToSvgRaw();
    if (!raw) return;
    const suggested = `selection_${Date.now()}.svg`;
    const desired = window.prompt("Save selection as SVG in public/img (name):", suggested);
    if (!desired) return;
    try {
      if (editorStatus) editorStatus.textContent = "Saving selection…";
      await saveSvgToImageFolder(desired, raw);
      await loadImageFiles();
      if (editorStatus) editorStatus.textContent = `Saved ${desired}.`;
    } catch (error) {
      if (editorStatus) editorStatus.textContent = `Export failed: ${error.message}`;
    } finally {
      setMenuOpen(false);
    }
  });
}

if (explodeSelectedSvgBtn) {
  explodeSelectedSvgBtn.addEventListener("click", async () => {
    if (explodeSelectedSvgBtn.classList.contains("is-disabled")) return;
    try {
      if (editorStatus) editorStatus.textContent = "Exploding SVG…";
      await explodeSelectedSvgImage();
      if (editorStatus) editorStatus.textContent = "Exploded SVG.";
    } catch (error) {
      if (editorStatus) editorStatus.textContent = `Explode failed: ${error.message}`;
    } finally {
      setMenuOpen(false);
    }
  });
}

if (menuToggleBtn) {
  menuToggleBtn.addEventListener("click", () => {
    const isOpen = menuDropdown?.classList.contains("is-open");
    setMenuOpen(!isOpen);
  });
}

document.addEventListener("click", (event) => {
  if (!menuDropdown || !menuToggleBtn) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (menuDropdown.contains(target) || menuToggleBtn.contains(target)) return;
  setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setMenuOpen(false);
});

window.addEventListener("keydown", (event) => {
  if (!isEditMode) return;
  if (event.key !== "Escape") return;
  if (!groupEditStack.length) return;
  event.preventDefault();
  exitGroupEdit();
});

window.addEventListener("keydown", (event) => {
  if (!isEditMode) return;
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase?.() || "";
  const typing = tag === "input" || tag === "textarea" || el?.isContentEditable;
  if (typing) return;
	  if (event.key === "Escape" && (isDrawingPolyline || isDrawingPolygon)) {
	    event.preventDefault();
	    if (isDrawingPolyline) finishPolylineDraft();
	    if (isDrawingPolygon) finishPolygonDraft();
	    isDrawingPolyline = false;
	    isDrawingPolygon = false;
	    setTool("select");
	    return;
	  }
	  if (event.key === "Escape" && isDrawingRegularPolygon) {
	    event.preventDefault();
	    finishRegularPolygonDraft();
	    isDrawingRegularPolygon = false;
	    setTool("select");
	    return;
	  }
	  if (event.key === "Enter" && currentTool === "polyline" && isDrawingPolyline) {
	    event.preventDefault();
	    if (!currentScreenObj) return;
	    const activeObjects = ensureActiveObjects();
	    if (!activeObjects) return;
    const points = polylineDraftPoints.map((pt) => {
      const local = toActivePoint(pt);
      return { x: snapValue(Math.round(local.x)), y: snapValue(Math.round(local.y)) };
    });
    if (points.length >= 2) {
      recordHistory();
      activeObjects.push({ type: "polyline", points, stroke: "#ffffff", strokeWidth: 2 });
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setDirty(true);
      setEditorTab("properties");
    }
    finishPolylineDraft();
    isDrawingPolyline = false;
    setTool("select");
    return;
  }
  if (event.key === "Enter" && currentTool === "polygon" && isDrawingPolygon) {
    event.preventDefault();
    if (!currentScreenObj) return;
    const activeObjects = ensureActiveObjects();
    if (!activeObjects) return;
    const points = polygonDraftPoints.map((pt) => {
      const local = toActivePoint(pt);
      return { x: snapValue(Math.round(local.x)), y: snapValue(Math.round(local.y)) };
    });
    if (points.length >= 3) {
      recordHistory();
      activeObjects.push({ type: "polygon", points, fill: "#3a3f4b", stroke: "#ffffff", strokeWidth: 1 });
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setDirty(true);
      setEditorTab("properties");
    }
    finishPolygonDraft();
    isDrawingPolygon = false;
    setTool("select");
  }
});

buildSwatches(screenBgSwatches, (color) => {
  updateScreenProperty({ background: color });
  if (screenBgInput) screenBgInput.value = color;
  if (screenBgTextInput) screenBgTextInput.value = color;
  closeSwatches();
});

buildSwatches(screenBorderSwatches, (color) => {
  updateScreenBorder({ color });
  if (screenBorderColorInput) screenBorderColorInput.value = color;
  if (screenBorderColorTextInput) screenBorderColorTextInput.value = color;
  closeSwatches();
});

buildSwatches(textFillSwatches, (color) => {
  updateTextProperty({ fill: color });
  if (textFillInput) textFillInput.value = color;
  if (textFillTextInput) textFillTextInput.value = color;
  closeSwatches();
});

buildSwatches(textBgSwatches, (color) => {
  updateTextProperty({ background: color });
  if (textBgInput) textBgInput.value = color;
  if (textBgTextInput) textBgTextInput.value = color;
  closeSwatches();
});

buildSwatches(textBorderSwatches, (color) => {
  updateTextProperty({ borderColor: color });
  if (textBorderColorInput) textBorderColorInput.value = color;
  if (textBorderColorTextInput) textBorderColorTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonFillSwatches, (color) => {
  updateButtonProperty({ fill: color });
  if (buttonFillInput) buttonFillInput.value = color;
  if (buttonFillTextInput) buttonFillTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonTextColorSwatches, (color) => {
  updateButtonProperty({ textColor: color });
  if (buttonTextColorInput) buttonTextColorInput.value = color;
  if (buttonTextColorTextInput) buttonTextColorTextInput.value = color;
  closeSwatches();
});

buildSwatches(viewportBorderSwatches, (color) => {
  updateViewportBorder({ color });
  if (viewportBorderColorInput) viewportBorderColorInput.value = color;
  if (viewportBorderColorTextInput) viewportBorderColorTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonStrokeSwatches, (color) => {
  updateButtonProperty({ stroke: color });
  if (buttonStrokeInput) buttonStrokeInput.value = color;
  if (buttonStrokeTextInput) buttonStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(rectFillSwatches, (color) => {
  updateRectProperty({ fill: color });
  if (rectFillInput) rectFillInput.value = color;
  if (rectFillTextInput) rectFillTextInput.value = color;
  closeSwatches();
});

buildSwatches(rectStrokeSwatches, (color) => {
  updateRectProperty({ stroke: color });
  if (rectStrokeInput) rectStrokeInput.value = color;
  if (rectStrokeTextInput) rectStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(circleFillSwatches, (color) => {
  updateCircleProperty({ fill: color });
  if (circleFillInput) circleFillInput.value = color;
  if (circleFillTextInput) circleFillTextInput.value = color;
  closeSwatches();
});

buildSwatches(circleStrokeSwatches, (color) => {
  updateCircleProperty({ stroke: color });
  if (circleStrokeInput) circleStrokeInput.value = color;
  if (circleStrokeTextInput) circleStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(lineStrokeSwatches, (color) => {
  updateLineProperty({ stroke: color });
  if (lineStrokeInput) lineStrokeInput.value = color;
  if (lineStrokeTextInput) lineStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(curveStrokeSwatches, (color) => {
  updateCurveProperty({ stroke: color });
  if (curveStrokeInput) curveStrokeInput.value = color;
  if (curveStrokeTextInput) curveStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(polylineStrokeSwatches, (color) => {
  updatePolylineProperty({ stroke: color });
  if (polylineStrokeInput) polylineStrokeInput.value = color;
  if (polylineStrokeTextInput) polylineStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(polygonFillSwatches, (color) => {
  updatePolygonProperty({ fill: color });
  if (polygonFillInput) polygonFillInput.value = color;
  if (polygonFillTextInput) polygonFillTextInput.value = color;
  closeSwatches();
});

buildSwatches(polygonStrokeSwatches, (color) => {
  updatePolygonProperty({ stroke: color });
  if (polygonStrokeInput) polygonStrokeInput.value = color;
  if (polygonStrokeTextInput) polygonStrokeTextInput.value = color;
  closeSwatches();
});

buildSwatches(barFillSwatches, (color) => {
  updateBarProperty({ fill: color });
  if (barFillInput) barFillInput.value = color;
  if (barFillTextInput) barFillTextInput.value = color;
  closeSwatches();
});

buildSwatches(barBackgroundSwatches, (color) => {
  updateBarProperty({ background: color });
  if (barBackgroundInput) barBackgroundInput.value = color;
  if (barBackgroundTextInput) barBackgroundTextInput.value = color;
  closeSwatches();
});

buildSwatches(barBorderSwatches, (color) => {
  updateBarBorder({ color });
  if (barBorderColorInput) barBorderColorInput.value = color;
  if (barBorderColorTextInput) barBorderColorTextInput.value = color;
  closeSwatches();
});

buildSwatches(numberInputFillSwatches, (color) => {
  updateNumberInputProperty({ fill: color });
  if (numberInputFillTextInput) numberInputFillTextInput.value = color;
  if (numberInputFillInput && isHexColor(color)) numberInputFillInput.value = color;
  closeSwatches();
});

buildSwatches(numberInputTextColorSwatches, (color) => {
  updateNumberInputProperty({ textColor: color });
  if (numberInputTextColorTextInput) numberInputTextColorTextInput.value = color;
  if (numberInputTextColorInput && isHexColor(color)) numberInputTextColorInput.value = color;
  closeSwatches();
});

buildSwatches(numberInputStrokeSwatches, (color) => {
  updateNumberInputProperty({ stroke: color });
  if (numberInputStrokeTextInput) numberInputStrokeTextInput.value = color;
  if (numberInputStrokeInput && isHexColor(color)) numberInputStrokeInput.value = color;
  closeSwatches();
});

buildSwatches(indicatorFillSwatches, (color) => {
  updateIndicatorProperty({ fill: color });
  if (indicatorFillTextInput) indicatorFillTextInput.value = color;
  if (indicatorFillInput && isHexColor(color)) indicatorFillInput.value = color;
  closeSwatches();
});

buildSwatches(indicatorTextColorSwatches, (color) => {
  updateIndicatorProperty({ textColor: color });
  if (indicatorTextColorTextInput) indicatorTextColorTextInput.value = color;
  if (indicatorTextColorInput && isHexColor(color)) indicatorTextColorInput.value = color;
  closeSwatches();
});

buildSwatches(indicatorStrokeSwatches, (color) => {
  updateIndicatorProperty({ stroke: color });
  if (indicatorStrokeTextInput) indicatorStrokeTextInput.value = color;
  if (indicatorStrokeInput && isHexColor(color)) indicatorStrokeInput.value = color;
  closeSwatches();
});

buildSwatches(textAutoOnSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { onColor: color, enabled: true });
  if (textAutoOnInput) textAutoOnInput.value = color;
  if (textAutoOnTextInput) textAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(textAutoOffSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { offColor: color, enabled: true });
  if (textAutoOffInput) textAutoOffInput.value = color;
  if (textAutoOffTextInput) textAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonFillAutoOnSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { onColor: color, enabled: true });
  if (buttonFillAutoOnInput) buttonFillAutoOnInput.value = color;
  if (buttonFillAutoOnTextInput) buttonFillAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonFillAutoOffSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { offColor: color, enabled: true });
  if (buttonFillAutoOffInput) buttonFillAutoOffInput.value = color;
  if (buttonFillAutoOffTextInput) buttonFillAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonTextAutoOnSwatches, (color) => {
  updateAutomationProperty("textColorAutomation", { onColor: color, enabled: true });
  if (buttonTextAutoOnInput) buttonTextAutoOnInput.value = color;
  if (buttonTextAutoOnTextInput) buttonTextAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(buttonTextAutoOffSwatches, (color) => {
  updateAutomationProperty("textColorAutomation", { offColor: color, enabled: true });
  if (buttonTextAutoOffInput) buttonTextAutoOffInput.value = color;
  if (buttonTextAutoOffTextInput) buttonTextAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(rectFillAutoOnSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { onColor: color, enabled: true });
  if (rectFillAutoOnInput) rectFillAutoOnInput.value = color;
  if (rectFillAutoOnTextInput) rectFillAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(rectFillAutoOffSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { offColor: color, enabled: true });
  if (rectFillAutoOffInput) rectFillAutoOffInput.value = color;
  if (rectFillAutoOffTextInput) rectFillAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(circleFillAutoOnSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { onColor: color, enabled: true });
  if (circleFillAutoOnInput) circleFillAutoOnInput.value = color;
  if (circleFillAutoOnTextInput) circleFillAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(circleFillAutoOffSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { offColor: color, enabled: true });
  if (circleFillAutoOffInput) circleFillAutoOffInput.value = color;
  if (circleFillAutoOffTextInput) circleFillAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(rectStrokeAutoOnSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { onColor: color, enabled: true });
  if (rectStrokeAutoOnInput) rectStrokeAutoOnInput.value = color;
  if (rectStrokeAutoOnTextInput) rectStrokeAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(rectStrokeAutoOffSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { offColor: color, enabled: true });
  if (rectStrokeAutoOffInput) rectStrokeAutoOffInput.value = color;
  if (rectStrokeAutoOffTextInput) rectStrokeAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(circleStrokeAutoOnSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { onColor: color, enabled: true });
  if (circleStrokeAutoOnInput) circleStrokeAutoOnInput.value = color;
  if (circleStrokeAutoOnTextInput) circleStrokeAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(circleStrokeAutoOffSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { offColor: color, enabled: true });
  if (circleStrokeAutoOffInput) circleStrokeAutoOffInput.value = color;
  if (circleStrokeAutoOffTextInput) circleStrokeAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(lineStrokeAutoOnSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { onColor: color, enabled: true });
  if (lineStrokeAutoOnInput) lineStrokeAutoOnInput.value = color;
  if (lineStrokeAutoOnTextInput) lineStrokeAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(lineStrokeAutoOffSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { offColor: color, enabled: true });
  if (lineStrokeAutoOffInput) lineStrokeAutoOffInput.value = color;
  if (lineStrokeAutoOffTextInput) lineStrokeAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(polygonFillAutoOnSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { onColor: color, enabled: true });
  if (polygonFillAutoOnInput) polygonFillAutoOnInput.value = color;
  if (polygonFillAutoOnTextInput) polygonFillAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(polygonFillAutoOffSwatches, (color) => {
  updateAutomationProperty("fillAutomation", { offColor: color, enabled: true });
  if (polygonFillAutoOffInput) polygonFillAutoOffInput.value = color;
  if (polygonFillAutoOffTextInput) polygonFillAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(polygonStrokeAutoOnSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { onColor: color, enabled: true });
  if (polygonStrokeAutoOnInput) polygonStrokeAutoOnInput.value = color;
  if (polygonStrokeAutoOnTextInput) polygonStrokeAutoOnTextInput.value = color;
  closeSwatches();
});

buildSwatches(polygonStrokeAutoOffSwatches, (color) => {
  updateAutomationProperty("strokeAutomation", { offColor: color, enabled: true });
  if (polygonStrokeAutoOffInput) polygonStrokeAutoOffInput.value = color;
  if (polygonStrokeAutoOffTextInput) polygonStrokeAutoOffTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelHeaderBgSwatches, (color) => {
  updateRectProperty({ headerBg: color });
  if (alarmsPanelHeaderBgInput) alarmsPanelHeaderBgInput.value = color;
  if (alarmsPanelHeaderBgTextInput) alarmsPanelHeaderBgTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelHeaderTextSwatches, (color) => {
  updateRectProperty({ headerText: color });
  if (alarmsPanelHeaderTextInput) alarmsPanelHeaderTextInput.value = color;
  if (alarmsPanelHeaderTextTextInput) alarmsPanelHeaderTextTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowBgNormalSwatches, (color) => {
  updateRectProperty({ rowBg: color });
  if (alarmsPanelRowBgNormalInput) alarmsPanelRowBgNormalInput.value = color;
  if (alarmsPanelRowBgNormalTextInput) alarmsPanelRowBgNormalTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowBgActiveUnackedSwatches, (color) => {
  updateRectProperty({ rowBgActiveUnacked: color });
  if (alarmsPanelRowBgActiveUnackedInput) alarmsPanelRowBgActiveUnackedInput.value = color;
  if (alarmsPanelRowBgActiveUnackedTextInput) alarmsPanelRowBgActiveUnackedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowBgActiveAckedSwatches, (color) => {
  updateRectProperty({ rowBgActiveAcked: color });
  if (alarmsPanelRowBgActiveAckedInput) alarmsPanelRowBgActiveAckedInput.value = color;
  if (alarmsPanelRowBgActiveAckedTextInput) alarmsPanelRowBgActiveAckedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowBgReturnedSwatches, (color) => {
  updateRectProperty({ rowBgReturned: color });
  if (alarmsPanelRowBgReturnedInput) alarmsPanelRowBgReturnedInput.value = color;
  if (alarmsPanelRowBgReturnedTextInput) alarmsPanelRowBgReturnedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowBgBadQualitySwatches, (color) => {
  updateRectProperty({ rowBgBadQuality: color });
  if (alarmsPanelRowBgBadQualityInput) alarmsPanelRowBgBadQualityInput.value = color;
  if (alarmsPanelRowBgBadQualityTextInput) alarmsPanelRowBgBadQualityTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowTextNormalSwatches, (color) => {
  updateRectProperty({ rowText: color });
  if (alarmsPanelRowTextNormalInput) alarmsPanelRowTextNormalInput.value = color;
  if (alarmsPanelRowTextNormalTextInput) alarmsPanelRowTextNormalTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowTextActiveUnackedSwatches, (color) => {
  updateRectProperty({ rowTextActiveUnacked: color });
  if (alarmsPanelRowTextActiveUnackedInput) alarmsPanelRowTextActiveUnackedInput.value = color;
  if (alarmsPanelRowTextActiveUnackedTextInput) alarmsPanelRowTextActiveUnackedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowTextActiveAckedSwatches, (color) => {
  updateRectProperty({ rowTextActiveAcked: color });
  if (alarmsPanelRowTextActiveAckedInput) alarmsPanelRowTextActiveAckedInput.value = color;
  if (alarmsPanelRowTextActiveAckedTextInput) alarmsPanelRowTextActiveAckedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowTextReturnedSwatches, (color) => {
  updateRectProperty({ rowTextReturned: color });
  if (alarmsPanelRowTextReturnedInput) alarmsPanelRowTextReturnedInput.value = color;
  if (alarmsPanelRowTextReturnedTextInput) alarmsPanelRowTextReturnedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelRowTextBadQualitySwatches, (color) => {
  updateRectProperty({ rowTextBadQuality: color });
  if (alarmsPanelRowTextBadQualityInput) alarmsPanelRowTextBadQualityInput.value = color;
  if (alarmsPanelRowTextBadQualityTextInput) alarmsPanelRowTextBadQualityTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelStripeActiveUnackedSwatches, (color) => {
  updateRectProperty({ stripeActiveUnacked: color });
  if (alarmsPanelStripeActiveUnackedInput) alarmsPanelStripeActiveUnackedInput.value = color;
  if (alarmsPanelStripeActiveUnackedTextInput) alarmsPanelStripeActiveUnackedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelStripeActiveAckedSwatches, (color) => {
  updateRectProperty({ stripeActiveAcked: color });
  if (alarmsPanelStripeActiveAckedInput) alarmsPanelStripeActiveAckedInput.value = color;
  if (alarmsPanelStripeActiveAckedTextInput) alarmsPanelStripeActiveAckedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelStripeReturnedSwatches, (color) => {
  updateRectProperty({ stripeReturned: color });
  if (alarmsPanelStripeReturnedInput) alarmsPanelStripeReturnedInput.value = color;
  if (alarmsPanelStripeReturnedTextInput) alarmsPanelStripeReturnedTextInput.value = color;
  closeSwatches();
});

buildSwatches(alarmsPanelStripeBadQualitySwatches, (color) => {
  updateRectProperty({ stripeBadQuality: color });
  if (alarmsPanelStripeBadQualityInput) alarmsPanelStripeBadQualityInput.value = color;
  if (alarmsPanelStripeBadQualityTextInput) alarmsPanelStripeBadQualityTextInput.value = color;
  closeSwatches();
});

if (screenBgSwatchBtn && screenBgSwatches) {
  screenBgSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(screenBgSwatches);
  });
}

if (screenBorderSwatchBtn && screenBorderSwatches) {
  screenBorderSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(screenBorderSwatches);
  });
}

if (textFillSwatchBtn && textFillSwatches) {
  textFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(textFillSwatches);
  });
}

if (textBgSwatchBtn && textBgSwatches) {
  textBgSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(textBgSwatches);
  });
}

if (textBorderSwatchBtn && textBorderSwatches) {
  textBorderSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(textBorderSwatches);
  });
}

if (buttonFillSwatchBtn && buttonFillSwatches) {
  buttonFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonFillSwatches);
  });
}

if (buttonTextColorSwatchBtn && buttonTextColorSwatches) {
  buttonTextColorSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonTextColorSwatches);
  });
}

if (buttonStrokeSwatchBtn && buttonStrokeSwatches) {
  buttonStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonStrokeSwatches);
  });
}

if (viewportBorderSwatchBtn && viewportBorderSwatches) {
  viewportBorderSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(viewportBorderSwatches);
  });
}

if (rectFillSwatchBtn && rectFillSwatches) {
  rectFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(rectFillSwatches);
  });
}

if (rectStrokeSwatchBtn && rectStrokeSwatches) {
  rectStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(rectStrokeSwatches);
  });
}

if (circleFillSwatchBtn && circleFillSwatches) {
  circleFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(circleFillSwatches);
  });
}

if (circleStrokeSwatchBtn && circleStrokeSwatches) {
  circleStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(circleStrokeSwatches);
  });
}

if (lineStrokeSwatchBtn && lineStrokeSwatches) {
  lineStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(lineStrokeSwatches);
  });
}

if (curveStrokeSwatchBtn && curveStrokeSwatches) {
  curveStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(curveStrokeSwatches);
  });
}

if (polylineStrokeSwatchBtn && polylineStrokeSwatches) {
  polylineStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polylineStrokeSwatches);
  });
}

if (polygonFillSwatchBtn && polygonFillSwatches) {
  polygonFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polygonFillSwatches);
  });
}

if (polygonStrokeSwatchBtn && polygonStrokeSwatches) {
  polygonStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polygonStrokeSwatches);
  });
}

if (barFillSwatchBtn && barFillSwatches) {
  barFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(barFillSwatches);
  });
}

if (barBackgroundSwatchBtn && barBackgroundSwatches) {
  barBackgroundSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(barBackgroundSwatches);
  });
}

if (barBorderSwatchBtn && barBorderSwatches) {
  barBorderSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(barBorderSwatches);
  });
}

if (numberInputFillSwatchBtn && numberInputFillSwatches) {
  numberInputFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(numberInputFillSwatches);
  });
}

if (numberInputTextColorSwatchBtn && numberInputTextColorSwatches) {
  numberInputTextColorSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(numberInputTextColorSwatches);
  });
}

if (numberInputStrokeSwatchBtn && numberInputStrokeSwatches) {
  numberInputStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(numberInputStrokeSwatches);
  });
}

if (indicatorFillSwatchBtn && indicatorFillSwatches) {
  indicatorFillSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(indicatorFillSwatches);
  });
}

if (indicatorTextColorSwatchBtn && indicatorTextColorSwatches) {
  indicatorTextColorSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(indicatorTextColorSwatches);
  });
}

if (indicatorStrokeSwatchBtn && indicatorStrokeSwatches) {
  indicatorStrokeSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(indicatorStrokeSwatches);
  });
}

if (textAutoOnSwatchBtn && textAutoOnSwatches) {
  textAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(textAutoOnSwatches);
  });
}

if (textAutoOffSwatchBtn && textAutoOffSwatches) {
  textAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(textAutoOffSwatches);
  });
}

if (buttonFillAutoOnSwatchBtn && buttonFillAutoOnSwatches) {
  buttonFillAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonFillAutoOnSwatches);
  });
}

if (buttonFillAutoOffSwatchBtn && buttonFillAutoOffSwatches) {
  buttonFillAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonFillAutoOffSwatches);
  });
}

if (buttonTextAutoOnSwatchBtn && buttonTextAutoOnSwatches) {
  buttonTextAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonTextAutoOnSwatches);
  });
}

if (buttonTextAutoOffSwatchBtn && buttonTextAutoOffSwatches) {
  buttonTextAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(buttonTextAutoOffSwatches);
  });
}

if (rectFillAutoOnSwatchBtn && rectFillAutoOnSwatches) {
  rectFillAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(rectFillAutoOnSwatches);
  });
}

if (rectFillAutoOffSwatchBtn && rectFillAutoOffSwatches) {
  rectFillAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(rectFillAutoOffSwatches);
  });
}

if (circleFillAutoOnSwatchBtn && circleFillAutoOnSwatches) {
  circleFillAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(circleFillAutoOnSwatches);
  });
}

if (circleFillAutoOffSwatchBtn && circleFillAutoOffSwatches) {
  circleFillAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(circleFillAutoOffSwatches);
  });
}

if (rectStrokeAutoOnSwatchBtn && rectStrokeAutoOnSwatches) {
  rectStrokeAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(rectStrokeAutoOnSwatches);
  });
}

if (rectStrokeAutoOffSwatchBtn && rectStrokeAutoOffSwatches) {
  rectStrokeAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(rectStrokeAutoOffSwatches);
  });
}

if (circleStrokeAutoOnSwatchBtn && circleStrokeAutoOnSwatches) {
  circleStrokeAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(circleStrokeAutoOnSwatches);
  });
}

if (circleStrokeAutoOffSwatchBtn && circleStrokeAutoOffSwatches) {
  circleStrokeAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(circleStrokeAutoOffSwatches);
  });
}

if (lineStrokeAutoOnSwatchBtn && lineStrokeAutoOnSwatches) {
  lineStrokeAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(lineStrokeAutoOnSwatches);
  });
}

if (lineStrokeAutoOffSwatchBtn && lineStrokeAutoOffSwatches) {
  lineStrokeAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(lineStrokeAutoOffSwatches);
  });
}

if (polygonFillAutoOnSwatchBtn && polygonFillAutoOnSwatches) {
  polygonFillAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polygonFillAutoOnSwatches);
  });
}

if (polygonFillAutoOffSwatchBtn && polygonFillAutoOffSwatches) {
  polygonFillAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polygonFillAutoOffSwatches);
  });
}

if (polygonStrokeAutoOnSwatchBtn && polygonStrokeAutoOnSwatches) {
  polygonStrokeAutoOnSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polygonStrokeAutoOnSwatches);
  });
}

if (polygonStrokeAutoOffSwatchBtn && polygonStrokeAutoOffSwatches) {
  polygonStrokeAutoOffSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(polygonStrokeAutoOffSwatches);
  });
}

if (alarmsPanelHeaderBgSwatchBtn && alarmsPanelHeaderBgSwatches) {
  alarmsPanelHeaderBgSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelHeaderBgSwatches);
  });
}

if (alarmsPanelHeaderTextSwatchBtn && alarmsPanelHeaderTextSwatches) {
  alarmsPanelHeaderTextSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelHeaderTextSwatches);
  });
}

if (alarmsPanelRowBgNormalSwatchBtn && alarmsPanelRowBgNormalSwatches) {
  alarmsPanelRowBgNormalSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowBgNormalSwatches);
  });
}

if (alarmsPanelRowBgActiveUnackedSwatchBtn && alarmsPanelRowBgActiveUnackedSwatches) {
  alarmsPanelRowBgActiveUnackedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowBgActiveUnackedSwatches);
  });
}

if (alarmsPanelRowBgActiveAckedSwatchBtn && alarmsPanelRowBgActiveAckedSwatches) {
  alarmsPanelRowBgActiveAckedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowBgActiveAckedSwatches);
  });
}

if (alarmsPanelRowBgReturnedSwatchBtn && alarmsPanelRowBgReturnedSwatches) {
  alarmsPanelRowBgReturnedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowBgReturnedSwatches);
  });
}

if (alarmsPanelRowBgBadQualitySwatchBtn && alarmsPanelRowBgBadQualitySwatches) {
  alarmsPanelRowBgBadQualitySwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowBgBadQualitySwatches);
  });
}

if (alarmsPanelRowTextNormalSwatchBtn && alarmsPanelRowTextNormalSwatches) {
  alarmsPanelRowTextNormalSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowTextNormalSwatches);
  });
}

if (alarmsPanelRowTextActiveUnackedSwatchBtn && alarmsPanelRowTextActiveUnackedSwatches) {
  alarmsPanelRowTextActiveUnackedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowTextActiveUnackedSwatches);
  });
}

if (alarmsPanelRowTextActiveAckedSwatchBtn && alarmsPanelRowTextActiveAckedSwatches) {
  alarmsPanelRowTextActiveAckedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowTextActiveAckedSwatches);
  });
}

if (alarmsPanelRowTextReturnedSwatchBtn && alarmsPanelRowTextReturnedSwatches) {
  alarmsPanelRowTextReturnedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowTextReturnedSwatches);
  });
}

if (alarmsPanelRowTextBadQualitySwatchBtn && alarmsPanelRowTextBadQualitySwatches) {
  alarmsPanelRowTextBadQualitySwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelRowTextBadQualitySwatches);
  });
}

if (alarmsPanelStripeActiveUnackedSwatchBtn && alarmsPanelStripeActiveUnackedSwatches) {
  alarmsPanelStripeActiveUnackedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelStripeActiveUnackedSwatches);
  });
}

if (alarmsPanelStripeActiveAckedSwatchBtn && alarmsPanelStripeActiveAckedSwatches) {
  alarmsPanelStripeActiveAckedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelStripeActiveAckedSwatches);
  });
}

if (alarmsPanelStripeReturnedSwatchBtn && alarmsPanelStripeReturnedSwatches) {
  alarmsPanelStripeReturnedSwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelStripeReturnedSwatches);
  });
}

if (alarmsPanelStripeBadQualitySwatchBtn && alarmsPanelStripeBadQualitySwatches) {
  alarmsPanelStripeBadQualitySwatchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSwatches(alarmsPanelStripeBadQualitySwatches);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof Element) {
    if (target.closest(".swatch-popover") || target.closest(".swatch-btn")) return;
  }
  if (
    screenBgSwatches?.contains(target) ||
    screenBorderSwatches?.contains(target) ||
    textFillSwatches?.contains(target) ||
    textBgSwatches?.contains(target) ||
    textBorderSwatches?.contains(target) ||
    buttonFillSwatches?.contains(target) ||
    buttonTextColorSwatches?.contains(target) ||
    buttonStrokeSwatches?.contains(target) ||
    viewportBorderSwatches?.contains(target) ||
    rectFillSwatches?.contains(target) ||
	    rectStrokeSwatches?.contains(target) ||
	    circleFillSwatches?.contains(target) ||
	    circleStrokeSwatches?.contains(target) ||
	    lineStrokeSwatches?.contains(target) ||
	    curveStrokeSwatches?.contains(target) ||
	    polylineStrokeSwatches?.contains(target) ||
	    polygonFillSwatches?.contains(target) ||
	    polygonStrokeSwatches?.contains(target) ||
	    barFillSwatches?.contains(target) ||
	    barBackgroundSwatches?.contains(target) ||
	    barBorderSwatches?.contains(target) ||
	    numberInputFillSwatches?.contains(target) ||
	    numberInputTextColorSwatches?.contains(target) ||
	    numberInputStrokeSwatches?.contains(target) ||
	    indicatorFillSwatches?.contains(target) ||
	    indicatorTextColorSwatches?.contains(target) ||
	    indicatorStrokeSwatches?.contains(target) ||
	    textAutoOnSwatches?.contains(target) ||
	    textAutoOffSwatches?.contains(target) ||
    buttonFillAutoOnSwatches?.contains(target) ||
    buttonFillAutoOffSwatches?.contains(target) ||
    buttonTextAutoOnSwatches?.contains(target) ||
    buttonTextAutoOffSwatches?.contains(target) ||
    rectFillAutoOnSwatches?.contains(target) ||
    rectFillAutoOffSwatches?.contains(target) ||
    circleFillAutoOnSwatches?.contains(target) ||
    circleFillAutoOffSwatches?.contains(target) ||
    rectStrokeAutoOnSwatches?.contains(target) ||
    rectStrokeAutoOffSwatches?.contains(target) ||
    circleStrokeAutoOnSwatches?.contains(target) ||
    circleStrokeAutoOffSwatches?.contains(target) ||
    lineStrokeAutoOnSwatches?.contains(target) ||
    lineStrokeAutoOffSwatches?.contains(target) ||
    polygonFillAutoOnSwatches?.contains(target) ||
    polygonFillAutoOffSwatches?.contains(target) ||
    polygonStrokeAutoOnSwatches?.contains(target) ||
    polygonStrokeAutoOffSwatches?.contains(target) ||
    screenBgSwatchBtn?.contains(target) ||
    screenBorderSwatchBtn?.contains(target) ||
    textFillSwatchBtn?.contains(target) ||
    textBgSwatchBtn?.contains(target) ||
    textBorderSwatchBtn?.contains(target) ||
    buttonFillSwatchBtn?.contains(target) ||
	    buttonTextColorSwatchBtn?.contains(target) ||
	    buttonStrokeSwatchBtn?.contains(target) ||
	    lineStrokeSwatchBtn?.contains(target) ||
	    curveStrokeSwatchBtn?.contains(target) ||
	    barFillSwatchBtn?.contains(target) ||
	    barBackgroundSwatchBtn?.contains(target) ||
	    barBorderSwatchBtn?.contains(target) ||
	    numberInputFillSwatchBtn?.contains(target) ||
	    numberInputTextColorSwatchBtn?.contains(target) ||
	    numberInputStrokeSwatchBtn?.contains(target) ||
	    indicatorFillSwatchBtn?.contains(target) ||
	    indicatorTextColorSwatchBtn?.contains(target) ||
	    indicatorStrokeSwatchBtn?.contains(target) ||
	    rectFillSwatchBtn?.contains(target) ||
	    rectStrokeSwatchBtn?.contains(target) ||
	    circleFillSwatchBtn?.contains(target) ||
	    circleStrokeSwatchBtn?.contains(target) ||
	    polylineStrokeSwatchBtn?.contains(target) ||
	    polygonFillSwatchBtn?.contains(target) ||
	    polygonStrokeSwatchBtn?.contains(target) ||
	    viewportBorderSwatchBtn?.contains(target) ||
	    textAutoOnSwatchBtn?.contains(target) ||
	    textAutoOffSwatchBtn?.contains(target) ||
    buttonFillAutoOnSwatchBtn?.contains(target) ||
    buttonFillAutoOffSwatchBtn?.contains(target) ||
    buttonTextAutoOnSwatchBtn?.contains(target) ||
    buttonTextAutoOffSwatchBtn?.contains(target) ||
    rectFillAutoOnSwatchBtn?.contains(target) ||
    rectFillAutoOffSwatchBtn?.contains(target) ||
    circleFillAutoOnSwatchBtn?.contains(target) ||
    circleFillAutoOffSwatchBtn?.contains(target) ||
    rectStrokeAutoOnSwatchBtn?.contains(target) ||
    rectStrokeAutoOffSwatchBtn?.contains(target) ||
    circleStrokeAutoOnSwatchBtn?.contains(target) ||
    circleStrokeAutoOffSwatchBtn?.contains(target) ||
    lineStrokeAutoOnSwatchBtn?.contains(target) ||
    lineStrokeAutoOffSwatchBtn?.contains(target) ||
    polygonFillAutoOnSwatchBtn?.contains(target) ||
    polygonFillAutoOffSwatchBtn?.contains(target) ||
    polygonStrokeAutoOnSwatchBtn?.contains(target) ||
    polygonStrokeAutoOffSwatchBtn?.contains(target)
  ) {
    return;
  }
  closeSwatches();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSwatches();
});

const getScreenPoint = (event) => {
  if (!screen) return null;
  const rect = screen.getBoundingClientRect();
  const scaleX = rect.width / lastScreenSize.width || 1;
  const scaleY = rect.height / lastScreenSize.height || 1;
  return {
    x: (event.clientX - rect.left) / scaleX,
    y: (event.clientY - rect.top) / scaleY
  };
};

function updateSelectionOverlays() {
  if (!selectionLayer || !renderedElementMeta.length) return;
  selectionLayer.textContent = "";
  if (resizeLayer) resizeLayer.textContent = "";
  const currentGroupDepth = groupEditStack.length;
  const activeSelectedVertex = selectedPolygonVertex && selectedPolygonVertex.groupDepth === currentGroupDepth ? selectedPolygonVertex : null;
  const groupEditActive = groupEditStack.length > 0;
  const groupOutlineStroke = "#ffd54a";
  const innerStroke = groupEditActive ? "#4aa3ff" : groupOutlineStroke;
  if (groupEditActive) {
    const activeGroup = getActiveGroup();
    if (activeGroup) {
      const offset = getActiveOffset();
      const content = getGroupContentBounds(activeGroup);
      const bbox = content ? {
        x: Number(offset.x ?? 0) + Number(content.x ?? 0),
        y: Number(offset.y ?? 0) + Number(content.y ?? 0),
        width: Number(content.width ?? 0),
        height: Number(content.height ?? 0)
      } : {
        x: Number(offset.x ?? 0),
        y: Number(offset.y ?? 0),
        width: Number(activeGroup.w ?? 0),
        height: Number(activeGroup.h ?? 0)
      };
      if (bbox.width > 0 && bbox.height > 0) {
        const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rectEl.setAttribute("x", bbox.x - 6);
        rectEl.setAttribute("y", bbox.y - 6);
        rectEl.setAttribute("width", bbox.width + 12);
        rectEl.setAttribute("height", bbox.height + 12);
        rectEl.setAttribute("fill", "none");
        rectEl.setAttribute("stroke", groupOutlineStroke);
        rectEl.setAttribute("stroke-width", "1");
        rectEl.setAttribute("vector-effect", "non-scaling-stroke");
        rectEl.setAttribute("stroke-dasharray", "6 4");
        selectionLayer.appendChild(rectEl);
      }
    }
  }
  const activeObjects = getActiveObjects() || [];
  renderedElementMeta.forEach((item) => {
    if (!selectedIndices.includes(item.index)) return;
    let bbox = null;
    const obj = activeObjects[item.index];
    if (item.bounds) {
      bbox = {
        x: item.bounds.x,
        y: item.bounds.y,
        width: item.bounds.width,
        height: item.bounds.height
      };
    }
    if (!bbox && obj && item.type === "viewport") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (!bbox && obj && item.type === "group") {
      const content = getGroupContentBounds(obj);
      if (content) {
        bbox = {
          x: Number(obj.x ?? 0) + Number(content.x ?? 0),
          y: Number(obj.y ?? 0) + Number(content.y ?? 0),
          width: Number(content.width ?? 0),
          height: Number(content.height ?? 0)
        };
      } else {
        bbox = {
          x: Number(obj.x ?? 0),
          y: Number(obj.y ?? 0),
          width: Number(obj.w ?? 0),
          height: Number(obj.h ?? 0)
        };
      }
    } else if (!bbox && obj && item.type === "button") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (!bbox && obj && item.type === "indicator") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 160),
        height: Number(obj.h ?? 64)
      };
    } else if (!bbox && obj && item.type === "image") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 120),
        height: Number(obj.h ?? 120)
      };
    } else if (!bbox && obj && item.type === "rect") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (!bbox && obj && item.type === "bar") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (!bbox && obj && item.type === "circle") {
      const r = Number(obj.r ?? 0);
      bbox = {
        x: Number(obj.cx ?? 0) - r,
        y: Number(obj.cy ?? 0) - r,
        width: r * 2,
        height: r * 2
      };
    } else if (item.el) {
      bbox = item.el.getBBox();
    }
    if (!bbox) return;
    const rotation = Number(obj?.rotation ?? 0);
	    const canRotateSelection =
	      selectedIndices.length === 1 &&
	      rotation &&
	      obj &&
	      ["button", "viewport", "rect", "alarms-panel", "bar", "number-input", "indicator", "image"].includes(obj.type);
    if (canRotateSelection) {
      const b = getObjectBounds(obj);
      if (b) {
        const offset = getActiveOffset();
        const pad = 4;
        const cx = b.x + b.width / 2 + offset.x;
        const cy = b.y + b.height / 2 + offset.y;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`);
        const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rectEl.setAttribute("x", b.x + offset.x - pad);
        rectEl.setAttribute("y", b.y + offset.y - pad);
        rectEl.setAttribute("width", b.width + pad * 2);
        rectEl.setAttribute("height", b.height + pad * 2);
        rectEl.setAttribute("fill", "none");
        rectEl.setAttribute("stroke", innerStroke);
        rectEl.setAttribute("stroke-width", "1");
        rectEl.setAttribute("vector-effect", "non-scaling-stroke");
        rectEl.setAttribute("stroke-dasharray", "4 3");
        g.appendChild(rectEl);
        selectionLayer.appendChild(g);
      }
    } else {
      const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rectEl.setAttribute("x", bbox.x - 4);
      rectEl.setAttribute("y", bbox.y - 4);
      rectEl.setAttribute("width", bbox.width + 8);
      rectEl.setAttribute("height", bbox.height + 8);
      rectEl.setAttribute("fill", "none");
      rectEl.setAttribute("stroke", innerStroke);
      rectEl.setAttribute("stroke-width", "1");
      rectEl.setAttribute("vector-effect", "non-scaling-stroke");
      rectEl.setAttribute("stroke-dasharray", "4 3");
      selectionLayer.appendChild(rectEl);
    }

	    if (!isEditMode || selectedIndices.length !== 1) return;
	    if (!obj || !["button", "viewport", "rect", "alarms-panel", "bar", "circle", "line", "polyline", "polygon", "number-input", "indicator", "image"].includes(obj.type)) return;
    if (obj.type === "group") return;
    if (!resizeLayer) return;
		    if (obj.type === "polyline" || obj.type === "polygon") {
		      const points = Array.isArray(obj.points) ? obj.points : [];
		      if (!points.length) return;
	      const offset = getActiveOffset();
	      const half = RESIZE_HANDLE_SIZE / 2;
		      points.forEach((pt, vertexIndex) => {
		        const x = Number(pt?.x ?? 0) + Number(offset.x ?? 0);
		        const y = Number(pt?.y ?? 0) + Number(offset.y ?? 0);
		        const isVertexSelected =
		          obj.type === "polygon" &&
		          activeSelectedVertex &&
		          activeSelectedVertex.objectIndex === item.index &&
		          activeSelectedVertex.vertexIndex === vertexIndex;
		        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		        handle.setAttribute("x", x - half);
		        handle.setAttribute("y", y - half);
		        handle.setAttribute("width", RESIZE_HANDLE_SIZE);
		        handle.setAttribute("height", RESIZE_HANDLE_SIZE);
		        handle.setAttribute("fill", isVertexSelected ? "#4aa3ff" : "#ffd54a");
		        handle.setAttribute("stroke", "#1f2937");
		        handle.setAttribute("stroke-width", "1");
		        handle.setAttribute("vector-effect", "non-scaling-stroke");
		        handle.setAttribute("data-resize-handle", "vertex");
		        handle.setAttribute("data-resize-index", String(item.index));
	        handle.setAttribute("data-vertex-index", String(vertexIndex));
	        handle.style.cursor = "move";
	        resizeLayer.appendChild(handle);
	      });
	      const pad = 4;
	      const handleBox = {
	        x: bbox.x - pad,
	        y: bbox.y - pad,
	        width: bbox.width + pad * 2,
	        height: bbox.height + pad * 2
	      };
	      const positions = [
	        { id: "nw", x: handleBox.x, y: handleBox.y, cursor: "nwse-resize" },
	        { id: "ne", x: handleBox.x + handleBox.width, y: handleBox.y, cursor: "nesw-resize" },
	        { id: "se", x: handleBox.x + handleBox.width, y: handleBox.y + handleBox.height, cursor: "nwse-resize" },
	        { id: "sw", x: handleBox.x, y: handleBox.y + handleBox.height, cursor: "nesw-resize" }
	      ];
	      positions.forEach((pos) => {
	        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	        handle.setAttribute("x", pos.x - half);
	        handle.setAttribute("y", pos.y - half);
	        handle.setAttribute("width", RESIZE_HANDLE_SIZE);
	        handle.setAttribute("height", RESIZE_HANDLE_SIZE);
	        handle.setAttribute("fill", "#4aa3ff");
	        handle.setAttribute("stroke", "#1f2937");
	        handle.setAttribute("stroke-width", "1");
	        handle.setAttribute("vector-effect", "non-scaling-stroke");
	        handle.setAttribute("data-resize-handle", pos.id);
	        handle.setAttribute("data-resize-index", String(item.index));
	        handle.style.cursor = pos.cursor;
	        resizeLayer.appendChild(handle);
	      });
	      return;
	    }
    if (obj.type === "line") {
      const start = { x: Number(obj.x1 ?? 0), y: Number(obj.y1 ?? 0) };
      const end = { x: Number(obj.x2 ?? 0), y: Number(obj.y2 ?? 0) };
      const half = RESIZE_HANDLE_SIZE / 2;
      const endpoints = [
        { id: "line-start", x: start.x, y: start.y },
        { id: "line-end", x: end.x, y: end.y }
      ];
      endpoints.forEach((pos) => {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        handle.setAttribute("x", pos.x - half);
        handle.setAttribute("y", pos.y - half);
        handle.setAttribute("width", RESIZE_HANDLE_SIZE);
        handle.setAttribute("height", RESIZE_HANDLE_SIZE);
        handle.setAttribute("fill", "#ffd54a");
        handle.setAttribute("stroke", "#1f2937");
        handle.setAttribute("stroke-width", "1");
        handle.setAttribute("vector-effect", "non-scaling-stroke");
        handle.setAttribute("data-resize-handle", pos.id);
        handle.setAttribute("data-resize-index", String(item.index));
        handle.style.cursor = "move";
        resizeLayer.appendChild(handle);
      });
      return;
    }
	    const pad = 4;
	    const handleBox = {
	      x: bbox.x - pad,
	      y: bbox.y - pad,
	      width: bbox.width + pad * 2,
	      height: bbox.height + pad * 2
	    };
	    const half = RESIZE_HANDLE_SIZE / 2;
	    const positions = [
	      { id: "nw", x: handleBox.x, y: handleBox.y, cursor: "nwse-resize" },
	      { id: "n", x: handleBox.x + handleBox.width / 2, y: handleBox.y, cursor: "ns-resize" },
	      { id: "ne", x: handleBox.x + handleBox.width, y: handleBox.y, cursor: "nesw-resize" },
	      { id: "e", x: handleBox.x + handleBox.width, y: handleBox.y + handleBox.height / 2, cursor: "ew-resize" },
	      { id: "se", x: handleBox.x + handleBox.width, y: handleBox.y + handleBox.height, cursor: "nwse-resize" },
	      { id: "s", x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height, cursor: "ns-resize" },
	      { id: "sw", x: handleBox.x, y: handleBox.y + handleBox.height, cursor: "nesw-resize" },
	      { id: "w", x: handleBox.x, y: handleBox.y + handleBox.height / 2, cursor: "ew-resize" }
	    ];
	    const rotationValue = Number(obj.rotation ?? 0);
		    const canRotateHandles =
		      rotationValue &&
		      ["button", "viewport", "rect", "alarms-panel", "bar", "number-input", "indicator", "image"].includes(obj.type);
	    if (canRotateHandles) {
	      const offset = getActiveOffset();
	      const baseX = Number(obj.x ?? 0);
	      const baseY = Number(obj.y ?? 0);
	      const baseW = Number(obj.w ?? (obj.type === "indicator" ? 160 : 0));
	      const baseH = Number(obj.h ?? (obj.type === "indicator" ? 64 : 0));
	      const pad2 = 4;
	      const cx = baseX + baseW / 2 + offset.x;
	      const cy = baseY + baseH / 2 + offset.y;
	      const angleRad = (rotationValue * Math.PI) / 180;
	      const local = {
	        x: baseX - pad2,
	        y: baseY - pad2,
	        w: baseW + pad2 * 2,
	        h: baseH + pad2 * 2
	      };
	      const localPositions = [
	        { id: "nw", x: local.x, y: local.y, cursor: "nwse-resize" },
	        { id: "n", x: local.x + local.w / 2, y: local.y, cursor: "ns-resize" },
	        { id: "ne", x: local.x + local.w, y: local.y, cursor: "nesw-resize" },
	        { id: "e", x: local.x + local.w, y: local.y + local.h / 2, cursor: "ew-resize" },
	        { id: "se", x: local.x + local.w, y: local.y + local.h, cursor: "nwse-resize" },
	        { id: "s", x: local.x + local.w / 2, y: local.y + local.h, cursor: "ns-resize" },
	        { id: "sw", x: local.x, y: local.y + local.h, cursor: "nesw-resize" },
	        { id: "w", x: local.x, y: local.y + local.h / 2, cursor: "ew-resize" }
	      ];
	      localPositions.forEach((pos) => {
	        const rotated = rotatePointAround({ x: pos.x + offset.x, y: pos.y + offset.y }, { x: cx, y: cy }, angleRad);
	        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	        handle.setAttribute("x", rotated.x - half);
	        handle.setAttribute("y", rotated.y - half);
	        handle.setAttribute("width", RESIZE_HANDLE_SIZE);
	        handle.setAttribute("height", RESIZE_HANDLE_SIZE);
	        handle.setAttribute("fill", "#ffd54a");
	        handle.setAttribute("stroke", "#1f2937");
	        handle.setAttribute("stroke-width", "1");
	        handle.setAttribute("vector-effect", "non-scaling-stroke");
	        handle.setAttribute("data-resize-handle", pos.id);
	        handle.setAttribute("data-resize-index", String(item.index));
	        handle.style.cursor = pos.cursor;
	        resizeLayer.appendChild(handle);
	      });
	      return;
	    }
	    positions.forEach((pos) => {
	      const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	      handle.setAttribute("x", pos.x - half);
	      handle.setAttribute("y", pos.y - half);
	      handle.setAttribute("width", RESIZE_HANDLE_SIZE);
	      handle.setAttribute("height", RESIZE_HANDLE_SIZE);
	      handle.setAttribute("fill", "#ffd54a");
	      handle.setAttribute("stroke", "#1f2937");
	      handle.setAttribute("stroke-width", "1");
	      handle.setAttribute("vector-effect", "non-scaling-stroke");
	      handle.setAttribute("data-resize-handle", pos.id);
	      handle.setAttribute("data-resize-index", String(item.index));
	      handle.style.cursor = pos.cursor;
	      resizeLayer.appendChild(handle);
	    });
	  });

  if (isEditMode && resizeLayer && selectedIndices.length) {
    const activeObjectsForOverlay = getActiveObjects() || [];
    const showSelectionResize =
      selectedIndices.length > 1 ||
      (selectedIndices.length === 1 && activeObjectsForOverlay[selectedIndices[0]]?.type === "group");
    if (showSelectionResize) {
      const boundsActive = getSelectionBoundsForScaling(activeObjectsForOverlay, selectedIndices);
      const offset = getActiveOffset();
      if (boundsActive && boundsActive.width > 0 && boundsActive.height > 0) {
        const box = {
          x: boundsActive.x + offset.x,
          y: boundsActive.y + offset.y,
          width: boundsActive.width,
          height: boundsActive.height
        };
        const pad = 6;
        const handleBox = {
          x: box.x - pad,
          y: box.y - pad,
          width: box.width + pad * 2,
          height: box.height + pad * 2
        };
        const half = RESIZE_HANDLE_SIZE / 2;
        const positions = [
          { id: "sel-nw", x: handleBox.x, y: handleBox.y, cursor: "nwse-resize" },
          { id: "sel-ne", x: handleBox.x + handleBox.width, y: handleBox.y, cursor: "nesw-resize" },
          { id: "sel-se", x: handleBox.x + handleBox.width, y: handleBox.y + handleBox.height, cursor: "nwse-resize" },
          { id: "sel-sw", x: handleBox.x, y: handleBox.y + handleBox.height, cursor: "nesw-resize" }
        ];
        positions.forEach((pos) => {
          const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          handle.setAttribute("x", pos.x - half);
          handle.setAttribute("y", pos.y - half);
          handle.setAttribute("width", RESIZE_HANDLE_SIZE);
          handle.setAttribute("height", RESIZE_HANDLE_SIZE);
          handle.setAttribute("fill", "#ffb300");
          handle.setAttribute("stroke", "#1f2937");
          handle.setAttribute("stroke-width", "1");
          handle.setAttribute("vector-effect", "non-scaling-stroke");
          handle.setAttribute("data-resize-handle", pos.id);
          handle.setAttribute("data-resize-selection", "1");
          handle.style.cursor = pos.cursor;
          resizeLayer.appendChild(handle);
        });
      }
    }

    const activeBox = getSelectionBoundsActive();
    const offset = getActiveOffset();
    if (activeBox && activeBox.width > 0 && activeBox.height > 0) {
      const activeObjects = getActiveObjects() || [];
      const singleObj = selectedIndices.length === 1 ? activeObjects[selectedIndices[0]] : null;
      const singleRotation = Number(singleObj?.rotation ?? 0);
      const canRotateHandleTrack =
        selectedIndices.length === 1 &&
        singleRotation &&
        singleObj &&
        ["button", "viewport", "rect", "bar", "number-input", "indicator", "image"].includes(singleObj.type);

      if (canRotateHandleTrack) {
        const b = getObjectBounds(singleObj);
        if (b && b.width > 0 && b.height > 0) {
          const pad = 4;
          const center = { x: b.x + b.width / 2 + offset.x, y: b.y + b.height / 2 + offset.y };
          const angleRad = (singleRotation * Math.PI) / 180;
          const nw = rotatePointAround({ x: b.x - pad + offset.x, y: b.y - pad + offset.y }, center, angleRad);
          const ne = rotatePointAround({ x: b.x + b.width + pad + offset.x, y: b.y - pad + offset.y }, center, angleRad);
          const topMid = { x: (nw.x + ne.x) / 2, y: (nw.y + ne.y) / 2 };
          const edge = { x: ne.x - nw.x, y: ne.y - nw.y };
          let normal = { x: -edge.y, y: edge.x };
          const toCenter = { x: center.x - topMid.x, y: center.y - topMid.y };
          if (normal.x * toCenter.x + normal.y * toCenter.y > 0) normal = { x: -normal.x, y: -normal.y };
          const len = Math.hypot(normal.x, normal.y) || 1;
          normal = { x: normal.x / len, y: normal.y / len };
          const handlePos = { x: topMid.x + normal.x * 18, y: topMid.y + normal.y * 18 };

          const stem = document.createElementNS("http://www.w3.org/2000/svg", "line");
          stem.setAttribute("x1", topMid.x);
          stem.setAttribute("y1", topMid.y);
          stem.setAttribute("x2", handlePos.x);
          stem.setAttribute("y2", handlePos.y);
          stem.setAttribute("stroke", "#ffd54a");
          stem.setAttribute("stroke-width", "2");
          stem.setAttribute("vector-effect", "non-scaling-stroke");
          resizeLayer.appendChild(stem);

          const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          handle.setAttribute("cx", handlePos.x);
          handle.setAttribute("cy", handlePos.y);
          handle.setAttribute("r", 6);
          handle.setAttribute("fill", "#ffd54a");
          handle.setAttribute("stroke", "#1f2937");
          handle.setAttribute("stroke-width", "1");
          handle.setAttribute("vector-effect", "non-scaling-stroke");
          handle.setAttribute("data-rotate-handle", "1");
          handle.style.cursor = "grab";
          resizeLayer.appendChild(handle);
          return;
        }
      }

      const box = {
        x: activeBox.x + offset.x,
        y: activeBox.y + offset.y,
        width: activeBox.width,
        height: activeBox.height
      };
      const cx = box.x + box.width / 2;
      const y = box.y - 18;
      const stem = document.createElementNS("http://www.w3.org/2000/svg", "line");
      stem.setAttribute("x1", cx);
      stem.setAttribute("y1", box.y - 4);
      stem.setAttribute("x2", cx);
      stem.setAttribute("y2", y);
      stem.setAttribute("stroke", "#ffd54a");
      stem.setAttribute("stroke-width", "2");
      stem.setAttribute("vector-effect", "non-scaling-stroke");
      resizeLayer.appendChild(stem);

      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.setAttribute("cx", cx);
      handle.setAttribute("cy", y);
      handle.setAttribute("r", 6);
      handle.setAttribute("fill", "#ffd54a");
      handle.setAttribute("stroke", "#1f2937");
      handle.setAttribute("stroke-width", "1");
      handle.setAttribute("vector-effect", "non-scaling-stroke");
      handle.setAttribute("data-rotate-handle", "1");
      handle.style.cursor = "grab";
      resizeLayer.appendChild(handle);
    }
  }
}

const pointInBox = (point, box) => {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
};

const rotatePointAround = (point, center, angleRad) => {
  const x = Number(point?.x ?? 0) - Number(center?.x ?? 0);
  const y = Number(point?.y ?? 0) - Number(center?.y ?? 0);
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: Number(center?.x ?? 0) + x * c - y * s,
    y: Number(center?.y ?? 0) + x * s + y * c
  };
};

const normalizeDegrees = (deg) => {
  let d = Number(deg) || 0;
  d %= 360;
  if (d < 0) d += 360;
  return d;
};

const getSelectionBoundsForScaling = (objects, indices) => {
  const safeObjects = Array.isArray(objects) ? objects : [];
  const safeIndices = Array.isArray(indices) ? indices : [];
  const bounds = [];
  safeIndices.forEach((idx) => {
    const obj = safeObjects[idx];
    if (!obj) return;
    if (obj.type === "group") {
      const content = getGroupContentBounds(obj);
      if (content) {
        bounds.push({
          x: Number(obj.x ?? 0) + Number(content.x ?? 0),
          y: Number(obj.y ?? 0) + Number(content.y ?? 0),
          width: Number(content.width ?? 0),
          height: Number(content.height ?? 0)
        });
        return;
      }
    }
    const b = getObjectBounds(obj);
    if (b) bounds.push(b);
  });
  if (!bounds.length) return null;
  const left = Math.min(...bounds.map((b) => b.x));
  const top = Math.min(...bounds.map((b) => b.y));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const scalePointFromBounds = (pt, fromB, scale, toB) => ({
  x: toB.x + (pt.x - fromB.x) * scale,
  y: toB.y + (pt.y - fromB.y) * scale
});

const scaleObjectUniformFromBounds = (obj, startObj, scale, fromB, toB) => {
  if (!obj || !startObj) return;
  const n = (v, fallback = 0) => {
    const value = Number(v ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  };
  const scaleStroke = (target, source) => {
    if (source.strokeWidth == null) return;
    target.strokeWidth = Math.max(0, Math.round(n(source.strokeWidth, 0) * scale));
  };
  const scaleFont = (target, source) => {
    if (source.fontSize == null) return;
    target.fontSize = Math.max(1, Math.round(n(source.fontSize, 18) * scale));
  };
  const scaleRx = (target, source) => {
    if (source.rx == null) return;
    target.rx = Math.max(0, Math.round(n(source.rx, 0) * scale));
  };

  if (startObj.type === "group") {
    const startGX = n(startObj.x, 0);
    const startGY = n(startObj.y, 0);
    const newOrigin = scalePointFromBounds({ x: startGX, y: startGY }, fromB, scale, toB);
    obj.x = Math.round(newOrigin.x);
    obj.y = Math.round(newOrigin.y);
    const newGX = obj.x;
    const newGY = obj.y;
    const startChildren = Array.isArray(startObj.children) ? startObj.children : [];
    obj.children = startChildren.map((child) => {
      const next = JSON.parse(JSON.stringify(child));
      if (child.type === "polyline" || child.type === "polygon") {
        next.points = (Array.isArray(child.points) ? child.points : []).map((pt) => {
          const world = { x: startGX + n(pt?.x, 0), y: startGY + n(pt?.y, 0) };
          const scaled = scalePointFromBounds(world, fromB, scale, toB);
          return { x: Math.round(scaled.x - newGX), y: Math.round(scaled.y - newGY) };
        });
        scaleStroke(next, child);
        return next;
      }
      if (child.type === "line") {
        const p1w = { x: startGX + n(child.x1, 0), y: startGY + n(child.y1, 0) };
        const p2w = { x: startGX + n(child.x2, 0), y: startGY + n(child.y2, 0) };
        const p1s = scalePointFromBounds(p1w, fromB, scale, toB);
        const p2s = scalePointFromBounds(p2w, fromB, scale, toB);
        next.x1 = Math.round(p1s.x - newGX);
        next.y1 = Math.round(p1s.y - newGY);
        next.x2 = Math.round(p2s.x - newGX);
        next.y2 = Math.round(p2s.y - newGY);
        scaleStroke(next, child);
        return next;
      }
      if (child.type === "circle") {
        const cw = { x: startGX + n(child.cx, 0), y: startGY + n(child.cy, 0) };
        const cs = scalePointFromBounds(cw, fromB, scale, toB);
        next.cx = Math.round(cs.x - newGX);
        next.cy = Math.round(cs.y - newGY);
        next.r = Math.max(1, Math.round(n(child.r, 1) * scale));
        scaleStroke(next, child);
        return next;
      }
      if (child.type === "text") {
        const tw = { x: startGX + n(child.x, 0), y: startGY + n(child.y, 0) };
        const ts = scalePointFromBounds(tw, fromB, scale, toB);
        next.x = Math.round(ts.x - newGX);
        next.y = Math.round(ts.y - newGY);
        if (child.w != null) next.w = Math.max(1, Math.round(n(child.w, 0) * scale));
        if (child.h != null) next.h = Math.max(1, Math.round(n(child.h, 0) * scale));
        scaleFont(next, child);
        return next;
      }
      const b = getObjectBounds(child);
      if (b) {
        const p1 = scalePointFromBounds({ x: startGX + b.x, y: startGY + b.y }, fromB, scale, toB);
        const p2 = scalePointFromBounds({ x: startGX + b.x + b.width, y: startGY + b.y + b.height }, fromB, scale, toB);
        const nx = Math.min(p1.x, p2.x);
        const ny = Math.min(p1.y, p2.y);
        const nw = Math.max(1, Math.abs(p2.x - p1.x));
        const nh = Math.max(1, Math.abs(p2.y - p1.y));
        if ("x" in next) next.x = Math.round(nx - newGX);
        if ("y" in next) next.y = Math.round(ny - newGY);
        if ("w" in next) next.w = Math.round(nw);
        if ("h" in next) next.h = Math.round(nh);
        scaleStroke(next, child);
        scaleFont(next, child);
        scaleRx(next, child);
      }
      return next;
    });
    const content = getGroupContentBounds(obj);
    if (content) {
      obj.w = Math.round(content.width);
      obj.h = Math.round(content.height);
    }
    return;
  }

  if (startObj.type === "polyline" || startObj.type === "polygon") {
    obj.points = (Array.isArray(startObj.points) ? startObj.points : []).map((pt) => {
      const scaled = scalePointFromBounds({ x: n(pt?.x, 0), y: n(pt?.y, 0) }, fromB, scale, toB);
      return { x: Math.round(scaled.x), y: Math.round(scaled.y) };
    });
    scaleStroke(obj, startObj);
    return;
  }
  if (startObj.type === "line") {
    const p1 = scalePointFromBounds({ x: n(startObj.x1, 0), y: n(startObj.y1, 0) }, fromB, scale, toB);
    const p2 = scalePointFromBounds({ x: n(startObj.x2, 0), y: n(startObj.y2, 0) }, fromB, scale, toB);
    obj.x1 = Math.round(p1.x);
    obj.y1 = Math.round(p1.y);
    obj.x2 = Math.round(p2.x);
    obj.y2 = Math.round(p2.y);
    scaleStroke(obj, startObj);
    return;
  }
  if (startObj.type === "circle") {
    const c = scalePointFromBounds({ x: n(startObj.cx, 0), y: n(startObj.cy, 0) }, fromB, scale, toB);
    obj.cx = Math.round(c.x);
    obj.cy = Math.round(c.y);
    obj.r = Math.max(1, Math.round(n(startObj.r, 1) * scale));
    scaleStroke(obj, startObj);
    return;
  }
  if (startObj.type === "text") {
    const p = scalePointFromBounds({ x: n(startObj.x, 0), y: n(startObj.y, 0) }, fromB, scale, toB);
    obj.x = Math.round(p.x);
    obj.y = Math.round(p.y);
    if (startObj.w != null) obj.w = Math.max(1, Math.round(n(startObj.w, 0) * scale));
    if (startObj.h != null) obj.h = Math.max(1, Math.round(n(startObj.h, 0) * scale));
    scaleFont(obj, startObj);
    return;
  }

  const b = getObjectBounds(startObj);
  if (!b) return;
  const p1 = scalePointFromBounds({ x: b.x, y: b.y }, fromB, scale, toB);
  const p2 = scalePointFromBounds({ x: b.x + b.width, y: b.y + b.height }, fromB, scale, toB);
  const nx = Math.min(p1.x, p2.x);
  const ny = Math.min(p1.y, p2.y);
  const nw = Math.max(1, Math.abs(p2.x - p1.x));
  const nh = Math.max(1, Math.abs(p2.y - p1.y));
  if ("x" in obj) obj.x = Math.round(nx);
  if ("y" in obj) obj.y = Math.round(ny);
  if ("w" in obj) obj.w = Math.round(nw);
  if ("h" in obj) obj.h = Math.round(nh);
  scaleStroke(obj, startObj);
  scaleFont(obj, startObj);
  scaleRx(obj, startObj);
};

const getSelectionBoundsActive = () => {
  const activeObjects = getActiveObjects();
  if (!activeObjects || !Array.isArray(activeObjects)) return null;
  const bounds = selectedIndices
    .map((idx) => getObjectBounds(activeObjects[idx]))
    .filter(Boolean);
  if (!bounds.length) return null;
  const left = Math.min(...bounds.map((b) => b.x));
  const top = Math.min(...bounds.map((b) => b.y));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const getObjectCenter = (obj) => {
  if (!obj) return { x: 0, y: 0 };
  if (obj.type === "line") {
    return { x: (Number(obj.x1 ?? 0) + Number(obj.x2 ?? 0)) / 2, y: (Number(obj.y1 ?? 0) + Number(obj.y2 ?? 0)) / 2 };
  }
  if (obj.type === "circle") {
    return { x: Number(obj.cx ?? 0), y: Number(obj.cy ?? 0) };
  }
  if (obj.type === "polyline" || obj.type === "polygon") {
    const b = getObjectBounds(obj);
    if (b) return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  const x = Number(obj.x ?? 0);
  const y = Number(obj.y ?? 0);
  const w = Number(obj.w ?? (obj.type === "indicator" ? 160 : 0));
  const h = Number(obj.h ?? (obj.type === "indicator" ? 64 : 0));
  return { x: x + w / 2, y: y + h / 2 };
};

const applyRotationToObject = (obj, startObj, deltaRad, center, deltaDeg) => {
  if (!obj || !startObj || !center) return;
  if (startObj.type === "polyline" || startObj.type === "polygon") {
    const pts = Array.isArray(startObj.points) ? startObj.points : [];
    obj.points = pts.map((pt) => {
      const p = rotatePointAround({ x: Number(pt?.x ?? 0), y: Number(pt?.y ?? 0) }, center, deltaRad);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    });
    return;
  }
  if (startObj.type === "line") {
    const p1 = rotatePointAround({ x: Number(startObj.x1 ?? 0), y: Number(startObj.y1 ?? 0) }, center, deltaRad);
    const p2 = rotatePointAround({ x: Number(startObj.x2 ?? 0), y: Number(startObj.y2 ?? 0) }, center, deltaRad);
    obj.x1 = Math.round(p1.x);
    obj.y1 = Math.round(p1.y);
    obj.x2 = Math.round(p2.x);
    obj.y2 = Math.round(p2.y);
    return;
  }
  if (startObj.type === "circle") {
    const p = rotatePointAround({ x: Number(startObj.cx ?? 0), y: Number(startObj.cy ?? 0) }, center, deltaRad);
    obj.cx = Math.round(p.x);
    obj.cy = Math.round(p.y);
    return;
  }
  if (startObj.type === "text") {
    const p = rotatePointAround({ x: Number(startObj.x ?? 0), y: Number(startObj.y ?? 0) }, center, deltaRad);
    obj.x = Math.round(p.x);
    obj.y = Math.round(p.y);
    return;
  }

  const startCenter = getObjectCenter(startObj);
  const rotatedCenter = rotatePointAround(startCenter, center, deltaRad);
  const w = Number(startObj.w ?? (startObj.type === "indicator" ? 160 : 0));
  const h = Number(startObj.h ?? (startObj.type === "indicator" ? 64 : 0));
  if (obj.x != null) obj.x = Math.round(rotatedCenter.x - w / 2);
  if (obj.y != null) obj.y = Math.round(rotatedCenter.y - h / 2);
  if (startObj.type === "button" || startObj.type === "viewport" || startObj.type === "rect" || startObj.type === "bar" || startObj.type === "number-input" || startObj.type === "indicator" || startObj.type === "image") {
    obj.rotation = normalizeDegrees(Number(startObj.rotation ?? 0) + deltaDeg);
  }
};

const snapValue = (value) => {
  if (!snapEnabled) return value;
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

const boxContains = (outer, inner) => {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
};

const boxIntersects = (a, b) => {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
};

const normalizeScaleMode = (value, fallback = "actual-size") => {
  const raw = String(value || fallback);
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
};

const computeViewportTransform = (viewportObj, childScreen) => {
  if (!viewportObj || !childScreen) return null;
  const x = Number(viewportObj.x ?? 0);
  const y = Number(viewportObj.y ?? 0);
  const w = Number(viewportObj.w ?? 0);
  const h = Number(viewportObj.h ?? 0);
  const scaleMode = normalizeScaleMode(viewportObj.scaleMode || "actual-size");
  const childW = Number(childScreen.width) || 1920;
  const childH = Number(childScreen.height) || 1080;
  if (!w || !h) return { x, y, w, h, scaleMode, childW, childH, scale: 1, offsetX: 0, offsetY: 0 };
  let scale = 1;
  if (scaleMode === "contain") {
    scale = Math.min(w / childW, h / childH);
  } else if (scaleMode === "fit-width") {
    scale = w / childW;
  } else if (scaleMode === "fit-height") {
    scale = h / childH;
  } else {
    scale = 1;
  }
  const contentW = childW * scale;
  const contentH = childH * scale;
  let offsetX = (w - contentW) / 2;
  let offsetY = (h - contentH) / 2;
  if (scaleMode === "actual-size") {
    if (childW > w) offsetX = 0;
    if (childH > h) offsetY = 0;
  }
  return { x, y, w, h, scaleMode, childW, childH, scale, offsetX, offsetY };
};

const getObjectByChildPath = (rootObj, childPath) => {
  if (!rootObj || !Array.isArray(childPath) || childPath.length === 0) return null;
  let current = rootObj;
  for (const index of childPath) {
    if (!current || !Array.isArray(current.children)) return null;
    current = current.children[index];
  }
  return current || null;
};

const getObjectByScreenPath = (screenObj, screenPath) => {
  if (!screenObj || !Array.isArray(screenPath) || screenPath.length === 0) return null;
  const rootIndex = screenPath[0];
  let current = screenObj.objects?.[rootIndex];
  if (!current) return null;
  for (let i = 1; i < screenPath.length; i += 1) {
    const idx = screenPath[i];
    if (!current || !Array.isArray(current.children)) return null;
    current = current.children[idx];
  }
  return current || null;
};

const findHitInObjectList = (objects, point, pathPrefix = []) => {
  if (!Array.isArray(objects)) return null;
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const obj = objects[i];
    if (!obj || !shouldRenderObject(obj)) continue;
    if (obj.type === "group") {
      const groupBox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
      if (!pointInBox(point, groupBox)) continue;
      const localPoint = { x: point.x - groupBox.x, y: point.y - groupBox.y };
      const hitChild = findHitInObjectList(obj.children, localPoint, [...pathPrefix, i]);
      return hitChild || { path: [...pathPrefix, i] };
    }
    const bounds = getObjectBounds(obj);
    if (!bounds) continue;
    if (pointInBox(point, bounds)) {
      return { path: [...pathPrefix, i] };
    }
  }
  return null;
};

const findRuntimeChildMetaInViewport = (viewportObj, viewportIndex, point) => {
  const targetId = viewportObj?.target || viewportObj?.screenId || viewportObj?.targetScreen || viewportObj?.targetId;
  if (!targetId) return null;
  const child = screenCache.get(targetId);
  if (!child) return null;
  const transform = computeViewportTransform(viewportObj, child);
  if (!transform) return null;
  const viewportBox = { x: transform.x, y: transform.y, width: transform.w, height: transform.h };
  if (!pointInBox(point, viewportBox)) return null;
  if (!transform.scale) return null;
  const localX = (point.x - transform.x - transform.offsetX) / transform.scale;
  const localY = (point.y - transform.y - transform.offsetY) / transform.scale;
  const hit = findHitInObjectList(child.objects, { x: localX, y: localY }, []);
  if (!hit?.path) return null;
  return {
    index: viewportIndex,
    type: "viewport",
    bounds: viewportBox,
    viewportTargetId: targetId,
    viewportChildPath: hit.path
  };
};

const findRuntimeChildMetaInGroup = (groupObj, groupIndex, point, offsetX, offsetY, childPath) => {
  if (!groupObj || !Array.isArray(groupObj.children)) return null;
  for (let i = groupObj.children.length - 1; i >= 0; i -= 1) {
    const child = groupObj.children[i];
    if (!child || !shouldRenderObject(child)) continue;
    if (child.type === "group") {
      const childBox = {
        x: offsetX + Number(child.x ?? 0),
        y: offsetY + Number(child.y ?? 0),
        width: Number(child.w ?? 0),
        height: Number(child.h ?? 0)
      };
      if (!pointInBox(point, childBox)) continue;
      const found = findRuntimeChildMetaInGroup(
        child,
        groupIndex,
        point,
        childBox.x,
        childBox.y,
        [...childPath, i]
      );
      return found || { index: groupIndex, type: "group", bounds: childBox, childPath: [...childPath, i] };
    }
    const childBounds = getObjectBounds(child);
    if (!childBounds) continue;
    const childBox = {
      x: offsetX + childBounds.x,
      y: offsetY + childBounds.y,
      width: childBounds.width,
      height: childBounds.height
    };
    if (pointInBox(point, childBox)) {
      return { index: groupIndex, type: child.type, bounds: childBox, childPath: [...childPath, i] };
    }
  }
  return null;
};

const getObjectFromMeta = (meta) => {
  if (!meta) return null;
  if (meta.viewportTargetId && Array.isArray(meta.viewportChildPath) && meta.viewportChildPath.length) {
    const child = screenCache.get(meta.viewportTargetId);
    if (!child) return null;
    return getObjectByScreenPath(child, meta.viewportChildPath);
  }
  const root = getActiveObjects()?.[meta.index];
  if (!root) return null;
  if (Array.isArray(meta.childPath) && meta.childPath.length > 0) {
    return getObjectByChildPath(root, meta.childPath) || root;
  }
  return root;
};

const getMetaAtPoint = (point) => {
  for (let i = renderedElementMeta.length - 1; i >= 0; i -= 1) {
    const item = renderedElementMeta[i];
    const obj = getActiveObjects()?.[item.index];
    let bbox = null;
    if (item.bounds) {
      bbox = item.bounds;
    } else if (item.type === "text") {
      bbox = obj ? getObjectBounds(obj) : null;
      if (!bbox && item.el) {
        try {
          bbox = item.el.getBBox();
        } catch {
          bbox = null;
        }
      }
    } else if (obj && item.type === "number-input") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (obj && item.type === "viewport") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (obj && item.type === "group") {
      bbox = getObjectBounds(obj);
    } else if (obj && item.type === "button") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 0),
        height: Number(obj.h ?? 0)
      };
    } else if (obj && item.type === "indicator") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 160),
        height: Number(obj.h ?? 64)
      };
    } else if (obj && item.type === "image") {
      bbox = {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.w ?? 120),
        height: Number(obj.h ?? 120)
      };
	    } else if (obj && item.type === "bar") {
	      bbox = {
	        x: Number(obj.x ?? 0),
	        y: Number(obj.y ?? 0),
	        width: Number(obj.w ?? 0),
	        height: Number(obj.h ?? 0)
	      };
	    } else if (obj && item.type === "alarms-panel") {
	      bbox = {
	        x: Number(obj.x ?? 0),
	        y: Number(obj.y ?? 0),
	        width: Number(obj.w ?? 0),
	        height: Number(obj.h ?? 0)
	      };
	    } else if (item.el) {
	      try {
	        bbox = item.el.getBBox();
	      } catch {
	        bbox = null;
      }
    }
    if (bbox && pointInBox(point, bbox)) {
      if (!isEditMode && obj?.type === "group") {
        const groupBox = bbox;
        const child = findRuntimeChildMetaInGroup(
          obj,
          item.index,
          point,
          groupBox.x,
          groupBox.y,
          []
        );
        if (child) return child;
      }
      if (!isEditMode && obj?.type === "viewport") {
        const child = findRuntimeChildMetaInViewport(obj, item.index, point);
        if (child) return child;
        continue;
      }
      return item;
    }
  }
  return null;
};

const rotatePointAroundDeg = (point, cx, cy, angleDeg) => {
  const radians = (Number(angleDeg) * Math.PI) / 180;
  return rotatePointAround(point, { x: cx, y: cy }, radians);
};

const pointInRotatedBox = (point, box, rotationDeg) => {
  const rotation = Number(rotationDeg) || 0;
  if (!rotation) return pointInBox(point, box);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const local = rotatePointAroundDeg(point, cx, cy, -rotation);
  return pointInBox(local, box);
};

const getGroupHotspotBounds = (obj) => {
  if (!obj || obj.type !== "group") return null;
  const content = getGroupContentBounds(obj);
  const w = Number(obj.w ?? 0);
  const h = Number(obj.h ?? 0);
  const explicit = (w > 0 && h > 0)
    ? { x: Number(obj.x ?? 0), y: Number(obj.y ?? 0), width: w, height: h }
    : null;
  const computed = content
    ? {
      x: Number(obj.x ?? 0) + Number(content.x ?? 0),
      y: Number(obj.y ?? 0) + Number(content.y ?? 0),
      width: Number(content.width ?? 0),
      height: Number(content.height ?? 0)
    }
    : null;
  if (!explicit) return computed;
  if (!computed) return explicit;
  const left = Math.min(explicit.x, computed.x);
  const top = Math.min(explicit.y, computed.y);
  const right = Math.max(explicit.x + explicit.width, computed.x + computed.width);
  const bottom = Math.max(explicit.y + explicit.height, computed.y + computed.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const findRuntimeGroupHotspot = (point) => {
  if (!currentScreenObj || !Array.isArray(currentScreenObj.objects)) return null;
  const findInList = (objects, offsetX, offsetY, path) => {
    if (!Array.isArray(objects)) return null;
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const obj = objects[i];
      if (!obj || obj.type !== "group") continue;
      if (!shouldRenderObject(obj)) continue;
      const rawBounds = getGroupHotspotBounds(obj);
      if (!rawBounds) continue;
      const bounds = {
        x: rawBounds.x + offsetX,
        y: rawBounds.y + offsetY,
        width: rawBounds.width,
        height: rawBounds.height
      };
      const rotation = Number(obj.rotation ?? 0);
      if (!pointInRotatedBox(point, bounds, rotation)) continue;
      const nested = findInList(obj.children, offsetX + Number(obj.x ?? 0), offsetY + Number(obj.y ?? 0), [...path, i]);
      if (nested) return nested;
      const action = obj.action;
      if (!action || !action.type) continue;
      return { obj, bounds, rotation, path: [...path, i] };
    }
    return null;
  };
  return findInList(currentScreenObj.objects, 0, 0, []);
};

const setGroupHotspotHover = (hit) => {
  if (!groupHotspotHoverRect) return;
  if (!hit) {
    groupHotspotHover = null;
    groupHotspotHoverRect.style.display = "none";
    groupHotspotHoverRect.removeAttribute("transform");
    return;
  }
  groupHotspotHover = hit;
  groupHotspotHoverRect.setAttribute("x", hit.bounds.x);
  groupHotspotHoverRect.setAttribute("y", hit.bounds.y);
  groupHotspotHoverRect.setAttribute("width", hit.bounds.width);
  groupHotspotHoverRect.setAttribute("height", hit.bounds.height);
  if (hit.rotation) {
    const cx = hit.bounds.x + hit.bounds.width / 2;
    const cy = hit.bounds.y + hit.bounds.height / 2;
    groupHotspotHoverRect.setAttribute("transform", `rotate(${hit.rotation} ${cx} ${cy})`);
  } else {
    groupHotspotHoverRect.removeAttribute("transform");
  }
  groupHotspotHoverRect.style.display = "";
};

const startViewportDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  viewportDraftStart = point;
  if (!viewportDraft) {
    viewportDraft = document.createElementNS(ns, "rect");
    viewportDraft.setAttribute("fill", "rgba(74, 163, 255, 0.15)");
    viewportDraft.setAttribute("stroke", "#4aa3ff");
    viewportDraft.setAttribute("stroke-dasharray", "4 3");
    viewportDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(viewportDraft);
  }
  viewportDraft.setAttribute("x", point.x);
  viewportDraft.setAttribute("y", point.y);
  viewportDraft.setAttribute("width", 0);
  viewportDraft.setAttribute("height", 0);
};

const updateViewportDraft = (point) => {
  if (!viewportDraftStart || !viewportDraft) return;
  const x = Math.min(viewportDraftStart.x, point.x);
  const y = Math.min(viewportDraftStart.y, point.y);
  const width = Math.abs(point.x - viewportDraftStart.x);
  const height = Math.abs(point.y - viewportDraftStart.y);
  viewportDraft.setAttribute("x", x);
  viewportDraft.setAttribute("y", y);
  viewportDraft.setAttribute("width", width);
  viewportDraft.setAttribute("height", height);
};

const finishViewportDraft = () => {
  if (viewportDraft) {
    viewportDraft.remove();
    viewportDraft = null;
  }
  viewportDraftStart = null;
};

const startButtonDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  buttonDraftStart = point;
  if (!buttonDraft) {
    buttonDraft = document.createElementNS(ns, "rect");
    buttonDraft.setAttribute("fill", "rgba(6, 17, 183, 0.15)");
    buttonDraft.setAttribute("stroke", "#4aa3ff");
    buttonDraft.setAttribute("stroke-dasharray", "4 3");
    buttonDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(buttonDraft);
  } else if (!buttonDraft.isConnected) {
    hmiSvg.appendChild(buttonDraft);
  }
  buttonDraft.setAttribute("x", point.x);
  buttonDraft.setAttribute("y", point.y);
  buttonDraft.setAttribute("width", 0);
  buttonDraft.setAttribute("height", 0);
};

const updateButtonDraft = (point) => {
  if (!buttonDraftStart || !buttonDraft) return;
  const x = Math.min(buttonDraftStart.x, point.x);
  const y = Math.min(buttonDraftStart.y, point.y);
  const width = Math.abs(point.x - buttonDraftStart.x);
  const height = Math.abs(point.y - buttonDraftStart.y);
  buttonDraft.setAttribute("x", x);
  buttonDraft.setAttribute("y", y);
  buttonDraft.setAttribute("width", width);
  buttonDraft.setAttribute("height", height);
};

const finishButtonDraft = () => {
  if (buttonDraft) {
    buttonDraft.remove();
    buttonDraft = null;
  }
  buttonDraftStart = null;
};

const startRectDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  rectDraftStart = point;
  if (!rectDraft) {
    rectDraft = document.createElementNS(ns, "rect");
    rectDraft.setAttribute("fill", "rgba(255, 213, 74, 0.15)");
    rectDraft.setAttribute("stroke", "#ffd54a");
    rectDraft.setAttribute("stroke-dasharray", "4 3");
    rectDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(rectDraft);
  } else if (!rectDraft.isConnected) {
    hmiSvg.appendChild(rectDraft);
  }
  rectDraft.setAttribute("x", point.x);
  rectDraft.setAttribute("y", point.y);
  rectDraft.setAttribute("width", 0);
  rectDraft.setAttribute("height", 0);
};

const updateRectDraft = (point) => {
  if (!rectDraftStart || !rectDraft) return;
  const x = Math.min(rectDraftStart.x, point.x);
  const y = Math.min(rectDraftStart.y, point.y);
  const width = Math.abs(point.x - rectDraftStart.x);
  const height = Math.abs(point.y - rectDraftStart.y);
  rectDraft.setAttribute("x", x);
  rectDraft.setAttribute("y", y);
  rectDraft.setAttribute("width", width);
  rectDraft.setAttribute("height", height);
};

const finishRectDraft = () => {
  if (rectDraft) {
    rectDraft.remove();
    rectDraft = null;
  }
  rectDraftStart = null;
};

const startBarDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  barDraftStart = point;
  if (!barDraft) {
    barDraft = document.createElementNS(ns, "rect");
    barDraft.setAttribute("fill", "rgba(255, 213, 74, 0.15)");
    barDraft.setAttribute("stroke", "#ffd54a");
    barDraft.setAttribute("stroke-dasharray", "4 3");
    barDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(barDraft);
  } else if (!barDraft.isConnected) {
    hmiSvg.appendChild(barDraft);
  }
  barDraft.setAttribute("x", point.x);
  barDraft.setAttribute("y", point.y);
  barDraft.setAttribute("width", 0);
  barDraft.setAttribute("height", 0);
};

const updateBarDraft = (point) => {
  if (!barDraftStart || !barDraft) return;
  const x = Math.min(barDraftStart.x, point.x);
  const y = Math.min(barDraftStart.y, point.y);
  const width = Math.abs(point.x - barDraftStart.x);
  const height = Math.abs(point.y - barDraftStart.y);
  barDraft.setAttribute("x", x);
  barDraft.setAttribute("y", y);
  barDraft.setAttribute("width", width);
  barDraft.setAttribute("height", height);
};

const finishBarDraft = () => {
  if (barDraft) {
    barDraft.remove();
    barDraft = null;
  }
  barDraftStart = null;
};

const startCircleDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  circleDraftStart = point;
  if (!circleDraft) {
    circleDraft = document.createElementNS(ns, "circle");
    circleDraft.setAttribute("fill", "rgba(255, 213, 74, 0.15)");
    circleDraft.setAttribute("stroke", "#ffd54a");
    circleDraft.setAttribute("stroke-dasharray", "4 3");
    circleDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(circleDraft);
  }
  circleDraft.setAttribute("cx", point.x);
  circleDraft.setAttribute("cy", point.y);
  circleDraft.setAttribute("r", 0);
};

const updateCircleDraft = (point) => {
  if (!circleDraftStart || !circleDraft) return;
  const cx = (circleDraftStart.x + point.x) / 2;
  const cy = (circleDraftStart.y + point.y) / 2;
  const dx = point.x - circleDraftStart.x;
  const dy = point.y - circleDraftStart.y;
  const r = Math.max(0, Math.sqrt(dx * dx + dy * dy) / 2);
  circleDraft.setAttribute("cx", cx);
  circleDraft.setAttribute("cy", cy);
  circleDraft.setAttribute("r", r);
};

const updateCircleCenterDraft = (point) => {
  if (!circleCenterDraftStart || !circleDraft) return;
  const dx = point.x - circleCenterDraftStart.x;
  const dy = point.y - circleCenterDraftStart.y;
  const r = Math.max(0, Math.sqrt(dx * dx + dy * dy));
  circleDraft.setAttribute("cx", circleCenterDraftStart.x);
  circleDraft.setAttribute("cy", circleCenterDraftStart.y);
  circleDraft.setAttribute("r", r);
};

const finishCircleDraft = () => {
  if (circleDraft) {
    circleDraft.remove();
    circleDraft = null;
  }
  circleDraftStart = null;
  circleCenterDraftStart = null;
};

const startLineDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  lineDraftStart = point;
  if (!lineDraft) {
    lineDraft = document.createElementNS(ns, "line");
    lineDraft.setAttribute("stroke", "#ffd54a");
    lineDraft.setAttribute("stroke-width", "2");
    lineDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(lineDraft);
  } else if (!lineDraft.isConnected) {
    hmiSvg.appendChild(lineDraft);
  }
  lineDraft.setAttribute("x1", point.x);
  lineDraft.setAttribute("y1", point.y);
  lineDraft.setAttribute("x2", point.x);
  lineDraft.setAttribute("y2", point.y);
};

const updateLineDraft = (point) => {
  if (!lineDraftStart || !lineDraft) return;
  if (hmiSvg && !lineDraft.isConnected) {
    hmiSvg.appendChild(lineDraft);
  }
  lineDraft.setAttribute("x2", point.x);
  lineDraft.setAttribute("y2", point.y);
};

const finishLineDraft = () => {
  if (lineDraft) {
    lineDraft.remove();
    lineDraft = null;
  }
  lineDraftStart = null;
};

const startCurveDraft = (startPoint) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  if (!curveDraft) {
    curveDraft = document.createElementNS(ns, "path");
    curveDraft.setAttribute("fill", "none");
    curveDraft.setAttribute("stroke", "#ffd54a");
    curveDraft.setAttribute("stroke-width", "2");
    curveDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(curveDraft);
  } else if (!curveDraft.isConnected) {
    hmiSvg.appendChild(curveDraft);
  }
  curveDraftStage = 1;
  curveDraftStart = startPoint;
  curveDraftEnd = startPoint;
  curveDraftControl = startPoint;
  curveDraft.setAttribute("d", `M ${startPoint.x} ${startPoint.y} Q ${startPoint.x} ${startPoint.y} ${startPoint.x} ${startPoint.y}`);
  updateToolHint();
};

const updateCurveDraft = (point) => {
  if (!curveDraft || !curveDraftStart) return;
  if (hmiSvg && !curveDraft.isConnected) hmiSvg.appendChild(curveDraft);
  if (curveDraftStage === 1) {
    curveDraftEnd = point;
    curveDraftControl = { x: (curveDraftStart.x + point.x) / 2, y: (curveDraftStart.y + point.y) / 2 };
  } else if (curveDraftStage === 2) {
    curveDraftControl = point;
  } else {
    return;
  }
  const s = curveDraftStart;
  const e = curveDraftEnd || s;
  const c = curveDraftControl || { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
  curveDraft.setAttribute("d", `M ${s.x} ${s.y} Q ${c.x} ${c.y} ${e.x} ${e.y}`);
  updateToolHint();
};

const finishCurveDraft = () => {
  if (curveDraft) {
    curveDraft.remove();
    curveDraft = null;
  }
  curveDraftStage = 0;
  curveDraftStart = null;
  curveDraftEnd = null;
  curveDraftControl = null;
  updateToolHint();
};

const startPolylineDraft = (point) => {
  polylineDraftPoints = [point];
  if (!hmiSvg) return;
  if (!polylineDraft) {
    polylineDraft = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polylineDraft.setAttribute("fill", "none");
    polylineDraft.setAttribute("stroke", "#ffd54a");
    polylineDraft.setAttribute("stroke-width", "2");
    polylineDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(polylineDraft);
  } else if (!polylineDraft.isConnected) {
    hmiSvg.appendChild(polylineDraft);
  }
  polylineDraft.setAttribute("points", `${point.x},${point.y}`);
};

const updatePolylineDraft = (point) => {
  if (!polylineDraft || !polylineDraftPoints.length) return;
  if (hmiSvg && !polylineDraft.isConnected) {
    hmiSvg.appendChild(polylineDraft);
  }
  const points = [...polylineDraftPoints, point];
  polylineDraft.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
};

const finishPolylineDraft = () => {
  if (polylineDraft) {
    polylineDraft.remove();
    polylineDraft = null;
  }
  polylineDraftPoints = [];
};

const startPolygonDraft = (point) => {
  polygonDraftPoints = [point];
  if (!hmiSvg) return;
  if (!polygonDraft) {
    polygonDraft = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygonDraft.setAttribute("fill", "rgba(255, 213, 74, 0.15)");
    polygonDraft.setAttribute("stroke", "#ffd54a");
    polygonDraft.setAttribute("stroke-width", "2");
    polygonDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(polygonDraft);
  } else if (!polygonDraft.isConnected) {
    hmiSvg.appendChild(polygonDraft);
  }
  polygonDraft.setAttribute("points", `${point.x},${point.y}`);
};

const updatePolygonDraft = (point) => {
  if (!polygonDraft || !polygonDraftPoints.length) return;
  if (hmiSvg && !polygonDraft.isConnected) {
    hmiSvg.appendChild(polygonDraft);
  }
  const points = [...polygonDraftPoints, point];
  polygonDraft.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
};

const finishPolygonDraft = () => {
  if (polygonDraft) {
    polygonDraft.remove();
    polygonDraft = null;
  }
  polygonDraftPoints = [];
};

const computeRegularPolygonPoints = (rect, sides, fitMode) => {
  const count = Math.max(3, Math.min(64, Math.round(Number(sides) || 3)));
  const x = Number(rect?.x ?? 0);
  const y = Number(rect?.y ?? 0);
  const w = Math.max(1, Number(rect?.w ?? 1));
  const h = Math.max(1, Number(rect?.h ?? 1));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const mode = fitMode === "stretched" ? "stretched" : "inscribed";
  const rx = mode === "stretched" ? Math.max(1, w / 2) : Math.max(1, Math.min(w, h) / 2);
  const ry = mode === "stretched" ? Math.max(1, h / 2) : rx;
  let start = -Math.PI / 2;
  if (count % 2 === 0) start += Math.PI / count;
  const points = [];
  for (let i = 0; i < count; i++) {
    const ang = start + (i * Math.PI * 2) / count;
    points.push({ x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang) });
  }
  return points;
};

const startRegularPolygonDraft = (point) => {
  if (!hmiSvg) return;
  const ns = "http://www.w3.org/2000/svg";
  regularPolygonDraftStart = point;
  if (!regularPolygonDraftRect) {
    regularPolygonDraftRect = document.createElementNS(ns, "rect");
    regularPolygonDraftRect.setAttribute("fill", "rgba(255, 213, 74, 0.12)");
    regularPolygonDraftRect.setAttribute("stroke", "#ffd54a");
    regularPolygonDraftRect.setAttribute("stroke-dasharray", "4 3");
    regularPolygonDraftRect.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(regularPolygonDraftRect);
  } else if (!regularPolygonDraftRect.isConnected) {
    hmiSvg.appendChild(regularPolygonDraftRect);
  }
  if (!regularPolygonDraft) {
    regularPolygonDraft = document.createElementNS(ns, "polygon");
    regularPolygonDraft.setAttribute("fill", "rgba(255, 213, 74, 0.15)");
    regularPolygonDraft.setAttribute("stroke", "#ffd54a");
    regularPolygonDraft.setAttribute("stroke-width", "2");
    regularPolygonDraft.setAttribute("vector-effect", "non-scaling-stroke");
    hmiSvg.appendChild(regularPolygonDraft);
  } else if (!regularPolygonDraft.isConnected) {
    hmiSvg.appendChild(regularPolygonDraft);
  }
  regularPolygonDraftRect.setAttribute("x", point.x);
  regularPolygonDraftRect.setAttribute("y", point.y);
  regularPolygonDraftRect.setAttribute("width", 0);
  regularPolygonDraftRect.setAttribute("height", 0);
  regularPolygonDraft.setAttribute("points", `${point.x},${point.y}`);
};

const updateRegularPolygonDraft = (point) => {
  if (!regularPolygonDraftStart || !regularPolygonDraft || !regularPolygonDraftRect) return;
  const x = Math.min(regularPolygonDraftStart.x, point.x);
  const y = Math.min(regularPolygonDraftStart.y, point.y);
  const w = Math.abs(point.x - regularPolygonDraftStart.x);
  const h = Math.abs(point.y - regularPolygonDraftStart.y);
  regularPolygonDraftRect.setAttribute("x", x);
  regularPolygonDraftRect.setAttribute("y", y);
  regularPolygonDraftRect.setAttribute("width", w);
  regularPolygonDraftRect.setAttribute("height", h);
  const pts = computeRegularPolygonPoints({ x, y, w, h }, regularPolygonSides, regularPolygonFitMode);
  regularPolygonDraft.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
};

const finishRegularPolygonDraft = () => {
  if (regularPolygonDraftRect) {
    regularPolygonDraftRect.remove();
    regularPolygonDraftRect = null;
  }
  if (regularPolygonDraft) {
    regularPolygonDraft.remove();
    regularPolygonDraft = null;
  }
  regularPolygonDraftStart = null;
};

const setTool = (nextTool) => {
  if (currentTool === "curve" && nextTool !== "curve" && isDrawingCurve) {
    finishCurveDraft();
    isDrawingCurve = false;
    curveDraft = null;
    curveDraftStage = 0;
    curveDraftStart = null;
    curveDraftEnd = null;
    curveDraftControl = null;
  }
  if (currentTool === "polyline" && nextTool !== "polyline" && isDrawingPolyline) {
    finishPolylineDraft();
    isDrawingPolyline = false;
  }
  if (currentTool === "polygon" && nextTool !== "polygon" && isDrawingPolygon) {
    finishPolygonDraft();
    isDrawingPolygon = false;
  }
  if ((currentTool === "regular-polygon" || currentTool === "stretched-polygon") && nextTool !== "regular-polygon" && nextTool !== "stretched-polygon" && isDrawingRegularPolygon) {
    finishRegularPolygonDraft();
    isDrawingRegularPolygon = false;
  }
  if (currentTool === "alarms-panel" && nextTool !== "alarms-panel" && isDrawingAlarmsPanel) {
    finishRectDraft();
    isDrawingAlarmsPanel = false;
  }
  currentTool = nextTool;
  if (textToolBtn) {
    textToolBtn.classList.toggle("is-active", currentTool === "text");
  }
  if (buttonToolBtn) {
    buttonToolBtn.classList.toggle("is-active", currentTool === "button");
  }
  if (viewportToolBtn) {
    viewportToolBtn.classList.toggle("is-active", currentTool === "viewport");
  }
  if (rectToolBtn) {
    rectToolBtn.classList.toggle("is-active", currentTool === "rect");
  }
  if (alarmsPanelToolBtn) {
    alarmsPanelToolBtn.classList.toggle("is-active", currentTool === "alarms-panel");
  }
  if (polylineToolBtn) {
    polylineToolBtn.classList.toggle("is-active", currentTool === "polyline");
  }
  if (polygonToolBtn) {
    polygonToolBtn.classList.toggle("is-active", currentTool === "polygon");
  }
  if (regularPolygonToolBtn) {
    regularPolygonToolBtn.classList.toggle("is-active", currentTool === "regular-polygon");
  }
  if (stretchedPolygonToolBtn) {
    stretchedPolygonToolBtn.classList.toggle("is-active", currentTool === "stretched-polygon");
  }
  if (barToolBtn) {
    barToolBtn.classList.toggle("is-active", currentTool === "bar");
  }
  if (circleToolBtn) {
    circleToolBtn.classList.toggle("is-active", currentTool === "circle");
  }
  if (circleCenterToolBtn) {
    circleCenterToolBtn.classList.toggle("is-active", currentTool === "circle-center");
  }
  if (lineToolBtn) {
    lineToolBtn.classList.toggle("is-active", currentTool === "line");
  }
  if (curveToolBtn) {
    curveToolBtn.classList.toggle("is-active", currentTool === "curve");
  }
  if (hmiSvg) {
    if (["text", "button", "viewport", "rect", "alarms-panel", "polyline", "polygon", "regular-polygon", "stretched-polygon", "bar", "circle", "line", "curve"].includes(currentTool)) {
      hmiSvg.style.cursor = "crosshair";
    } else {
      hmiSvg.style.cursor = "default";
    }
  }
  updateToolHint();
};

		if (hmiSvg) {
		  hmiSvg.addEventListener("mousedown", (event) => {
		    if (!isEditMode) return;
		    if (event.button === 2) return;
		    const target = event.target;
		    if (target instanceof Element) {
		      const rotateEl = target.closest("[data-rotate-handle]");
		      if (rotateEl) {
		        const point = getScreenPoint(event);
		        if (!point) return;
		        const activePoint = toActivePoint(point);
		        const bounds = getSelectionBoundsActive();
		        if (!bounds) return;
		        rotateCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
		        rotateStartAngle = Math.atan2(activePoint.y - rotateCenter.y, activePoint.x - rotateCenter.x);
		        const activeObjects = getActiveObjects() || [];
		        rotateBase = selectedIndices
		          .map((idx) => ({ idx, obj: JSON.parse(JSON.stringify(activeObjects[idx] || null)) }))
		          .filter((entry) => entry.obj);
		        if (!rotateBase.length) return;
		        recordHistory();
		        isRotating = true;
		        event.preventDefault();
		        event.stopPropagation();
		        return;
		      }
			      const handleEl = target.closest("[data-resize-handle]");
				      if (handleEl) {
			        const handleType = handleEl.getAttribute("data-resize-handle");
			        const isSelectionHandle = handleEl.getAttribute("data-resize-selection") === "1";
			        if (isSelectionHandle && handleType) {
			          const point = getScreenPoint(event);
			          if (!point) return;
			          const activeObjects = getActiveObjects() || [];
			          const base = selectedIndices
			            .map((idx) => ({ idx, obj: JSON.parse(JSON.stringify(activeObjects[idx] || null)) }))
			            .filter((entry) => entry.obj);
			          if (!base.length) return;
			          const bounds = getSelectionBoundsForScaling(activeObjects, selectedIndices);
			          if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
			          recordHistory();
			          isResizing = true;
			          resizeStart = point;
			          resizeStartBounds = { type: "selection" };
			          resizeSelectionBase = base;
			          resizeSelectionBounds = bounds;
			          resizeSelectionHandle = handleType.replace(/^sel-/, "");
			          resizeHandle = handleType;
			          resizeIndex = null;
			          resizeVertexIndex = null;
			          event.preventDefault();
			          event.stopPropagation();
			          return;
			        }
			        const handleIndex = Number(handleEl.getAttribute("data-resize-index"));
			        const vertexIndexAttr = handleEl.getAttribute("data-vertex-index");
		        resizeVertexIndex = vertexIndexAttr == null ? null : Number(vertexIndexAttr);
		        if (!Number.isFinite(resizeVertexIndex)) resizeVertexIndex = null;
	        const obj = getActiveObjects()?.[handleIndex];
	        if (handleType === "vertex" && obj?.type === "polygon" && resizeVertexIndex != null) {
	          selectedPolygonVertex = { groupDepth: groupEditStack.length, objectIndex: handleIndex, vertexIndex: resizeVertexIndex };
	          updateSelectionOverlays();
	        } else if (handleType !== "vertex") {
	          clearSelectedPolygonVertex();
	        }
	        if (obj && (obj.type === "button" || obj.type === "viewport" || obj.type === "rect" || obj.type === "alarms-panel" || obj.type === "bar" || obj.type === "circle" || obj.type === "line" || obj.type === "polyline" || obj.type === "polygon" || obj.type === "number-input" || obj.type === "indicator" || obj.type === "image")) {
	          const point = getScreenPoint(event);
	          if (!point) return;
	          recordHistory();
	          isResizing = true;
	          resizeHandle = handleType;
	          resizeIndex = handleIndex;
	          resizeStart = point;
	          if (obj.type === "polyline" || obj.type === "polygon") {
	            resizeStartBounds = {
	              type: obj.type,
	              points: (Array.isArray(obj.points) ? obj.points : []).map((pt) => ({
	                x: Number(pt?.x ?? 0),
	                y: Number(pt?.y ?? 0)
	              }))
	            };
	          } else if (obj.type === "circle") {
	            resizeStartBounds = {
	              type: "circle",
	              cx: Number(obj.cx ?? 0),
	              cy: Number(obj.cy ?? 0),
	              r: Number(obj.r ?? 0)
            };
          } else if (obj.type === "line") {
            resizeStartBounds = {
              type: "line",
              x1: Number(obj.x1 ?? 0),
              y1: Number(obj.y1 ?? 0),
              x2: Number(obj.x2 ?? 0),
              y2: Number(obj.y2 ?? 0)
            };
	          } else {
	            const defaultW = obj.type === "indicator" ? 160 : 0;
	            const defaultH = obj.type === "indicator" ? 64 : 0;
	            resizeStartBounds = {
	              type: obj.type,
	              x: Number(obj.x ?? 0),
	              y: Number(obj.y ?? 0),
	              w: Number(obj.w ?? defaultW),
	              h: Number(obj.h ?? defaultH),
	              rotation: Number(obj.rotation ?? 0)
	            };
	          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }
    const point = getScreenPoint(event);
    if (!point) return;
    lastMouseScreenPoint = point;
    if (currentTool === "viewport") {
      isDrawingViewport = true;
      startViewportDraft(point);
      return;
    }
    if (currentTool === "button") {
      isDrawingButton = true;
      startButtonDraft(point);
      return;
    }
	    if (currentTool === "rect") {
	      isDrawingRect = true;
	      startRectDraft(point);
	      return;
	    }
    if (currentTool === "alarms-panel") {
      isDrawingAlarmsPanel = true;
      startRectDraft(point);
      return;
    }
    if (currentTool === "bar") {
      isDrawingBar = true;
      startBarDraft(point);
      return;
    }
    if (currentTool === "circle") {
      isDrawingCircle = true;
      startCircleDraft(point);
      return;
    }
    if (currentTool === "circle-center") {
      isDrawingCircleCenter = true;
      circleCenterDraftStart = point;
      startCircleDraft(point);
      return;
    }
    if (currentTool === "curve") {
      if (!isDrawingCurve) {
        isDrawingCurve = true;
        startCurveDraft(point);
        return;
      }
      if (curveDraftStage === 1) {
        curveDraftStage = 2;
        curveDraftEnd = point;
        curveDraftControl = { x: (curveDraftStart.x + point.x) / 2, y: (curveDraftStart.y + point.y) / 2 };
        updateCurveDraft(curveDraftControl);
        return;
      }
      if (curveDraftStage === 2) {
        updateCurveDraft(point);
        if (!currentScreenObj) return;
        const activeObjects = ensureActiveObjects();
        if (!activeObjects) return;
        const startPoint = toActivePoint(curveDraftStart);
        const endPoint = toActivePoint(curveDraftEnd || curveDraftStart);
        const controlPoint = toActivePoint(curveDraftControl || point);
        const nextCurve = {
          type: "curve",
          x1: snapValue(Math.round(startPoint.x)),
          y1: snapValue(Math.round(startPoint.y)),
          cx: snapValue(Math.round(controlPoint.x)),
          cy: snapValue(Math.round(controlPoint.y)),
          x2: snapValue(Math.round(endPoint.x)),
          y2: snapValue(Math.round(endPoint.y)),
          stroke: "#ffffff",
          strokeWidth: 2
        };
        recordHistory();
        activeObjects.push(nextCurve);
        selectedIndices = [activeObjects.length - 1];
        finishCurveDraft();
        isDrawingCurve = false;
        renderScreen();
        syncEditorFromScreen();
        setTool("select");
        setDirty(true);
        setEditorTab("properties");
        return;
      }
      return;
    }
	    if (currentTool === "line") {
	      isDrawingLine = true;
	      startLineDraft(point);
	      return;
	    }
	    if (currentTool === "polyline") {
	      if (!isDrawingPolyline) {
	        isDrawingPolyline = true;
	        startPolylineDraft(point);
	        return;
	      }
	      polylineDraftPoints.push(point);
	      if (polylineDraft) {
	        polylineDraft.setAttribute(
	          "points",
	          polylineDraftPoints.map((p) => `${p.x},${p.y}`).join(" ")
	        );
	      }
	      return;
	    }
		    if (currentTool === "polygon") {
		      if (!isDrawingPolygon) {
		        isDrawingPolygon = true;
		        startPolygonDraft(point);
		        return;
		      }
		      polygonDraftPoints.push(point);
		      if (polygonDraft) {
		        polygonDraft.setAttribute(
		          "points",
		          polygonDraftPoints.map((p) => `${p.x},${p.y}`).join(" ")
		        );
		      }
		      return;
		    }
		    if (currentTool === "regular-polygon") {
		      isDrawingRegularPolygon = true;
		      startRegularPolygonDraft(point);
		      return;
		    }
		    if (currentTool === "stretched-polygon") {
		      isDrawingRegularPolygon = true;
		      startRegularPolygonDraft(point);
		      return;
		    }
		    if (currentTool !== "select") return;
	    const hitMeta = getMetaAtPoint(point);
		    if (hitMeta) {
	      if (event.ctrlKey || event.metaKey) {
	        if (selectedIndices.includes(hitMeta.index)) {
	          selectedIndices = selectedIndices.filter((idx) => idx !== hitMeta.index);
	        } else {
	          selectedIndices = [...selectedIndices, hitMeta.index];
	        }
	        syncSelectedPolygonVertex();
	        updateSelectionOverlays();
	        updatePropertiesPanel();
	        return;
	      }
	      if (!selectedIndices.includes(hitMeta.index)) {
	        selectedIndices = [hitMeta.index];
	        syncSelectedPolygonVertex();
	        updateSelectionOverlays();
	        updatePropertiesPanel();
	      }
		      isDragPending = true;
		      dragStart = point;
	      dragOrigins = selectedIndices.map((index) => {
	        const obj = getActiveObjects()?.[index];
	        if (obj?.type === "polyline" || obj?.type === "polygon") {
	          return {
	            index,
	            points: (Array.isArray(obj.points) ? obj.points : []).map((pt) => ({
	              x: Number(pt?.x ?? 0),
	              y: Number(pt?.y ?? 0)
	            })),
	            mode: "points"
	          };
	        }
	        if (obj?.type === "line") {
	          return {
	            index,
	            x1: obj?.x1 ?? 0,
            y1: obj?.y1 ?? 0,
            x2: obj?.x2 ?? 0,
            y2: obj?.y2 ?? 0,
            mode: "line"
          };
        }
        if (obj?.type === "curve") {
          return {
            index,
            x1: Number(obj?.x1 ?? 0),
            y1: Number(obj?.y1 ?? 0),
            cx: Number(obj?.cx ?? 0),
            cy: Number(obj?.cy ?? 0),
            x2: Number(obj?.x2 ?? 0),
            y2: Number(obj?.y2 ?? 0),
            mode: "curve"
          };
        }
        return {
          index,
          x: obj?.x ?? obj?.cx ?? 0,
          y: obj?.y ?? obj?.cy ?? 0,
          mode: obj?.x != null || obj?.y != null ? "xy" : "cxy"
        };
      });
      return;
    }

    isSelecting = true;
    selectionStart = point;
    if (selectionBox) {
      selectionBox.style.display = "block";
      selectionBox.setAttribute("x", point.x);
      selectionBox.setAttribute("y", point.y);
      selectionBox.setAttribute("width", 0);
      selectionBox.setAttribute("height", 0);
    }
  });

  hmiSvg.addEventListener("mousemove", (event) => {
    if (isEditMode) {
      const trackedPoint = getScreenPoint(event);
      if (trackedPoint) lastMouseScreenPoint = trackedPoint;
    }
    if (isDrawingViewport && viewportDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      updateViewportDraft(point);
      return;
    }
    if (isDrawingButton && buttonDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      updateButtonDraft(point);
      return;
    }
	    if (isDrawingRect && rectDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      updateRectDraft(point);
	      return;
	    }
    if (isDrawingAlarmsPanel && rectDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      updateRectDraft(point);
      return;
    }
	    if (isDrawingRegularPolygon && regularPolygonDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      updateRegularPolygonDraft(point);
	      return;
	    }
	    if (isDrawingBar && barDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      updateBarDraft(point);
	      return;
	    }
    if (isDrawingCircle && circleDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      updateCircleDraft(point);
      return;
    }
    if (isDrawingCircleCenter && circleCenterDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      updateCircleCenterDraft(point);
      return;
    }
	    if (isDrawingLine && lineDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      updateLineDraft(point);
	      return;
	    }
    if (isDrawingCurve && curveDraftStage && curveDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      updateCurveDraft(point);
      return;
    }
	    if (isDrawingPolyline) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      updatePolylineDraft(point);
	      return;
	    }
	    if (isDrawingPolygon) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      updatePolygonDraft(point);
	      return;
	    }
	    if (isRotating && rotateCenter && rotateBase.length) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      const activePoint = toActivePoint(point);
	      const angle = Math.atan2(activePoint.y - rotateCenter.y, activePoint.x - rotateCenter.x);
	      let deltaRad = angle - rotateStartAngle;
	      let deltaDeg = (deltaRad * 180) / Math.PI;
	      if (event.shiftKey) {
	        deltaDeg = Math.round(deltaDeg / 15) * 15;
	        deltaRad = (deltaDeg * Math.PI) / 180;
	      }
	      const activeObjects = getActiveObjects() || [];
	      rotateBase.forEach((entry) => {
	        const obj = activeObjects[entry.idx];
	        if (!obj) return;
	        applyRotationToObject(obj, entry.obj, deltaRad, rotateCenter, deltaDeg);
	      });
	      renderScreen();
	      syncEditorFromScreen();
	      updateSelectionOverlays();
	      updatePropertiesPanel();
	      setDirty(true);
	      return;
	    }
		    if (isResizing && resizeStart && resizeStartBounds) {
		      const point = getScreenPoint(event);
		      if (!point) return;
		      if (resizeStartBounds.type === "selection") {
		        if (!resizeSelectionBounds || !resizeSelectionBase.length) return;
		        const startActive = toActivePoint(resizeStart);
		        const nowActive = toActivePoint(point);
		        const dx = nowActive.x - startActive.x;
		        const dy = nowActive.y - startActive.y;
		        const handle = resizeSelectionHandle || "se";
		        const fromB = resizeSelectionBounds;
		        const x1 = fromB.x;
		        const y1 = fromB.y;
		        const x2 = fromB.x + fromB.width;
		        const y2 = fromB.y + fromB.height;
		        let ax = x1;
		        let ay = y1;
		        let cx = x2;
		        let cy = y2;
		        if (handle === "nw") {
		          ax = x2;
		          ay = y2;
		          cx = x1 + dx;
		          cy = y1 + dy;
		        } else if (handle === "ne") {
		          ax = x1;
		          ay = y2;
		          cx = x2 + dx;
		          cy = y1 + dy;
		        } else if (handle === "se") {
		          ax = x1;
		          ay = y1;
		          cx = x2 + dx;
		          cy = y2 + dy;
		        } else if (handle === "sw") {
		          ax = x2;
		          ay = y1;
		          cx = x1 + dx;
		          cy = y2 + dy;
		        } else {
		          return;
		        }
		        const oldW = Math.max(1, fromB.width);
		        const oldH = Math.max(1, fromB.height);
		        const relX = (cx - ax) / oldW;
		        const relY = (cy - ay) / oldH;
		        const sMag = Math.max(0.05, Math.abs(relX) > Math.abs(relY) ? Math.abs(relX) : Math.abs(relY));
		        const newW = Math.max(MIN_RESIZE_SIZE, oldW * sMag);
		        const newH = Math.max(MIN_RESIZE_SIZE, oldH * sMag);
		        const sx = Math.sign(cx - ax) || 1;
		        const sy = Math.sign(cy - ay) || 1;
		        const fx = ax + sx * newW;
		        const fy = ay + sy * newH;
		        const nx = Math.min(ax, fx);
		        const ny = Math.min(ay, fy);
		        const toB = { x: nx, y: ny, width: Math.abs(fx - ax), height: Math.abs(fy - ay) };
		        const scale = toB.width / oldW;
		        const activeObjects = getActiveObjects() || [];
		        resizeSelectionBase.forEach((entry) => {
		          const obj = activeObjects[entry.idx];
		          if (!obj) return;
		          scaleObjectUniformFromBounds(obj, entry.obj, scale, fromB, toB);
		        });
		        renderScreen();
		        syncEditorFromScreen();
		        updateSelectionOverlays();
		        setDirty(true);
		        return;
		      }
		      if (resizeIndex == null) return;
		      const startActive = toActivePoint(resizeStart);
		      const nowActive = toActivePoint(point);
		      let dx = nowActive.x - startActive.x;
	      let dy = nowActive.y - startActive.y;
	      const handle = resizeHandle || "se";
	      const obj = getActiveObjects()?.[resizeIndex];
	      if (!obj || !resizeStartBounds) return;

	      if (resizeStartBounds.type === "polyline" || resizeStartBounds.type === "polygon") {
	        const startPoints = resizeStartBounds.points;
	        if (!Array.isArray(startPoints) || !startPoints.length) return;
	        if (handle === "vertex") {
	          if (resizeVertexIndex == null) return;
          const base = startPoints[resizeVertexIndex];
          if (!base) return;
          let x = base.x + dx;
          let y = base.y + dy;
          if (snapEnabled) {
            x = snapValue(Math.round(x));
            y = snapValue(Math.round(y));
          } else {
            x = Math.round(x);
            y = Math.round(y);
          }
          if (!Array.isArray(obj.points)) obj.points = [];
          obj.points[resizeVertexIndex] = { x, y };
	        } else if (handle === "nw" || handle === "ne" || handle === "se" || handle === "sw") {
	          const xs = startPoints.map((pt) => Number(pt?.x ?? 0));
	          const ys = startPoints.map((pt) => Number(pt?.y ?? 0));
	          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const oldW = Math.max(1, maxX - minX);
          const oldH = Math.max(1, maxY - minY);

          let anchorX = minX;
          let anchorY = minY;
          let cornerX = maxX;
          let cornerY = maxY;
          if (handle === "nw") {
            anchorX = maxX;
            anchorY = maxY;
            cornerX = minX + dx;
            cornerY = minY + dy;
          } else if (handle === "ne") {
            anchorX = minX;
            anchorY = maxY;
            cornerX = maxX + dx;
            cornerY = minY + dy;
          } else if (handle === "se") {
            anchorX = minX;
            anchorY = minY;
            cornerX = maxX + dx;
            cornerY = maxY + dy;
          } else if (handle === "sw") {
            anchorX = maxX;
            anchorY = minY;
            cornerX = minX + dx;
            cornerY = maxY + dy;
          }

          let newW = oldW;
          let newH = oldH;
          if (handle === "nw" || handle === "sw") newW = Math.max(MIN_RESIZE_SIZE, anchorX - cornerX);
          else newW = Math.max(MIN_RESIZE_SIZE, cornerX - anchorX);
	          if (handle === "nw" || handle === "ne") newH = Math.max(MIN_RESIZE_SIZE, anchorY - cornerY);
	          else newH = Math.max(MIN_RESIZE_SIZE, cornerY - anchorY);

	          if (resizeStartBounds.type === "polygon") {
	            const sx = newW / oldW;
	            const sy = newH / oldH;
	            const s = Math.max(sx, sy);
	            obj.points = startPoints.map((pt) => {
	              const px = Number(pt?.x ?? 0);
	              const py = Number(pt?.y ?? 0);
	              let x = anchorX + (px - anchorX) * s;
	              let y = anchorY + (py - anchorY) * s;
	              if (snapEnabled) {
	                x = snapValue(Math.round(x));
	                y = snapValue(Math.round(y));
	              } else {
	                x = Math.round(x);
	                y = Math.round(y);
	              }
	              return { x, y };
	            });
	            return;
	          }

	          const sx = newW / oldW;
	          const sy = newH / oldH;
	          obj.points = startPoints.map((pt) => {
	            const px = Number(pt?.x ?? 0);
	            const py = Number(pt?.y ?? 0);
	            let x = anchorX + (px - anchorX) * sx;
	            let y = anchorY + (py - anchorY) * sy;
	            if (handle === "nw" || handle === "sw") x = anchorX - (anchorX - px) * sx;
	            if (handle === "nw" || handle === "ne") y = anchorY - (anchorY - py) * sy;
	            if (snapEnabled) {
	              x = snapValue(Math.round(x));
	              y = snapValue(Math.round(y));
	            } else {
	              x = Math.round(x);
	              y = Math.round(y);
	            }
	            return { x, y };
	          });
	        } else {
	          return;
	        }
	      } else if (resizeStartBounds.type === "circle") {
        const startR = resizeStartBounds.r || 0;
        const startCx = resizeStartBounds.cx || 0;
        const startCy = resizeStartBounds.cy || 0;
        let r = startR;
        if (handle.includes("e") || handle.includes("w")) {
          r = Math.max(MIN_RESIZE_SIZE / 2, startR + dx / 2);
        }
        if (handle.includes("n") || handle.includes("s")) {
          r = Math.max(MIN_RESIZE_SIZE / 2, startR + dy / 2);
        }
        r = snapEnabled ? snapValue(Math.round(r)) : Math.round(r);
        obj.cx = snapEnabled ? snapValue(Math.round(startCx)) : Math.round(startCx);
        obj.cy = snapEnabled ? snapValue(Math.round(startCy)) : Math.round(startCy);
        obj.r = r;
      } else if (resizeStartBounds.type === "line") {
        let x1 = resizeStartBounds.x1;
        let y1 = resizeStartBounds.y1;
        let x2 = resizeStartBounds.x2;
        let y2 = resizeStartBounds.y2;
        if (handle === "line-start") {
          x1 = resizeStartBounds.x1 + dx;
          y1 = resizeStartBounds.y1 + dy;
        }
        if (handle === "line-end") {
          x2 = resizeStartBounds.x2 + dx;
          y2 = resizeStartBounds.y2 + dy;
        }
        if (snapEnabled) {
          x1 = snapValue(Math.round(x1));
          y1 = snapValue(Math.round(y1));
          x2 = snapValue(Math.round(x2));
          y2 = snapValue(Math.round(y2));
        } else {
          x1 = Math.round(x1);
          y1 = Math.round(y1);
          x2 = Math.round(x2);
          y2 = Math.round(y2);
        }
        obj.x1 = x1;
        obj.y1 = y1;
        obj.x2 = x2;
        obj.y2 = y2;
	      } else {
	        const rotation = Number(resizeStartBounds.rotation ?? 0);
		        const canRotateResize =
		          rotation &&
		          ["button", "viewport", "rect", "alarms-panel", "bar", "number-input", "indicator", "image"].includes(resizeStartBounds.type) &&
		          ["nw", "n", "ne", "e", "se", "s", "sw", "w"].includes(handle);
	        if (canRotateResize) {
	          const angleRad = (rotation * Math.PI) / 180;
	          const center = {
	            x: Number(resizeStartBounds.x ?? 0) + Number(resizeStartBounds.w ?? 0) / 2,
	            y: Number(resizeStartBounds.y ?? 0) + Number(resizeStartBounds.h ?? 0) / 2
	          };
	          const startLocal = rotatePointAround(startActive, center, -angleRad);
	          const nowLocal = rotatePointAround(nowActive, center, -angleRad);
	          dx = nowLocal.x - startLocal.x;
	          dy = nowLocal.y - startLocal.y;
	        }
	        let { x, y, w, h } = resizeStartBounds;
	        if (handle.includes("e")) w = resizeStartBounds.w + dx;
	        if (handle.includes("s")) h = resizeStartBounds.h + dy;
	        if (handle.includes("w")) {
	          x = resizeStartBounds.x + dx;
	          w = resizeStartBounds.w - dx;
	        }
	        if (handle.includes("n")) {
	          y = resizeStartBounds.y + dy;
	          h = resizeStartBounds.h - dy;
	        }

        if (w < MIN_RESIZE_SIZE) {
          if (handle.includes("w")) x = resizeStartBounds.x + (resizeStartBounds.w - MIN_RESIZE_SIZE);
          w = MIN_RESIZE_SIZE;
        }
        if (h < MIN_RESIZE_SIZE) {
          if (handle.includes("n")) y = resizeStartBounds.y + (resizeStartBounds.h - MIN_RESIZE_SIZE);
          h = MIN_RESIZE_SIZE;
        }

        if (snapEnabled) {
          x = snapValue(Math.round(x));
          y = snapValue(Math.round(y));
          w = snapValue(Math.round(w));
          h = snapValue(Math.round(h));
        } else {
          x = Math.round(x);
          y = Math.round(y);
          w = Math.round(w);
          h = Math.round(h);
        }

        obj.x = x;
        obj.y = y;
        obj.w = w;
        obj.h = h;
      }
      renderScreen();
      syncEditorFromScreen();
      setDirty(true);
      return;
    }
    if (isDragPending && dragStart && !isDragging) {
      const point = getScreenPoint(event);
      if (!point) return;
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD_PX) return;
      recordHistory();
      isDragging = true;
    }
    if (isDragging && dragStart) {
      const point = getScreenPoint(event);
      if (!point) return;
    const dx = point.x - dragStart.x;
    const dy = point.y - dragStart.y;
	    dragOrigins.forEach((origin) => {
	        const obj = getActiveObjects()?.[origin.index];
	        if (!obj) return;
	        if (origin.mode === "points") {
	          const startPoints = origin.points || [];
	          if (!Array.isArray(startPoints)) return;
	          obj.points = startPoints.map((pt) => ({
	            x: snapValue(Math.round(Number(pt?.x ?? 0) + dx)),
	            y: snapValue(Math.round(Number(pt?.y ?? 0) + dy))
	          }));
	          return;
	        }
	        if (origin.mode === "line") {
	          obj.x1 = snapValue(Math.round(origin.x1 + dx));
	          obj.y1 = snapValue(Math.round(origin.y1 + dy));
	          obj.x2 = snapValue(Math.round(origin.x2 + dx));
          obj.y2 = snapValue(Math.round(origin.y2 + dy));
          return;
        }
        if (origin.mode === "curve") {
          obj.x1 = snapValue(Math.round(origin.x1 + dx));
          obj.y1 = snapValue(Math.round(origin.y1 + dy));
          obj.cx = snapValue(Math.round(origin.cx + dx));
          obj.cy = snapValue(Math.round(origin.cy + dy));
          obj.x2 = snapValue(Math.round(origin.x2 + dx));
          obj.y2 = snapValue(Math.round(origin.y2 + dy));
          return;
        }
        if (origin.mode === "xy") {
          obj.x = snapValue(Math.round(origin.x + dx));
          obj.y = snapValue(Math.round(origin.y + dy));
        } else {
          obj.cx = snapValue(Math.round(origin.x + dx));
          obj.cy = snapValue(Math.round(origin.y + dy));
        }
      });
      renderScreen();
      syncEditorFromScreen();
      setDirty(true);
      return;
    }

    if (!isEditMode) {
      const point = getScreenPoint(event);
      if (!point) return;
      if (event.target instanceof HTMLInputElement) {
        setGroupHotspotHover(null);
        hmiSvg.style.cursor = "default";
        return;
      }
      const hotspot = findRuntimeGroupHotspot(point);
      setGroupHotspotHover(hotspot);
      if (hotspot) {
        hmiSvg.style.cursor = "pointer";
        return;
      }
      const hitMeta = getMetaAtPoint(point);
      const obj = hitMeta ? getObjectFromMeta(hitMeta) : null;
      hmiSvg.style.cursor = obj?.type === "button" ? "pointer" : "default";
      return;
    }

    if (!isSelecting && currentTool === "select" && !isResizing) {
      const point = getScreenPoint(event);
      if (!point) return;
      const hitMeta = getMetaAtPoint(point);
      hmiSvg.style.cursor = hitMeta ? "move" : "default";
    }

    if (!isSelecting || !selectionStart || !selectionBox) return;
    const point = getScreenPoint(event);
    if (!point) return;
    const x = Math.min(selectionStart.x, point.x);
    const y = Math.min(selectionStart.y, point.y);
    const width = Math.abs(point.x - selectionStart.x);
    const height = Math.abs(point.y - selectionStart.y);
    selectionBox.setAttribute("x", x);
    selectionBox.setAttribute("y", y);
    selectionBox.setAttribute("width", width);
    selectionBox.setAttribute("height", height);
  });

  const finishSelection = (event) => {
    if (isDrawingViewport && viewportDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      const localStart = toActivePoint(viewportDraftStart);
      const localPoint = toActivePoint(point);
      const x = Math.min(localStart.x, localPoint.x);
      const y = Math.min(localStart.y, localPoint.y);
      const w = Math.max(10, Math.abs(localPoint.x - localStart.x));
      const h = Math.max(10, Math.abs(localPoint.y - localStart.y));
      finishViewportDraft();
      isDrawingViewport = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const nextViewport = {
        type: "viewport",
        id: createViewportId(),
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
        target: availableScreens[0]?.id || DEFAULT_SCREEN_ID,
        scaleMode: "actual-size",
        border: { enabled: true, color: "#ffffff", width: 1 }
      };
      recordHistory();
      activeObjects.push(nextViewport);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      refreshViewportIdOptions();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
    if (isDrawingButton && buttonDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      const localStart = toActivePoint(buttonDraftStart);
      const localPoint = toActivePoint(point);
      const x = Math.min(localStart.x, localPoint.x);
      const y = Math.min(localStart.y, localPoint.y);
      const w = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.x - localStart.x));
      const h = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.y - localStart.y));
      finishButtonDraft();
      isDrawingButton = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
	      const nextButton = {
	        type: "button",
	        x: snapValue(Math.round(x)),
	        y: snapValue(Math.round(y)),
	        w: snapValue(Math.round(w)),
	        h: snapValue(Math.round(h)),
	        rx: 0,
	        label: "Button",
	        fill: "#0611b7",
	        stroke: "#ffffff",
	        strokeWidth: 1,
        textColor: "#ffffff",
        action: { type: "navigate", screenId: availableScreens[0]?.id || DEFAULT_SCREEN_ID }
      };
      recordHistory();
      activeObjects.push(nextButton);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
    if (isDrawingCircleCenter && circleCenterDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      const localStart = toActivePoint(circleCenterDraftStart);
      const localPoint = toActivePoint(point);
      const centerX = localStart.x;
      const centerY = localStart.y;
      const dx = localPoint.x - centerX;
      const dy = localPoint.y - centerY;
      const r = Math.max(MIN_RESIZE_SIZE / 2, Math.sqrt(dx * dx + dy * dy));
      finishCircleDraft();
      isDrawingCircleCenter = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const nextCircle = {
        type: "circle",
        cx: snapValue(Math.round(centerX)),
        cy: snapValue(Math.round(centerY)),
        r: snapValue(Math.round(r)),
        fill: "#3a3f4b",
        stroke: "#ffffff",
        strokeWidth: 1
      };
      recordHistory();
      activeObjects.push(nextCircle);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
	    if (isDrawingRect && rectDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      const localStart = toActivePoint(rectDraftStart);
	      const localPoint = toActivePoint(point);
	      const x = Math.min(localStart.x, localPoint.x);
	      const y = Math.min(localStart.y, localPoint.y);
	      const w = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.x - localStart.x));
	      const h = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.y - localStart.y));
	      finishRectDraft();
	      isDrawingRect = false;
	      if (!currentScreenObj) return;
	      const activeObjects = ensureActiveObjects();
	      if (!activeObjects) return;
		      const nextRect = {
		        type: "rect",
		        x: snapValue(Math.round(x)),
		        y: snapValue(Math.round(y)),
		        w: snapValue(Math.round(w)),
		        h: snapValue(Math.round(h)),
		        rx: 0,
		        fill: "#3a3f4b",
		        stroke: "#ffffff",
		        strokeWidth: 1
		      };
	      recordHistory();
	      activeObjects.push(nextRect);
	      selectedIndices = [activeObjects.length - 1];
	      renderScreen();
	      syncEditorFromScreen();
	      setTool("select");
	      setDirty(true);
	      setEditorTab("properties");
	      return;
	    }
    if (isDrawingAlarmsPanel && rectDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      const localStart = toActivePoint(rectDraftStart);
      const localPoint = toActivePoint(point);
      const x = Math.min(localStart.x, localPoint.x);
      const y = Math.min(localStart.y, localPoint.y);
      const w = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.x - localStart.x));
      const h = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.y - localStart.y));
      finishRectDraft();
      isDrawingAlarmsPanel = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
	      const nextPanel = {
	        type: "alarms-panel",
	        x: snapValue(Math.round(x)),
	        y: snapValue(Math.round(y)),
	        w: snapValue(Math.round(w)),
	        h: snapValue(Math.round(h)),
	        rx: 0,
	        fill: "#ffffff",
	        stroke: "#000000",
	        strokeWidth: 1,
	        textColor: "#000000",
	        fontSize: 14,
	        maxRows: 8,
	        onlyUnacked: true,
	        showSource: true
	      };
      recordHistory();
      activeObjects.push(nextPanel);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
	    if (isDrawingRegularPolygon && regularPolygonDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      const localStart = toActivePoint(regularPolygonDraftStart);
	      const localPoint = toActivePoint(point);
	      const x = Math.min(localStart.x, localPoint.x);
	      const y = Math.min(localStart.y, localPoint.y);
	      const w = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.x - localStart.x));
	      const h = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.y - localStart.y));
	      finishRegularPolygonDraft();
	      isDrawingRegularPolygon = false;
	      if (!currentScreenObj) return;
	      const activeObjects = ensureActiveObjects();
	      if (!activeObjects) return;
	      const points = computeRegularPolygonPoints({ x, y, w, h }, regularPolygonSides, regularPolygonFitMode).map((pt) => ({
	        x: snapValue(Math.round(pt.x)),
	        y: snapValue(Math.round(pt.y))
	      }));
	      const nextPoly = { type: "polygon", points, fill: "#3a3f4b", stroke: "#ffffff", strokeWidth: 1 };
	      recordHistory();
	      activeObjects.push(nextPoly);
	      selectedIndices = [activeObjects.length - 1];
	      renderScreen();
	      syncEditorFromScreen();
	      setTool("select");
	      setDirty(true);
	      setEditorTab("properties");
	      return;
	    }
	    if (isDrawingBar && barDraftStart) {
	      const point = getScreenPoint(event);
	      if (!point) return;
	      const localStart = toActivePoint(barDraftStart);
	      const localPoint = toActivePoint(point);
      const x = Math.min(localStart.x, localPoint.x);
      const y = Math.min(localStart.y, localPoint.y);
      const w = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.x - localStart.x));
      const h = Math.max(MIN_RESIZE_SIZE, Math.abs(localPoint.y - localStart.y));
      finishBarDraft();
      isDrawingBar = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const nextBar = {
        type: "bar",
        x: snapValue(Math.round(x)),
        y: snapValue(Math.round(y)),
        w: snapValue(Math.round(w)),
        h: snapValue(Math.round(h)),
        orientation: "vertical",
        min: 0,
        max: 100,
        minBinding: { enabled: false },
        maxBinding: { enabled: false },
        fill: "#46ff64",
        background: "transparent",
        border: { enabled: true, color: "#ffffff", width: 1 },
        ticks: { enabled: false, major: 5, minor: 4, color: "#ffffff", width: 1 },
        bindValue: { connection_id: "", tag: "", multiplier: 1, digits: 7, decimals: 0 }
      };
      recordHistory();
      activeObjects.push(nextBar);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
    if (isDrawingCircle && circleDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      const localStart = toActivePoint(circleDraftStart);
      const localPoint = toActivePoint(point);
      const cx = (localStart.x + localPoint.x) / 2;
      const cy = (localStart.y + localPoint.y) / 2;
      const dx = localPoint.x - localStart.x;
      const dy = localPoint.y - localStart.y;
      const r = Math.max(MIN_RESIZE_SIZE / 2, Math.sqrt(dx * dx + dy * dy) / 2);
      finishCircleDraft();
      isDrawingCircle = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const nextCircle = {
        type: "circle",
        cx: snapValue(Math.round(cx)),
        cy: snapValue(Math.round(cy)),
        r: snapValue(Math.round(r)),
        fill: "#3a3f4b",
        stroke: "#ffffff",
        strokeWidth: 1
      };
      recordHistory();
      activeObjects.push(nextCircle);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
    if (isDrawingLine && lineDraftStart) {
      const point = getScreenPoint(event);
      if (!point) return;
      const startPoint = toActivePoint(lineDraftStart);
      const localPoint = toActivePoint(point);
      finishLineDraft();
      isDrawingLine = false;
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const nextLine = {
        type: "line",
        x1: snapValue(Math.round(startPoint.x)),
        y1: snapValue(Math.round(startPoint.y)),
        x2: snapValue(Math.round(localPoint.x)),
        y2: snapValue(Math.round(localPoint.y)),
        stroke: "#ffffff",
        strokeWidth: 2
      };
      recordHistory();
      activeObjects.push(nextLine);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setTool("select");
      setDirty(true);
      setEditorTab("properties");
      return;
    }
		    if (isResizing) {
		      isResizing = false;
		      resizeStart = null;
		      resizeStartBounds = null;
		      resizeHandle = null;
		      resizeIndex = null;
		      resizeVertexIndex = null;
		      resizeSelectionBase = [];
		      resizeSelectionBounds = null;
		      resizeSelectionHandle = null;
		      hmiSvg.style.cursor = "default";
		      return;
		    }
	    if (isRotating) {
	      isRotating = false;
	      rotateCenter = null;
	      rotateBase = [];
	      return;
	    }
	    if (isDragging) {
	      isDragging = false;
	      isDragPending = false;
	      dragStart = null;
	      dragOrigins = [];
      hmiSvg.style.cursor = "default";
      return;
    }
    if (isDragPending) {
      isDragPending = false;
      dragStart = null;
      dragOrigins = [];
      hmiSvg.style.cursor = "default";
      return;
    }
    if (!isSelecting || !selectionStart) return;
    const point = getScreenPoint(event);
    if (!point) return;
    const dx = Math.abs(point.x - selectionStart.x);
    const dy = Math.abs(point.y - selectionStart.y);
    const isClick = dx < 3 && dy < 3;

	    if (isClick) {
	      const hitMeta = getMetaAtPoint(point);
	      selectedIndices = hitMeta ? [hitMeta.index] : [];
	    } else {
      const box = {
        x: Math.min(selectionStart.x, point.x),
        y: Math.min(selectionStart.y, point.y),
        width: Math.abs(point.x - selectionStart.x),
        height: Math.abs(point.y - selectionStart.y)
      };
      const leftToRight = point.x >= selectionStart.x;
	      selectedIndices = renderedElementMeta.reduce((acc, item) => {
        const obj = getActiveObjects()?.[item.index];
        const baseBounds = item.bounds || getObjectBounds(obj);
        if (!baseBounds) return acc;
        const offset = item.bounds ? { x: 0, y: 0 } : getActiveOffset();
        const bbox = {
          x: Number(baseBounds.x ?? 0) + Number(offset.x ?? 0),
          y: Number(baseBounds.y ?? 0) + Number(offset.y ?? 0),
          width: Number(baseBounds.width ?? 0),
          height: Number(baseBounds.height ?? 0)
        };
        if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.y) || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
          return acc;
        }
        const match = leftToRight ? boxContains(box, bbox) : boxIntersects(box, bbox);
        if (match) acc.push(item.index);
        return acc;
	      }, []);
	    }
	    syncSelectedPolygonVertex();

	    if (selectionBox) selectionBox.style.display = "none";
	    isSelecting = false;
	    selectionStart = null;
	    updateSelectionOverlays();
    updatePropertiesPanel();
    hmiSvg.style.cursor = "default";
  };

  hmiSvg.addEventListener("mouseup", finishSelection);
  hmiSvg.addEventListener("mouseleave", finishSelection);

	  hmiSvg.addEventListener("dblclick", (event) => {
	    if (!isEditMode) return;
	    if (currentTool === "polyline" && isDrawingPolyline) {
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const points = polylineDraftPoints.map((pt) => {
        const local = toActivePoint(pt);
        return { x: snapValue(Math.round(local.x)), y: snapValue(Math.round(local.y)) };
      });
      if (points.length >= 2) {
        recordHistory();
        activeObjects.push({ type: "polyline", points, stroke: "#ffffff", strokeWidth: 2 });
        selectedIndices = [activeObjects.length - 1];
        renderScreen();
        syncEditorFromScreen();
        setDirty(true);
        setEditorTab("properties");
      }
      finishPolylineDraft();
      isDrawingPolyline = false;
      setTool("select");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (currentTool === "polygon" && isDrawingPolygon) {
      if (!currentScreenObj) return;
      const activeObjects = ensureActiveObjects();
      if (!activeObjects) return;
      const points = polygonDraftPoints.map((pt) => {
        const local = toActivePoint(pt);
        return { x: snapValue(Math.round(local.x)), y: snapValue(Math.round(local.y)) };
      });
      if (points.length >= 3) {
        recordHistory();
        activeObjects.push({ type: "polygon", points, fill: "#3a3f4b", stroke: "#ffffff", strokeWidth: 1 });
        selectedIndices = [activeObjects.length - 1];
        renderScreen();
        syncEditorFromScreen();
        setDirty(true);
        setEditorTab("properties");
      }
      finishPolygonDraft();
      isDrawingPolygon = false;
      setTool("select");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (currentTool !== "select") return;
    const point = getScreenPoint(event);
    if (!point) return;
    const hitMeta = getMetaAtPoint(point);
    const activeObjects = getActiveObjects();
    const hitObj = hitMeta ? activeObjects?.[hitMeta.index] : null;
    const selectedObj = selectedIndices.length === 1 ? activeObjects?.[selectedIndices[0]] : null;
    const groupObj = (hitObj?.type === "group") ? hitObj : (selectedObj?.type === "group" ? selectedObj : null);
    if (!groupObj) return;
	    enterGroupEdit(groupObj);
	    event.preventDefault();
	  });

	  hmiSvg.addEventListener("contextmenu", (event) => {
	    if (!isEditMode) return;
	    if (currentTool !== "polyline" && currentTool !== "polygon") return;
	    if (currentTool === "polyline" && !isDrawingPolyline) return;
	    if (currentTool === "polygon" && !isDrawingPolygon) return;
	    event.preventDefault();
	    if (!currentScreenObj) return;
	    const activeObjects = ensureActiveObjects();
	    if (!activeObjects) return;
	    if (currentTool === "polyline") {
	      const points = polylineDraftPoints.map((pt) => {
	        const local = toActivePoint(pt);
	        return { x: snapValue(Math.round(local.x)), y: snapValue(Math.round(local.y)) };
	      });
	      if (points.length >= 2) {
	        recordHistory();
	        activeObjects.push({ type: "polyline", points, stroke: "#ffffff", strokeWidth: 2 });
	        selectedIndices = [activeObjects.length - 1];
	        renderScreen();
	        syncEditorFromScreen();
	        setDirty(true);
	        setEditorTab("properties");
	      }
	      finishPolylineDraft();
	      isDrawingPolyline = false;
	      setTool("select");
	      return;
	    }
	    const points = polygonDraftPoints.map((pt) => {
	      const local = toActivePoint(pt);
	      return { x: snapValue(Math.round(local.x)), y: snapValue(Math.round(local.y)) };
	    });
	    if (points.length >= 3) {
	      recordHistory();
	      activeObjects.push({ type: "polygon", points, fill: "#3a3f4b", stroke: "#ffffff", strokeWidth: 1 });
	      selectedIndices = [activeObjects.length - 1];
	      renderScreen();
	      syncEditorFromScreen();
	      setDirty(true);
	      setEditorTab("properties");
	    }
	    finishPolygonDraft();
	    isDrawingPolygon = false;
	    setTool("select");
	  });
	}

if (textToolBtn) {
  textToolBtn.addEventListener("click", () => {
    setTool(currentTool === "text" ? "select" : "text");
  });
}

if (buttonToolBtn) {
  buttonToolBtn.addEventListener("click", () => {
    setTool(currentTool === "button" ? "select" : "button");
  });
}

if (rectToolBtn) {
  rectToolBtn.addEventListener("click", () => {
    setTool(currentTool === "rect" ? "select" : "rect");
  });
}

if (alarmsPanelToolBtn) {
  alarmsPanelToolBtn.addEventListener("click", () => {
    setTool(currentTool === "alarms-panel" ? "select" : "alarms-panel");
  });
}

if (barToolBtn) {
  barToolBtn.addEventListener("click", () => {
    setTool(currentTool === "bar" ? "select" : "bar");
  });
}

if (circleToolBtn) {
  circleToolBtn.addEventListener("click", () => {
    setTool(currentTool === "circle" ? "select" : "circle");
  });
}

if (circleCenterToolBtn) {
  circleCenterToolBtn.addEventListener("click", () => {
    setTool(currentTool === "circle-center" ? "select" : "circle-center");
  });
}

if (lineToolBtn) {
  lineToolBtn.addEventListener("click", () => {
    setTool(currentTool === "line" ? "select" : "line");
  });
}

if (curveToolBtn) {
  curveToolBtn.addEventListener("click", () => {
    setTool(currentTool === "curve" ? "select" : "curve");
  });
}

if (polylineToolBtn) {
  polylineToolBtn.addEventListener("click", () => {
    setTool(currentTool === "polyline" ? "select" : "polyline");
  });
}

if (polygonToolBtn) {
  polygonToolBtn.addEventListener("click", () => {
    setTool(currentTool === "polygon" ? "select" : "polygon");
  });
}

if (regularPolygonToolBtn) {
  regularPolygonToolBtn.addEventListener("click", () => {
    if (currentTool === "regular-polygon") {
      setTool("select");
      return;
    }
    const raw = window.prompt("Regular polygon sides (3-64):", String(regularPolygonSides));
    if (raw == null) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    regularPolygonSides = Math.max(3, Math.min(64, Math.round(parsed)));
    regularPolygonFitMode = "inscribed";
    setTool("regular-polygon");
  });
}

if (stretchedPolygonToolBtn) {
  stretchedPolygonToolBtn.addEventListener("click", () => {
    if (currentTool === "stretched-polygon") {
      setTool("select");
      return;
    }
    const raw = window.prompt("Stretched polygon sides (3-64):", String(regularPolygonSides));
    if (raw == null) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    regularPolygonSides = Math.max(3, Math.min(64, Math.round(parsed)));
    regularPolygonFitMode = "stretched";
    setTool("stretched-polygon");
  });
}

if (navToolBtn) {
  navToolBtn.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/plain", "nav-button");
    event.dataTransfer?.setData("application/x-opcbridge-hmi", "nav-button");
    event.dataTransfer?.setDragImage(navToolBtn, 10, 10);
  });
}

if (numberInputToolBtn) {
  numberInputToolBtn.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/plain", "number-input");
    event.dataTransfer?.setData("application/x-opcbridge-hmi", "number-input");
    event.dataTransfer?.setDragImage(numberInputToolBtn, 10, 10);
  });
}

if (indicatorToolBtn) {
  indicatorToolBtn.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/plain", "indicator");
    event.dataTransfer?.setData("application/x-opcbridge-hmi", "indicator");
    event.dataTransfer?.setDragImage(indicatorToolBtn, 10, 10);
  });
}

if (viewportToolBtn) {
  viewportToolBtn.addEventListener("click", () => {
    setTool(currentTool === "viewport" ? "select" : "viewport");
  });
}

if (hmiSvg) {
  let momentaryPress = null;

  hmiSvg.addEventListener("dragover", (event) => {
    if (!isEditMode) return;
    event.preventDefault();
  });

	  hmiSvg.addEventListener("drop", (event) => {
	    if (!isEditMode) return;
	    event.preventDefault();
	    const kind = event.dataTransfer?.getData("application/x-opcbridge-hmi")
	      || event.dataTransfer?.getData("text/plain");
	    const isImageDrop = typeof kind === "string" && kind.startsWith("image:");
	    if (kind !== "nav-button" && kind !== "number-input" && kind !== "indicator" && !isImageDrop) return;
	    if (!currentScreenObj) return;
	    const activeObjects = ensureActiveObjects();
	    if (!activeObjects) return;
	    const point = getScreenPoint(event);
	    if (!point) return;
	    const localPoint = toActivePoint(point);
	    const x = Math.round(localPoint.x);
	    const y = Math.round(localPoint.y);
      const imageName = isImageDrop ? kind.slice("image:".length).trim() : "";
	      const nextObj = kind === "number-input"
	        ? {
	          type: "number-input",
	          id: createNumberInputId(),
	          x,
	          y,
	          w: 140,
	          h: 36,
	          rx: 0,
	          fill: "#2b2f3a",
	          stroke: "#ffffff",
	          strokeWidth: 1,
	          textColor: "#ffffff",
          fontSize: 16,
          bindValue: { connection_id: "", tag: "", multiplier: 1, digits: 7, decimals: 0 }
          }
	        : kind === "indicator"
	          ? {
	            type: "indicator",
	            id: createIndicatorId(),
	            x,
	            y,
	            w: 160,
	            h: 64,
	            rx: 0,
	            shadow: false,
	            fill: "#3a3f4b",
	            stroke: "#ffffff",
	            strokeWidth: 1,
            textColor: "#ffffff",
            fontSize: 16,
            bindValue: { connection_id: "", tag: "" },
            stateMode: "equals",
            labelOverlay: true,
            labelValign: "middle",
            states: [
              { value: 0, label: "Off", color: "#333333", image: "" },
              { value: 1, label: "On", color: "#008C3C", image: "" }
            ]
          }
          : isImageDrop
            ? {
              type: "image",
              x,
              y,
              w: 120,
              h: 120,
              src: imageName
            }
	          : {
	            type: "button",
	            x,
	            y,
	            w: 160,
	            h: 48,
	            rx: 0,
	            label: "Button",
	            fill: "#2b2f3a",
	            stroke: "#ffffff",
	            strokeWidth: 1,
	            textColor: "#ffffff",
            action: {
              type: "navigate",
              screenId: availableScreens[0]?.id || DEFAULT_SCREEN_ID
            }
          };
      recordHistory();
      activeObjects.push(nextObj);
      selectedIndices = [activeObjects.length - 1];
      renderScreen();
      syncEditorFromScreen();
      setDirty(true);
      setEditorTab("properties");
	  });

		  const releaseMomentary = async (pointerId) => {
		    if (!momentaryPress) return;
		    if (isViewOnlyRuntime()) {
		      momentaryPress = null;
		      return;
		    }
	    if (pointerId != null && momentaryPress.pointerId !== pointerId) return;
	    const { action } = momentaryPress;
	    momentaryPress = null;
	    try {
      await apiWriteTag({ connection_id: action.connection_id, tag: action.tag, value: action.offValue });
    } catch (error) {
      console.error("[momentary-write] release failed:", error);
    }
  };

		  hmiSvg.addEventListener("pointerdown", async (event) => {
		    if (isEditMode) return;
		    if (isViewOnlyRuntime()) return;
		    const point = getScreenPoint(event);
		    if (!point) return;
	    const hitMeta = getMetaAtPoint(point);
	    if (!hitMeta) return;
    const obj = getObjectFromMeta(hitMeta);
    if (obj?.type !== "button" || obj?.action?.type !== "momentary-write") return;
    const action = obj.action || {};
    momentaryPress = { pointerId: event.pointerId, action };
    try {
      await apiWriteTag({ connection_id: action.connection_id, tag: action.tag, value: action.onValue });
    } catch (error) {
      console.error("[momentary-write] press failed:", error);
    }
  });

  hmiSvg.addEventListener("pointerup", (event) => {
    if (isEditMode) return;
    releaseMomentary(event.pointerId);
  });

  hmiSvg.addEventListener("pointercancel", (event) => {
    if (isEditMode) return;
    releaseMomentary(event.pointerId);
  });

  hmiSvg.addEventListener("pointerleave", () => {
    if (isEditMode) return;
    setGroupHotspotHover(null);
    hmiSvg.style.cursor = "default";
    releaseMomentary(null);
  });

	  hmiSvg.addEventListener("click", (event) => {
	    if (!isEditMode) {
	      const point = getScreenPoint(event);
	      if (!point) return;
        if (!(event.target instanceof HTMLInputElement)) {
          const hotspot = findRuntimeGroupHotspot(point);
	          if (hotspot) {
	            const action = hotspot.obj.action || {};
	            if (action.type === "navigate") {
	              runtimeNavigateTo(action.screenId);
	              return;
	            }
	            if (action.type === "load-viewport") {
	              loadViewportTarget(action.viewportId, action.screenId);
	              return;
	            }
            if (action.type === "popup") {
              openPopup(action.screenId);
              return;
            }
          }
        }
		      const hitMeta = getMetaAtPoint(point);
		      if (!hitMeta) return;
		      const obj = getObjectFromMeta(hitMeta);
		      const writesDisabled = isViewOnlyRuntime();
		      if (obj?.type === "button" && obj?.action?.type === "momentary-write") {
		        return;
		      }
      if (obj?.type === "button" && obj?.action?.type === "navigate") {
        const isViewportChildNavigate =
          hitMeta?.type === "viewport" &&
          Array.isArray(hitMeta?.viewportChildPath) &&
          hitMeta.viewportChildPath.length > 0;
	        if (isViewportChildNavigate) {
	          const viewportObj = currentScreenObj?.objects?.[hitMeta.index];
	          const viewportId = viewportObj?.type === "viewport" ? viewportObj?.id : null;
	          if (viewportId) {
	            loadViewportTarget(viewportId, obj.action.screenId);
	            return;
	          }
	        }
	        runtimeNavigateTo(obj.action.screenId);
	      }
	      if (obj?.type === "button" && obj?.action?.type === "load-viewport") {
	        loadViewportTarget(obj.action.viewportId, obj.action.screenId);
	      }
	      if (obj?.type === "button" && obj?.action?.type === "popup") {
	        openPopup(obj.action.screenId);
	      }
	      if (obj?.type === "button" && obj?.action?.type === "history-back") {
	        runtimeGoBack();
	      }
	      if (obj?.type === "button" && obj?.action?.type === "history-forward") {
	        runtimeGoForward();
	      }
		      if (obj?.type === "button" && obj?.action?.type === "toggle-write") {
		        if (writesDisabled) return;
		        runToggleWriteAction(obj.action).catch((error) => {
		          console.error("[toggle-write] failed:", error);
	        });
	      }
	      if (obj?.type === "button" && obj?.action?.type === "set-write") {
	        if (writesDisabled) return;
	        runSetWriteAction(obj.action).catch((error) => {
	          console.error("[set-write] failed:", error);
	        });
	      }
	      if (obj?.type === "button" && obj?.action?.type === "prompt-write") {
	        if (writesDisabled) return;
	        openSetpointPrompt(obj.action, obj.label || "Setpoint");
	      }
	      return;
	    }
    if (!isEditMode) return;
    if (!currentScreenObj) return;
    const activeObjects = ensureActiveObjects();
    if (!activeObjects) return;
    const point = getScreenPoint(event);
    if (!point) return;
    const localPoint = toActivePoint(point);
    const x = Math.round(localPoint.x);
    const y = Math.round(localPoint.y);

    if (currentTool !== "text") return;
    const nextText = {
      type: "text",
      x,
      y,
      text: "New Text",
      fontSize: 18,
      fill: "#ffffff"
    };
    recordHistory();
    activeObjects.push(nextText);
    selectedIndices = [activeObjects.length - 1];
    renderScreen();
    syncEditorFromScreen();
    setTool("select");
    setDirty(true);
    setEditorTab("properties");
  });
}
