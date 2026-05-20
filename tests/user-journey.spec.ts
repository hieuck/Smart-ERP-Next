import { test, expect } from '@playwright/test';

test('smoke test: page loads', async ({ page }) => {
  // Just verify login page loads
  await page.goto('/');
  await expect(page).toHaveURL(/login/);

  // Check for login form elements
  const emailInput = page.locator('input[type="email"], input[name*="email" i]');
  const passwordInput = page.locator('input[type="password"], input[name*="password" i]');

  // At least one of them should exist
  const emailExists = await emailInput.count();
  const passwordExists = await passwordInput.count();

  expect(emailExists + passwordExists).toBeGreaterThan(0);
});

test('web MVP page loads without authentication', async ({ page }) => {
  await page.goto('/mvp');
  await expect(page.getByRole('heading', { name: /Smart ERP Next - Web MVP/i })).toBeVisible();
  await expect(page.getByText(/Web, Android, iOS\/Windows dung chung backend DB qua API/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /iPhone 15 Pro Max/i })).toBeVisible();
});
