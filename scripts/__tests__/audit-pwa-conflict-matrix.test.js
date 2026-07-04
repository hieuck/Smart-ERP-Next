const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { auditPwaConflictMatrix, MATRIX_FILE } = require('../audit-pwa-conflict-matrix');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-conflict-matrix-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('auditPwaConflictMatrix', () => {
  test('passes when matrix has all required sections, rows and references', () => {
    const repoRoot = makeTempRepo();
    const rows = Array.from({ length: 8 }, (_, i) => `| CF-${String(i + 1).padStart(2, '0')} | flow | offline | remote | type | pattern | default | control | key |`).join('\n');
    const refs = ['SyncConflictModal.tsx', 'sync-service.ts', 'offline-db.ts', 'sw.js', 'manifest.json']
      .map((ref) => `- ${ref}`)
      .join('\n');

    writeFile(
      repoRoot,
      MATRIX_FILE,
      [
        '## Conflict scenarios by business flow',
        '| ID | Flow | Offline action | Remote change | Conflict type | UX pattern | Default | User control | i18n key |',
        '|---|---|---|---|---|---|---|---|---|---|',
        rows,
        '## UX patterns',
        '## Current implementation gaps',
        '## Test matrix',
        '## Owner and cadence',
        '## References',
        refs,
      ].join('\n'),
    );

    expect(auditPwaConflictMatrix(repoRoot)).toEqual([]);
  });

  test('reports missing file and missing sections', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, MATRIX_FILE, '## Conflict scenarios by business flow\n| CF-01 | f | o | r | t | p | d | c | k |\n');

    const findings = auditPwaConflictMatrix(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: MATRIX_FILE, reason: expect.stringContaining('UX patterns') }),
        expect.objectContaining({ file: MATRIX_FILE, reason: expect.stringContaining('expected at least 6') }),
        expect.objectContaining({ file: MATRIX_FILE, reason: expect.stringContaining('SyncConflictModal.tsx') }),
      ]),
    );
  });
});
