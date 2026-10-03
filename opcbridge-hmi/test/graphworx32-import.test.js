const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { convertGraphWorx32, decodeGdf } = require('../server/graphworx32-import');
const upload = Buffer.from('d0cf11e0a1b11ae100000000', 'hex').toString('base64');

test('binary import rejects invalid encoding, signatures and oversized uploads', () => {
  for (const value of ['', '!!!', Buffer.from('XML').toString('base64'), 'a'.repeat(15 * 1024 * 1024)]) {
    assert.throws(() => decodeGdf(value));
  }
});

test('native import removes the developer notice, summarizes skips and cleans temporary files', async () => {
  let directory;
  const result = await convertGraphWorx32(upload, { filename: 'Example.gdf', run: async (command, args, options) => {
    assert.equal(command, 'python3');
    assert.equal(options.timeout, 60000);
    directory = options.env.TMPDIR;
    await fs.writeFile(args[2], JSON.stringify({ objects: [{ id: 'static_preview_warning' }, { id: 'one', type: 'arc' }],
      layers: [{ id: 'gdf32_layer_recovery_warning' }, { id: 'default' }],
      importInfo: { skippedControls: { trend: 2 }, skippedBindings: { flash: 3 }, bindingsRecovered: { animator: { bindings: 107 } } } }));
  } });
  assert.equal(result.screen.objects.length, 1);
  assert.equal(result.screen.layers.length, 1);
  assert.equal(result.screen.importInfo.sourceFile, 'Example.gdf');
  assert.equal(result.summary.skipped, 5);
  assert.equal(result.summary.animators, 107);
  await assert.rejects(fs.access(directory));
});

test('missing Python dependency produces an actionable error and permits a later import', async () => {
  await assert.rejects(convertGraphWorx32(upload, { run: async () => {
    throw Object.assign(new Error('failed'), { stderr: "ModuleNotFoundError: No module named 'olefile'" });
  } }), /python3-olefile/);
  await assert.rejects(convertGraphWorx32(upload, { run: async () => { throw new Error('next attempt'); } }), /next attempt/);
});
