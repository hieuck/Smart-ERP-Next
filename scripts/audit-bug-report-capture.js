const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LAYOUT_FILE = 'apps/web/src/app/layout.tsx';
const REPORT_BUG_FILE = 'apps/web/src/components/ReportBugButton.tsx';

const REQUIRED_CAPTURES = [
  'window.__CAPTURED_ERRORS',
  'console.error',
  "addEventListener('error'",
  "addEventListener('unhandledrejection'",
];

const REQUIRED_BUG_BUTTON_SECTIONS = [
  'window.location.href',
  'navigator.userAgent',
  '__CAPTURED_ERRORS',
  'github.com/hieuck/Smart-ERP-Next/issues/new',
];

function fileExists(repoRoot, relativePath, findings) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    findings.push({ file: relativePath, reason: 'required file is missing' });
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function auditBugReportCapture(repoRoot = REPO_ROOT) {
  const findings = [];

  const layout = fileExists(repoRoot, LAYOUT_FILE, findings);
  if (layout !== null) {
    for (const capture of REQUIRED_CAPTURES) {
      if (!layout.includes(capture)) {
        findings.push({ file: LAYOUT_FILE, reason: `missing capture pattern: ${capture}` });
      }
    }
  }

  const reportBug = fileExists(repoRoot, REPORT_BUG_FILE, findings);
  if (reportBug !== null) {
    for (const section of REQUIRED_BUG_BUTTON_SECTIONS) {
      if (!reportBug.includes(section)) {
        findings.push({ file: REPORT_BUG_FILE, reason: `missing bug report section: ${section}` });
      }
    }
  }

  return findings;
}

function main() {
  const findings = auditBugReportCapture();

  if (findings.length > 0) {
    console.error('Bug report capture audit failed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.reason}`);
    }
    return 1;
  }

  console.log('Bug report capture audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  LAYOUT_FILE,
  REPORT_BUG_FILE,
  auditBugReportCapture,
};
