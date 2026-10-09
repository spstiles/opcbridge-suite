'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function syncDirectory(directory) {
  const fd = fs.openSync(directory, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function ensureDirectory(directory) {
  if (fs.existsSync(directory)) return;
  ensureDirectory(path.dirname(directory));
  try { fs.mkdirSync(directory, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  syncDirectory(path.dirname(directory));
}

// Publish a complete, synced file atomically. Exclusive writes never replace records.
function writeJson(file, value, exclusive = false) {
  ensureDirectory(path.dirname(file));
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(value)}\n`, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    if (exclusive) fs.linkSync(temporary, file);
    else fs.renameSync(temporary, file);
    if (exclusive) fs.unlinkSync(temporary);
    syncDirectory(path.dirname(file));
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function files(directory) {
  try { return fs.readdirSync(directory).filter(name => name.endsWith('.json')).sort().map(name => path.join(directory, name)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

module.exports = { syncDirectory, ensureDirectory, writeJson, readJson, canonical, digest, files };
