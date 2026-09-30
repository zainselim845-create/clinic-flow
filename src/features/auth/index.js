/**
 * Feature Slice: Identity, Authentication & Access Control (IAM & RBAC)
 * Encapsulates authentication, session lifecycle, Google OAuth, capability authorization, and audit logs.
 */

export * from '../../services/authService';
export * from '../../services/googleAuthService';
export * from '../../services/auditLoggerService';
export * from '../../utils/permissions';
export * from '../../utils/validationSchemas';
export { Can, useCapability } from '../../components/Can';
