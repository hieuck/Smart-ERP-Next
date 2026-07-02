const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const TRACEABILITY_FILE = 'docs/product/test-traceability.md';
const PRD_TEMPLATE_FILE = 'docs/product/prd-template.md';

function extractMarkdownTableRows(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('| TR-'));
}

function extractBacktickPaths(row) {
  return [...row.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function auditProductTraceability(repoRoot = REPO_ROOT) {
  const findings = [];
  const tracePath = path.join(repoRoot, TRACEABILITY_FILE);
  const prdPath = path.join(repoRoot, PRD_TEMPLATE_FILE);

  if (!fs.existsSync(prdPath)) {
    findings.push({ file: PRD_TEMPLATE_FILE, reason: 'PRD template is required for product acceptance criteria governance' });
  }

  if (!fs.existsSync(tracePath)) {
    findings.push({ file: TRACEABILITY_FILE, reason: 'traceability matrix is required for Product/QA sign-off' });
    return findings;
  }

  const content = fs.readFileSync(tracePath, 'utf8');
  const rows = extractMarkdownTableRows(content);

  if (rows.length < 5) {
    findings.push({ file: TRACEABILITY_FILE, reason: 'at least five high-risk ERP workflows must be mapped to tests' });
  }

  rows.forEach((row) => {
    const traceId = row.split('|')[1]?.trim() || TRACEABILITY_FILE;
    const paths = extractBacktickPaths(row);

    if (paths.length === 0) {
      findings.push({ file: TRACEABILITY_FILE, reason: `${traceId} has no automated evidence path` });
      return;
    }

    paths.forEach((relativePath) => {
      if (!fs.existsSync(path.join(repoRoot, relativePath))) {
        findings.push({ file: TRACEABILITY_FILE, reason: `${traceId} references missing evidence: ${relativePath}` });
      }
    });
  });

  return findings;
}

function main() {
  const findings = auditProductTraceability();

  if (findings.length > 0) {
    console.error('Product traceability audit failed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.reason}`);
    }
    return 1;
  }

  console.log('Product traceability audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  PRD_TEMPLATE_FILE,
  TRACEABILITY_FILE,
  auditProductTraceability,
  extractBacktickPaths,
  extractMarkdownTableRows,
};
