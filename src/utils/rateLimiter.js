import { safeStorage } from './safeStorage';

const RATE_LIMIT_PREFIX = 'clinicflow_ratelimit_';

/**
 * High-performance sliding window rate limiter
 * Protects public endpoints, booking forms, and SMS dispatch from flooding
 */
export class RateLimiter {
  constructor() {
    this.memoryBuckets = new Map();
  }

  getBucket(key) {
    const now = Date.now();
    let bucket = this.memoryBuckets.get(key);

    if (!bucket || typeof bucket !== 'object') {
      const stored = safeStorage.getItem(`${RATE_LIMIT_PREFIX}${key}`, { timestamps: [] });
      bucket = (stored && typeof stored === 'object' && Array.isArray(stored.timestamps))
        ? stored
        : { timestamps: [] };
      this.memoryBuckets.set(key, bucket);
    }

    if (!Array.isArray(bucket.timestamps)) {
      bucket.timestamps = [];
    }

    // Prune timestamps older than 1 hour to prevent memory bloat
    bucket.timestamps = bucket.timestamps.filter(ts => typeof ts === 'number' && now - ts < 3600000);
    return bucket;
  }

  saveBucket(key, bucket) {
    this.memoryBuckets.set(key, bucket);
    safeStorage.setItem(`${RATE_LIMIT_PREFIX}${key}`, bucket);
  }

  check(key, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const bucket = this.getBucket(key);
    const windowStart = now - windowMs;

    // Filter requests inside active time window
    const recentTimestamps = bucket.timestamps.filter(ts => ts > windowStart);

    if (recentTimestamps.length >= maxRequests) {
      const oldestInWindow = Math.min(...recentTimestamps);
      const resetTime = oldestInWindow + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfterSeconds
      };
    }

    // Record this request
    recentTimestamps.push(now);
    bucket.timestamps = recentTimestamps;
    this.saveBucket(key, bucket);

    return {
      allowed: true,
      remaining: maxRequests - recentTimestamps.length,
      resetTime: now + windowMs,
      retryAfterSeconds: 0
    };
  }

  reset(key) {
    this.memoryBuckets.delete(key);
    safeStorage.removeItem(`${RATE_LIMIT_PREFIX}${key}`);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Convenient helper to enforce rate limit with sensible defaults
 */
export function checkActionRateLimit(actionType, identifier, maxRequests = 5, windowMs = 60000) {
  const sanitizedIdentifier = String(identifier || 'anonymous').replace(/[^a-zA-Z0-9_+@-]/g, '_');
  const bucketKey = `${actionType}_${sanitizedIdentifier}`;
  return rateLimiter.check(bucketKey, maxRequests, windowMs);
}
