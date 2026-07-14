const {
  AUDIT_ROOT_RELATIVE_PATHS,
  auditContent,
} = require('../audit-e2e-assertions');

describe('e2e assertion audit', () => {
  it('covers every current end-user and app-local test root', () => {
    expect(AUDIT_ROOT_RELATIVE_PATHS).toEqual([
      'apps/api/test',
      'apps/desktop/tests',
      'apps/mobile/e2e',
      'e2e/tests',
    ]);
  });

  it('flags broad status arrays that treat platform failures as acceptable', () => {
    const findings = auditContent(
      'apps/api/test/core-journey.e2e-spec.ts',
      "expect([201, 401, 500]).toContain(res.status);",
    );

    expect(findings).toEqual([
      {
        file: 'apps/api/test/core-journey.e2e-spec.ts',
        line: 1,
        reason: 'broad status assertion includes 401/404/500',
      },
    ]);
  });

  it('accepts strict successful status assertions', () => {
    const findings = auditContent(
      'apps/api/test/forecast.e2e-spec.ts',
      'expect(res.status).toBe(200);',
    );

    expect(findings).toEqual([]);
  });
});
