const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  auditBugReportCapture,
  LAYOUT_FILE,
  REPORT_BUG_FILE,
} = require('../audit-bug-report-capture');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bug-report-capture-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('auditBugReportCapture', () => {
  test('passes when layout and report button contain required capture patterns', () => {
    const repoRoot = makeTempRepo();
    writeFile(
      repoRoot,
      LAYOUT_FILE,
      [
        'window.__CAPTURED_ERRORS = [];',
        'console.error = function() {}',
        "window.addEventListener('error', function(event){})",
        "window.addEventListener('unhandledrejection', function(event){})",
      ].join('\n'),
    );
    writeFile(
      repoRoot,
      REPORT_BUG_FILE,
      [
        'window.location.href',
        'navigator.userAgent',
        '__CAPTURED_ERRORS',
        'github.com/hieuck/Smart-ERP-Next/issues/new',
      ].join('\n'),
    );

    expect(auditBugReportCapture(repoRoot)).toEqual([]);
  });

  test('reports missing files and missing capture patterns', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, LAYOUT_FILE, 'window.__CAPTURED_ERRORS = [];');
    writeFile(repoRoot, REPORT_BUG_FILE, '');

    const findings = auditBugReportCapture(repoRoot);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: LAYOUT_FILE, reason: expect.stringContaining("'error'") }),
        expect.objectContaining({ file: REPORT_BUG_FILE, reason: expect.stringContaining('window.location.href') }),
      ]),
    );
  });
});
