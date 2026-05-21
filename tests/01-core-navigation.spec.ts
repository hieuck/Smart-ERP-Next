import { test, expect } from '@playwright/test';

test.describe('01 - Core Navigation & Dashboards', () => {
  test('Dashboard loads correctly', async ({ page }) => {
    await page.goto('/dashboard');
    // Ensure it doesn't redirect to 404 or crash
    await expect(page).not.toHaveTitle(/404/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('body')).toBeVisible();
  });
});
