const express = require("express");
const path = require("path");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");
const { convertGraphWorx } = require("./graphworx-import");

const SCREEN_EXTS = [".screen", ".jsonc"];

const posixify = (value) => String(value || "").replace(/\\/g, "/");

const normalizeRelDir = (value) => {
  const raw = posixify(value).trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return null;
  const parts = raw.split("/").filter(Boolean);
  for (const part of parts) {
    if (part === "." || part === "..") return null;
    if (!/^[A-Za-z0-9._ -]+$/.test(part)) return null;
  }
  return parts.join("/");
};

const normalizeScreenRelPath = (value, { defaultExt = ".screen" } = {}) => {
  const raw = posixify(value).trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return null;
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) return null;
  for (const part of parts) {
    if (part === "." || part === "..") return null;
    if (!/^[A-Za-z0-9._ -]+$/.test(part)) return null;
  }
  let rel = parts.join("/");
  const lower = rel.toLowerCase();
  if (!SCREEN_EXTS.some((ext) => lower.endsWith(ext))) {
    rel += defaultExt;
  }
  return rel;
};

const resolveExistingScreenPath = async (screensRoot, relPath) => {
  const rel = posixify(relPath).replace(/^\/+/, "");
  const lower = rel.toLowerCase();
  if (SCREEN_EXTS.some((ext) => lower.endsWith(ext))) return rel;
  for (const ext of SCREEN_EXTS) {
    const candidate = `${rel}${ext}`;
    try {
      await fs.promises.access(path.join(screensRoot, candidate), fs.constants.R_OK);
      return candidate;
    } catch {
      // try next
    }
  }
  return `${rel}.screen`;
};

const screenRefFromRelPath = (relPath) => {
  const rel = posixify(relPath).replace(/^\/+/, "");
  const lower = rel.toLowerCase();
  for (const ext of SCREEN_EXTS) {
    if (lower.endsWith(ext)) return rel.slice(0, -ext.length);
  }
  return rel.replace(/\.[^/.]+$/, "");
};

const isScreenFile = (name) => {
  const lower = String(name || "").toLowerCase();
  return SCREEN_EXTS.some((ext) => lower.endsWith(ext));
};

const ensureDir = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const listAllScreens = async (screensRoot) => {
  await ensureDir(screensRoot);
  const out = [];
  const walk = async (absDir, relDir) => {
    const entries = await fs.promises.readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        const nextRel = relDir ? `${relDir}/${entry.name}` : entry.name;
        await walk(path.join(absDir, entry.name), nextRel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isScreenFile(entry.name)) continue;
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      out.push({ path: relPath, ref: screenRefFromRelPath(relPath) });
    }
  };
  await walk(screensRoot, "");
  out.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: "base" }));
  return out;
};

const listScreensUnderDir = async (screensRoot, relDir = "") => {
  await ensureDir(screensRoot);
  const out = [];
  const baseDir = relDir ? path.join(screensRoot, relDir) : screensRoot;
  const walk = async (absDir, childRelDir) => {
    const entries = await fs.promises.readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        const nextRel = childRelDir ? `${childRelDir}/${entry.name}` : entry.name;
        await walk(path.join(absDir, entry.name), nextRel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isScreenFile(entry.name)) continue;
      const relPath = childRelDir ? `${childRelDir}/${entry.name}` : entry.name;
      out.push(relPath);
    }
  };
  await walk(baseDir, "");
  out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  return out;
};

const buildBackupFilename = () => {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `opcbridge-hmi-screens-${ts}.zip`;
};

const createScreensRouter = ({ rootDir, legacyScreensDir, imagesDir, audit }) => {
  const router = express.Router();
  const fsp = fs.promises;
  const screensRoot = path.join(String(rootDir || "/etc/opcbridge/hmi"), "screens");
  const legacyRoot = legacyScreensDir ? String(legacyScreensDir) : "";

  let initPromise = null;
  const ensureInitialized = async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      await ensureDir(screensRoot);

      const hasAnyScreenFiles = async (dir) => {
        try {
          const entries = await fsp.readdir(dir, { withFileTypes: true });
          return entries.some((e) => e?.isFile?.() && isScreenFile(e.name));
        } catch (error) {
          if (String(error).includes("ENOENT")) return false;
          throw error;
        }
      };

      const destHasScreens = await hasAnyScreenFiles(screensRoot);
      if (destHasScreens) return;
      if (!legacyRoot) return;

      const legacyHasScreens = await hasAnyScreenFiles(legacyRoot);
      if (!legacyHasScreens) return;

      const entries = await fsp.readdir(legacyRoot, { withFileTypes: true });
      let copied = 0;
      for (const entry of entries) {
        if (!entry?.isFile?.()) continue;
        if (!isScreenFile(entry.name)) continue;
        const src = path.join(legacyRoot, entry.name);
        const dst = path.join(screensRoot, entry.name);
        try {
          await fsp.access(dst, fs.constants.F_OK);
          continue; // don't overwrite
        } catch {
          // copy
        }
        await fsp.copyFile(src, dst);
        copied += 1;
      }
    })();
    return initPromise;
  };

  const toAbs = (relPath) => {
    const abs = path.join(screensRoot, relPath);
    if (!abs.startsWith(screensRoot)) return null;
    return abs;
  };

  router.get("/", async (req, res) => {
    try {
      await ensureInitialized();
      const screens = await listAllScreens(screensRoot);
      const defaultRef = screens[0]?.ref ?? null;
      res.json({ defaultRef, screens });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post("/import/graphworx", async (req, res) => {
    try {
      const raw = req.body?.raw;
      const filename = String(req.body?.filename || "Imported.gdfx");
      if (typeof raw !== "string") return res.status(400).json({ error: "Body must include { raw: string }." });
      if (Buffer.byteLength(raw, "utf8") > 10 * 1024 * 1024) return res.status(413).json({ error: "GDFX file exceeds the 10 MB import limit." });
      const converted = convertGraphWorx(raw, { filename });
      const extractedAssets = Array.isArray(converted.embeddedAssets) ? converted.embeddedAssets : [];
      if (extractedAssets.length) {
        const assetRoot = String(imagesDir || "");
        if (!assetRoot) throw new Error("HMI image storage is unavailable.");
        await ensureDir(assetRoot);
        for (const asset of extractedAssets) {
          const destination = path.join(assetRoot, asset.filename);
          if (!destination.startsWith(`${assetRoot}${path.sep}`)) throw new Error("Invalid extracted image filename.");
          try {
            await fsp.writeFile(destination, asset.bytes, { flag: "wx", mode: 0o640 });
          } catch (error) {
            if (error?.code !== "EEXIST") throw error;
          }
        }
      }
      delete converted.embeddedAssets;
      try {
        await audit?.(req, { event: "screen.import.preview", format: "graphworx64", filename, ...converted.summary });
      } catch {}
      res.json(converted);
    } catch (err) {
      res.status(400).json({ error: String(err?.message || err) });
    }
  });

  router.get("/backup", async (req, res) => {
    try {
      await ensureInitialized();
      await ensureDir(screensRoot);
      const filename = buildBackupFilename();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

      let archiver = null;
      try {
        // Optional dependency; don't crash the whole server if missing.
        archiver = require("archiver");
      } catch {
        res.status(501).json({ error: "Backup unavailable: missing optional dependency 'archiver'." });
        return;
      }

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        try {
          res.status(500).end(String(err));
        } catch {}
      });
      archive.pipe(res);

      // Add all screens preserving paths relative to screensRoot.
      const screens = await listAllScreens(screensRoot);
      for (const entry of screens) {
        const relPath = entry.path;
        const absPath = path.join(screensRoot, relPath);
        archive.file(absPath, { name: relPath });
      }

      await archive.finalize();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/folder/download", async (req, res) => {
    try {
      await ensureInitialized();
      const dir = normalizeRelDir(req.query?.dir);
      if (dir == null) return res.status(400).json({ error: "Bad dir." });
      const absDir = dir ? toAbs(dir) : screensRoot;
      if (!absDir) return res.status(400).json({ error: "Bad dir." });
      await fsp.access(absDir, fs.constants.R_OK);

      let archiver = null;
      try {
        archiver = require("archiver");
      } catch {
        res.status(501).json({ error: "Folder download unavailable: missing optional dependency 'archiver'." });
        return;
      }

      const filenameBase = dir ? path.basename(dir) : "screens";
      const filename = `${filenameBase || "screens"}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        try {
          res.status(500).end(String(err));
        } catch {}
      });
      archive.pipe(res);

      const files = await listScreensUnderDir(screensRoot, dir || "");
      for (const relPath of files) {
        const absPath = path.join(absDir, relPath);
        archive.file(absPath, { name: relPath });
      }

      await archive.finalize();
    } catch (err) {
      if (String(err).includes("ENOENT")) return res.status(404).json({ error: "Folder not found." });
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/list", async (req, res) => {
    try {
      await ensureInitialized();
      const dir = normalizeRelDir(req.query?.dir);
      if (dir == null) return res.status(400).json({ error: "Bad dir." });
      await ensureDir(screensRoot);
      const absDir = dir ? toAbs(dir) : screensRoot;
      if (!absDir) return res.status(400).json({ error: "Bad dir." });

      let entries = [];
      try {
        entries = await fsp.readdir(absDir, { withFileTypes: true });
      } catch (error) {
        if (String(error).includes("ENOENT")) return res.status(404).json({ error: "Folder not found." });
        throw error;
      }

      const dirs = [];
      const files = [];
      for (const entry of entries) {
        if (!entry) continue;
        if (entry.name.startsWith(".")) continue;
        if (entry.isDirectory()) {
          dirs.push(entry.name);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!isScreenFile(entry.name)) continue;
        const relPath = dir ? `${dir}/${entry.name}` : entry.name;
        let size = 0;
        let mtimeMs = 0;
        try {
          const stats = await fsp.stat(path.join(absDir, entry.name));
          size = Number(stats?.size || 0);
          mtimeMs = Number(stats?.mtimeMs || 0);
        } catch {}
        files.push({ name: entry.name, path: relPath, ref: screenRefFromRelPath(relPath), size, mtimeMs });
      }

      dirs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      files.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: "base" }));
      res.json({ dir, dirs, files });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/file", async (req, res) => {
    try {
      await ensureInitialized();
      const requested = normalizeScreenRelPath(req.query?.path, { defaultExt: "" });
      if (!requested) return res.status(400).json({ error: "Bad path." });
      const relPath = await resolveExistingScreenPath(screensRoot, requested);
      const abs = toAbs(relPath);
      if (!abs) return res.status(400).json({ error: "Bad path." });
      const raw = await fsp.readFile(abs, "utf8");
      let parsed = null;
      try {
        parsed = JSON.parse(stripJsonComments(raw));
      } catch {
        parsed = null;
      }
      res.json({ ok: true, path: relPath, ref: screenRefFromRelPath(relPath), raw, parsed });
    } catch (err) {
      if (String(err).includes("ENOENT")) return res.status(404).json({ error: "Screen not found." });
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/file/download", async (req, res) => {
    try {
      await ensureInitialized();
      const requested = normalizeScreenRelPath(req.query?.path, { defaultExt: "" });
      if (!requested) return res.status(400).json({ error: "Bad path." });
      const relPath = await resolveExistingScreenPath(screensRoot, requested);
      const abs = toAbs(relPath);
      if (!abs) return res.status(400).json({ error: "Bad path." });
      const filename = path.basename(relPath);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
      fs.createReadStream(abs).pipe(res);
    } catch (err) {
      if (String(err).includes("ENOENT")) return res.status(404).json({ error: "Screen not found." });
      res.status(500).json({ error: String(err) });
    }
  });

  router.put("/file", async (req, res) => {
    try {
      await ensureInitialized();
      const relPath = normalizeScreenRelPath(req.query?.path, { defaultExt: ".screen" });
      if (!relPath) return res.status(400).json({ error: "Bad path." });
      const abs = toAbs(relPath);
      if (!abs) return res.status(400).json({ error: "Bad path." });
      const raw = req.body?.raw;
      if (typeof raw !== "string") return res.status(400).json({ error: "Body must include { raw: string }" });

      await ensureDir(path.dirname(abs));
      await fsp.writeFile(abs, raw, "utf8");
      try {
        await audit?.(req, { event: "screen.save", path: relPath, ref: screenRefFromRelPath(relPath) });
      } catch {}
      res.json({ ok: true, path: relPath, ref: screenRefFromRelPath(relPath) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.delete("/file", async (req, res) => {
    try {
      await ensureInitialized();
      const requested = normalizeScreenRelPath(req.query?.path, { defaultExt: "" });
      if (!requested) return res.status(400).json({ error: "Bad path." });
      const relPath = await resolveExistingScreenPath(screensRoot, requested);
      const abs = toAbs(relPath);
      if (!abs) return res.status(400).json({ error: "Bad path." });
      await fsp.unlink(abs);
      try {
        await audit?.(req, { event: "screen.delete", path: relPath, ref: screenRefFromRelPath(relPath) });
      } catch {}
      res.json({ ok: true, path: relPath, ref: screenRefFromRelPath(relPath) });
    } catch (err) {
      if (String(err).includes("ENOENT")) return res.status(404).json({ error: "Screen not found." });
      res.status(500).json({ error: String(err) });
    }
  });

  router.post("/rename", async (req, res) => {
    try {
      await ensureInitialized();
      const oldRequested = normalizeScreenRelPath(req.body?.oldPath, { defaultExt: "" });
      const newRelPath = normalizeScreenRelPath(req.body?.newPath, { defaultExt: ".screen" });
      if (!oldRequested || !newRelPath) return res.status(400).json({ error: "Bad path." });
      const oldRelPath = await resolveExistingScreenPath(screensRoot, oldRequested);
      const oldAbs = toAbs(oldRelPath);
      const newAbs = toAbs(newRelPath);
      if (!oldAbs || !newAbs) return res.status(400).json({ error: "Bad path." });
      await ensureDir(path.dirname(newAbs));
      await fsp.rename(oldAbs, newAbs);
      try {
        await audit?.(req, {
          event: "screen.rename",
          oldPath: oldRelPath,
          newPath: newRelPath,
          ref: screenRefFromRelPath(newRelPath)
        });
      } catch {}
      res.json({ ok: true, path: newRelPath, ref: screenRefFromRelPath(newRelPath) });
    } catch (err) {
      if (String(err).includes("ENOENT")) return res.status(404).json({ error: "Screen not found." });
      res.status(500).json({ error: String(err) });
    }
  });

  router.post("/duplicate", async (req, res) => {
    try {
      await ensureInitialized();
      const sourceRequested = normalizeScreenRelPath(req.body?.sourcePath, { defaultExt: "" });
      const targetRelPath = normalizeScreenRelPath(req.body?.targetPath, { defaultExt: ".screen" });
      if (!sourceRequested || !targetRelPath) return res.status(400).json({ error: "Bad path." });
      const sourceRelPath = await resolveExistingScreenPath(screensRoot, sourceRequested);
      const sourceAbs = toAbs(sourceRelPath);
      const targetAbs = toAbs(targetRelPath);
      if (!sourceAbs || !targetAbs) return res.status(400).json({ error: "Bad path." });
      await ensureDir(path.dirname(targetAbs));
      await fsp.copyFile(sourceAbs, targetAbs);
      try {
        await audit?.(req, {
          event: "screen.duplicate",
          sourcePath: sourceRelPath,
          targetPath: targetRelPath,
          ref: screenRefFromRelPath(targetRelPath)
        });
      } catch {}
      res.json({ ok: true, path: targetRelPath, ref: screenRefFromRelPath(targetRelPath) });
    } catch (err) {
      if (String(err).includes("ENOENT")) return res.status(404).json({ error: "Screen not found." });
      res.status(500).json({ error: String(err) });
    }
  });

  router.post("/mkdir", async (req, res) => {
    try {
      await ensureInitialized();
      const dir = normalizeRelDir(req.body?.dir);
      if (dir == null) return res.status(400).json({ error: "Bad dir." });
      const abs = dir ? toAbs(dir) : screensRoot;
      if (!abs) return res.status(400).json({ error: "Bad dir." });
      await ensureDir(abs);
      try { await audit?.(req, { event: "screen.mkdir", dir }); } catch {}
      res.json({ ok: true, dir });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
};

module.exports = { createScreensRouter };
