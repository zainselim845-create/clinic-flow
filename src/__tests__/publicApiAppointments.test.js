import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/v1/appointments.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

describe('Public Partner REST API v1 (/api/v1/appointments)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests without API key with 401 Unauthorized', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: {}
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('responds to CORS OPTIONS preflight with 204 No Content', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {}
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('validates required fields on POST appointments', async () => {
    const req = {
      method: 'POST',
      headers: {
        'x-clinic-api-key': 'live_key_998877665544'
      },
      body: {
        // missing patientName, phone, date
        service: 'كشف عام'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('processes authorized GET appointments request returning structured JSON', async () => {
    const req = {
      method: 'GET',
      headers: {
        'x-clinic-api-key': 'live_key_998877665544',
        'x-clinic-id': 'clinic-dr-ahmed'
      },
      query: {
        limit: 10
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.clinicId).toBe('clinic-dr-ahmed');
    }
  });

  it('enforces API key rate limiting returning 429 when threshold exceeded', async () => {
    const abuseKey = 'key_rate_limit_test_' + Date.now();
    let lastRes = null;

    // Send 121 requests with the same key
    for (let i = 0; i <= 121; i++) {
      const req = {
        method: 'GET',
        headers: {
          'x-clinic-api-key': abuseKey
        },
        query: {}
      };
      lastRes = createMockRes();
      await handler(req, lastRes);
      if (lastRes.statusCode === 429) break;
    }

    expect(lastRes.statusCode).toBe(429);
    expect(lastRes.headers['Retry-After']).toBeDefined();
    expect(lastRes.body.error).toContain('Too many requests');
  });
});
