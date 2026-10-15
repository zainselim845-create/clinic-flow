/**
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
