/**
 * ClinicFlow Authentication & Tenant Provisioning Service (facade)
 * Split into cohesive modules; this file preserves the public API surface.
 *
 * - authRegistry.js      : offline-first tenant/user registry + cloud sync
 * - authUsernames.js     : username availability policy
 * - authProvisioning.js  : registration, provisioning, auth & onboarding
 */

export * from '@/features/auth/services/authRegistry';
export * from '@/features/auth/services/authUsernames';
export * from '@/features/auth/services/authProvisioning';

export { hashPassword, verifyPassword, slugifyClinic } from '@/features/auth/services/auth/authCrypto';
export { broadcastTenantUpdate } from '@/features/auth/services/auth/authBroadcast';
export { isDemoOrCorruptedTenant, isDemoOrCorruptedUser } from '@/features/auth/services/auth/authValidation';
