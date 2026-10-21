import { next, rewrite } from '@vercel/edge';

export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'superadmin',
  'staging',
  'dev',
  'test',
  'demo',
  'mail',
  'cdn',
  'static',
  'status',
  'docs',
  'support',
  'billing',
  'auth'
]);

export const PLATFORM_HOSTING_SUFFIXES = [
  '.vercel.app',
  '.netlify.app',
  '.pages.dev',
  '.onrender.com',
  '.github.io',
  '.workers.dev'
];

/**
 * Extracts routing metadata from a given URL or hostname.
 * @param {string|URL} inputUrl
 * @returns {{ type: 'subdomain'|'customDomain'|'platform', slug: string|null, customDomain: string|null }}
 */
export function extractEdgeRouting(inputUrl) {
  let parsed;
  try {
    parsed = typeof inputUrl === 'string' ? new URL(inputUrl, 'http://localhost') : inputUrl;
  } catch {
    return { type: 'platform', slug: null, customDomain: null };
  }

  const hostname = (parsed.hostname || '').toLowerCase().trim();
  const cleanHostname = hostname.replace(/^www\./i, '');

  if (!cleanHostname || /^(127\.0\.0\.1|0\.0\.0\.0)$/.test(cleanHostname)) {
    return { type: 'platform', slug: null, customDomain: null };
  }

  // Check hosting platform domains (e.g. *.vercel.app)
  const isHostingPlatform = PLATFORM_HOSTING_SUFFIXES.some(suffix => cleanHostname.endsWith(suffix));
  const parts = cleanHostname.split('.');

  if (isHostingPlatform) {
    // Requires >= 4 parts for a subdomain on hosting platforms
    // e.g. dr-ahmed.clinic-flow-lh3g.vercel.app -> parts.length is 4, parts[0] is dr-ahmed
    if (parts.length >= 4 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return { type: 'subdomain', slug: parts[0], customDomain: null };
    }
    return { type: 'platform', slug: null, customDomain: null };
  }

  // Check primary platform domains (smartclinic.app, clinicflow.app and any configured domain)
  const configuredDomain = ((typeof process !== 'undefined' && (process.env?.PLATFORM_DOMAIN || process.env?.VITE_PLATFORM_DOMAIN)) || '').toLowerCase().trim();
  const knownPlatformDomains = Array.from(new Set(['smartclinic.app', 'clinicflow.app', ...(configuredDomain ? [configuredDomain] : [])]));

  if (knownPlatformDomains.includes(cleanHostname)) {
    return { type: 'platform', slug: null, customDomain: null };
  }

  for (const domain of knownPlatformDomains) {
    if (cleanHostname.endsWith('.' + domain)) {
      // Requires >= 3 parts (e.g. dr-ahmed.clinicflow.app)
      if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
        return { type: 'subdomain', slug: parts[0], customDomain: null };
      }
      return { type: 'platform', slug: null, customDomain: null };
    }
  }

  // Check localhost subdomains (e.g. dr-ahmed.localhost)
  if (parts.length === 2 && parts[1] === 'localhost' && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return { type: 'subdomain', slug: parts[0], customDomain: null };
  }

  if (cleanHostname === 'localhost') {
    return { type: 'platform', slug: null, customDomain: null };
  }

  // Otherwise, it is an independent dedicated custom domain (e.g. dr-hazem-clinic.com)
  return { type: 'customDomain', slug: null, customDomain: cleanHostname };
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
    /*
     * Match all request paths except:
     * - _vercel/ (Vercel internals)
     * - assets/ (Vite static assets)
     * - Static asset files with extensions (.svg, .png, .ico, .txt, .xml, .css, .js)
     */
    '/((?!_vercel/|assets/|[\\w-]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|woff2?)).*)',
  ],
};
/**
 * Edge-Level Sliding Window Rate Limiter
 * Protects against brute-force, credential stuffing, and API abuse at the infrastructure level.
 * Uses per-region in-memory storage (resets on cold start, which is acceptable for rate limiting).
 */
const IS_TEST_ENV = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute sliding window
const RATE_LIMIT_MAX_REQUESTS = IS_TEST_ENV ? 180 : 360; // Generous allowance for production browsing
const RATE_LIMIT_AUTH_MAX = 10; // Strict limit for authentication & credential stuffing protection (OWASP A07)
const RATE_LIMIT_CLEANUP_INTERVAL = 300_000; // Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();

function getRateLimitKey(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

function checkRateLimit(ip, maxRequests) {
  const now = Date.now();

  // Periodic cleanup to prevent memory bloat
  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) rateLimitStore.delete(key);
      else rateLimitStore.set(key, valid);
    }
    lastCleanup = now;
  }

  const timestamps = rateLimitStore.get(ip) || [];
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentRequests = timestamps.filter(t => t > windowStart);
  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);

  if (recentRequests.length > maxRequests) {
    return { limited: true, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - recentRequests[0]) };
  }
  return { limited: false };
}

export default function middleware(request) {
  const url = new URL(request.url);

  // Rate limiting enforcement: distinguish auth endpoints from general browsing
  const ip = getRateLimitKey(request);
  const isAuthEndpoint = url.pathname === '/login' || url.pathname.startsWith('/api/auth') || url.pathname.includes('/auth');
  const maxReqs = isAuthEndpoint ? RATE_LIMIT_AUTH_MAX : RATE_LIMIT_MAX_REQUESTS;
  const rateCheck = checkRateLimit(ip, maxReqs);

  if (rateCheck.limited) {
    const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || RATE_LIMIT_WINDOW_MS) / 1000);
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');

    if (acceptsHtml && !url.pathname.startsWith('/api')) {
      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>يرجى الانتظار قليلاً | ClinicFlow</title>
  <meta http-equiv="refresh" content="${retryAfterSec}">
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #09090b; color: #f4f4f5; text-align: center; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 2.5rem; border-radius: 1rem; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h2 { margin: 0 0 0.75rem; color: #fff; }
    p { color: #a1a1aa; line-height: 1.6; margin: 0 0 1.5rem; }
    .countdown { font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h2>يرجى التمهل قليلاً</h2>
    <p>تم إرسال طلبات متعددة في وقت وجيز. سيتم تحديث الصفحة تلقائياً خلال:</p>
    <div class="countdown">${retryAfterSec} ثانية</div>
    <p style="font-size:0.85rem;color:#71717a">جاري إعادة الاتصال تلقائياً...</p>
  </div>
</body>
</html>`;
      return new Response(html, {
        status: 429,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(maxReqs),
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.', retryAfter: retryAfterSec }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(maxReqs),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const hostHeader = 
    request.headers.get('x-clinic-test-host') ||
    request.headers.get('x-forwarded-host') || 
    request.headers.get('host') || 
    url.host;
  const effectiveUrl = new URL(url.pathname + url.search, `https://${hostHeader}`);
  const routing = extractEdgeRouting(effectiveUrl);

  if (routing.type === 'subdomain' && routing.slug) {
    const slug = routing.slug;
    
    // When hitting the root path '/', rewrite to '/index.html?clinic=:slug'
    // so the Single Page Application boots directly into the dedicated clinic booking portal
    if (url.pathname === '/' || url.pathname === '') {
      const rewriteUrl = new URL('/index.html', request.url);
      rewriteUrl.searchParams.set('clinic', slug);
      // Preserve any query parameters passed by user (campaigns, ref, etc.)
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'clinic') {
          rewriteUrl.searchParams.set(key, value);
        }
      }

      return rewrite(rewriteUrl, {
        headers: {
          'x-clinic-slug': slug,
          'x-is-subdomain': '1',
          'x-is-dedicated-domain': '1',
          'x-edge-routed': 'vercel-edge',
        },
      });
    }

    // For other paths on the subdomain (e.g. /booking, /login, /dashboard)
    return next({
      headers: {
        'x-clinic-slug': slug,
        'x-is-subdomain': '1',
        'x-is-dedicated-domain': '1',
        'x-edge-routed': 'vercel-edge',
      },
    });
  }

  if (routing.type === 'customDomain' && routing.customDomain) {
    const domain = routing.customDomain;

    if (url.pathname === '/' || url.pathname === '') {
      const rewriteUrl = new URL('/index.html', request.url);
      rewriteUrl.searchParams.set('dedicatedDomain', domain);
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'dedicatedDomain') {
          rewriteUrl.searchParams.set(key, value);
        }
      }

      return rewrite(rewriteUrl, {
        headers: {
          'x-clinic-custom-domain': domain,
          'x-is-dedicated-domain': '1',
          'x-edge-routed': 'vercel-edge',
        },
      });
    }

    return next({
      headers: {
        'x-clinic-custom-domain': domain,
        'x-is-dedicated-domain': '1',
        'x-edge-routed': 'vercel-edge',
      },
    });
  }

  // Platform root or standard shared domain routes
  return next({
    headers: {
      'x-edge-routed': 'vercel-edge',
    },
  });
}
