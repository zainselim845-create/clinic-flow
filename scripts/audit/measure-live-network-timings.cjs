const https = require('https');
const { performance } = require('perf_hooks');

const TARGET_HOST = 'clinic-flow-lh3g.vercel.app';

const ENDPOINTS = [
  { name: 'Root Homepage Edge CDN', path: '/' },
  { name: 'API Health Probe', path: '/api/health' },
  { name: 'Serverless Tenant Sync API', path: '/api/sync-tenants' },
  { name: 'Authentication / Login Page', path: '/login' }
];

function profileEndpoint(endpoint) {
  return new Promise((resolve) => {
    const timings = {};
    const t0 = performance.now();

    const req = https.request({
      hostname: TARGET_HOST,
      port: 443,
      path: endpoint.path,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
        'User-Agent': 'ClinicFlow-Production-Profiler/2.0'
      }
    }, (res) => {
      timings.ttfb = Math.round(performance.now() - t0);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        timings.total = Math.round(performance.now() - t0);
        timings.statusCode = res.statusCode;
        timings.contentLength = Buffer.byteLength(data);
        timings.headers = {
          'server': res.headers['server'] || 'vercel',
          'cache-control': res.headers['cache-control'] || 'none',
          'x-vercel-cache': res.headers['x-vercel-cache'] || 'N/A',
          'content-encoding': res.headers['content-encoding'] || 'identity',
          'strict-transport-security': Boolean(res.headers['strict-transport-security']),
          'content-security-policy': Boolean(res.headers['content-security-policy'])
        };
        resolve({ endpoint: endpoint.name, path: endpoint.path, timings });
      });
    });

    req.on('socket', (socket) => {
      socket.on('lookup', () => {
        timings.dns = Math.round(performance.now() - t0);
      });
      socket.on('connect', () => {
        timings.tcp = Math.round(performance.now() - t0);
      });
      socket.on('secureConnect', () => {
        timings.tls = Math.round(performance.now() - t0);
      });
    });

    req.on('error', (err) => {
      resolve({ endpoint: endpoint.name, path: endpoint.path, error: err.message });
    });

    req.end();
  });
}

async function runProfiling() {
  console.log(`========================================================================`);
  console.log(`🌐 LIVE PRODUCTION NETWORK & LATENCY PROFILING (Empirical Data)`);
  console.log(`🎯 Target Host: https://${TARGET_HOST}`);
  console.log(`========================================================================\n`);

  for (const ep of ENDPOINTS) {
    const res = await profileEndpoint(ep);
    if (res.error) {
      console.log(`❌ [${res.endpoint}] Error: ${res.error}\n`);
    } else {
      const t = res.timings;
      console.log(`--- ${res.endpoint} (${res.path}) ---`);
      console.log(`HTTP Status:         ${t.statusCode}`);
      console.log(`Payload Size:        ${(t.contentLength / 1024).toFixed(2)} KB`);
      console.log(`DNS Lookup:          ${t.dns ?? 'cached'} ms`);
      console.log(`TCP Connect:         ${t.tcp ?? 'connected'} ms`);
      console.log(`TLS Handshake:       ${t.tls ?? 'secured'} ms`);
      console.log(`TTFB (First Byte):   ${t.ttfb} ms`);
      console.log(`Total Download:      ${t.total} ms`);
      console.log(`Edge Cache State:    ${t.headers['x-vercel-cache']}`);
      console.log(`Compression:         ${t.headers['content-encoding']}`);
      console.log(`Security Headers:    HSTS=${t.headers['strict-transport-security']}, CSP=${t.headers['content-security-policy']}`);
      console.log(`------------------------------------------------------------------------\n`);
    }
  }
}

runProfiling();
