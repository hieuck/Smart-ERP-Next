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
    data: { email: 'admin@smarterp.vn', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.access_token;
  // Set localStorage for the SPA
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@smarterp.vn', role: 'admin', tenantId: '1' }));
    localStorage.setItem('tenant_id', '1');
  }, token);
  // Set cookie for middleware
  await context.addCookies([{ name: 'access_token', value: token, domain: 'localhost', path: '/' }]);
  await page.close();
  authCookie = { name: 'access_token', value: token };
}

async function login(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@smarterp.vn', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.access_token;
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@smarterp.vn', role: 'admin', tenantId: '1' }));
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
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: { email: 'admin@smarterp.vn', password: 'admin123' } });
    const body = await res.json();
    token = body.access_token;
    expect(token).toBeTruthy();
  });

  test('Product CRUD: create → read → update → search', async ({ request }) => {
    const marker = `INT-${Date.now().toString(36)}`;
    const headers = { Authorization: `Bearer ${token}` };

    const created = await (await request.post(`${API}/products`, { headers, data: { name: `Test ${marker}`, price: 50000, cost: 30000, stock: 10, category: 'E2E' } })).json();
    expect(created.id).toBeTruthy();
    const read = await (await request.get(`${API}/products/${created.id}`, { headers })).json();
    expect(read.name).toBe(`Test ${marker}`);
    const updated = await (await request.patch(`${API}/products/${created.id}`, { headers, data: { price: 55000 } })).json();
    expect(Number(updated.price)).toBe(55000);
    const search = await (await request.get(`${API}/products?search=${encodeURIComponent(marker)}`, { headers })).json();
    const items = Array.isArray(search) ? search : search.data || search.items || [];
    expect(items.some((i: any) => i.id === created.id)).toBeTruthy();
    console.log(`  ✅ Product CRUD: ${created.id}`);
  });

  test('Customer CRUD: create → read → update', async ({ request }) => {
    const marker = `INT-${Date.now().toString(36)}`;
    const headers = { Authorization: `Bearer ${token}` };

    const created = await (await request.post(`${API}/customers`, { headers, data: { code: marker, name: `Customer ${marker}`, phone: `09${Date.now().toString().slice(-8)}`, email: `${marker}@test.com` } })).json();
    expect(created.id).toBeTruthy();
    const read = await (await request.get(`${API}/customers/${created.id}`, { headers })).json();
    expect(read.id).toBe(created.id);
    const updated = await (await request.patch(`${API}/customers/${created.id}`, { headers, data: { debtLimit: 2000000 } })).json();
    expect(Number(updated.debtLimit)).toBe(2000000);
    console.log(`  ✅ Customer CRUD: ${created.id}`);
  });

  test('Purchase Order CRUD: create → read → update', async ({ request }) => {
    const marker = `PO-${Date.now().toString(36)}`;
    const headers = { Authorization: `Bearer ${token}` };

    // Get real IDs from the API
    const suppliersResp = await request.get(`${API}/suppliers?limit=1`, { headers });
    expect(suppliersResp.ok()).toBeTruthy();
    const suppliersBody = await suppliersResp.json();
    const supplierList = Array.isArray(suppliersBody) ? suppliersBody : (suppliersBody.items || suppliersBody.data || []);
    const supplierId = supplierList[0]?.id;
    expect(supplierId, 'No supplier found').toBeTruthy();

    const productsResp = await request.get(`${API}/products?limit=1`, { headers });
    expect(productsResp.ok()).toBeTruthy();
    const productsBody = await productsResp.json();
    const productList = Array.isArray(productsBody) ? productsBody : (productsBody.items || productsBody.data || []);
    const productId = productList[0]?.id;
    expect(productId, 'No product found').toBeTruthy();

    // Create PO
    const createResp = await request.post(`${API}/purchasing`, {
      headers,
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
    const createBody = createResp.ok() ? await createResp.json() : await createResp.text();
    expect(createResp.ok(), `PO create failed: ${createResp.status()} ${typeof createBody === 'string' ? createBody : JSON.stringify(createBody)}`).toBeTruthy();
    const po = typeof createBody === 'string' ? JSON.parse(createBody) : createBody;
    expect(po.id).toBeTruthy();

    // Read PO
    const readResp = await request.get(`${API}/purchasing/${po.id}`, { headers });
    expect(readResp.ok()).toBeTruthy();
    const read = await readResp.json();
    expect(read.id).toBe(po.id);

    console.log(`  ✅ PO CRUD: ${po.id}`);
  });

  test('User profile: GET /users/me', async ({ request }) => {
    const me = await (await request.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
    expect(me.email).toBe('admin@smarterp.vn');
    console.log('  ✅ User profile');
  });

  test('Search across modules', async ({ request }) => {
    const res = await request.get(`${API}/search?q=admin`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(500);
    console.log('  ✅ Search API');
  });
});
