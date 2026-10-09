const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('project configuration backups omit audit credentials unless secrets are requested', () => {
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const start = source.indexOf('function buildProjectBackup(');
  const end = source.indexOf("  progress('Collecting HMI screens and graphics...'", start);
  const context = vm.createContext({
    path, DEFAULT_OPCBRIDGE_CONFIG_DIR: '/test/config', AUDIT_CONFIG_PATH: '/test/config/custom/private.json',
    CONFIG_PATH: '/test/scada/config.json', SECRETS_PATH: '/test/scada/config.secrets.json',
    PROJECT_BACKUP_MAX_TOTAL_BYTES: 10000,
    projectBackupWalkFiles: () => ['tags.json', 'audit/config.json', 'custom/private.json', 'passwords.jsonc'],
    projectBackupAddFile: (files, section, root, rel) => { files.push({ section, path: rel, size: 1 }); return { ok: true }; }
  });
  vm.runInContext(source.slice(start, end) + '  return files;\n}', context);
  const standard = Array.from(context.buildProjectBackup().map(file => file.path));
  assert.ok(standard.includes('tags.json'));
  assert.ok(!standard.includes('audit/config.json') && !standard.includes('custom/private.json') && !standard.includes('passwords.jsonc'));
  const withSecrets = Array.from(context.buildProjectBackup({ includeSecrets: true }).map(file => file.path));
  assert.ok(withSecrets.includes('audit/config.json') && withSecrets.includes('custom/private.json'));
});
