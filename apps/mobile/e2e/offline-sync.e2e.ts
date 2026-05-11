import { device, element, by, expect } from 'detox';

describe('Offline sync', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should create product offline and sync later', async () => {
    // Login
    await element(by.id('email-input')).typeText('admin@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await expect(element(by.id('dashboard-screen'))).toBeVisible();

    // Go offline
    await device.setDisableNetwork(true);

    // Navigate to products and add product
    await element(by.text('Products')).tap();
    await element(by.text('Add Product')).tap();
    await element(by.id('product-name')).typeText('Offline Test');
    await element(by.id('product-sku')).typeText('OFF-001');
    await element(by.text('Save')).tap();

    // Product should appear in list (from local DB)
    await expect(element(by.text('Offline Test'))).toBeVisible();

    // Go online
    await device.setDisableNetwork(false);

    // Trigger sync (manual sync button action)
    await element(by.id('sync-button')).tap();
    await expect(element(by.text('Sync completed'))).toBeVisible();

    // Reload and verify product persists
    await device.reloadReactNative();
    await element(by.text('Products')).tap();
    await expect(element(by.text('Offline Test'))).toBeVisible();
  });
});
