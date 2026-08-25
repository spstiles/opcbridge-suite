#!/usr/bin/env node
/* opcbridge-scada: SCADA console / control center (no external deps)

Goals:
- Desktop-like UX in the browser.
- Never expose admin/write tokens to the browser.
- Talk to opcbridge and optional modules only via their public APIs.
*/

const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

const CONFIG_PATH = process.env.OPCBRIDGE_SCADA_CONFIG || path.join(ROOT, 'config.json');

const SECRETS_PATH = process.env.OPCBRIDGE_SCADA_SECRETS || path.join(ROOT, 'config.secrets.json');

function readVersionFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const cleaned = String(raw || '').trim();
    return cleaned || 'dev';
  } catch {
    return 'dev';
  }
}

const SUITE_VERSION = readVersionFile(path.join(ROOT, '..', 'VERSION'));
const COMPONENT_VERSION = readVersionFile(path.join(ROOT, 'VERSION'));

function readSecretsFile() {
  try {
    const raw = fs.readFileSync(SECRETS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

const SECRETS = readSecretsFile();

const ADMIN_TOKEN = String(
  process.env.OPCBRIDGE_SCADA_ADMIN_TOKEN ||
  process.env.OPCBRIDGE_ADMIN_SERVICE_TOKEN ||
  SECRETS.admin_token ||
  ''
).trim();

const WRITE_TOKEN = String(
  process.env.OPCBRIDGE_SCADA_WRITE_TOKEN ||
  process.env.OPCBRIDGE_WRITE_TOKEN ||
  SECRETS.write_token ||
  ''
).trim();

// Security disabled: allow SCADA config updates from any client.
const ALLOW_REMOTE_SCADA_CONFIG = true;

const UI_USER = String(process.env.OPCBRIDGE_SCADA_UI_USER || SECRETS.ui_user || 'admin').trim();
const UI_PASSWORD = String(process.env.OPCBRIDGE_SCADA_UI_PASSWORD || SECRETS.ui_password || '').trim();
// Security disabled: SCADA UI does not require authentication.
const UI_AUTH_ENABLED = false;

const SYSTEMD_ENABLED = String(process.env.OPCBRIDGE_SCADA_SYSTEMD || 'true').trim().toLowerCase() === 'true';
const SYSTEMD_UNIT = String(process.env.OPCBRIDGE_SCADA_SYSTEMD_UNIT || 'opcbridge.service').trim();
const ALARMS_SYSTEMD_UNIT = String(process.env.OPCBRIDGE_ALARMS_SYSTEMD_UNIT || 'opcbridge-alarms.service').trim();
const SYSTEMD_DROPIN_DIR = String(
  process.env.OPCBRIDGE_SCADA_SYSTEMD_DROPIN_DIR ||
  path.join('/etc/systemd/system', `${SYSTEMD_UNIT}.d`)
).trim();
const SYSTEMD_DROPIN_NAME = String(process.env.OPCBRIDGE_SCADA_SYSTEMD_DROPIN_NAME || '20-opcbridge-scada.conf').trim();
const SYSTEMD_DROPIN_PATH = path.join(SYSTEMD_DROPIN_DIR, SYSTEMD_DROPIN_NAME);

function preferLoggerPath(loggerPath, legacyReporterPath) {
  return fs.existsSync(loggerPath) || !fs.existsSync(legacyReporterPath) ? loggerPath : legacyReporterPath;
}

const REPORTER_CONFIG_PATH = String(
  process.env.OPCBRIDGE_LOGGER_CONFIG ||
  process.env.OPCBRIDGE_REPORTER_CONFIG ||
  preferLoggerPath('/etc/opcbridge/logger/config.json', '/etc/opcbridge/reporter/config.json')
).trim();
const REPORTER_CONFIG_EXAMPLE_PATH = `${REPORTER_CONFIG_PATH}.example`;

const REPORTER_DATABASES_PATH = String(
  process.env.OPCBRIDGE_LOGGER_DATABASES ||
  process.env.OPCBRIDGE_REPORTER_DATABASES ||
  preferLoggerPath('/etc/opcbridge/logger/databases.json', '/etc/opcbridge/reporter/databases.json')
).trim();

function detectReporterCapabilities() {
  const caps = {
    odbc: { available: false, drivers: [] }
  };

  // Basic ODBC detection: unixODBC tools and library presence.
  try {
    const hasOdbcinst = fs.existsSync('/usr/bin/odbcinst') || fs.existsSync('/bin/odbcinst');
    const hasIsql = fs.existsSync('/usr/bin/isql') || fs.existsSync('/bin/isql');
    caps.odbc.available = Boolean(hasOdbcinst || hasIsql);

    if (caps.odbc.available && hasOdbcinst) {
      const r = child_process.spawnSync('odbcinst', ['-q', '-d'], { encoding: 'utf8' });
      if (r.status === 0) {
        const lines = String(r.stdout || '')
          .split(/\r?\n/g)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.replace(/^\[|\]$/g, ''));
        caps.odbc.drivers = Array.from(new Set(lines));
      }
    }
  } catch {
    // ignore
  }

  return caps;
}

function listNetworkInterfaces() {
  const raw = os.networkInterfaces();
  const rows = [];
  Object.entries(raw || {}).forEach(([name, addresses]) => {
    const ifaceName = String(name || '').trim();
    if (!ifaceName) return;
    const ipv4 = [];
    const ipv6 = [];
    let hasNonInternal = false;
    (Array.isArray(addresses) ? addresses : []).forEach((addr) => {
      if (!addr || typeof addr !== 'object') return;
      const family = String(addr.family || '').toUpperCase();
      const address = String(addr.address || '').trim();
      if (!address) return;
      if (!addr.internal) hasNonInternal = true;
      if (family === 'IPV4') ipv4.push(address);
      else if (family === 'IPV6') ipv6.push(address);
    });
    if (!hasNonInternal) return;
    rows.push({
      name: ifaceName,
      ipv4: Array.from(new Set(ipv4)),
      ipv6: Array.from(new Set(ipv6))
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  return rows;
}

const REPORTER_CAPABILITIES = detectReporterCapabilities();

const REPORTER_REPORTS_PATH = String(
  process.env.OPCBRIDGE_LOGGER_REPORTS ||
  process.env.OPCBRIDGE_REPORTER_REPORTS ||
  preferLoggerPath('/etc/opcbridge/logger/reports.json', '/etc/opcbridge/reporter/reports.json')
).trim();

const REPORTER_DATA_CHECKS_PATH = String(
  process.env.OPCBRIDGE_LOGGER_DATA_CHECKS ||
  process.env.OPCBRIDGE_REPORTER_DATA_CHECKS ||
  preferLoggerPath('/etc/opcbridge/logger/data_checks.json', '/etc/opcbridge/reporter/data_checks.json')
).trim();

const REPORTER_SYNC_JOBS_PATH = String(
  process.env.OPCBRIDGE_LOGGER_SYNC_JOBS ||
  preferLoggerPath('/etc/opcbridge/logger/database_sync.json', '/etc/opcbridge/reporter/database_sync.json')
).trim();

const REPORTER_REPORTS_DIR = String(
  process.env.OPCBRIDGE_LOGGER_REPORTS_DIR ||
  process.env.OPCBRIDGE_REPORTER_REPORTS_DIR ||
  preferLoggerPath('/etc/opcbridge/logger/reports', '/etc/opcbridge/reporter/reports')
).trim();

const REPORTER_BIN = String(
  process.env.OPCBRIDGE_LOGGER_BIN ||
  process.env.OPCBRIDGE_REPORTER_BIN ||
  preferLoggerPath('/opt/opcbridge-suite/bin/opcbridge-logger', '/opt/opcbridge-suite/bin/opcbridge-reporter')
).trim();

const REPORTER_API_HOST = String(process.env.OPCBRIDGE_LOGGER_API_HOST || process.env.OPCBRIDGE_REPORTER_API_HOST || '127.0.0.1').trim();
const REPORTER_API_PORT = Math.trunc(Number(process.env.OPCBRIDGE_LOGGER_API_PORT || process.env.OPCBRIDGE_REPORTER_API_PORT || 8095) || 8095);
const HISTORIAN_API_HOST = String(process.env.OPCBRIDGE_HISTORIAN_API_HOST || '127.0.0.1').trim();
const HISTORIAN_API_PORT = Math.trunc(Number(process.env.OPCBRIDGE_HISTORIAN_API_PORT || 8096) || 8096);
const FLOW_API_HOST = String(process.env.OPCBRIDGE_FLOW_API_HOST || '127.0.0.1').trim();
const FLOW_API_PORT = Math.trunc(Number(process.env.OPCBRIDGE_FLOW_API_PORT || 8098) || 8098);
const HISTORIAN_CONFIG_PATH = String(
  process.env.OPCBRIDGE_HISTORIAN_CONFIG ||
  '/etc/opcbridge/historian/config.json'
).trim();
const HISTORIAN_CONFIG_EXAMPLE_PATH = `${HISTORIAN_CONFIG_PATH}.example`;
const HISTORIAN_SYSTEMD_UNIT = String(process.env.OPCBRIDGE_HISTORIAN_SYSTEMD_UNIT || 'opcbridge-historian.service').trim();

const REPORT_DEFINITIONS_PATH = String(
  process.env.OPCBRIDGE_REPORT_DEFINITIONS ||
  preferLoggerPath('/etc/opcbridge/report/reports.json', path.join(ROOT, '..', 'opcbridge-report', 'reports.json.example'))
).trim();
const REPORT_DATA_SOURCES_PATH = String(
  process.env.OPCBRIDGE_REPORT_DATA_SOURCES || '/etc/opcbridge/report/data_sources.json'
).trim();
const REPORT_TEMPLATE_DIR = String(
  process.env.OPCBRIDGE_REPORT_TEMPLATE_DIR || '/var/lib/opcbridge/report/templates'
).trim();
const REPORT_BIN = String(
  process.env.OPCBRIDGE_REPORT_BIN ||
  preferLoggerPath('/opt/opcbridge-suite/bin/opcbridge-report', path.join(ROOT, '..', 'opcbridge-report', 'opcbridge-report'))
).trim();
const REPORT_HISTORIAN_URL = String(
  process.env.OPCBRIDGE_REPORT_HISTORIAN_URL ||
  `http://${HISTORIAN_API_HOST}:${HISTORIAN_API_PORT}`
).trim();
const REPORT_LOGGER_URL = String(
  process.env.OPCBRIDGE_REPORT_LOGGER_URL ||
  `http://${REPORTER_API_HOST}:${REPORTER_API_PORT}`
).trim();
const REPORT_TEMPLATE_PREVIEW_CACHE = new Map();
const DATA_ENTRY_DEFINITIONS_PATH = String(
  process.env.OPCBRIDGE_DATA_ENTRY_DEFINITIONS || '/etc/opcbridge/data-entry/forms.json'
).trim();
const DATA_ENTRY_AUDIT_PATH = String(process.env.OPCBRIDGE_DATA_ENTRY_AUDIT || '/var/lib/opcbridge/data-entry/audit.jsonl').trim();

const SYSTEMD_UNITS_DIR = String(process.env.OPCBRIDGE_SCADA_SYSTEMD_UNITS_DIR || '/etc/systemd/system').trim();

const SUITE_PREFIX = String(process.env.OPCBRIDGE_SUITE_PREFIX || '/opt/opcbridge-suite').trim();
const SUITE_SERVICE_USER = String(process.env.OPCBRIDGE_SERVICE_USER || 'opcbridge').trim();
const SUITE_SERVICE_GROUP = String(process.env.OPCBRIDGE_SERVICE_GROUP || SUITE_SERVICE_USER).trim();

const DEFAULT_OPCBRIDGE_BIN = String(process.env.OPCBRIDGE_SCADA_OPCBRIDGE_BIN || '/opt/opcbridge-suite/bin/opcbridge').trim();
const DEFAULT_OPCBRIDGE_CONFIG_DIR = String(process.env.OPCBRIDGE_SCADA_OPCBRIDGE_CONFIG_DIR || '/etc/opcbridge').trim();
const HMI_ROOT = String(process.env.OPCBRIDGE_HMI_ROOT || path.join(SUITE_PREFIX, 'hmi')).trim();
const PROJECT_BACKUP_MAX_FILE_BYTES = Number(process.env.OPCBRIDGE_PROJECT_BACKUP_MAX_FILE_BYTES || 80 * 1024 * 1024);
const PROJECT_BACKUP_MAX_TOTAL_BYTES = Number(process.env.OPCBRIDGE_PROJECT_BACKUP_MAX_TOTAL_BYTES || 250 * 1024 * 1024);
const OPCBRIDGE_ALARMS_DB_PATH = String(process.env.OPCBRIDGE_ALARMS_DB_PATH || '/var/lib/opcbridge/alarms.db').trim();
const OPCBRIDGE_ENV_PATH = String(process.env.OPCBRIDGE_ENV_PATH || '/etc/opcbridge/opcbridge.env').trim();

const defaultConfig = {
  listen: { host: '0.0.0.0', port: 3010 },
  refresh_ms: 2000,
  opcbridge: { scheme: 'http', host: '127.0.0.1', port: 8080 },
  alarms: { scheme: 'http', host: '127.0.0.1', port: 8085 },
  hmi: { scheme: 'http', host: '127.0.0.1', port: 3000 },
  channels: [],
  device_assignments: {}
};

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultConfig,
      ...parsed,
      listen: { ...defaultConfig.listen, ...(parsed.listen || {}) },
      opcbridge: { ...defaultConfig.opcbridge, ...(parsed.opcbridge || {}) },
      alarms: { ...defaultConfig.alarms, ...(parsed.alarms || {}) },
      hmi: { ...defaultConfig.hmi, ...(parsed.hmi || {}) }
    };
  } catch {
    return defaultConfig;
  }
}

function normalizePort(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const p = Math.trunc(n);
  if (p < 1 || p > 65535) return fallback;
  return p;
}

function normalizeScheme(value, fallback) {
  const s = String(value || '').toLowerCase().trim();
  if (s === 'http' || s === 'https') return s;
  return fallback;
}

function normalizeHost(value, fallback) {
  const s = String(value || '').trim();
  return s || fallback;
}


function normalizeDeviceAssignments(value) {
  const obj = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k || '').trim();
    const val = String(v || '').trim();
    if (!key || !val) continue;
    out[key] = val;
  }
  return out;
}

function normalizeChannels(value) {
  const arr = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();

  arr.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const name = String(raw.name || raw.id || '').trim();
    if (!name) return;

    let id = String(raw.id || '').trim();
    if (!id) {
      id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    if (!id) return;
    if (seen.has(id)) return;
    seen.add(id);

    const description = String(raw.description || '').trim();
    out.push({ id, name, description });
  });

  return out;
}

function normalizeRefreshMs(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const ms = Math.trunc(n);
  if (ms < 250) return 250;
  if (ms > 30000) return 30000;
  return ms;
}

function normalizeScadaConfig(input) {
  const base = readConfig();
  const next = {
    ...base,
    ...input,
    listen: { ...base.listen, ...((input && input.listen) || {}) },
    opcbridge: { ...base.opcbridge, ...((input && input.opcbridge) || {}) },
    alarms: { ...base.alarms, ...((input && input.alarms) || {}) },
    hmi: { ...base.hmi, ...((input && input.hmi) || {}) }
  };

  next.listen.host = normalizeHost(next.listen.host, base.listen.host);
  next.listen.port = normalizePort(next.listen.port, base.listen.port);
  next.refresh_ms = normalizeRefreshMs(next.refresh_ms, base.refresh_ms);

  next.opcbridge.scheme = normalizeScheme(next.opcbridge.scheme, base.opcbridge.scheme);
  next.opcbridge.host = normalizeHost(next.opcbridge.host, base.opcbridge.host);
  next.opcbridge.port = normalizePort(next.opcbridge.port, base.opcbridge.port);

  next.alarms.scheme = normalizeScheme(next.alarms.scheme, base.alarms.scheme);
  next.alarms.host = normalizeHost(next.alarms.host, base.alarms.host);
  next.alarms.port = normalizePort(next.alarms.port, base.alarms.port);

  next.hmi.scheme = normalizeScheme(next.hmi.scheme, base.hmi.scheme);
  next.hmi.host = normalizeHost(next.hmi.host, base.hmi.host);
  next.hmi.port = normalizePort(next.hmi.port, base.hmi.port);

  next.channels = normalizeChannels(next.channels);
  next.device_assignments = normalizeDeviceAssignments(next.device_assignments);

  return next;
}

function writeConfigFile(nextConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(nextConfig, null, 2) + '\n', 'utf8');
}

function send(res, status, headers, body) {
  const h = { ...(headers || {}) };
  if (!Object.keys(h).some((k) => String(k).toLowerCase() === 'permissions-policy')) {
    h['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
  }
  res.writeHead(status, h);
  res.end(body);
}

async function fetchOpcbridgeAuthStatus(req, cfg) {
  const { scheme, host, port } = cfg.opcbridge || {};
  const client = String(scheme || 'http') === 'https' ? https : http;

  const headers = { Accept: 'application/json' };
  if (req.headers['cookie']) headers['Cookie'] = String(req.headers['cookie']);

  const opts = {
    host,
    port,
    method: 'GET',
    path: '/auth/status',
    headers,
    timeout: 5000
  };

  return await new Promise((resolve, reject) => {
    const up = client.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(new Error(`OPCBridge /auth/status parse failed: ${err.message}`));
        }
      });
    });
    up.on('timeout', () => up.destroy(new Error('OPCBridge /auth/status timeout')));
    up.on('error', reject);
    up.end();
  });
}

function authStatusHasPerm(status, permId) {
  const want = String(permId || '').trim();
  if (!want) return false;
  const perms = status?.user?.permissions;
  if (!Array.isArray(perms)) return false;
  return perms.map((p) => String(p || '').trim()).includes(want);
}

function authStatusIsLoggedIn(status) {
  return Boolean(
    status?.user_logged_in ||
    status?.logged_in ||
    status?.user?.username ||
    status?.user?.id
  );
}

function authStatusGroups(status) {
  return Array.from(new Set(
    (Array.isArray(status?.user?.groups) ? status.user.groups : [])
      .map((group) => String(group || '').trim().toLowerCase())
      .filter(Boolean)
  ));
}

function authStatusUsername(status) {
  return String(status?.user?.username || status?.user?.id || '').trim();
}

function reportGrant(report, status) {
  if (authStatusHasPerm(status, 'reports.administer')) {
    return { view: true, download: true, edit: true, manage: true };
  }
  const username = authStatusUsername(status);
  if (username && username === String(report?.created_by || '').trim()) {
    return { view: true, download: true, edit: true, manage: true };
  }
  const groups = new Set(authStatusGroups(status));
  const grants = Array.isArray(report?.access) ? report.access : [];
  const matching = grants.filter((item) => groups.has(String(item?.group_id || '').trim().toLowerCase()));
  return {
    view: matching.some((grant) => grant?.view || grant?.download || grant?.edit || grant?.manage),
    download: matching.some((grant) => grant?.download || grant?.manage),
    edit: matching.some((grant) => grant?.edit || grant?.manage),
    manage: matching.some((grant) => grant?.manage)
  };
}

function canAccessReport(report, status, action) {
  if (!authStatusHasPerm(status, 'reports.access') &&
      !authStatusHasPerm(status, 'reports.create') &&
      !authStatusHasPerm(status, 'reports.administer')) return false;
  return Boolean(reportGrant(report, status)[action]);
}

function publicReport(report) {
  return {
    id: sanitizeId(report.id),
    name: String(report.name || report.id || '').trim(),
    description: String(report.description || '').trim(),
    published: report.published === true,
    hmi_enabled: report.hmi_enabled === true,
    period: String(report.period || 'month').trim(),
    week_start: String(report.week_start || 'sunday') === 'monday' ? 'monday' : 'sunday',
    interval_minutes: normalizeIntRange(report.interval_minutes, 60, 1, 60),
    group_by: String(report.group_by || 'day').trim(),
    timezone: String(report.timezone || 'UTC').trim(),
    published: report.published === true,
    formats: (Array.isArray(report.formats) ? report.formats : ['xlsx'])
      .map((format) => String(format || '').trim().toLowerCase())
      .filter((format) => ['xlsx', 'ods', 'csv'].includes(format))
  };
}

function reportTemplateFormat(template) {
  const explicit = String(template?.format || '').trim().toLowerCase();
  if (['xlsx', 'ods'].includes(explicit)) return explicit;
  const match = String(template?.filename || '').trim().toLowerCase().match(/\.(xlsx|ods)$/);
  return match ? match[1] : 'xlsx';
}

function reportTemplatePath(template) {
  return path.join(REPORT_TEMPLATE_DIR, `${String(template?.stored_id || '').trim().toLowerCase()}.${reportTemplateFormat(template)}`);
}

function reportTemplateContentType(template) {
  return reportTemplateFormat(template) === 'ods'
    ? 'application/vnd.oasis.opendocument.spreadsheet'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

function readReportDefinitions() {
  const root = readJsonFileOrNull(REPORT_DEFINITIONS_PATH) || { reports: [] };
  return Array.isArray(root?.reports) ? root.reports.filter((report) => report && typeof report === 'object') : [];
}

function readReportDataSources() {
  const root = readJsonFileOrNull(REPORT_DATA_SOURCES_PATH) || { sources: [] };
  return Array.isArray(root?.sources)
    ? root.sources.filter((source) => source && typeof source === 'object' && !Array.isArray(source)) : [];
}

function normalizeReportDataSource(source) {
  const value = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const id = sanitizeId(value.id || value.name);
  const name = String(value.name || '').trim().slice(0, 191);
  if (!id || !name) throw new Error('Data source name is required.');
  const databaseId = sanitizeId(value.database_id);
  const table = String(value.table || '').trim().slice(0, 255);
  const layout = String(value.layout || 'wide').trim() === 'category' ? 'category' : 'wide';
  const timeColumn = String(value.time_column || '').trim().slice(0, 255);
  const categoryColumn = String(value.category_column || '').trim().slice(0, 255);
  if (!databaseId || !table || !timeColumn) {
    throw new Error('Database connection, table, and date/time column are required.');
  }
  if (layout === 'category' && !categoryColumn) throw new Error('The item-name column is required.');
  const used = new Set();
  const valueFields = (Array.isArray(value.value_fields) ? value.value_fields : []).slice(0, 50).map((field, index) => {
    const column = String(field?.column || '').trim().slice(0, 255);
    const label = String(field?.label || column).trim().slice(0, 191);
    const type = String(field?.type || 'numeric').trim() === 'text' ? 'text' : 'numeric';
    if (!column || !label) throw new Error(`Value field ${index + 1} requires a label and database column.`);
    if (used.has(column)) throw new Error(`Value column '${column}' is listed more than once.`);
    used.add(column);
    return { column, label, type, default: normalizeBool(field?.default, false) };
  });
  if (!valueFields.length) throw new Error('At least one available value field is required.');
  if (!valueFields.some((field) => field.default)) valueFields[0].default = true;
  let foundDefault = false;
  valueFields.forEach((field) => { if (field.default && !foundDefault) foundDefault = true; else if (field.default) field.default = false; });
  return { id, name, description: String(value.description || '').trim().slice(0, 2000),
    database_id: databaseId, table, layout, time_column: timeColumn,
    category_column: layout === 'category' ? categoryColumn : '', value_fields: valueFields };
}

function readDataEntryDefinitions() {
  const root = readJsonFileOrNull(DATA_ENTRY_DEFINITIONS_PATH) || {};
  return { targets: Array.isArray(root?.targets) ? root.targets : [], forms: Array.isArray(root?.forms) ? root.forms : [] };
}

function readDataEntryForms() {
  const root = readDataEntryDefinitions();
  return Array.isArray(root?.forms) ? root.forms.filter((form) => form && typeof form === 'object') : [];
}

function readDataEntryTargets() { return readDataEntryDefinitions().targets.filter((target) => target && typeof target === 'object'); }

function normalizeDataEntryTarget(source) {
  const value = source && typeof source === 'object' ? source : {};
  const id = sanitizeId(value.id || value.name); const name = String(value.name || '').trim().slice(0, 200);
  if (!id || !name) throw new Error('Target name is required.');
  const required = (key, label) => { const result = String(value[key] || '').trim(); if (!result) throw new Error(`${label} is required.`); return result; };
  const recordTime = String(value.record_time || '08:00:00').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(recordTime)) throw new Error('Record time must use HH:MM:SS.');
  const allowed = new Set(['unused','record_datetime','record_epoch_ms','save_datetime','database_id','target_id','target_name','form_id','form_name','fixed','item_name','numeric_value','text_value','record_msec']);
  const usedRoles = new Set();
  const columns = (Array.isArray(value.columns) ? value.columns : []).map((entry) => {
    const column = String(entry?.column || '').trim(); const source = String(entry?.source || 'unused');
    if (!column || !allowed.has(source)) throw new Error('Every target field requires a valid source.');
    if (['record_datetime','record_epoch_ms','item_name','numeric_value','text_value','record_msec'].includes(source)) {
      if (usedRoles.has(source)) throw new Error(`Only one database field may use ${source}.`); usedRoles.add(source);
    }
    return { column, source, value: String(entry?.value ?? '').slice(0, 4000) };
  });
  if (!usedRoles.has('item_name')) throw new Error('One database field must be supplied by Item/tag name.');
  if (!usedRoles.has('record_datetime') && !usedRoles.has('record_epoch_ms')) throw new Error('One database field must be supplied by the operational date/time.');
  if (!usedRoles.has('numeric_value') && !usedRoles.has('text_value')) throw new Error('At least one entered-value database field is required.');
  return { id, name, description: String(value.description || '').trim().slice(0, 2000),
    database_id: required('database_id', 'Database connection'), table: required('table', 'Table'), record_time: recordTime,
    alternate_times: (Array.isArray(value.alternate_times) ? value.alternate_times : []).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 10), columns };
}

function normalizeDataEntryForm(source) {
  const value = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const id = sanitizeId(value.id || value.name);
  const name = String(value.name || '').trim().slice(0, 200);
  if (!id || !name) throw new Error('Form name is required.');
  const required = (key, label) => {
    const result = String(value[key] || '').trim();
    if (!result) throw new Error(`${label} is required.`);
    return result;
  };
  const targetId = sanitizeId(value.target_id); if (!targetId) throw new Error('Data entry target is required.');
  const usedIds = new Set();
  const fields = (Array.isArray(value.fields) ? value.fields : []).slice(0, 500).map((field, index) => {
    const item = String(field?.item || '').trim().slice(0, 500);
    const label = String(field?.label || item).trim().slice(0, 200);
    if (!item || !label) throw new Error(`Field ${index + 1} requires a label and item name.`);
    let fieldId = sanitizeId(field?.id || '');
    if (!fieldId || usedIds.has(fieldId)) fieldId = uniqueOpaqueId('field', usedIds);
    usedIds.add(fieldId);
    const valueType = String(field?.value_type || 'numeric') === 'text' ? 'text' : 'numeric';
    const min = field?.min === '' || field?.min == null ? null : Number(field.min);
    const max = field?.max === '' || field?.max == null ? null : Number(field.max);
    if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max)) || (min !== null && max !== null && max < min)) {
      throw new Error(`Field '${label}' has an invalid numeric range.`);
    }
    return { id: fieldId, label, item, value_type: valueType, unit: String(field?.unit || '').trim().slice(0, 50),
      precision: normalizeIntRange(field?.precision, 2, 0, 10), required: normalizeBool(field?.required, false), min, max };
  });
  return {
    id, name, description: String(value.description || '').trim().slice(0, 2000),
    target_id: targetId,
    allow_delete: normalizeBool(value.allow_delete, false), hmi_enabled: normalizeBool(value.hmi_enabled, false),
    require_login: normalizeBool(value.require_login, true), fields
  };
}

function dataEntryLoggerPayload(form, target, operation, body = {}) {
  const bySource = (source) => target.columns.find((entry) => entry.source === source)?.column || '';
  const insertValues = target.columns.filter((entry) => !['unused','record_datetime','record_epoch_ms','item_name','numeric_value','text_value','record_msec'].includes(entry.source)).map((entry) => {
    let value = entry.value || '';
    if (entry.source === 'database_id') value = target.database_id;
    else if (entry.source === 'target_id') value = target.id;
    else if (entry.source === 'target_name') value = target.name;
    else if (entry.source === 'form_id') value = form.id;
    else if (entry.source === 'form_name') value = form.name;
    return { column: entry.column, source: entry.source === 'save_datetime' ? 'save_datetime' : 'fixed', value };
  });
  return {
    operation, table: target.table, time_column: bySource('record_datetime') || bySource('record_epoch_ms'), time_storage: bySource('record_epoch_ms') ? 'epoch_ms' : 'datetime',
    item_column: bySource('item_name'), numeric_column: bySource('numeric_value'), text_column: bySource('text_value'), msec_column: bySource('record_msec'),
    record_date: String(body.record_date || ''), record_time: target.record_time,
    alternate_times: target.alternate_times || [], fields: form.fields.map((field) => ({ item: field.item })),
    insert_values: insertValues,
    ...(operation === 'save' ? { changes: body.changes || [] } : {})
  };
}

async function cachedReportTemplatePreview(report) {
  const template = report?.template;
  if (!template || template.enabled !== true) return null;
  const storedId = String(template.stored_id || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(storedId)) throw new Error('Enabled report template identifier is invalid.');
  const worksheet = String(report?.layout?.worksheet || 'Report').trim();
  const format = reportTemplateFormat(template);
  const cacheKey = `${storedId}\u001f${format}\u001f${worksheet}`;
  if (REPORT_TEMPLATE_PREVIEW_CACHE.has(cacheKey)) return REPORT_TEMPLATE_PREVIEW_CACHE.get(cacheKey);
  const templatePath = reportTemplatePath(template);
  if (!fs.existsSync(templatePath)) throw new Error('Enabled report template file was not found.');
  const result = await new Promise((resolve) => {
    child_process.execFile(REPORT_BIN, [
      'template-preview', '--template', templatePath, '--worksheet', worksheet
    ], { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
    (error, stdout, stderr) => resolve({ error, stdout, stderr }));
  });
  if (result.error) throw new Error(String(result.stderr || result.error.message || result.error).trim());
  const preview = JSON.parse(result.stdout);
  REPORT_TEMPLATE_PREVIEW_CACHE.set(cacheKey, preview);
  while (REPORT_TEMPLATE_PREVIEW_CACHE.size > 8) {
    REPORT_TEMPLATE_PREVIEW_CACHE.delete(REPORT_TEMPLATE_PREVIEW_CACHE.keys().next().value);
  }
  return preview;
}

async function addReportTemplatePreview(payload, report) {
  try {
    const preview = await cachedReportTemplatePreview(report);
    if (preview) payload.template_preview = preview;
  } catch (err) {
    payload.template_preview_error = String(err.message || err);
  }
  return payload;
}

function normalizeSpreadsheetColumn(value, fallback = '') {
  const column = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(column)) return fallback;
  const index = [...column].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
  return index >= 1 && index <= 16384 ? column : fallback;
}

function spreadsheetColumnNumber(value) {
  return [...normalizeSpreadsheetColumn(value)].reduce(
    (total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
}

function normalizeSpreadsheetCell(value, fallback = '') {
  const match = String(value || '').trim().toUpperCase().match(/^([A-Z]{1,3})([1-9][0-9]{0,6})$/);
  if (!match || !normalizeSpreadsheetColumn(match[1])) return fallback;
  const row = Number(match[2]);
  return row <= 1048576 ? `${match[1]}${row}` : fallback;
}

function normalizeSpreadsheetRange(value, fallback = '') {
  const pieces = String(value || '').trim().toUpperCase().split(':');
  if (pieces.length < 1 || pieces.length > 2) return fallback;
  const start = normalizeSpreadsheetCell(pieces[0]);
  const end = normalizeSpreadsheetCell(pieces[1] || pieces[0]);
  const parse = (cell) => {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    return match ? { column: spreadsheetColumnNumber(match[1]), row: Number(match[2]) } : null;
  };
  const a = parse(start); const b = parse(end);
  if (!a || !b || a.column > b.column || a.row > b.row) return fallback;
  return start === end ? start : `${start}:${end}`;
}

function normalizeReportDefinition(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const id = sanitizeId(source.id);
  const name = String(source.name || '').trim().slice(0, 191);
  if (!id || !name) throw new Error('Report id and name are required.');
  const timezone = String(source.timezone || 'UTC').trim().slice(0, 100) || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  const formats = Array.from(new Set(
    (Array.isArray(source.formats) ? source.formats : ['xlsx'])
      .map((format) => String(format || '').trim().toLowerCase())
      .filter((format) => ['xlsx', 'ods', 'csv'].includes(format))
  ));
  if (!formats.length) throw new Error('Select at least one output format.');
  const sourceInput = source.data_source && typeof source.data_source === 'object' ? source.data_source : { type: 'historian' };
  const sourceType = String(sourceInput.type || 'historian').trim().toLowerCase();
  if (!['historian', 'database'].includes(sourceType)) throw new Error(`Unsupported report data source: ${sourceType}`);
  const dataSource = sourceType === 'database' ? {
    type: 'database',
    source_id: sanitizeId(sourceInput.source_id),
    database_id: sanitizeId(sourceInput.database_id),
    table: String(sourceInput.table || '').trim().slice(0, 255),
    layout: String(sourceInput.layout || 'wide').trim() === 'category' ? 'category' : 'wide',
    time_column: String(sourceInput.time_column || '').trim().slice(0, 255),
    category_column: String(sourceInput.category_column || '').trim().slice(0, 255),
    value_column: String(sourceInput.value_column || '').trim().slice(0, 255)
  } : { type: 'historian' };
  const aggregations = new Set(['last', 'last_nonzero', 'first', 'change', 'avg', 'min', 'max', 'sum', 'count']);
  const rawColumns = (Array.isArray(source.columns) ? source.columns : []).slice(0, 100);
  const usedColumnIds = new Set();
  const columnIds = rawColumns.map((column) => {
    const requested = sanitizeId(column?.id || '').slice(0, 100);
    const id = requested && !usedColumnIds.has(requested)
      ? requested
      : uniqueOpaqueId('column', usedColumnIds);
    usedColumnIds.add(id);
    return id;
  });
  const columns = rawColumns.map((column, index) => {
    const item = column && typeof column === 'object' ? column : {};
    const itemSource = String(item.source || sourceType || 'historian').trim().toLowerCase();
    const common = {
      id: columnIds[index],
      heading: String(item.heading || `Column ${index + 1}`).trim().slice(0, 191) || `Column ${index + 1}`,
      visible: normalizeBool(item.visible, true),
      precision: normalizeIntRange(item.precision, 2, 0, 10),
      sheet_column: normalizeSpreadsheetColumn(item.sheet_column)
    };
    if (itemSource === 'calculated') {
      const expression = String(item.expression || '').trim().slice(0, 4000);
      if (!expression) throw new Error(`Calculated column ${index + 1} requires a formula.`);
      return { ...common, source: 'calculated', expression };
    }
    if (itemSource === 'database') {
      const databaseId = sanitizeId(item.database_id || dataSource.database_id);
      const table = String(item.table || dataSource.table || '').trim().slice(0, 255);
      const timeColumn = String(item.time_column || dataSource.time_column || '').trim().slice(0, 255);
      const layout = String(item.layout || dataSource.layout || 'wide').trim() === 'category' ? 'category' : 'wide';
      const categoryColumn = String(item.category_column || dataSource.category_column || '').trim().slice(0, 255);
      const field = String(item.field || dataSource.value_column || '').trim().slice(0, 255);
      const fieldType = String(item.field_type || 'numeric').trim() === 'text' ? 'text' : 'numeric';
      const companionField = String(item.companion_field || '').trim().slice(0, 255);
      const companionPosition = ['none', 'before', 'after', 'text_only'].includes(String(item.companion_position || 'none'))
        ? String(item.companion_position || 'none') : 'none';
      const companionSeparator = String(item.companion_separator ?? ' ').slice(0, 20);
      const aggregation = String(item.aggregation || 'last').trim().toLowerCase();
      const multiplierValue = Number(item.multiplier ?? 1);
      const multiplier = Number.isFinite(multiplierValue) ? multiplierValue : 1;
      const negativeChange = ['blank', 'reset', 'rollover'].includes(String(item.negative_change || 'blank'))
        ? String(item.negative_change || 'blank') : 'blank';
      const rolloverValue = Number(item.rollover_modulus ?? 65536);
      if (!databaseId || !table || !timeColumn || !field) {
        throw new Error(`Column ${index + 1} requires a database, table, date/time column, and value field.`);
      }
      if (layout === 'category' && !categoryColumn) {
        throw new Error(`Column ${index + 1} requires the column containing item names.`);
      }
      if (!aggregations.has(aggregation)) throw new Error(`Column ${index + 1} has an unsupported aggregation.`);
      return {
        ...common,
        heading: String(item.heading || item.category_value || field).trim().slice(0, 191) || field,
        source: 'database',
        database_id: databaseId,
        table,
        time_column: timeColumn,
        layout,
        field,
        field_type: fieldType,
        companion_field: companionField,
        companion_position: companionField ? companionPosition : 'none',
        companion_separator: companionSeparator,
        ...(layout === 'category' ? {
          category_column: categoryColumn,
          category_value: String(item.category_value ?? '').slice(0, 500)
        } : {}),
        aggregation,
        multiplier,
        negative_change: negativeChange,
        rollover_modulus: Number.isFinite(rolloverValue) && rolloverValue > 0 ? rolloverValue : 65536,
        precision: common.precision
      };
    }
    if (itemSource !== 'historian') throw new Error(`Column ${index + 1} has an unsupported source.`);
    const connectionId = String(item.connection_id || '').trim().slice(0, 255);
    const tagName = String(item.tag_name || '').trim().slice(0, 500);
    if (!connectionId || !tagName) throw new Error(`Column ${index + 1} requires a historian connection and tag.`);
    return {
      ...common,
      heading: String(item.heading || tagName).trim().slice(0, 191) || tagName,
      source: 'historian',
      connection_id: connectionId,
      tag_name: tagName,
      aggregation: 'last',
      multiplier: Number.isFinite(Number(item.multiplier ?? 1)) ? Number(item.multiplier ?? 1) : 1,
      precision: common.precision
    };
  });
  if (!columns.length) throw new Error('Add at least one report column.');
  if (!columns.some((column) => column.visible !== false)) {
    throw new Error('At least one report column must be shown.');
  }
  const summaryCalculations = new Set(['none', 'sum', 'avg', 'min', 'max', 'first', 'last', 'count', 'missing', 'formula']);
  const summaries = (Array.isArray(source.summaries) ? source.summaries : []).slice(0, 20).map((summary, index) => {
    const item = summary && typeof summary === 'object' ? summary : {};
    const label = String(item.label || '').trim().slice(0, 191);
    if (!label) throw new Error(`Summary row ${index + 1} requires a label.`);
    const calculations = columns.map((_, columnIndex) => {
      const calculation = String(item.calculations?.[columnIndex] || 'none').trim().toLowerCase();
      return summaryCalculations.has(calculation) ? calculation : 'none';
    });
    const formulas = columns.map((_, columnIndex) =>
      String(item.formulas?.[columnIndex] || '').trim().slice(0, 4000));
    const precisions = columns.map((_, columnIndex) => {
      const value = item.precisions?.[columnIndex];
      if (value === null || value === undefined || value === '') return null;
      return normalizeIntRange(value, columns[columnIndex].precision, 0, 10);
    });
    calculations.forEach((calculation, columnIndex) => {
      if (calculation === 'formula' && !formulas[columnIndex]) {
        throw new Error(`Summary row ${index + 1} requires a formula.`);
      }
    });
    return { label, calculations, formulas, precisions };
  });
  const accessByGroup = new Map();
  (Array.isArray(source.access) ? source.access : []).forEach((entry) => {
    const groupId = String(entry?.group_id || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(groupId)) return;
    accessByGroup.set(groupId, {
      group_id: groupId,
      view: normalizeBool(entry.view, false),
      download: normalizeBool(entry.download, false),
      edit: normalizeBool(entry.edit, false),
      manage: normalizeBool(entry.manage, false)
    });
  });
  const layoutInput = source.layout && typeof source.layout === 'object' && !Array.isArray(source.layout)
    ? source.layout : {};
  const worksheet = String(layoutInput.worksheet || 'Report').trim().slice(0, 31) || 'Report';
  if (/[\\\/?*\[\]:]/.test(worksheet)) throw new Error('Worksheet name contains an unsupported character.');
  let placedInput = Array.isArray(layoutInput.placed_cells) ? layoutInput.placed_cells : null;
  if (placedInput === null) {
    placedInput = [];
    const addSystem = (target, value, dateFormat = '') => { if (String(target || '').trim()) placedInput.push({ target, type: 'system', value, date_format: dateFormat }); };
    addSystem(Object.prototype.hasOwnProperty.call(layoutInput, 'title_cell') ? layoutInput.title_cell : 'A1', 'report_name');
    addSystem(Object.prototype.hasOwnProperty.call(layoutInput, 'description_cell') ? layoutInput.description_cell : 'A2', 'report_description');
    const dateDisplay = String(layoutInput.date_display || 'combined');
    if (dateDisplay === 'combined') addSystem(layoutInput.period_cell || 'A3', 'period_label');
    if (dateDisplay === 'separate') {
      addSystem(layoutInput.start_date_cell || 'A3', 'start_date', 'mm/dd/yyyy');
      addSystem(layoutInput.end_date_cell || 'B3', 'end_date', 'mm/dd/yyyy');
    }
    (Array.isArray(layoutInput.fields) ? layoutInput.fields : []).forEach((field) => placedInput.push({ target: field?.cell, type: 'text', text: field?.text }));
  }
  const systemValues = new Set(['report_name', 'report_description', 'period_label', 'start_date', 'end_date', 'generated_at', 'timezone']);
  const placedCells = placedInput.slice(0, 100).map((item, index) => {
    const target = normalizeSpreadsheetRange(item?.target);
    const type = String(item?.type || 'text');
    if (!target) throw new Error(`Placed cell ${index + 1} requires a valid cell or range.`);
    if (!['system', 'text', 'formula'].includes(type)) throw new Error(`Placed cell ${index + 1} has an invalid content type.`);
    const result = { target, type };
    if (type === 'system') {
      result.value = String(item?.value || '');
      if (!systemValues.has(result.value)) throw new Error(`Placed cell ${index + 1} has an invalid standard report value.`);
      result.date_format = String(item?.date_format || '').trim().slice(0, 100);
    } else if (type === 'text') {
      result.text = String(item?.text || '').slice(0, 2000);
      if (!result.text.trim()) throw new Error(`Placed cell ${index + 1} requires custom text.`);
    } else {
      result.expression = String(item?.expression || '').trim().slice(0, 4000);
      if (!result.expression) throw new Error(`Placed cell ${index + 1} requires a formula.`);
      result.precision = normalizeIntRange(item?.precision, 2, 0, 10);
    }
    return result;
  });
  const rangeBounds = (target) => {
    const [start, end = start] = target.split(':');
    const parse = (cell) => { const match = cell.match(/^([A-Z]+)(\d+)$/); return { column: spreadsheetColumnNumber(match[1]), row: Number(match[2]) }; };
    return { start: parse(start), end: parse(end) };
  };
  placedCells.forEach((item, index) => {
    const a = rangeBounds(item.target);
    placedCells.slice(0, index).forEach((other, otherIndex) => {
      const b = rangeBounds(other.target);
      const overlaps = a.start.row <= b.end.row && a.end.row >= b.start.row && a.start.column <= b.end.column && a.end.column >= b.start.column;
      if (overlaps) throw new Error(`Placed cells ${otherIndex + 1} and ${index + 1} overlap.`);
    });
  });
  const layout = {
    worksheet,
    table_start_row: normalizeIntRange(layoutInput.table_start_row, 5, 1, 10000),
    table_start_column: normalizeSpreadsheetColumn(layoutInput.table_start_column, 'A'),
    include_header_row: normalizeBool(layoutInput.include_header_row, true),
    summary_gap_rows: normalizeIntRange(layoutInput.summary_gap_rows, 0, 0, 100),
    summary_placement: String(layoutInput.summary_placement || 'after_data') === 'fixed' ? 'fixed' : 'after_data',
    summary_start_row: normalizeIntRange(layoutInput.summary_start_row, 40, 1, 10000),
    placed_cells: placedCells
  };
  const occupiedColumns = new Set([spreadsheetColumnNumber(layout.table_start_column)]);
  const automaticStart = spreadsheetColumnNumber(layout.table_start_column) + 1;
  columns.filter((column) => column.visible !== false).forEach((column, visibleIndex) => {
    const sheetColumn = column.sheet_column
      ? spreadsheetColumnNumber(column.sheet_column) : automaticStart + visibleIndex;
    if (sheetColumn > 16384) throw new Error('Report column placement exceeds the spreadsheet column limit.');
    if (occupiedColumns.has(sheetColumn)) throw new Error('Visible report columns cannot share a spreadsheet column.');
    occupiedColumns.add(sheetColumn);
  });
  let template = null;
  if (source.template && typeof source.template === 'object' && !Array.isArray(source.template)) {
    const storedId = String(source.template.stored_id || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(storedId)) throw new Error('Report template identifier is invalid.');
    const filename = path.basename(String(source.template.filename || 'template.xlsx')).slice(0, 255);
    const format = reportTemplateFormat({ ...source.template, filename });
    if (!filename.toLowerCase().endsWith(`.${format}`) || !['xlsx', 'ods'].includes(format)) {
      throw new Error('Report template filename must end in .xlsx or .ods.');
    }
    const templatePath = path.join(REPORT_TEMPLATE_DIR, `${storedId}.${format}`);
    if (!fs.existsSync(templatePath)) throw new Error('Stored report template file is missing.');
    template = {
      enabled: normalizeBool(source.template.enabled, false),
      filename,
      format,
      stored_id: storedId,
      checksum: storedId,
      size: Math.max(0, Math.trunc(Number(source.template.size) || fs.statSync(templatePath).size)),
      uploaded_at: String(source.template.uploaded_at || '').trim() || new Date(fs.statSync(templatePath).mtimeMs).toISOString()
    };
  }
  return {
    id,
    name,
    description: String(source.description || '').trim().slice(0, 2000),
    created_by: String(source.created_by || '').trim().slice(0, 191),
    published: normalizeBool(source.published, false),
    hmi_enabled: normalizeBool(source.hmi_enabled, false),
    timezone,
    period: ['daily', 'weekly', 'month', 'yearly', 'custom'].includes(String(source.period || 'month')) ? String(source.period || 'month') : 'month',
    week_start: String(source.week_start || 'sunday') === 'monday' ? 'monday' : 'sunday',
    interval_minutes: [1, 5, 10, 15, 30, 60].includes(Math.trunc(Number(source.interval_minutes)))
      ? Math.trunc(Number(source.interval_minutes)) : 60,
    group_by: ['hour', 'day', 'month', 'raw'].includes(String(source.group_by || 'day')) ? String(source.group_by || 'day') : 'day',
    formats,
    data_source: dataSource,
    access: Array.from(accessByGroup.values()),
    columns,
    summaries,
    layout,
    template
  };
}

function reportCliRangeArgs(report, values) {
  const period = String(report?.period || 'month');
  const read = (name) => String(
    typeof values?.get === 'function' ? (values.get(name) || '') : (values?.[name] || '')
  ).trim();
  if (read('range_mode') === 'last7') {
    const value = read('period_value');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('A valid last-seven-days ending date is required.');
    return { args: ['--range-mode', 'last7', '--period-value', value], label: value };
  }
  if (period === 'custom') {
    const start = read('start_date');
    const end = read('end_date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) {
      throw new Error('Valid start_date and end_date are required.');
    }
    return { args: ['--start-date', start, '--end-date', end], label: `${start}-to-${end}` };
  }
  const value = read('period_value') || read('month');
  const valid = ['daily', 'weekly'].includes(period) ? /^\d{4}-\d{2}-\d{2}$/.test(value)
    : period === 'yearly' ? /^\d{4}$/.test(value)
      : /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  if (!valid) throw new Error(`A valid ${period} report period is required.`);
  return { args: ['--period-value', value], label: value };
}

async function fetchUpstreamJson(req, target, path, { timeoutMs = 8000 } = {}) {
  const { scheme, host, port } = target || {};
  const client = String(scheme || 'http') === 'https' ? https : http;

  const headers = { Accept: 'application/json' };
  if (req.headers['cookie']) headers['Cookie'] = String(req.headers['cookie']);

  const opts = {
    host,
    port,
    method: 'GET',
    path,
    headers,
    timeout: timeoutMs
  };

  return await new Promise((resolve, reject) => {
    const up = client.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try {
          parsed = JSON.parse(raw || '{}');
        } catch (err) {
          reject(new Error(`Upstream JSON parse failed: ${err.message}`));
          return;
        }
        resolve({ status: res.statusCode || 0, headers: res.headers || {}, json: parsed });
      });
    });
    up.on('timeout', () => up.destroy(new Error('upstream timeout')));
    up.on('error', reject);
    up.end();
  });
}

async function fetchUpstreamRaw(req, target, path, { timeoutMs = 8000, accept = '*/*' } = {}) {
  const { scheme, host, port } = target || {};
  const client = String(scheme || 'http') === 'https' ? https : http;
  const headers = { Accept: accept };
  if (req.headers['cookie']) headers['Cookie'] = String(req.headers['cookie']);
  return await new Promise((resolve, reject) => {
    const up = client.request({ host, port, method: 'GET', path, headers, timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers || {}, body: Buffer.concat(chunks) }));
    });
    up.on('timeout', () => up.destroy(new Error('upstream timeout')));
    up.on('error', reject);
    up.end();
  });
}

function sendJson(res, status, obj) {
  send(res, status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  }, JSON.stringify(obj, null, 2));
}

function readJsonFileOrNull(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(String(raw || ''));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function stripJsonComments(text) {
  const input = String(text || '');
  let out = '';
  let inString = false;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1] || '';
    if (lineComment) {
      if (ch === '\n' || ch === '\r') {
        lineComment = false;
        out += ch;
      }
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function readJsoncFileOrNull(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(stripJsonComments(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function writeJsonFile(filePath, obj) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function sanitizeId(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_.-]/g, '_');
}

function uniqueOpaqueId(prefix, usedIds) {
  const safePrefix = sanitizeId(prefix) || 'item';
  let id = '';
  do { id = `${safePrefix}_${crypto.randomBytes(8).toString('hex')}`; } while (usedIds.has(id));
  return id;
}

function copyName(value) {
  const name = String(value || '').trim();
  return name ? `${name} Copy` : 'Copy';
}

function normalizeBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return Boolean(fallback);
}

function normalizeIntRange(value, fallback, min, max) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeMqttConfig(incoming, prev = {}) {
  const src = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
  const old = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
  const patternsSrc = (src.patterns && typeof src.patterns === 'object' && !Array.isArray(src.patterns)) ? src.patterns : {};
  const patternsPrev = (old.patterns && typeof old.patterns === 'object' && !Array.isArray(old.patterns)) ? old.patterns : {};
  const tlsVersions = new Set(['', 'tlsv1.2', 'tlsv1.3']);
  const tlsVersion = String(src.tls_version ?? old.tls_version ?? 'tlsv1.2').trim().toLowerCase();
  const qos = normalizeIntRange(src.qos ?? old.qos ?? 0, 0, 0, 2);
  const clientIdRaw = String(src.client_id ?? old.client_id ?? '').trim();
  const clientIdLower = clientIdRaw.toLowerCase();
  const clientId = ['', 'auto', 'opcbridge', 'opcbridge-core'].includes(clientIdLower) ? '' : clientIdRaw;
  const next = {
    ...old,
    enabled: normalizeBool(src.enabled ?? old.enabled, true),
    host: String(src.host ?? old.host ?? '').trim(),
    port: normalizeIntRange(src.port ?? old.port ?? 1883, 1883, 1, 65535),
    client_id: clientId,
    base_topic: String(src.base_topic ?? old.base_topic ?? 'opcbridge').trim() || 'opcbridge',
    command_topic: String(src.command_topic ?? old.command_topic ?? 'opcbridge/cmd').trim() || 'opcbridge/cmd',
    ack_topic_prefix: String(src.ack_topic_prefix ?? old.ack_topic_prefix ?? 'opcbridge/ack').trim() || 'opcbridge/ack',
    subscribe_enabled: normalizeBool(src.subscribe_enabled ?? old.subscribe_enabled, true),
    patterns: {
      ...patternsPrev,
      per_field: normalizeBool(patternsSrc.per_field ?? patternsPrev.per_field, true),
      tag_json: normalizeBool(patternsSrc.tag_json ?? patternsPrev.tag_json, true),
      connection_json: normalizeBool(patternsSrc.connection_json ?? patternsPrev.connection_json, false)
    },
    require_write_token: normalizeBool(src.require_write_token ?? old.require_write_token, true),
    username: String(src.username ?? old.username ?? '').trim(),
    use_tls: normalizeBool(src.use_tls ?? old.use_tls, false),
    cafile: String(src.cafile ?? old.cafile ?? 'ca.crt').trim() || 'ca.crt',
    certfile: String(src.certfile ?? old.certfile ?? '').trim(),
    keyfile: String(src.keyfile ?? old.keyfile ?? '').trim(),
    tls_version: tlsVersions.has(tlsVersion) ? tlsVersion : 'tlsv1.2',
    tls_insecure: normalizeBool(src.tls_insecure ?? old.tls_insecure, false),
    qos,
    retain: normalizeBool(src.retain ?? old.retain, false),
    keepalive_sec: normalizeIntRange(src.keepalive_sec ?? old.keepalive_sec ?? 60, 60, 5, 3600),
    heartbeat_sec: normalizeIntRange(src.heartbeat_sec ?? old.heartbeat_sec ?? 30, 30, 0, 86400),
    publish_only_on_change: normalizeBool(src.publish_only_on_change ?? old.publish_only_on_change, false)
  };

  if (typeof src.password === 'string' && src.password.length > 0) {
    next.password = src.password;
  } else if (typeof old.password === 'string' && old.password.length > 0) {
    next.password = old.password;
  } else {
    delete next.password;
  }

  if (typeof src.write_token === 'string' && src.write_token.length > 0) {
    next.write_token = src.write_token;
  } else if (typeof old.write_token === 'string' && old.write_token.length > 0) {
    next.write_token = old.write_token;
  } else {
    next.write_token = '';
  }

  return next;
}

function safeMqttConfig(config) {
  const safe = { ...(config || {}) };
  const passwordSet = Boolean(String(safe.password || ''));
  const writeTokenSet = Boolean(String(safe.write_token || ''));
  delete safe.password;
  delete safe.write_token;
  return { config: safe, password_set: passwordSet, write_token_set: writeTokenSet };
}

function mqttResolveConfigPath(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (path.isAbsolute(s)) return s;
  return path.join(DEFAULT_OPCBRIDGE_CONFIG_DIR, s);
}

function mqttEncodeString(value) {
  const buf = Buffer.from(String(value || ''), 'utf8');
  const len = Buffer.alloc(2);
  len.writeUInt16BE(buf.length, 0);
  return Buffer.concat([len, buf]);
}

function mqttEncodeRemainingLength(length) {
  const bytes = [];
  let x = Number(length) || 0;
  do {
    let encoded = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) encoded |= 128;
    bytes.push(encoded);
  } while (x > 0);
  return Buffer.from(bytes);
}

function mqttBuildConnectPacket(config) {
  const clientId = String(config.client_id || '').trim() || `opcbridge-test-${process.pid}-${Date.now().toString(16)}`;
  const username = String(config.username || '');
  const password = String(config.password || '');
  const keepalive = Math.max(5, Math.min(65535, Math.trunc(Number(config.keepalive_sec || config.keepalive || 60) || 60)));
  const keepaliveBuf = Buffer.alloc(2);
  keepaliveBuf.writeUInt16BE(keepalive, 0);
  let flags = 0x02; // clean session
  const payloadParts = [mqttEncodeString(clientId)];
  if (username) flags |= 0x80;
  if (password) flags |= 0x40;
  if (username) payloadParts.push(mqttEncodeString(username));
  if (password) payloadParts.push(mqttEncodeString(password));

  const variableHeader = Buffer.concat([
    mqttEncodeString('MQTT'),
    Buffer.from([0x04, flags]),
    keepaliveBuf
  ]);
  const payload = Buffer.concat(payloadParts);
  const remaining = variableHeader.length + payload.length;
  return Buffer.concat([Buffer.from([0x10]), mqttEncodeRemainingLength(remaining), variableHeader, payload]);
}

function mqttTestConnection(config, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const host = String(config.host || '').trim();
    const port = normalizeIntRange(config.port, config.use_tls ? 8883 : 1883, 1, 65535);
    if (!host) {
      reject(new Error('MQTT broker host is required.'));
      return;
    }

    const packet = mqttBuildConnectPacket(config);
    let settled = false;
    let socket = null;
    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      try { socket?.destroy(); } catch { /* ignore */ }
      if (err) reject(err);
      else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('MQTT broker test timed out.')), timeoutMs);
    const done = (err, result) => {
      clearTimeout(timer);
      finish(err, result);
    };

    const onConnect = () => {
      try {
        socket.write(packet);
      } catch (err) {
        done(err);
      }
    };

    if (normalizeBool(config.use_tls, false)) {
      const tlsOpts = {
        host,
        port,
        servername: host,
        rejectUnauthorized: !normalizeBool(config.tls_insecure, false),
        timeout: timeoutMs
      };
      const caPath = mqttResolveConfigPath(config.cafile);
      const certPath = mqttResolveConfigPath(config.certfile);
      const keyPath = mqttResolveConfigPath(config.keyfile);
      try {
        if (config.ca_pem) tlsOpts.ca = String(config.ca_pem);
        else if (caPath && fs.existsSync(caPath)) tlsOpts.ca = fs.readFileSync(caPath);
        if (config.cert_pem) tlsOpts.cert = String(config.cert_pem);
        else if (certPath && fs.existsSync(certPath)) tlsOpts.cert = fs.readFileSync(certPath);
        if (config.key_pem) tlsOpts.key = String(config.key_pem);
        else if (keyPath && fs.existsSync(keyPath)) tlsOpts.key = fs.readFileSync(keyPath);
      } catch (err) {
        reject(new Error(`Failed to read MQTT TLS certificate file: ${err.message}`));
        return;
      }
      socket = tls.connect(tlsOpts, onConnect);
    } else {
      socket = net.connect({ host, port, timeout: timeoutMs }, onConnect);
    }

    const chunks = [];
    socket.on('data', (chunk) => {
      chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      if (buf.length < 4) return;
      if (buf[0] !== 0x20) {
        done(new Error(`Unexpected MQTT response packet type 0x${buf[0].toString(16)}.`));
        return;
      }
      const rc = buf[3];
      if (rc === 0) {
        done(null, {
          ok: true,
          host,
          port,
          tls: normalizeBool(config.use_tls, false),
          elapsed_ms: Date.now() - started,
          message: 'MQTT broker accepted the connection.'
        });
      } else {
        const meanings = {
          1: 'unacceptable protocol version',
          2: 'identifier rejected',
          3: 'server unavailable',
          4: 'bad username or password',
          5: 'not authorized'
        };
        done(new Error(`MQTT broker rejected the connection: ${meanings[rc] || `CONNACK code ${rc}`}.`));
      }
    });
    socket.on('timeout', () => done(new Error('MQTT broker socket timed out.')));
    socket.on('error', (err) => done(err));
  });
}

function normalizeOnCalendar(value) {
  const s = String(value || '').trim();
  return s;
}

function configuredServiceJsonRequest(target, apiPath, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const transport = String(target?.scheme || 'http').toLowerCase() === 'https' ? https : http;
    const req = transport.request({
      hostname: target?.host || '127.0.0.1',
      port: Number(target?.port || 80),
      path: apiPath,
      method: 'GET',
      timeout: timeoutMs,
      headers: { Accept: 'application/json' }
    }, (upRes) => {
      const chunks = [];
      upRes.on('data', (chunk) => chunks.push(chunk));
      upRes.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch {}
        resolve({ ok: upRes.statusCode >= 200 && upRes.statusCode < 300, status: upRes.statusCode, json: parsed });
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', (err) => resolve({ ok: false, status: 0, error: String(err.message || err) }));
    req.end();
  });
}

function reporterApiRequest(method, apiPath, bodyObj = null, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : '';
    const opts = {
      hostname: REPORTER_API_HOST,
      port: REPORTER_API_PORT,
      path: apiPath,
      method,
      timeout: timeoutMs,
      headers: {
        Accept: 'application/json'
      }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const up = http.request(opts, (upRes) => {
      const chunks = [];
      upRes.on('data', (c) => chunks.push(c));
      upRes.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(text || '{}'); } catch {}
        resolve({
          ok: upRes.statusCode >= 200 && upRes.statusCode < 300 && parsed?.ok !== false,
          status: upRes.statusCode,
          json: parsed,
          text
        });
      });
    });
    up.on('timeout', () => {
      up.destroy(new Error('Logger API timeout'));
    });
    up.on('error', (err) => {
      resolve({ ok: false, status: 0, error: String(err.message || err) });
    });
    if (body) up.write(body);
    up.end();
  });
}

function historianApiRequest(method, apiPath, bodyObj = null, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : '';
    const opts = {
      hostname: HISTORIAN_API_HOST,
      port: HISTORIAN_API_PORT,
      path: apiPath,
      method,
      timeout: timeoutMs,
      headers: {
        Accept: 'application/json'
      }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const up = http.request(opts, (upRes) => {
      const chunks = [];
      upRes.on('data', (c) => chunks.push(c));
      upRes.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(text || '{}'); } catch {}
        resolve({
          ok: upRes.statusCode >= 200 && upRes.statusCode < 300 && parsed?.ok !== false,
          status: upRes.statusCode,
          json: parsed,
          text
        });
      });
    });
    up.on('timeout', () => {
      up.destroy(new Error('Historian API timeout'));
    });
    up.on('error', (err) => {
      resolve({ ok: false, status: 0, error: String(err.message || err) });
    });
    if (body) up.write(body);
    up.end();
  });
}

function flowApiRequest(method, apiPath, bodyObj = null, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const body = bodyObj === null ? '' : JSON.stringify(bodyObj);
    const request = http.request({
      hostname: FLOW_API_HOST,
      port: FLOW_API_PORT,
      path: apiPath,
      method,
      timeout: timeoutMs,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
      }
    }, (upstream) => {
      const chunks = [];
      upstream.on('data', (chunk) => chunks.push(chunk));
      upstream.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(text || '{}'); } catch {}
        resolve({ ok: upstream.statusCode >= 200 && upstream.statusCode < 300 && parsed?.ok !== false,
          status: upstream.statusCode || 0, json: parsed, text });
      });
    });
    request.on('timeout', () => request.destroy(new Error('Flow API timeout')));
    request.on('error', (err) => resolve({ ok: false, status: 0, error: String(err.message || err) }));
    if (body) request.write(body);
    request.end();
  });
}

function readReporterDatabasesRaw() {
  const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
  const raw = Array.isArray(root?.databases) ? root.databases : [];
  return raw.filter((d) => d && typeof d === 'object' && !Array.isArray(d));
}

function reporterDatabaseTestTimeoutMs(database) {
  const configured = Math.trunc(Number(database?.monitor_timeout_sec ?? 10) || 10);
  const operationSeconds = Math.max(1, Math.min(300, configured));
  // MySQL can apply the configured limit independently to connect, write, and
  // read. Keep the outer API request alive long enough to receive that result.
  return (operationSeconds * 3 + 5) * 1000;
}

function reporterDatabaseDiscoveryTimeoutMs(database) {
  const configured = Math.trunc(Number(database?.monitor_timeout_sec ?? 10) || 10);
  const operationSeconds = Math.max(1, Math.min(300, configured));
  // Distinct discovery validates schema first, then performs the distinct
  // query using a second connection.
  return (operationSeconds * 6 + 10) * 1000;
}

function readReporterReportsRaw() {
  const root = readJsonFileOrNull(REPORTER_REPORTS_PATH) || { reports: [] };
  const raw = Array.isArray(root?.reports) ? root.reports : [];
  return raw.filter((r) => r && typeof r === 'object' && !Array.isArray(r));
}

function readReporterDataChecksRaw() {
  const root = readJsonFileOrNull(REPORTER_DATA_CHECKS_PATH) || { data_checks: [] };
  const raw = Array.isArray(root?.data_checks) ? root.data_checks : [];
  return raw.filter((c) => c && typeof c === 'object' && !Array.isArray(c));
}

function readReporterSyncJobsRaw() {
  const root = readJsonFileOrNull(REPORTER_SYNC_JOBS_PATH) || { sync_jobs: [] };
  const raw = Array.isArray(root?.sync_jobs) ? root.sync_jobs : [];
  return raw.filter((job) => job && typeof job === 'object' && !Array.isArray(job));
}

function parseCmdTokens(cmdline) {
  const s = String(cmdline || '');
  const out = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  let esc = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === '\\') {
      esc = true;
      continue;
    }
    if (inSingle) {
      if (ch === "'") inSingle = false;
      else cur += ch;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      else cur += ch;
      continue;
    }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function buildOpcbridgeExecStart(settings) {
  const bin = String(settings?.bin || DEFAULT_OPCBRIDGE_BIN).trim() || DEFAULT_OPCBRIDGE_BIN;
  const configDir = String(settings?.config_dir || DEFAULT_OPCBRIDGE_CONFIG_DIR).trim() || DEFAULT_OPCBRIDGE_CONFIG_DIR;

  const enableHttp = Boolean(settings?.http_enabled);
  const enableWs = Boolean(settings?.ws_enabled);
  const enableOpcua = Boolean(settings?.opcua_enabled);

  const httpPort = Number(settings?.http_port);
  const wsPort = Number(settings?.ws_port);
  const opcuaPort = Number(settings?.opcua_port);

  const args = [];
  args.push(bin);
  args.push('--config', configDir);
  if (enableHttp) {
    args.push('--http');
    if (Number.isFinite(httpPort) && httpPort > 0) args.push('--http-port', String(Math.trunc(httpPort)));
  }
  if (enableWs) {
    args.push('--ws');
    if (Number.isFinite(wsPort) && wsPort > 0) args.push('--ws-port', String(Math.trunc(wsPort)));
  }
  if (enableOpcua) {
    args.push('--opcua');
    if (Number.isFinite(opcuaPort) && opcuaPort > 0) args.push('--opcua-port', String(Math.trunc(opcuaPort)));
  }
  // systemd ExecStart uses a single line; avoid quoting unless necessary.
  return args.join(' ');
}

function loadOpcbridgeSystemdSettings() {
  const defaults = {
    unit: SYSTEMD_UNIT,
    dropin_path: SYSTEMD_DROPIN_PATH,
    bin: DEFAULT_OPCBRIDGE_BIN,
    config_dir: DEFAULT_OPCBRIDGE_CONFIG_DIR,
    http_enabled: true,
    http_port: 8080,
    ws_enabled: true,
    ws_port: 8090,
    opcua_enabled: true,
    opcua_port: 4840
  };

  if (!SYSTEMD_ENABLED) return { ok: true, enabled: false, settings: defaults };

  try {
    if (!fs.existsSync(SYSTEMD_DROPIN_PATH)) {
      return { ok: true, enabled: true, settings: defaults, exists: false };
    }

    const raw = fs.readFileSync(SYSTEMD_DROPIN_PATH, 'utf8');
    const lines = String(raw || '').split(/\r?\n/);
    const execLines = lines
      .map((l) => String(l || '').trim())
      .filter((l) => l.toLowerCase().startsWith('execstart=') && l !== 'ExecStart=' && l !== 'execstart=');

    const last = execLines.length ? execLines[execLines.length - 1] : '';
    const cmd = last.replace(/^execstart=/i, '').trim();
    if (!cmd) return { ok: true, enabled: true, settings: defaults, exists: true };

    const tokens = parseCmdTokens(cmd);
    const s = { ...defaults };
    s.bin = tokens[0] || s.bin;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === '--config') { s.config_dir = tokens[i + 1] || s.config_dir; i += 1; continue; }
      if (t === '--http') { s.http_enabled = true; continue; }
      if (t === '--http-port') { s.http_port = Number(tokens[i + 1] || s.http_port); i += 1; continue; }
      if (t === '--ws') { s.ws_enabled = true; continue; }
      if (t === '--ws-port') { s.ws_port = Number(tokens[i + 1] || s.ws_port); i += 1; continue; }
      if (t === '--opcua') { s.opcua_enabled = true; continue; }
      if (t === '--opcua-port') { s.opcua_port = Number(tokens[i + 1] || s.opcua_port); i += 1; continue; }
    }

    // If a flag isn't present in the drop-in, treat it as disabled.
    s.http_enabled = tokens.includes('--http');
    s.ws_enabled = tokens.includes('--ws');
    s.opcua_enabled = tokens.includes('--opcua');

    return { ok: true, enabled: true, settings: s, exists: true };
  } catch (err) {
    return { ok: false, enabled: true, error: String(err.message || err), settings: defaults };
  }
}

function writeOpcbridgeSystemdDropIn(settings) {
  if (!SYSTEMD_ENABLED) {
    return { ok: false, error: 'Systemd management disabled in opcbridge-scada.' };
  }

  const execStart = buildOpcbridgeExecStart(settings);
  const content =
`# Managed by opcbridge-scada
[Service]
ExecStart=
ExecStart=${execStart}
LimitNOFILE=65536
`;

  const inst = installSystemdDropIn(content);
  if (!inst.ok) return { ok: false, error: inst.error || 'Failed to install drop-in.', ...inst };
  return { ok: true, dropin_path: SYSTEMD_DROPIN_PATH, content, exec_start: execStart, ...inst };
}

function runSystemctl(args) {
  const a = Array.isArray(args) ? args.map((x) => String(x)) : [];
  const isRoot = (typeof process.getuid === 'function') ? (process.getuid() === 0) : false;
  const cmd = isRoot ? 'systemctl' : 'sudo';
  const cmdArgs = isRoot ? a : ['-n', 'systemctl', ...a];
  const r = child_process.spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || '')
  };
}

function installSystemdDropIn(content) {
  if (!SYSTEMD_ENABLED) {
    return { ok: false, error: 'Systemd management disabled in opcbridge-scada.' };
  }

  const isRoot = (typeof process.getuid === 'function') ? (process.getuid() === 0) : false;
  const tmpDir = '/tmp';
  const tmpPath = path.join(tmpDir, `opcbridge-scada-dropin-${process.pid}-${Date.now()}.conf`);

  try {
    fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o644 });
  } catch (err) {
    return { ok: false, error: `Failed to write temp drop-in: ${String(err.message || err)}`, tmp_path: tmpPath };
  }

  try {
    if (isRoot) {
      fs.mkdirSync(SYSTEMD_DROPIN_DIR, { recursive: true });
      fs.writeFileSync(SYSTEMD_DROPIN_PATH, content, { encoding: 'utf8', mode: 0o644 });
      return { ok: true, dropin_path: SYSTEMD_DROPIN_PATH, installed_via: 'root_write' };
    }

    // Use `install -D` under sudo to create the directory and place the file.
    const r = child_process.spawnSync('sudo', ['-n', '/usr/bin/install', '-D', '-m', '0644', tmpPath, SYSTEMD_DROPIN_PATH], { encoding: 'utf8' });
    const ok = r.status === 0;
    return {
      ok,
      dropin_path: SYSTEMD_DROPIN_PATH,
      installed_via: 'sudo_install',
      status: r.status,
      stdout: String(r.stdout || ''),
      stderr: String(r.stderr || ''),
      tmp_path: tmpPath
    };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

function installSystemdUnitFile(content, dstPath) {
  if (!SYSTEMD_ENABLED) {
    return { ok: false, error: 'Systemd management disabled in opcbridge-scada.' };
  }

  const isRoot = (typeof process.getuid === 'function') ? (process.getuid() === 0) : false;
  const tmpDir = '/tmp';
  const base = path.basename(dstPath);
  const tmpPath = path.join(tmpDir, `opcbridge-scada-unit-${process.pid}-${Date.now()}-${base}`);

  try {
    fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o644 });
  } catch (err) {
    return { ok: false, error: `Failed to write temp unit: ${String(err.message || err)}`, tmp_path: tmpPath };
  }

  try {
    if (isRoot) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.writeFileSync(dstPath, content, { encoding: 'utf8', mode: 0o644 });
      return { ok: true, unit_path: dstPath, installed_via: 'root_write' };
    }

    const r = child_process.spawnSync('sudo', ['-n', '/usr/bin/install', '-D', '-m', '0644', tmpPath, dstPath], { encoding: 'utf8' });
    return {
      ok: r.status === 0,
      unit_path: dstPath,
      installed_via: 'sudo_install',
      status: r.status,
      stdout: String(r.stdout || ''),
      stderr: String(r.stderr || ''),
      tmp_path: tmpPath
    };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

function listAudioPlaybackDevices() {
  const r = child_process.spawnSync('aplay', ['-l'], { encoding: 'utf8', timeout: 5000 });
  const stdout = String(r.stdout || '');
  const stderr = String(r.stderr || '');
  const devices = [];
  const seen = new Set();
  const re = /^card\s+(\d+):\s+([^\[]+)\[([^\]]+)\],\s+device\s+(\d+):\s+([^\[]+)\[([^\]]+)\]/gm;
  let match = null;
  while ((match = re.exec(stdout)) !== null) {
    const card = Number(match[1]);
    const device = Number(match[4]);
    // ALSA's numeric card indexes can change after reboot or when another
    // HDMI/USB device appears. Persist the stable card identifier instead.
    const cardId = String(match[2] || '').trim();
    const alsa = cardId
      ? `plughw:CARD=${cardId},DEV=${device}`
      : `plughw:${card},${device}`;
    if (seen.has(alsa)) continue;
    seen.add(alsa);
    const cardName = String(match[3] || match[2] || '').trim();
    const deviceName = String(match[6] || match[5] || '').trim();
    devices.push({
      id: alsa,
      alsa,
      card,
      card_id: cardId,
      device,
      card_name: cardName,
      device_name: deviceName,
      label: `card ${card}, device ${device}: ${cardName} - ${deviceName}`
    });
  }
  return {
    ok: r.status === 0,
    command: 'aplay -l',
    status: r.status,
    devices,
    stdout,
    stderr,
    error: r.status === 0 ? '' : (stderr.trim() || stdout.trim() || 'aplay -l failed')
  };
}

function listSerialModemDevices() {
  const devices = [];
  const seen = new Set();

  function addDevice(devicePath, labelSuffix = '') {
    const p = String(devicePath || '').trim();
    if (!p || seen.has(p)) return;
    try {
      if (!fs.existsSync(p)) return;
      const st = fs.statSync(p);
      if (!st.isCharacterDevice() && !st.isSymbolicLink()) return;
      seen.add(p);
      let label = p;
      if (labelSuffix) label += ` ${labelSuffix}`;
      devices.push({ path: p, id: p, label });
    } catch {
      // Device nodes can appear/disappear while scanning /dev.
    }
  }

  addDevice('/dev/modem', '(modem symlink)');

  try {
    const names = fs.readdirSync('/dev');
    names
      .filter((name) => /^(ttyUSB|ttyACM|ttyS|ttyAMA|ttyTHS)\d+$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .forEach((name) => addDevice(path.join('/dev', name)));
  } catch {
    // Keep the endpoint usable even on systems with restricted /dev access.
  }

  return { ok: true, devices };
}

function listTtsVoices() {
  const candidates = [
    { engine: 'espeak-ng', cmd: 'espeak-ng', args: ['--voices'], timeout: 8000 },
    { engine: 'espeak', cmd: 'espeak', args: ['--voices'], timeout: 8000 },
    { engine: 'flite', cmd: 'flite', args: ['-lv'], timeout: 8000 }
  ];
  const pick = candidates.find((c) => {
    try {
      const r = child_process.spawnSync(c.cmd, ['--version'], { encoding: 'utf8', timeout: 2000 });
      return r.status === 0;
    } catch {
      return false;
    }
  }) || candidates.find((c) => {
    try {
      const r = child_process.spawnSync(c.cmd, ['-h'], { encoding: 'utf8', timeout: 2000 });
      return r.status === 0;
    } catch {
      return false;
    }
  }) || null;

  if (!pick) {
    return { ok: false, engine: '', voices: [], error: 'No supported TTS engine found (espeak-ng/espeak/flite).' };
  }

  const r = child_process.spawnSync(pick.cmd, pick.args, { encoding: 'utf8', timeout: pick.timeout });
  const stdout = String(r.stdout || '');
  const stderr = String(r.stderr || '');
  const voices = [];
  const seen = new Set();

  if (pick.engine === 'flite') {
    // flite -lv output is a list of voice names and possibly descriptions; keep first token per line.
    stdout.split('\n').forEach((line) => {
      const s = String(line || '').trim();
      if (!s) return;
      const name = s.split(/\s+/)[0];
      if (!name || seen.has(name)) return;
      seen.add(name);
      voices.push({ id: name, name, label: name, engine: 'flite' });
    });
  } else {
    // espeak/espeak-ng --voices:
    // Example:
    // Pty Language       Age/Gender VoiceName          File                 Other Languages
    //  2  en-us           --/M      English_(America)  gmw/en-US            (en 3)
    stdout.split('\n').forEach((line) => {
      const s = String(line || '').trim();
      if (!s) return;
      if (/^Pty\s+Language\b/i.test(s)) return; // header
      const parts = s.split(/\s+/).filter(Boolean);
      if (parts.length < 5) return;
      const language = String(parts[1] || '').trim();
      const ageGender = String(parts[2] || '').trim(); // e.g. --/M
      const voiceName = String(parts[3] || '').trim(); // e.g. English_(America)
      if (!language) return;
      if (seen.has(language)) return;
      seen.add(language);
      const label = voiceName ? voiceName.replace(/_/g, ' ') : language;
      voices.push({
        id: language,
        name: language,
        label,
        language,
        age_gender: ageGender,
        engine: pick.engine
      });
    });
  }

  voices.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' }));
  return {
    ok: r.status === 0,
    engine: pick.engine,
    command: `${pick.cmd} ${pick.args.join(' ')}`,
    status: r.status,
    voices,
    stdout,
    stderr,
    error: r.status === 0 ? '' : (stderr.trim() || stdout.trim() || 'TTS voices command failed')
  };
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function safeJoin(base, reqPath) {
  const raw = reqPath.replace(/\0/g, '');
  const decoded = decodeURIComponent(raw);
  const resolved = path.normalize(path.join(base, decoded));
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function readBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function projectBackupSafeRel(relPath) {
  const raw = String(relPath || '').replace(/\0/g, '').replace(/\\/g, '/').trim();
  if (!raw || raw.startsWith('/') || raw.includes('..')) return '';
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return '';
  for (const p of parts) {
    if (p === '.' || p === '..') return '';
  }
  return parts.join('/');
}

function projectBackupAddFile(files, section, rootDir, relPath, opts = {}) {
  const rel = projectBackupSafeRel(relPath);
  if (!rel) return { ok: false, skipped: true, reason: 'unsafe relative path' };
  const root = path.resolve(String(rootDir || ''));
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) && full !== root) return { ok: false, skipped: true, reason: 'path outside root' };
  let st = null;
  try {
    st = fs.statSync(full);
  } catch {
    if (opts.optional !== false) return { ok: true, skipped: true, reason: 'missing' };
    return { ok: false, skipped: true, reason: 'missing' };
  }
  if (!st.isFile()) return { ok: true, skipped: true, reason: 'not a file' };
  if (st.size > PROJECT_BACKUP_MAX_FILE_BYTES) return { ok: false, skipped: true, reason: `file too large (${st.size} bytes)` };
  const buf = fs.readFileSync(full);
  files.push({
    section: String(section || ''),
    path: rel,
    size: buf.length,
    mtime_ms: Math.trunc(st.mtimeMs || 0),
    mode: st.mode & 0o777,
    encoding: 'base64',
    content_b64: buf.toString('base64')
  });
  return { ok: true, skipped: false, size: buf.length };
}

function projectBackupAddGeneratedFile(files, section, relPath, buf, opts = {}) {
  const rel = projectBackupSafeRel(relPath);
  if (!rel) return { ok: false, skipped: true, reason: 'unsafe relative path' };
  const data = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf || ''), 'utf8');
  if (!opts.allowEmpty && data.length < 1) return { ok: false, skipped: true, reason: 'empty generated file' };
  if (data.length > PROJECT_BACKUP_MAX_FILE_BYTES) return { ok: false, skipped: true, reason: `file too large (${data.length} bytes)` };
  files.push({
    section: String(section || ''),
    path: rel,
    size: data.length,
    mtime_ms: Date.now(),
    mode: Number(opts.mode || 0o600) & 0o777,
    encoding: 'base64',
    generated: true,
    content_b64: data.toString('base64')
  });
  return { ok: true, skipped: false, size: data.length };
}

function readEnvKeyValueFile(filePath) {
  const out = {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    String(raw || '').split(/\r?\n/g).forEach((line) => {
      let s = String(line || '').trim();
      if (!s || s.startsWith('#')) return;
      if (s.startsWith('export ')) s = s.slice('export '.length).trim();
      const idx = s.indexOf('=');
      if (idx <= 0) return;
      const key = s.slice(0, idx).trim();
      let val = s.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key) out[key] = val;
    });
  } catch {
    // ignore unreadable/missing env files
  }
  return out;
}

function historianPgSettings() {
  const envFile = readEnvKeyValueFile(OPCBRIDGE_ENV_PATH);
  const get = (key, def = '') => String(process.env[key] || envFile[key] || def || '').trim();
  return {
    host: get('HISTORIAN_PGHOST', '127.0.0.1'),
    port: get('HISTORIAN_PGPORT', '5432'),
    db: get('HISTORIAN_PGDB', 'opcbridge_historian'),
    user: get('HISTORIAN_PGUSER', 'opcbridge_historian'),
    password: get('HISTORIAN_PGPASSWORD', '')
  };
}

function buildHistorianSqlDump() {
  const pgDump = child_process.spawnSync('pg_dump', ['--version'], { encoding: 'utf8' });
  if (pgDump.status !== 0) {
    return { ok: false, error: 'pg_dump is not installed or not in PATH.' };
  }
  const pg = historianPgSettings();
  const args = [
    '--host', pg.host,
    '--port', pg.port,
    '--username', pg.user,
    '--dbname', pg.db,
    '--format', 'plain',
    '--no-owner',
    '--no-privileges'
  ];
  const env = { ...process.env };
  if (pg.password) env.PGPASSWORD = pg.password;
  const r = child_process.spawnSync('pg_dump', args, {
    encoding: null,
    env,
    maxBuffer: PROJECT_BACKUP_MAX_FILE_BYTES
  });
  if (r.status !== 0) {
    return {
      ok: false,
      error: String((r.stderr || Buffer.alloc(0)).toString('utf8') || r.error?.message || 'pg_dump failed').trim()
    };
  }
  return { ok: true, buffer: r.stdout || Buffer.alloc(0), settings: { host: pg.host, port: pg.port, db: pg.db, user: pg.user } };
}

function projectBackupWalkFiles(rootDir, dirRel, opts = {}) {
  const root = path.resolve(String(rootDir || ''));
  const startRel = projectBackupSafeRel(dirRel || '.') || '.';
  const start = path.resolve(root, startRel);
  if (!start.startsWith(root + path.sep) && start !== root) return [];

  const out = [];
  const excludeDirs = new Set((opts.excludeDirs || []).map((s) => String(s || '')));
  const excludeNames = new Set((opts.excludeNames || []).map((s) => String(s || '')));
  const includeExts = opts.includeExts ? new Set(opts.includeExts.map((s) => String(s || '').toLowerCase())) : null;

  function walk(absDir, relDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    for (const ent of entries) {
      if (!ent || !ent.name || ent.name.includes('\0')) continue;
      if (excludeNames.has(ent.name)) continue;
      const rel = relDir === '.' ? ent.name : `${relDir}/${ent.name}`;
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        if (excludeDirs.has(ent.name) || excludeDirs.has(rel)) continue;
        walk(abs, rel);
      } else if (ent.isFile()) {
        if (includeExts && !includeExts.has(path.extname(ent.name).toLowerCase())) continue;
        out.push(rel);
      }
    }
  }

  try {
    const st = fs.statSync(start);
    if (st.isDirectory()) walk(start, startRel === '.' ? '.' : startRel);
    else if (st.isFile()) out.push(startRel);
  } catch {
    // ignore
  }
  return out;
}

function buildProjectBackup({ includeSecrets = false, includeHistory = false, includeHistorianData = false, onProgress = null } = {}) {
  const files = [];
  const warnings = [];
  let totalBytes = 0;
  const progress = (message, percent) => {
    if (typeof onProgress === 'function') {
      try { onProgress(String(message || ''), Number(percent || 0)); } catch { /* ignore */ }
    }
  };

  const add = (section, root, rel, opts = {}) => {
    const before = files.length;
    const r = projectBackupAddFile(files, section, root, rel, opts);
    if (!r.ok && !r.skipped) warnings.push(`${section}/${rel}: ${r.reason || 'failed'}`);
    if (r.skipped && r.reason && opts.warnMissing) warnings.push(`${section}/${rel}: ${r.reason}`);
    if (files.length > before) {
      totalBytes += files[files.length - 1].size || 0;
      if (totalBytes > PROJECT_BACKUP_MAX_TOTAL_BYTES) {
        throw new Error(`Project backup exceeded maximum total size (${PROJECT_BACKUP_MAX_TOTAL_BYTES} bytes).`);
      }
    }
  };

  progress('Collecting OPCBridge configuration...', 10);
  const opcExts = ['.json', '.jsonc', '.crt', '.pem', '.cer', '.wav', '.mp3', '.ogg', '.flac'];
  projectBackupWalkFiles(DEFAULT_OPCBRIDGE_CONFIG_DIR, '.', {
    includeExts: opcExts,
    excludeNames: ['admin_auth.json.bak']
  }).forEach((rel) => {
    if (!includeSecrets && ['passwords.jsonc', 'admin_auth.json', 'config.secrets.json'].includes(path.basename(rel))) return;
    add('opcbridge_config', DEFAULT_OPCBRIDGE_CONFIG_DIR, rel);
  });

  add('scada_config', path.dirname(CONFIG_PATH), path.basename(CONFIG_PATH));
  if (includeSecrets) add('scada_config', path.dirname(SECRETS_PATH), path.basename(SECRETS_PATH));

  progress('Collecting HMI screens and graphics...', 30);
  const hmiFiles = [
    ...projectBackupWalkFiles(HMI_ROOT, 'screens', { includeExts: ['.json', '.jsonc'] }),
    ...projectBackupWalkFiles(HMI_ROOT, 'public/img', {
      includeExts: ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif']
    }),
    ...projectBackupWalkFiles(HMI_ROOT, 'public/js/config.jsonc', { includeExts: ['.json', '.jsonc'] })
  ];
  Array.from(new Set(hmiFiles)).forEach((rel) => add('hmi_project', HMI_ROOT, rel));
  if (includeSecrets) add('hmi_project', HMI_ROOT, 'passwords.jsonc');

  progress('Collecting data logger configuration...', 45);
  [
    REPORTER_CONFIG_PATH,
    REPORTER_REPORTS_PATH
  ].forEach((absPath) => {
    const p = String(absPath || '').trim();
    if (!p) return;
    add('logger_config', path.dirname(p), path.basename(p));
  });
  if (includeSecrets) {
    const p = String(REPORTER_DATABASES_PATH || '').trim();
    if (p) add('logger_config', path.dirname(p), path.basename(p));
  }
  projectBackupWalkFiles(REPORTER_REPORTS_DIR, '.', { includeExts: ['.json', '.jsonc', '.sql', '.txt', '.md'] })
    .forEach((rel) => add('logger_reports', REPORTER_REPORTS_DIR, rel));
  add('report_config', path.dirname(REPORT_DEFINITIONS_PATH), path.basename(REPORT_DEFINITIONS_PATH));
  add('report_config', path.dirname(REPORT_DATA_SOURCES_PATH), path.basename(REPORT_DATA_SOURCES_PATH));
  projectBackupWalkFiles(REPORT_TEMPLATE_DIR, '.', { includeExts: ['.xlsx', '.ods'] })
    .forEach((rel) => add('report_templates', REPORT_TEMPLATE_DIR, rel));

  if (includeHistory) {
    progress('Collecting alarm/event history database...', 60);
    const dbPath = String(OPCBRIDGE_ALARMS_DB_PATH || '').trim();
    if (dbPath) add('runtime_history', path.dirname(dbPath), path.basename(dbPath), { warnMissing: true });
  }

  if (includeHistorianData) {
    progress('Dumping historian PostgreSQL data...', 75);
    const dump = buildHistorianSqlDump();
    if (dump.ok) {
      const r = projectBackupAddGeneratedFile(files, 'historian_data', 'opcbridge_historian.sql', dump.buffer, { mode: 0o600 });
      if (r.ok && !r.skipped) {
        totalBytes += r.size || 0;
        if (totalBytes > PROJECT_BACKUP_MAX_TOTAL_BYTES) {
          throw new Error(`Project backup exceeded maximum total size (${PROJECT_BACKUP_MAX_TOTAL_BYTES} bytes).`);
        }
      } else {
        warnings.push(`historian_data/opcbridge_historian.sql: ${r.reason || 'failed'}`);
      }
    } else {
      warnings.push(`historian_data: ${dump.error || 'pg_dump failed'}`);
    }
  }

  progress('Finalizing backup manifest...', 90);
  return {
    type: 'opcbridge-suite-project-backup',
    schema_version: 1,
    created_at: new Date().toISOString(),
    host: os.hostname(),
    suite_version: SUITE_VERSION,
    scada_version: COMPONENT_VERSION,
    include_secrets: Boolean(includeSecrets),
    include_history: Boolean(includeHistory),
    include_historian_data: Boolean(includeHistorianData),
    roots: {
      opcbridge_config: DEFAULT_OPCBRIDGE_CONFIG_DIR,
      scada_config: path.dirname(CONFIG_PATH),
      hmi_project: HMI_ROOT,
      logger_config: path.dirname(REPORTER_CONFIG_PATH),
      logger_reports: REPORTER_REPORTS_DIR,
      report_config: path.dirname(REPORT_DEFINITIONS_PATH),
      report_templates: REPORT_TEMPLATE_DIR,
      runtime_history: path.dirname(OPCBRIDGE_ALARMS_DB_PATH),
      historian_data: os.tmpdir()
    },
    counts: {
      files: files.length,
      bytes: totalBytes
    },
    warnings,
    files
  };
}

function projectRestoreRootForSection(section) {
  const s = String(section || '');
  if (s === 'opcbridge_config') return DEFAULT_OPCBRIDGE_CONFIG_DIR;
  if (s === 'scada_config') return path.dirname(CONFIG_PATH);
  if (s === 'hmi_project') return HMI_ROOT;
  if (s === 'logger_config' || s === 'reporter_config') return path.dirname(REPORTER_CONFIG_PATH);
  if (s === 'logger_reports' || s === 'reporter_reports') return REPORTER_REPORTS_DIR;
  if (s === 'report_config') return path.dirname(REPORT_DEFINITIONS_PATH);
  if (s === 'report_templates') return REPORT_TEMPLATE_DIR;
  if (s === 'runtime_history') return path.dirname(OPCBRIDGE_ALARMS_DB_PATH);
  if (s === 'historian_data') return os.tmpdir();
  return '';
}

function previewProjectBackup(backup) {
  const files = Array.isArray(backup?.files) ? backup.files : [];
  const sections = {};
  let bytes = 0;
  files.forEach((f) => {
    const s = String(f?.section || 'unknown');
    if (!sections[s]) sections[s] = { files: 0, bytes: 0 };
    const size = Number(f?.size || 0) || 0;
    sections[s].files += 1;
    sections[s].bytes += size;
    bytes += size;
  });
  return {
    ok: true,
    type: String(backup?.type || ''),
    schema_version: backup?.schema_version,
    created_at: backup?.created_at || null,
    host: backup?.host || null,
    suite_version: backup?.suite_version || null,
    include_secrets: Boolean(backup?.include_secrets),
    include_history: Boolean(backup?.include_history),
    include_historian_data: Boolean(backup?.include_historian_data),
    files: files.length,
    bytes,
    sections
  };
}

function restoreProjectBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) throw new Error('Backup must be a JSON object.');
  if (backup.type !== 'opcbridge-suite-project-backup') throw new Error('Unsupported backup type.');
  if (Number(backup.schema_version) !== 1) throw new Error('Unsupported backup schema version.');
  const files = Array.isArray(backup.files) ? backup.files : [];
  if (!files.length) throw new Error('Backup contains no files.');

  const preRestore = buildProjectBackup({ includeSecrets: true, includeHistory: true, includeHistorianData: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRestorePath = path.join(os.tmpdir(), `opcbridge-suite-pre-restore-${stamp}.json`);
  fs.writeFileSync(preRestorePath, JSON.stringify(preRestore, null, 2) + '\n', 'utf8');

  const written = [];
  for (const f of files) {
    const section = String(f?.section || '');
    const rel = projectBackupSafeRel(f?.path || '');
    if (!section || !rel) throw new Error(`Unsafe backup file entry: ${section}/${f?.path || ''}`);
    const root = projectRestoreRootForSection(section);
    if (!root) throw new Error(`Unsupported backup section: ${section}`);
    const full = path.resolve(root, rel);
    const resolvedRoot = path.resolve(root);
    if (!full.startsWith(resolvedRoot + path.sep) && full !== resolvedRoot) throw new Error(`Restore path escapes root: ${section}/${rel}`);
    const b64 = String(f?.content_b64 || '');
    if (!b64) throw new Error(`Backup file has no content: ${section}/${rel}`);
    const buf = Buffer.from(b64, 'base64');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, buf);
    if (Number.isFinite(Number(f?.mode))) {
      try { fs.chmodSync(full, Number(f.mode) & 0o777); } catch { /* ignore */ }
    }
    written.push({ section, path: rel, bytes: buf.length });
  }

  return { ok: true, written, pre_restore_backup: preRestorePath };
}

const PROJECT_BACKUP_JOBS = new Map();

function cleanupProjectBackupJobs() {
  const now = Date.now();
  for (const [id, job] of PROJECT_BACKUP_JOBS.entries()) {
    const ageMs = now - Number(job?.created_ms || 0);
    if (ageMs < 60 * 60 * 1000) continue;
    if (job?.file_path) {
      try { fs.unlinkSync(job.file_path); } catch { /* ignore */ }
    }
    PROJECT_BACKUP_JOBS.delete(id);
  }
}

function projectBackupJobStatus(job) {
  if (!job) return null;
  return {
    ok: true,
    id: job.id,
    state: job.state,
    message: job.message || '',
    percent: Number(job.percent || 0),
    created_at: new Date(Number(job.created_ms || Date.now())).toISOString(),
    finished_at: job.finished_ms ? new Date(Number(job.finished_ms)).toISOString() : null,
    error: job.error || '',
    download_url: job.state === 'done' ? `/api/project/backup/download?id=${encodeURIComponent(job.id)}` : '',
    summary: job.summary || null,
    warnings: job.warnings || []
  };
}

function startProjectBackupJob(options = {}) {
  cleanupProjectBackupJobs();
  const id = crypto.randomBytes(12).toString('hex');
  const job = {
    id,
    state: 'queued',
    message: 'Queued...',
    percent: 0,
    created_ms: Date.now(),
    finished_ms: 0,
    error: '',
    file_path: '',
    filename: '',
    summary: null,
    warnings: []
  };
  PROJECT_BACKUP_JOBS.set(id, job);

  setImmediate(() => {
    try {
      job.state = 'running';
      job.message = 'Preparing backup...';
      job.percent = 2;
      const backup = buildProjectBackup({
        includeSecrets: Boolean(options.includeSecrets),
        includeHistory: Boolean(options.includeHistory),
        includeHistorianData: Boolean(options.includeHistorianData),
        onProgress: (message, percent) => {
          job.message = message;
          job.percent = Math.max(0, Math.min(99, Math.trunc(percent || 0)));
        }
      });
      job.message = 'Writing backup file...';
      job.percent = 95;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `opcbridge-suite-project-backup-${stamp}.json`;
      const filePath = path.join(os.tmpdir(), `${id}-${filename}`);
      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
      job.file_path = filePath;
      job.filename = filename;
      job.summary = {
        files: Number(backup?.counts?.files || 0),
        bytes: Number(backup?.counts?.bytes || 0),
        include_secrets: Boolean(backup?.include_secrets),
        include_history: Boolean(backup?.include_history),
        include_historian_data: Boolean(backup?.include_historian_data)
      };
      job.warnings = Array.isArray(backup?.warnings) ? backup.warnings : [];
      job.state = 'done';
      job.message = 'Backup ready.';
      job.percent = 100;
      job.finished_ms = Date.now();
    } catch (err) {
      job.state = 'error';
      job.message = 'Backup failed.';
      job.error = String(err?.message || err);
      job.percent = 100;
      job.finished_ms = Date.now();
    }
  });

  return job;
}

let _localAddrCache = null;
let _localAddrCacheMs = 0;

function getLocalAddressSet() {
  const now = Date.now();
  if (_localAddrCache && (now - _localAddrCacheMs) < 5000) return _localAddrCache;

  const set = new Set();
  set.add('::1');

  try {
    const ifs = os.networkInterfaces();
    Object.values(ifs || {}).forEach((arr) => {
      (arr || []).forEach((info) => {
        const a = String(info?.address || '').trim();
        if (a) set.add(a);
      });
    });
  } catch {
    // ignore
  }

  _localAddrCache = set;
  _localAddrCacheMs = now;
  return set;
}

function isLocalRequest(req) {
  const addr = String(req.socket?.remoteAddress || '').trim();
  if (!addr) return false;

  // IPv6 localhost
  if (addr === '::1') return true;

  // IPv4 localhost range
  if (addr.startsWith('127.')) return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.1.1)
  if (addr.startsWith('::ffff:')) {
    const v4 = addr.slice('::ffff:'.length);
    if (v4.startsWith('127.')) return true;
    return getLocalAddressSet().has(v4);
  }

  // Requests to this machine's own interfaces (common when browsing http://<hostname>:port locally)
  return getLocalAddressSet().has(addr);
}

function parseBasicAuth(headerValue) {
  const raw = String(headerValue || '');
  if (!raw.toLowerCase().startsWith('basic ')) return null;
  const b64 = raw.slice(6).trim();
  if (!b64) return null;
  let decoded = '';
  try { decoded = Buffer.from(b64, 'base64').toString('utf8'); } catch { return null; }
  const idx = decoded.indexOf(':');
  if (idx < 0) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

function timingSafeEqualStr(a, b) {
  const aa = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function isUiAuthed(req) {
  if (!UI_AUTH_ENABLED) return true;
  const creds = parseBasicAuth(req.headers['authorization']);
  if (!creds) return false;
  return timingSafeEqualStr(creds.user, UI_USER) && timingSafeEqualStr(creds.pass, UI_PASSWORD);
}

function requireUiAuth(req, res) {
  if (isUiAuthed(req)) return true;
  send(res, 401, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'WWW-Authenticate': 'Basic realm="opcbridge-scada"'
  }, 'Authentication required');
  return false;
}

function isAllowedOpcbridgePath(upstreamPathname) {
  if (upstreamPathname === '/' || upstreamPathname === '/dashboard' || upstreamPathname === '/editor') return true;
  if (upstreamPathname === '/health' || upstreamPathname === '/tags' || upstreamPathname === '/tags/query' || upstreamPathname === '/events') return true;
  if (upstreamPathname === '/alarms' || upstreamPathname === '/alarm-history') return true;
  if (upstreamPathname === '/info' || upstreamPathname === '/metadata' || upstreamPathname === '/metrics') return true;
  if (upstreamPathname === '/runtime/logs') return true;
  if (upstreamPathname === '/reload/status') return true;
  if (upstreamPathname.startsWith('/auth/')) return true;
  if (upstreamPathname.startsWith('/config/')) return true;
  if (upstreamPathname === '/reload' || upstreamPathname === '/reload/connection' || upstreamPathname === '/write') return true;
  return false;
}

function needsWriteToken(upstreamPathname) {
  return (
    upstreamPathname === '/reload' ||
    upstreamPathname === '/reload/connection' ||
    upstreamPathname === '/write' ||
    upstreamPathname === '/config/file' ||
    upstreamPathname === '/config/tags' ||
    upstreamPathname === '/config/tags/import_csv' ||
    upstreamPathname === '/config/bundle' ||
    upstreamPathname === '/config/delete' ||
    upstreamPathname === '/config/audio/upload' ||
    upstreamPathname === '/config/audio/delete' ||
    upstreamPathname === '/config/audio/move' ||
    upstreamPathname === '/config/audio/folder' ||
    upstreamPathname === '/config/audio/folder/delete' ||
    upstreamPathname === '/config/cert/upload'
  );
}

function upstreamTimeoutMs(prefixName, upstreamPathname, method) {
  const m = String(method || 'GET').toUpperCase();
  const p = String(upstreamPathname || '/');

  // Reads should be fast; keep defaults to detect real connectivity issues.
  if (m === 'GET' || m === 'HEAD') return 8000;

  // Some writes can legitimately take a long time (large tag lists, reload).
  if (prefixName === 'opcbridge') {
    if (p === '/reload') return 120000;
    if (p === '/reload/connection') return 120000;
    if (p === '/config/tags') return 120000;
    if (p === '/config/tags/import_csv') return 120000;
    if (p === '/config/bundle') return 120000;
    if (p.startsWith('/config/')) return 60000;
    if (p === '/write') return 30000;
  }
  if (prefixName === 'alarms') {
    if (p === '/alarm/api/voice-modem/test') return 180000;
    if (p === '/alarm/api/audio/test') return 60000;
    if (p === '/alarm/api/sip/test') return 180000;
    if (p === '/alarm/api/email/test') return 60000;
  }

  return 8000;
}

function upstreamRequestBodyLimitBytes(prefixName, upstreamPathname) {
  const p = String(upstreamPathname || '/');
  if (prefixName === 'opcbridge' && p === '/config/audio/upload') {
    // Backend accepts 50 MiB decoded audio. JSON + base64 adds about 33% overhead.
    return 80 * 1024 * 1024;
  }
  if (prefixName === 'opcbridge' && p === '/config/file') {
    // Large installs can write multi-megabyte configs (e.g. alarms.json with rules).
    // If this is too small, the proxy aborts and the browser reports a generic NetworkError.
    return 20 * 1024 * 1024;
  }
  if (prefixName === 'opcbridge' && p === '/config/tags/import_csv') {
    return 80 * 1024 * 1024;
  }
  if (prefixName === 'opcbridge' && p === '/config/tags') {
    // Large systems post the flattened tag list here. Current installs can exceed 3 MiB.
    return 80 * 1024 * 1024;
  }
  return 2 * 1024 * 1024;
}

async function proxy(req, res, target, prefixName) {
  const { scheme, host, port } = target;
  const client = scheme === 'https' ? https : http;

  const url = new URL(req.url, 'http://local');
  const upstreamPathname = url.pathname.replace(new RegExp(`^/api/${prefixName}`), '') || '/';

  if (prefixName === 'opcbridge' && !isAllowedOpcbridgePath(upstreamPathname)) {
    sendJson(res, 400, { ok: false, error: 'Blocked path', path: upstreamPathname });
    return;
  }

  const upstreamPath = upstreamPathname + url.search;

  const headers = {
    'Accept': req.headers['accept'] || '*/*'
  };

  // Forward browser cookies to opcbridge so cookie-based auth can work cross-app.
  if (req.headers['cookie']) {
    headers['Cookie'] = String(req.headers['cookie']);
  }

  // For most opcbridge requests we inject the admin token (server-side secret) so the browser never sees it.
  // But for /auth/* we must NOT inject it, otherwise every user looks "logged in" (service token would satisfy auth).
  if (prefixName === 'opcbridge' && ADMIN_TOKEN && !upstreamPathname.startsWith('/auth/')) {
    headers['X-Admin-Token'] = ADMIN_TOKEN;
  }

  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  let bodyBuf = null;
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      bodyBuf = await readBody(req, upstreamRequestBodyLimitBytes(prefixName, upstreamPathname));
    } catch (err) {
      const msg = String(err?.message || err);
      const tooLarge = msg.toLowerCase().includes('too large');
      sendJson(res, tooLarge ? 413 : 400, { ok: false, error: msg });
      return;
    }

    if (prefixName === 'opcbridge' && needsWriteToken(upstreamPathname)) {
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try {
          const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (!parsed.token && WRITE_TOKEN) parsed.token = WRITE_TOKEN;
            bodyBuf = Buffer.from(JSON.stringify(parsed));
            headers['Content-Type'] = 'application/json';
          }
        } catch {
          // leave as-is
        }
      }
    }

    headers['Content-Length'] = String(bodyBuf.length);
  }

  const opts = {
    host,
    port,
    method: req.method,
    path: upstreamPath,
    headers,
    timeout: upstreamTimeoutMs(prefixName, upstreamPathname, req.method)
  };

  const canRetry = prefixName === 'opcbridge' && (req.method === 'GET' || req.method === 'HEAD');
  const maxAttempts = canRetry ? 4 : 1;
  const retryDelayMs = 200;

  const sendAttempt = (attempt) => {
    const upstream = client.request(opts, (up) => {
      const outHeaders = {
        'Content-Type': up.headers['content-type'] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      };
      // Allow opcbridge to set cookies (SSO).
      if (up.headers['set-cookie']) outHeaders['Set-Cookie'] = up.headers['set-cookie'];
      res.writeHead(up.statusCode || 502, outHeaders);
      up.pipe(res);
    });

    upstream.on('timeout', () => {
      upstream.destroy(new Error('upstream timeout'));
    });

    upstream.on('error', (err) => {
      const code = String(err?.code || '').toUpperCase();
      const retryable = canRetry && (code === 'ECONNREFUSED' || code === 'ECONNRESET' || String(err?.message || '').includes('upstream timeout'));
      if (retryable && attempt < maxAttempts && !res.headersSent) {
        setTimeout(() => sendAttempt(attempt + 1), retryDelayMs);
        return;
      }
      if (!res.headersSent) {
        sendJson(res, 502, { ok: false, error: String(err.message || err), attempts: attempt });
      } else {
        res.destroy(err);
      }
    });

    if (bodyBuf) upstream.end(bodyBuf);
    else upstream.end();
  };

  sendAttempt(1);
}

const server = http.createServer(async (req, res) => {
  const cfg = readConfig();
  const url = new URL(req.url, 'http://local');
  // Logger is the canonical component name. Keep the former API prefix as an
  // implementation-level compatibility alias for existing SCADA clients.
  if (url.pathname === '/api/logger' || url.pathname.startsWith('/api/logger/')) {
    url.pathname = url.pathname.replace(/^\/api\/logger/, '/api/reporter');
  }

  if (!requireUiAuth(req, res)) return;

  async function requireViewLogsPerm() {
    let status = null;
    try {
      status = await fetchOpcbridgeAuthStatus(req, cfg);
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
      return null;
    }
    if (!authStatusHasPerm(status, 'suite.view_logs')) {
      sendJson(res, 403, { ok: false, error: 'Insufficient permissions (suite.view_logs required).' });
      return null;
    }
    return status;
  }

  async function requireManageServerPerm() {
    let status = null;
    try {
      status = await fetchOpcbridgeAuthStatus(req, cfg);
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
      return null;
    }
    if (!authStatusHasPerm(status, 'suite.manage_server')) {
      sendJson(res, 403, { ok: false, error: 'Insufficient permissions (suite.manage_server required).' });
      return null;
    }
    return status;
  }

  async function requireProjectBackupPerm() {
    let status = null;
    try {
      status = await fetchOpcbridgeAuthStatus(req, cfg);
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
      return null;
    }
    if (!authStatusHasPerm(status, 'opcbridge.edit_config') && !authStatusHasPerm(status, 'suite.manage_server')) {
      sendJson(res, 403, { ok: false, error: 'Insufficient permissions (opcbridge.edit_config required).' });
      return null;
    }
    return status;
  }

  async function requireReportsPerm() {
    let status = null;
    try {
      status = await fetchOpcbridgeAuthStatus(req, cfg);
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
      return null;
    }
    if (!authStatusHasPerm(status, 'reports.access') &&
        !authStatusHasPerm(status, 'reports.create') &&
        !authStatusHasPerm(status, 'reports.administer')) {
      sendJson(res, 403, { ok: false, error: 'Insufficient report permissions.' });
      return null;
    }
    return status;
  }

  async function requireReportDesignerPerm() {
    const status = await requireReportsPerm();
    if (!status) return null;
    const canDesign = authStatusHasPerm(status, 'reports.create') ||
      authStatusHasPerm(status, 'reports.administer') ||
      readReportDefinitions().some((report) => {
        const grant = reportGrant(report, status);
        return grant.edit || grant.manage;
      });
    if (!canDesign) {
      sendJson(res, 403, { ok: false, error: 'No report design permission is assigned.' });
      return null;
    }
    return status;
  }

  async function requireDataEntryPerm(administer = false, allowPublicForm = null) {
    let status = null;
    try { status = await fetchOpcbridgeAuthStatus(req, cfg); }
    catch (err) { sendJson(res, 502, { ok: false, error: String(err.message || err) }); return null; }
    if (allowPublicForm && allowPublicForm.hmi_enabled === true && allowPublicForm.require_login === false) return status || {};
    const allowed = authStatusHasPerm(status, 'data_entry.administer') || (!administer && authStatusHasPerm(status, 'data_entry.access'));
    if (!allowed) { sendJson(res, authStatusIsLoggedIn(status) ? 403 : 401, { ok: false, error: 'Insufficient data-entry permissions.' }); return null; }
    return status;
  }

  if (url.pathname === '/api/logs/query') {
    if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    if (!await requireViewLogsPerm()) return;
    const source = String(url.searchParams.get('source') || 'systemd').trim();
    const limit = Math.max(1, Math.min(5000, Math.trunc(Number(url.searchParams.get('limit') || 400) || 400)));
    const sinceMs = Math.max(0, Math.trunc(Number(url.searchParams.get('since_ms') || 0) || 0));
    const untilMs = Math.max(0, Math.trunc(Number(url.searchParams.get('until_ms') || 0) || 0));
    const search = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const connection = String(url.searchParams.get('connection_id') || '').trim();
    const tag = String(url.searchParams.get('tag') || '').trim();
    const alarmId = String(url.searchParams.get('alarm_id') || '').trim();
    const types = String(url.searchParams.get('types') || '').trim();
    const group = String(url.searchParams.get('group') || '').trim(); const site = String(url.searchParams.get('site') || '').trim(); const severity = String(url.searchParams.get('severity') || '').trim();
    const user = String(url.searchParams.get('user') || '').trim();
    const resultFilter = String(url.searchParams.get('result') || '').trim();
    const records = [];
    const pushRecord = (record) => {
      const next = { timestamp_ms: Number(record.timestamp_ms || 0), source, type: String(record.type || ''),
        subject: String(record.subject || ''), message: String(record.message || ''), details: record.details || {}, raw: record.raw ?? record.details ?? null };
      if (sinceMs && next.timestamp_ms < sinceMs) return;
      if (untilMs && next.timestamp_ms > untilMs) return;
      if (search && !JSON.stringify(next).toLowerCase().includes(search)) return;
      records.push(next);
    };
    try {
      if (source === 'systemd') {
        if (!SYSTEMD_ENABLED) throw new Error('Systemd management is disabled.');
        const allowedUnits = new Set(['opcbridge.service','opcbridge-alarms.service','opcbridge-logger.service','opcbridge-historian.service','opcbridge-report.service','opcbridge-hmi.service','opcbridge-scada.service']);
        const unit = String(url.searchParams.get('unit') || 'opcbridge.service').trim(); if (!allowedUnits.has(unit)) throw new Error('Unsupported systemd unit.');
        const args = ['-u', unit, '-n', String(limit), '--no-pager', '-o', 'json'];
        if (sinceMs) args.push('--since', `@${Math.floor(sinceMs / 1000)}`);
        if (untilMs) args.push('--until', `@${Math.ceil(untilMs / 1000)}`);
        const result = child_process.spawnSync('journalctl', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
        if (result.error || result.status !== 0) throw new Error(String(result.error?.message || result.stderr || 'journalctl failed').trim());
        String(result.stdout || '').split(/\r?\n/).filter(Boolean).forEach((line) => { try { const row = JSON.parse(line); const priority = Number(row.PRIORITY ?? 6);
          pushRecord({ timestamp_ms: Math.trunc(Number(row.__REALTIME_TIMESTAMP || 0) / 1000), type: ['emergency','alert','critical','error','warning','notice','info','debug'][priority] || 'info',
            subject: unit, message: row.MESSAGE || '', details: { unit, pid: row._PID || '', identifier: row.SYSLOG_IDENTIFIER || '' }, raw: row }); } catch { /* skip malformed journal row */ } });
      } else if (source === 'opcbridge_runtime') {
        const up = await fetchUpstreamJson(req, cfg.opcbridge, `/runtime/logs?limit=${encodeURIComponent(String(limit))}`, { timeoutMs: 8000 });
        if (up.status < 200 || up.status >= 300) throw new Error(`OPCBridge HTTP ${up.status}`);
        (Array.isArray(up.json?.entries) ? up.json.entries : []).forEach((row) => pushRecord({ timestamp_ms: row.timestamp_ms, type: row.level || 'info', subject: row.component || 'OPCBridge', message: row.message || '', details: row, raw: row }));
      } else if (source === 'tracked_tag_events') {
        const params = new URLSearchParams({ limit: String(limit) }); if (sinceMs) params.set('since_ms', String(sinceMs)); if (untilMs) params.set('until_ms', String(untilMs)); if (connection) params.set('connection_id', connection); if (tag) params.set('tag', tag);
        const up = await fetchUpstreamJson(req, cfg.opcbridge, `/events?${params}`, { timeoutMs: 12000 }); if (up.status < 200 || up.status >= 300) throw new Error(`OPCBridge HTTP ${up.status}`);
        (Array.isArray(up.json?.events) ? up.json.events : []).forEach((row) => pushRecord({ timestamp_ms: row.timestamp_ms, type: 'tag_change', subject: `${row.connection_id || ''}/${row.tag_name || ''}`,
          message: `${row.old_value ?? ''} → ${row.new_value ?? ''}`, details: row, raw: row }));
      } else if (source === 'alarm_history') {
        const params = new URLSearchParams({ limit: String(limit) }); if (sinceMs) params.set('since_ms', String(sinceMs)); if (untilMs) params.set('until_ms', String(untilMs)); if (connection) params.set('connection_id', connection); if (tag) params.set('tag', tag); if (alarmId) params.set('alarm_id', alarmId); if (types) params.set('types', types); if (group) params.set('group', group); if (site) params.set('site', site); if (severity) params.set('severity', severity);
        const up = await fetchUpstreamJson(req, cfg.alarms, `/alarm/api/alarms/history?${params}`, { timeoutMs: 12000 }); if (up.status < 200 || up.status >= 300) throw new Error(`Alarm server HTTP ${up.status}`);
        (Array.isArray(up.json?.events) ? up.json.events : []).forEach((row) => { const alarmSource = row.source || {}; const fallback = [row.group, row.site, alarmSource.connection_id, alarmSource.tag].filter(Boolean).join(' / ');
          pushRecord({ timestamp_ms: row.ts_ms, type: row.type || 'alarm', subject: row.alarm_id || '', message: row.message || fallback || `value=${JSON.stringify(row.value)}`, details: row, raw: row }); });
      } else if (source === 'hmi_audit') {
        const params = new URLSearchParams({ limit: String(limit) }); if (sinceMs) params.set('start', new Date(sinceMs).toISOString()); if (untilMs) params.set('end', new Date(untilMs).toISOString()); if (connection) params.set('connection_id', connection); if (tag) params.set('tag', tag); if (user) params.set('user', user); if (resultFilter) params.set('result', resultFilter); if (search) params.set('q', search);
        const up = await fetchUpstreamJson(req, cfg.hmi, `/api/audit/query?${params}`, { timeoutMs: 12000 }); if (up.status < 200 || up.status >= 300) throw new Error(`HMI HTTP ${up.status}`);
        (Array.isArray(up.json?.events) ? up.json.events : []).forEach((row) => pushRecord({ timestamp_ms: Date.parse(row.ts || '') || Number(row.timestamp_ms || 0), type: row.event_type || row.event || row.action || 'audit',
          subject: row.user || row.object_label || row.tag || '', message: row.error || row.path || row.ref || `${row.connection_id || ''}${row.tag ? ` / ${row.tag}` : ''}`, details: row, raw: row }));
      } else throw new Error(`Unsupported log source: ${source}`);
      records.sort((a, b) => b.timestamp_ms - a.timestamp_ms);
      sendJson(res, 200, { ok: true, source, matched: records.length, records: records.slice(0, limit) });
    } catch (err) { sendJson(res, 200, { ok: false, source, error: String(err.message || err), records: [] }); }
    return;
  }

  // Read system logs via journalctl (permission: suite.view_logs).
  if (url.pathname === '/api/logs') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    if (!SYSTEMD_ENABLED) {
      sendJson(res, 200, { ok: false, error: 'Systemd management disabled in opcbridge-scada.' });
      return;
    }

    if (!await requireViewLogsPerm()) return;

    const allowedUnits = new Set([
      'opcbridge.service',
      'opcbridge-alarms.service',
      'opcbridge-hmi.service',
      'opcbridge-scada.service'
    ]);

    const unit = String(url.searchParams.get('unit') || 'opcbridge.service').trim();
    if (!allowedUnits.has(unit)) {
      sendJson(res, 400, { ok: false, error: 'Unsupported unit.', allowed: Array.from(allowedUnits) });
      return;
    }

    const lines = Math.max(10, Math.min(5000, Math.trunc(Number(url.searchParams.get('lines') || '400') || 400)));

    const r = child_process.spawnSync('journalctl', ['-u', unit, '-n', String(lines), '--no-pager', '-o', 'short-iso'], {
      encoding: 'utf8'
    });

    if (r.error) {
      // Common causes:
      // - journalctl missing (ENOENT)
      // - insufficient permissions to read system journal
      const msg = String(r.error.message || r.error);
      const hint =
        msg.includes('ENOENT') || msg.toLowerCase().includes('not found')
          ? 'journalctl not found. Install systemd/journalctl on this host, or disable Logs tab.'
          : 'Permission denied reading system journal. Run opcbridge-scada as root or add its user to group systemd-journal (then restart the service).';
      sendJson(res, 200, { ok: false, error: msg, hint, unit, lines });
      return;
    }
    if (r.status !== 0) {
      const stderr = String(r.stderr || '').trim();
      const hint = stderr.toLowerCase().includes('permission denied')
        ? 'Permission denied reading system journal. Run opcbridge-scada as root or add its user to group systemd-journal (then restart the service).'
        : 'journalctl returned a non-zero status. Check that the unit exists and journald is available.';
      sendJson(res, 200, { ok: false, error: 'journalctl failed', hint, unit, lines, status: r.status, stderr });
      return;
    }

    sendJson(res, 200, { ok: true, unit, lines, text: String(r.stdout || '') });
    return;
  }

  // Application logs (non-systemd):
  // - opcbridge alarms/events sqlite log (via /alarms/events)
  // - alarm server alarm history (via /alarm/api/alarms/history)
  // - HMI audit log (via /api/audit/tail)
  if (url.pathname === '/api/logs/source') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

    if (!await requireViewLogsPerm()) return;

    const source = String(url.searchParams.get('source') || '').trim();
    const nRaw = url.searchParams.get('limit') || url.searchParams.get('lines') || '400';
    const n = Math.max(10, Math.min(5000, Math.trunc(Number(nRaw) || 400)));

    try {
      if (source === 'opcbridge_runtime') {
        const path = `/runtime/logs?limit=${encodeURIComponent(String(n))}`;
        const up = await fetchUpstreamJson(req, cfg.opcbridge, path, { timeoutMs: 8000 });
        if (up.status < 200 || up.status >= 300) {
          sendJson(res, 200, { ok: false, error: `OPCBridge HTTP ${up.status}`, source, details: up.json });
          return;
        }
        const entries = Array.isArray(up.json?.entries) ? up.json.entries : [];
        const text = entries.map((entry) => {
          const ts = Number(entry?.timestamp_ms || 0);
          const iso = ts > 0 ? new Date(ts).toLocaleString() : '';
          const level = String(entry?.level || 'info').toUpperCase();
          const component = String(entry?.component || 'OPCBridge');
          const message = String(entry?.message || '');
          return `${iso} ${level} [${component}] ${message}`.trim();
        }).join('\n');
        sendJson(res, 200, { ok: true, source, lines: n, format: 'text', text });
        return;
      }

      if (source === 'opcbridge_events') {
        const path = `/alarms/events?limit=${encodeURIComponent(String(n))}`;
        const up = await fetchUpstreamJson(req, cfg.opcbridge, path, { timeoutMs: 8000 });
        if (up.status < 200 || up.status >= 300) {
          sendJson(res, 200, { ok: false, error: `OPCBridge HTTP ${up.status}`, source, details: up.json });
          return;
        }
        sendJson(res, 200, { ok: true, source, lines: n, format: 'json', text: JSON.stringify(up.json || {}, null, 2) });
        return;
      }

      if (source === 'alarm_server_history') {
        const path = `/alarm/api/alarms/history?limit=${encodeURIComponent(String(n))}`;
        const up = await fetchUpstreamJson(req, cfg.alarms, path, { timeoutMs: 8000 });
        if (up.status < 200 || up.status >= 300) {
          sendJson(res, 200, { ok: false, error: `alarm server HTTP ${up.status}`, source, details: up.json });
          return;
        }
        sendJson(res, 200, { ok: true, source, lines: n, format: 'json', text: JSON.stringify(up.json || {}, null, 2) });
        return;
      }

      if (source === 'hmi_audit') {
        const path = `/api/audit/tail?lines=${encodeURIComponent(String(n))}`;
        const up = await fetchUpstreamJson(req, cfg.hmi, path, { timeoutMs: 8000 });
        if (up.status < 200 || up.status >= 300) {
          sendJson(res, 200, { ok: false, error: `hmi HTTP ${up.status}`, source, details: up.json });
          return;
        }
        sendJson(res, 200, { ok: true, source, lines: n, format: 'json', text: JSON.stringify(up.json || {}, null, 2) });
        return;
      }

      sendJson(res, 400, { ok: false, error: 'Unsupported source.', source, allowed: ['opcbridge_runtime', 'opcbridge_events', 'alarm_server_history', 'hmi_audit'] });
    } catch (err) {
      sendJson(res, 200, { ok: false, error: String(err.message || err), source });
    }
	    return;
	  }

  if (url.pathname === '/api/hmi-audit/query') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireViewLogsPerm()) return;
    try {
      const up = await fetchUpstreamJson(req, cfg.hmi, `/api/audit/query${url.search}`, { timeoutMs: 12000 });
      sendJson(res, up.status || 502, up.json || { ok: false, error: 'Empty HMI audit response.' });
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/hmi-audit/csv') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireViewLogsPerm()) return;
    try {
      const up = await fetchUpstreamRaw(req, cfg.hmi, `/api/audit/csv${url.search}`, { timeoutMs: 12000, accept: 'text/csv' });
      send(res, up.status || 502, {
        'Content-Type': up.headers['content-type'] || 'text/csv; charset=utf-8',
        'Content-Disposition': up.headers['content-disposition'] || 'attachment; filename="hmi-audit.csv"',
        'Cache-Control': 'no-store'
      }, up.body || Buffer.alloc(0));
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Check if an MQTT CA certificate exists on opcbridge (admin-gated).
  if (url.pathname === '/api/opcbridge/cert/status') {
    if (!ADMIN_TOKEN) {
      sendJson(res, 400, { ok: false, error: 'OPCBridge admin token not configured on SCADA server.' });
      return;
    }
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const { scheme, host, port } = cfg.opcbridge;
    const client = scheme === 'https' ? https : http;

    const opts = {
      host,
      port,
      method: 'GET',
      path: '/config/cert/download',
      headers: {
        'X-Admin-Token': ADMIN_TOKEN,
        'Accept': 'application/x-pem-file'
      },
      timeout: 5000
    };

    const upstream = client.request(opts, (up) => {
      const status = up.statusCode || 502;
      let size = 0;
      up.on('data', (chunk) => { size += chunk.length; });
      up.on('end', () => {
        if (status === 200) {
          sendJson(res, 200, { ok: true, exists: true, size_bytes: size });
          return;
        }
        if (status === 404) {
          sendJson(res, 200, { ok: true, exists: false });
          return;
        }

        // Pass through the error body (likely JSON)
        sendJson(res, 200, { ok: false, exists: false, status });
      });
    });

    upstream.on('timeout', () => upstream.destroy(new Error('upstream timeout')));
    upstream.on('error', (err) => sendJson(res, 502, { ok: false, error: String(err.message || err) }));
    upstream.end();
    return;
  }

  if (url.pathname === '/api/config') {
    sendJson(res, 200, {
      ok: true,
      service: 'opcbridge-scada',
      suite_version: SUITE_VERSION,
      component_version: COMPONENT_VERSION,
      config: {
        listen: { host: cfg.listen.host, port: cfg.listen.port },
        refresh_ms: cfg.refresh_ms,
        opcbridge: { host: cfg.opcbridge.host, port: cfg.opcbridge.port, scheme: cfg.opcbridge.scheme },
        alarms: { host: cfg.alarms.host, port: cfg.alarms.port, scheme: cfg.alarms.scheme },
        hmi: { host: cfg.hmi.host, port: cfg.hmi.port, scheme: cfg.hmi.scheme }
      },
      auth: {
        admin_token_configured: Boolean(ADMIN_TOKEN),
        write_token_configured: Boolean(WRITE_TOKEN),
        ui_auth_enabled: UI_AUTH_ENABLED
      }
    });
    return;
  }

  if (url.pathname === '/api/components/status') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const [opcbridge, alarms, logger, historian, hmi, flow] = await Promise.all([
      configuredServiceJsonRequest(cfg.opcbridge, '/health'),
      configuredServiceJsonRequest(cfg.alarms, '/alarm/api/status'),
      reporterApiRequest('GET', '/health', null, 3000),
      historianApiRequest('GET', '/health', null, 3000),
      configuredServiceJsonRequest(cfg.hmi, '/api/version'),
      flowApiRequest('GET', '/health', null, 3000)
    ]);
    const component = (id, name, response, versionKeys = ['component_version', 'version']) => {
      const body = response?.json || {};
      const version = versionKeys.map((key) => String(body?.[key] || '').trim()).find(Boolean) || '';
      const suiteVersion = String(body?.suite_version || '').trim();
      const reachable = Number(response?.status || 0) >= 200 && Number(response?.status || 0) < 300;
      const healthy = body?.ok !== false && String(body?.status || '').toLowerCase() !== 'error';
      return { id, name, version, suite_version: suiteVersion, status: reachable ? (healthy ? 'running' : 'degraded') : 'unavailable' };
    };
    const readInstalledVersion = (filePath) => fs.existsSync(filePath) ? readVersionFile(filePath) : '';
    const components = [
      component('opcbridge', 'OPCBridge', opcbridge),
      component('alarms', 'Alarms', alarms),
      { id: 'scada', name: 'SCADA', version: COMPONENT_VERSION, suite_version: SUITE_VERSION, status: 'running' },
      component('hmi', 'HMI', hmi),
      component('logger', 'Logger', logger),
      component('historian', 'Historian', historian),
      component('flow', 'Flow', flow),
      { id: 'report', name: 'Report', version: readInstalledVersion(path.join(SUITE_PREFIX, 'report', 'VERSION')),
        suite_version: SUITE_VERSION, status: fs.existsSync(path.join(SUITE_PREFIX, 'report', 'opcbridge-report')) ? 'installed' : 'unavailable' }
    ];
    sendJson(res, 200, { ok: true, suite_version: SUITE_VERSION, components });
    return;
  }

  if (url.pathname === '/api/flow/status' || url.pathname === '/api/flow/flows' || url.pathname.startsWith('/api/flow/flows/')) {
    if (!await requireManageServerPerm()) return;
    let method = req.method;
    let upstreamPath = url.pathname === '/api/flow/status' ? '/health' : url.pathname.slice('/api/flow'.length);
    let body = null;
    if (method === 'POST') {
      try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); }
      catch (err) { sendJson(res, 400, { ok: false, error: `Invalid JSON: ${err.message}` }); return; }
      if (/\/delete$/.test(upstreamPath)) {
        upstreamPath = upstreamPath.replace(/\/delete$/, '');
        method = 'DELETE';
        body = null;
      }
    }
    if (!['GET', 'POST', 'DELETE'].includes(method)) {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const result = await flowApiRequest(method, upstreamPath, body, 15000);
    sendJson(res, result.ok ? 200 : (result.status >= 400 && result.status < 500 ? result.status : 502),
      result.json || { ok: false, error: result.error || 'Flow service unavailable' });
    return;
  }

  if (url.pathname === '/api/scada/auth-admin') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireManageServerPerm()) return;
    sendJson(res, 200, {
      ok: true,
      auth: {
        admin_token_configured: Boolean(ADMIN_TOKEN),
        write_token_configured: Boolean(WRITE_TOKEN),
        ui_auth_enabled: UI_AUTH_ENABLED
      },
      tokens: {
        admin_token: String(ADMIN_TOKEN || ''),
        write_token: String(WRITE_TOKEN || '')
      }
    });
    return;
  }

  if (url.pathname === '/api/scada/config') {
    if (req.method === 'GET') {
      sendJson(res, 200, { ok: true, config: cfg, config_path: CONFIG_PATH, local_only: !ALLOW_REMOTE_SCADA_CONFIG });
      return;
    }
    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const before = readConfig();
        const next = normalizeScadaConfig(parsed?.config || parsed);
        writeConfigFile(next);
        const restartRequired = (before.listen.host !== next.listen.host) || (before.listen.port !== next.listen.port);
        sendJson(res, 200, { ok: true, config: next, restart_required: restartRequired });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/opcbridge/mqtt/test') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const incoming = parsed?.config || parsed;
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
        sendJson(res, 400, { ok: false, error: 'Invalid JSON body; expected {config:{...}}.' });
        return;
      }
      const cfg = normalizeMqttConfig(incoming, {});
      // Inline PEM values are accepted only by this transient connection test.
      // They are intentionally excluded by normalizeMqttConfig so they can
      // never be persisted in mqtt.json or returned to the browser.
      for (const key of ['ca_pem', 'cert_pem', 'key_pem']) {
        if (typeof incoming[key] === 'string' && incoming[key]) cfg[key] = incoming[key];
      }
      const result = await mqttTestConnection(cfg);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Read/write opcbridge-logger config on the SCADA server.
  // NOTE: do not return mysql_password to the browser; indicate if it is set.
  if (url.pathname === '/api/reporter/config') {
    if (!await requireManageServerPerm()) return;
    if (req.method === 'GET') {
      const onDisk = readJsonFileOrNull(REPORTER_CONFIG_PATH) || readJsonFileOrNull(REPORTER_CONFIG_EXAMPLE_PATH) || {};
      const mysqlPassword = (typeof onDisk.mysql_password === 'string') ? onDisk.mysql_password : '';
      const safe = { ...onDisk };
      delete safe.mysql_password;
      sendJson(res, 200, { ok: true, config_path: REPORTER_CONFIG_PATH, config: safe, mysql_password_set: Boolean(mysqlPassword) });
      return;
    }

    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const incoming = parsed?.config || parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          sendJson(res, 400, { ok: false, error: 'Invalid JSON body; expected {config:{...}}.' });
          return;
        }

        const prev = readJsonFileOrNull(REPORTER_CONFIG_PATH) || {};
        const next = { ...prev, ...incoming };

        // Only update password if explicitly provided and non-empty.
        if (typeof incoming.mysql_password === 'string' && String(incoming.mysql_password).trim()) {
          next.mysql_password = String(incoming.mysql_password);
        } else if (typeof prev.mysql_password === 'string' && prev.mysql_password) {
          next.mysql_password = prev.mysql_password;
        } else {
          delete next.mysql_password;
        }

        writeJsonFile(REPORTER_CONFIG_PATH, next);

        const safe = { ...next };
        delete safe.mysql_password;
        sendJson(res, 200, { ok: true, config_path: REPORTER_CONFIG_PATH, config: safe, mysql_password_set: Boolean(next.mysql_password) });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  // Capabilities for opcbridge-logger integrations (used by SCADA UI).
  // Permissions: suite.manage_server
  if (url.pathname === '/api/reporter/capabilities') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    sendJson(res, 200, { ok: true, capabilities: REPORTER_CAPABILITIES });
    return;
  }

  // Read/write database connection profiles for opcbridge-logger.
  // Permissions: suite.manage_server
  if (url.pathname === '/api/reporter/databases') {
    if (!await requireManageServerPerm()) return;

    if (req.method === 'GET') {
      const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
      const raw = Array.isArray(root?.databases) ? root.databases : [];
      const databases = raw
        .filter((d) => d && typeof d === 'object' && !Array.isArray(d))
        .map((d) => {
          const safe = { ...d };
          const type = String(safe.type || 'mysql').trim() || 'mysql';
          let pw = '';
          if (type === 'odbc') {
            pw = (typeof safe.odbc_password === 'string') ? safe.odbc_password : '';
            delete safe.odbc_password;
          } else {
            pw = (typeof safe.mysql_password === 'string') ? safe.mysql_password : '';
            delete safe.mysql_password;
          }
          safe.password_set = Boolean(pw);
          safe.mysql_password_set = safe.password_set; // backwards-compatible UI field
          return safe;
        });
      sendJson(res, 200, { ok: true, path: REPORTER_DATABASES_PATH, databases });
      return;
    }

    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const incoming = parsed?.database || parsed?.db || parsed?.config || parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          sendJson(res, 400, { ok: false, error: 'Invalid JSON body; expected {database:{...}}.' });
          return;
        }

        const requestedId = String(incoming.id || '').trim();
        let originalId = String(parsed?.original_id || incoming.original_id || '').trim();
        const name = String(incoming.name || '').trim();
        if (!name) throw new Error('Database name is required.');

        const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
        const raw = Array.isArray(root?.databases) ? root.databases : [];
        const nextList = raw
          .filter((d) => d && typeof d === 'object' && !Array.isArray(d))
          .map((d) => ({ ...d }));
        if (!originalId && requestedId && nextList.some((d) => String(d?.id || '').trim() === requestedId)) originalId = requestedId;

        const idx = originalId ? nextList.findIndex((d) => String(d.id || '').trim() === originalId) : -1;
        if (originalId && idx < 0) throw new Error('The database connection being edited no longer exists.');
        const usedIds = new Set(nextList.map((d) => String(d?.id || '').trim()).filter(Boolean));
        const id = idx >= 0 ? String(nextList[idx]?.id || '').trim() : uniqueOpaqueId('db', usedIds);
        const prev = idx >= 0 ? nextList[idx] : {};
        const next = { ...prev, ...incoming, id };
        next.name = name;
        delete next.original_id;

        // Password behavior:
        // - If password is provided and non-empty -> set it (type-specific field).
        // - If clear_password=true -> remove it (type-specific field).
        // - Else -> keep existing.
        const clearPw = Boolean(incoming.clear_password);
        const type = String(next.type || 'mysql').trim() || 'mysql';
        const pwField = (type === 'odbc') ? 'odbc_password' : 'mysql_password';
        const incomingPw = (typeof incoming[pwField] === 'string') ? String(incoming[pwField]).trim() : '';
        if (clearPw) {
          delete next[pwField];
        } else if (incomingPw) {
          next[pwField] = String(incoming[pwField]);
        } else if (typeof prev[pwField] === 'string' && prev[pwField]) {
          next[pwField] = prev[pwField];
        } else {
          delete next[pwField];
        }

        // Basic normalization defaults (MySQL only for now).
        next.type = type;
        if (next.mysql_port != null) next.mysql_port = Math.trunc(Number(next.mysql_port) || 0) || 0;
        if (next.odbc_port != null) next.odbc_port = Math.trunc(Number(next.odbc_port) || 0) || 0;
        next.monitor_enabled = Boolean(next.monitor_enabled);
        next.monitor_interval_sec = Math.max(5, Math.trunc(Number(next.monitor_interval_sec || 60) || 60));
        next.monitor_timeout_sec = Math.max(1, Math.trunc(Number(next.monitor_timeout_sec || 10) || 10));
        next.monitor_query = String(next.monitor_query || 'SELECT 1').trim() || 'SELECT 1';

        if (idx >= 0) nextList[idx] = next;
        else nextList.push(next);

        writeJsonFile(REPORTER_DATABASES_PATH, { databases: nextList });

        let reports_updated = 0;
        let data_checks_updated = 0;
        let sync_jobs_updated = 0;
        if (originalId && originalId !== id && idx >= 0) {
          const reports = readReporterReportsRaw().map((r) => ({ ...r }));
          for (const r of reports) {
            if (String(r.database_id || '').trim() === originalId) {
              r.database_id = id;
              reports_updated += 1;
            }
          }
          if (reports_updated > 0) writeJsonFile(REPORTER_REPORTS_PATH, { reports });

          const checks = readReporterDataChecksRaw().map((c) => ({ ...c }));
          for (const c of checks) {
            if (String(c.database_id || '').trim() === originalId) {
              c.database_id = id;
              data_checks_updated += 1;
            }
          }
          if (data_checks_updated > 0) writeJsonFile(REPORTER_DATA_CHECKS_PATH, { data_checks: checks });

          const syncJobs = readReporterSyncJobsRaw().map((job) => ({ ...job }));
          for (const job of syncJobs) {
            if (String(job.source_database_id || '').trim() === originalId) { job.source_database_id = id; sync_jobs_updated += 1; }
            if (String(job.destination_database_id || '').trim() === originalId) { job.destination_database_id = id; sync_jobs_updated += 1; }
          }
          if (sync_jobs_updated > 0) writeJsonFile(REPORTER_SYNC_JOBS_PATH, { sync_jobs: syncJobs });
        }

        const safe = { ...next };
        const safeType = String(safe.type || 'mysql').trim() || 'mysql';
        let pw = '';
        if (safeType === 'odbc') {
          pw = (typeof safe.odbc_password === 'string') ? safe.odbc_password : '';
          delete safe.odbc_password;
        } else {
          pw = (typeof safe.mysql_password === 'string') ? safe.mysql_password : '';
          delete safe.mysql_password;
        }
        safe.password_set = Boolean(pw);
        safe.mysql_password_set = safe.password_set; // backwards-compatible UI field
        const reload = await reporterApiRequest('POST', '/reload');
        sendJson(res, 200, { ok: true, path: REPORTER_DATABASES_PATH, database: safe, renamed_from: originalId && originalId !== id ? originalId : '', reports_updated, data_checks_updated, sync_jobs_updated, reporter_reload: reload });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/reporter/databases/delete') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = String(parsed?.id || '').trim();
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
      const raw = Array.isArray(root?.databases) ? root.databases : [];
      const before = raw.length;
      const afterList = raw.filter((d) => String(d?.id || '').trim() !== id);
      if (afterList.length === before) {
        sendJson(res, 200, { ok: true, deleted: false, id });
        return;
      }
      writeJsonFile(REPORTER_DATABASES_PATH, { databases: afterList });
      const reload = await reporterApiRequest('POST', '/reload');
      sendJson(res, 200, { ok: true, deleted: true, id, reporter_reload: reload });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/databases/duplicate') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = String(parsed?.id || '').trim();
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
      const raw = Array.isArray(root?.databases) ? root.databases : [];
      const nextList = raw
        .filter((d) => d && typeof d === 'object' && !Array.isArray(d))
        .map((d) => ({ ...d }));
      const source = nextList.find((d) => String(d?.id || '').trim() === id);
      if (!source) {
        sendJson(res, 404, { ok: false, error: `Database '${id}' not found.` });
        return;
      }

      const used = new Set(nextList.map((d) => String(d?.id || '').trim()).filter(Boolean));
      const newId = uniqueOpaqueId('db', used);
      const next = JSON.parse(JSON.stringify(source));
      next.id = newId;
      next.name = copyName(next.name || source.name || id);
      nextList.push(next);
      writeJsonFile(REPORTER_DATABASES_PATH, { databases: nextList });
      const reload = await reporterApiRequest('POST', '/reload');
      const safe = { ...next };
      const type = String(safe.type || 'mysql').trim() || 'mysql';
      const pwField = (type === 'odbc') ? 'odbc_password' : 'mysql_password';
      const pw = (typeof safe[pwField] === 'string') ? safe[pwField] : '';
      delete safe[pwField];
      safe.password_set = Boolean(pw);
      safe.mysql_password_set = safe.password_set;
      sendJson(res, 200, { ok: true, path: REPORTER_DATABASES_PATH, source_id: id, id: newId, database: safe, reporter_reload: reload });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Read/write scheduled log-job definitions for opcbridge-logger.
  // Permissions: suite.manage_server
  if (url.pathname === '/api/reporter/reports') {
    if (!await requireManageServerPerm()) return;

    if (req.method === 'GET') {
      const raw = readReporterReportsRaw();
      const reports = raw.map((r) => ({ ...r }));
      sendJson(res, 200, { ok: true, path: REPORTER_REPORTS_PATH, reports });
      return;
    }

    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const incoming = parsed?.report || parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          sendJson(res, 400, { ok: false, error: 'Invalid JSON body; expected {report:{...}}.' });
          return;
        }

        const requestedId = sanitizeId(incoming.id);
        let originalId = sanitizeId(parsed?.original_id || incoming.original_id || '');
        const name = String(incoming.name || '').trim();
        if (!name) throw new Error('Log job name is required.');

        const root = readJsonFileOrNull(REPORTER_REPORTS_PATH) || { reports: [] };
        const rawList = Array.isArray(root?.reports) ? root.reports : [];
        const nextList = rawList
          .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
          .map((r) => ({ ...r }));
        if (!originalId && requestedId && nextList.some((r) => sanitizeId(r?.id) === requestedId)) originalId = requestedId;

        const idx = originalId ? nextList.findIndex((r) => sanitizeId(r.id) === originalId) : -1;
        if (originalId && idx < 0) throw new Error('The log job being edited no longer exists.');
        const usedIds = new Set(nextList.map((r) => sanitizeId(r?.id)).filter(Boolean));
        const id = idx >= 0 ? sanitizeId(nextList[idx]?.id) : uniqueOpaqueId('log', usedIds);
        const prev = idx >= 0 ? nextList[idx] : {};

        const next = { ...prev, ...incoming, id };
        delete next.original_id;
        next.name = name;
        next.mode = String(next.mode || 'scheduled').trim() || 'scheduled';
        next.database_id = sanitizeId(next.database_id);
        next.table = String(next.table || 'tag_log').trim() || 'tag_log';
        next.tags = Array.isArray(next.tags) ? next.tags : [];
        next.historian_fields = Array.isArray(next.historian_fields) ? next.historian_fields : [];
        next.enabled = Boolean(next.enabled);
        next.schedule = (next.schedule && typeof next.schedule === 'object' && !Array.isArray(next.schedule)) ? next.schedule : {};
        if (next.schedule) {
          next.schedule.on_calendar = normalizeOnCalendar(next.schedule.on_calendar || '');
          next.schedule.persistent = (next.schedule.persistent !== false);
        }

        if (idx >= 0) nextList[idx] = next;
        else nextList.push(next);

        writeJsonFile(REPORTER_REPORTS_PATH, { reports: nextList });
        sendJson(res, 200, { ok: true, path: REPORTER_REPORTS_PATH, report: next, renamed_from: originalId && originalId !== id ? originalId : '' });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/reporter/reports/delete') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const root = readJsonFileOrNull(REPORTER_REPORTS_PATH) || { reports: [] };
      const raw = Array.isArray(root?.reports) ? root.reports : [];
      const before = raw.length;
      const afterList = raw.filter((r) => sanitizeId(r?.id) !== id);
      if (afterList.length === before) {
        sendJson(res, 200, { ok: true, deleted: false, id });
        return;
      }
      writeJsonFile(REPORTER_REPORTS_PATH, { reports: afterList });
      const reload = await reporterApiRequest('POST', '/reload');
      sendJson(res, 200, { ok: true, deleted: true, id, reporter_reload: reload });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/reports/duplicate') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const root = readJsonFileOrNull(REPORTER_REPORTS_PATH) || { reports: [] };
      const raw = Array.isArray(root?.reports) ? root.reports : [];
      const nextList = raw
        .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
        .map((r) => ({ ...r }));
      const source = nextList.find((r) => sanitizeId(r?.id) === id);
      if (!source) {
        sendJson(res, 404, { ok: false, error: `Log job '${id}' not found.` });
        return;
      }

      const used = new Set(nextList.map((r) => sanitizeId(r?.id)).filter(Boolean));
      const newId = uniqueOpaqueId('log', used);
      const next = JSON.parse(JSON.stringify(source));
      next.id = newId;
      next.name = copyName(next.name || source.name || id);
      next.enabled = false;
      nextList.push(next);
      writeJsonFile(REPORTER_REPORTS_PATH, { reports: nextList });
      const reload = await reporterApiRequest('POST', '/reload');
      sendJson(res, 200, { ok: true, path: REPORTER_REPORTS_PATH, source_id: id, id: newId, report: next, reporter_reload: reload });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Read/write one-way MySQL database synchronization jobs.
  if (url.pathname === '/api/reporter/sync-jobs') {
    if (!await requireManageServerPerm()) return;
    if (req.method === 'GET') {
      sendJson(res, 200, { ok: true, path: REPORTER_SYNC_JOBS_PATH, sync_jobs: readReporterSyncJobsRaw().map((job) => ({ ...job })) });
      return;
    }
    if (req.method === 'POST') {
      try {
        const parsed = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        const incoming = parsed?.sync_job || parsed;
        const originalId = sanitizeId(parsed?.original_id || '');
        const name = String(incoming?.name || '').trim();
        if (!name) throw new Error('Sync job name is required.');
        const required = ['source_database_id', 'source_table', 'source_time_column', 'source_item_column',
          'destination_database_id', 'destination_table', 'destination_time_column', 'destination_item_column'];
        required.forEach((field) => { if (!String(incoming?.[field] || '').trim()) throw new Error(`${field} is required.`); });
        const tags = Array.from(new Set((Array.isArray(incoming.tags) ? incoming.tags : []).map((v) => String(v || '').trim()).filter(Boolean)));
        const specialSourceColumns = new Set([String(incoming.source_time_column || '').trim(), String(incoming.source_item_column || '').trim()]);
        const specialDestinationColumns = new Set([String(incoming.destination_time_column || '').trim(), String(incoming.destination_item_column || '').trim()]);
        const mappings = (Array.isArray(incoming.mappings) ? incoming.mappings : [])
          .map((m) => ({ source: String(m?.source || '').trim(), destination: String(m?.destination || '').trim() }))
          .filter((m) => m.source && m.destination && !specialSourceColumns.has(m.source) && !specialDestinationColumns.has(m.destination));
        const allTags = incoming.all_tags !== false;
        if (!allTags && !tags.length) throw new Error('At least one tag is required when Selected tags is used.');
        if (!mappings.length) throw new Error('At least one value mapping is required.');
        const list = readReporterSyncJobsRaw().map((job) => ({ ...job }));
        const index = originalId ? list.findIndex((job) => sanitizeId(job?.id) === originalId) : -1;
        if (originalId && index < 0) throw new Error('The database sync job being edited no longer exists.');
        let id = index >= 0 ? sanitizeId(list[index]?.id) : '';
        if (!id) {
          const used = new Set(list.map((job) => sanitizeId(job?.id)).filter(Boolean));
          do { id = `sync_${crypto.randomBytes(8).toString('hex')}`; } while (used.has(id));
        }
        const next = { ...(index >= 0 ? list[index] : {}), ...incoming, id, tags, mappings, all_tags: allTags };
        next.name = name;
        next.enabled = Boolean(next.enabled);
        next.direction = String(next.direction || 'one_way') === 'bidirectional' ? 'bidirectional' : 'one_way';
        const allowedIntervals = new Set([0, 1, 60, 1440]);
        next.match_interval_minutes = Math.trunc(Number(next.match_interval_minutes ?? 60));
        if (!allowedIntervals.has(next.match_interval_minutes)) next.match_interval_minutes = 1;
        next.lookback_days = Math.max(1, Math.min(3650, Math.trunc(Number(next.lookback_days || 7) || 7)));
        next.schedule = (next.schedule && typeof next.schedule === 'object' && !Array.isArray(next.schedule)) ? next.schedule : {};
        next.schedule.on_calendar = normalizeOnCalendar(next.schedule.on_calendar || '');
        if (!next.schedule.on_calendar) throw new Error('Schedule is required.');
        if (index >= 0) list[index] = next; else list.push(next);
        writeJsonFile(REPORTER_SYNC_JOBS_PATH, { sync_jobs: list });
        const reload = await reporterApiRequest('POST', '/reload');
        sendJson(res, 200, { ok: true, sync_job: next, reporter_reload: reload });
      } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return;
  }

  if (url.pathname === '/api/reporter/sync-jobs/delete') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const parsed = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) throw new Error('id is required.');
      const before = readReporterSyncJobsRaw();
      const after = before.filter((job) => sanitizeId(job?.id) !== id);
      writeJsonFile(REPORTER_SYNC_JOBS_PATH, { sync_jobs: after });
      const reload = await reporterApiRequest('POST', '/reload');
      sendJson(res, 200, { ok: true, id, deleted: after.length !== before.length, reporter_reload: reload });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/reporter/databases/schema') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    const databaseId = sanitizeId(url.searchParams.get('database'));
    const database = readReporterDatabasesRaw().find((candidate) => sanitizeId(candidate?.id) === databaseId) || {};
    const result = await reporterApiRequest('GET', `/databases/${encodeURIComponent(databaseId)}/schema`, null, reporterDatabaseDiscoveryTimeoutMs(database));
    sendJson(res, result.ok ? 200 : (result.status || 502), result.json || { ok: false, error: result.error || 'Schema discovery failed.' });
    return;
  }

  if (url.pathname === '/api/reporter/databases/distinct') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const databaseId = sanitizeId(body.database_id);
      const database = readReporterDatabasesRaw().find((candidate) => sanitizeId(candidate?.id) === databaseId) || {};
      const result = await reporterApiRequest('POST', `/databases/${encodeURIComponent(databaseId)}/distinct`, {
        table: String(body.table || ''), column: String(body.column || ''), limit: 10000
      }, reporterDatabaseDiscoveryTimeoutMs(database));
      sendJson(res, result.ok ? 200 : (result.status || 502), result.json || { ok: false, error: result.error || 'Value discovery failed.' });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  // Read/write data check definitions for opcbridge-logger.
  // Permissions: suite.manage_server
  if (url.pathname === '/api/reporter/data-checks') {
    if (!await requireManageServerPerm()) return;

    if (req.method === 'GET') {
      const checks = readReporterDataChecksRaw().map((c) => ({ ...c }));
      sendJson(res, 200, { ok: true, path: REPORTER_DATA_CHECKS_PATH, data_checks: checks });
      return;
    }

    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const incoming = parsed?.data_check || parsed?.check || parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          sendJson(res, 400, { ok: false, error: 'Invalid JSON body; expected {data_check:{...}}.' });
          return;
        }

        const requestedId = sanitizeId(incoming.id);
        let originalId = sanitizeId(parsed?.original_id || incoming.original_id || '');
        const name = String(incoming.name || '').trim();
        if (!name) throw new Error('Data check name is required.');

        const root = readJsonFileOrNull(REPORTER_DATA_CHECKS_PATH) || { data_checks: [] };
        const rawList = Array.isArray(root?.data_checks) ? root.data_checks : [];
        const nextList = rawList
          .filter((c) => c && typeof c === 'object' && !Array.isArray(c))
          .map((c) => ({ ...c }));
        if (!originalId && requestedId && nextList.some((c) => sanitizeId(c?.id) === requestedId)) originalId = requestedId;

        const idx = originalId ? nextList.findIndex((c) => sanitizeId(c.id) === originalId) : -1;
        if (originalId && idx < 0) throw new Error('The data check being edited no longer exists.');
        const usedIds = new Set(nextList.map((c) => sanitizeId(c?.id)).filter(Boolean));
        const id = idx >= 0 ? sanitizeId(nextList[idx]?.id) : uniqueOpaqueId('check', usedIds);
        const prev = idx >= 0 ? nextList[idx] : {};
        const next = { ...prev, ...incoming, id };
        delete next.original_id;
        next.name = name;
        next.database_id = sanitizeId(next.database_id);
        next.enabled = Boolean(next.enabled);
        next.query = String(next.query || '').trim();
        next.timeout_sec = Math.max(1, Math.trunc(Number(next.timeout_sec || 30) || 30));
        next.schedule = (next.schedule && typeof next.schedule === 'object' && !Array.isArray(next.schedule)) ? next.schedule : {};
        next.schedule.on_calendar = normalizeOnCalendar(next.schedule.on_calendar || '');

        const normalizeOptionalNumber = (v) => {
          if (v === '' || v == null) return undefined;
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        };
        const low = normalizeOptionalNumber(next.low_threshold);
        const high = normalizeOptionalNumber(next.high_threshold);
        if (low == null) delete next.low_threshold;
        else next.low_threshold = low;
        if (high == null) delete next.high_threshold;
        else next.high_threshold = high;

        if (!next.database_id) {
          sendJson(res, 400, { ok: false, error: 'database_id is required.' });
          return;
        }
        if (!next.query) {
          sendJson(res, 400, { ok: false, error: 'query is required.' });
          return;
        }

        if (idx >= 0) nextList[idx] = next;
        else nextList.push(next);

        writeJsonFile(REPORTER_DATA_CHECKS_PATH, { data_checks: nextList });
        const reload = await reporterApiRequest('POST', '/reload');
        sendJson(res, 200, { ok: true, path: REPORTER_DATA_CHECKS_PATH, data_check: next, renamed_from: originalId && originalId !== id ? originalId : '', reporter_reload: reload });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/reporter/data-checks/delete') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const root = readJsonFileOrNull(REPORTER_DATA_CHECKS_PATH) || { data_checks: [] };
      const raw = Array.isArray(root?.data_checks) ? root.data_checks : [];
      const before = raw.length;
      const afterList = raw.filter((c) => sanitizeId(c?.id) !== id);
      if (afterList.length === before) {
        sendJson(res, 200, { ok: true, deleted: false, id });
        return;
      }
      writeJsonFile(REPORTER_DATA_CHECKS_PATH, { data_checks: afterList });
      const reload = await reporterApiRequest('POST', '/reload');
      sendJson(res, 200, { ok: true, deleted: true, id, reporter_reload: reload });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/data-checks/duplicate') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const root = readJsonFileOrNull(REPORTER_DATA_CHECKS_PATH) || { data_checks: [] };
      const raw = Array.isArray(root?.data_checks) ? root.data_checks : [];
      const nextList = raw
        .filter((c) => c && typeof c === 'object' && !Array.isArray(c))
        .map((c) => ({ ...c }));
      const source = nextList.find((c) => sanitizeId(c?.id) === id);
      if (!source) {
        sendJson(res, 404, { ok: false, error: `Data check '${id}' not found.` });
        return;
      }

      const used = new Set(nextList.map((c) => sanitizeId(c?.id)).filter(Boolean));
      const newId = uniqueOpaqueId('check', used);
      const next = JSON.parse(JSON.stringify(source));
      next.id = newId;
      next.name = copyName(next.name || source.name || id);
      next.enabled = false;
      nextList.push(next);
      writeJsonFile(REPORTER_DATA_CHECKS_PATH, { data_checks: nextList });
      const reload = await reporterApiRequest('POST', '/reload');
      sendJson(res, 200, { ok: true, path: REPORTER_DATA_CHECKS_PATH, source_id: id, id: newId, data_check: next, reporter_reload: reload });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Apply a log-job schedule by asking the long-running logger service to reload.
  if (url.pathname === '/api/reporter/reports/apply') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }

      const reports = readReporterReportsRaw();
      const report = reports.find((r) => sanitizeId(r?.id) === id);
      if (!report) {
        sendJson(res, 404, { ok: false, error: `Report not found: ${id}` });
        return;
      }

      const databaseId = sanitizeId(report.database_id);
      if (!databaseId) {
        sendJson(res, 400, { ok: false, error: `Report '${id}' is missing database_id.` });
        return;
      }

      const dbs = readReporterDatabasesRaw();
      const db = dbs.find((d) => sanitizeId(d?.id) === databaseId);
      if (!db) {
        sendJson(res, 400, { ok: false, error: `Database not found: ${databaseId}` });
        return;
      }

      const mode = String(report.mode || 'scheduled').trim() || 'scheduled';
      if (mode !== 'scheduled') {
        sendJson(res, 400, { ok: false, error: 'Only scheduled reports are supported right now.' });
        return;
      }

      const onCalendar = normalizeOnCalendar(report?.schedule?.on_calendar || '');
      if (!onCalendar) {
        sendJson(res, 400, { ok: false, error: 'schedule.on_calendar is required.' });
        return;
      }

      const reload = await reporterApiRequest('POST', '/reload');
      if (!reload.ok) {
        sendJson(res, 502, {
          ok: false,
          id,
          error: reload.error || reload.json?.error || `Logger service reload failed with status ${reload.status}`,
          reporter_reload: reload
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        id,
        enabled: Boolean(report.enabled),
        reporter_reload: reload
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/runtime/status') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const health = await reporterApiRequest('GET', '/health');
    sendJson(res, health.ok ? 200 : 502, {
      ok: health.ok,
      reporter: health.json || null,
      error: health.error || health.json?.error || null,
      api: { host: REPORTER_API_HOST, port: REPORTER_API_PORT, status: health.status }
    });
    return;
  }

  if (url.pathname === '/api/historian/runtime/status') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const health = await historianApiRequest('GET', '/health');
    sendJson(res, health.ok ? 200 : 502, {
      ok: health.ok,
      historian: health.json || null,
      error: health.error || health.json?.error || null,
      api: { host: HISTORIAN_API_HOST, port: HISTORIAN_API_PORT, status: health.status }
    });
    return;
  }

  if (url.pathname === '/api/historian/tags') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const tags = await historianApiRequest('GET', '/tags');
    sendJson(res, tags.ok ? 200 : 502, {
      ok: tags.ok,
      tags: Array.isArray(tags.json?.tags) ? tags.json.tags : [],
      error: tags.error || tags.json?.error || null,
      api: { host: HISTORIAN_API_HOST, port: HISTORIAN_API_PORT, status: tags.status }
    });
    return;
  }

  if (url.pathname === '/api/historian/config') {
    if (!await requireManageServerPerm()) return;
    if (req.method === 'GET') {
      const onDisk = readJsoncFileOrNull(HISTORIAN_CONFIG_PATH) || readJsoncFileOrNull(HISTORIAN_CONFIG_EXAMPLE_PATH) || {
        enabled: true,
        http_port: HISTORIAN_API_PORT,
        opcbridge_host: '127.0.0.1',
        opcbridge_http_port: 8080,
        postgres: { conninfo: '', table: 'tag_samples', batch_size: 500, flush_interval_ms: 250, queue_limit: 50000 },
        historian_tags: []
      };
      const safe = { ...onDisk };
      if (safe.postgres && typeof safe.postgres === 'object') {
        safe.postgres = { ...safe.postgres };
        if (typeof safe.postgres.conninfo === 'string') {
          safe.postgres_conninfo_set = safe.postgres.conninfo.trim().length > 0;
          delete safe.postgres.conninfo;
        }
      }
      sendJson(res, 200, { ok: true, config_path: HISTORIAN_CONFIG_PATH, exists: fs.existsSync(HISTORIAN_CONFIG_PATH), config: safe });
      return;
    }
    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req, 2 * 1024 * 1024);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const incoming = parsed?.config || parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          sendJson(res, 400, { ok: false, error: 'Invalid JSON body; expected {config:{...}}.' });
          return;
        }
        const prev = readJsoncFileOrNull(HISTORIAN_CONFIG_PATH) || readJsoncFileOrNull(HISTORIAN_CONFIG_EXAMPLE_PATH) || {};
        const next = {
          ...prev,
          ...incoming,
          postgres: {
            ...((prev && typeof prev.postgres === 'object') ? prev.postgres : {}),
            ...((incoming && typeof incoming.postgres === 'object') ? incoming.postgres : {})
          },
          historian_tags: Array.isArray(incoming.historian_tags) ? incoming.historian_tags : []
        };
        fs.mkdirSync(path.dirname(HISTORIAN_CONFIG_PATH), { recursive: true });
        writeJsonFile(HISTORIAN_CONFIG_PATH, next);
        const safe = { ...next };
        if (safe.postgres && typeof safe.postgres === 'object') {
          safe.postgres = { ...safe.postgres };
          if (typeof safe.postgres.conninfo === 'string') {
            safe.postgres_conninfo_set = safe.postgres.conninfo.trim().length > 0;
            delete safe.postgres.conninfo;
          }
        }
        sendJson(res, 200, { ok: true, config_path: HISTORIAN_CONFIG_PATH, exists: true, config: safe });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/historian/summary' || url.pathname === '/api/historian/query') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const upstreamPath = url.pathname.replace(/^\/api\/historian/, '') + url.search;
    const result = await historianApiRequest('GET', upstreamPath, null, 30000);
    sendJson(res, result.ok ? 200 : 502, result.json || { ok: false, error: result.error || 'Historian request failed' });
    return;
  }

  if (url.pathname === '/api/historian/reload') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const result = await historianApiRequest('POST', '/reload', null, 15000);
    sendJson(res, result.ok ? 200 : 502, result.json || { ok: false, error: result.error || 'Historian reload failed' });
    return;
  }

  if (url.pathname === '/api/reporter/reports/run') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }
      const run = await reporterApiRequest('POST', `/jobs/${encodeURIComponent(id)}/run`);
      sendJson(res, run.ok ? 202 : 502, {
        ok: run.ok,
        id,
        reporter_run: run,
        error: run.error || run.json?.error || null
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/data-checks/run') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }
      const run = await reporterApiRequest('POST', `/data-checks/${encodeURIComponent(id)}/run`, null, 60000);
      sendJson(res, run.ok ? 202 : 502, {
        ok: run.ok,
        id,
        reporter_run: run,
        error: run.error || run.json?.error || null
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/sync-jobs/run' || url.pathname === '/api/reporter/sync-jobs/test') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const parsed = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) throw new Error('id is required.');
      const dryRun = url.pathname.endsWith('/test');
      const upstream = await reporterApiRequest('POST', `/sync-jobs/${encodeURIComponent(id)}/${dryRun ? 'test' : 'run'}`, null, dryRun ? 300000 : 15000);
      sendJson(res, upstream.ok ? (dryRun ? 200 : 202) : 502, {
        ok: upstream.ok, id, dry_run: dryRun, reporter_result: upstream,
        error: upstream.error || upstream.json?.error || null
      });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/reporter/sync-jobs/backfill') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id);
      if (!id) throw new Error('A sync job is required.');
      const result = await reporterApiRequest('POST', `/sync-jobs/${encodeURIComponent(id)}/backfill`, {
        start_time: String(body.start_time || ''), end_time: String(body.end_time || '')
      }, 30000);
      sendJson(res, result.ok ? 202 : (result.status || 502), result.json || { ok: false, error: result.error || 'Backfill could not be started.' });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/reporter/sync-jobs/backfill/cancel') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id);
      if (!id) throw new Error('A backfill task is required.');
      const result = await reporterApiRequest('POST', `/backfills/${encodeURIComponent(id)}/cancel`, null, 15000);
      sendJson(res, result.ok ? 202 : (result.status || 502), result.json || { ok: false, error: result.error || 'Backfill could not be cancelled.' });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/reporter/data-checks/test') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id is required.' });
        return;
      }
      const test = await reporterApiRequest('POST', `/data-checks/${encodeURIComponent(id)}/test`, null, 60000);
      sendJson(res, test.ok ? 200 : 502, {
        ok: test.ok,
        id,
        reporter_test: test,
        error: test.error || test.json?.error || null
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reporter/databases/test') {
    if (!await requireManageServerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const bodyBuf = await readBody(req);
      const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const incoming = parsed?.database || parsed?.db || null;
      if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
        const db = { ...incoming };
        const id = sanitizeId(db.id);
        const originalId = sanitizeId(parsed?.original_id || db.original_id || id);
        db.id = id;
        delete db.original_id;
        const type = String(db.type || 'mysql').trim() || 'mysql';
        db.type = type;

        // When editing an existing saved database, an empty password field means
        // "use the saved password" for this one-off test.
        if (id || originalId) {
          const saved = readReporterDatabasesRaw().find((d) => sanitizeId(d?.id) === (originalId || id)) || {};
          const pwField = (type === 'odbc') ? 'odbc_password' : 'mysql_password';
          if (!db[pwField] && typeof saved[pwField] === 'string' && saved[pwField]) {
            db[pwField] = saved[pwField];
          }
        }

        const test = await reporterApiRequest(
          'POST',
          '/databases/test-config',
          { database: db },
          reporterDatabaseTestTimeoutMs(db)
        );
        sendJson(res, test.ok ? 200 : 502, {
          ok: test.ok,
          id,
          reporter_test: test,
          error: test.error || test.json?.error || null
        });
        return;
      }

      const id = sanitizeId(parsed?.id);
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'id or database is required.' });
        return;
      }
      const saved = readReporterDatabasesRaw().find((database) => sanitizeId(database?.id) === id) || {};
      const test = await reporterApiRequest(
        'POST',
        `/databases/${encodeURIComponent(id)}/test`,
        null,
        reporterDatabaseTestTimeoutMs(saved)
      );
      sendJson(res, test.ok ? 200 : 502, {
        ok: test.ok,
        id,
        reporter_test: test,
        error: test.error || test.json?.error || null
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Upload MQTT CA certificate to opcbridge (raw body -> opcbridge /config/cert/upload?token=WRITE_TOKEN)
  // Tokens are never exposed to the browser.
  if (url.pathname === '/api/opcbridge/cert/upload') {
    if (!ADMIN_TOKEN) {
      sendJson(res, 400, { ok: false, error: 'opcbridge admin token not configured on scada server.' });
      return;
    }
    if (!WRITE_TOKEN) {
      sendJson(res, 400, { ok: false, error: 'opcbridge write token not configured on scada server.' });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      const bodyBuf = await readBody(req, 2 * 1024 * 1024);
      if (!bodyBuf || bodyBuf.length < 1) {
        sendJson(res, 400, { ok: false, error: 'Empty upload.' });
        return;
      }

      const { scheme, host, port } = cfg.opcbridge;
      const client = scheme === 'https' ? https : http;

      const upstreamPath = `/config/cert/upload?token=${encodeURIComponent(WRITE_TOKEN)}`;
      const headers = {
        'Content-Type': req.headers['content-type'] || 'application/x-pem-file',
        'Content-Length': String(bodyBuf.length),
        'X-Admin-Token': ADMIN_TOKEN,
        'Accept': 'application/json'
      };

      const opts = {
        host,
        port,
        method: 'POST',
        path: upstreamPath,
        headers,
        timeout: 8000
      };

      const upstream = client.request(opts, (up) => {
        const chunks = [];
        up.on('data', (c) => chunks.push(c));
        up.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data = null;
          try { data = JSON.parse(raw); } catch { data = { ok: false, error: raw }; }
          sendJson(res, up.statusCode || 502, data);
        });
      });

      upstream.on('timeout', () => upstream.destroy(new Error('upstream timeout')));
      upstream.on('error', (err) => sendJson(res, 502, { ok: false, error: String(err.message || err) }));
      upstream.end(bodyBuf);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  // Connection-specific MQTT TLS material. Existing global certificate
  // endpoints remain available for legacy mqtt.json configurations.
  if (url.pathname === '/api/opcbridge/mqtt-connection-cert') {
    if (!await requireManageServerPerm()) return;
    const connectionId = String(url.searchParams.get('connection_id') || '').trim();
    const kind = String(url.searchParams.get('kind') || '').trim();
    const action = String(url.searchParams.get('action') || 'status').trim();
    const fileNames = { ca: 'ca.crt', cert: 'client.crt', key: 'client.key' };
    if (!/^[A-Za-z0-9._-]+$/.test(connectionId) || connectionId === '.' || connectionId === '..' || !Object.prototype.hasOwnProperty.call(fileNames, kind)) {
      sendJson(res, 400, { ok: false, error: 'A valid connection_id and certificate kind are required.' });
      return;
    }
    const certDir = path.join(DEFAULT_OPCBRIDGE_CONFIG_DIR, 'certs', 'mqtt', connectionId);
    const certPath = path.join(certDir, fileNames[kind]);
    const relativePath = path.relative(DEFAULT_OPCBRIDGE_CONFIG_DIR, certPath).split(path.sep).join('/');
    try {
      if (req.method === 'GET' && action === 'download') {
        if (kind === 'key') { sendJson(res, 403, { ok: false, error: 'Private keys cannot be downloaded.' }); return; }
        if (!fs.existsSync(certPath)) { sendJson(res, 404, { ok: false, error: 'Certificate is not installed.' }); return; }
        const body = fs.readFileSync(certPath);
        res.writeHead(200, {
          'Content-Type': 'application/x-pem-file',
          'Content-Disposition': `attachment; filename="${fileNames[kind]}"`,
          'Content-Length': String(body.length),
          'Cache-Control': 'no-store'
        });
        res.end(body); return;
      }
      if (req.method === 'GET') {
        const exists = fs.existsSync(certPath);
        const stat = exists ? fs.statSync(certPath) : null;
        sendJson(res, 200, { ok: true, connection_id: connectionId, kind, installed: exists,
          path: relativePath, size: stat?.size || 0, modified_ms: stat ? Math.trunc(stat.mtimeMs) : 0 });
        return;
      }
      if (req.method === 'DELETE') {
        if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
        try { if (fs.existsSync(certDir) && fs.readdirSync(certDir).length === 0) fs.rmdirSync(certDir); } catch { /* leave directory */ }
        sendJson(res, 200, { ok: true, installed: false, connection_id: connectionId, kind, path: relativePath });
        return;
      }
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
      const body = await readBody(req, 2 * 1024 * 1024);
      if (!body.length) { sendJson(res, 400, { ok: false, error: 'The uploaded file is empty.' }); return; }
      const text = body.toString('utf8');
      const expected = kind === 'key' ? /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/ : /-----BEGIN CERTIFICATE-----/;
      if (!expected.test(text)) { sendJson(res, 400, { ok: false, error: kind === 'key' ? 'The file does not contain a PEM private key.' : 'The file does not contain a PEM certificate.' }); return; }
      fs.mkdirSync(certDir, { recursive: true, mode: 0o750 });
      const temporary = `${certPath}.tmp-${process.pid}-${Date.now()}`;
      fs.writeFileSync(temporary, body, { mode: kind === 'key' ? 0o600 : 0o640 });
      fs.renameSync(temporary, certPath);
      fs.chmodSync(certPath, kind === 'key' ? 0o600 : 0o640);
      sendJson(res, 200, { ok: true, installed: true, connection_id: connectionId, kind, path: relativePath, size: body.length });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: `MQTT certificate operation failed: ${err.message || err}` });
    }
    return;
  }

  if (url.pathname === '/api/opcbridge/mqtt-trust-certificates') {
    if (!await requireManageServerPerm()) return;
    const mqttCertRoot = path.join(DEFAULT_OPCBRIDGE_CONFIG_DIR, 'certs', 'mqtt');
    const trustRoot = path.join(mqttCertRoot, 'trust');
    const trustMetadataPath = path.join(trustRoot, 'library.json');
    const loadTrustMetadata = () => {
      const value = readJsoncFileOrNull(trustMetadataPath);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    };
    const saveTrustMetadata = (metadata) => {
      fs.mkdirSync(trustRoot, { recursive: true, mode: 0o750 });
      const temporary = `${trustMetadataPath}.tmp-${process.pid}`;
      fs.writeFileSync(temporary, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o640 });
      fs.renameSync(temporary, trustMetadataPath);
      fs.chmodSync(trustMetadataPath, 0o640);
    };
    const safeAssetPath = (relative) => {
      const normalized = String(relative || '').split(path.sep).join('/').replace(/^\/+/, '');
      const absolute = path.resolve(DEFAULT_OPCBRIDGE_CONFIG_DIR, normalized);
      const allowed = `${path.resolve(mqttCertRoot)}${path.sep}`;
      if (!absolute.startsWith(allowed) || !/\.(?:crt|pem)$/i.test(absolute)) return null;
      return { relative: normalized, absolute };
    };
    const usagesForPath = (relative) => {
      const usages = [];
      const connectionsDir = path.join(DEFAULT_OPCBRIDGE_CONFIG_DIR, 'connections');
      if (!fs.existsSync(connectionsDir)) return usages;
      for (const file of fs.readdirSync(connectionsDir).filter((name) => name.endsWith('.json'))) {
        const obj = readJsoncFileOrNull(path.join(connectionsDir, file)) || {};
        const rawConfigured = String(obj?.settings?.cafile ?? obj?.cafile ?? '').trim();
        const configured = path.isAbsolute(rawConfigured)
          ? path.relative(DEFAULT_OPCBRIDGE_CONFIG_DIR, rawConfigured).split(path.sep).join('/')
          : rawConfigured.replace(/^\/+/, '');
        if (configured === relative) usages.push(String(obj.description || obj.id || path.basename(file, '.json')));
      }
      return usages;
    };
    const listAssets = () => {
      const files = [];
      const metadata = loadTrustMetadata();
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const absolute = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(absolute);
          else if (/\.(?:crt|pem)$/i.test(entry.name) && !entry.name.endsWith('.tmp') &&
                   (absolute.startsWith(`${trustRoot}${path.sep}`) || /^ca\.(?:crt|pem)$/i.test(entry.name))) files.push(absolute);
        }
      };
      walk(mqttCertRoot);
      return files.map((absolute) => {
        const body = fs.readFileSync(absolute);
        const relative = path.relative(DEFAULT_OPCBRIDGE_CONFIG_DIR, absolute).split(path.sep).join('/');
        const fingerprint = crypto.createHash('sha256').update(body).digest('hex');
        let subject = '', issuer = '', validFrom = '', validTo = '';
        try {
          const certificate = new crypto.X509Certificate(body);
          subject = certificate.subject; issuer = certificate.issuer;
          validFrom = certificate.validFrom; validTo = certificate.validTo;
        } catch { /* Preserve non-X509 legacy files in the library listing. */ }
        return { path: relative, name: path.basename(absolute), display_name: String(metadata[fingerprint]?.display_name || '').trim(), fingerprint,
          subject, issuer, valid_from: validFrom, valid_to: validTo, certificate_type: 'trust',
          size: body.length, modified_ms: Math.trunc(fs.statSync(absolute).mtimeMs), used_by: usagesForPath(relative), legacy: !absolute.startsWith(`${trustRoot}${path.sep}`) };
      }).sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name, undefined, { sensitivity: 'base', numeric: true }));
    };
    try {
      if (req.method === 'GET' && url.searchParams.get('action') === 'download') {
        const asset = safeAssetPath(url.searchParams.get('path'));
        if (!asset || !fs.existsSync(asset.absolute)) { sendJson(res, 404, { ok: false, error: 'Certificate not found.' }); return; }
        const body = fs.readFileSync(asset.absolute);
        res.writeHead(200, { 'Content-Type': 'application/x-pem-file', 'Content-Disposition': `attachment; filename="${path.basename(asset.absolute)}"`, 'Content-Length': String(body.length), 'Cache-Control': 'no-store' });
        res.end(body); return;
      }
      if (req.method === 'GET') { sendJson(res, 200, { ok: true, certificates: listAssets() }); return; }
      if (req.method === 'POST' && url.searchParams.get('action') === 'rename') {
        const assetPath = safeAssetPath(url.searchParams.get('path'));
        if (!assetPath || !fs.existsSync(assetPath.absolute)) { sendJson(res, 404, { ok: false, error: 'Certificate not found.' }); return; }
        const displayName = String(url.searchParams.get('display_name') || '').trim().slice(0, 120);
        if (!displayName) { sendJson(res, 400, { ok: false, error: 'Certificate name is required.' }); return; }
        const body = fs.readFileSync(assetPath.absolute);
        const fingerprint = crypto.createHash('sha256').update(body).digest('hex');
        const metadata = loadTrustMetadata();
        metadata[fingerprint] = { ...(metadata[fingerprint] || {}), display_name: displayName };
        saveTrustMetadata(metadata);
        sendJson(res, 200, { ok: true, path: assetPath.relative, display_name: displayName }); return;
      }
      if (req.method === 'DELETE') {
        const asset = safeAssetPath(url.searchParams.get('path'));
        if (!asset || !fs.existsSync(asset.absolute)) { sendJson(res, 404, { ok: false, error: 'Certificate not found.' }); return; }
        const usedBy = usagesForPath(asset.relative);
        if (usedBy.length) { sendJson(res, 409, { ok: false, error: `Certificate is used by: ${usedBy.join(', ')}`, used_by: usedBy }); return; }
        const body = fs.readFileSync(asset.absolute);
        const fingerprint = crypto.createHash('sha256').update(body).digest('hex');
        fs.unlinkSync(asset.absolute);
        const metadata = loadTrustMetadata();
        if (metadata[fingerprint]) { delete metadata[fingerprint]; saveTrustMetadata(metadata); }
        sendJson(res, 200, { ok: true, deleted: asset.relative }); return;
      }
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
      const body = await readBody(req, 2 * 1024 * 1024);
      if (!/-----BEGIN CERTIFICATE-----/.test(body.toString('utf8'))) { sendJson(res, 400, { ok: false, error: 'The file does not contain a PEM certificate.' }); return; }
      const fingerprint = crypto.createHash('sha256').update(body).digest('hex');
      const existing = listAssets().find((asset) => asset.fingerprint === fingerprint);
      const displayName = String(url.searchParams.get('display_name') || '').trim().slice(0, 120);
      if (existing) {
        if (displayName && displayName !== existing.display_name) {
          const metadata = loadTrustMetadata();
          metadata[fingerprint] = { ...(metadata[fingerprint] || {}), display_name: displayName };
          saveTrustMetadata(metadata);
          existing.display_name = displayName;
        }
        sendJson(res, 200, { ok: true, certificate: existing, duplicate: true }); return;
      }
      const requested = String(url.searchParams.get('name') || 'mqtt-trust').replace(/\.(?:crt|pem)$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'mqtt_trust';
      fs.mkdirSync(trustRoot, { recursive: true, mode: 0o750 });
      const absolute = path.join(trustRoot, `${requested}_${fingerprint.slice(0, 10)}.crt`);
      const temporary = `${absolute}.tmp-${process.pid}`;
      fs.writeFileSync(temporary, body, { mode: 0o640 }); fs.renameSync(temporary, absolute); fs.chmodSync(absolute, 0o640);
      if (displayName) {
        const metadata = loadTrustMetadata();
        metadata[fingerprint] = { ...(metadata[fingerprint] || {}), display_name: displayName };
        saveTrustMetadata(metadata);
      }
      const relative = path.relative(DEFAULT_OPCBRIDGE_CONFIG_DIR, absolute).split(path.sep).join('/');
      sendJson(res, 200, { ok: true, certificate: { path: relative, name: path.basename(absolute), display_name: displayName, fingerprint, size: body.length, used_by: [], legacy: false }, duplicate: false });
    } catch (err) { sendJson(res, 500, { ok: false, error: `MQTT trust certificate operation failed: ${err.message || err}` }); }
    return;
  }

  if (url.pathname === '/api/opcbridge/systemd') {
    if (!SYSTEMD_ENABLED) {
      sendJson(res, 200, { ok: true, enabled: false, message: 'Systemd management disabled in opcbridge-scada.' });
      return;
    }

    if (req.method === 'GET') {
      const data = loadOpcbridgeSystemdSettings();
      sendJson(res, data.ok ? 200 : 500, data);
      return;
    }

    if (req.method === 'POST') {
      try {
        const bodyBuf = await readBody(req);
        const parsed = JSON.parse(bodyBuf.toString('utf8') || '{}');
        const settings = parsed && typeof parsed === 'object' ? (parsed.settings || parsed) : {};

        const wr = writeOpcbridgeSystemdDropIn(settings);
        if (!wr.ok) {
          sendJson(res, 400, wr);
          return;
        }

        const daemonReload = runSystemctl(['daemon-reload']);
        if (!daemonReload.ok) {
          sendJson(res, 500, { ok: false, error: 'systemctl daemon-reload failed', ...wr, daemonReload });
          return;
        }

        const restart = runSystemctl(['restart', SYSTEMD_UNIT]);
        if (!restart.ok) {
          sendJson(res, 500, { ok: false, error: `systemctl restart ${SYSTEMD_UNIT} failed`, ...wr, restart });
          return;
        }

        sendJson(res, 200, { ok: true, ...wr, daemonReload, restart });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/alarms/systemd/restart') {
    if (!SYSTEMD_ENABLED) {
      sendJson(res, 200, { ok: false, error: 'Systemd management disabled in opcbridge-scada.' });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireManageServerPerm()) return;
    const restart = runSystemctl(['restart', ALARMS_SYSTEMD_UNIT]);
    if (!restart.ok) {
      sendJson(res, 500, { ok: false, error: `systemctl restart ${ALARMS_SYSTEMD_UNIT} failed`, restart });
      return;
    }
    sendJson(res, 200, { ok: true, unit: ALARMS_SYSTEMD_UNIT, restart });
    return;
  }

  if (url.pathname === '/api/historian/systemd/restart') {
    if (!SYSTEMD_ENABLED) {
      sendJson(res, 200, { ok: false, error: 'Systemd management disabled in opcbridge-scada.' });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireManageServerPerm()) return;
    const restart = runSystemctl(['restart', HISTORIAN_SYSTEMD_UNIT]);
    if (!restart.ok) {
      sendJson(res, 500, { ok: false, error: `systemctl restart ${HISTORIAN_SYSTEMD_UNIT} failed`, restart });
      return;
    }
    sendJson(res, 200, { ok: true, unit: HISTORIAN_SYSTEMD_UNIT, restart });
    return;
  }

  if (url.pathname === '/api/scada/audio/devices') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    sendJson(res, 200, listAudioPlaybackDevices());
    return;
  }

  if (url.pathname === '/api/scada/modem/devices') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    sendJson(res, 200, listSerialModemDevices());
    return;
  }

  if (url.pathname === '/api/scada/tts/voices') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    sendJson(res, 200, listTtsVoices());
    return;
  }

  if (url.pathname === '/api/project/backup/start') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireProjectBackupPerm()) return;
    try {
      const bodyBuf = await readBody(req, 1024 * 1024);
      const body = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const job = startProjectBackupJob({
        includeSecrets: Boolean(body.include_secrets),
        includeHistory: Boolean(body.include_history),
        includeHistorianData: Boolean(body.include_historian_data)
      });
      sendJson(res, 202, projectBackupJobStatus(job));
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/project/backup/status') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireProjectBackupPerm()) return;
    cleanupProjectBackupJobs();
    const id = String(url.searchParams.get('id') || '').trim();
    const job = PROJECT_BACKUP_JOBS.get(id);
    if (!job) {
      sendJson(res, 404, { ok: false, error: 'Backup job not found.' });
      return;
    }
    sendJson(res, 200, projectBackupJobStatus(job));
    return;
  }

  if (url.pathname === '/api/project/backup/download') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireProjectBackupPerm()) return;
    cleanupProjectBackupJobs();
    const id = String(url.searchParams.get('id') || '').trim();
    const job = PROJECT_BACKUP_JOBS.get(id);
    if (!job) {
      sendJson(res, 404, { ok: false, error: 'Backup job not found.' });
      return;
    }
    if (job.state !== 'done' || !job.file_path) {
      sendJson(res, 409, { ok: false, error: 'Backup job is not ready.', status: projectBackupJobStatus(job) });
      return;
    }
    fs.readFile(job.file_path, (err, data) => {
      if (err) {
        sendJson(res, 404, { ok: false, error: 'Backup file is no longer available.' });
        return;
      }
      send(res, 200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${job.filename || 'opcbridge-suite-project-backup.json'}"`
      }, data);
    });
    return;
  }

  if (url.pathname === '/api/project/backup') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireProjectBackupPerm()) return;
    try {
      const includeSecrets = ['1', 'true', 'yes'].includes(String(url.searchParams.get('include_secrets') || '').toLowerCase());
      const includeHistory = ['1', 'true', 'yes'].includes(String(url.searchParams.get('include_history') || '').toLowerCase());
      const includeHistorianData = ['1', 'true', 'yes'].includes(String(url.searchParams.get('include_historian_data') || '').toLowerCase());
      const backup = buildProjectBackup({ includeSecrets, includeHistory, includeHistorianData });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      send(res, 200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="opcbridge-suite-project-backup-${stamp}.json"`
      }, JSON.stringify(backup, null, 2) + '\n');
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/project/restore/preview') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireProjectBackupPerm()) return;
    try {
      const bodyBuf = await readBody(req, 120 * 1024 * 1024);
      const body = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const backup = body.backup || body;
      sendJson(res, 200, previewProjectBackup(backup));
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/project/restore') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    if (!await requireProjectBackupPerm()) return;
    try {
      const bodyBuf = await readBody(req, 120 * 1024 * 1024);
      const body = JSON.parse(bodyBuf.toString('utf8') || '{}');
      const backup = body.backup || body;
      const result = restoreProjectBackup(backup);
      sendJson(res, 200, {
        ok: true,
        message: 'Project backup restored. Restart/reload opcbridge, SCADA, alarms, and HMI before using the restored project.',
        ...result
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/data-entry/hmi/forms') {
    if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    const forms = readDataEntryForms().filter((form) => form.hmi_enabled === true).map((form) => ({
      id: form.id, name: form.name, description: form.description, require_login: form.require_login !== false,
      allow_delete: form.allow_delete === true, fields: form.fields
    }));
    sendJson(res, 200, { ok: true, forms }); return;
  }

  if (url.pathname === '/api/data-entry/targets') {
    const status = await requireDataEntryPerm(true); if (!status) return;
    if (req.method === 'GET') { sendJson(res, 200, { ok: true, targets: readDataEntryTargets() }); return; }
    if (req.method === 'POST') {
      try {
        const body = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8') || '{}');
        const root = readDataEntryDefinitions();
        const originalId = sanitizeId(body.original_id || '');
        const incoming = body.target || body;
        const existing = originalId ? root.targets.find((item) => sanitizeId(item?.id) === originalId) : null;
        const usedIds = new Set(root.targets.map((item) => sanitizeId(item?.id)).filter((id) => id && id !== originalId));
        const target = normalizeDataEntryTarget({ ...incoming, id: existing ? existing.id : uniqueOpaqueId('data_target', usedIds) });
        const index = root.targets.findIndex((item) => sanitizeId(item?.id) === originalId);
        if (root.targets.some((item, itemIndex) => itemIndex !== index && sanitizeId(item?.id) === target.id)) throw new Error(`Target id already exists: ${target.id}`);
        if (index >= 0) root.targets[index] = target; else root.targets.push(target);
        if (originalId && originalId !== target.id) root.forms.forEach((form) => { if (sanitizeId(form.target_id) === originalId) form.target_id = target.id; });
        writeJsonFile(DATA_ENTRY_DEFINITIONS_PATH, root); sendJson(res, 200, { ok: true, target });
      } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return;
  }

  if (url.pathname === '/api/data-entry/targets/delete') {
    const status = await requireDataEntryPerm(true); if (!status) return;
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); const id = sanitizeId(body.id); const root = readDataEntryDefinitions();
      if (root.forms.some((form) => sanitizeId(form.target_id) === id)) throw new Error('This target is used by one or more forms.');
      const index = root.targets.findIndex((item) => sanitizeId(item.id) === id); if (index < 0) throw new Error('Target not found.');
      root.targets.splice(index, 1); writeJsonFile(DATA_ENTRY_DEFINITIONS_PATH, root); sendJson(res, 200, { ok: true, deleted: true });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/data-entry/forms') {
    if (req.method === 'GET') {
      const status = await requireDataEntryPerm(false);
      if (!status) return;
      sendJson(res, 200, { ok: true, forms: readDataEntryForms() });
      return;
    }
    if (req.method === 'POST') {
      const status = await requireDataEntryPerm(true);
      if (!status) return;
      try {
        const body = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8') || '{}');
        const originalId = sanitizeId(body.original_id || '');
        const root = readDataEntryDefinitions(); const forms = root.forms;
        const incoming = body.form || body;
        const existing = originalId ? forms.find((item) => sanitizeId(item?.id) === originalId) : null;
        const usedIds = new Set(forms.map((item) => sanitizeId(item?.id)).filter((id) => id && id !== originalId));
        const form = normalizeDataEntryForm({ ...incoming, id: existing ? existing.id : uniqueOpaqueId('data_form', usedIds) });
        if (!root.targets.some((target) => sanitizeId(target.id) === form.target_id)) throw new Error('Selected data entry target does not exist.');
        const index = forms.findIndex((item) => sanitizeId(item?.id) === originalId);
        if (forms.some((item, itemIndex) => itemIndex !== index && sanitizeId(item?.id) === form.id)) throw new Error(`Form id already exists: ${form.id}`);
        if (index >= 0) forms[index] = form; else forms.push(form);
        root.forms = forms; writeJsonFile(DATA_ENTRY_DEFINITIONS_PATH, root);
        sendJson(res, 200, { ok: true, form });
      } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return;
  }

  if (url.pathname === '/api/data-entry/forms/delete') {
    const status = await requireDataEntryPerm(true); if (!status) return;
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id); const root = readDataEntryDefinitions(); const forms = root.forms;
      const index = forms.findIndex((item) => sanitizeId(item?.id) === id);
      if (!id || index < 0) throw new Error(`Form not found: ${id}`);
      forms.splice(index, 1); root.forms = forms; writeJsonFile(DATA_ENTRY_DEFINITIONS_PATH, root);
      sendJson(res, 200, { ok: true, deleted: true, id });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/data-entry/sources' || url.pathname === '/api/data-entry/schema') {
    const status = await requireDataEntryPerm(true); if (!status) return;
    if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    if (url.pathname.endsWith('/sources')) {
      const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
      const databases = (Array.isArray(root.databases) ? root.databases : []).map((database) => ({ id: String(database?.id || '').trim(), name: String(database?.name || database?.id || '').trim(), type: String(database?.type || 'mysql').trim().toLowerCase() })).filter((database) => database.id);
      sendJson(res, 200, { ok: true, databases }); return;
    }
    const databaseId = sanitizeId(url.searchParams.get('database'));
    const database = readReporterDatabasesRaw().find((candidate) => sanitizeId(candidate?.id) === databaseId) || {};
    const result = await reporterApiRequest('GET', `/databases/${encodeURIComponent(databaseId)}/schema`, null, reporterDatabaseDiscoveryTimeoutMs(database));
    sendJson(res, result.ok ? 200 : (result.status || 502), result.json || { ok: false, error: result.error || 'Logger schema discovery failed.' });
    return;
  }

  if (url.pathname === '/api/data-entry/load' || url.pathname === '/api/data-entry/save') {
    if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
    try {
      const body = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8') || '{}');
      const form = readDataEntryForms().find((item) => sanitizeId(item?.id) === sanitizeId(body.form_id));
      if (!form) { sendJson(res, 404, { ok: false, error: 'Data-entry form not found.' }); return; }
      const target = readDataEntryTargets().find((item) => sanitizeId(item?.id) === sanitizeId(form.target_id));
      if (!target) { sendJson(res, 400, { ok: false, error: 'The form data-entry target was not found.' }); return; }
      const status = await requireDataEntryPerm(false, form); if (!status) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.record_date || ''))) throw new Error('A valid record_date is required.');
      const operation = url.pathname.endsWith('/save') ? 'save' : 'load';
      if (operation === 'save') {
        const fields = new Map(form.fields.map((field) => [field.id, field]));
        body.changes = (Array.isArray(body.changes) ? body.changes : []).slice(0, 500).map((change) => {
          const field = fields.get(String(change?.field_id || '')); if (!field) throw new Error('A submitted field is not defined by this form.');
          const action = String(change?.action || 'set');
          if (action === 'delete') { if (!form.allow_delete) throw new Error('Deletion is not allowed for this form.'); return { item: field.item, value_type: field.value_type, action }; }
          let value = change?.value;
          if (field.value_type === 'numeric') {
            if (value === '' || value == null) value = null; else { value = Number(value); if (!Number.isFinite(value)) throw new Error(`${field.label} requires a numeric value.`); }
            if (value !== null && field.min !== null && value < field.min) throw new Error(`${field.label} is below its minimum.`);
            if (value !== null && field.max !== null && value > field.max) throw new Error(`${field.label} is above its maximum.`);
          } else value = value == null ? '' : String(value).slice(0, 4000);
          if (field.required && (value === null || value === '')) throw new Error(`${field.label} is required.`);
          return { item: field.item, value_type: field.value_type, action: 'set', value };
        });
      }
      const database = readReporterDatabasesRaw().find((candidate) => sanitizeId(candidate?.id) === sanitizeId(target.database_id)) || {};
      const result = await reporterApiRequest('POST', `/databases/${encodeURIComponent(target.database_id)}/data-entry`, dataEntryLoggerPayload(form, target, operation, body), reporterDatabaseDiscoveryTimeoutMs(database));
      if (operation === 'save' && result.ok && result.json?.ok) {
        try {
          ensureDirForFile(DATA_ENTRY_AUDIT_PATH);
          fs.appendFileSync(DATA_ENTRY_AUDIT_PATH, JSON.stringify({ timestamp: new Date().toISOString(), form_id: form.id,
            record_date: body.record_date, username: authStatusUsername(status) || null,
            remote_address: String(req.socket?.remoteAddress || ''), changes: body.changes,
            inserted: result.json.inserted || 0, updated: result.json.updated || 0, deleted: result.json.deleted || 0 }) + '\n', 'utf8');
        } catch { /* data save succeeded; audit failure must not duplicate the write on retry */ }
      }
      sendJson(res, result.ok ? 200 : (result.status || 502), result.json || { ok: false, error: result.error || 'Logger data-entry request failed.' });
    } catch (err) { sendJson(res, 400, { ok: false, error: String(err.message || err) }); }
    return;
  }

  if (url.pathname === '/api/reports/admin') {
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    if (req.method === 'GET') {
      const reports = readReportDefinitions().filter((report) => {
        const grant = reportGrant(report, reportStatus);
        return grant.edit || grant.manage;
      });
      sendJson(res, 200, { ok: true, path: REPORT_DEFINITIONS_PATH, reports });
      return;
    }
    if (req.method === 'POST') {
      try {
        const body = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8') || '{}');
        const originalId = sanitizeId(body.original_id || '');
        const reports = readReportDefinitions();
        const source = body.report || body;
        const existing = originalId
          ? reports.find((item) => sanitizeId(item?.id) === originalId)
          : null;
        if (!existing && !authStatusHasPerm(reportStatus, 'reports.create') &&
            !authStatusHasPerm(reportStatus, 'reports.administer')) {
          sendJson(res, 403, { ok: false, error: 'Insufficient permissions (reports.create required).' });
          return;
        }
        if (existing && !reportGrant(existing, reportStatus).edit) {
          sendJson(res, 403, { ok: false, error: 'This role cannot edit the selected report.' });
          return;
        }
        const canManage = !existing || reportGrant(existing, reportStatus).manage;
        if (existing && !canManage) {
          source.access = existing.access;
          source.published = existing.published;
          source.hmi_enabled = existing.hmi_enabled;
        }
        source.created_by = existing
          ? (String(existing.created_by || '').trim() || authStatusUsername(reportStatus))
          : authStatusUsername(reportStatus);
        if (!source.created_by) throw new Error('An authenticated creator is required.');
        const usedIds = new Set(
          reports
            .map((item) => sanitizeId(item?.id))
            .filter((id) => id && id !== originalId)
        );
        source.id = existing ? sanitizeId(existing.id) : uniqueOpaqueId('report', usedIds);
        const report = normalizeReportDefinition(source);
        const lookupId = originalId || report.id;
        const index = reports.findIndex((item) => sanitizeId(item?.id) === lookupId);
        if (reports.some((item, itemIndex) => itemIndex !== index && sanitizeId(item?.id) === report.id)) {
          throw new Error(`Report id already exists: ${report.id}`);
        }
        if (index >= 0) reports[index] = report;
        else reports.push(report);
        writeJsonFile(REPORT_DEFINITIONS_PATH, { reports });
        sendJson(res, 200, { ok: true, path: REPORT_DEFINITIONS_PATH, report });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/reports/admin/sources') {
    if (!await requireReportDesignerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
    const databases = (Array.isArray(root.databases) ? root.databases : []).map((database) => ({
      id: String(database?.id || '').trim(),
      name: String(database?.name || database?.id || '').trim(),
      type: String(database?.type || 'mysql').trim().toLowerCase(),
      monitor_timeout_sec: Math.max(1, Math.min(300, Math.trunc(Number(database?.monitor_timeout_sec ?? 10) || 10)))
    })).filter((database) => database.id);
    sendJson(res, 200, { ok: true, databases });
    return;
  }

  if (url.pathname === '/api/reports/data-sources') {
    const sourceStatus = await requireReportDesignerPerm();
    if (!sourceStatus) return;
    if (req.method === 'GET') {
      sendJson(res, 200, { ok: true, path: REPORT_DATA_SOURCES_PATH, sources: readReportDataSources() });
      return;
    }
    if (req.method === 'POST') {
      if (!authStatusHasPerm(sourceStatus, 'reports.administer')) {
        sendJson(res, 403, { ok: false, error: 'Report administration permission is required to manage data sources.' });
        return;
      }
      try {
        const parsed = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        const originalId = sanitizeId(parsed.original_id || '');
        const sources = readReportDataSources().map((item) => ({ ...item }));
        const existing = originalId ? sources.find((item) => sanitizeId(item?.id) === originalId) : null;
        const usedIds = new Set(sources.map((item) => sanitizeId(item?.id)).filter((id) => id && id !== originalId));
        const incomingSource = parsed.source || parsed;
        const source = normalizeReportDataSource({ ...incomingSource, id: existing ? existing.id : uniqueOpaqueId('report_source', usedIds) });
        const index = sources.findIndex((item) => sanitizeId(item?.id) === (originalId || source.id));
        if (sources.some((item, itemIndex) => itemIndex !== index && sanitizeId(item?.id) === source.id)) {
          throw new Error(`Data source id already exists: ${source.id}`);
        }
        if (index >= 0) sources[index] = source; else sources.push(source);
        sources.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        writeJsonFile(REPORT_DATA_SOURCES_PATH, { sources });
        sendJson(res, 200, { ok: true, path: REPORT_DATA_SOURCES_PATH, source });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/reports/data-sources/delete') {
    const sourceStatus = await requireReportDesignerPerm();
    if (!sourceStatus) return;
    if (!authStatusHasPerm(sourceStatus, 'reports.administer')) {
      sendJson(res, 403, { ok: false, error: 'Report administration permission is required to manage data sources.' });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const parsed = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(parsed.id || '');
      const sources = readReportDataSources();
      const index = sources.findIndex((item) => sanitizeId(item?.id) === id);
      if (index < 0) throw new Error('Report data source was not found.');
      sources.splice(index, 1);
      writeJsonFile(REPORT_DATA_SOURCES_PATH, { sources });
      sendJson(res, 200, { ok: true, deleted: true });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/admin/schema') {
    if (!await requireReportDesignerPerm()) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const databaseId = sanitizeId(url.searchParams.get('database'));
    if (!databaseId) {
      sendJson(res, 400, { ok: false, error: 'database is required.' });
      return;
    }
    const database = readReporterDatabasesRaw().find(
      (candidate) => sanitizeId(candidate?.id) === databaseId
    ) || {};
    const result = await reporterApiRequest(
      'GET',
      `/databases/${encodeURIComponent(databaseId)}/schema`,
      null,
      reporterDatabaseDiscoveryTimeoutMs(database)
    );
    sendJson(res, result.ok ? 200 : (result.status || 502), result.json || {
      ok: false,
      error: result.error || 'Logger schema discovery failed.'
    });
    return;
  }

  if (url.pathname === '/api/reports/admin/distinct') {
    if (!await requireReportDesignerPerm()) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const databaseId = sanitizeId(body.database_id);
      const table = String(body.table || '').trim();
      const column = String(body.column || '').trim();
      if (!databaseId || !table || !column) throw new Error('database_id, table, and column are required.');
      const database = readReporterDatabasesRaw().find(
        (candidate) => sanitizeId(candidate?.id) === databaseId
      ) || {};
      const result = await reporterApiRequest(
        'POST',
        `/databases/${encodeURIComponent(databaseId)}/distinct`,
        { table, column, limit: 10000 },
        reporterDatabaseDiscoveryTimeoutMs(database)
      );
      sendJson(res, result.ok ? 200 : (result.status || 502), result.json || {
        ok: false,
        error: result.error || 'Logger value discovery failed.'
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/admin/template/upload') {
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const id = sanitizeId(url.searchParams.get('id') || '');
      if (!id) throw new Error('A report id is required.');
      const existing = readReportDefinitions().find((report) => sanitizeId(report?.id) === id);
      const allowed = existing
        ? reportGrant(existing, reportStatus).manage
        : (authStatusHasPerm(reportStatus, 'reports.create') || authStatusHasPerm(reportStatus, 'reports.administer'));
      if (!allowed) {
        sendJson(res, 403, { ok: false, error: 'Manage access is required to upload a report template.' });
        return;
      }
      const rawFilename = decodeURIComponent(String(req.headers['x-file-name'] || 'template.xlsx'));
      const filename = path.basename(rawFilename).slice(0, 255);
      const extensionMatch = filename.toLowerCase().match(/\.(xlsx|ods)$/);
      if (!extensionMatch) throw new Error('Template must be an .xlsx or .ods file.');
      const format = extensionMatch[1];
      const body = await readBody(req, 25 * 1024 * 1024);
      if (body.length < 4 || body[0] !== 0x50 || body[1] !== 0x4b) throw new Error('Uploaded file is not a valid spreadsheet package.');
      const storedId = crypto.createHash('sha256').update(body).digest('hex');
      fs.mkdirSync(REPORT_TEMPLATE_DIR, { recursive: true, mode: 0o750 });
      const templatePath = path.join(REPORT_TEMPLATE_DIR, `${storedId}.${format}`);
      const existed = fs.existsSync(templatePath);
      if (!existed) fs.writeFileSync(templatePath, body, { mode: 0o640 });
      const validation = await new Promise((resolve) => {
        child_process.execFile(REPORT_BIN, [
          'template-preview', '--template', templatePath, '--worksheet', ''
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }));
      });
      if (validation.error) {
        if (!existed) {
          try { fs.unlinkSync(templatePath); } catch { /* ignore */ }
        }
        throw new Error(String(validation.stderr || validation.error.message || 'Invalid XLSX template').trim());
      }
      const preview = JSON.parse(validation.stdout);
      const template = {
        enabled: false,
        filename,
        format,
        stored_id: storedId,
        checksum: storedId,
        size: body.length,
        uploaded_at: new Date().toISOString()
      };
      sendJson(res, 200, { ok: true, template, preview });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/admin/template/download' ||
      url.pathname === '/api/reports/admin/template/preview') {
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const id = sanitizeId(url.searchParams.get('id') || '');
      const storedId = String(url.searchParams.get('stored_id') || '').trim().toLowerCase();
      if (!id || !/^[a-f0-9]{64}$/.test(storedId)) throw new Error('A valid report and template are required.');
      const existing = readReportDefinitions().find((report) => sanitizeId(report?.id) === id);
      const grant = existing ? reportGrant(existing, reportStatus) : null;
      const currentStoredId = String(existing?.template?.stored_id || '').trim().toLowerCase();
      const allowed = existing
        ? Boolean(grant?.manage || (grant?.edit && storedId === currentStoredId))
        : (authStatusHasPerm(reportStatus, 'reports.create') || authStatusHasPerm(reportStatus, 'reports.administer'));
      if (!allowed) {
        sendJson(res, 403, { ok: false, error: 'This user cannot access the selected report template.' });
        return;
      }
      const requestedFormat = reportTemplateFormat({ format: url.searchParams.get('format'), filename: url.searchParams.get('filename') });
      const currentFormat = reportTemplateFormat(existing?.template);
      const format = grant?.manage || !existing ? requestedFormat : currentFormat;
      const templatePath = path.join(REPORT_TEMPLATE_DIR, `${storedId}.${format}`);
      if (!fs.existsSync(templatePath)) {
        sendJson(res, 404, { ok: false, error: 'Stored report template was not found.' });
        return;
      }
      if (url.pathname.endsWith('/download')) {
        const requestedFilename = grant?.manage || !existing
          ? String(url.searchParams.get('filename') || '') : '';
        const filename = path.basename(String(requestedFilename || existing?.template?.filename || `report-template.${format}`))
          .replace(/[^A-Za-z0-9._-]+/g, '-')
          .replace(/^[-_.]+|[-_.]+$/g, '') || `report-template.${format}`;
        send(res, 200, {
          'Content-Type': reportTemplateContentType({ format }),
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store'
        }, fs.readFileSync(templatePath));
        return;
      }
      const worksheet = String(url.searchParams.get('worksheet') || '').trim();
      const result = await new Promise((resolve) => {
        child_process.execFile(REPORT_BIN, [
          'template-preview', '--template', templatePath, '--worksheet', worksheet
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }));
      });
      if (result.error) throw new Error(String(result.stderr || result.error.message || result.error).trim());
      sendJson(res, 200, { ok: true, preview: JSON.parse(result.stdout) });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/admin/delete' || url.pathname === '/api/reports/admin/duplicate') {
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id);
      const reports = readReportDefinitions();
      const index = reports.findIndex((item) => sanitizeId(item?.id) === id);
      if (!id || index < 0) {
        sendJson(res, 404, { ok: false, error: `Report not found: ${id}` });
        return;
      }
      if (!reportGrant(reports[index], reportStatus).manage) {
        sendJson(res, 403, { ok: false, error: 'This role cannot manage the selected report.' });
        return;
      }
      if (url.pathname.endsWith('/delete')) {
        reports.splice(index, 1);
        writeJsonFile(REPORT_DEFINITIONS_PATH, { reports });
        sendJson(res, 200, { ok: true, deleted: true, id });
        return;
      }
      const copy = JSON.parse(JSON.stringify(reports[index]));
      copy.id = uniqueOpaqueId('report', new Set(reports.map((item) => sanitizeId(item?.id)).filter(Boolean)));
      copy.name = copyName(copy.name);
      copy.created_by = authStatusUsername(reportStatus);
      if (!copy.created_by) throw new Error('An authenticated creator is required.');
      copy.published = false;
      reports.push(copy);
      writeJsonFile(REPORT_DEFINITIONS_PATH, { reports });
      sendJson(res, 200, { ok: true, report: copy });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/admin/preview') {
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id);
      const report = readReportDefinitions().find((item) => sanitizeId(item?.id) === id);
      if (!id || !report) throw new Error(`Report not found: ${id}`);
      if (!canAccessReport(report, reportStatus, 'edit')) {
        sendJson(res, 403, { ok: false, error: 'This role cannot edit the selected report.' });
        return;
      }
      const range = reportCliRangeArgs(report, body);
      const result = await new Promise((resolve) => {
        child_process.execFile(REPORT_BIN, [
          'preview',
          '--definitions', REPORT_DEFINITIONS_PATH,
          '--id', id,
          ...range.args,
          '--historian-url', REPORT_HISTORIAN_URL,
          '--logger-url', REPORT_LOGGER_URL,
          '--allow-unpublished'
        ], { encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }));
      });
      if (result.error) throw new Error(String(result.stderr || result.error.message || result.error).trim());
      const preview = JSON.parse(result.stdout);
      await addReportTemplatePreview(preview, report);
      sendJson(res, 200, preview);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/preview') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id);
      const report = readReportDefinitions().find((item) => sanitizeId(item?.id) === id);
      const grant = report ? reportGrant(report, reportStatus) : null;
      if (!report || !grant?.view || (report.published !== true && !grant.edit && !grant.manage)) {
        sendJson(res, 404, { ok: false, error: `Accessible report not found: ${id}` });
        return;
      }
      const range = reportCliRangeArgs(report, body);
      const result = await new Promise((resolve) => {
        child_process.execFile(REPORT_BIN, [
          'preview',
          '--definitions', REPORT_DEFINITIONS_PATH,
          '--id', id,
          ...range.args,
          '--historian-url', REPORT_HISTORIAN_URL,
          '--logger-url', REPORT_LOGGER_URL,
          ...(report.published === true ? [] : ['--allow-unpublished'])
        ], { encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }));
      });
      if (result.error) throw new Error(String(result.stderr || result.error.message || result.error).trim());
      const preview = JSON.parse(result.stdout);
      await addReportTemplatePreview(preview, report);
      sendJson(res, 200, preview);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports/hmi/preview') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const id = sanitizeId(body.id);
      const report = readReportDefinitions().find((item) => sanitizeId(item?.id) === id);
      if (!report || report.published !== true || report.hmi_enabled !== true) {
        sendJson(res, 404, { ok: false, error: `HMI report not found: ${id}` });
        return;
      }
      const range = reportCliRangeArgs(report, body);
      const result = await new Promise((resolve) => {
        child_process.execFile(REPORT_BIN, [
          'preview', '--definitions', REPORT_DEFINITIONS_PATH, '--id', id,
          ...range.args, '--historian-url', REPORT_HISTORIAN_URL, '--logger-url', REPORT_LOGGER_URL
        ], { encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }));
      });
      if (result.error) throw new Error(String(result.stderr || result.error.message || result.error).trim());
      sendJson(res, 200, JSON.parse(result.stdout));
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === '/api/reports') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const reportStatus = await requireReportsPerm();
    if (!reportStatus) return;
    const reports = readReportDefinitions()
      .filter((report) => {
        const grant = reportGrant(report, reportStatus);
        return grant.view && (report.published === true || grant.edit || grant.manage);
      })
      .map((report) => ({
        ...publicReport(report),
        permissions: reportGrant(report, reportStatus)
      }))
      .filter((report) => report.id && report.name);
    sendJson(res, 200, {
      ok: true,
      reports
    });
    return;
  }

  if (url.pathname === '/api/reports/hmi') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const reports = readReportDefinitions()
      .filter((report) => report.published === true && report.hmi_enabled === true)
      .map((report) => publicReport(report))
      .filter((report) => report.id && report.name)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    sendJson(res, 200, { ok: true, reports });
    return;
  }

  if (url.pathname === '/api/reports/download' || url.pathname === '/api/reports/hmi/download') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    const hmiRequest = url.pathname === '/api/reports/hmi/download';
    const reportStatus = hmiRequest ? null : await requireReportsPerm();
    if (!hmiRequest && !reportStatus) return;

    const id = sanitizeId(url.searchParams.get('id'));
    const format = String(url.searchParams.get('format') || 'xlsx').trim().toLowerCase();
    if (!id || !['xlsx', 'ods', 'csv'].includes(format)) {
      sendJson(res, 400, { ok: false, error: 'Valid id and format are required.' });
      return;
    }
    const rawReport = readReportDefinitions().find((item) => sanitizeId(item?.id) === id);
    const grant = rawReport && !hmiRequest ? reportGrant(rawReport, reportStatus) : null;
    if (!rawReport || rawReport.published !== true || (hmiRequest ? rawReport.hmi_enabled !== true : !grant?.download)) {
      sendJson(res, 404, { ok: false, error: `Published report not found: ${id}` });
      return;
    }
    const report = publicReport(rawReport);
    let range;
    try {
      range = reportCliRangeArgs(report, url.searchParams);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: String(err.message || err) });
      return;
    }
    if (!report.formats.includes(format)) {
      sendJson(res, 400, { ok: false, error: `Report '${id}' does not publish ${format} output.` });
      return;
    }
    if (!fs.existsSync(REPORT_BIN)) {
      sendJson(res, 503, { ok: false, error: `Report generator is not installed: ${REPORT_BIN}` });
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-report-'));
    const outputPath = path.join(tempDir, `${id}.${format}`);
    try {
      const result = await new Promise((resolve) => {
        child_process.execFile(REPORT_BIN, [
          'generate',
          '--definitions', REPORT_DEFINITIONS_PATH,
          '--id', id,
          ...range.args,
          '--format', format,
          '--output', outputPath,
          '--historian-url', REPORT_HISTORIAN_URL,
          '--logger-url', REPORT_LOGGER_URL
        ], {
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 2 * 1024 * 1024
        }, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
      });
      if (result.error) {
        const detail = String(result.stderr || result.error.message || result.error).trim();
        sendJson(res, 502, { ok: false, error: detail || 'Report generation failed.' });
        return;
      }
      const body = fs.readFileSync(outputPath);
      const safeBase = String(report.name || id)
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, '') || 'report';
      const contentType = format === 'csv'
        ? 'text/csv; charset=utf-8'
        : (format === 'ods'
            ? 'application/vnd.oasis.opendocument.spreadsheet'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      send(res, 200, {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeBase}-${range.label}.${format}"`,
        'Cache-Control': 'no-store'
      }, body);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err.message || err) });
    } finally {
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { /* ignore */ }
      try { fs.rmdirSync(tempDir); } catch { /* ignore */ }
    }
    return;
  }

  if (url.pathname === '/api/system/network-interfaces') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    sendJson(res, 200, { ok: true, interfaces: listNetworkInterfaces() });
    return;
  }

  if (url.pathname.startsWith('/api/opcbridge/')) {
    await proxy(req, res, cfg.opcbridge, 'opcbridge');
    return;
  }

  if (url.pathname.startsWith('/api/alarms/')) {
    await proxy(req, res, cfg.alarms, 'alarms');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/favicon.ico') {
    send(res, 204, { 'Cache-Control': 'no-store' }, '');
    return;
  }

  if (url.pathname.startsWith('/api/hmi/')) {
    await proxy(req, res, cfg.hmi, 'hmi');
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/reports/') {
    send(res, 302, {
      Location: '/reports',
      'Cache-Control': 'no-store'
    }, '');
    return;
  }

  const reportsPage = url.pathname === '/reports';
  const reqPath = (url.pathname === '/' || reportsPage) ? '/index.html' : url.pathname;
  const filePath = safeJoin(PUBLIC_DIR, reqPath);
  if (!filePath) {
    send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad path');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'Not found');
      return;
    }
    let body = data;
    if (reportsPage && reqPath === '/index.html') {
      body = Buffer.from(
        data.toString('utf8')
          .replace('<body>', '<body class="report-portal">')
          .replace('<section id="tab-overview" class="panel is-active">', '<section id="tab-overview" class="panel">')
          .replace('<section id="tab-reports" class="panel">', '<section id="tab-reports" class="panel is-active">'),
        'utf8'
      );
    }
    send(res, 200, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': 'no-store'
    }, body);
  });
});

const cfg = readConfig();
server.listen(cfg.listen.port, cfg.listen.host, () => {
  console.log(`[opcbridge-scada] Listening on http://${cfg.listen.host}:${cfg.listen.port}`);
  console.log(`[opcbridge-scada] refresh: ${cfg.refresh_ms}ms`);
  console.log(`[opcbridge-scada] opcbridge: ${cfg.opcbridge.scheme}://${cfg.opcbridge.host}:${cfg.opcbridge.port}`);
  console.log(`[opcbridge-scada] alarms:   ${cfg.alarms.scheme}://${cfg.alarms.host}:${cfg.alarms.port}`);
  console.log(`[opcbridge-scada] hmi:      ${cfg.hmi.scheme}://${cfg.hmi.host}:${cfg.hmi.port}`);
  console.log(`[opcbridge-scada] config:   ${CONFIG_PATH}`);
  console.log(`[opcbridge-scada] secrets:  ${SECRETS_PATH} (loaded=${Object.keys(SECRETS || {}).length > 0})`);
  console.log(`[opcbridge-scada] admin token configured: ${Boolean(ADMIN_TOKEN)}`);
  console.log(`[opcbridge-scada] write token configured: ${Boolean(WRITE_TOKEN)}`);
  console.log(`[opcbridge-scada] ui auth enabled: ${UI_AUTH_ENABLED}`);
});
