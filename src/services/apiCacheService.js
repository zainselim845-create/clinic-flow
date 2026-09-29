/**
 * In-Memory TTL Cache Service for ClinicFlow
 * Reduces redundant API & Supabase queries, eliminates duplicate network roundtrips,
 * and supports granular cache invalidation on data mutations.
 */

class ApiCacheService {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTtl = 30000; // 30 seconds default TTL
  }

  /**
   * Generate a standardized cache key
   * @param {string} namespace - e.g. 'patients', 'appointments', 'dashboard'
   * @param {string} clinicId - Scoped clinic/tenant identifier
   * @param {Object|string} params - Query parameters or filter payload
   */
  createKey(namespace, clinicId, params = '') {
    const serializedParams = typeof params === 'object' ? JSON.stringify(params) : String(params);
    return `${namespace}:${clinicId || 'all'}:${serializedParams}`;
  }

  /**
   * Retrieve cached value if still valid (refreshes recency for LRU)
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Refresh key order for LRU recency
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a cached value with TTL and LRU capacity bounding
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs = this.defaultTtl) {
    // Evict oldest entry if capacity reached
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // Ensure recency
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  /**
   * Wrap an async fetch function with transparent caching
   * @param {string} key
   * @param {Function} fetcherFn - async function returning data
   * @param {number} [ttlMs]
   * @returns {Promise<*>}
   */
  async wrap(key, fetcherFn, ttlMs = this.defaultTtl) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcherFn();
    if (fresh !== undefined && fresh !== null) {
      if (!fresh?.error) {
        this.set(key, fresh, ttlMs);
      }
    }
    return fresh;
  }

  /**
   * Invalidate specific key or keys starting with a prefix
   * @param {string} prefix
   */
  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all queries scoped to a specific clinic
   * @param {string} clinicId
   */
  invalidateClinic(clinicId) {
    if (!clinicId) return;
    for (const key of this.cache.keys()) {
      if (key.includes(`:${clinicId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate a specific resource across a clinic
   * @param {string} namespace
   * @param {string} clinicId
   */
  invalidateResource(namespace, clinicId) {
    const prefix = clinicId ? `${namespace}:${clinicId}` : `${namespace}:`;
    this.invalidatePrefix(prefix);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCacheService();
export default apiCache;
