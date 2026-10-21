/**
 * Cloudflare Pages Edge Middleware for Smart Clinic
 * Intercepts incoming requests at Cloudflare Edge network to handle:
 * 1. Clinic Subdomain Routing (e.g. dr-ahmed.smartclinic.app or dr-ahmed.yourdomain.com)
 * 2. Dedicated Domain Mode (Rewrites root "/" to clinic booking portal)
 * 3. Injects x-clinic-slug, x-is-subdomain, and x-is-dedicated-domain headers
 */

const RESERVED_SUBDOMAINS = new Set([
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

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1. Bypass static assets and system routes
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|js|css|woff2?|map)$/i.test(url.pathname);

  if (isStaticAsset) {
    return next();
  }

  // 2. Extract Hostname
  const hostHeader = 
    request.headers.get('x-clinic-test-host') ||
    request.headers.get('x-forwarded-host') || 
    request.headers.get('host') || 
    url.host;

  const cleanHostname = (hostHeader || '').toLowerCase().trim().replace(/^www\./i, '');
  const parts = cleanHostname.split('.');

  let clinicSlug = null;
  let isDedicated = false;

  // Identify subdomain (dr-ahmed.domain.com)
  const isHostingPlatform = cleanHostname.endsWith('.pages.dev') || cleanHostname.endsWith('.vercel.app');

  if (isHostingPlatform) {
    // 4-part host on hosting platforms: e.g. dr-ahmed.smart-clinic-6xg.pages.dev
    if (parts.length >= 4 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      clinicSlug = parts[0];
      isDedicated = true;
    }
  } else if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
    // Standard 3-part subdomain on custom domain: e.g. dr-ahmed.smartclinic.app
    clinicSlug = parts[0];
    isDedicated = true;
  }

  // 3. Rewrite root "/" on dedicated subdomain to clinic booking portal
  if (isDedicated && clinicSlug && (url.pathname === '/' || url.pathname === '')) {
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = '/index.html';
    rewriteUrl.searchParams.set('clinic', clinicSlug);
    rewriteUrl.searchParams.set('isDedicated', '1');

    const modifiedRequest = new Request(rewriteUrl.toString(), {
      method: request.method,
      headers: request.headers
    });

    const response = context.env?.ASSETS ? await context.env.ASSETS.fetch(modifiedRequest) : await next(modifiedRequest);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('x-clinic-slug', clinicSlug);
    newHeaders.set('x-is-subdomain', '1');
    newHeaders.set('x-is-dedicated-domain', '1');
    newHeaders.set('x-edge-routed', 'cloudflare-pages-middleware');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  // 4. Default execution for other routes
  const response = await next();

  if (clinicSlug) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('x-clinic-slug', clinicSlug);
    newHeaders.set('x-is-subdomain', '1');
    newHeaders.set('x-is-dedicated-domain', '1');
    newHeaders.set('x-edge-routed', 'cloudflare-pages-middleware');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  return response;
}
