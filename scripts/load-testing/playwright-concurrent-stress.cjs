/**
 * Playwright Concurrent Virtual Users (VU) Stress & Load Tester
 * Uses Playwright (GitHub: microsoft/playwright)
 * Simulates multiple concurrent real browser instances navigating the application simultaneously
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.TARGET_URL || 'https://clinic-flow-lh3g.vercel.app';
const CONCURRENT_USERS = 5; // 5 headless browser instances simultaneously

async function simulateVirtualUser(userId) {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
      return chromium.launch({ channel: 'msedge', headless: true });
    });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: `Playwright-Stress-VU-${userId}`
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const metrics = { userId, steps: [] };

  try {
    // 1. Navigate to Home
    const t0 = Date.now();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const homeDuration = Date.now() - t0;
    metrics.steps.push({ step: 'Home Page', durationMs: homeDuration, status: 'PASS' });

    // 2. Navigate to Login Page
    const t1 = Date.now();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const loginDuration = Date.now() - t1;
    metrics.steps.push({ step: 'Login Page', durationMs: loginDuration, status: 'PASS' });

    // 3. Check Subdomain / Clinic Route
    const t2 = Date.now();
    await page.goto(`${BASE_URL}/c/enterprise-clinic1/appointments`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const clinicDuration = Date.now() - t2;
    metrics.steps.push({ step: 'Tenant Scoped Route', durationMs: clinicDuration, status: 'PASS' });

    metrics.consoleErrors = consoleErrors;
    metrics.success = true;
  } catch (err) {
    metrics.success = false;
    metrics.error = err.message;
  } finally {
    await browser.close();
  }

  return metrics;
}

async function runConcurrentBrowserStress() {
  console.log(`\n======================================================`);
  console.log(`🎭 Playwright Concurrent Virtual Users Browser Stress Test`);
  console.log(`👥 Concurrent Headless Browsers: ${CONCURRENT_USERS}`);
  console.log(`🎯 Target URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const startTime = Date.now();
  const userPromises = [];

  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    userPromises.push(simulateVirtualUser(i));
  }

  const results = await Promise.all(userPromises);
  const totalElapsed = Date.now() - startTime;

  console.log(`\n----------------- BROWSER STRESS RESULTS -----------------`);
  let allPassed = true;

  results.forEach(res => {
    console.log(`VU #${res.userId}: ${res.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (res.steps) {
      res.steps.forEach(s => console.log(`   - ${s.step}: ${s.durationMs}ms [${s.status}]`));
    }
    if (res.consoleErrors && res.consoleErrors.length > 0) {
      console.log(`   ⚠️ Console Errors:`, res.consoleErrors);
    }
    if (!res.success) {
      allPassed = false;
      console.log(`   Error:`, res.error);
    }
  });

  const avgHome = results.reduce((acc, r) => acc + (r.steps?.[0]?.durationMs || 0), 0) / results.length;
  console.log(`\nAverage Home Load under Concurrency: ${avgHome.toFixed(0)}ms`);
  console.log(`Total Batch Execution Time: ${totalElapsed}ms`);
  console.log(`Overall Concurrency Result: ${allPassed ? '✅ 100% PASS' : '❌ SOME FAILED'}`);
  console.log(`----------------------------------------------------------\n`);
}

runConcurrentBrowserStress();
