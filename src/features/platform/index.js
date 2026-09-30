/**
 * Feature Slice: Platform & Multi-Tenant Infrastructure (إدارة المنصة والمستأجرين)
 * Encapsulates tenant catalog, superadmin operations, custom domains, realtime sync, caching, and circuit breaker.
 */

export * from '../../services/clinicsService';
export * from '../../services/customDomainService';
export * from '../../services/saasSubscriptionPlansService';
export * from '../../services/systemErrorService';
export * from '../../services/realtimeSyncService';
export * from '../../services/webhookService';
export * from '../../services/usageMeteringService';
export * from '../../services/multiTierCacheService';
export * from '../../services/cursorPaginationService';
export * from '../../utils/circuitBreaker';
export * from '../../utils/clinicUrls';
export { default as FeatureErrorBoundary } from '../../components/FeatureErrorBoundary';
