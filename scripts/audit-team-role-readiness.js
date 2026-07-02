const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ROLE_READINESS_FILE = 'docs/team/role-readiness.md';
const TEAM_GAP_ASSESSMENT_FILE = 'docs/team-role-gap-assessment.md';

const REQUIRED_ROLES = [
  'Product Manager',
  'Business Analyst / Domain SME',
  'Engineering Manager',
  'Solution Architect',
  'Backend Engineer',
  'Frontend Engineer',
  'Mobile/PWA Engineer',
  'QA Engineer / SDET',
  'DevOps / Platform Engineer',
  'SRE / Operations',
  'Security Engineer',
  'Data Engineer / Analytics',
  'UX Researcher / Designer',
  'Technical Writer / Support',
  'Release Manager',
];

function normalizeCell(cell) {
  return cell.trim().replace(/`/g, '');
}

function extractRoleRows(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map((line) => line.split('|').map(normalizeCell).filter(Boolean)[0])
    .filter((firstCell) => firstCell && !['Role', 'Vai trò'].includes(firstCell));
}

function readRoles(repoRoot, relativePath, findings) {
  const fullPath = path.join(repoRoot, relativePath);

  if (!fs.existsSync(fullPath)) {
    findings.push({ file: relativePath, reason: 'required role governance document is missing' });
    return new Set();
  }

  return new Set(extractRoleRows(fs.readFileSync(fullPath, 'utf8')));
}

function auditTeamRoleReadiness(repoRoot = REPO_ROOT) {
  const findings = [];
  const readinessRoles = readRoles(repoRoot, ROLE_READINESS_FILE, findings);
  const assessmentRoles = readRoles(repoRoot, TEAM_GAP_ASSESSMENT_FILE, findings);

  for (const role of REQUIRED_ROLES) {
    if (!readinessRoles.has(role)) {
      findings.push({ file: ROLE_READINESS_FILE, reason: `${role} is missing from role readiness RACI/checklist` });
    }

    if (!assessmentRoles.has(role)) {
      findings.push({ file: TEAM_GAP_ASSESSMENT_FILE, reason: `${role} is missing from team role gap assessment` });
    }
  }

  return findings;
}

function main() {
  const findings = auditTeamRoleReadiness();

  if (findings.length > 0) {
    console.error('Team role readiness audit failed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.reason}`);
    }
    return 1;
  }

  console.log('Team role readiness audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  REQUIRED_ROLES,
  ROLE_READINESS_FILE,
  TEAM_GAP_ASSESSMENT_FILE,
  auditTeamRoleReadiness,
  extractRoleRows,
};
