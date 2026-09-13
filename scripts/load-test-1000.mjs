import http from 'http';

const URLS = [
  'http://localhost:4173/',
  'http://localhost:4173/booking',
  'http://localhost:4173/c/dr-ahmed/booking',
  'http://localhost:4173/c/dr-sara/booking',
  'http://localhost:4173/login',
  'http://localhost:4173/manage-booking'
];

const TOTAL_REQUESTS = 1000;
console.log(`Starting 1,000 Concurrent HTTP Requests Burst against ClinicFlow Preview Server...`);
console.log(`Target: ${URLS[0]} (and routes: /booking, /c/:slug/booking, /login, /manage-booking)`);

const initialMem = process.memoryUsage().heapUsed;
const startTime = performance.now();

let completed = 0;
let successes = 0;
let failures = 0;
const latencies = [];

async function makeRequest(index) {
  const targetUrl = URLS[index % URLS.length];
  const reqStart = performance.now();
  
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': `ClinicFlow-LoadTester/1.0 (Req #${index})`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const duration = performance.now() - reqStart;
    latencies.push(duration);
    
    if (res.ok) {
      successes++;
    } else {
      failures++;
    }
  } catch (err) {
    failures++;
  } finally {
    completed++;
  }
}

// Launch all 1,000 requests concurrently
const promises = Array.from({ length: TOTAL_REQUESTS }, (_, i) => makeRequest(i));
await Promise.all(promises);

const totalTimeMs = performance.now() - startTime;
const endMem = process.memoryUsage().heapUsed;
const memDeltaMB = ((endMem - initialMem) / 1024 / 1024).toFixed(2);

latencies.sort((a, b) => a - b);
const p50 = latencies[Math.floor(latencies.length * 0.50)].toFixed(2);
const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
const throughputRPS = ((TOTAL_REQUESTS / totalTimeMs) * 1000).toFixed(0);

console.log('\n======================================================');
console.log('       CLINICFLOW 1,000 CONCURRENT REQUESTS RESULTS   ');
console.log('======================================================');
console.log(` Total Requests Sent : ${TOTAL_REQUESTS}`);
console.log(` Successful (200 OK) : ${successes} (${((successes/TOTAL_REQUESTS)*100).toFixed(1)}%)`);
console.log(` Failed Requests     : ${failures}`);
console.log(` Total Time Taken    : ${(totalTimeMs / 1000).toFixed(3)} seconds`);
console.log(` Throughput          : ${throughputRPS} req/sec`);
console.log(` Average Latency     : ${avgLatency} ms`);
console.log(` P50 Latency (Median): ${p50} ms`);
console.log(` P95 Latency         : ${p95} ms`);
console.log(` P99 Latency         : ${p99} ms`);
console.log(` Memory Heap Delta   : ${memDeltaMB} MB`);
console.log('======================================================\n');