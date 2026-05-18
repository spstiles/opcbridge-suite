#!/usr/bin/env node
/* opcbridge-scada: SCADA console / control center (no external deps)

Goals:
- Desktop-like UX in the browser.
- Never expose admin/write tokens to the browser.
- Talk to opcbridge and optional modules only via their public APIs.
*/

const http = require('http');
const https = require('https');
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

const REPORTER_CONFIG_PATH = String(
  process.env.OPCBRIDGE_REPORTER_CONFIG ||
  '/etc/opcbridge/reporter/config.json'
).trim();
const REPORTER_CONFIG_EXAMPLE_PATH = `${REPORTER_CONFIG_PATH}.example`;

const REPORTER_DATABASES_PATH = String(
  process.env.OPCBRIDGE_REPORTER_DATABASES ||
  '/etc/opcbridge/reporter/databases.json'
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

const REPORTER_CAPABILITIES = detectReporterCapabilities();

const REPORTER_REPORTS_PATH = String(
  process.env.OPCBRIDGE_REPORTER_REPORTS ||
  '/etc/opcbridge/reporter/reports.json'
).trim();

const REPORTER_DATA_CHECKS_PATH = String(
  process.env.OPCBRIDGE_REPORTER_DATA_CHECKS ||
  '/etc/opcbridge/reporter/data_checks.json'
).trim();

const REPORTER_REPORTS_DIR = String(
  process.env.OPCBRIDGE_REPORTER_REPORTS_DIR ||
  '/etc/opcbridge/reporter/reports'
).trim();

const REPORTER_BIN = String(
  process.env.OPCBRIDGE_REPORTER_BIN ||
  '/opt/opcbridge-suite/bin/opcbridge-reporter'
).trim();

const REPORTER_API_HOST = String(process.env.OPCBRIDGE_REPORTER_API_HOST || '127.0.0.1').trim();
const REPORTER_API_PORT = Math.trunc(Number(process.env.OPCBRIDGE_REPORTER_API_PORT || 8095) || 8095);

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
          reject(new Error(`opcbridge /auth/status parse failed: ${err.message}`));
        }
      });
    });
    up.on('timeout', () => up.destroy(new Error('opcbridge /auth/status timeout')));
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

function uniqueCopyId(sourceId, usedIds) {
  const src = sanitizeId(sourceId) || 'item';
  const root = `${src}_copy`;
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

function normalizeOnCalendar(value) {
  const s = String(value || '').trim();
  return s;
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
      up.destroy(new Error('Reporter API timeout'));
    });
    up.on('error', (err) => {
      resolve({ ok: false, status: 0, error: String(err.message || err) });
    });
    if (body) up.write(body);
    up.end();
  });
}

function readReporterDatabasesRaw() {
  const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
  const raw = Array.isArray(root?.databases) ? root.databases : [];
  return raw.filter((d) => d && typeof d === 'object' && !Array.isArray(d));
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
  const enableMqtt = Boolean(settings?.mqtt_enabled);

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
  if (enableMqtt) {
    args.push('--mqtt');
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
    opcua_port: 4840,
    mqtt_enabled: false
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
      if (t === '--mqtt') { s.mqtt_enabled = true; continue; }
    }

    // If a flag isn't present in the drop-in, treat it as disabled.
    s.http_enabled = tokens.includes('--http');
    s.ws_enabled = tokens.includes('--ws');
    s.opcua_enabled = tokens.includes('--opcua');
    s.mqtt_enabled = tokens.includes('--mqtt');

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
    const alsa = `plughw:${card},${device}`;
    if (seen.has(alsa)) continue;
    seen.add(alsa);
    const cardName = String(match[3] || match[2] || '').trim();
    const deviceName = String(match[6] || match[5] || '').trim();
    devices.push({
      id: alsa,
      alsa,
      card,
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

  progress('Collecting opcbridge configuration...', 10);
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
    add('reporter_config', path.dirname(p), path.basename(p));
  });
  if (includeSecrets) {
    const p = String(REPORTER_DATABASES_PATH || '').trim();
    if (p) add('reporter_config', path.dirname(p), path.basename(p));
  }
  projectBackupWalkFiles(REPORTER_REPORTS_DIR, '.', { includeExts: ['.json', '.jsonc', '.sql', '.txt', '.md'] })
    .forEach((rel) => add('reporter_reports', REPORTER_REPORTS_DIR, rel));

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
      reporter_config: path.dirname(REPORTER_CONFIG_PATH),
      reporter_reports: REPORTER_REPORTS_DIR,
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
  if (s === 'reporter_config') return path.dirname(REPORTER_CONFIG_PATH);
  if (s === 'reporter_reports') return REPORTER_REPORTS_DIR;
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
  if (upstreamPathname === '/health' || upstreamPathname === '/tags' || upstreamPathname === '/events') return true;
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
          sendJson(res, 200, { ok: false, error: `opcbridge HTTP ${up.status}`, source, details: up.json });
          return;
        }
        const entries = Array.isArray(up.json?.entries) ? up.json.entries : [];
        const text = entries.map((entry) => {
          const ts = Number(entry?.timestamp_ms || 0);
          const iso = ts > 0 ? new Date(ts).toLocaleString() : '';
          const level = String(entry?.level || 'info').toUpperCase();
          const component = String(entry?.component || 'opcbridge');
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
          sendJson(res, 200, { ok: false, error: `opcbridge HTTP ${up.status}`, source, details: up.json });
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

  // Check if an MQTT CA certificate exists on opcbridge (admin-gated).
  if (url.pathname === '/api/opcbridge/cert/status') {
    if (!ADMIN_TOKEN) {
      sendJson(res, 400, { ok: false, error: 'opcbridge admin token not configured on scada server.' });
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

  // Read/write opcbridge-reporter config on the SCADA server.
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

  // Capabilities for opcbridge-reporter integrations (used by SCADA UI).
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

  // Read/write database connection profiles for opcbridge-reporter.
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

        const id = String(incoming.id || '').trim();
        const originalId = String(parsed?.original_id || incoming.original_id || '').trim();
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'Database "id" is required.' });
          return;
        }

        const root = readJsonFileOrNull(REPORTER_DATABASES_PATH) || { databases: [] };
        const raw = Array.isArray(root?.databases) ? root.databases : [];
        const nextList = raw
          .filter((d) => d && typeof d === 'object' && !Array.isArray(d))
          .map((d) => ({ ...d }));

        const lookupId = originalId || id;
        const idx = nextList.findIndex((d) => String(d.id || '').trim() === lookupId);
        if (originalId && originalId !== id) {
          const conflict = nextList.some((d, i) => i !== idx && String(d.id || '').trim() === id);
          if (conflict) {
            sendJson(res, 409, { ok: false, error: `Database id '${id}' already exists.` });
            return;
          }
        }
        const prev = idx >= 0 ? nextList[idx] : {};
        const next = { ...prev, ...incoming, id };
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
        sendJson(res, 200, { ok: true, path: REPORTER_DATABASES_PATH, database: safe, renamed_from: originalId && originalId !== id ? originalId : '', reports_updated, data_checks_updated, reporter_reload: reload });
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
      const newId = uniqueCopyId(id, used);
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

  // Read/write report definitions (metadata) for opcbridge-reporter.
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

        const id = sanitizeId(incoming.id);
        const originalId = sanitizeId(parsed?.original_id || incoming.original_id || '');
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'Report "id" is required.' });
          return;
        }

        const root = readJsonFileOrNull(REPORTER_REPORTS_PATH) || { reports: [] };
        const rawList = Array.isArray(root?.reports) ? root.reports : [];
        const nextList = rawList
          .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
          .map((r) => ({ ...r }));

        const lookupId = originalId || id;
        const idx = nextList.findIndex((r) => sanitizeId(r.id) === lookupId);
        if (originalId && originalId !== id) {
          const conflict = nextList.some((r, i) => i !== idx && sanitizeId(r.id) === id);
          if (conflict) {
            sendJson(res, 409, { ok: false, error: `Log job id '${id}' already exists.` });
            return;
          }
        }
        const prev = idx >= 0 ? nextList[idx] : {};

        const next = { ...prev, ...incoming, id };
        delete next.original_id;
        next.name = String(next.name || next.id || '').trim();
        next.mode = String(next.mode || 'scheduled').trim() || 'scheduled';
        next.database_id = sanitizeId(next.database_id);
        next.table = String(next.table || 'tag_log').trim() || 'tag_log';
        next.tags = Array.isArray(next.tags) ? next.tags : [];
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
      const newId = uniqueCopyId(id, used);
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

  // Read/write data check definitions for opcbridge-reporter.
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

        const id = sanitizeId(incoming.id);
        const originalId = sanitizeId(parsed?.original_id || incoming.original_id || '');
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'Data check "id" is required.' });
          return;
        }

        const root = readJsonFileOrNull(REPORTER_DATA_CHECKS_PATH) || { data_checks: [] };
        const rawList = Array.isArray(root?.data_checks) ? root.data_checks : [];
        const nextList = rawList
          .filter((c) => c && typeof c === 'object' && !Array.isArray(c))
          .map((c) => ({ ...c }));

        const lookupId = originalId || id;
        const idx = nextList.findIndex((c) => sanitizeId(c.id) === lookupId);
        if (originalId && originalId !== id) {
          const conflict = nextList.some((c, i) => i !== idx && sanitizeId(c.id) === id);
          if (conflict) {
            sendJson(res, 409, { ok: false, error: `Data check id '${id}' already exists.` });
            return;
          }
        }
        const prev = idx >= 0 ? nextList[idx] : {};
        const next = { ...prev, ...incoming, id };
        delete next.original_id;
        next.name = String(next.name || next.id || '').trim();
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
      const newId = uniqueCopyId(id, used);
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

  // Apply a report schedule by asking the long-running reporter service to reload.
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
          error: reload.error || reload.json?.error || `Reporter service reload failed with status ${reload.status}`,
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

        const test = await reporterApiRequest('POST', '/databases/test-config', { database: db }, 15000);
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
      const test = await reporterApiRequest('POST', `/databases/${encodeURIComponent(id)}/test`, null, 15000);
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

  const reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
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
    send(res, 200, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': 'no-store'
    }, data);
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
