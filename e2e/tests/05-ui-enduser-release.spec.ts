import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:3456';
const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
const passwordSelector = 'input[type="password"]';

let token: string;

function auth() {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function jsonOk<T = any>(response: { ok(): boolean; status(): number; text(): Promise<string> }, label: string): Promise<T> {
  const text = await response.text();
  expect(response.ok(), `${label} failed: ${response.status()} ${text}`).toBeTruthy();
  return text ? JSON.parse(text) as T : ({} as T);
}

async function loginByUi(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    if (/\/dashboard/.test(page.url())) return;
    try {
      await expect(page.locator(emailSelector)).toBeVisible({ timeout: 10000 });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  await page.locator(emailSelector).fill('admin@smarterp.vn');
  await page.locator(passwordSelector).fill('admin123');
  await page.getByRole('button', { name: /dang nhap|đăng nhập|login/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

async function createSaleFixtures(request: APIRequestContext) {
  const marker = `UX-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const customerName = `Khach UI ${marker}`;
  const productName = `Cafe UI ${marker}`;
  const unitPrice = 39000;

  const customer = await jsonOk(await request.post(`${API}/customers`, {
    ...auth(),
    data: {
      code: `CUS-${marker}`,
      name: customerName,
      phone: `09${Date.now().toString().slice(-8)}`,
      email: `${marker.toLowerCase()}@example.test`,
      address: '12 Nguyen Hue, Quan 1, TP HCM',
      customerGroup: 'UI_RELEASE',
      debtLimit: 1000000,
    },
  }), 'POST /customers');

  const product = await jsonOk(await request.post(`${API}/products`, {
    ...auth(),
    data: {
      name: productName,
      price: unitPrice,
      cost: 21000,
      stock: 20,
      description: `Product for UI release audit ${marker}`,
      imageUrl: `https://example.com/assets/${marker.toLowerCase()}.jpg`,
      category: `UI release audit ${marker}`,
      isActive: true,
    },
  }), 'POST /products');

  return { marker, customer, customerName, product, productName, unitPrice };
}

async function expectNoFrameworkOverlay(page: Page) {
  await expect(page.locator('text=/Unhandled Runtime Error|Application error|Build Error|Failed to compile/i')).toHaveCount(0);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page should not create horizontal overflow in the tested viewport').toBeLessThanOrEqual(2);
}

test.describe('UI/UX end-user release audit', () => {
  test.setTimeout(90000);

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@smarterp.vn', password: 'admin123' },
    });
    const body = await jsonOk<{ access_token: string }>(response, 'POST /auth/login');
    token = body.access_token;
    expect(token).toBeTruthy();
  });

  test('cashier can sell, print an invoice, review the order, and add an order comment through the UI', async ({ page, request }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      window.localStorage.removeItem('__end_user_print_called');
      window.print = () => window.localStorage.setItem('__end_user_print_called', '1');
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    const fixtures = await createSaleFixtures(request);

    await loginByUi(page);
    await expectNoFrameworkOverlay(page);
    await expectNoHorizontalOverflow(page);

    await page.goto('/pos');
    await expect(page.getByPlaceholder(/tim san pham|tìm sản phẩm/i)).toBeVisible();
    await expect(page.getByText(/gio hang trong|giỏ hàng trống/i)).toBeVisible();
    await expectNoFrameworkOverlay(page);
    await expectNoHorizontalOverflow(page);

    await page.getByPlaceholder(/tim san pham|tìm sản phẩm|Search products/i).fill(fixtures.productName);
    await page.waitForTimeout(2000);
    const productCard = page.locator('button').filter({ hasText: fixtures.productName }).first();
    await expect(productCard).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await productCard.click({ timeout: 30000 });
    await expect(page.getByText(fixtures.productName).first()).toBeVisible();

    await page.locator('input[placeholder^="Khach le"], input[placeholder^="Khách lẻ"]').fill(fixtures.customerName);
    const customerOption = page.locator('button').filter({ hasText: fixtures.customerName }).first();
    await expect(customerOption).toBeVisible({ timeout: 10000 });
    await customerOption.click();
    await expect(page.locator('input[placeholder^="Khach le"], input[placeholder^="Khách lẻ"]')).toHaveValue(fixtures.customerName);

    await page.getByRole('button', { name: /du tien|đủ tiền/i }).click();
    await page.getByRole('button', { name: /thanh toan|thanh toán/i }).click();
    await expect(page.getByText(/xac nhan thanh toan|xác nhận thanh toán/i)).toBeVisible();
    await page.getByRole('button', { name: /xac nhan|xác nhận/i }).click();
    await expect(page.getByText(/thanh toan thanh cong|thanh toán thành công/i)).toBeVisible({ timeout: 15000 });

    const orderCodeText = await page.locator('p').filter({ hasText: /ma don|mã đơn/i }).first().textContent();
    const orderCode = orderCodeText?.match(/[A-Z]+-\d+[A-Z0-9-]*/)?.[0];
    expect(orderCode, 'success modal should show an order code').toBeTruthy();

    await page.getByRole('button', { name: /in hoa don|in hóa đơn/i }).click();
    await expect(page).toHaveURL(/\/orders\/[^/]+\/invoice\?print=1/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /hoa don ban hang|hóa đơn bán hàng/i })).toBeVisible();
    await expect(page.getByText(fixtures.productName)).toBeVisible();
    await expect(page.getByText(fixtures.customerName)).toBeVisible();
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('__end_user_print_called'))).toBe('1');
    await expectNoFrameworkOverlay(page);
    await expectNoHorizontalOverflow(page);

    await page.goto('/orders');
    await page.getByPlaceholder(/tim theo ma don|tìm theo mã đơn|search/i).fill(orderCode!);
    await page.getByRole('button', { name: /tim kiem|tìm kiếm|search/i }).click();
    const orderRow = page.locator('tr').filter({ hasText: orderCode! }).first();
    await expect(orderRow).toBeVisible({ timeout: 10000 });
    await orderRow.locator('button').last().click();
    await expect(page).toHaveURL(/\/orders\/[^/]+$/, { timeout: 15000 });
    await expect(page.getByText(orderCode!, { exact: false })).toBeVisible();
    await expect(page.getByText(fixtures.productName)).toBeVisible();
    await expect(page.getByRole('heading', { name: /binh luan|bình luận|comments/i })).toBeVisible();

    const comment = `UI release comment ${fixtures.marker}`;
    await page.locator('form').last().locator('input').fill(comment);
    await page.locator('form').last().locator('button[type="submit"]').click();
    await expect(page.getByText(comment)).toBeVisible({ timeout: 10000 });
    await expectNoFrameworkOverlay(page);
    await expectNoHorizontalOverflow(page);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('login surface is usable on a mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /smart erp next/i })).toBeVisible();
    await expect(page.locator(emailSelector)).toBeVisible();
    await expect(page.locator(passwordSelector)).toBeVisible();
    await page.getByRole('button', { name: /demo/i }).click();
    await expect(page.locator(emailSelector)).toHaveValue('admin@smarterp.vn');
    await expect(page.locator(passwordSelector)).toHaveValue('admin123');
    await expectNoFrameworkOverlay(page);
    await expectNoHorizontalOverflow(page);
  });
});
