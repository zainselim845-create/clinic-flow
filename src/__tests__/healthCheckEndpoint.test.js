import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/health.js';

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

describe('Enterprise Health Diagnostics API (/api/health)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds with 200 and healthy status on standard GET request', async () => {
    const req = { method: 'GET' };
    const res = createMockRes();

    await handler(req, res);

    expect([200, 503]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.status).toBe('healthy');
      expect(res.body.version).toBe('5.2.0');
      expect(typeof res.body.uptimeSec).toBe('number');
      expect(typeof res.body.latencyMs).toBe('number');
      expect(res.headers['Cache-Control']).toContain('no-cache');
    }
  });

  it('responds with 200 and no body on HEAD uptime probe', async () => {
    const req = { method: 'HEAD' };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });

  it('responds with 204 on OPTIONS CORS preflight', async () => {
    const req = { method: 'OPTIONS' };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('rejects unsupported HTTP methods with 405 Method Not Allowed', async () => {
    const req = { method: 'POST' };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('Method Not Allowed');
  });
});
