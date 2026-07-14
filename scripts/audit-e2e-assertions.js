const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const AUDIT_ROOT_RELATIVE_PATHS = [
  'apps/api/test',
  'apps/desktop/tests',
  'apps/mobile/e2e',
  'e2e/tests',
];

const TEST_FILE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const BROAD_STATUS_PATTERN = /expect\s*\(\s*\[[^\]]*\b(?:401|404|500)\b[^\]]*\]\s*\)\s*\.toContain\s*\(\s*[a-zA-Z_$][\w$]*\.status\s*\)/;
const BYPASS_LANGUAGE_PATTERN = /\b(bypass|skip actual|allow 500|mock-token)\b/i;

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

function toRepoPath(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
}

function getAuditRoots(repoRoot = REPO_ROOT) {
  return AUDIT_ROOT_RELATIVE_PATHS.map((relativePath) =>
    path.join(repoRoot, relativePath),
  );
}

function auditContent(file, content) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((lineContent, index) => {
    const line = index + 1;

    if (BROAD_STATUS_PATTERN.test(lineContent)) {
      findings.push({
        file,
        line,
        reason: 'broad status assertion includes 401/404/500',
      });
    }

    if (BYPASS_LANGUAGE_PATTERN.test(lineContent)) {
      findings.push({
        file,
        line,
        reason: 'bypass language in e2e test',
      });
    }
  });

  return findings;
}

function auditFiles(files) {
  return files.flatMap((filePath) => {
    const file = toRepoPath(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    return auditContent(file, content);
  });
}

function main() {
  const files = getAuditRoots().flatMap((root) => walkTestFiles(root));
  const findings = auditFiles(files);

  if (findings.length > 0) {
    console.error('E2E assertion audit failed.');
    console.error('Release certification cannot accept tests that pass on 401/404/500 or bypass real assertions.');
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} ${finding.reason}`);
    }
    return 1;
  }

  console.log('E2E assertion audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  AUDIT_ROOT_RELATIVE_PATHS,
  auditContent,
  auditFiles,
  getAuditRoots,
  main,
};
