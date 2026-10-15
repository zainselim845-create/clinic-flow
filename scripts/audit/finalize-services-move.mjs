#!/usr/bin/env node
/** Finalize pass (order-independent):
 *  1. registers canonical paths of all moved services,
 *  2. rewrites moved modules' relative imports to canonical '@/' specifiers,
 *  3. ensures compatibility shims at legacy src/services paths,
 *  4. flips production import sites (non-test) to canonical paths. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');
const SERVICES = path.join(SRC, 'services');
const STAY = ['distributedRateLimiter.js', 'twoFactorAuthService.js'];

const relImportRe = /(from\s+|import\s*\(\s*)'([^']+)'/g;
function srcAbsToAlias(abs) {
  const rel = path.relative(SRC, abs);
  if (rel.startsWith('..') || rel === '') return null;
  return '@/' + rel.split(path.sep).join('/');
}

function collectServices(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) collectServices(path.join(dir, e.name), out);
    else if (/^[a-zA-Z]+Service\.js$/.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

// 1. register canonical paths for every moved service implementation
const movedFiles = collectServices(path.join(SRC, 'features'));
const canonOf = {};
for (const file of movedFiles) {
  canonOf[path.basename(file, '.js')] = srcAbsToAlias(file).replace(/\.js$/, '');
}

function rewriteFile(file, { serviceAlias = true } = {}) {
  let code = fs.readFileSync(file, 'utf8');
  const next = code.replace(relImportRe, (m, kind, spec) => {
    if (!spec.startsWith('.')) return m;
    const abs = path.resolve(path.dirname(file), spec);
    const alias = srcAbsToAlias(abs);
    if (!alias) return m;
    if (serviceAlias) {
      const svc = alias.match(/^@\/services\/([A-Za-z]+)$/);
      if (svc && canonOf[svc[1]]) return `${kind}'${canonOf[svc[1]]}'`;
    }
    return `${kind}'${alias}'`;
  });
  if (next !== code) {
    fs.writeFileSync(file, next);
    return true;
  }
  return false;
}

let rewritten = 0;
for (const file of movedFiles) if (rewriteFile(file)) rewritten++;
const authDir = path.join(SRC, 'features', 'auth', 'services', 'auth');
if (fs.existsSync(authDir)) {
  for (const f of fs.readdirSync(authDir)) if (rewriteFile(path.join(authDir, f), { serviceAlias: false })) rewritten++;
}

// 3. shims
let shims = 0;
for (const [name, canon] of Object.entries(canonOf)) {
  const shimPath = path.join(SERVICES, name + '.js');
  const hasDefault = /export default /.test(fs.readFileSync(path.join(SRC, canon.slice(2) + '.js'), 'utf8'));
  let want = `/** @deprecated Moved to ${canon} — kept as a compatibility re-export. */\nexport * from '${canon}';\n`;
  if (hasDefault) want += `export { default } from '${canon}';\n`;
  if (!fs.existsSync(shimPath) || !fs.readFileSync(shimPath, 'utf8').includes(`export * from '${canon}'`)) {
    fs.writeFileSync(shimPath, want);
    shims++;
  }
}

// 4. flip production import sites to canonical paths
const shimFiles = new Set(Object.keys(canonOf).map((n) => path.join(SERVICES, n + '.js')));
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue;
      walk(path.join(dir, e.name), out);
    } else if (/\.(js|jsx)$/.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}
let flipped = 0;
for (const file of walk(SRC)) {
  if (shimFiles.has(file)) continue;
  const rel = path.relative(SRC, file);
  if (STAY.some((s) => rel === 'services' + path.sep + s)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const next = src.replace(relImportRe, (m, kind, spec) => {
    let svc = null;
    const am = spec.match(/^@\/services\/([A-Za-z]+)$/);
    if (am) svc = am[1];
    else if (spec.startsWith('.')) {
      const abs = path.resolve(path.dirname(file), spec);
      const rm = path.relative(SERVICES, abs).match(/^([A-Za-z]+)(\.js)?$/);
      if (rm) svc = rm[1];
    }
    if (svc && canonOf[svc]) return `${kind}'${canonOf[svc]}'`;
    return m;
  });
  if (next !== src) {
    fs.writeFileSync(file, next);
    flipped++;
  }
}

console.log(`rewrote imports in ${rewritten} moved files, wrote ${shims} shims, flipped ${flipped} production files.`);
