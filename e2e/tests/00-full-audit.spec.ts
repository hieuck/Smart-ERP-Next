import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:3456';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/mvp', '/privacy', '/terms'];

const PRIVATE_ROUTES = [
  '/accounting',
  '/admin/activity-logs', '/admin/benchmarks', '/admin/performance',
  '/analytics/churn', '/analytics/clv', '/analytics/forecast', '/analytics-dashboard',
  '/approvals', '/automation',
  '/crm',
  '/customers', '/customers/create',
  '/dashboard', '/e-invoice', '/fixed-assets', '/forecast/dashboard', '/helpdesk/tickets',
  '/hr/attendance', '/hr/employees', '/hr/payroll', '/inventory',
  '/loyalty/cards', '/loyalty/rewards',
  '/manufacturing/bom', '/manufacturing/mrp', '/manufacturing/production-orders',
  '/omnichannel', '/orders',
  '/payments', '/pos',
  '/products', '/products/create', '/products/export', '/products/import',
  '/profile', '/projects',
  '/purchasing', '/purchasing/create', '/quality',
  '/reports', '/reports/advanced', '/reports/cashflow-forecast', '/reports/forecast',
  '/settings', '/settings/ecommerce', '/settings/xero',
  '/suppliers', '/suppliers/create',
  '/users', '/warehouses',
];

// Dynamic routes with mock IDs
const DYNAMIC_ROUTES = [
  '/customers/1', '/customers/1/edit',
  '/orders/1', '/orders/1/invoice',
  '/products/1', '/products/1/edit',
  '/purchasing/1',
  '/suppliers/1', '/suppliers/1/edit',
];

interface PageResult { route: string; errors: string[] }

async function loginAndSetup(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@demo.vn', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.access_token || body.data?.access_token;
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate((t) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@demo.vn', role: 'admin', tenantId: '1' }));
    localStorage.setItem('tenant_id', '1');
  }, token);
}

async function crawl(page: Page, route: string): Promise<PageResult> {
  const errors: string[] = [];
  const errs: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`CRASH: ${e.message}`));

  try {
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (resp && resp.status() >= 400) errs.push(`HTTP ${resp.status()}`);
    const text = await page.textContent('body').catch(() => '');
    if (!text || text.trim().length < 10) errs.push('Empty/minimal body');
    if (text && (text.includes('Application Error') || text.includes('Something went wrong'))) errs.push('React Error Boundary');
    if (errs.length > 0) errors.push(...errs);
  } catch (e: any) {
    errors.push(`NAV_FAIL: ${e.message?.slice(0, 200)}`);
  }
  return { route, errors };
}

test.describe('Full Audit: ALL 67 pages', () => {
  const failed: PageResult[] = [];

  test('6 PUBLIC pages', async ({ page }) => {
    for (const r of PUBLIC_ROUTES) {
      const result = await crawl(page, r);
      if (result.errors.length) { failed.push(result); console.log(`  ⚠ ${r}: ${result.errors.join('; ')}`); }
    }
    expect(failed.length).toBe(0);
  });

  test('61 PRIVATE pages + dynamic routes', async ({ context }) => {
    // Login once, reuse across pages
    const loginPage = await context.newPage();
    await loginAndSetup(loginPage);
    await loginPage.close();

    const allRoutes = [...PRIVATE_ROUTES, ...DYNAMIC_ROUTES];

    for (const route of allRoutes) {
      const page = await context.newPage();
      const result = await crawl(page, route);
      await page.close();
      if (result.errors.length) {
        failed.push(result);
        console.log(`  ⚠ ${route}: ${result.errors.join('; ')}`);
      }
    }

    expect(failed.length).toBe(0);
  });

  test.afterAll(() => {
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  AUDIT: ${failed.length}/67 pages FAILED`);
    console.log(`═══════════════════════════════════════════`);
    if (failed.length) for (const f of failed) console.log(`  ❌ ${f.route}: ${f.errors.join('; ')}`);
    else console.log('  ✅ ALL 67 PAGES PASSED');
    console.log(`═══════════════════════════════════════════\n`);
  });
});

