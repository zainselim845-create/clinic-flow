/**
 * Enterprise Multi-Tier Caching Service for 100M-Scale Concurrency
 * - L1: High-Speed In-Memory LRU Cache with Stale-While-Revalidate
 * - L2: Persistent Jittered TTL Cache (Prevents Thundering Herd / Cache Stampedes)
 * - Circuit Breaker Fallback Integration
 */

import { safeStorage } from '../utils/safeStorage';
import { CircuitBreaker } from '../utils/circuitBreaker';

export class MultiTierCacheService {
  constructor(options = {}) {
    this.maxL1Size = options.maxL1Size || 1000;
    this.defaultTtlMs = options.defaultTtlMs || 60000; // 1 minute default
    this.staleTtlMs = options.staleTtlMs || 300000; // 5 minutes stale grace
    this.l1 = new Map(); // LRU memory map
    this.circuitBreaker = new CircuitBreaker();
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      revalidations: 0
    };
  }

  /**
   * Generates a composite cache key
   * @param {string} namespace 
   * @param {string} clinicId 
   * @param {any} [params] 
   * @returns {string}
   */
  buildKey(namespace, clinicId = 'global', params = '') {
    const serialized = typeof params === 'object' ? JSON.stringify(params) : String(params);
    return `${namespace}:${clinicId}:${serialized}`;
  }

  /**
   * Calculates a jittered TTL to avoid synchronized cache stampedes
   * @param {number} baseTtlMs 
   * @returns {number}
   */
  getJitteredTtl(baseTtlMs) {
    // Add +/- 15% random jitter
    const jitter = (Math.random() * 0.3 - 0.15) * baseTtlMs;
    return Math.floor(baseTtlMs + jitter);
  }

  /**
   * Evicts the oldest item if L1 capacity is exceeded (LRU behavior)
   */
  evictL1IfNeeded() {
    if (this.l1.size >= this.maxL1Size) {
      const oldestKey = this.l1.keys().next().value;
      if (oldestKey) this.l1.delete(oldestKey);
    }
  }

  /**
   * Retrieves an item from L1 or L2
   * @param {string} key 
   * @returns {{ value: any, isStale: boolean }|null}
   */
  get(key) {
    const now = Date.now();

    // 1. Check L1 Memory Cache
    if (this.l1.has(key)) {
      const entry = this.l1.get(key);
      // Refresh LRU order
      this.l1.delete(key);
      this.l1.set(key, entry);

      if (now < entry.expiresAt) {
        this.stats.l1Hits += 1;
        return { value: entry.value, isStale: false };
      } else if (now < entry.staleUntil) {
        this.stats.revalidations += 1;
        return { value: entry.value, isStale: true };
      } else {
        this.l1.delete(key);
      }
    }

    // 2. Check L2 Storage Cache
    const l2Raw = safeStorage.getItem(`cf_l2_${key}`, null);
    if (l2Raw) {
      try {
        const l2Entry = JSON.parse(l2Raw);
        if (now < l2Entry.expiresAt) {
          this.stats.l2Hits += 1;
          // Promote to L1
          this.evictL1IfNeeded();
          this.l1.set(key, l2Entry);
          return { value: l2Entry.value, isStale: false };
        } else if (now < l2Entry.staleUntil) {
          this.stats.revalidations += 1;
          return { value: l2Entry.value, isStale: true };
        } else {
          safeStorage.removeItem(`cf_l2_${key}`);
        }
      } catch (_) {}
    }

    this.stats.misses += 1;
    return null;
  }

  /**
   * Sets a value in both L1 and L2 with jittered TTL
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttlMs] 
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    const now = Date.now();
    const jittered = this.getJitteredTtl(ttlMs);
    const entry = {
      value,
      expiresAt: now + jittered,
      staleUntil: now + jittered + this.staleTtlMs,
      cachedAt: now
    };

    // Set L1
    this.evictL1IfNeeded();
    this.l1.set(key, entry);

    // Set L2
    try {
      safeStorage.setItem(`cf_l2_${key}`, JSON.stringify(entry));
    } catch (_) {}
  }

  /**
   * Invalidates a key or entire namespace
   * @param {string} keyOrPattern 
   */
  invalidate(keyOrPattern) {
    for (const k of this.l1.keys()) {
      if (k === keyOrPattern || k.startsWith(keyOrPattern)) {
        this.l1.delete(k);
        safeStorage.removeItem(`cf_l2_${k}`);
      }
    }
  }

  /**
   * Transparent fetch-with-cache featuring Stale-While-Revalidate and Circuit Breaker
   * @param {string} key 
   * @param {Function} fetcherFn 
   * @param {Object} [options] 
   * @returns {Promise<any>}
   */
  async fetchWithCache(key, fetcherFn, options = {}) {
    const ttlMs = options.ttlMs || this.defaultTtlMs;
    const serviceName = options.serviceName || 'default-service';
    const cached = this.get(key);

    if (cached && !cached.isStale) {
      return cached.value;
    }

    // If stale, return stale value immediately and revalidate in background
    if (cached && cached.isStale) {
      if (!this.circuitBreaker.isOpen(serviceName)) {
        // Background revalidation
        Promise.resolve().then(async () => {
          try {
            const fresh = await fetcherFn();
            this.set(key, fresh, ttlMs);
            this.circuitBreaker.recordSuccess(serviceName);
          } catch (err) {
            this.circuitBreaker.recordFailure(serviceName, err);
          }
        });
      }
      return cached.value;
    }

    // Cache miss: execute with circuit breaker
    if (this.circuitBreaker.isOpen(serviceName)) {
      if (options.fallbackValue !== undefined) {
        return options.fallbackValue;
      }
      throw new Error(`Circuit breaker is OPEN for service '${serviceName}'. Request rejected to preserve platform resilience.`);
    }

    try {
      const fresh = await fetcherFn();
      this.set(key, fresh, ttlMs);
      this.circuitBreaker.recordSuccess(serviceName);
      return fresh;
    } catch (err) {
      this.circuitBreaker.recordFailure(serviceName, err);
      if (options.fallbackValue !== undefined) {
        return options.fallbackValue;
      }
      throw err;
    }
  }

  /**
   * Cache diagnostics and hit ratio
   */
  getDiagnostics() {
    const totalRequests = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.l1Hits + this.stats.l2Hits) / totalRequests * 100).toFixed(1) + '%' : '0%';
    return {
      ...this.stats,
      totalRequests,
      hitRate,
      l1Size: this.l1.size
    };
  }
}

export const multiTierCache = new MultiTierCacheService();
