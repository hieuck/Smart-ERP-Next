const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MATRIX_FILE = 'docs/pwa/conflict-ux-matrix.md';

const REQUIRED_SECTIONS = [
  '## Conflict scenarios by business flow',
  '## UX patterns',
  '## Current implementation gaps',
  '## Test matrix',
  '## Owner and cadence',
  '## References',
];

const REQUIRED_REFERENCES = [
  'SyncConflictModal.tsx',
  'sync-service.ts',
  'offline-db.ts',
  'sw.js',
  'manifest.json',
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

function auditPwaConflictMatrix(repoRoot = REPO_ROOT) {
  const findings = [];
  const matrix = fileExists(repoRoot, MATRIX_FILE, findings);

  if (matrix) {
    for (const section of REQUIRED_SECTIONS) {
      if (!matrix.includes(section)) {
        findings.push({ file: MATRIX_FILE, reason: `missing required section ${section}` });
      }
    }

    const rowCount = countTableRows(matrix);
    if (rowCount < 6) {
      findings.push({ file: MATRIX_FILE, reason: `expected at least 6 conflict rows, found ${rowCount}` });
    }

    if (!matrix.includes('CF-')) {
      findings.push({ file: MATRIX_FILE, reason: 'conflict rows must use CF-NN IDs' });
    }

    for (const ref of REQUIRED_REFERENCES) {
      if (!matrix.includes(ref)) {
        findings.push({ file: MATRIX_FILE, reason: `missing reference to ${ref}` });
      }
    }
  }

  return findings;
}

function main() {
  const findings = auditPwaConflictMatrix();

  if (findings.length > 0) {
    console.error('PWA conflict UX matrix audit failed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.reason}`);
    }
    return 1;
  }

  console.log('PWA conflict UX matrix audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  MATRIX_FILE,
  auditPwaConflictMatrix,
};
