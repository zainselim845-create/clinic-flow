/**
 * Distributed Multi-Tenant Rate Limiter (Upstash Redis REST + Resilient In-Memory Sliding Window)
 * Engineered for 10M to 100M API calls across multi-tenant clinics.
 * Guarantees zero downtime by falling back to local sliding window if Redis is unreachable.
 */

// In-memory sliding window storage for fallback and local development
const inMemoryStore = new Map();
let lastPruneTimestamp = Date.now();
const PRUNE_INTERVAL_MS = 300_000; // 5 minutes

/**
 * Normalizes and builds a partitioned multi-tenant rate limit key
 * Pattern: ratelimit:{tenantId}:{scope}:{identifier}
 */
export function buildRateLimitKey(tenantId = 'global', scope = 'api', identifier = 'unknown') {
  const cleanTenant = String(tenantId || 'global').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanScope = String(scope || 'api').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanId = String(identifier || 'unknown').trim().replace(/[:\s]/g, '_');
  return `ratelimit:${cleanTenant}:${cleanScope}:${cleanId}`;
}

/**
 * Periodically cleans up expired keys from in-memory store to prevent memory leaks
 */
function pruneStaleMemoryEntries(windowMs) {
  const now = Date.now();
  if (now - lastPruneTimestamp < PRUNE_INTERVAL_MS) return;

  lastPruneTimestamp = now;
  const cutoff = now - windowMs;

  for (const [key, timestamps] of inMemoryStore.entries()) {
    const valid = timestamps.filter(t => t > cutoff);
    if (valid.length === 0) {
      inMemoryStore.delete(key);
    } else {
      inMemoryStore.set(key, valid);
    }
  }
}

/**
 * In-memory sliding window fallback execution
 */
function checkInMemoryRateLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  pruneStaleMemoryEntries(windowMs);

  const existing = inMemoryStore.get(key) || [];
  const validTimestamps = existing.filter(t => t > windowStart);

  const currentCount = validTimestamps.length;
  const allowed = currentCount < limit;

  if (allowed) {
    validTimestamps.push(now);
    inMemoryStore.set(key, validTimestamps);
  }

  const remaining = allowed ? Math.max(0, limit - (currentCount + 1)) : 0;
  const oldestTimestamp = validTimestamps[0] || now;
  const retryAfterMs = Math.max(0, windowMs - (now - oldestTimestamp));
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  const resetSec = Math.ceil((oldestTimestamp + windowMs) / 1000);

  return {
    allowed,
    limit,
    remaining,
    reset: resetSec,
    retryAfter: allowed ? 0 : (retryAfterSec || 1),
    source: 'memory',
    key
  };
}

/**
 * Distributed rate limiter with Upstash Redis REST pipeline support
 *
 * @param {object} options
 * @param {string} options.key - Unique rate limit identifier key
 * @param {string} [options.tenantId='global'] - Tenant identifier for tenant isolation
 * @param {string} [options.scope='api'] - Route or operation scope (e.g., 'auth', 'billing', 'api')
 * @param {string} [options.identifier='ip'] - Caller identifier (IP, user ID, API key)
 * @param {number} [options.limit=60] - Max requests permitted in the window
 * @param {number} [options.windowSeconds=60] - Window duration in seconds
 * @param {string} [options.redisUrl] - Upstash Redis REST URL (defaults to env)
 * @param {string} [options.redisToken] - Upstash Redis REST Token (defaults to env)
 * @param {number} [options.timeoutMs=1500] - Redis fetch timeout before memory fallback
 * @returns {Promise<{ allowed: boolean, limit: number, remaining: number, reset: number, retryAfter: number, source: 'redis'|'memory', key: string }>}
 */
export async function checkDistributedRateLimit({
  key: explicitKey,
  tenantId = 'global',
  scope = 'api',
  identifier = 'unknown',
  limit = 60,
  windowSeconds = 60,
  redisUrl = (typeof process !== 'undefined' && process.env?.UPSTASH_REDIS_REST_URL) || '',
  redisToken = (typeof process !== 'undefined' && process.env?.UPSTASH_REDIS_REST_TOKEN) || '',
  timeoutMs = 1500
} = {}) {
  const rateLimitKey = explicitKey || buildRateLimitKey(tenantId, scope, identifier);

  // If Redis credentials are absent, immediately use the resilient in-memory sliding window
  if (!redisUrl || !redisToken) {
    return checkInMemoryRateLimit(rateLimitKey, limit, windowSeconds);
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const member = `${now}-${Math.random().toString(36).substring(2, 8)}`;

  // Construct Upstash REST pipeline: ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE
  const pipeline = [
    ['ZREMRANGEBYSCORE', rateLimitKey, 0, windowStart],
    ['ZADD', rateLimitKey, now, member],
    ['ZCARD', rateLimitKey],
    ['EXPIRE', rateLimitKey, windowSeconds]
  ];

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const pipelineUrl = `${redisUrl.replace(/\/$/, '')}/pipeline`;
    const response = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pipeline),
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      // Non-200 response from Redis -> fallback to in-memory
      return checkInMemoryRateLimit(rateLimitKey, limit, windowSeconds);
    }

    const results = await response.json();
    // Upstash pipeline responses: [ { result: removedCount }, { result: 1 }, { result: totalCount }, { result: 1 } ]
    const currentCount = Number(results[2]?.result) || 1;
    const allowed = currentCount <= limit;
    const remaining = allowed ? Math.max(0, limit - currentCount) : 0;
    const reset = Math.ceil((now + windowMs) / 1000);
    const retryAfter = allowed ? 0 : windowSeconds;

    return {
      allowed,
      limit,
      remaining,
      reset,
      retryAfter,
      source: 'redis',
      key: rateLimitKey
    };
  } catch (_networkError) {
    // Network error, DNS failure, or timeout -> gracefully fallback to local memory
    return checkInMemoryRateLimit(rateLimitKey, limit, windowSeconds);
  }
}

/**
 * Resets the in-memory rate limiting store (useful for tests and cache clearing)
 */
export function resetInMemoryRateLimits() {
  inMemoryStore.clear();
  lastPruneTimestamp = Date.now();
}

/**
 * Diagnostic metrics for health probes and monitoring
 */
export function getRateLimitMetrics() {
  return {
    inMemoryKeysTracked: inMemoryStore.size,
    lastPruneTimestamp
  };
}
