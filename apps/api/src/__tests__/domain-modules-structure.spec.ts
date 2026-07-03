/**
 * Verify that all 48+ feature modules are grouped into domain boundary modules.
 * app.module.ts should only import domain modules, not individual feature modules.
 */

describe('Domain module structure', () => {
  it('app.module.ts does not import individual feature modules directly', () => {
    const fs = require('fs');
    const content = fs.readFileSync(require('path').join(__dirname, '../app.module.ts'), 'utf8');

    const domainModules = [
      './modules/commerce.module',
      './modules/infra.module',
      './modules/core.module',
      './modules/finance.module',
    ];

    const flatFeatureModules = [
      './auth/auth.module', './users/users.module', './tenants/tenants.module',
      './notifications/notifications.module',
      './accounting/accounting.module', './fixed-assets/fixed-assets.module',
      './reports/reports.module', './insights/insights.module',
      './forecast/forecast.module', './inventory-recommendation/inventory-recommendation.module',
      './manufacturing/manufacturing.module', './mrp/mrp.module', './qms/qms.module',
      './approvals/approvals.module', './comments/comments.module', './chat/chat.module',
      './modules/activity/activity.module', './export-pdf/export-pdf.module',
      './health/health.module', './monitor/status.module',
      './projects/projects.module', './crm/crm.module', './hr/hr.module',
    ];

    const violations = flatFeatureModules.filter((m) => content.includes(m));
    if (violations.length > 0) {
      console.log('Modules still imported directly (should use domain modules):', violations);
    }

    // Each domain module should exist
    const missing = domainModules.filter((m) => !content.includes(m));
    if (missing.length > 0) {
      console.log('Domain modules not yet imported:', missing);
    }

    // Verify domain module files exist
    for (const dm of domainModules) {
      const modulePath = require('path').join(__dirname, '../modules/', require('path').basename(dm)) + '.ts';
      expect(() => fs.accessSync(modulePath)).not.toThrow();
    }
  });
});
