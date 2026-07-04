const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  auditTroubleshootingMatrix,
  TROUBLESHOOTING_FILE,
  CODEQL_SETUP_FILE,
  SOP_FILE,
} = require('../audit-troubleshooting-matrix');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'troubleshooting-matrix-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('auditTroubleshootingMatrix', () => {
  test('passes when all required docs and sections are present', () => {
    const repoRoot = makeTempRepo();
    writeFile(
      repoRoot,
      TROUBLESHOOTING_FILE,
      [
        '## How to use this matrix',
        '| ID | Area | Symptom | Probable cause | Quick fix | Diagnostic commands | Owner | Escalation |',
        '|---|---|---|---|---|---|---|---|',
        ...Array.from({ length: 10 }, (_, i) => `| TM-${String(i + 1).padStart(2, '0')} | Build | error | cause | fix | cmd | owner | escalate |`),
        '## Diagnostic recipes',
        '## Adding a new row',
        '## References',
      ].join('\n'),
    );
    writeFile(
      repoRoot,
      CODEQL_SETUP_FILE,
      '## What runs\n## Why PR checks show multiple CodeQL entries\n## Verify there is no duplicate workflow\n## Triage\nIssue #52',
    );
    writeFile(repoRoot, SOP_FILE, 'see docs/runbooks/troubleshooting-matrix.md');

    expect(auditTroubleshootingMatrix(repoRoot)).toEqual([]);
  });

  test('reports missing files', () => {
    const repoRoot = makeTempRepo();

    const findings = auditTroubleshootingMatrix(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: TROUBLESHOOTING_FILE, reason: expect.stringContaining('missing') }),
        expect.objectContaining({ file: CODEQL_SETUP_FILE, reason: expect.stringContaining('missing') }),
        expect.objectContaining({ file: SOP_FILE, reason: expect.stringContaining('missing') }),
      ]),
    );
  });

  test('reports missing sections and low row count', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, TROUBLESHOOTING_FILE, '## How to use this matrix\n| ID | Area | Symptom |\n|---|---|---|\n| TM-01 | Build | err |\n');
    writeFile(repoRoot, CODEQL_SETUP_FILE, '## What runs\nIssue #52');
    writeFile(repoRoot, SOP_FILE, 'nothing');

    const findings = auditTroubleshootingMatrix(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: TROUBLESHOOTING_FILE, reason: expect.stringContaining('Diagnostic recipes') }),
        expect.objectContaining({ file: TROUBLESHOOTING_FILE, reason: expect.stringContaining('expected at least 8') }),
        expect.objectContaining({ file: CODEQL_SETUP_FILE, reason: expect.stringContaining('Why PR checks') }),
        expect.objectContaining({ file: SOP_FILE, reason: expect.stringContaining('must reference') }),
      ]),
    );
  });
});
