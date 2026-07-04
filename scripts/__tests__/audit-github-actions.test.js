const { auditGithubActions } = require('../audit-github-actions');

describe('audit-github-actions', () => {
  it('passes with no forbidden or misconfigured workflows', () => {
    const findings = auditGithubActions();
    if (findings.length > 0) {
      // Provide a clear failure message
      console.error(findings);
    }
    expect(findings).toEqual([]);
  });
});
