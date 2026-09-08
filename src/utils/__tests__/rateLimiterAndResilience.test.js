import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, checkActionRateLimit } from '../rateLimiter';
import { CircuitBreaker, CircuitState } from '../circuitBreaker';

describe('High Scale Resilience: RateLimiter & CircuitBreaker', () => {

  describe('Sliding Window RateLimiter', () => {
    let limiter;

    beforeEach(() => {
      limiter = new RateLimiter();
    });

    it('allows requests within threshold and returns remaining quota', () => {
      const key = 'test_user_1';
      const result1 = limiter.check(key, 3, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = limiter.check(key, 3, 60000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = limiter.check(key, 3, 60000);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('blocks subsequent requests once maxRequests limit is exceeded', () => {
      const key = 'test_spammer';
      for (let i = 0; i < 5; i++) {
        limiter.check(key, 5, 60000);
      }

      const blockedResult = limiter.check(key, 5, 60000);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('sanitizes identifiers in checkActionRateLimit helper', () => {
      const phone = '+20 100 628 5031';
      const result = checkActionRateLimit('booking', phone, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('resets rate limit bucket on demand', () => {
      const key = 'test_reset';
      limiter.check(key, 1, 60000);
      expect(limiter.check(key, 1, 60000).allowed).toBe(false);

      limiter.reset(key);
      expect(limiter.check(key, 1, 60000).allowed).toBe(true);
    });
  });

  describe('CircuitBreaker for Upstream Failures', () => {
    let breaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        cooldownPeriodMs: 500,
        timeoutMs: 100
      });
    });

    it('executes successful actions normally while in CLOSED state', async () => {
      const result = await breaker.execute('sms_gateway', async () => 'sms_sent');
      expect(result).toBe('sms_sent');
      expect(breaker.getCircuit('sms_gateway').state).toBe(CircuitState.CLOSED);
    });

    it('trips circuit to OPEN when failure threshold is reached and uses fallback', async () => {
      const failingFn = async () => { throw new Error('API 503 Service Unavailable'); };
      const fallbackFn = (err) => ({ fallback: true, error: err.message });

      // First failure
      const res1 = await breaker.execute('ai_service', failingFn, fallbackFn);
      expect(res1.fallback).toBe(true);
      expect(breaker.getCircuit('ai_service').state).toBe(CircuitState.CLOSED);

      // Second failure -> Trips to OPEN
      const res2 = await breaker.execute('ai_service', failingFn, fallbackFn);
      expect(res2.fallback).toBe(true);
      expect(breaker.getCircuit('ai_service').state).toBe(CircuitState.OPEN);

      // Subsequent call fails fast without calling failingFn
      let called = false;
      const res3 = await breaker.execute('ai_service', async () => { called = true; }, fallbackFn);
      expect(called).toBe(false);
      expect(res3.fallback).toBe(true);
      expect(res3.error.toLowerCase()).toContain('circuit breaker is open');
    });

    it('handles timeout as a failure and triggers fallback', async () => {
      const slowFn = () => new Promise(resolve => setTimeout(resolve, 200));
      const fallbackFn = (err) => ({ timedOut: true, message: err.message });

      const result = await breaker.execute('slow_service', slowFn, fallbackFn);
      expect(result.timedOut).toBe(true);
      expect(result.message).toContain('timed out');
    });
  });

});
