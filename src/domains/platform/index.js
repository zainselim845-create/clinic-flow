/**
 * Domain: Platform & Multi-Tenant Infrastructure
 * Bounded Context: Tenant Catalog, SuperAdmin Control Plane, Custom Domains, DNS, Circuit Breaker & Realtime Sync
 */

export * from '@/features/platform/services/clinicsService';
export * from '@/features/platform/services/customDomainService';
export * from '@/features/platform/services/systemErrorService';
export * from '@/features/platform/services/realtimeSyncService';
export * from '@/features/platform/services/webhookService';
export * from '../../utils/circuitBreaker';
export * from '@/features/platform/services/multiTierCacheService';
export * from '@/features/platform/services/cursorPaginationService';
export { default as FeatureErrorBoundary } from '../../components/FeatureErrorBoundary';
