// Smart ERP Next — Simple Load Test
// Run: node scripts/load-test.mjs
// Tests critical API endpoints under concurrent load

const BASE = process.env.API_URL || 'http://localhost:3456';
const CONCURRENCY = 10; // simulated users
const REQUESTS_PER_USER = 20;

const endpoints = [
  { method: 'GET', path: '/health', name: 'health' },
  { method: 'GET', path: '/status', name: 'status' },
  { method: 'GET', path: '/products', name: 'products', auth: true },
  { method: 'GET', path: '/orders', name: 'orders', auth: true },
];

async function simulateUser(userId, results) {
  let token = '';
  const loginRes = await fetchWithTiming('POST', '/auth/login');
  if (loginRes.ok) token = 'dummy-jwt-token';

  for (const ep of endpoints) {
    for (let i = 0; i < REQUESTS_PER_USER; i++) {
      const headers = {};
      if (ep.auth && token) headers['Authorization'] = `Bearer ${token}`;
      const r = await fetchWithTiming(ep.method, ep.path, headers);
      results.push({ ...r, user: userId, endpoint: ep.name });
    }
  }
}

function fetchWithTiming(method, path, headers = {}) {
  const start = Date.now();
  return fetch(`${BASE}${path}`, { method, headers })
    .then((res) => ({ status: res.status, ms: Date.now() - start, ok: res.ok }))
    .catch(() => ({ status: 0, ms: Date.now() - start, ok: false }));
}

async function main() {
  console.log(`\n🚀 Load Test: ${CONCURRENCY} users × ${REQUESTS_PER_USER} requests\n`);
  const results = [];
  const users = Array.from({ length: CONCURRENCY }, (_, i) => simulateUser(i, results));
  const startAll = Date.now();
  await Promise.all(users);
  const totalMs = Date.now() - startAll;

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  const maxMs = Math.max(...results.map(r => r.ms));
  const minMs = Math.min(...results.map(r => r.ms));
  const rps = Math.round((results.length / totalMs) * 1000);

  console.log(`  ✅ ${ok} succeeded, ❌ ${fail} failed`);
  console.log(`  ⚡ ${rps} req/s (${totalMs}ms total)`);
  console.log(`  📊 avg: ${avgMs}ms, min: ${minMs}ms, max: ${maxMs}ms\n`);
  console.log(fail > 0 ? '❌ LOAD TEST FAILED' : '✅ LOAD TEST PASSED');

  // JSON output for baseline tracking
  const baseline = { timestamp: new Date().toISOString(), rps, avgMs, maxMs, minMs, ok, fail, totalMs };
  if (process.env.CI) {
    const fs = await import('fs');
    fs.writeFileSync('load-test-baseline.json', JSON.stringify(baseline, null, 2));
    console.log(`\nBaseline saved: load-test-baseline.json`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
