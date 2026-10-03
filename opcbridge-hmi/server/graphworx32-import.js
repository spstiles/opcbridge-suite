const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const MAGIC = Buffer.from('d0cf11e0a1b11ae1', 'hex');
let importing = false;

const decodeGdf = (base64) => {
  if (typeof base64 !== 'string' || !base64.length || base64.length > 14 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('Invalid binary GDF upload.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > 10 * 1024 * 1024) throw new Error('GDF file exceeds the 10 MB import limit.');
  if (!bytes.subarray(0, 8).equals(MAGIC)) throw new Error('Not a GraphWorX32 OLE document.');
  return bytes;
};

const convertGraphWorx32 = async (base64, { filename = 'Imported.gdf', run = execute } = {}) => {
  const bytes = decodeGdf(base64);
  if (importing) throw new Error('Another GraphWorX32 import is in progress. Please wait.');
  importing = true;
  let temp;
  try {
    temp = await fs.mkdtemp(path.join(os.tmpdir(), 'hmi-gdf32-'));
    const source = path.join(temp, 'source.gdf');
    const output = path.join(temp, 'output.screen');
    await fs.writeFile(source, bytes, { mode: 0o600 });
    await run('python3', [path.resolve(__dirname, '../tools/graphworx32-recovery/build_screen.py'), source, output],
      { timeout: 60000, maxBuffer: 1024 * 1024, env: { ...process.env, TMPDIR: temp, PYTHONDONTWRITEBYTECODE: '1' } });
    if ((await fs.stat(output)).size > 64 * 1024 * 1024) throw new Error('Converted screen exceeds the 64 MB limit.');
    const screen = JSON.parse(await fs.readFile(output, 'utf8'));
    screen.objects = screen.objects.filter(obj => obj.id !== 'static_preview_warning');
    screen.layers = screen.layers.filter(layer => layer.id !== 'gdf32_layer_recovery_warning');
    screen.importInfo.sourceFile = path.basename(filename);
    const sum = values => Object.values(values || {}).reduce((total, n) => total + Number(n || 0), 0);
    let objects = 0;
    const count = list => { for (const obj of list) { objects++; count(obj.children || []); } };
    count(screen.objects);
    const skipped = sum(screen.importInfo.skippedControls) + sum(screen.importInfo.skippedBindings);
    return { screen, summary: { imported: true, format: 'graphworx32', objects, skipped,
      unresolved: 0, issues: 0, notices: screen.importInfo.conversionNotices || [],
      partial: true } };
  } catch (error) {
    if (error.code === 'ENOENT' || /No module named ['"]olefile/.test(error.stderr || '')) {
      throw new Error('GraphWorX32 import requires Python 3 and python3-olefile. Install HMI dependencies with --deps.');
    }
    if (error.killed) throw new Error('GraphWorX32 conversion timed out. No screen was imported.');
    throw new Error(error.stderr?.trim() || error.message);
  } finally {
    if (temp) await fs.rm(temp, { recursive: true, force: true });
    importing = false;
  }
};

module.exports = { convertGraphWorx32, decodeGdf };
