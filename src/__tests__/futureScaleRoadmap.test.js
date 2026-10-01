import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkDistributedRateLimit,
  buildRateLimitKey,
  resetInMemoryRateLimits,
  getRateLimitMetrics
} from '../services/distributedRateLimiter.js';
import {
  computeTotpCode,
  generateTotpSecret,
  hashBackupCode,
  enable2FAWithVault,
  verify2FAWithVault,
  registerDeviceFingerprint
} from '../services/twoFactorAuthService.js';
import billingCronHandler from '../../api/cron/reconcile-billing.js';
import recallsCronHandler from '../../api/cron/dispatch-recalls.js';

describe('Future Scale Roadmap: 10M to 100M Architecture Suite', () => {

  beforeEach(() => {
    resetInMemoryRateLimits();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // PILLAR 1: Distributed Multi-Tenant Rate Limiting
  // ============================================================================
  describe('Pillar 1: Distributed Multi-Tenant Rate Limiter', () => {
    it('constructs strict, normalized multi-tenant namespace keys', () => {
      const key1 = buildRateLimitKey('clinic-alpha', 'api', '192.168.1.1');
      expect(key1).toBe('ratelimit:clinic-alpha:api:192.168.1.1');

      const keySpecial = buildRateLimitKey('Clinic #44!', 'AUTH', 'user@domain.com');
      expect(keySpecial).toBe('ratelimit:clinic__44_:auth:user@domain.com');
    });

    it('processes requests through Upstash Redis REST pipeline when configured', async () => {
      // Mock successful Upstash Redis pipeline response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { result: 0 }, // ZREMRANGEBYSCORE removed
          { result: 1 }, // ZADD added
          { result: 4 }, // ZCARD total count
          { result: 1 }  // EXPIRE set
        ]
      });
      globalThis.fetch = mockFetch;

      const result = await checkDistributedRateLimit({
        tenantId: 'clinic-cairo-1',
        scope: 'api',
        identifier: 'client-token-99',
        limit: 10,
        windowSeconds: 60,
        redisUrl: 'https://upstash-mock.redis.labs',
        redisToken: 'mock-upstash-secret-token'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('https://upstash-mock.redis.labs/pipeline');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(6);
      expect(result.source).toBe('redis');
    });

    it('enforces limit exhaustion on Upstash Redis when request threshold is exceeded', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { result: 0 },
          { result: 1 },
          { result: 11 }, // Count exceeds limit of 10
          { result: 1 }
        ]
      });
      globalThis.fetch = mockFetch;

      const result = await checkDistributedRateLimit({
        tenantId: 'clinic-cairo-1',
        scope: 'api',
        identifier: 'client-token-99',
        limit: 10,
        windowSeconds: 60,
        redisUrl: 'https://upstash-mock.redis.labs',
        redisToken: 'mock-upstash-secret-token'
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);
      expect(result.source).toBe('redis');
    });

    it('falls back seamlessly to in-memory sliding window when Redis fails or times out', async () => {
      // Simulate network disconnection or Redis timeout
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out to Redis cluster'));

      const result = await checkDistributedRateLimit({
        tenantId: 'clinic-fallback',
        scope: 'api',
        identifier: '10.0.0.1',
        limit: 5,
        windowSeconds: 60,
        redisUrl: 'https://upstash-broken.redis.labs',
        redisToken: 'broken-token'
      });

      expect(result.source).toBe('memory');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('guarantees tenant isolation so tenant quotas do not bleed into each other', async () => {
      // In-memory mode (no redisUrl passed)
      for (let i = 0; i < 5; i++) {
        await checkDistributedRateLimit({
          tenantId: 'tenant-a',
          scope: 'invoicing',
          identifier: 'user-1',
          limit: 5,
          windowSeconds: 60
        });
      }

      // Tenant A is now exhausted
      const checkA = await checkDistributedRateLimit({
        tenantId: 'tenant-a',
        scope: 'invoicing',
        identifier: 'user-1',
        limit: 5,
        windowSeconds: 60
      });
      expect(checkA.allowed).toBe(false);

      // Tenant B with identical identifier has full quota remaining
      const checkB = await checkDistributedRateLimit({
        tenantId: 'tenant-b',
        scope: 'invoicing',
        identifier: 'user-1',
        limit: 5,
        windowSeconds: 60
      });
      expect(checkB.allowed).toBe(true);
      expect(checkB.remaining).toBe(4);

      const metrics = getRateLimitMetrics();
      expect(metrics.inMemoryKeysTracked).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // PILLAR 2: Cloud Database-Backed 2FA Credential Vault
  // ============================================================================
  describe('Pillar 2: Cloud Database-Backed 2FA Credential Vault', () => {
    it('produces cryptographic SHA-256 hashes for recovery backup codes', async () => {
      const code1 = 'ABCD-EFGH';
      const hash1 = await hashBackupCode(code1);
      const hash2 = await hashBackupCode('abcd-efgh'); // Normalized casing

      expect(hash1).toBeDefined();
      expect(hash1.length).toBe(64);
      expect(hash1).toBe(hash2);

      const differentHash = await hashBackupCode('WXYZ-1234');
      expect(differentHash).not.toBe(hash1);
    });

    it('provisions 2FA with SHA-256 hashed recovery codes in the vault', async () => {
      const { secret } = generateTotpSecret('dr.salem@clinicflow.app');
      const backupCodes = ['ABCD-1111', 'EFGH-2222', 'JKLM-3333'];

      const mockDb = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  enabled: true,
                  secret,
                  backup_codes: await Promise.all(backupCodes.map(hashBackupCode)),
                  device_fingerprints: []
                },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      };

      const result = await enable2FAWithVault({
        userId: 'usr_doc_99',
        secret,
        backupCodes,
        deviceFingerprint: 'device_macbook_pro_m3',
        client: mockDb
      });

      expect(result.success).toBe(true);
      expect(result.hashedCount).toBe(3);
      expect(result.deviceRegistered).toBe(true);
      expect(mockDb.from).toHaveBeenCalledWith('two_factor_credentials');
    });

    it('verifies valid TOTP token and registers trusted device', async () => {
      const testSecret = 'JBSWY3DPEHPK3PXP';
      const validToken = computeTotpCode(testSecret);

      const mockDb = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  enabled: true,
                  secret: testSecret,
                  backup_codes: [],
                  device_fingerprints: []
                },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      };

      const verification = await verify2FAWithVault({
        userId: 'usr_doc_99',
        code: validToken,
        deviceFingerprint: 'browser_fingerprint_safari_18',
        client: mockDb
      });

      expect(verification.verified).toBe(true);
      expect(verification.method).toBe('totp');
      expect(verification.deviceRemembered).toBe(true);
    });

    it('verifies and consumes SHA-256 hashed backup recovery codes', async () => {
      const testSecret = 'JBSWY3DPEHPK3PXP';
      const rawCode = 'RECV-9999';
      const codeHash = await hashBackupCode(rawCode);

      const mockDb = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  enabled: true,
                  secret: testSecret,
                  backup_codes: [codeHash],
                  device_fingerprints: []
                },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      };

      const verification = await verify2FAWithVault({
        userId: 'usr_doc_99',
        code: rawCode,
        client: mockDb
      });

      expect(verification.verified).toBe(true);
      expect(verification.method).toBe('backup_code');
      expect(verification.remainingCodes).toBe(0);
    });
  });

  // ============================================================================
  // PILLAR 3: Background Automated Cron Batch Workers
  // ============================================================================
  describe('Pillar 3: Background Automated Cron Batch Workers', () => {
    function createMockRes() {
      const res = {
        statusCode: 200,
        headers: {},
        data: null,
        setHeader: (key, val) => { res.headers[key] = val; return res; },
        status: (code) => { res.statusCode = code; return res; },
        json: (payload) => { res.data = payload; return res; },
        end: () => res
      };
      return res;
    }

    describe('/api/cron/reconcile-billing', () => {
      it('rejects unauthorized requests without valid CRON_SECRET with 401', async () => {
        const req = {
          method: 'POST',
          headers: {
            'authorization': 'Bearer wrong-secret'
          }
        };
        const res = createMockRes();

        await billingCronHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.data.success).toBe(false);
        expect(res.data.error).toContain('Unauthorized');
      });

      it('executes billing reconciliation successfully with valid CRON_SECRET', async () => {
        const req = {
          method: 'POST',
          headers: {
            'authorization': 'Bearer test-cron-secret-2026'
          }
        };
        const res = createMockRes();

        await billingCronHandler(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.pastDueCount).toBeDefined();
        expect(res.data.quotasResetCount).toBeDefined();
      });
    });

    describe('/api/cron/dispatch-recalls', () => {
      it('rejects unauthorized requests with 401', async () => {
        const req = {
          method: 'GET',
          headers: {}
        };
        const res = createMockRes();

        await recallsCronHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.data.success).toBe(false);
      });

      it('executes automated periodic recalls dispatch with valid CRON_SECRET', async () => {
        const req = {
          method: 'GET',
          headers: {
            'authorization': 'Bearer test-cron-secret-2026'
          }
        };
        const res = createMockRes();

        await recallsCronHandler(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.dispatchedCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

});
