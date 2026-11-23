'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const contents = ['workspace', 'alarms', 'settings', 'credentials', 'history', 'historian'];
const presets = {
  full: contents,
  workspace: ['workspace'],
  alarms: ['alarms']
};

function selection(input = {}) {
  const preset = String(input.preset || '');
  if (!Object.hasOwn(presets, preset) && preset !== 'custom') throw new Error('Choose a backup preset.');
  const selected = Array.isArray(input.contents) ? input.contents : presets[preset];
  if (!selected?.length || selected.some(key => !contents.includes(key))) throw new Error('Choose valid backup contents.');
  const unique = contents.filter(key => selected.includes(key));
  const defaults = presets[preset];
  return { preset: defaults?.length === unique.length && defaults.every(key => unique.includes(key)) ? preset : 'custom', contents: unique };
}

function schedule(input = {}) {
  if (typeof input.enabled !== 'boolean' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
      !Number.isInteger(input.keep) || input.keep < 1 || input.keep > 365) {
    throw new Error('Set a daily time and keep between 1 and 365 automatic backups.');
  }
  return { enabled: input.enabled, time: input.time, keep: input.keep, ...selection(input) };
}

function atomicJson(file, value) {
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

function createLibrary(root) {
  const settingsFile = path.join(root, 'schedule.json');
  const statusFile = path.join(root, 'automatic-status.json');
  const idPattern = /^[0-9a-f-]{36}$/;
  function read(file, fallback = null) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (err) { if (err.code === 'ENOENT') return fallback; throw err; }
  }
  function write(file, value) {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    atomicJson(file, value);
  }
  function paths(id) {
    if (!idPattern.test(String(id))) throw new Error('Invalid backup ID.');
    return { meta: path.join(root, id + '.meta.json'), archive: path.join(root, id + '.json') };
  }
  function get(id) {
    const files = paths(id);
    const meta = read(files.meta);
    if (!meta || !fs.existsSync(files.archive)) throw new Error('Backup not found.');
    return { meta, archive: files.archive };
  }
  function list() {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root).filter(name => name.endsWith('.meta.json'))
      .map(name => name.slice(0, -10)).filter(id => idPattern.test(id))
      .flatMap(id => {
        const files = paths(id);
        return fs.existsSync(files.archive) ? [read(files.meta)] : [];
      }).filter(Boolean).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  function save(backup, options, kind, id = crypto.randomUUID()) {
    const files = paths(id);
    const archive = JSON.stringify(backup);
    const meta = {
      id, kind, ...options, created_at: backup.created_at, host: backup.host,
      suite_version: backup.suite_version, bytes: Buffer.byteLength(archive), counts: backup.counts,
      has_historian: (backup.files || []).some(file => file.section === 'historian_data')
    };
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    try {
      fs.writeFileSync(files.archive, archive, { mode: 0o600, flag: 'wx' });
      write(files.meta, meta);
    } catch (err) {
      if (err.code !== 'EEXIST') fs.rmSync(files.archive, { force: true });
      throw err;
    }
    return meta;
  }
  function remove(id) {
    get(id);
    const files = paths(id);
    fs.unlinkSync(files.archive);
    fs.unlinkSync(files.meta);
  }
  return {
    get, list, save, remove,
    prune(keep) {
      for (const item of list().filter(item => item.kind === 'automatic').slice(keep)) remove(item.id);
    },
    settings: () => read(settingsFile, { enabled: false, time: '02:00', keep: 7, preset: 'full', contents }),
    saveSettings: input => write(settingsFile, schedule(input)),
    automaticStatus: () => read(statusFile),
    saveAutomaticStatus: state => write(statusFile, state)
  };
}

module.exports = { contents, selection, schedule, createLibrary };
