/**
 * Shopify/Stripe-Grade Idempotency Architecture for ClinicFlow
 * 
 * Multi-Tier Idempotency Model:
 * 1. Tier 1 (Server/DB - Authoritative): Backed by `public.idempotency_keys` table and
 *    partial unique constraint in PostgreSQL. Binds keys to verified `clinic_id` and `user_id`.
 * 2. Tier 2 (Client Durable Persistence): Stored in durable browser storage (`safeStorage`)
 *    scoped by tenant and user, surviving page reloads and browser tab closures.
 * 3. Tier 3 (Client Ephemeral In-Flight Lock): In-memory Map and Promise barrier preventing
 *    rapid double-clicks and concurrent bursts within the current JS event loop.
 */

import { safeGetJSON, safeSetJSON, safeRemoveItem } from '@/utils/safeStorage';

// In-memory idempotency cache scoped by tenant (L1 fast path)
const idempotencyStore = new Map();

// In-flight locks to prevent race conditions during concurrent bursts
const inFlightPromises = new Map();

const IDEMP_STORAGE_PREFIX = 'clinicflow_idemp_';

/**
 * Generates a unique idempotency key with optional prefix
 */
export function generateIdempotencyKey(prefix = 'idemp') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Builds a tenant-scoped cache key with user and operation scoping
 */
export function buildScopedKey(clinicId, key, userId = null, operationType = 'appointment_booking') {
  const tenant = clinicId || 'global';
  const user = userId || 'anonymous';
  const op = operationType || 'default';
  return `${tenant}::${user}::${op}::${key}`;
}

/**
 * Clears expired idempotency keys (TTL cleanup)
 */
export function pruneExpiredIdempotencyKeys(maxAgeMs = 120_000) {
  const now = Date.now();
  for (const [scopedKey, entry] of idempotencyStore.entries()) {
    if (now - entry.timestamp > maxAgeMs) {
      idempotencyStore.delete(scopedKey);
      safeRemoveItem(IDEMP_STORAGE_PREFIX + scopedKey);
    }
  }
}

/**
 * Executes an operation with idempotency guarantees.
 * If called multiple times with the same key, subsequent calls return
 * the cached result without re-executing actionFn.
 * 
 * Transient network failures (timeouts, 502/503/504, fetch errors) are NEVER
 * cached, allowing clean retries.
 * 
 * @param {string} key - Idempotency key
 * @param {Function} actionFn - Async function performing the creation or mutation
 * @param {Object} options - { clinicId, userId, operationType, ttlMs }
 * @returns {Promise<{ result: any, isReplay: boolean }>}
 */
export async function executeWithIdempotency(key, actionFn, { clinicId = null, userId = null, operationType = 'appointment_booking', ttlMs = 120_000 } = {}) {
  if (!key || typeof key !== 'string') {
    // If no key provided, execute directly without idempotency caching
    const result = await actionFn();
    return { result, isReplay: false };
  }

  const scopedKey = buildScopedKey(clinicId, key, userId, operationType);
  const storageKey = IDEMP_STORAGE_PREFIX + scopedKey;

  // 1. Check L1 in-memory cache
  let existing = idempotencyStore.get(scopedKey);

  // 2. Fall back to L2 durable client storage (survives page reloads)
  if (!existing) {
    const persisted = safeGetJSON(storageKey, null);
    if (persisted && typeof persisted === 'object' && persisted.result) {
      existing = persisted;
      idempotencyStore.set(scopedKey, persisted);
    }
  }

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
    safeRemoveItem(storageKey);
  }

  // 3. Check if identical request is currently in-flight (race condition barrier)
  if (inFlightPromises.has(scopedKey)) {
    const result = await inFlightPromises.get(scopedKey);
    return {
      result,
      isReplay: true
    };
  }

  // 4. Execute with lock
  const executionPromise = (async () => {
    try {
      const res = await actionFn();
      // Only cache successful responses or deterministic domain results.
      // Transient connection failures (offline, 502, 503, 504, timeout) are never cached.
      const isTransientError = Boolean(
        res?.error && (
          res.error.isNetworkError ||
          res.error.status === 502 ||
          res.error.status === 503 ||
          res.error.status === 504 ||
          (typeof res.error.message === 'string' && (
            res.error.message.toLowerCase().includes('network') ||
            res.error.message.toLowerCase().includes('fetch') ||
            res.error.message.toLowerCase().includes('timeout') ||
            res.error.message.toLowerCase().includes('connection')
          ))
        )
      );

      if (!isTransientError) {
        const entry = {
          result: res,
          timestamp: Date.now(),
          ttlMs,
          clinicId,
          userId
        };
        idempotencyStore.set(scopedKey, entry);
        safeSetJSON(storageKey, entry);
      }
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
    for (const key of idempotencyStore.keys()) {
      safeRemoveItem(IDEMP_STORAGE_PREFIX + key);
    }
    idempotencyStore.clear();
    inFlightPromises.clear();
  } else {
    for (const key of idempotencyStore.keys()) {
      if (key.startsWith(`${clinicId}::`)) {
        safeRemoveItem(IDEMP_STORAGE_PREFIX + key);
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
