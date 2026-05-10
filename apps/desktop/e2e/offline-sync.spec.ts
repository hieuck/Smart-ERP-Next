import { test, expect } from '@playwright/test';

test('offline product creation syncs after reconnect', async ({ page }) => {
  // Start Tauri app (assumes dev server running)
  await page.goto('http://localhost:1420');

  // Login (use data-testid if available, otherwise attributes)
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

  // Offline product visible in list (from local DB)
  await expect(page.locator('text=Offline Desktop Test')).toBeVisible();

  // Go online
  await page.context().setOffline(false);

  // Wait for network to be restored and sync button enabled
  await expect(async () => {
    const syncButton = page.locator('button[title="Sync offline changes"]');
    await expect(syncButton).toBeEnabled();
    await syncButton.click();
    await expect(page.locator('text=Sync completed')).toBeVisible();
  }).toPass({ timeout: 10000 });

  // Reload and verify product persists
  await page.reload();
  await expect(page.locator('text=Offline Desktop Test')).toBeVisible();
});
