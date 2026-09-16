/**
 * Shopify/Stripe-Grade Idempotency Service for ClinicFlow
 * Ensures concurrent network retries and double-clicks never produce duplicate
 * appointments, invoices, or financial transactions.
 */

// In-memory idempotency cache scoped by tenant
const idempotencyStore = new Map();

// In-flight locks to prevent race conditions during concurrent bursts
const inFlightPromises = new Map();

/**
 * Generates a unique idempotency key with optional prefix
 */
export function generateIdempotencyKey(prefix = 'idemp') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Builds a tenant-scoped cache key
 */
function buildScopedKey(clinicId, key) {
  return `${clinicId || 'global'}::${key}`;
}

/**
 * Clears expired idempotency keys (TTL cleanup)
 */
export function pruneExpiredIdempotencyKeys(maxAgeMs = 120_000) {
  const now = Date.now();
  for (const [scopedKey, entry] of idempotencyStore.entries()) {
    if (now - entry.timestamp > maxAgeMs) {
      idempotencyStore.delete(scopedKey);
    }
  }
}

/**
 * Executes a critical operation with idempotency guarantees.
 * If called multiple times with the same key, subsequent calls return
 * the cached result without re-executing actionFn.
 *
 * @param {string} key - Idempotency key (e.g. from X-Idempotency-Key header or generated)
 * @param {Function} actionFn - Async function performing the creation or mutation
 * @param {Object} options - { clinicId, ttlMs }
 * @returns {Promise<{ result: any, isReplay: boolean }>}
 */
export async function executeWithIdempotency(key, actionFn, { clinicId = null, ttlMs = 120_000 } = {}) {
  if (!key || typeof key !== 'string') {
    // If no key provided, execute directly without idempotency caching
    const result = await actionFn();
    return { result, isReplay: false };
  }

  const scopedKey = buildScopedKey(clinicId, key);

  // 1. Check if cached completed response exists
  const existing = idempotencyStore.get(scopedKey);
  if (existing) {
    const isStillValid = Date.now() - existing.timestamp < (existing.ttlMs || ttlMs);
    if (isStillValid) {
      return {
        result: existing.result,
        isReplay: true,
        originalTimestamp: existing.timestamp
      };
    }
    idempotencyStore.delete(scopedKey);
  }

  // 2. Check if identical request is currently in-flight (race condition barrier)
  if (inFlightPromises.has(scopedKey)) {
    const result = await inFlightPromises.get(scopedKey);
    return {
      result,
      isReplay: true
    };
  }

  // 3. Execute with lock
  const executionPromise = (async () => {
    try {
      const res = await actionFn();
      idempotencyStore.set(scopedKey, {
        result: res,
        timestamp: Date.now(),
        ttlMs,
        clinicId
      });
      return res;
    } finally {
      inFlightPromises.delete(scopedKey);
    }
  })();

  inFlightPromises.set(scopedKey, executionPromise);

  const result = await executionPromise;
  return {
    result,
    isReplay: false
  };
}

/**
 * Resets the idempotency store (useful for testing and tenant cache resets)
 */
export function clearIdempotencyStore(clinicId = null) {
  if (!clinicId) {
    idempotencyStore.clear();
    inFlightPromises.clear();
  } else {
    for (const key of idempotencyStore.keys()) {
      if (key.startsWith(`${clinicId}::`)) {
        idempotencyStore.delete(key);
      }
    }
    for (const key of inFlightPromises.keys()) {
      if (key.startsWith(`${clinicId}::`)) {
        inFlightPromises.delete(key);
      }
    }
  }
}

/**
 * Returns diagnostic stats for monitoring
 */
export function getIdempotencyStats() {
  return {
    totalCached: idempotencyStore.size,
    totalInFlight: inFlightPromises.size
  };
}
