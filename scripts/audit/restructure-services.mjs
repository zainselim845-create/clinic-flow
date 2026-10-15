#!/usr/bin/env node
/**
 * One-shot restructuring migration (Phase 2):
 * Moves service implementations from the flat src/services/ into their
 * feature slices (src/features/<slice>/services/), leaves compatibility
 * shims at the old paths, rewrites the moved modules' internal imports to
 * canonical '@/' specifiers, and flips production import sites to the
 * canonical implementation paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');
const SERVICES = path.join(SRC, 'services');

// Canonical slice mapping — derived from the existing feature barrel files
const MAP = {
  // appointments
  appointmentsService: 'appointments',
  blockedSlotsService: 'appointments',
  visitTypesService: 'appointments',
  // auth
  auditLoggerService: 'auth',
  authService: 'auth',
  googleAuthService: 'auth',
  organizationService: 'auth',
  // billing
  expensesService: 'billing',
  generalLedgerService: 'billing',
  invoicesService: 'billing',
  packagesService: 'billing',
  stripeBillingService: 'billing',
  walletService: 'billing',
  // clinical
  aiAssistantService: 'clinical',
  clinicalNotesService: 'clinical',
  doctorsService: 'clinical',
  labsService: 'clinical',
  prescriptionService: 'clinical',
  // inventory
  inventoryService: 'inventory',
  // marketing
  crossSellingService: 'marketing',
  leadRecoveryService: 'marketing',
  occasionCampaignService: 'marketing',
  reactivationService: 'marketing',
  referralService: 'marketing',
  segmentationService: 'marketing',
  smsService: 'marketing',
  // patients
  excelImportService: 'patients',
  noShowRecoveryService: 'patients',
  patientsService: 'patients',
  recallsService: 'patients',
  treatmentPlansService: 'patients',
  // platform (shared infrastructure)
  apiCacheService: 'platform',
  asyncQueueService: 'platform',
  attendanceService: 'platform',
  autoLocationService: 'platform',
  clinicsService: 'platform',
  cursorPaginationService: 'platform',
  customDomainService: 'platform',
  feedbackService: 'platform',
  idempotencyService: 'platform',
  indexedSearchService: 'platform',
  multiTierCacheService: 'platform',
  notificationsService: 'platform',
  realtimeSyncService: 'platform',
  saasSubscriptionPlansService: 'platform',
  staffService: 'platform',
  systemErrorService: 'platform',
  usageMeteringService: 'platform',
  webhookService: 'platform',
};

// Services pinned at src/services by tests (fs.readFileSync) — never moved
const STAY = ['distributedRateLimiter.js', 'twoFactorAuthService.js'];

const relImportRe = /(from\s+|import\s*\(\s*)'([^']+)'/g;

/** Resolve an old-style relative specifier (as seen from src/services/<file>)
 *  to a src-rooted absolute path. */
function oldSpecToSrcAbs(spec, oldDir) {
  if (spec.startsWith('@/')) return path.join(SRC, spec.slice(2));
  if (spec.startsWith('.')) return path.resolve(oldDir, spec);
  return null; // bare package import
}

/** Canonical '@/' specifier for a src-rooted abs path, or null if outside src. */
function srcAbsToAlias(abs) {
  const rel = path.relative(SRC, abs);
  if (rel.startsWith('..') || rel === '') return null;
  return '@/'.replaceAll('\\', '/') + rel.split(path.sep).join('/');
}

const canonOf = {};

function moveServices() {
  const files = fs.readdirSync(SERVICES).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    if (STAY.includes(file)) continue;
    const name = file.replace(/\.js$/, '');
    const slice = MAP[name];
    if (!slice) throw new Error(`No slice mapping for ${file}`);
    const destDir = path.join(SRC, 'features', slice, 'services');
    fs.mkdirSync(destDir, { recursive: true });
    const from = path.join(SERVICES, file);
    const to = path.join(destDir, file);
    execSync(`git mv "${path.relative(ROOT, from)}" "${path.relative(ROOT, to)}"`, { cwd: ROOT });
    canonOf[name] = `@/features/${slice}/services/${name}`;
  }
  // auth helper subfolder moves alongside authService
  const authDir = path.join(SERVICES, 'auth');
  if (fs.existsSync(authDir)) {
    const destDir = path.join(SRC, 'features', 'auth', 'services', 'auth');
    fs.mkdirSync(destDir, { recursive: true });
    for (const f of fs.readdirSync(authDir)) {
      execSync(
        `git mv "${path.relative(ROOT, path.join(authDir, f))}" "${path.relative(ROOT, path.join(destDir, f))}"`,
        { cwd: ROOT }
      );
    }
  }
}

/** Rewrite every relative specifier inside a moved file to a canonical '@/' one. */
function rewriteMovedFile(absFile) {
  const newDir = path.dirname(absFile);
  let code = fs.readFileSync(absFile, 'utf8');
  code = code.replace(relImportRe, (m, kind, spec) => {
    if (!spec.startsWith('.')) return m; // bare or already aliased
    const abs = path.resolve(newDir, spec);
    const alias = srcAbsToAlias(abs);
    if (!alias) return m;
    // service-to-service imports point at the canonical (moved) location
    const svc = alias.match(/^@\/services\/([A-Za-z]+)$/);
    if (svc && canonOf[svc[1]]) return `${kind}'${canonOf[svc[1]]}'`;
    return `${kind}'${alias}'`;
  });
  fs.writeFileSync(absFile, code);
}

function rewriteAllMoved() {
  for (const [name, canon] of Object.entries(canonOf)) {
    rewriteMovedFile(path.join(SRC, canon.slice(2) + '.js'));
  }
  const authDir = path.join(SRC, 'features', 'auth', 'services', 'auth');
  for (const f of fs.readdirSync(authDir)) rewriteMovedFile(path.join(authDir, f));
}

/** Create thin compatibility shims at the old locations. */
function writeShims() {
  for (const [name, canon] of Object.entries(canonOf)) {
    const file = canon.split('/').pop() + '.js';
    const oldPath = path.join(SERVICES, file);
    const realPath = canon.slice(1); // '@/x' -> '/x' (relative from src)
    let shim = `/** @deprecated Moved to ${canon} — kept as a compatibility re-export. */\nexport * from '${canon}';\n`;
    const content = fs.readFileSync(path.join(SRC, realPath + '.js'), 'utf8');
    if (/^export default /m.test(content) || /export default /m.test(content)) {
      shim += `export { default } from '${canon}';\n`;
    }
    fs.writeFileSync(oldPath, shim);
  }
}

function walk(dir, skipDirs = new Set(), out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      walk(path.join(dir, e.name), skipDirs, out);
    } else if (/\.(js|jsx)$/.test(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** Flip production import sites (outside tests) to the canonical paths. */
const skipDirs = new Set(['__tests__']);
function flipProductionImports() {
  const files = walk(SRC, skipDirs);
  const shimFiles = new Set(Object.keys(canonOf).map((n) => path.join(SERVICES, n + '.js')));
  for (const file of files) {
    if (shimFiles.has(file)) continue;
    const relFromSrc = path.relative(SRC, file);
    // leave the two pinned services untouched
    if (relFromSrc === 'services' + path.sep + 'distributedRateLimiter.js') continue;
    if (relFromSrc === 'services' + path.sep + 'twoFactorAuthService.js') continue;
    const src = fs.readFileSync(file, 'utf8');
    let out = src.replace(relImportRe, (m, kind, spec) => {
      let svc = null;
      let am = spec.match(/^@\/services\/([A-Za-z]+)$/);
      if (am) svc = am[1];
      else if (spec.startsWith('.')) {
        const abs = path.resolve(path.dirname(file), spec);
        const rr = path.relative(SERVICES, abs);
        const rm = rr.match(/^([A-Za-z]+)\.js$/);
        if (rm) svc = rm[1];
      }
      if (svc && canonOf[svc]) return `${kind}'${canonOf[svc]}'`;
      return m;
    });
    if (out !== src) fs.writeFileSync(file, out);
  }
}

moveServices();
rewriteAllMoved();
writeShims();
flipProductionImports();
console.log(`Moved ${Object.keys(canonOf).length} services into feature slices.`);
console.log('Map:', JSON.stringify(canonOf, null, 0).slice(0, 400), '...');
