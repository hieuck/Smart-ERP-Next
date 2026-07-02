const {
  auditContent,
  classifySkipReason,
} = require('../audit-flaky-tests');

describe('flaky test audit', () => {
  test('flags committed only tests', () => {
    expect(auditContent('e2e/tests/example.spec.ts', 'test.' + 'only("debug", async () => {});')).toEqual([
      { file: 'e2e/tests/example.spec.ts', line: 1, reason: 'committed focused test is not allowed' },
    ]);
  });

  test('flags unowned flaky quarantine skips', () => {
    const findings = auditContent(
      'e2e/tests/example.spec.ts',
      'test.' + 'skip(true, "flaky on CI");',
    );

    expect(findings).toEqual([
      { file: 'e2e/tests/example.spec.ts', line: 1, reason: 'skip/quarantine reason must include owner and expiry or be a prerequisite skip' },
    ]);
  });

  test('allows prerequisite skips and owned quarantines with expiry', () => {
    expect(classifySkipReason('Prerequisite role creation failed; delete test has no role to delete')).toBe('prerequisite');
    expect(classifySkipReason('QUARANTINE owner=@qa expires=2026-08-01 issue=#123: upstream sandbox is flaky')).toBe('quarantine');
  });
});
