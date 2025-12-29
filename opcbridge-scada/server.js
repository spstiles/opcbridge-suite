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

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

const CONFIG_PATH = process.env.OPCBRIDGE_SCADA_CONFIG || path.join(ROOT, 'config.json');

const SECRETS_PATH = process.env.OPCBRIDGE_SCADA_SECRETS || path.join(ROOT, 'config.secrets.json');

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

function sendJson(res, status, obj) {
  send(res, status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  }, JSON.stringify(obj, null, 2));
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

  if (prefixName === 'opcbridge' && ADMIN_TOKEN) {
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
    res.writeHead(up.statusCode || 502, {
      'Content-Type': up.headers['content-type'] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    });
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

  if (url.pathname === '/api/config') {
    sendJson(res, 200, {
      ok: true,
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
