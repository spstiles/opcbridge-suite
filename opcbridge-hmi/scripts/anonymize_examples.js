#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const stripJsonComments = require("strip-json-comments");

const ROOT = path.join(__dirname, "..");

const stripTrailingCommas = (raw) => raw.replace(/,\s*([}\]])/g, "$1");

const parseJsoncFile = async (fullPath) => {
  const raw = await fsp.readFile(fullPath, "utf8");
  const cleaned = stripTrailingCommas(stripJsonComments(raw));
  const parsed = JSON.parse(cleaned);
  return { raw, parsed };
};

const listFiles = async (dir, suffix) => {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(suffix))
    .map((e) => path.join(dir, e.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
};

const walk = (value, visitor) => {
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, visitor));
    return;
  }
  if (!value || typeof value !== "object") return;
  visitor(value);
  Object.values(value).forEach((v) => walk(v, visitor));
};

const collectStrings = (docs) => {
  const connectionIds = new Set();
  const tagNames = new Set();
  const hostLike = new Set();

  docs.forEach((doc) => {
    walk(doc, (obj) => {
      if (typeof obj.connection_id === "string") connectionIds.add(obj.connection_id);
      if (typeof obj.tag === "string") tagNames.add(obj.tag);

      Object.entries(obj).forEach(([k, v]) => {
        if (typeof v !== "string") return;
        const key = k.toLowerCase();
        if (key.includes("host") || key.includes("hostname") || key.includes("url") || key.includes("endpoint")) {
          hostLike.add(v);
        }
      });
    });
  });

  return {
    connectionIds: Array.from(connectionIds).sort(),
    tagNames: Array.from(tagNames).sort(),
    hostLike: Array.from(hostLike).sort()
  };
};

const makeIndexMap = (values, prefix) => {
  const out = new Map();
  values.forEach((v, idx) => {
    const n = String(idx + 1).padStart(3, "0");
    out.set(v, `${prefix}${n}`);
  });
  return out;
};

const anonymizeValue = (value, maps) => {
  if (Array.isArray(value)) return value.map((v) => anonymizeValue(v, maps));
  if (!value || typeof value !== "object") return value;

  const out = {};
  Object.entries(value).forEach(([k, v]) => {
    if (k === "connection_id" && typeof v === "string") {
      out[k] = maps.connectionIds.get(v) || "conn000";
      return;
    }
    if (k === "tag" && typeof v === "string") {
      out[k] = maps.tagNames.get(v) || "tag000";
      return;
    }
    if (typeof v === "string") {
      const lower = k.toLowerCase();
      if (lower.includes("write") && lower.includes("token")) {
        out[k] = "OPCBRIDGE_WRITE_TOKEN";
        return;
      }
      if (lower.includes("host") || lower.includes("hostname")) {
        out[k] = "OPCBRIDGE_HOST";
        return;
      }
      out[k] = v
        .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "X.X.X.X")
        .replace(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g, "HOST.DOMAIN");
      return;
    }
    out[k] = anonymizeValue(v, maps);
  });
  return out;
};

const writeExample = async ({ inputPath, outputPath, maps }) => {
  const { parsed } = await parseJsoncFile(inputPath);
  const anonymized = anonymizeValue(parsed, maps);
  const body = `${JSON.stringify(anonymized, null, 2)}\n`;
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, body, "utf8");
};

const main = async () => {
  const configPath = path.join(ROOT, "public", "js", "config.jsonc");
  const screensDir = path.join(ROOT, "screens");
  const screenFiles = (await listFiles(screensDir, ".jsonc"))
    .filter((p) => !p.toLowerCase().endsWith(".jsonc.example"));

  const docs = [];
  if (fs.existsSync(configPath)) docs.push((await parseJsoncFile(configPath)).parsed);
  for (const file of screenFiles) {
    docs.push((await parseJsoncFile(file)).parsed);
  }

  const collected = collectStrings(docs);
  const maps = {
    connectionIds: makeIndexMap(collected.connectionIds, "conn"),
    tagNames: makeIndexMap(collected.tagNames, "tag"),
    hostLike: makeIndexMap(collected.hostLike, "host")
  };

  let configCount = 0;
  if (fs.existsSync(configPath)) {
    await writeExample({
      inputPath: configPath,
      outputPath: `${configPath}.example`,
      maps
    });
    configCount = 1;
  }

  for (const file of screenFiles) {
    await writeExample({
      inputPath: file,
      outputPath: `${file}.example`,
      maps
    });
  }

  console.log(`Wrote ${configCount} config example(s) and ${screenFiles.length} screen example(s).`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

