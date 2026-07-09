const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.join(__dirname, 'page.tsx');
const source = fs.readFileSync(pagePath, 'utf8');

describe('Dashboard AI insights', () => {
  it('does not render hardcoded AI widget values', () => {
    expect(source).not.toContain('value="180"');
    expect(source).not.toContain('value="45"');
    expect(source).not.toContain('value="3"');
  });

  it('renders AI widget values from stats.aiInsights', () => {
    expect(source).toContain('stats.aiInsights?.demandForecast');
    expect(source).toContain('stats.aiInsights?.suggestedReorder');
    expect(source).toContain('stats.aiInsights?.pendingApprovals');
  });

  it('defines aiInsights in DashboardStats interface', () => {
    expect(source).toContain('aiInsights?:');
    expect(source).toContain('demandForecast:');
    expect(source).toContain('suggestedReorder:');
    expect(source).toContain('pendingApprovals:');
  });
});
