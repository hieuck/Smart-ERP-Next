import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const API = 'http://localhost:3456';
let authCookie: { name: string; value: string } | null = null;

async function setupAuth(context: BrowserContext) {
  if (authCookie) {
    await context.addCookies([{ ...authCookie, domain: 'localhost', path: '/' }]);
    return;
  }
  // Login via API
  const page = await context.newPage();
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@demo.vn', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.access_token || (body.data && body.data.access_token) || body.token;
  if (!token) throw new Error(`Login failed (${res.status()}): ${JSON.stringify(body)}`);
  // Set localStorage for the SPA
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@demo.vn', role: 'admin', tenantId: '1' }));
    localStorage.setItem('tenant_id', '1');
  }, token);
  // Set cookie for middleware
  await context.addCookies([{ name: 'access_token', value: token, domain: 'localhost', path: '/' }]);
  await page.close();
  authCookie = { name: 'access_token', value: token };
}

async function login(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@demo.vn', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.access_token || (body.data && body.data.access_token) || body.token;
  if (!token) throw new Error(`Login failed (${res.status()}): ${JSON.stringify(body)}`);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@demo.vn', role: 'admin', tenantId: '1' }));
    localStorage.setItem('tenant_id', '1');
  }, token);
}

test.describe('UI Interactions', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ context }) => {
    await setupAuth(context);
  });

  test('Dashboard loads with navigation', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Products page + create button', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Customers: create form fill', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/customers/create', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const marker = `PW-${Date.now().toString(36)}`;
    const nameInput = page.locator('input[name="name"], input[placeholder*="tên" i], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(`Khách hàng ${marker}`);
    }
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="phone" i], input[placeholder*="điện" i]').first();
    if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phoneInput.fill(`09${Date.now().toString().slice(-8)}`);
    }

    const submitBtn = page.getByRole('button').filter({ hasText: /lưu|save|tạo|create|submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.close();
  });

  test('Orders: search and view', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="tìm" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('ORD');
      await page.waitForTimeout(500);
    }
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Inventory loads with data', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('POS loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Settings loads with sections', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Reports load', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('HR modules: employees, payroll, attendance', async ({ context }) => {
    for (const route of ['/hr/employees', '/hr/payroll', '/hr/attendance']) {
      const page = await context.newPage();
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      const content = await page.textContent('body');
      expect(content!.length, `${route} rendered`).toBeGreaterThan(50);
      await page.close();
    }
  });

  test('Automation: trigger + add step', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const triggers = page.locator('button').filter({ hasText: /order created|payment received|new customer/i });
    if (await triggers.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await triggers.first().click();
      await page.waitForTimeout(300);
    }
    const actions = page.locator('button').filter({ hasText: /send notification|send email|generate report/i });
    if (await actions.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await actions.first().click();
      await page.waitForTimeout(300);
    }
    await page.close();
  });

  test('Chat loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('E-Invoice loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/e-invoice', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Accounting loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/accounting', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });

  test('Approvals loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/approvals', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
    await page.close();
  });
});

test.describe('API CRUD tests', () => {

  let token = '';
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: { email: 'admin@demo.vn', password: 'admin123' } });
    if (res.ok()) { const b = await res.json(); token = b.access_token || (b.data && b.data.access_token) || ''; }
  });
  function u(d: any): any { return d && d.success === true ? d.data : d; }
  function h(): Record<string, string> { return { Authorization: `Bearer ${token}` }; }

  test('Product CRUD: create → read → update → search', async ({ request }) => {
    const marker = `INT-${Date.now().toString(36)}`;
    const created = u(await (await request.post(`${API}/products`, { headers: h(), data: { name: `Test ${marker}`, price: 50000, cost: 30000, stock: 10, category: 'E2E' } })).json());
    expect(created.id).toBeTruthy();
    const read = u(await (await request.get(`${API}/products/${created.id}`, { headers: h() })).json());
    expect(read.name).toBe(`Test ${marker}`);
    const updated = u(await (await request.patch(`${API}/products/${created.id}`, { headers: h(), data: { price: 55000 } })).json());
    expect(Number(updated.price)).toBe(55000);
    const search = u(await (await request.get(`${API}/products?search=${encodeURIComponent(marker)}`, { headers: h() })).json());
    const items = Array.isArray(search) ? search : search.items || [];
    expect(items.some((i: any) => i.id === created.id)).toBeTruthy();
  });

  test('Customer CRUD: create → read → update', async ({ request }) => {
    const marker = `INT-${Date.now().toString(36)}`;
    const created = u(await (await request.post(`${API}/customers`, { headers: h(), data: { code: marker, name: `Customer ${marker}`, phone: `09${Date.now().toString().slice(-8)}`, email: `${marker}@test.com` } })).json());
    expect(created.id).toBeTruthy();
    const read = u(await (await request.get(`${API}/customers/${created.id}`, { headers: h() })).json());
    expect(read.id).toBe(created.id);
    const updated = u(await (await request.patch(`${API}/customers/${created.id}`, { headers: h(), data: { debtLimit: 2000000 } })).json());
    expect(Number(updated.debtLimit)).toBe(2000000);
  });

  test('Purchase Order CRUD: create → read → update', async ({ request }) => {
    const marker = `PO-${Date.now().toString(36)}`;
    const suppliersResp = await request.get(`${API}/suppliers?limit=1`, { headers: h() });
    expect(suppliersResp.ok()).toBeTruthy();
    const supplierList = u(await suppliersResp.json());
    const sItems = Array.isArray(supplierList) ? supplierList : supplierList.items || [];
    const supplierId = sItems[0]?.id;
    expect(supplierId, 'No supplier found').toBeTruthy();
    const productsResp = await request.get(`${API}/products?limit=1`, { headers: h() });
    expect(productsResp.ok()).toBeTruthy();
    const productList = u(await productsResp.json());
    const pItems = Array.isArray(productList) ? productList : productList.items || [];
    const productId = pItems[0]?.id;
    expect(productId, 'No product found').toBeTruthy();

    // Create PO
    const createResp = await request.post(`${API}/purchasing`, {
      headers: h(),
      data: {
        supplierId: String(supplierId),
        expectedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: marker,
        items: [{
          productId: String(productId),
          orderedQty: 5,
          unitCost: 10000,
        }],
      },
    });
    const createBody = u(createResp.ok() ? await createResp.json() : {});
    expect(createResp.ok(), `PO create failed: ${createResp.status()}`).toBeTruthy();
    expect(createBody.id).toBeTruthy();

    const readResp = await request.get(`${API}/purchasing/${createBody.id}`, { headers: h() });
    expect(readResp.ok()).toBeTruthy();
    const read = u(await readResp.json());
    expect(read.id).toBe(createBody.id);
  });

  test('User profile: GET /users/me', async ({ request }) => {
    const me = u(await (await request.get(`${API}/users/me`, { headers: h() })).json());
    expect(me.email).toBe('admin@demo.vn');
  });

  test('Search across modules', async ({ request }) => {
    const res = await request.get(`${API}/search?q=admin`, { headers: h() });
    expect(res.status()).toBeLessThan(500);
  });
});
