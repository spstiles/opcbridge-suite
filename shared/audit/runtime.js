'use strict';
const fs = require('node:fs');
const { AuditClient } = require('./client');
const { AuditCollector } = require('./collector');

function createRuntime(component, configPath = process.env.OPCBRIDGE_AUDIT_CONFIG || '/etc/opcbridge/audit/config.json') {
  let configError = ''; let signature = ''; let client = new AuditClient({}, component); let collector = new AuditCollector();
  function reload() {
    try {
      let config = {};
      try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Audit configuration must be an object');
      const nextSignature = JSON.stringify([config.node, config.forwarding, config.collector]);
      if (signature === nextSignature) { configError = ''; return true; }
      if (client.busy) return false;
      const nextCollector = new AuditCollector(component === 'scada' ? config.collector : {});
      const nextClient = new AuditClient(config, component);
      client.stop(); client = nextClient; collector = nextCollector; signature = nextSignature; configError = ''; client.start();
      return true;
    } catch (error) { configError = `Audit configuration could not be loaded: ${error.message}`; return false; }
  }
  reload();
  const timer = setInterval(reload, 1000); timer.unref();
  return {
    get client() { return client; }, get collector() { return collector; }, reload,
    record: input => { reload(); return client.record(input); },
    status: () => { reload(); return { config_error: configError, forwarding: client.status(), collector: collector.status() }; },
    stop: () => { clearInterval(timer); client.stop(); }
  };
}
module.exports = { createRuntime };
