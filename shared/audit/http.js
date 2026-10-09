'use strict';

async function handleIngest(req, res, runtime, readBody, sendJson) {
  if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'Method not allowed' }); return; }
  const collector = runtime.collector;
  if (!collector.enabled) { sendJson(res, 503, { ok: false, error: 'Central audit collector is disabled' }); return; }
  if (!collector.acceptsTransport(req)) { sendJson(res, 426, { ok: false, error: 'Encrypted audit transport is required' }); return; }
  const match = /^Bearer ([^\s]+)$/.exec(String(req.headers.authorization || ''));
  const node = collector.authenticate(match?.[1]);
  if (!node) { sendJson(res, 401, { ok: false, error: 'Invalid audit node credential' }); return; }
  let body;
  try { body = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8')); }
  catch { sendJson(res, 400, { ok: false, error: 'Invalid audit batch body (maximum 2 MiB)' }); return; }
  try { sendJson(res, 200, collector.ingest(node, body)); }
  catch (error) {
    const storageFailure = typeof error.code === 'string';
    sendJson(res, storageFailure ? 503 : 400, { ok: false, error: storageFailure ? 'Audit storage unavailable; retry the same event IDs' : error.message });
  }
}
module.exports = { handleIngest };
