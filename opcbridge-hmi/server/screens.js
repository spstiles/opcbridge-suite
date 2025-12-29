const express = require("express");
const path = require("path");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");

const createScreensRouter = ({ rootDir, audit }) => {
  const router = express.Router();
  const screensDir = path.join(rootDir, "screens");
  const fsp = fs.promises;
  const isExample = (filename) => filename.toLowerCase().endsWith(".jsonc.example");
  const screenIdFromFilename = (filename) => filename.replace(/\.jsonc(\.example)?$/i, "");

  const ensureScreensDir = async () => {
    await fsp.mkdir(screensDir, { recursive: true });
  };

  const normalizeScreenId = (id) => {
    return String(id || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "")
      .replace(/^_+|_+$/g, "");
  };

  const listScreenFiles = async () => {
    await ensureScreensDir();
    const entries = await fsp.readdir(screensDir, { withFileTypes: true });
    const names = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().includes(".jsonc"))
      .map((entry) => entry.name);

    const byId = new Map();
    names.forEach((name) => {
      const id = screenIdFromFilename(name);
      if (!id) return;
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, name);
        return;
      }
      // Prefer real .jsonc over .jsonc.example
      if (isExample(prev) && !isExample(name)) byId.set(id, name);
    });

    return Array.from(byId.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  };

  const screenPathForId = (id) => {
    const candidates = [`${id}.jsonc`, `${id}.jsonc.example`];
    for (const filename of candidates) {
      const fullPath = path.join(screensDir, filename);
      if (!fullPath.startsWith(screensDir)) return null;
      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        return { filename, fullPath };
      } catch {
        // try next candidate
      }
    }
    return { filename: `${id}.jsonc`, fullPath: path.join(screensDir, `${id}.jsonc`) };
  };

  router.get("/", async (req, res) => {
    try {
      const files = await listScreenFiles();
      const screens = files.map((fn) => ({
        id: screenIdFromFilename(fn),
        filename: fn
      }));
      const defaultId = screens[0]?.id ?? null;
      res.json({ defaultId, screens });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const id = normalizeScreenId(req.params.id);
      if (!id) return res.status(400).json({ error: "Bad screen id." });
      const info = screenPathForId(id);
      if (!info) return res.status(400).json({ error: "Bad screen id." });

      const raw = await fsp.readFile(info.fullPath, "utf8");
      let parsed = null;
      try {
        parsed = JSON.parse(stripJsonComments(raw));
      } catch {
        parsed = null;
      }

      res.json({
        id,
        filename: info.filename,
        raw,
        parsed
      });
    } catch (err) {
      if (String(err).includes("ENOENT")) {
        return res.status(404).json({ error: "Screen not found." });
      }
      res.status(500).json({ error: String(err) });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const desiredIdRaw = normalizeScreenId(req.body?.id);
      const width = Number(req.body?.width ?? 1920);
      const height = Number(req.body?.height ?? 1080);

      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return res.status(400).json({ error: "Invalid width/height." });
      }

      let id = desiredIdRaw || "new_screen";
      await ensureScreensDir();

      const base = id;
      let finalId = base;
      let filename = `${finalId}.jsonc`;
      let fullPath = path.join(screensDir, filename);

      for (let i = 1; i < 1000; i += 1) {
        try {
          await fsp.access(fullPath, fs.constants.F_OK);
          finalId = `${base}_${i}`;
          filename = `${finalId}.jsonc`;
          fullPath = path.join(screensDir, filename);
        } catch {
          break;
        }
      }

      const template = `{\n  // Screen: ${finalId}\n  \"width\": ${Math.floor(width)},\n  \"height\": ${Math.floor(height)},\n  \"background\": \"#202533\",\n  \"objects\": []\n}\n`;

      await fsp.writeFile(fullPath, template, "utf8");
      try { await audit?.(req, { event: "screen.create", screenId: finalId, filename }); } catch {}
      res.json({ ok: true, id: finalId, filename, raw: template });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const id = normalizeScreenId(req.params.id);
      if (!id) return res.status(400).json({ error: "Bad screen id." });
      const info = screenPathForId(id);
      if (!info) return res.status(400).json({ error: "Bad screen id." });

      const raw = req.body?.raw;
      if (typeof raw !== "string") {
        return res.status(400).json({ error: "Body must include { raw: string }" });
      }

      await ensureScreensDir();
      await fsp.writeFile(info.fullPath, raw, "utf8");
      try { await audit?.(req, { event: "screen.update", screenId: id, filename: info.filename }); } catch {}
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post("/:id/duplicate", async (req, res) => {
    try {
      const srcId = normalizeScreenId(req.params.id);
      if (!srcId) return res.status(400).json({ error: "Missing source id." });

      const srcInfo = screenPathForId(srcId);
      if (!srcInfo) return res.status(400).json({ error: "Bad screen id." });
      await fsp.access(srcInfo.fullPath, fs.constants.F_OK);

      const desiredIdRaw = normalizeScreenId(req.body?.id);
      let id = desiredIdRaw || `${srcId}_copy`;
      const base = id;
      let finalId = base;
      let filename = `${finalId}.jsonc`;
      let fullPath = path.join(screensDir, filename);

      for (let i = 1; i < 1000; i += 1) {
        try {
          await fsp.access(fullPath, fs.constants.F_OK);
          finalId = `${base}_${i}`;
          filename = `${finalId}.jsonc`;
          fullPath = path.join(screensDir, filename);
        } catch {
          break;
        }
      }

      await fsp.copyFile(srcInfo.fullPath, fullPath);
      try { await audit?.(req, { event: "screen.duplicate", from: srcId, to: finalId, filename }); } catch {}
      res.json({ ok: true, id: finalId, filename });
    } catch (err) {
      if (String(err).includes("ENOENT")) {
        return res.status(404).json({ error: "Source screen not found." });
      }
      res.status(500).json({ error: String(err) });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const id = normalizeScreenId(req.params.id);
      if (!id) return res.status(400).json({ error: "Missing screen id." });

      const info = screenPathForId(id);
      if (!info) return res.status(400).json({ error: "Bad screen id." });

      await fsp.unlink(info.fullPath);
      try { await audit?.(req, { event: "screen.delete", screenId: id, filename: info.filename }); } catch {}
      res.json({ ok: true });
    } catch (err) {
      if (String(err).includes("ENOENT")) {
        return res.status(404).json({ error: "Screen not found." });
      }
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
};

module.exports = { createScreensRouter };
