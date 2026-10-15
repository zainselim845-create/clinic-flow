#!/usr/bin/env node
/** Correct import rewrite for moved services.
 *  Restores pristine pre-move content from git HEAD, then rewrites relative
 *  imports resolving them against the ORIGINAL directory (src/services) with
 *  existence checks and canonical mapping. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');
const SERVICES = path.join(SRC, 'services');
const STAY = ['distributedRateLimiter', 'twoFactorAuthService'];

function collectServices(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) collectServices(path.join(dir, e.name), out);
    else if (/^[a-zA-Z]+Service\.js$/.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

// canonical map from destination layout
const canonOf = {};
for (const file of collectServices(path.join(SRC, 'features'))) {
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  canonOf[path.basename(file, '.js')] = '@/'.concat(rel.replace(/\.js$/, ''));
}
// also the auth helper subfolder
const authDir = path.join(SRC, 'features', 'auth', 'services', 'auth');
const authHelpers = fs.existsSync(authDir) ? fs.readdirSync(authDir) : [];

function canonicalForOldSpec(spec, oldDir) {
  // returns canonical specifier or null to keep
  const abs = path.resolve(oldDir, spec);
  const relSvc = path.relative(SERVICES, abs).split(path.sep).join('/');
  const direct = relSvc.match(/^([A-Za-z]+)(\.js)?$/);
  if (direct && !relSvc.startsWith('..')) {
    const name = direct[1].replace(/\.js$/, '');
    if (canonOf[name]) return canonOf[name];
    if (STAY.includes(name)) return '@/services/' + name;
    return null; // e.g. reference to something unexpected in services/
  }
  const relAuth = path.relative(path.join(SERVICES, 'auth'), abs).split(path.sep).join('/');
  if (!relAuth.startsWith('..') && /^([a-zA-Z]+)(\.js)?$/.test(relAuth)) {
    return '@/features/auth/services/auth/' + relAuth.replace(/\.js$/, '');
  }
  // generic src-relative import (lib, utils, data, db, config, context, components...)
  const relSrc = path.relative(SRC, abs).split(path.sep).join('/');
  if (!relSrc.startsWith('..')) {
    const withJs = relSrc.endsWith('.js') || relSrc.endsWith('.jsx');
    const candidate = path.join(SRC, withJs ? relSrc : relSrc + '.js');
    const candidateX = path.join(SRC, relSrc, 'index.js');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return '@/' + relSrc;
    if (fs.existsSync(candidateX)) return '@/' + relSrc + '/index';
    return null;
  }
  return null;
}

function rewriteWithOldDir(absFile, oldDir, gitPath) {
  const pristine = execSync(`git show HEAD:${gitPath}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 });
  const relImportRe = /(from\s+|import\s*\(\s*)'([^']+)'/g;
  const next = pristine.replace(relImportRe, (m, kind, spec) => {
    if (!spec.startsWith('.')) return m;
    const canon = canonicalForOldSpec(spec, oldDir);
    return canon ? `${kind}'${canon}'` : m;
  });
  fs.writeFileSync(absFile, next);
}

let n = 0;
for (const file of collectServices(path.join(SRC, 'features'))) {
  const name = path.basename(file, '.js');
  const oldPath = 'src/services/' + name + '.js';
  rewriteWithOldDir(file, SERVICES, oldPath);
  n++;
}
for (const f of authHelpers) {
  const file = path.join(authDir, f);
  rewriteWithOldDir(file, path.join(SERVICES, 'auth'), 'src/services/auth/' + f);
  n++;
}
console.log(`Restored & rewrote imports for ${n} moved files.`);

