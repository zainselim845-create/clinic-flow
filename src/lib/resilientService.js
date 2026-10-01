/**
 * ClinicFlow Resilient Service Layer Wrapper (resilientService.js)
 * Guarantees zero uncaught exceptions and graceful offline degradation.
 */

import { cloudCircuitBreaker } from './circuitBreaker';
import { syncOutbox } from './syncOutbox';

/**
 * Executes a service operation with circuit breaker and local store fallback
 * @param {Object} options
 * @param {string} options.operationName - Descriptive name for logging/telemetry
 * @param {Function} options.remoteFn - Primary async function to call (Supabase/API)
 * @param {Function} options.localFn - Fallback function if remote fails or circuit is OPEN
 * @param {any} options.defaultValue - Safe default return if both fail
 * @param {Object} [options.mutationSync] - Optional outbox enqueue payload
 * @returns {Promise<{success: boolean, data: any, error: Error|null, isLocal: boolean}>}
 */
export async function executeResilientOperation({
  operationName = 'operation',
  remoteFn,
  localFn,
  defaultValue = null,
  mutationSync = null
}) {
  // Check if Circuit Breaker allows remote execution
  const canAttemptRemote = cloudCircuitBreaker.isAvailable() && typeof remoteFn === 'function';

  if (canAttemptRemote) {
    try {
      const result = await remoteFn();
      if (result && result.error) {
        // Record failure in circuit breaker
        cloudCircuitBreaker.recordFailure(result.error);
        throw result.error;
      }
      cloudCircuitBreaker.recordSuccess();
      return {
        success: true,
        data: result?.data !== undefined ? result.data : result,
        error: null,
        isLocal: false
      };
    } catch (remoteErr) {
      cloudCircuitBreaker.recordFailure(remoteErr);
      console.warn(`[ResilientService:${operationName}] Remote failed, executing local fallback:`, remoteErr?.message || remoteErr);
    }
  }

  // Fallback to local store execution
  try {
    const localData = typeof localFn === 'function' ? await localFn() : defaultValue;

    // If this was a write operation, enqueue into outbox for eventual cloud sync
    if (mutationSync) {
      syncOutbox.enqueue(mutationSync).catch(console.warn);
    }

    return {
      success: true,
      data: localData !== undefined ? localData : defaultValue,
      error: null,
      isLocal: true
    };
  } catch (localErr) {
    console.error(`[ResilientService:${operationName}] Local fallback also failed:`, localErr);
    return {
      success: false,
      data: defaultValue,
      error: localErr instanceof Error ? localErr : new Error(String(localErr)),
      isLocal: true
    };
  }
}
