const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  REQUIRED_ROLES,
  auditTeamRoleReadiness,
  extractRoleRows,
} = require('../audit-team-role-readiness');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'team-role-readiness-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('auditTeamRoleReadiness', () => {
  test('extracts role rows from a markdown table', () => {
    const rows = extractRoleRows('| Vai trò | Evidence |\n|---|---|\n| Product Manager | PRD |\n| QA Engineer / SDET | Tests |');

    expect(rows).toEqual(['Product Manager', 'QA Engineer / SDET']);
  });

  test('passes when all required real-team roles have readiness rows and gap assessment coverage', () => {
    const repoRoot = makeTempRepo();
    const readinessRows = REQUIRED_ROLES.map(
      (role) => `| ${role} | Accountable | Checklist | Evidence | Cadence |`,
    ).join('\n');
    const assessmentRows = REQUIRED_ROLES.map(
      (role) => `| ${role} | Current | Gap | High |`,
    ).join('\n');

    writeFile(
      repoRoot,
      'docs/team/role-readiness.md',
      `| Role | RACI | Checklist | Evidence | Cadence |\n|---|---|---|---|---|\n${readinessRows}`,
    );
    writeFile(
      repoRoot,
      'docs/team-role-gap-assessment.md',
      `| Vai trò | Hiện trạng quan sát được | Gap cần PR/backlog | Ưu tiên |\n|---|---|---|---|\n${assessmentRows}`,
    );

    expect(auditTeamRoleReadiness(repoRoot)).toEqual([]);
  });

  test('reports missing roles in readiness and assessment documents', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, 'docs/team/role-readiness.md', '| Role | RACI | Checklist | Evidence | Cadence |\n|---|---|---|---|\n| Product Manager | A | C | E | Weekly |');
    writeFile(repoRoot, 'docs/team-role-gap-assessment.md', '| Vai trò | Hiện trạng quan sát được | Gap cần PR/backlog | Ưu tiên |\n|---|---|---|---|\n| Product Manager | Current | Gap | High |');

    const findings = auditTeamRoleReadiness(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: expect.stringContaining('Business Analyst / Domain SME') }),
        expect.objectContaining({ reason: expect.stringContaining('QA Engineer / SDET') }),
      ]),
    );
  });
});
