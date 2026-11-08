const fs = require("node:fs/promises");
const path = require("node:path");
const configPath = process.env.OPCBRIDGE_SCADA_CONFIG || path.join(__dirname, "../../opcbridge-scada/config.json");
function normalizeAlarmSource(config) {
  const alarms = config.alarms || {};
  if (alarms.scheme && !["http", "https"].includes(alarms.scheme)) throw new Error("Invalid alarm scheme");
  const port = (value, fallback) => {
    const result = value == null ? fallback : Number(value);
    if (!Number.isInteger(result) || result < 1 || result > 65535) throw new Error("Invalid alarm port");
    return result;
  };
  return { scheme: alarms.scheme === "https" ? "https" : "http", host: String(alarms.host || "127.0.0.1"),
    httpPort: port(alarms.port, 8085), wsPort: port(alarms.wsPort, 8086) };
}
async function readAlarmSource() {
  let raw;
  try { raw = await fs.readFile(configPath, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; return normalizeAlarmSource({}); }
  return normalizeAlarmSource(JSON.parse(raw));
}
module.exports = { readAlarmSource, normalizeAlarmSource };
