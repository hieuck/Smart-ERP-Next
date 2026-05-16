import { test, expect } from '@playwright/test';

test('smoke test: login page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/login/);
  await expect(page.locator('form')).toBeVisible();
});