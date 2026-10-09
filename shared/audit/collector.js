'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeJson, readJson, canonical, digest, files, syncDirectory } = require('./storage');
const { object, assertIdentifier, validateEvent } = require('./events');

class AuditCollector {
  constructor(config = {}) {
    this.enabled = config.enabled === true;
    this.config = config;
    this.error = '';
    if (!this.enabled) return;
    if (!path.isAbsolute(config.data_dir || '')) throw new Error('Collector data_dir must be absolute');
    if (!Array.isArray(config.nodes) || !config.nodes.length) throw new Error('Collector requires enrolled nodes');
    const seen = new Set(); const tokens = new Set();
    for (const node of config.nodes) {
      assertIdentifier(node.site_id, 'site_id'); assertIdentifier(node.node_id, 'node_id');
      if (typeof node.token !== 'string' || !/^[!-~]{32,512}$/.test(node.token)) throw new Error('Each node requires a token of 32–512 characters');
      const id = `${node.site_id}/${node.node_id}`;
      if (seen.has(id) || tokens.has(node.token)) throw new Error('Duplicate enrolled node or token');
      seen.add(id); tokens.add(node.token);
    }
  }
  authenticate(token) {
    if (!this.enabled || typeof token !== 'string' || token.length > 512) return null;
    const candidate = crypto.createHash('sha256').update(token).digest();
    return this.config.nodes.find(node => crypto.timingSafeEqual(candidate, crypto.createHash('sha256').update(node.token).digest())) || null;
  }
  acceptsTransport(req) {
    if (req.socket?.encrypted || this.config.allow_http === true) return true;
    const address = String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
    if (this.config.allow_loopback_http === true && ['127.0.0.1', '::1'].includes(address)) return true;
    return Array.isArray(this.config.trusted_proxy_addresses) && this.config.trusted_proxy_addresses.includes(address) && req.headers['x-forwarded-proto'] === 'https';
  }
  eventPath(id) {
    const hash = digest(id);
    return path.join(this.config.data_dir, 'events', hash.slice(0, 2), `${hash}.json`);
  }
  ingest(node, body) {
    if (!this.enabled) throw new Error('Central audit collector is disabled');
    if (!object(body) || !Array.isArray(body.events) || body.events.length > 50) throw new Error('Expected a batch of at most 50 events');
    assertIdentifier(body.component, 'component');
    const events = body.events.map(event => {
      const normalized = validateEvent(event, node);
      if (normalized.component !== body.component) throw new Error('Batch component does not match event');
      return normalized;
    });
    const ids = new Set();
    for (const event of events) {
      if (ids.has(event.event_id)) throw new Error('Duplicate event ID in batch');
      ids.add(event.event_id);
      const file = this.eventPath(event.event_id);
      if (fs.existsSync(file) && canonical(readJson(file).event) !== canonical(event)) throw new Error('Event ID conflicts with an existing record');
    }
    const accepted = [];
    try {
      for (const event of events) {
        const file = this.eventPath(event.event_id);
        if (!fs.existsSync(file)) writeJson(file, { received_ms: Date.now(), event }, true);
        else {
          // Also finish a previous attempt whose directory sync/ack failed.
          const fd = fs.openSync(file, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
          syncDirectory(path.dirname(file));
        }
        accepted.push(event.event_id);
      }
      const pending = body.health?.pending_count;
      writeJson(path.join(this.config.data_dir, 'nodes', `${digest(`${node.site_id}/${node.node_id}/${body.component}`)}.json`), {
        site_id: node.site_id, node_id: node.node_id, component: body.component,
        last_received_ms: Date.now(), reported_pending_count: Number.isSafeInteger(pending) && pending >= 0 ? pending : null,
        reported_error: String(body.health?.last_error || '').slice(0, 1000),
        reported_capture_error: String(body.health?.last_capture_error || '').slice(0, 1000),
        reported_capture_failures: Number.isSafeInteger(body.health?.capture_failures) && body.health.capture_failures >= 0 ? body.health.capture_failures : null
      });
      this.error = '';
      return { ok: true, accepted };
    } catch (error) { this.error = error.message; throw error; }
  }
  query(filters = {}) {
    if (!this.enabled) throw new Error('Central audit collector is disabled');
    const limit = Math.max(1, Math.min(5000, Number(filters.limit) || 400));
    const after = Number(filters.since_ms) || 0; const before = Number(filters.until_ms) || 0;
    const matches = [];
    const base = path.join(this.config.data_dir, 'events');
    let shards = [];
    try { shards = fs.readdirSync(base).filter(name => /^[0-9a-f]{2}$/.test(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const shard of shards) for (const file of files(path.join(base, shard))) {
      const record = readJson(file); const event = record.event;
      if (after && event.timestamp_ms < after || before && event.timestamp_ms > before) continue;
      if (['site_id', 'node_id', 'station_id', 'component', 'action', 'result'].some(key => filters[key] && event[key] !== filters[key])) continue;
      if (filters.user && event.actor.name !== filters.user) continue;
      if (filters.connection_id && event.details.connection_id !== filters.connection_id) continue;
      if (filters.tag && event.details.tag !== filters.tag && event.details.name !== filters.tag) continue;
      if (filters.q && !JSON.stringify(record).toLowerCase().includes(String(filters.q).toLowerCase())) continue;
      matches.push(record);
    }
    matches.sort((a, b) => b.event.timestamp_ms - a.event.timestamp_ms || a.event.event_id.localeCompare(b.event.event_id));
    return { ok: true, matched: matches.length, events: matches.slice(0, limit) };
  }
  status() {
    const observed = this.enabled ? files(path.join(this.config.data_dir, 'nodes')).map(readJson) : [];
    return { enabled: this.enabled, last_error: this.error, nodes: this.enabled ? this.config.nodes.map(node => ({
      site_id: node.site_id, node_id: node.node_id, components: observed.filter(item => item.site_id === node.site_id && item.node_id === node.node_id)
    })) : [] };
  }
}
module.exports = { AuditCollector };
