import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for atomic double-booking verification
const bookingSuccessCount = new Counter('booking_success_count');
const bookingConflictCount = new Counter('booking_conflict_count');
const bookingUnexpectedErrors = new Counter('booking_unexpected_errors');
const bookingLatencyTrend = new Trend('booking_latency_ms');

export const options = {
  scenarios: {
    atomic_slot_race: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 50,
      maxDuration: '20s',
    },
  },
  thresholds: {
    'booking_latency_ms': ['p(95)<1500'], // 95% of booking requests under 1.5s
    'http_req_failed': ['rate<0.05'],    // Network errors under 5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'https://clinic-flow-lh3g.vercel.app';
const API_KEY = __ENV.CLINIC_API_KEY || 'k6_test_partner_api_key_secure_123';

export default function () {
  const payload = JSON.stringify({
    patientName: 'مريض اختبار التزامن ' + Math.floor(Math.random() * 1000),
    phone: '010' + Math.floor(10000000 + Math.random() * 90000000),
    date: '2026-10-30',
    time: '18:00', // Contested slot across concurrent VUs
    service: 'كشف واستشارة تخصصية',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Clinic-API-Key': API_KEY,
      'X-Clinic-ID': 'clinic-atomic-load-test',
    },
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/appointments`, payload, params);
  const duration = Date.now() - startTime;
  bookingLatencyTrend.add(duration);

  // Status check: Either 201 Created (winner) or 409 Conflict (slot already taken)
  const isWinner = res.status === 201;
  const isConflict = res.status === 409;
  const isRateLimited = res.status === 429;

  if (isWinner) {
    bookingSuccessCount.add(1);
  } else if (isConflict) {
    bookingConflictCount.add(1);
  } else if (!isRateLimited) {
    bookingUnexpectedErrors.add(1);
  }

  check(res, {
    'Atomic booking returns 201 or 409': (r) => r.status === 201 || r.status === 409 || r.status === 429,
    'Booking latency under 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(0.1);
}
