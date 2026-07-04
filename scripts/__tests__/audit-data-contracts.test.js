const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  auditDataContracts,
  CONTRACTS_FILE,
  PII_FILE,
  FORECAST_FILE,
  ARCHIVAL_FILE,
} = require('../audit-data-contracts');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'data-contracts-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('auditDataContracts', () => {
  test('passes when all governance documents are present and complete', () => {
    const repoRoot = makeTempRepo();
    writeFile(
      repoRoot,
      CONTRACTS_FILE,
      [
        '## Core entity contracts',
        '### Product',
        '### Order',
        '### Customer',
        '## Event naming contract',
        '## API versioning contract',
        '## Database schema contract',
        '## Offline sync payload contract',
        '## Validation contract',
        '## Change process',
      ].join('\n'),
    );
    writeFile(repoRoot, PII_FILE, 'A'.repeat(250));
    writeFile(repoRoot, FORECAST_FILE, 'B'.repeat(250));
    writeFile(repoRoot, ARCHIVAL_FILE, 'C'.repeat(250));

    expect(auditDataContracts(repoRoot)).toEqual([]);
  });

  test('reports missing documents and missing sections', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, CONTRACTS_FILE, '## Core entity contracts\n### Product\n');

    const findings = auditDataContracts(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: CONTRACTS_FILE, reason: expect.stringContaining('Event naming') }),
        expect.objectContaining({ file: CONTRACTS_FILE, reason: expect.stringContaining('Order') }),
        expect.objectContaining({ file: PII_FILE, reason: expect.stringContaining('missing') }),
      ]),
    );
  });
});
