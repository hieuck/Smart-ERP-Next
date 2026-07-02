const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const AUDIT_ROOT_RELATIVE_PATHS = [
  'apps/api/test',
  'apps/desktop/tests',
  'apps/mobile/e2e',
  'apps/web/e2e',
  'e2e/tests',
  'scripts/__tests__',
  'tests',
];
const TEST_FILE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ONLY_PATTERN = /\b(?:test|it|describe)\.only\s*\(/;
const SKIP_PATTERN = /\b(?:test|it|describe)\.skip\s*\((.*)/;
const QUARANTINE_PATTERN = /\bQUARANTINE\b.*\bowner=@[\w-]+.*\bexpires=\d{4}-\d{2}-\d{2}.*\bissue=(?:#\d+|https?:\/\/\S+)/i;
const PREREQUISITE_PATTERN = /\bprerequisite\b/i;

function walkTestFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTestFiles(fullPath, files);
    } else if (TEST_FILE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toRepoPath(filePath, repoRoot = REPO_ROOT) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function getAuditRoots(repoRoot = REPO_ROOT) {
  return AUDIT_ROOT_RELATIVE_PATHS.map((relativePath) => path.join(repoRoot, relativePath));
}

function extractQuotedReason(skipCallText) {
  const match = skipCallText.match(/['"]([^'"]+)['"]\s*\)?\s*;?\s*$/);
  return match ? match[1] : '';
}

function classifySkipReason(reason) {
  if (PREREQUISITE_PATTERN.test(reason)) return 'prerequisite';
  if (QUARANTINE_PATTERN.test(reason)) return 'quarantine';
  return 'invalid';
}

function auditContent(file, content) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((lineContent, index) => {
    const line = index + 1;

    if (ONLY_PATTERN.test(lineContent)) {
      findings.push({ file, line, reason: 'committed focused test is not allowed' });
    }

    if (SKIP_PATTERN.test(lineContent)) {
      const reason = extractQuotedReason(lineContent);
      if (classifySkipReason(reason) === 'invalid') {
        findings.push({ file, line, reason: 'skip/quarantine reason must include owner and expiry or be a prerequisite skip' });
      }
    }
  });

  return findings;
}

function auditFiles(files, repoRoot = REPO_ROOT) {
  return files.flatMap((filePath) => auditContent(toRepoPath(filePath, repoRoot), fs.readFileSync(filePath, 'utf8')));
}

function main() {
  const files = getAuditRoots().flatMap((root) => walkTestFiles(root));
  const findings = auditFiles(files);

  if (findings.length > 0) {
    console.error('Flaky test audit failed.');
    console.error('Focused tests and unowned skips/quarantines block continuous operation.');
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} ${finding.reason}`);
    }
    return 1;
  }

  console.log('Flaky test audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  AUDIT_ROOT_RELATIVE_PATHS,
  auditContent,
  auditFiles,
  classifySkipReason,
  extractQuotedReason,
  getAuditRoots,
  main,
};
