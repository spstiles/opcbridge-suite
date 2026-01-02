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
const SYSTEMD_DROPIN_DIR = String(
  process.env.OPCBRIDGE_SCADA_SYSTEMD_DROPIN_DIR ||
  path.join('/etc/systemd/system', `${SYSTEMD_UNIT}.d`)
).trim();
const SYSTEMD_DROPIN_NAME = String(process.env.OPCBRIDGE_SCADA_SYSTEMD_DROPIN_NAME || '20-opcbridge-scada.conf').trim();
const SYSTEMD_DROPIN_PATH = path.join(SYSTEMD_DROPIN_DIR, SYSTEMD_DROPIN_NAME);

const DEFAULT_OPCBRIDGE_BIN = String(process.env.OPCBRIDGE_SCADA_OPCBRIDGE_BIN || '/opt/opcbridge-suite/bin/opcbridge').trim();
const DEFAULT_OPCBRIDGE_CONFIG_DIR = String(process.env.OPCBRIDGE_SCADA_OPCBRIDGE_CONFIG_DIR || '/etc/opcbridge').trim();

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
  if (upstreamPathname.startsWith('/auth/')) return true;
  if (upstreamPathname.startsWith('/config/')) return true;
  if (upstreamPathname === '/reload' || upstreamPathname === '/write') return true;
  return false;
}

function needsWriteToken(upstreamPathname) {
  return (
    upstreamPathname === '/reload' ||
    upstreamPathname === '/write' ||
    upstreamPathname === '/config/file' ||
    upstreamPathname === '/config/tags' ||
    upstreamPathname === '/config/bundle' ||
    upstreamPathname === '/config/delete' ||
    upstreamPathname === '/config/cert/upload'
  );
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
    bodyBuf = await readBody(req);

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
    timeout: 8000
  };

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
    sendJson(res, 502, { ok: false, error: String(err.message || err) });
  });

  if (bodyBuf) upstream.end(bodyBuf);
  else upstream.end();
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

      sendJson(res, 400, { ok: false, error: 'Unsupported source.', source, allowed: ['opcbridge_events', 'alarm_server_history', 'hmi_audit'] });
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
