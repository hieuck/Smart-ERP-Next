import { test, expect } from '@playwright/test';

test('offline product creation syncs after reconnect', async ({ page }) => {
  // Start Tauri app (assumes dev server running)
  await page.goto('http://localhost:1420');

  // Login
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Login")');
  await expect(page).toHaveURL(/.*dashboard/);

  // Go offline (simulate network disconnect)
  await page.context().setOffline(true);

  // Go to products page
  await page.click('text=Products');
  await page.click('text=Add Product');
  await page.fill('input[name="name"]', 'Offline Desktop Test');
  await page.fill('input[name="sku"]', 'DESK-001');
  await page.fill('input[name="price"]', '199.99');
  await page.click('button:has-text("Save")');

  // Offline product visible in list
  await expect(page.locator('text=Offline Desktop Test')).toBeVisible();

  // Go online and sync
  await page.context().setOffline(false);
  await page.click('button[title="Sync offline changes"]');
  await expect(page.locator('text=Sync completed')).toBeVisible();

  // Reload and check
  await page.reload();
  await expect(page.locator('text=Offline Desktop Test')).toBeVisible();
});
