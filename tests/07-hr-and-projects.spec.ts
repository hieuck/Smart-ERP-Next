import { test, expect } from '@playwright/test';

test.describe('07 - HR and Projects', () => {
  const routes = ['/hr', '/projects', '/users', '/admin', '/chat', '/helpdesk'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
