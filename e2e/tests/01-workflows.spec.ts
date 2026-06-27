import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const API = 'http://localhost:3456';

test.describe('E2E workflows', () => {
  test.describe.configure({ mode: 'serial' });

  let token: string;

  test.beforeAll(async ({ request }) => {
    const r = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@demo.vn', password: 'admin123' },
    });
    const body = await r.json();
    token = body.access_token || body.data?.access_token;
  });

  test.beforeEach(async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@demo.vn', role: 'admin', tenantId: '1' }));
      localStorage.setItem('tenant_id', '1');
    }, token);
    await context.addCookies([{ name: 'access_token', value: token, domain: 'localhost', path: '/' }]);
    await page.close();
  });

  test('pos page loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('customer create form renders', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/customers/create', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThan(0);
    await page.close();
  });

  test('products page has content', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(100);
    await page.close();
  });

  test('inventory page shows data', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(100);
    await page.close();
  });

  test('orders page loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(100);
    await page.close();
  });

  test('e-invoice page has heading', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/e-invoice', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    await page.close();
  });

  test('crm page loads leads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/crm', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('suppliers page loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/suppliers', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('purchasing page loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/purchasing', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    expect((await page.textContent('body'))!.length).toBeGreaterThan(50);
    await page.close();
  });
});
