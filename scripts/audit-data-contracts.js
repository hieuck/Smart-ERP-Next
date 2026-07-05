const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

// PR #70: canonical entity API/sync/offline contracts.
const CONTRACTS_FILE = 'docs/data/data-contracts.md';
const PII_FILE = 'docs/pii-classification.md';
const FORECAST_FILE = 'docs/forecast-accuracy-monitoring.md';
const ARCHIVAL_FILE = 'docs/data-archival.md';

// PR #59: analytics data contract template and TypeScript registry.
const TEMPLATE_FILE = 'docs/data-contract-template.md';
const REGISTRY_FILE = 'packages/shared/src/data-contract-registry.ts';

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

const REQUIRED_TEMPLATE_TERMS = [
  'Contract ID',
  'PII classification',
  'Quality checks',
  'Freshness SLA',
  'Drift',
  'Operational evidence',
];

function fileExists(repoRoot, relativePath, findings) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    findings.push({ file: relativePath, reason: 'required document is missing' });
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function auditEntityContracts(repoRoot, findings) {
  const contracts = fileExists(repoRoot, CONTRACTS_FILE, findings);
  if (contracts === null) return;

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

function auditGovernanceDocuments(repoRoot, findings) {
  for (const file of [PII_FILE, FORECAST_FILE, ARCHIVAL_FILE]) {
    const content = fileExists(repoRoot, file, findings);
    if (content !== null && content.trim().length < 200) {
      findings.push({ file, reason: 'document exists but is too short to be useful' });
    }
  }
}

function auditAnalyticsContractTemplate(repoRoot, findings) {
  const content = fileExists(repoRoot, TEMPLATE_FILE, findings);
  if (content === null) return;

  for (const term of REQUIRED_TEMPLATE_TERMS) {
    if (!content.toLowerCase().includes(term.toLowerCase())) {
      findings.push({ file: TEMPLATE_FILE, reason: `must mention "${term}"` });
    }
  }
}

function auditAnalyticsRegistry(repoRoot, findings) {
  const content = fileExists(repoRoot, REGISTRY_FILE, findings);
  if (content === null) return;

  if (!content.includes('SMART_ERP_DATA_CONTRACTS')) {
    findings.push({ file: REGISTRY_FILE, reason: 'analytics registry must export SMART_ERP_DATA_CONTRACTS' });
  }

  if (!content.includes('findDataContract')) {
    findings.push({ file: REGISTRY_FILE, reason: 'analytics registry must export findDataContract' });
  }
}

function auditDataContracts(repoRoot = REPO_ROOT) {
  const findings = [];

  auditEntityContracts(repoRoot, findings);
  auditGovernanceDocuments(repoRoot, findings);
  auditAnalyticsContractTemplate(repoRoot, findings);
  auditAnalyticsRegistry(repoRoot, findings);

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
  TEMPLATE_FILE,
  REGISTRY_FILE,
  auditDataContracts,
};
