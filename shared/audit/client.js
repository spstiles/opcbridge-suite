'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { createEvent, validateEvent, assertIdentifier } = require('./events');
const { writeJson, readJson, files, syncDirectory } = require('./storage');

function postBatch(url, token, body, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const request = (url.protocol === 'https:' ? https : http).request(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, Authorization: `Bearer ${token}` }
    }, response => {
      let size = 0; const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 256 * 1024) { response.destroy(new Error('Collector response is too large')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error(`Collector HTTP ${response.statusCode}`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid collector response')); }
      });
    });
    request.on('error', reject);
    const timeout = setTimeout(() => request.destroy(new Error('Collector request timed out')), timeoutMs);
    timeout.unref();
    request.on('close', () => clearTimeout(timeout));
    request.end(payload);
  });
}

class AuditClient {
  constructor(config, component, transport = postBatch, validateOnly = false) {
    this.enabled = config.forwarding?.enabled === true;
    this.component = assertIdentifier(component, 'component');
    this.identity = config.node;
    this.settings = config.forwarding || {};
    this.transport = transport; this.busy = false; this.timer = null; this.stopped = false;
    this.state = { last_success_ms: 0, last_attempt_ms: 0, last_error: '', last_capture_error: '', capture_failures: 0 };
    if (!this.enabled) return;
    assertIdentifier(this.identity?.node_id, 'node_id'); assertIdentifier(this.identity?.site_id, 'site_id');
    if (!path.isAbsolute(this.settings.queue_dir || '')) throw new Error('Forwarding queue_dir must be absolute');
    this.directory = path.join(this.settings.queue_dir, this.component);
    this.pendingDirectory = path.join(this.directory, 'pending');
    this.statePath = path.join(this.directory, 'status.json');
    this.url = new URL(this.settings.url);
    if (this.url.protocol !== 'https:' && !(this.url.protocol === 'http:' && this.settings.allow_http === true)) throw new Error('Audit forwarding requires HTTPS (or explicit allow_http for a test network)');
    if (this.url.username || this.url.password || this.url.hash || this.url.search || this.url.pathname !== '/api/audit/ingest') throw new Error('Use the collector /api/audit/ingest URL without embedded credentials');
    if (typeof this.settings.token !== 'string' || !/^[!-~]{32,512}$/.test(this.settings.token)) throw new Error('Forwarding requires a node token of 32–512 characters');
    this.maxBytes = Number(this.settings.max_pending_bytes) || 64 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxBytes) || this.maxBytes < 65536) throw new Error('Invalid max_pending_bytes');
    const identityPath = path.join(this.directory, 'identity.json');
    if (fs.existsSync(identityPath)) {
      const previous = readJson(identityPath);
      if ((previous.site_id !== this.identity.site_id || previous.node_id !== this.identity.node_id) && files(this.pendingDirectory).length) throw new Error('Cannot change node identity while audit events are pending');
    }
    if (validateOnly) return;
    writeJson(identityPath, { site_id: this.identity.site_id, node_id: this.identity.node_id });
    if (fs.existsSync(this.statePath)) this.state = { ...this.state, ...readJson(this.statePath) };
  }
  saveState() { writeJson(this.statePath, this.state); }
  captureFailure(error) {
    this.state.last_capture_error = String(error.message || error);
    this.state.capture_failures++;
    try { this.saveState(); } catch { /* In-memory status still exposes local storage failure. */ }
  }
  record(input) {
    if (!this.enabled) return null;
    try {
      const event = createEvent(this.identity, this.component, input);
      const pending = files(this.pendingDirectory);
      const bytes = pending.reduce((total, file) => total + fs.statSync(file).size, 0);
      if (bytes + Buffer.byteLength(JSON.stringify(event)) + 1 > this.maxBytes) throw new Error('Audit pending queue is full; existing unacknowledged events are retained');
      writeJson(path.join(this.pendingDirectory, `${String(event.timestamp_ms).padStart(16, '0')}-${event.event_id}.json`), event, true);
      this.state.last_capture_error = '';
      return event;
    } catch (error) { this.captureFailure(error); return null; }
  }
  status() {
    if (!this.enabled) return { enabled: false, component: this.component };
    try {
      const pending = files(this.pendingDirectory);
      const timestamps = pending.map(file => readJson(file).timestamp_ms);
      return { enabled: true, component: this.component, site_id: this.identity.site_id, node_id: this.identity.node_id,
        pending_count: pending.length, pending_bytes: pending.reduce((sum, file) => sum + fs.statSync(file).size, 0),
        oldest_pending_ms: timestamps.length ? timestamps.reduce((oldest, timestamp) => Math.min(oldest, timestamp), Infinity) : null, ...this.state };
    } catch (error) { return { enabled: true, component: this.component, ...this.state, last_error: error.message, pending_count: null }; }
  }
  async flush() {
    if (!this.enabled || this.busy) return;
    this.busy = true;
    try {
      this.state.last_attempt_ms = Date.now();
      const queued = []; let bytes = 0;
      for (const file of files(this.pendingDirectory)) {
        const event = validateEvent(readJson(file), this.identity);
        if (event.component !== this.component) throw new Error('Queued event component mismatch');
        bytes += Buffer.byteLength(JSON.stringify(event));
        if (queued.length && bytes > 1024 * 1024 || queued.length === 50) break;
        queued.push({ file, event });
      }
      const response = await this.transport(this.url, this.settings.token, {
        component: this.component, events: queued.map(item => item.event), health: this.status()
      });
      const sent = new Set(queued.map(item => item.event.event_id));
      if (response?.ok !== true || !Array.isArray(response.accepted) || response.accepted.some(id => !sent.has(id)) || new Set(response.accepted).size !== response.accepted.length) throw new Error('Collector acknowledgment does not match the batch');
      if (queued.length && !response.accepted.length) throw new Error('Collector acknowledged no queued events');
      const accepted = new Set(response.accepted);
      for (const item of queued) if (accepted.has(item.event.event_id)) fs.unlinkSync(item.file);
      if (queued.length) syncDirectory(this.pendingDirectory);
      this.state.last_success_ms = Date.now(); this.state.last_error = '';
      this.saveState();
    } catch (error) {
      this.state.last_error = String(error.message || error);
      try { this.saveState(); } catch { /* Expose storage failure via status; retain the queue. */ }
    } finally { this.busy = false; }
  }
  start() {
    if (!this.enabled || this.timer) return;
    this.stopped = false;
    const base = Math.max(1000, Math.min(60000, Number(this.settings.interval_ms) || 5000));
    let failures = 0;
    const run = async () => {
      await this.flush();
      if (this.stopped) return;
      failures = this.state.last_error ? Math.min(failures + 1, 6) : 0;
      const delay = Math.min(60000, base * Math.pow(2, failures));
      this.timer = setTimeout(run, delay); this.timer.unref();
    };
    this.timer = setTimeout(run, 0); this.timer.unref();
  }
  stop() { this.stopped = true; clearTimeout(this.timer); this.timer = null; }
}
module.exports = { AuditClient, postBatch };
