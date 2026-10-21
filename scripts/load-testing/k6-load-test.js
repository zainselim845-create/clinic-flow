import http from 'k6/http';
import { check, sleep } from 'k6';

// Grafana k6 Load Test Configuration (GitHub: grafana/k6)
export const options = {
  stages: [
    { duration: '5s', target: 10 },  // Ramp-up to 10 virtual users
    { duration: '15s', target: 25 }, // Steady state at 25 virtual users (Burst)
    { duration: '5s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],  // http errors should be less than 5%
    http_req_duration: ['p(95)<1500'], // 95% of requests should be below 1.5s
  },
};

const BASE_URL = __ENV.TARGET_URL || 'https://clinic-flow-lh3g.vercel.app';

export default function () {
  // Scenario 1: Load Root App
  const resHome = http.get(`${BASE_URL}/`);
  check(resHome, {
    'Home status is 200': (r) => r.status === 200,
    'Home loads within 1s': (r) => r.timings.duration < 1000,
  });

  // Scenario 2: Load Tenant Sync API
  const resApi = http.get(`${BASE_URL}/api/sync-tenants`, {
    headers: { 'Accept': 'application/json' },
  });
  check(resApi, {
    'API status is 200 or cached': (r) => r.status === 200,
  });

  // Scenario 3: Tenant Query Resolution & Auth Gate
  const resTenantAuth = http.get(`${BASE_URL}/login?clinic=dr-ahmed`);
  check(resTenantAuth, {
    'Tenant Auth gate status is 200': (r) => r.status === 200,
    'Tenant Auth loads within 1s': (r) => r.timings.duration < 1000,
  });

  // Scenario 4: Health & System Diagnostics Probe
  const resHealth = http.get(`${BASE_URL}/api/health`);
  check(resHealth, {
    'Health probe status is 200': (r) => r.status === 200,
  });

  sleep(0.2);
}
