const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  auditDataContracts,
  CONTRACTS_FILE,
  PII_FILE,
  FORECAST_FILE,
  ARCHIVAL_FILE,
  TEMPLATE_FILE,
  REGISTRY_FILE,
} = require('../audit-data-contracts');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'data-contracts-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function makeValidEntityContracts() {
  return [
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
  ].join('\n');
}

function makeValidTemplate() {
  return [
    'Contract ID',
    'PII classification',
    'Quality checks',
    'Freshness SLA',
    'Drift',
    'Operational evidence',
  ].join('\n');
}

function makeValidRegistry() {
  return [
    'export const SMART_ERP_DATA_CONTRACTS = [];',
    'export function findDataContract(contractId) { return undefined; }',
  ].join('\n');
}

describe('auditDataContracts', () => {
  test('passes when all contracts, governance docs, template, and registry are present', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, CONTRACTS_FILE, makeValidEntityContracts());
    writeFile(repoRoot, PII_FILE, 'A'.repeat(250));
    writeFile(repoRoot, FORECAST_FILE, 'B'.repeat(250));
    writeFile(repoRoot, ARCHIVAL_FILE, 'C'.repeat(250));
    writeFile(repoRoot, TEMPLATE_FILE, makeValidTemplate());
    writeFile(repoRoot, REGISTRY_FILE, makeValidRegistry());

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

  test('reports missing template terms', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, CONTRACTS_FILE, makeValidEntityContracts());
    writeFile(repoRoot, PII_FILE, 'A'.repeat(250));
    writeFile(repoRoot, FORECAST_FILE, 'B'.repeat(250));
    writeFile(repoRoot, ARCHIVAL_FILE, 'C'.repeat(250));
    writeFile(repoRoot, TEMPLATE_FILE, 'Contract ID');
    writeFile(repoRoot, REGISTRY_FILE, makeValidRegistry());

    const findings = auditDataContracts(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: TEMPLATE_FILE, reason: expect.stringContaining('PII classification') }),
        expect.objectContaining({ file: TEMPLATE_FILE, reason: expect.stringContaining('Drift') }),
      ]),
    );
  });

  test('reports missing registry exports', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, CONTRACTS_FILE, makeValidEntityContracts());
    writeFile(repoRoot, PII_FILE, 'A'.repeat(250));
    writeFile(repoRoot, FORECAST_FILE, 'B'.repeat(250));
    writeFile(repoRoot, ARCHIVAL_FILE, 'C'.repeat(250));
    writeFile(repoRoot, TEMPLATE_FILE, makeValidTemplate());
    writeFile(repoRoot, REGISTRY_FILE, '// empty');

    const findings = auditDataContracts(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: REGISTRY_FILE, reason: expect.stringContaining('SMART_ERP_DATA_CONTRACTS') }),
        expect.objectContaining({ file: REGISTRY_FILE, reason: expect.stringContaining('findDataContract') }),
      ]),
    );
  });
});
