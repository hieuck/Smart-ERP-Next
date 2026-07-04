const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const TROUBLESHOOTING_FILE = 'docs/runbooks/troubleshooting-matrix.md';
const CODEQL_SETUP_FILE = 'docs/security/codeql-setup.md';
const SOP_FILE = 'docs/runbooks/support-triage-sop.md';

const REQUIRED_TROUBLESHOOTING_SECTIONS = [
  '## How to use this matrix',
  '## Diagnostic recipes',
  '## Adding a new row',
  '## References',
];

const REQUIRED_CODEQL_SECTIONS = [
  '## What runs',
  '## Why PR checks show multiple CodeQL entries',
  '## Verify there is no duplicate workflow',
  '## Triage',
];

function fileExists(repoRoot, relativePath, findings) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    findings.push({ file: relativePath, reason: 'required document is missing' });
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function countTableRows(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('| ID '))
    .length;
}

function auditTroubleshootingMatrix(repoRoot = REPO_ROOT) {
  const findings = [];

  const troubleshooting = fileExists(repoRoot, TROUBLESHOOTING_FILE, findings);
  if (troubleshooting) {
    for (const section of REQUIRED_TROUBLESHOOTING_SECTIONS) {
      if (!troubleshooting.includes(section)) {
        findings.push({
          file: TROUBLESHOOTING_FILE,
          reason: `missing required section ${section}`,
        });
      }
    }

    const rowCount = countTableRows(troubleshooting);
    if (rowCount < 8) {
      findings.push({
        file: TROUBLESHOOTING_FILE,
        reason: `expected at least 8 troubleshooting rows, found ${rowCount}`,
      });
    }

    if (!troubleshooting.includes('TM-')) {
      findings.push({
        file: TROUBLESHOOTING_FILE,
        reason: 'troubleshooting rows must use TM-NN IDs',
      });
    }
  }

  const codeql = fileExists(repoRoot, CODEQL_SETUP_FILE, findings);
  if (codeql) {
    for (const section of REQUIRED_CODEQL_SECTIONS) {
      if (!codeql.includes(section)) {
        findings.push({
          file: CODEQL_SETUP_FILE,
          reason: `missing required section ${section}`,
        });
      }
    }

    if (!codeql.includes('Issue #52')) {
      findings.push({
        file: CODEQL_SETUP_FILE,
        reason: 'must reference issue #52 about duplicate CodeQL checks',
      });
    }
  }

  const sop = fileExists(repoRoot, SOP_FILE, findings);
  if (sop && !sop.includes('troubleshooting-matrix.md')) {
    findings.push({
      file: SOP_FILE,
      reason: 'support triage SOP must reference troubleshooting-matrix.md',
    });
  }

  return findings;
}

function main() {
  const findings = auditTroubleshootingMatrix();

  if (findings.length > 0) {
    console.error('Troubleshooting matrix audit failed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.reason}`);
    }
    return 1;
  }

  console.log('Troubleshooting matrix audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  TROUBLESHOOTING_FILE,
  CODEQL_SETUP_FILE,
  SOP_FILE,
  auditTroubleshootingMatrix,
};
