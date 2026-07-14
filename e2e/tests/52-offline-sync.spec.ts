import { test, expect } from '@playwright/test';

test('offline product creation syncs after going online', async ({ page }) => {
  test.skip(true, 'prerequisite: offline sync feature requires dedicated service-worker and local cache setup before enabling in CI (#552)');

  // 1. Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@demo.vn');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // 2. Go to products page
  await page.click('text=Products');
  await expect(page).toHaveURL('/products');

  // 3. Simulate offline (disable network)
  await page.context().setOffline(true);

  // 4. Create a new product offline
  await page.click('text=Add Product');
  await page.fill('input[name="name"]', 'Offline Test Product');
  await page.fill('input[name="sku"]', 'OFF-001');
  await page.fill('input[name="price"]', '99.99');
  await page.click('button:has-text("Save")');

  // 5. Verify product appears in the list (from local cache)
  await expect(page.locator('text=Offline Test Product')).toBeVisible();

  // 6. Go back online
  await page.context().setOffline(false);

  // 7. Trigger manual sync
  await page.click('button[title="Sync offline changes"]');
  await expect(page.locator('text=Sync completed')).toBeVisible();

  // 8. Reload page to ensure persistence
  await page.reload();
  await expect(page.locator('text=Offline Test Product')).toBeVisible();
});
