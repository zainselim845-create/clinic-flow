/**
 * ClinicFlow - High-Concurrency Autocannon HTTP Load Testing Benchmark
 * Uses autocannon (GitHub: mcollina/autocannon)
 * Measures: req/sec, throughput, p50/p90/p99 latency, 2xx vs 429 vs 5xx errors
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TARGET_URL || 'https://clinic-flow-ten-sigma.vercel.app';

async function runBenchmark(title, options) {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING: ${title}`);
  console.log(`🎯 Target: ${options.url}`);
  console.log(`⚡ Concurrency: ${options.connections || 10} connections`);
  console.log(`⏱️ Duration: ${options.duration || 10}s`);
  console.log(`======================================================\n`);

  return new Promise((resolve, reject) => {
    const instance = autocannon(options, (err, result) => {
      if (err) {
        console.error('Benchmark failed:', err);
        return reject(err);
      }
      printResults(title, result);
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function printResults(title, res) {
  console.log(`\n----------------- RESULTS FOR: ${title} -----------------`);
  console.log(`Total Requests:      ${res.requests.total} reqs in ${res.duration}s`);
  console.log(`Req/Sec (Avg):       ${res.requests.average.toFixed(2)} req/sec`);
  console.log(`Req/Sec (Max):       ${res.requests.max} req/sec`);
  console.log(`Throughput (Avg):    ${(res.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`);
  console.log(`Latency (p50):       ${res.latency.p50} ms`);
  console.log(`Latency (p90):       ${res.latency.p90} ms`);
  console.log(`Latency (p97.5):     ${res.latency.p97_5} ms`);
  console.log(`Latency (p99):       ${res.latency.p99} ms`);
  console.log(`Latency (Avg):       ${res.latency.average} ms`);
  console.log(`2xx Responses:       ${res['2xx']}`);
  console.log(`4xx Responses:       ${res['4xx']} (includes expected 429 rate limits)`);
  console.log(`5xx Errors:          ${res['5xx']} (server errors)`);
  console.log(`Non-2xx / Errors:    ${res.non2xx}`);
  console.log(`Timeouts:            ${res.timeouts}`);
  console.log(`Connection Errors:   ${res.errors}`);
  console.log(`---------------------------------------------------------\n`);
}

async function runAllBenchmarks() {
  const results = [];
  const reportPath = path.join(__dirname, '..', '..', 'LOAD_TEST_REPORT.json');

  try {
    // 1. Root Homepage & Static Edge Performance (Burst Load)
    const resHome = await runBenchmark('1. Edge Ingress & Homepage Static Burst', {
      url: `${BASE_URL}/`,
      connections: 20,
      duration: 10,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Autocannon-ClinicFlow-LoadTester/1.0'
      }
    });
    results.push({ scenario: 'Homepage Burst', result: resHome });

    // 2. Cloud Tenant Sync API Endpoint
    const resApi = await runBenchmark('2. Cloud Tenant Sync Serverless API (/api/sync-tenants)', {
      url: `${BASE_URL}/api/sync-tenants`,
      connections: 15,
      duration: 10,
      headers: {
        'Accept': 'application/json'
      }
    });
    results.push({ scenario: 'Sync Tenants API', result: resApi });

    // 3. Subdomain Edge Routing Resolution (Simulating Multi-Tenant Traffic)
    const resSubdomain = await runBenchmark('3. Subdomain Multi-Tenant Edge Routing (dr-ahmed.clinic-flow...)', {
      url: `${BASE_URL}/`,
      connections: 15,
      duration: 10,
      headers: {
        'Host': 'dr-ahmed.clinic-flow-ten-sigma.vercel.app',
        'Accept': 'text/html'
      }
    });
    results.push({ scenario: 'Subdomain Edge Resolution', result: resSubdomain });

    // 4. Rate Limiting Sliding Window Boundary Test (/login)
    const resRateLimit = await runBenchmark('4. Auth Endpoint Sliding Window Rate Limiter (/login)', {
      url: `${BASE_URL}/login`,
      connections: 10,
      duration: 8,
      headers: {
        'Accept': 'text/html'
      }
    });
    results.push({ scenario: 'Rate Limiter Boundary', result: resRateLimit });

    // Save structured report
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`✅ Full benchmark data saved to: ${reportPath}`);

  } catch (err) {
    console.error('Benchmark suite error:', err);
    process.exit(1);
  }
}

runAllBenchmarks();
