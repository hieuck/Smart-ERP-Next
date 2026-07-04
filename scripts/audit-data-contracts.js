const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONTRACTS_FILE = 'docs/data/data-contracts.md';
const PII_FILE = 'docs/pii-classification.md';
const FORECAST_FILE = 'docs/forecast-accuracy-monitoring.md';
const ARCHIVAL_FILE = 'docs/data-archival.md';

const REQUIRED_CONTRACTS_SECTIONS = [
  '## Core entity contracts',
  '## Event naming contract',
  '## API versioning contract',
  '## Database schema contract',
  '## Offline sync payload contract',
  '## Validation contract',
  '## Change process',
];

const REQUIRED_ENTITIES = ['Product', 'Order', 'Customer'];

function fileExists(repoRoot, relativePath, findings) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    findings.push({ file: relativePath, reason: 'required document is missing' });
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function auditDataContracts(repoRoot = REPO_ROOT) {
  const findings = [];

  const contracts = fileExists(repoRoot, CONTRACTS_FILE, findings);
  if (contracts !== null) {
    for (const section of REQUIRED_CONTRACTS_SECTIONS) {
      if (!contracts.includes(section)) {
        findings.push({ file: CONTRACTS_FILE, reason: `missing required section ${section}` });
      }
    }

    for (const entity of REQUIRED_ENTITIES) {
      if (!contracts.includes(entity)) {
        findings.push({ file: CONTRACTS_FILE, reason: `missing entity contract for ${entity}` });
      }
    }
  }

  for (const file of [PII_FILE, FORECAST_FILE, ARCHIVAL_FILE]) {
    const content = fileExists(repoRoot, file, findings);
    if (content !== null && content.trim().length < 200) {
      findings.push({ file, reason: 'document exists but is too short to be useful' });
    }
  }

  return findings;
}

function main() {
  const findings = auditDataContracts();

  if (findings.length > 0) {
    console.error('Data contracts audit failed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.reason}`);
    }
    return 1;
  }

  console.log('Data contracts audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  CONTRACTS_FILE,
  PII_FILE,
  FORECAST_FILE,
  ARCHIVAL_FILE,
  auditDataContracts,
};
