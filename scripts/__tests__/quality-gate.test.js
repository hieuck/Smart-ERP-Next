const { buildGatePlan } = require('../quality-gate');

describe('quality-gate release plan', () => {
  it('does not include the mobile-type-check gate', () => {
    const plan = buildGatePlan('release');
    const ids = plan.gates.map((g) => g.id);

    expect(ids).not.toContain('mobile-type-check');
  });

  it('includes common and release gates', () => {
    const plan = buildGatePlan('release');
    const ids = plan.gates.map((g) => g.id);

    expect(ids).toContain('lint');
    expect(ids).toContain('web-build');
    expect(ids).toContain('api-e2e');
  });
});
