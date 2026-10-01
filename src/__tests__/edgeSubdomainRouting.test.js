import { describe, it, expect, vi, beforeEach } from 'vitest';
import middleware, { extractEdgeRouting, RESERVED_SUBDOMAINS, PLATFORM_HOSTING_SUFFIXES } from '../../middleware';
import worker, { extractCloudflareRouting } from '../../cloudflare/worker';
import { resolveTenantFromLocation, isDedicatedDomain } from '../context/TenantContext';

describe('Edge Subdomain & Dedicated Domain Routing Architecture', () => {
  describe('1. Vercel Edge Middleware: Hostname & Subdomain Extraction', () => {
    it('correctly extracts tenant slug from standard SaaS subdomain (e.g. dr-ahmed.clinicflow.app)', () => {
      const routing = extractEdgeRouting('https://dr-ahmed.clinicflow.app/');
      expect(routing.type).toBe('subdomain');
      expect(routing.slug).toBe('dr-ahmed');
      expect(routing.customDomain).toBeNull();
    });

    it('correctly extracts tenant slug from Vercel platform subdomain (e.g. dr-ahmed.clinic-flow-ten-sigma.vercel.app)', () => {
      const routing = extractEdgeRouting('https://dr-ahmed.clinic-flow-ten-sigma.vercel.app/');
      expect(routing.type).toBe('subdomain');
      expect(routing.slug).toBe('dr-ahmed');
      expect(routing.customDomain).toBeNull();
    });

    it('correctly identifies Vercel platform root host as platform, NOT a subdomain', () => {
      const routing = extractEdgeRouting('https://clinic-flow-ten-sigma.vercel.app/');
      expect(routing.type).toBe('platform');
      expect(routing.slug).toBeNull();
      expect(routing.customDomain).toBeNull();
    });

    it('identifies primary platform host clinicflow.app as platform', () => {
      const routing = extractEdgeRouting('https://clinicflow.app/');
      expect(routing.type).toBe('platform');
      expect(routing.slug).toBeNull();
      expect(routing.customDomain).toBeNull();
    });

    it('skips reserved subdomains (www, app, api, admin, superadmin, etc.)', () => {
      const reservedList = ['www', 'app', 'api', 'admin', 'superadmin', 'staging', 'dev', 'mail', 'cdn', 'docs'];
      for (const res of reservedList) {
        const routing = extractEdgeRouting(`https://${res}.clinicflow.app/`);
        expect(routing.type).toBe('platform');
        expect(routing.slug).toBeNull();
      }
    });

    it('correctly extracts tenant slug on local development (e.g. dr-sara.localhost)', () => {
      const routing = extractEdgeRouting('http://dr-sara.localhost:5173/');
      expect(routing.type).toBe('subdomain');
      expect(routing.slug).toBe('dr-sara');
    });

    it('identifies independent custom domains as customDomain', () => {
      const routing = extractEdgeRouting('https://dr-hazem-clinic.com/');
      expect(routing.type).toBe('customDomain');
      expect(routing.slug).toBeNull();
      expect(routing.customDomain).toBe('dr-hazem-clinic.com');
    });

    it('strips www prefix from custom domains', () => {
      const routing = extractEdgeRouting('https://www.dr-hazem-clinic.com/');
      expect(routing.type).toBe('customDomain');
      expect(routing.customDomain).toBe('dr-hazem-clinic.com');
    });
  });

  describe('2. Vercel Edge Middleware: Request Interception & Rewriting', () => {
    it('rewrites root "/" on subdomain to "/index.html?clinic=:slug" with edge headers', () => {
      const request = new Request('https://dr-ahmed.clinicflow.app/');
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('x-middleware-rewrite')).toContain('/index.html?clinic=dr-ahmed');
      expect(response.headers.get('x-clinic-slug')).toBe('dr-ahmed');
      expect(response.headers.get('x-is-subdomain')).toBe('1');
      expect(response.headers.get('x-is-dedicated-domain')).toBe('1');
      expect(response.headers.get('x-edge-routed')).toBe('vercel-edge');
    });

    it('preserves existing query parameters when rewriting root "/" on subdomain', () => {
      const request = new Request('https://dr-ahmed.clinicflow.app/?source=facebook&campaign=summer2026');
      const response = middleware(request);

      const rewriteTarget = response.headers.get('x-middleware-rewrite');
      expect(rewriteTarget).toContain('clinic=dr-ahmed');
      expect(rewriteTarget).toContain('source=facebook');
      expect(rewriteTarget).toContain('campaign=summer2026');
      expect(response.headers.get('x-clinic-slug')).toBe('dr-ahmed');
    });

    it('rewrites root "/" on custom domain to "/index.html?dedicatedDomain=:domain"', () => {
      const request = new Request('https://dr-hazem-clinic.com/');
      const response = middleware(request);

      expect(response.headers.get('x-middleware-rewrite')).toContain('/index.html?dedicatedDomain=dr-hazem-clinic.com');
      expect(response.headers.get('x-clinic-custom-domain')).toBe('dr-hazem-clinic.com');
      expect(response.headers.get('x-is-dedicated-domain')).toBe('1');
      expect(response.headers.get('x-edge-routed')).toBe('vercel-edge');
    });

    it('passes through non-root paths on subdomain with headers attached', () => {
      const request = new Request('https://dr-ahmed.clinicflow.app/booking');
      const response = middleware(request);

      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('x-clinic-slug')).toBe('dr-ahmed');
      expect(response.headers.get('x-is-subdomain')).toBe('1');
      expect(response.headers.get('x-edge-routed')).toBe('vercel-edge');
    });

    it('correctly resolves subdomain forwarded via Host or x-forwarded-host header', () => {
      const request = new Request('https://clinic-flow-ten-sigma.vercel.app/', {
        headers: { 'x-forwarded-host': 'dr-ahmed.clinicflow.app' }
      });
      const response = middleware(request);

      expect(response.headers.get('x-middleware-rewrite')).toContain('/index.html?clinic=dr-ahmed');
      expect(response.headers.get('x-clinic-slug')).toBe('dr-ahmed');
      expect(response.headers.get('x-is-subdomain')).toBe('1');
    });

    it('passes through platform root routes with vercel-edge header', () => {
      const request = new Request('https://clinicflow.app/');
      const response = middleware(request);

      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('x-edge-routed')).toBe('vercel-edge');
      expect(response.headers.get('x-clinic-slug')).toBeNull();
    });
  });

  describe('3. Cloudflare Worker: Edge Routing & Upstream Proxying', () => {
    it('extracts routing accurately across Cloudflare network URLs', () => {
      expect(extractCloudflareRouting('https://dr-sara.clinicflow.app/')).toEqual({
        type: 'subdomain',
        slug: 'dr-sara',
        customDomain: null
      });

      expect(extractCloudflareRouting('https://clinicflow.app/')).toEqual({
        type: 'platform',
        slug: null,
        customDomain: null
      });

      expect(extractCloudflareRouting('https://drsara-eyes.com/')).toEqual({
        type: 'customDomain',
        slug: null,
        customDomain: 'drsara-eyes.com'
      });
    });

    it('worker intercepts request, rewrites root path, and attaches edge headers', async () => {
      const mockFetch = vi.fn().mockImplementation((req) => {
        return Promise.resolve(new Response('<html><body>ClinicFlow App</body></html>', {
          status: 200,
          headers: new Headers({ 'content-type': 'text/html' })
        }));
      });

      // Temporarily mock global fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const request = new Request('https://dr-ahmed.clinicflow.app/');
        const response = await worker.fetch(request);

        expect(mockFetch).toHaveBeenCalled();
        const upstreamCall = mockFetch.mock.calls[0][0];
        const upstreamUrl = new URL(upstreamCall.url);

        expect(upstreamUrl.pathname).toBe('/index.html');
        expect(upstreamUrl.searchParams.get('clinic')).toBe('dr-ahmed');
        expect(upstreamCall.headers.get('x-clinic-slug')).toBe('dr-ahmed');
        expect(upstreamCall.headers.get('x-edge-routed')).toBe('cloudflare-worker');

        // Check response back to browser
        expect(response.headers.get('x-clinic-slug')).toBe('dr-ahmed');
        expect(response.headers.get('x-is-subdomain')).toBe('1');
        expect(response.headers.get('x-edge-routed')).toBe('cloudflare-worker');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('worker bypasses static assets and api endpoints without modifications', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('/* static */', { status: 200 }));
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const assetRequest = new Request('https://dr-ahmed.clinicflow.app/assets/index-abc.js');
        await worker.fetch(assetRequest);

        expect(mockFetch).toHaveBeenCalled();
        const callArg = mockFetch.mock.calls[0][0];
        expect(new URL(callArg.url).pathname).toBe('/assets/index-abc.js');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('4. Client-side Synchronization & Zero-State Fallback in TenantContext', () => {
    it('immediately identifies subdomain even when tenants array is completely empty', () => {
      const resolution = resolveTenantFromLocation([], {
        hostname: 'dr-ahmed.clinicflow.app',
        pathname: '/',
        search: ''
      });

      expect(resolution.isDedicatedDomain).toBe(true);
      expect(resolution.slug).toBe('dr-ahmed');
      expect(resolution.tenant).toBeNull();
    });

    it('immediately identifies 4-part platform subdomain with empty tenants array', () => {
      const resolution = resolveTenantFromLocation([], {
        hostname: 'dr-sara.clinic-flow-ten-sigma.vercel.app',
        pathname: '/',
        search: ''
      });

      expect(resolution.isDedicatedDomain).toBe(true);
      expect(resolution.slug).toBe('dr-sara');
    });

    it('correctly handles dedicatedDomain query parameter injected by Edge Worker', () => {
      const mockTenants = [
        { id: '1', slug: 'dr-hazem', customDomain: 'dr-hazem-clinic.com', name: 'عيادة د. حازم' }
      ];

      const resolution = resolveTenantFromLocation(mockTenants, {
        hostname: 'clinic-flow-ten-sigma.vercel.app',
        pathname: '/index.html',
        search: '?dedicatedDomain=dr-hazem-clinic.com'
      });

      expect(resolution.isDedicatedDomain).toBe(true);
      expect(resolution.slug).toBe('dr-hazem');
      expect(resolution.tenant?.name).toBe('عيادة د. حازم');
    });

    it('maintains tenant isolation and does not fall back to another clinic on dedicated subdomain', () => {
      const mockTenants = [
        { id: 'clinic-1', slug: 'dr-sara', name: 'عيادة د. سارة' },
        { id: 'clinic-2', slug: 'dr-ahmed', name: 'عيادة د. أحمد' }
      ];

      // Request for an unknown or newly created subdomain not yet in list
      const resolution = resolveTenantFromLocation(mockTenants, {
        hostname: 'dr-youssef.clinicflow.app',
        pathname: '/',
        search: ''
      });

      expect(resolution.isDedicatedDomain).toBe(true);
      expect(resolution.slug).toBe('dr-youssef');
      expect(resolution.tenant).toBeNull();
      // Must NOT attach to clinic-1 (dr-sara)
      expect(resolution.tenant?.slug).toBeUndefined();
    });
  });

  describe('5. Edge Rate Limiter Protection', () => {
    it('enforces rate limit on auth endpoints after threshold is exceeded', async () => {
      const testIp = '198.51.100.42';
      let lastResponse = null;

      // Send 10 allowed requests to /login
      for (let i = 0; i < 10; i++) {
        const req = new Request('https://clinicflow.app/login', {
          headers: { 'x-forwarded-for': testIp }
        });
        lastResponse = middleware(req);
        expect(lastResponse.status).not.toBe(429);
      }

      // The 11th request must be rejected with 429
      const blockedReq = new Request('https://clinicflow.app/login', {
        headers: { 'x-forwarded-for': testIp }
      });
      const blockedRes = middleware(blockedReq);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();
      expect(blockedRes.headers.get('X-RateLimit-Remaining')).toBe('0');

      const body = await blockedRes.json();
      expect(body.error).toContain('Too many requests');
    });
  });
});

