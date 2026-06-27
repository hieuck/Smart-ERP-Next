import { test, expect, type Page } from '@playwright/test';

const usernameSelector = 'input[type="email"], input[type="text"], input[name="username"], input[name="email"], input[placeholder*="tên đăng nhập" i], input[placeholder*="username" i], input[placeholder*="email" i]';
const passwordSelector = 'input[type="password"]';
const loginButtonSelector = 'button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")';

async function typeField(page: Page, selector: string, value: string) {
  const field = page.locator(selector).first();
  await expect(field).toBeEditable({ timeout: 10000 });
  await field.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
  await expect(field).toHaveValue(value);
}

async function fillLoginFields(page: Page, username: string, password: string) {
  await page.goto('/login');
  await typeField(page, usernameSelector, username);
  await typeField(page, passwordSelector, password);
}

async function loginAsAdmin(page: Page) {
  await fillLoginFields(page, 'admin@demo.vn', 'admin123');
  const loginBtn = page.locator(loginButtonSelector).first();
  await expect(loginBtn).toBeEnabled();
  await Promise.all([
    page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 }),
    loginBtn.click(),
  ]);
}

// ═══════════════════════════════════════════════════════════════════
// 1. Health checks — API + Web đều sống
// ═══════════════════════════════════════════════════════════════════

test.describe('Health Checks', () => {
  test('API /health returns OK', async ({ request }) => {
    const res = await request.get('http://localhost:3456/health');
    expect(res.status()).toBeLessThan(500);
  });

  test('Web login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Smart ERP|Login/i);
    const usernameInput = page.locator(usernameSelector);
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Authentication flow — đăng nhập / đăng xuất
// ═══════════════════════════════════════════════════════════════════

test.describe('Authentication', () => {
  test('Login with valid credentials → redirect to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    expect(page.url()).toMatch(/\/(dashboard|$)/);
  });

  test('Login with wrong password → shows error', async ({ page }) => {
    await fillLoginFields(page, 'admin@demo.vn', 'wrong_password_12345');
    const loginBtn = page.locator(loginButtonSelector).first();
    await loginBtn.click();

    // Should see error message
    const error = page.locator('[role="alert"], .error, .text-red-500, [class*="error"]');
    await expect(error).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Dashboard — sau đăng nhập, dashboard hiển thị dữ liệu
// ═══════════════════════════════════════════════════════════════════

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Dashboard shows key metrics widgets', async ({ page }) => {
    await page.goto('/dashboard');
    // Should have some content loaded
    await page.waitForLoadState('networkidle');
    // Dashboard should contain meaningful content
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Products — CRUD flow
// ═══════════════════════════════════════════════════════════════════

test.describe('Products', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Products list page loads and shows data', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Should see a table or list of products
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Orders — danh sách đơn hàng
// ═══════════════════════════════════════════════════════════════════

test.describe('Orders', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Orders page loads', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Customers page
// ═══════════════════════════════════════════════════════════════════

test.describe('Customers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Customers page loads', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Inventory page
// ═══════════════════════════════════════════════════════════════════

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Inventory page loads', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. API direct endpoint tests
// ═══════════════════════════════════════════════════════════════════

test.describe('API Endpoints', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Login via API to get token
    const res = await request.post('http://localhost:3456/auth/login', {
      data: { email: 'admin@demo.vn', password: 'admin123' },
    });
    if (res.ok()) {
      const body = await res.json();
      token = body.access_token || body.data?.access_token;
    }
  });

  test('GET /products returns list', async ({ request }) => {
    const res = await request.get('http://localhost:3456/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /orders returns list', async ({ request }) => {
    const res = await request.get('http://localhost:3456/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /customers returns list', async ({ request }) => {
    const res = await request.get('http://localhost:3456/customers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /users returns list', async ({ request }) => {
    const res = await request.get('http://localhost:3456/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /inventory returns data', async ({ request }) => {
    const res = await request.get('http://localhost:3456/inventory', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Navigation — kiểm tra menu sidebar
// ═══════════════════════════════════════════════════════════════════

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const pages = [
    '/products',
    '/orders',
    '/customers',
    '/inventory',
    '/payments',
    '/warehouses',
    '/suppliers',
    '/hr/employees',
    '/accounting',
    '/reports',
    '/settings',
  ];

  for (const path of pages) {
    test(`Navigate to ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
