#!/usr/bin/env node
/** Phase 5: anchor every relative import that resolves inside src/ to the
 *  canonical '@/' alias, in production files (tests keep relative paths). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue;
      walk(path.join(dir, e.name), out);
    } else if (/\.(js|jsx)$/.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

const relImportRe = /(from\s+|import\s*\(\s*)'([^']+)'/g;
let touched = 0, specs = 0;
for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, 'utf8');
  let count = 0;
  const next = src.replace(relImportRe, (m, kind, spec) => {
    if (!spec.startsWith('.')) return m;
    const abs = path.resolve(path.dirname(file), spec);
    const rel = path.relative(SRC, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || rel === '') return m;
    count++;
    return `${kind}'@/${rel}'`;
  });
  if (count > 0) {
    fs.writeFileSync(file, next);
    touched++;
    specs += count;
  }
}
console.log(`Anchored ${specs} import specifiers across ${touched} files.`);
