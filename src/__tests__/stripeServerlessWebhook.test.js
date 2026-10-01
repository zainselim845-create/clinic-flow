import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/stripe-webhook.js';

describe('Serverless Stripe Webhook Endpoint (api/stripe-webhook.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      }
    };
    return res;
  }

  it('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
    const req = { method: 'GET', headers: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('Method Not Allowed');
  });

  it('rejects missing event id or type with 400 Bad Request', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { some: 'payload' }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Missing event ID or type');
  });

  it('processes checkout.session.completed and returns 200 with event info', async () => {
    const eventId = 'evt_test_checkout_' + Date.now();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        id: eventId,
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'clinic-dr-ahmed',
            metadata: { tier: 'pro', clinicId: 'clinic-dr-ahmed' }
          }
        }
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.eventId).toBe(eventId);
    expect(res.body.eventType).toBe('checkout.session.completed');
  });

  it('deduplicates identical webhook events via idempotency cache', async () => {
    const duplicateId = 'evt_dup_' + Math.random().toString(36).slice(2);
    const req = {
      method: 'POST',
      headers: {},
      body: {
        id: duplicateId,
        type: 'invoice.paid',
        data: {
          object: {
            client_reference_id: 'clinic-dr-ahmed'
          }
        }
      }
    };

    // First call: processed
    const res1 = createMockRes();
    await handler(req, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.body.deduplicated).toBeUndefined();

    // Second call: deduplicated without re-executing
    const res2 = createMockRes();
    await handler(req, res2);
    expect(res2.statusCode).toBe(200);
    expect(res2.body.received).toBe(true);
    expect(res2.body.deduplicated).toBe(true);
  });
});
