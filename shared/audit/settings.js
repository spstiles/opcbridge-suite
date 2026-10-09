'use strict';
const crypto = require('node:crypto');
const { assertIdentifier } = require('./events');
const { AuditClient } = require('./client');
const { AuditCollector } = require('./collector');

function publicSettings(config = {}, legacyIdentity = {}) {
  const identity = config.central?.identity_sync || legacyIdentity;
  const role = config.central?.role || (identity.mode === 'central' ? 'connected' : config.collector?.enabled ? 'central' : 'standalone');
  return {
    role, managed: Boolean(config.central), name: config.central?.name || identity.central_name || '',
    address: config.central?.address || identity.central_url || '',
    site_id: config.node?.site_id || '', node_id: config.node?.node_id || '',
    username: identity.username || '', password_set: Boolean(identity.password),
    token_set: Boolean(config.forwarding?.token), allow_http: config.forwarding?.allow_http === true && role === 'connected' || config.collector?.allow_http === true,
    interval_ms: identity.interval_ms || 60000,
    nodes: (config.collector?.nodes || []).filter(node => node.node_id !== config.node?.node_id || node.site_id !== config.node?.site_id).map(({ site_id, node_id }) => ({ site_id, node_id }))
  };
}

function buildSettings(body, previous = {}, legacyIdentity = {}, listenPort = 3010) {
  if (!['standalone', 'central', 'connected'].includes(body.role)) throw new Error('Choose an installation role.');
  const role = body.role;
  const oldIdentity = previous.central?.identity_sync || legacyIdentity;
  const node = { site_id: String(body.site_id || '').trim(), node_id: String(body.node_id || '').trim() };
  if (role !== 'standalone') { assertIdentifier(node.site_id, 'site ID'); assertIdentifier(node.node_id, 'installation ID'); }
  else Object.assign(node, previous.node || {});
  // Installed configs supply their own data paths; defaults apply to fresh installs.
  const forwarding = { queue_dir: '/var/lib/opcbridge/audit/outbox', max_pending_bytes: 67108864, interval_ms: 5000, ...previous.forwarding, enabled: role !== 'standalone' };
  const collector = { data_dir: '/var/lib/opcbridge/audit/central', trusted_proxy_addresses: [], ...previous.collector, enabled: role === 'central', allow_http: body.allow_http === true };
  const name = String(body.name || '').trim();
  const identity = { ...oldIdentity, mode: role === 'connected' ? 'central' : 'local', central_name: name, central_url: '', last_error: '', interval_ms: Math.max(15000, Number(body.interval_ms) || 60000) };
  let address = '';
  if (role === 'connected') {
    const raw = String(body.address || '').trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Enter the central SCADA address without a path or credentials.');
    if (url.protocol === 'http:' && body.allow_http !== true) throw new Error('HTTP requires explicit permission for this closed network.');
    address = url.origin;
    identity.central_url = address;
    identity.username = String(body.username || '').trim();
    const sameDirectory = oldIdentity.central_url === address && oldIdentity.username === identity.username;
    if (!sameDirectory) { identity.last_sync_ms = 0; identity.last_attempt_ms = 0; }
    identity.password = String(body.password || '') || (sameDirectory ? String(oldIdentity.password || '') : '');
    if (!name || !identity.username || !identity.password) throw new Error('Central name, username, and password are required.');
    forwarding.url = `${address}/api/audit/ingest`;
    forwarding.token = String(body.token || '').trim() || (previous.forwarding?.url === forwarding.url ? previous.forwarding?.token || '' : '');
    forwarding.allow_http = body.allow_http === true;
  } else if (role === 'central') {
    forwarding.url = `http://127.0.0.1:${listenPort}/api/audit/ingest`;
    forwarding.allow_http = true;
    const oldSelf = (previous.collector?.nodes || []).find(item => item.site_id === node.site_id && item.node_id === node.node_id);
    forwarding.token = oldSelf?.token || crypto.randomBytes(32).toString('hex');
    collector.allow_loopback_http = true;
    if (!Array.isArray(body.nodes) || body.nodes.length > 500) throw new Error('Supply an enrolled installations list (maximum 500).');
    collector.nodes = body.nodes.map(item => {
      const old = (previous.collector?.nodes || []).find(entry => entry.site_id === item.site_id && entry.node_id === item.node_id);
      return { site_id: item.site_id, node_id: item.node_id, token: String(item.token || '').trim() || old?.token || '' };
    });
    collector.nodes.push({ ...node, token: forwarding.token });
  }
  const next = { ...previous, node, forwarding, collector, central: { role, name, address, identity_sync: identity } };
  validateSettings(next);
  return next;
}
function validateSettings(config) {
  new AuditCollector(config.collector);
  for (const component of ['scada', 'hmi']) new AuditClient(config, component, undefined, true);
}
module.exports = { publicSettings, buildSettings, validateSettings };
