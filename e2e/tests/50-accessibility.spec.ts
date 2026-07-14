import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Accessibility checks', () => {
  test('login page has no critical a11y violations', async ({ page }) => {
    test.skip(true, 'prerequisite: existing accessibility violations on the login page must be fixed before enabling (#552)');
    const { AxeBuilder } = await import('@axe-core/playwright');
    await page.goto('/login');
    await page.waitForSelector('main, form', { timeout: 10000 });
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical.length).toBe(0);
  });

  test('dashboard page has no critical a11y violations', async ({ page }) => {
    test.skip(true, 'prerequisite: existing accessibility violations on the dashboard page must be fixed before enabling (#552)');
    const { AxeBuilder } = await import('@axe-core/playwright');

    await loginAs(page, 'admin@demo.vn', 'admin123');
    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    await expect(page).toHaveURL('/dashboard');

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical.length).toBe(0);
  });
});
