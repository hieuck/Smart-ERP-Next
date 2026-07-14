import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Visual regression', () => {
  test('login page matches baseline', async ({ page }) => {
    test.skip(true, 'prerequisite: no committed baselines; visual regression requires baseline curation workflow (#552)');
    await page.goto('/login');
    await page.waitForSelector('button, [type="submit"]', { timeout: 10000 });
    await expect(page).toHaveScreenshot('login-page.png', { maxDiffPixels: 100 });
  });

  test('dashboard page matches baseline', async ({ page }) => {
    test.skip(true, 'prerequisite: no committed baselines; visual regression requires baseline curation workflow (#552)');
    await loginAs(page, 'admin@demo.vn', 'admin123');
    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });
    await expect(page).toHaveScreenshot('dashboard-page.png', { maxDiffPixels: 200 });
  });
});
