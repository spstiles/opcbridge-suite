const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const stripJsonComments = require("strip-json-comments");
const { createScreensRouter } = require("./screens");

const ROOT = path.join(__dirname, "..");
const FILES_ROOT = String(process.env.OPCBRIDGE_HMI_FILES_ROOT || "/etc/opcbridge/hmi");
const CONFIG_PATH = path.join(ROOT, "public", "js", "config.jsonc");
const CONFIG_EXAMPLE_PATH = path.join(ROOT, "public", "js", "config.jsonc.example");
const IMAGES_DIR = path.join(ROOT, "public", "img");
const PASSWORDS_PATH = path.join(ROOT, "passwords.jsonc");
const AUDIT_PATH = path.join(ROOT, "audit.jsonl");
const HMI_BUILD = "2025-12-28-alarms-panel-v18";
const SUITE_VERSION_PATH = path.join(ROOT, "..", "VERSION");
const COMPONENT_VERSION_PATH = path.join(ROOT, "VERSION");
const AUDIT_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const AUDIT_PRUNE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastAuditPruneMs = 0;

const readVersionFile = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const cleaned = String(raw || "").trim();
    return cleaned || "dev";
  } catch {
    return "dev";
  }
};

const SUITE_VERSION = readVersionFile(SUITE_VERSION_PATH);
const COMPONENT_VERSION = readVersionFile(COMPONENT_VERSION_PATH);
const IMAGE_UPLOAD_LIMIT_MB = Math.max(1, Math.min(1024, Number(process.env.OPCBRIDGE_HMI_IMAGE_UPLOAD_LIMIT_MB) || 250));
const IMAGE_UPLOAD_LIMIT_BYTES = IMAGE_UPLOAD_LIMIT_MB * 1024 * 1024;

const readConfig = async () => {
  let raw = "";
  try {
    raw = await fsp.readFile(CONFIG_PATH, "utf8");
  } catch (error) {
    if (!String(error).includes("ENOENT")) throw error;
    raw = await fsp.readFile(CONFIG_EXAMPLE_PATH, "utf8");
  }
  const config = JSON.parse(stripJsonComments(raw));
  return { raw, config };
};

const normalizeUsername = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ");
  if (cleaned.length > 64) return null;
  if (!/^[A-Za-z0-9 _.-]+$/.test(cleaned)) return null;
  return cleaned;
};

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin" || role === "editor" || role === "operator") return role;
  return "viewer";
};

const readPasswords = async () => {
  try {
    const raw = await fsp.readFile(PASSWORDS_PATH, "utf8");
    const data = JSON.parse(stripJsonComments(raw));
    return { raw, data };
  } catch (error) {
    if (String(error).includes("ENOENT")) return null;
    throw error;
  }
};

const writePasswords = async (data) => {
  const output = `${JSON.stringify(data, null, 2)}\n`;
  await fsp.writeFile(PASSWORDS_PATH, output, "utf8");
};

const hashPassword = ({ password, saltB64, iterations }) => {
  const salt = Buffer.from(String(saltB64 || ""), "base64");
  const iters = Number(iterations) || 0;
  if (!salt.length) throw new Error("Invalid password salt.");
  if (!Number.isFinite(iters) || iters < 10_000 || iters > 5_000_000) throw new Error("Invalid password iterations.");
  const key = crypto.pbkdf2Sync(String(password || ""), salt, iters, 32, "sha256");
  return key.toString("base64");
};

const normalizeRemoteAddress = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw === "::1") return "127.0.0.1";
  if (raw.startsWith("::ffff:")) return raw.slice("::ffff:".length);
  return raw;
};

const parseIpv4ToInt = (ip) => {
  const parts = String(ip || "").trim().split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    out = (out << 8) | (n & 0xff);
  }
  return out >>> 0;
};

const parseCidr = (entry) => {
  const raw = String(entry || "").trim();
  if (!raw) return null;
  const [ipPart, prefixPart] = raw.split("/");
  const ip = String(ipPart || "").trim();
  const ipInt = parseIpv4ToInt(ip);
  if (ipInt == null) return null;
  let prefix = 32;
  if (prefixPart != null) {
    if (!/^\d+$/.test(prefixPart)) return null;
    prefix = Number(prefixPart);
  }
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) return null;
  return { ip, ipInt, prefix };
};

const ipInCidr = (ipInt, cidr) => {
  const prefix = cidr.prefix;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((cidr.ipInt & mask) >>> 0);
};

const clientIpMatchesList = (clientIp, entries) => {
  const ip = normalizeRemoteAddress(clientIp);
  const ipInt = parseIpv4ToInt(ip);
  if (!ip || ipInt == null) return false;
  const arr = Array.isArray(entries) ? entries : [];
  for (const entry of arr) {
    const cidr = parseCidr(entry);
    if (!cidr) continue;
    if (ipInCidr(ipInt, cidr)) return true;
  }
  return false;
};

const getClientIp = (req, { trustProxyHeaders } = {}) => {
  const trust = Boolean(trustProxyHeaders);
  const forwarded = trust ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "";
  return normalizeRemoteAddress(forwarded || req.socket?.remoteAddress || "");
};

const pruneAuditLog = async () => {
  const now = Date.now();
  if (now - lastAuditPruneMs < AUDIT_PRUNE_MIN_INTERVAL_MS) return;
  lastAuditPruneMs = now;
  let raw = "";
  try {
    raw = await fsp.readFile(AUDIT_PATH, "utf8");
  } catch (error) {
    if (String(error).includes("ENOENT")) return;
    throw error;
  }
  const cutoff = now - AUDIT_RETENTION_MS;
  const kept = [];
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      const ts = Date.parse(parsed?.ts);
      if (!Number.isFinite(ts)) return kept.push(trimmed);
      if (ts >= cutoff) kept.push(trimmed);
    } catch {
      kept.push(trimmed);
    }
  });
  await fsp.writeFile(AUDIT_PATH, `${kept.join("\n")}${kept.length ? "\n" : ""}`, "utf8");
};

const appendAudit = async (req, event) => {
  const actorUser = String(req.headers["x-opcbridge-hmi-user"] || "").trim();
  const actorRole = String(req.headers["x-opcbridge-hmi-role"] || "").trim();
  const payload = {
    ts: new Date().toISOString(),
    ip: getClientIp(req),
    ua: String(req.headers["user-agent"] || ""),
    user: actorUser || undefined,
    role: actorRole || undefined,
    ...event
  };
  const line = `${JSON.stringify(payload)}\n`;
  await fsp.appendFile(AUDIT_PATH, line, "utf8");
  await pruneAuditLog();
};

const parseAuditTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
};

const auditTextMatches = (value, needle) => {
  const n = String(needle || "").trim().toLowerCase();
  if (!n) return true;
  return String(value ?? "").toLowerCase().includes(n);
};

const readAuditEvents = async (query = {}) => {
  const limit = Math.max(1, Math.min(10000, Math.trunc(Number(query.limit) || 500)));
  const startMs = parseAuditTime(query.start || query.from);
  const endMs = parseAuditTime(query.end || query.to);
  const filters = {
    user: String(query.user || "").trim().toLowerCase(),
    event: String(query.event || query.event_type || "").trim().toLowerCase(),
    result: String(query.result || "").trim().toLowerCase(),
    connection_id: String(query.connection_id || "").trim().toLowerCase(),
    tag: String(query.tag || "").trim().toLowerCase(),
    value: String(query.value || "").trim().toLowerCase(),
    q: String(query.q || "").trim().toLowerCase()
  };
  let raw = "";
  try {
    raw = await fsp.readFile(AUDIT_PATH, "utf8");
  } catch (error) {
    if (String(error).includes("ENOENT")) return { exists: false, total: 0, matched: 0, limit, events: [] };
    throw error;
  }
  const events = [];
  let total = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    total += 1;
    let item = null;
    try {
      item = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const tsMs = parseAuditTime(item?.ts);
    if (startMs != null && (tsMs == null || tsMs < startMs)) continue;
    if (endMs != null && (tsMs == null || tsMs > endMs)) continue;
    const eventName = String(item?.event_type || item?.event || "").toLowerCase();
    const valueText = [item?.value, item?.old_value, item?.new_value].map((v) => String(v ?? "")).join(" ");
    if (filters.user && String(item?.user || "").toLowerCase() !== filters.user) continue;
    if (filters.event && eventName !== filters.event) continue;
    if (filters.result && String(item?.result || "").toLowerCase() !== filters.result) continue;
    if (filters.connection_id && !auditTextMatches(item?.connection_id, filters.connection_id)) continue;
    if (filters.tag && !auditTextMatches(item?.tag, filters.tag)) continue;
    if (filters.value && !auditTextMatches(valueText, filters.value)) continue;
    if (filters.q && !auditTextMatches(JSON.stringify(item), filters.q)) continue;
    events.push(item);
  }
  events.sort((a, b) => (parseAuditTime(b?.ts) || 0) - (parseAuditTime(a?.ts) || 0));
  return { exists: true, total, matched: events.length, limit, events: events.slice(0, limit) };
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const auditEventsToCsv = (events) => {
  const columns = ["ts", "user", "role", "ip", "event", "result", "connection_id", "tag", "old_value", "new_value", "screen", "object_label", "action", "error"];
  const lines = [columns.join(",")];
  for (const item of events) {
    lines.push(columns.map((key) => csvCell(key === "event" ? (item?.event_type || item?.event) : item?.[key])).join(","));
  }
  return `${lines.join("\n")}\n`;
};

const writeConfig = async (nextConfig) => {
  const opcbridge = nextConfig?.opcbridge || {};
  const alarms = nextConfig?.alarms || {};
  const hmi = nextConfig?.hmi || {};
  const defaultScreen = String(hmi.defaultScreen || "overview").trim().replace(/\.jsonc$/i, "") || "overview";

  const sanitizeCidrList = (value) => {
    const arr = Array.isArray(value) ? value : [];
    return arr
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  };

  const writeAccessIn = hmi?.writeAccess;
  const writeAccess = (writeAccessIn && typeof writeAccessIn === "object")
    ? {
        allow: sanitizeCidrList(writeAccessIn.allow),
        deny: sanitizeCidrList(writeAccessIn.deny),
        trustProxyHeaders: Boolean(writeAccessIn.trustProxyHeaders)
      }
    : null;

  const cleaned = {
    opcbridge: {
      host: String(opcbridge.host || "127.0.0.1"),
      httpPort: Number(opcbridge.httpPort) || 8080,
      wsPort: Number(opcbridge.wsPort) || 8090,
      writeToken: String(opcbridge.writeToken || "")
    },
    alarms: {
      host: String(alarms.host || ""),
      httpPort: Number(alarms.httpPort) || 8085,
      wsPort: Number(alarms.wsPort) || 8086
    },
    hmi: {
      defaultScreen,
      touchscreenMode: Boolean(hmi.touchscreenMode),
      viewOnlyMode: Boolean(hmi.viewOnlyMode),
      ...(writeAccess ? { writeAccess } : {})
    }
  };
  const opcbridgeJson = JSON.stringify(cleaned.opcbridge, null, 2).replace(/\n/g, "\n  ");
  const alarmsJson = JSON.stringify(cleaned.alarms, null, 2).replace(/\n/g, "\n  ");
  const hmiJson = JSON.stringify(cleaned.hmi, null, 2).replace(/\n/g, "\n  ");
  const output = `{\n` +
    `  // opcbridge connection settings used by the HMI client\n` +
    `  \"opcbridge\": ${opcbridgeJson},\n` +
    `  // opcbridge-alarms connection settings (optional)\n` +
    `  \"alarms\": ${alarmsJson},\n` +
    `  // HMI runtime settings\n` +
    `  \"hmi\": ${hmiJson}\n` +
    `}\n`;
  await fsp.writeFile(CONFIG_PATH, output, "utf8");
};

const normalizeSvgName = (name) => {
  const raw = String(name || "").trim();
  if (!raw) return null;
  const base = raw.replace(/\.svg$/i, "");
  const cleaned = base
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) return null;
  return `${cleaned}.svg`;
};

const resolveSvgPath = (name) => {
  const filename = normalizeSvgName(name);
  if (!filename) return null;
  const fullPath = path.join(IMAGES_DIR, filename);
  if (!fullPath.startsWith(IMAGES_DIR)) return null;
  return { filename, fullPath };
};

const resolveImagePath = (name) => {
  const raw = String(name || "").trim();
  if (!raw) return null;
  if (raw.includes("/") || raw.includes("\\")) return null;
  const allowed = new Set([".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
  const ext = path.extname(raw).toLowerCase();
  if (!allowed.has(ext)) return null;
  const filename = path.basename(raw);
  const fullPath = path.join(IMAGES_DIR, filename);
  if (!fullPath.startsWith(IMAGES_DIR)) return null;
  return { filename, fullPath };
};

const createApp = () => {
  const app = express();

  app.use(express.json({ limit: "5mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-OPCBRIDGE-HMI-Build", HMI_BUILD);
    res.setHeader("X-OPCBRIDGE-Suite-Version", SUITE_VERSION);
    res.setHeader("X-OPCBRIDGE-HMI-Version", COMPONENT_VERSION);
    next();
  });

  app.get("/api/version", (_req, res) => {
    res.json({
      ok: true,
      service: "opcbridge-hmi",
      suite_version: SUITE_VERSION,
      component_version: COMPONENT_VERSION,
      build: HMI_BUILD
    });
  });

  // Dedicated panel/tablet entry point. The browser enforces the forced
  // touchscreen runtime mode based on this pathname; all assets and APIs are
  // shared with the normal HMI application.
  app.get(/^\/touch(?:\/[^?]*)?$/, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(ROOT, "public", "index.html"));
  });
  app.get(/^\/touch\/$/, (req, res) => {
    const queryIndex = req.originalUrl.indexOf("?");
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
    res.redirect(302, `/touch${query}`);
  });

  app.use(express.static(path.join(ROOT, "public"), {
    etag: true,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (/\.(html|js|css)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "no-store");
      }
    }
  }));

  app.get("/img/:name", async (req, res) => {
    try {
      const info = resolveImagePath(req.params.name);
      if (!info) return res.status(400).send("Invalid image name.");
      await fsp.access(info.fullPath, fs.constants.R_OK);
      res.sendFile(info.fullPath);
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).send("Image not found.");
      }
      res.status(500).send(String(error));
    }
  });

  app.get("/api/build", async (req, res) => {
    try {
      const indexPath = path.join(ROOT, "public", "index.html");
      const hmiPath = path.join(ROOT, "public", "js", "hmi.js");
      const [indexStat, hmiStat] = await Promise.all([fsp.stat(indexPath), fsp.stat(hmiPath)]);
      res.json({
        build: HMI_BUILD,
        root: ROOT,
        now: new Date().toISOString(),
        index: { path: indexPath, mtimeMs: indexStat.mtimeMs, size: indexStat.size },
        hmi: { path: hmiPath, mtimeMs: hmiStat.mtimeMs, size: hmiStat.size }
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Auth is centralized in opcbridge (single source of truth for users/roles).
  // Proxy /api/auth/* -> opcbridge /auth/* and forward Cookie/Set-Cookie so login is shared across apps.
  app.use("/api/auth", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const host = String(opcbridge.host || "127.0.0.1");
      const port = Number(opcbridge.httpPort) || 8080;

      const upstreamPath = String(req.originalUrl || "").replace(/^\/api/, "") || "/auth/status";
      const url = `http://${host}:${port}${upstreamPath}`;

      const headers = { Accept: req.headers["accept"] || "*/*" };
      if (req.method !== "GET" && req.method !== "HEAD") headers["Content-Type"] = "application/json";
      if (req.headers["cookie"]) headers["Cookie"] = String(req.headers["cookie"]);
      if (req.headers["x-admin-token"]) headers["X-Admin-Token"] = String(req.headers["x-admin-token"]);

      const response = await fetch(url, {
        method: req.method,
        headers,
        body: (req.method === "GET" || req.method === "HEAD") ? undefined : JSON.stringify(req.body || {})
      });

      const setCookie = response.headers.get("set-cookie");
      if (setCookie) res.setHeader("Set-Cookie", setCookie);

      const text = await response.text();
      res.status(response.status);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
      res.send(text);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // SCADA enforces each report's published/HMI-enabled settings. The HMI
  // forwards cookies when present, but HMI-enabled report display is public.
  app.use("/api/reports", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const scada = parsed?.scada || {};
      const host = String(scada.host || "127.0.0.1");
      const port = Number(scada.httpPort) || 3010;
      const upstreamPath = String(req.originalUrl || "/api/reports");
      const headers = { Accept: req.headers["accept"] || "*/*" };
      if (req.headers["cookie"]) headers.Cookie = String(req.headers["cookie"]);
      if (req.method !== "GET" && req.method !== "HEAD") headers["Content-Type"] = "application/json";
      const response = await fetch(`http://${host}:${port}${upstreamPath}`, {
        method: req.method,
        headers,
        body: (req.method === "GET" || req.method === "HEAD") ? undefined : JSON.stringify(req.body || {})
      });
      ["content-type", "content-disposition", "set-cookie"].forEach((name) => {
        const value = response.headers.get(name);
        if (value) res.setHeader(name, value);
      });
      res.setHeader("Cache-Control", "no-store");
      res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.status(502).json({ ok: false, error: `Report API unavailable: ${String(error?.message || error)}` });
    }
  });

  app.use("/api/data-entry", async (req, res) => {
    try {
      const { config: parsed } = await readConfig(); const scada = parsed?.scada || {};
      const host = String(scada.host || "127.0.0.1"), port = Number(scada.httpPort) || 3010;
      const headers = { Accept: req.headers["accept"] || "application/json" };
      if (req.headers["cookie"]) headers.Cookie = String(req.headers["cookie"]);
      if (req.method !== "GET" && req.method !== "HEAD") headers["Content-Type"] = "application/json";
      const response = await fetch(`http://${host}:${port}${req.originalUrl}`, { method: req.method, headers,
        body: (req.method === "GET" || req.method === "HEAD") ? undefined : JSON.stringify(req.body || {}) });
      const text = await response.text(); res.status(response.status).set("Cache-Control", "no-store").type(response.headers.get("content-type") || "application/json").send(text);
    } catch (error) { res.status(502).json({ ok: false, error: `Data-entry API unavailable: ${String(error?.message || error)}` }); }
  });

  app.get("/api/audit/status", async (req, res) => {
    try {
      let raw = "";
      try {
        raw = await fsp.readFile(AUDIT_PATH, "utf8");
      } catch (error) {
        if (String(error).includes("ENOENT")) return res.json({ exists: false, count: 0 });
        throw error;
      }
      const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
      res.json({ exists: true, count: lines.length });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/audit/tail", async (req, res) => {
    try {
      const requested = Math.floor(Number(req.query?.lines) || 200);
      const maxLines = 2000;
      const keep = Math.min(maxLines, Math.max(1, requested));
      let raw = "";
      try {
        raw = await fsp.readFile(AUDIT_PATH, "utf8");
      } catch (error) {
        if (String(error).includes("ENOENT")) return res.json({ exists: false, lines: [] });
        throw error;
      }
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);
      const tail = lines.slice(Math.max(0, lines.length - keep));
      res.json({ exists: true, total: lines.length, lines: tail });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/audit/query", async (req, res) => {
    try {
      const data = await readAuditEvents(req.query || {});
      res.json({ ok: true, ...data });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get("/api/audit/csv", async (req, res) => {
    try {
      const data = await readAuditEvents(req.query || {});
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="hmi-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(auditEventsToCsv(data.events || []));
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get("/api/config", async (req, res) => {
    try {
      const { raw, config } = await readConfig();
      res.json({ raw, config });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const incoming = req.body?.config;
      if (!incoming || typeof incoming !== "object") {
        return res.status(400).json({ error: "Body must include { config: object }." });
      }
      const { config: current } = await readConfig();
      const next = {
        ...current,
        ...incoming,
        opcbridge: {
          ...(current?.opcbridge || {}),
          ...(incoming?.opcbridge || {})
        },
        hmi: {
          ...(current?.hmi || {}),
          ...(incoming?.hmi || {})
        }
      };
      await writeConfig(next);
      await appendAudit(req, { event: "config.update" });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.use(
    "/api/screens",
    createScreensRouter({
      rootDir: FILES_ROOT,
      legacyScreensDir: path.join(ROOT, "screens"),
      audit: appendAudit
    })
  );

  // Proxy opcbridge admin auth so a login from HMI can set the shared cookie.
  // This enables single-login across opcbridge / scada / hmi (same hostname).
  app.use("/api/opcbridge/auth", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const host = String(opcbridge.host || "127.0.0.1");
      const port = Number(opcbridge.httpPort) || 8080;

      const upstreamPath = String(req.originalUrl || "").replace(/^\/api\/opcbridge/, "") || "/auth/status";
      const url = `http://${host}:${port}${upstreamPath}`;

      const headers = { Accept: req.headers["accept"] || "*/*" };
      if (req.headers["content-type"]) headers["Content-Type"] = String(req.headers["content-type"]);
      if (req.headers["cookie"]) headers["Cookie"] = String(req.headers["cookie"]);

      const response = await fetch(url, {
        method: req.method,
        headers,
        body: (req.method === "GET" || req.method === "HEAD") ? undefined : req.body
      });

      const setCookie = response.headers.get("set-cookie");
      if (setCookie) res.setHeader("Set-Cookie", setCookie);

      const text = await response.text();
      res.status(response.status);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
      res.send(text);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/opc/tags", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const host = opcbridge.host || "127.0.0.1";
      const port = Number(opcbridge.httpPort) || 8080;
      const upstreamUrl = new URL(`http://${host}:${port}/tags`);
      Object.entries(req.query || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== undefined && item !== null && String(item) !== "") {
              upstreamUrl.searchParams.append(key, String(item));
            }
          });
          return;
        }
        if (value !== undefined && value !== null && String(value) !== "") {
          upstreamUrl.searchParams.set(key, String(value));
        }
      });
      const response = await fetch(String(upstreamUrl), { headers: { Accept: "application/json" } });
      if (!response.ok) {
        return res.status(502).json({ error: `OPCBridge HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/opc/tags/query", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const host = opcbridge.host || "127.0.0.1";
      const port = Number(opcbridge.httpPort) || 8080;
      const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
      const normalized = tags
        .map((tag) => ({
          connection_id: String(tag?.connection_id || "").trim(),
          name: String(tag?.name || tag?.tag || "").trim()
        }))
        .filter((tag) => tag.connection_id && tag.name)
        .slice(0, 500);
      const response = await fetch(`http://${host}:${port}/tags/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ tags: normalized })
      });
      if (!response.ok) {
        return res.status(502).json({ error: `OPCBridge HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/opc/write", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const hmi = parsed?.hmi || {};

      if (Boolean(hmi.viewOnlyMode)) {
        return res.status(403).json({ error: "HMI is in view-only mode (writes disabled)." });
      }

      const access = hmi?.writeAccess;
      const accessConfigured = (access && typeof access === "object");
      if (accessConfigured) {
        const trustProxyHeaders = Boolean(access.trustProxyHeaders);
        const clientIp = getClientIp(req, { trustProxyHeaders });
        const deny = access?.deny;
        const allow = access?.allow;

        if (clientIpMatchesList(clientIp, deny)) {
          return res.status(403).json({ error: `Write blocked for client ${clientIp} (deny list).` });
        }
        if (!Array.isArray(allow) || allow.length === 0) {
          return res.status(403).json({ error: "Writes are disabled (no writeAccess.allow entries configured)." });
        }
        if (!clientIpMatchesList(clientIp, allow)) {
          return res.status(403).json({ error: `Write blocked for client ${clientIp} (not in allow list).` });
        }
      }

      const host = opcbridge.host || "127.0.0.1";
      const port = Number(opcbridge.httpPort) || 8080;
      const token = String(opcbridge.writeToken || "");
      const connection_id = String(req.body?.connection_id || "").trim();
      const name = String(req.body?.name || req.body?.tag || "").trim();
      const value = req.body?.value;
      if (!connection_id || !name) {
        return res.status(400).json({ error: "Body must include { connection_id, tag } (or name)." });
      }
      if (value === undefined || value === null) {
        return res.status(400).json({ error: "Body must include { value }." });
      }
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        return res.status(400).json({ error: "Value must be a string, number, or boolean." });
      }
      const valueString = typeof value === "string" ? value : String(value);
      const auditIn = (req.body?.audit && typeof req.body.audit === "object") ? req.body.audit : {};
      const auditBase = {
        event: "hmi.tag_write",
        event_type: "tag_write",
        connection_id,
        tag: name,
        old_value: auditIn.old_value,
        new_value: valueString,
        value: valueString,
        screen: auditIn.screen,
        screen_id: auditIn.screen_id,
        object_id: auditIn.object_id,
        object_label: auditIn.object_label,
        action: auditIn.action
      };
      let response = null;
      try {
        response = await fetch(`http://${host}:${port}/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ connection_id, name, value: valueString, token })
        });
      } catch (error) {
        await appendAudit(req, { ...auditBase, result: "failure", error: String(error.message || error) });
        throw error;
      }
      const text = await response.text();
      if (!response.ok) {
        let upstreamError = `OPCBridge HTTP ${response.status}`;
        let details = text;
        try {
          const parsedText = JSON.parse(text);
          details = parsedText;
          if (parsedText?.error) upstreamError += ` - ${String(parsedText.error)}`;
        } catch {
          if (text) upstreamError += ` - ${text}`;
        }
        await appendAudit(req, { ...auditBase, result: "failure", error: upstreamError, details });
        return res.status(502).json({ error: upstreamError, details });
      }
      await appendAudit(req, { ...auditBase, result: "success" });
      try {
        res.json(JSON.parse(text));
      } catch {
        res.json({ ok: true, raw: text });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/alarms/history", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const alarms = parsed?.alarms || {};
      const opcbridge = parsed?.opcbridge || {};
      const host = String(alarms.host || opcbridge.host || "127.0.0.1");
      const port = Number(alarms.httpPort) || 8085;
      const limitRaw = req.query?.limit;
      const limit = Math.max(1, Math.min(50000, Number(limitRaw) || 500));
      const params = new URLSearchParams({ limit: String(limit) });
      const sinceMs = Number(req.query?.since_ms);
      if (Number.isFinite(sinceMs) && sinceMs > 0) params.set("since_ms", String(Math.round(sinceMs)));
      const url = `http://${host}:${port}/alarm/api/alarms/history?${params.toString()}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `OPCBridge Alarms HTTP ${response.status}`, details: text });
      }
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(502).json({ error: "Invalid JSON from OPCBridge Alarms.", details: text });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/alarms/panel", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const alarms = parsed?.alarms || {};
      const opcbridge = parsed?.opcbridge || {};
      const host = String(alarms.host || opcbridge.host || "127.0.0.1");
      const port = Number(alarms.httpPort) || 8085;
      const rowsRaw = req.query?.rows || req.query?.limit;
      const rows = Math.max(1, Math.min(2000, Number(rowsRaw) || 500));
      const params = new URLSearchParams({ rows: String(rows) });
      const sinceMs = Number(req.query?.since_ms);
      if (Number.isFinite(sinceMs) && sinceMs > 0) params.set("since_ms", String(Math.round(sinceMs)));
      const url = `http://${host}:${port}/alarm/api/alarms/panel?${params.toString()}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `OPCBridge Alarms HTTP ${response.status}`, details: text });
      }
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(502).json({ error: "Invalid JSON from OPCBridge Alarms.", details: text });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Current alarm state snapshot from opcbridge-alarms (not just event history).
  app.get("/api/alarms/all", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const alarms = parsed?.alarms || {};
      const opcbridge = parsed?.opcbridge || {};
      const host = String(alarms.host || opcbridge.host || "127.0.0.1");
      const port = Number(alarms.httpPort) || 8085;
      const url = `http://${host}:${port}/alarm/api/alarms/all`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `OPCBridge Alarms HTTP ${response.status}`, details: text });
      }
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(502).json({ error: "Invalid JSON from OPCBridge Alarms.", details: text });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Convenience proxy for opcbridge's built-in alarm history database.
  // This is useful when running without opcbridge-alarms.
  app.get("/api/opcbridge/alarm-history", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const host = String(opcbridge.host || "127.0.0.1");
      const port = Number(opcbridge.httpPort) || 8080;
      const limitRaw = req.query?.limit;
      const limit = Math.max(1, Math.min(50000, Number(limitRaw) || 500));
      const params = new URLSearchParams({ limit: String(limit) });
      const sinceMs = Number(req.query?.since_ms);
      if (Number.isFinite(sinceMs) && sinceMs > 0) params.set("since_ms", String(Math.round(sinceMs)));
      const url = `http://${host}:${port}/alarm-history?${params.toString()}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `OPCBridge HTTP ${response.status}`, details: text });
      }
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(502).json({ error: "Invalid JSON from OPCBridge.", details: text });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/svg-files", async (req, res) => {
    try {
      await fsp.mkdir(IMAGES_DIR, { recursive: true });
      const entries = await fsp.readdir(IMAGES_DIR, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /\.svg$/i.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/img-files", async (req, res) => {
    try {
      await fsp.mkdir(IMAGES_DIR, { recursive: true });
      const entries = await fsp.readdir(IMAGES_DIR, { withFileTypes: true });
      const allowed = new Set([".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
      const fileNames = [];
      const items = [];
      for (const entry of entries) {
        if (!entry?.isFile?.()) continue;
        const name = String(entry.name || "");
        if (!allowed.has(path.extname(name).toLowerCase())) continue;
        fileNames.push(name);
        let size = 0;
        let mtimeMs = 0;
        try {
          const stats = await fsp.stat(path.join(IMAGES_DIR, name));
          size = Number(stats?.size || 0);
          mtimeMs = Number(stats?.mtimeMs || 0);
        } catch {}
        items.push({ name, size, mtimeMs });
      }
      fileNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
      res.json({ files: fileNames, items });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/img-files/rename", async (req, res) => {
    try {
      const oldInfo = resolveImagePath(req.body?.oldName);
      const newInfo = resolveImagePath(req.body?.newName);
      if (!oldInfo || !newInfo) return res.status(400).json({ error: "Invalid image filename." });
      await fsp.mkdir(IMAGES_DIR, { recursive: true });
      await fsp.rename(oldInfo.fullPath, newInfo.fullPath);
      try { await audit?.(req, { event: "img.rename", oldFilename: oldInfo.filename, newFilename: newInfo.filename }); } catch {}
      res.json({ ok: true, filename: newInfo.filename });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "Image not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/img-files/duplicate", async (req, res) => {
    try {
      const sourceInfo = resolveImagePath(req.body?.sourceName);
      const targetInfo = resolveImagePath(req.body?.targetName);
      if (!sourceInfo || !targetInfo) return res.status(400).json({ error: "Invalid image filename." });
      await fsp.mkdir(IMAGES_DIR, { recursive: true });
      await fsp.copyFile(sourceInfo.fullPath, targetInfo.fullPath);
      try { await audit?.(req, { event: "img.duplicate", sourceFilename: sourceInfo.filename, targetFilename: targetInfo.filename }); } catch {}
      res.json({ ok: true, filename: targetInfo.filename });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "Image not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/img-files/:name/download", async (req, res) => {
    try {
      const info = resolveImagePath(req.params.name);
      if (!info) return res.status(400).json({ error: "Invalid image filename." });
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename=\"${info.filename}\"`);
      fs.createReadStream(info.fullPath).pipe(res);
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "Image not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  // Streaming upload to avoid buffering large files in memory.
  app.post("/api/img-files/upload", async (req, res) => {
    try {
      const filename = String(req.query?.filename || "").trim();
      const info = resolveImagePath(filename);
      if (!info) return res.status(400).json({ error: "Invalid image filename." });

      const contentLength = Number(req.headers["content-length"] || 0);
      if (Number.isFinite(contentLength) && contentLength > 0 && contentLength > IMAGE_UPLOAD_LIMIT_BYTES) {
        return res.status(413).json({ error: `Upload too large (max ${IMAGE_UPLOAD_LIMIT_MB} MB).` });
      }

      await fsp.mkdir(IMAGES_DIR, { recursive: true });

      const tmpPath = `${info.fullPath}.uploading`;
      let written = 0;
      let aborted = false;
      const out = fs.createWriteStream(tmpPath, { flags: "w" });

      const abort = async () => {
        aborted = true;
        try { out.destroy(new Error("upload_too_large")); } catch {}
        try { req.destroy(); } catch {}
        try { await fsp.unlink(tmpPath); } catch {}
      };

      req.on("data", (chunk) => {
        written += chunk.length;
        if (!aborted && written > IMAGE_UPLOAD_LIMIT_BYTES) {
          abort()
            .then(() => {
              if (!res.headersSent) {
                res.status(413).json({ error: `Upload too large (max ${IMAGE_UPLOAD_LIMIT_MB} MB).` });
              }
            })
            .catch(() => {});
        }
      });

      await new Promise((resolve, reject) => {
        out.on("error", reject);
        req.on("error", reject);
        out.on("finish", resolve);
        req.pipe(out);
      });

      if (aborted) return;

      if (written <= 0) {
        try { await fsp.unlink(tmpPath); } catch {}
        return res.status(400).json({ error: "Missing image body." });
      }

      await fsp.rename(tmpPath, info.fullPath);
      try { await audit?.(req, { event: "img.upload", filename: info.filename }); } catch {}
      res.json({ ok: true, filename: info.filename });
    } catch (error) {
      if (res.headersSent) return;
      if (String(error || "").includes("upload_too_large")) {
        return res.status(413).json({ error: `Upload too large (max ${IMAGE_UPLOAD_LIMIT_MB} MB).` });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/svg-files/:name", async (req, res) => {
    try {
      const info = resolveSvgPath(req.params.name);
      if (!info) return res.status(400).json({ error: "Invalid SVG name." });
      const raw = await fsp.readFile(info.fullPath, "utf8");
      res.json({ filename: info.filename, raw });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "SVG not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/img-files/:name", async (req, res) => {
    try {
      const info = resolveImagePath(req.params.name);
      if (!info) return res.status(400).json({ error: "Invalid image filename." });
      await fsp.unlink(info.fullPath);
      try { await audit?.(req, { event: "img.delete", filename: info.filename }); } catch {}
      res.json({ ok: true });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "Image not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.put("/api/svg-files/:name", async (req, res) => {
    try {
      const info = resolveSvgPath(req.params.name);
      if (!info) return res.status(400).json({ error: "Invalid SVG name." });
      const raw = req.body?.raw;
      if (typeof raw !== "string") {
        return res.status(400).json({ error: "Body must include { raw: string }" });
      }
      await fsp.mkdir(IMAGES_DIR, { recursive: true });
      await fsp.writeFile(info.fullPath, raw, "utf8");
      res.json({ ok: true, filename: info.filename });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/svg-files/:name/copy", async (req, res) => {
    try {
      const srcInfo = resolveSvgPath(req.params.name);
      if (!srcInfo) return res.status(400).json({ error: "Invalid source SVG name." });
      const destInfo = resolveSvgPath(req.body?.to);
      if (!destInfo) return res.status(400).json({ error: "Invalid target SVG name." });
      await fsp.mkdir(IMAGES_DIR, { recursive: true });
      await fsp.copyFile(srcInfo.fullPath, destInfo.fullPath);
      res.json({ ok: true, filename: destInfo.filename });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "Source SVG not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/svg-files/:name", async (req, res) => {
    try {
      const info = resolveSvgPath(req.params.name);
      if (!info) return res.status(400).json({ error: "Invalid SVG name." });
      await fsp.unlink(info.fullPath);
      res.json({ ok: true });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return res.status(404).json({ error: "SVG not found." });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  // Make upload-size failures readable in the UI (instead of an HTML error page).
  app.use((err, req, res, next) => {
    if (!err) return next();
    const isTooLarge = err?.type === "entity.too.large" || err?.name === "PayloadTooLargeError";
    if (!isTooLarge) return next(err);
    res.status(413).json({ error: `Upload too large (max ${IMAGE_UPLOAD_LIMIT_MB} MB).` });
  });

  return app;
};

module.exports = { createApp };
