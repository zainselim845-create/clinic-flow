#!/usr/bin/env node
/** Phase 3: split the 1509-line authService god-file into cohesive modules:
 *  - authRegistry.js      (offline-first tenant/user registry + cloud sync)
 *  - authUsernames.js     (reserved usernames policy)
 *  - authProvisioning.js  (register/provision/authenticate/onboarding workflows)
 *  - authService.js       (facade preserving the public API)
 * Public export surface is unchanged. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'src/features/auth/services');
const FILE = path.join(DIR, 'authService.js');

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
// 1-based inclusive ranges
const range = (a, b) => lines.slice(a - 1, b).join('\n');

const registry = range(21, 878);
const usernames = range(879, 990);
const provisioning = range(991, 1509);

const registryFile = `/**
 * ClinicFlow Offline-First Auth Registry
 * Single source of truth for registered tenants/users with memory caches,
 * O(1) lookup indexes, and best-effort cloud synchronization.
 * (Extracted from authService.js — public API re-exported by the facade.)
 */

import { isSupabaseConfigured, CLOUD_TENANTS_REGISTRY_URL } from '@/lib/supabase';
import { createClinicInDb, deleteClinicFromDb } from '@/features/platform/services/clinicsService';
import { safeStorage } from '@/utils/safeStorage';
import { broadcastTenantUpdate } from './auth/authBroadcast';
import { isDemoOrCorruptedTenant, isDemoOrCorruptedUser } from './auth/authValidation';

${registry}
`;

const usernamesFile = `/**
 * Username availability policy (reserved platform handles).
 * (Extracted from authService.js — public API re-exported by the facade.)
 */

import { getRegisteredTenants, getRegisteredUsers } from './authRegistry';
import { isDemoOrCorruptedTenant } from './auth/authValidation';

${usernames}
`;

const provisioningFile = `/**
 * ClinicFlow Provisioning & Authentication Workflows
 * Doctor/clinic registration, staff account provisioning, O(1)
 * authentication, and first-run clinic onboarding.
 * (Extracted from authService.js — public API re-exported by the facade.)
 */

import { CLINIC_SPECIALTIES } from '@/data/specialtiesData';
import { formatSenderId } from '@/features/marketing/services/smsService';
import { verifyPassword, slugifyClinic } from './auth/authCrypto';
import {
  getRegisteredTenants,
  getRegisteredUsers,
  saveRegisteredTenant,
  saveRegisteredUser,
  registeredSlugsSet,
  registeredEmailsSet,
  registeredPhonesSet
} from './authRegistry';
import { isUsernameAvailable } from './authUsernames';

${provisioning}
`;

const facade = `/**
 * ClinicFlow Authentication & Tenant Provisioning Service (facade)
 * Split into cohesive modules; this file preserves the public API surface.
 *
 * - authRegistry.js      : offline-first tenant/user registry + cloud sync
 * - authUsernames.js     : username availability policy
 * - authProvisioning.js  : registration, provisioning, auth & onboarding
 */

export * from './authRegistry';
export * from './authUsernames';
export * from './authProvisioning';

export { hashPassword, verifyPassword, slugifyClinic } from './auth/authCrypto';
export { broadcastTenantUpdate } from './auth/authBroadcast';
export { isDemoOrCorruptedTenant, isDemoOrCorruptedUser } from './auth/authValidation';
`;

fs.writeFileSync(path.join(DIR, 'authRegistry.js'), registryFile);
fs.writeFileSync(path.join(DIR, 'authUsernames.js'), usernamesFile);
fs.writeFileSync(path.join(DIR, 'authProvisioning.js'), provisioningFile);
fs.writeFileSync(FILE, facade);

// the registry must expose its lookup sets for provisioning
let reg = fs.readFileSync(path.join(DIR, 'authRegistry.js'), 'utf8');
reg = reg.replace(
  'const registeredSlugsSet = new Set();',
  'export const registeredSlugsSet = new Set();'
);
reg = reg.replace(
  'const registeredEmailsSet = new Set();',
  'export const registeredEmailsSet = new Set();'
);
reg = reg.replace(
  'const registeredPhonesSet = new Set();',
  'export const registeredPhonesSet = new Set();'
);
fs.writeFileSync(path.join(DIR, 'authRegistry.js'), reg);

console.log('authService split into 3 modules + facade.');
