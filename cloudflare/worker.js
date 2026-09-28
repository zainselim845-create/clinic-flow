/**
 * Cloudflare Worker for ClinicFlow Edge Subdomain & Custom Domain Routing
 * Intercepts requests at Cloudflare Edge network before reaching the origin.
 */

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
  '.pages.dev',
  '.workers.dev',
  '.netlify.app',
  '.onrender.com',
  '.github.io'
];

/**
 * Extracts routing metadata from a given URL or hostname.
 * @param {string|URL} inputUrl
 * @returns {{ type: 'subdomain'|'customDomain'|'platform', slug: string|null, customDomain: string|null }}
 */
export function extractCloudflareRouting(inputUrl) {
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

  // Check hosting platform domains
  const isHostingPlatform = PLATFORM_HOSTING_SUFFIXES.some(suffix => cleanHostname.endsWith(suffix));
  const parts = cleanHostname.split('.');

  if (isHostingPlatform) {
    if (parts.length >= 4 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return { type: 'subdomain', slug: parts[0], customDomain: null };
    }
    return { type: 'platform', slug: null, customDomain: null };
  }

  // Check primary platform domain (clinicflow.app)
  if (cleanHostname === 'clinicflow.app') {
    return { type: 'platform', slug: null, customDomain: null };
  }

  if (cleanHostname.endsWith('.clinicflow.app')) {
    if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return { type: 'subdomain', slug: parts[0], customDomain: null };
    }
    return { type: 'platform', slug: null, customDomain: null };
  }

  // Localhost subdomain (e.g. dr-sara.localhost)
  if (parts.length === 2 && parts[1] === 'localhost' && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return { type: 'subdomain', slug: parts[0], customDomain: null };
  }

  if (cleanHostname === 'localhost') {
    return { type: 'platform', slug: null, customDomain: null };
  }

  // Dedicated custom domain (e.g. dr-hazem-clinic.com)
  return { type: 'customDomain', slug: null, customDomain: cleanHostname };
}

export default {
  async fetch(request, env = {}, ctx = null) {
    const url = new URL(request.url);

    // Bypass API routes and static assets directly to origin
    const isStaticOrApi = 
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/_vercel/') ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|js|css|woff2?|map)$/i.test(url.pathname);

    if (isStaticOrApi) {
      return fetch(request);
    }

    const routing = extractCloudflareRouting(url);
    const targetUrl = new URL(request.url);

    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('x-edge-routed', 'cloudflare-worker');

    if (routing.type === 'subdomain' && routing.slug) {
      forwardHeaders.set('x-clinic-slug', routing.slug);
      forwardHeaders.set('x-is-subdomain', '1');
      forwardHeaders.set('x-is-dedicated-domain', '1');

      if (url.pathname === '/' || url.pathname === '') {
        targetUrl.pathname = '/index.html';
        targetUrl.searchParams.set('clinic', routing.slug);
      }
    } else if (routing.type === 'customDomain' && routing.customDomain) {
      forwardHeaders.set('x-clinic-custom-domain', routing.customDomain);
      forwardHeaders.set('x-is-dedicated-domain', '1');

      if (url.pathname === '/' || url.pathname === '') {
        targetUrl.pathname = '/index.html';
        targetUrl.searchParams.set('dedicatedDomain', routing.customDomain);
      }
    }

    // Build downstream request to origin
    const originRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual'
    });

    const response = await fetch(originRequest);

    // Ensure edge response headers are attached back to the client
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-edge-routed', 'cloudflare-worker');

    if (routing.type === 'subdomain' && routing.slug) {
      responseHeaders.set('x-clinic-slug', routing.slug);
      responseHeaders.set('x-is-subdomain', '1');
      responseHeaders.set('x-is-dedicated-domain', '1');
    } else if (routing.type === 'customDomain' && routing.customDomain) {
      responseHeaders.set('x-clinic-custom-domain', routing.customDomain);
      responseHeaders.set('x-is-dedicated-domain', '1');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }
};
