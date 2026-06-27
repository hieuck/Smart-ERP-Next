import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

let authState: { token: string; user: any };

const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
const passwordSelector = 'input[type="password"]';
const loginButtonSelector = 'button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")';

async function ensureLoggedIn(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailField = page.locator(emailSelector).first();
  const passwordField = page.locator(passwordSelector).first();
  const demoButton = page.locator('button:has-text("Fill demo"), button:has-text("fillDemo"), [formAction="button"]');
  await expect(emailField).toBeVisible({ timeout: 10000 });
  await demoButton.click();
  await expect(passwordField).toBeVisible();

  const loginBtn = page.locator(loginButtonSelector).first();
  await Promise.all([
    page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 }),
    loginBtn.click(),
  ]);
  await page.waitForLoadState('domcontentloaded');

  const stored = await page.evaluate(() => ({
    token: localStorage.getItem('access_token'),
    user: (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })(),
  }));
  expect(stored.token, 'missing access_token after login').toBeTruthy();
  expect(stored.user, 'missing user after login').toBeTruthy();
  authState = { token: stored.token, user: stored.user };
}

async function authenticatePage(page: Page) {
  if (!authState?.token) {
    await ensureLoggedIn(page);
  }
  if (authState?.token) {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: authState.token,
        url: 'http://localhost:3456',
        sameSite: 'Lax',
      },
    ]);
  }
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (user?.tenantId) localStorage.setItem('tenant_id', user.tenantId);
  }, authState);
}

// ═══════════════════════════════════════════════════════════════════
// Reproduction 1: Login UI ở port mới
// ═══════════════════════════════════════════════════════════════════

test('smoke-login: /login loads on 3456 and accepts credentials', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Smart ERP|Login/i);
  const emailField = page.locator(emailSelector).first();
  await expect(emailField).toBeVisible({ timeout: 10000 });
  const passwordField = page.locator(passwordSelector).first();
  await expect(passwordField).toBeVisible();
  await emailField.fill('admin@demo.vn');
  await passwordField.fill('admin123');
  await page.locator(loginButtonSelector).first().click();
  await page.waitForTimeout(1000);
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  const user = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  expect(token, 'missing access_token after UI login').toBeTruthy();
  expect(user, 'missing user after UI login').toBeTruthy();
});
