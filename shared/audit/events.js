'use strict';
const crypto = require('node:crypto');
const { canonical } = require('./storage');
const identifier = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENT_BYTES = 64 * 1024;

function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !identifier.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}
function redact(value, depth = 0) {
  if (depth > 12) return '[depth limit]';
  if (Array.isArray(value)) return value.map(item => redact(item, depth + 1));
  if (object(value)) {
    const result = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      result[key] = /password|passwd|secret|token|cookie|authorization|credential|salt|password_hash/i.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return result;
  }
  return value;
}

function validateEvent(event, identity) {
  if (!object(event) || event.schema_version !== 1 || !uuid.test(event.event_id || '')) throw new Error('Invalid audit event envelope');
  for (const key of ['site_id', 'node_id', 'component']) assertIdentifier(event[key], key);
  if (identity && (event.node_id !== identity.node_id || event.site_id !== identity.site_id)) throw new Error('Event identity does not match enrolled node');
  if (!Number.isSafeInteger(event.timestamp_ms) || event.timestamp_ms <= 0) throw new Error('Invalid event timestamp');
  for (const key of ['action', 'target', 'result', 'station_id']) {
    if (typeof event[key] !== 'string' || event[key].length > 512) throw new Error(`Invalid event ${key}`);
  }
  if (!event.action || !object(event.actor) || typeof event.actor.name !== 'string' || event.actor.name.length > 256 ||
      !['authenticated', 'client_reported', 'unknown', 'service'].includes(event.actor.attribution)) throw new Error('Invalid audit actor');
  if (!object(event.details)) throw new Error('Invalid audit details');
  if (Buffer.byteLength(canonical(event)) > MAX_EVENT_BYTES) throw new Error('Audit event exceeds 64 KiB');
  // Keep only the versioned contract; callers cannot inject collector receipt fields.
  return {
    schema_version: 1, event_id: event.event_id.toLowerCase(), timestamp_ms: event.timestamp_ms,
    site_id: event.site_id, node_id: event.node_id, component: event.component,
    station_id: event.station_id, actor: { name: event.actor.name, attribution: event.actor.attribution },
    action: event.action, target: event.target, result: event.result, details: redact(event.details)
  };
}

function createEvent(identity, component, input) {
  return validateEvent({
    schema_version: 1, event_id: crypto.randomUUID(), timestamp_ms: input.timestamp_ms || Date.now(),
    site_id: identity.site_id, node_id: identity.node_id, component,
    station_id: String(input.station_id || identity.station_id || ''),
    actor: input.actor || { name: '', attribution: 'unknown' },
    action: String(input.action || ''), target: String(input.target || ''), result: String(input.result || ''),
    details: input.details || {}
  }, identity);
}
module.exports = { object, assertIdentifier, createEvent, validateEvent, MAX_EVENT_BYTES };
