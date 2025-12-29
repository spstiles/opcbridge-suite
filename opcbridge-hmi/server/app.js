const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const stripJsonComments = require("strip-json-comments");
const { createScreensRouter } = require("./screens");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "public", "js", "config.jsonc");
const CONFIG_EXAMPLE_PATH = path.join(ROOT, "public", "js", "config.jsonc.example");
const IMAGES_DIR = path.join(ROOT, "public", "img");
const PASSWORDS_PATH = path.join(ROOT, "passwords.jsonc");
const AUDIT_PATH = path.join(ROOT, "audit.jsonl");
const HMI_BUILD = "2025-12-28-alarms-panel-v18";
const AUDIT_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const AUDIT_PRUNE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastAuditPruneMs = 0;

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

const getClientIp = (req) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "";
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

const writeConfig = async (nextConfig) => {
  const opcbridge = nextConfig?.opcbridge || {};
  const alarms = nextConfig?.alarms || {};
  const hmi = nextConfig?.hmi || {};
  const defaultScreen = String(hmi.defaultScreen || "overview").trim().replace(/\.jsonc$/i, "") || "overview";
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
      viewOnlyMode: Boolean(hmi.viewOnlyMode)
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
    next();
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

  app.get("/api/auth/status", async (req, res) => {
    try {
      const info = await readPasswords();
      if (!info) return res.json({ initialized: false });
      const data = info.data || {};
      const users = Array.isArray(data.users) ? data.users : [];
      res.json({
        initialized: true,
        timeoutMinutes: Number(data.timeoutMinutes) || 0,
        users: users.map((user) => ({
          username: String(user.username || ""),
          role: normalizeRole(user.role)
        }))
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/auth/init", async (req, res) => {
    try {
      const existing = await readPasswords();
      if (existing) return res.status(409).json({ error: "Already initialized." });
      const username = normalizeUsername(req.body?.username);
      if (!username) return res.status(400).json({ error: "Invalid username." });
      const password = String(req.body?.password || "");
      if (password.length < 4) return res.status(400).json({ error: "Password too short." });
      const timeoutMinutes = Number(req.body?.timeoutMinutes) || 0;
      const iterations = 150000;
      const saltB64 = crypto.randomBytes(16).toString("base64");
      const hashB64 = hashPassword({ password, saltB64, iterations });
      const data = {
        timeoutMinutes: Math.max(0, Math.floor(timeoutMinutes)),
        users: [
          {
            username,
            role: "admin",
            kdf: { algo: "pbkdf2-sha256", iterations, saltB64, hashB64 }
          }
        ]
      };
      await writePasswords(data);
      await appendAudit(req, { event: "auth.init", username });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const info = await readPasswords();
      if (!info) return res.status(400).json({ error: "Not initialized." });
      const data = info.data || {};
      const username = normalizeUsername(req.body?.username);
      if (!username) return res.status(400).json({ error: "Invalid username." });
      const password = String(req.body?.password || "");
      const users = Array.isArray(data.users) ? data.users : [];
      const record = users.find((user) => String(user.username || "") === username);
      if (!record) return res.status(401).json({ error: "Invalid username or password." });
      const kdf = record.kdf || {};
      const expectedHash = Buffer.from(String(kdf.hashB64 || ""), "base64");
      if (!expectedHash.length) return res.status(401).json({ error: "Invalid username or password." });
      const actualHashB64 = hashPassword({ password, saltB64: kdf.saltB64, iterations: kdf.iterations });
      const actualHash = Buffer.from(actualHashB64, "base64");
      if (expectedHash.length !== actualHash.length || !crypto.timingSafeEqual(expectedHash, actualHash)) {
        return res.status(401).json({ error: "Invalid username or password." });
      }
      await appendAudit(req, { event: "auth.login", username, role: normalizeRole(record.role) });
      res.json({
        ok: true,
        username,
        role: normalizeRole(record.role),
        timeoutMinutes: Number(data.timeoutMinutes) || 0
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put("/api/auth/timeout", async (req, res) => {
    try {
      const info = await readPasswords();
      if (!info) return res.status(400).json({ error: "Not initialized." });
      const timeoutMinutes = Math.max(0, Math.floor(Number(req.body?.timeoutMinutes) || 0));
      const data = info.data || {};
      const next = { ...data, timeoutMinutes };
      await writePasswords(next);
      await appendAudit(req, { event: "auth.timeout.update", timeoutMinutes });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/auth/users", async (req, res) => {
    try {
      const info = await readPasswords();
      if (!info) return res.status(400).json({ error: "Not initialized." });
      const data = info.data || {};
      const users = Array.isArray(data.users) ? data.users : [];
      const username = normalizeUsername(req.body?.username);
      if (!username) return res.status(400).json({ error: "Invalid username." });
      const password = String(req.body?.password || "");
      if (password.length < 4) return res.status(400).json({ error: "Password too short." });
      if (users.some((u) => String(u.username || "") === username)) {
        return res.status(409).json({ error: "User already exists." });
      }
      const role = normalizeRole(req.body?.role);
      const iterations = 150000;
      const saltB64 = crypto.randomBytes(16).toString("base64");
      const hashB64 = hashPassword({ password, saltB64, iterations });
      const nextUsers = [
        ...users,
        { username, role, kdf: { algo: "pbkdf2-sha256", iterations, saltB64, hashB64 } }
      ];
      const next = { ...data, users: nextUsers };
      await writePasswords(next);
      await appendAudit(req, { event: "auth.user.create", username, role });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/auth/users/:username", async (req, res) => {
    try {
      const info = await readPasswords();
      if (!info) return res.status(400).json({ error: "Not initialized." });
      const data = info.data || {};
      const users = Array.isArray(data.users) ? data.users : [];
      const username = normalizeUsername(req.params.username);
      if (!username) return res.status(400).json({ error: "Invalid username." });
      const remaining = users.filter((user) => String(user.username || "") !== username);
      if (remaining.length === users.length) return res.status(404).json({ error: "User not found." });
      if (!remaining.some((user) => normalizeRole(user.role) === "admin")) {
        return res.status(400).json({ error: "Cannot remove the last admin user." });
      }
      const next = { ...data, users: remaining };
      await writePasswords(next);
      await appendAudit(req, { event: "auth.user.delete", username });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
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

  app.use("/api/screens", createScreensRouter({ rootDir: ROOT, audit: appendAudit }));

  app.get("/api/opc/tags", async (req, res) => {
    try {
      const { config: parsed } = await readConfig();
      const opcbridge = parsed?.opcbridge || {};
      const host = opcbridge.host || "127.0.0.1";
      const port = Number(opcbridge.httpPort) || 8080;
      const response = await fetch(`http://${host}:${port}/tags`, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        return res.status(502).json({ error: `opcbridge HTTP ${response.status}` });
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
      const response = await fetch(`http://${host}:${port}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ connection_id, name, value: valueString, token })
      });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `opcbridge HTTP ${response.status}`, details: text });
      }
      await appendAudit(req, { event: "opc.write", connection_id, tag: name, value: valueString });
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
      const limit = Math.max(1, Math.min(5000, Number(limitRaw) || 500));
      const url = `http://${host}:${port}/alarm/api/alarms/history?limit=${limit}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `opcbridge-alarms HTTP ${response.status}`, details: text });
      }
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(502).json({ error: "Invalid JSON from opcbridge-alarms.", details: text });
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
      const limit = Math.max(1, Math.min(5000, Number(limitRaw) || 500));
      const url = `http://${host}:${port}/alarm-history?limit=${limit}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await response.text();
      if (!response.ok) {
        return res.status(502).json({ error: `opcbridge HTTP ${response.status}`, details: text });
      }
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(502).json({ error: "Invalid JSON from opcbridge.", details: text });
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
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => allowed.has(path.extname(name).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      res.json({ files });
    } catch (error) {
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

  return app;
};

module.exports = { createApp };
