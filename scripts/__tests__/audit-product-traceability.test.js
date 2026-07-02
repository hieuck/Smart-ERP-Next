const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  auditProductTraceability,
  extractBacktickPaths,
  extractMarkdownTableRows,
} = require('../audit-product-traceability');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'product-traceability-'));
}

function writeFile(repoRoot, relativePath, content = '') {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('auditProductTraceability', () => {
  test('extracts traceability rows and evidence paths', () => {
    const content = `| Trace ID | Automated checks |\n|---|---|\n| TR-SALES-001 | \`apps/api/src/orders/orders.service.spec.ts\` |`;

    expect(extractMarkdownTableRows(content)).toHaveLength(1);
    expect(extractBacktickPaths(extractMarkdownTableRows(content)[0])).toEqual([
      'apps/api/src/orders/orders.service.spec.ts',
    ]);
  });

  test('passes when PRD template and mapped evidence exist', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, 'docs/product/prd-template.md', '# PRD Template');

    const rows = Array.from({ length: 5 }, (_, index) => {
      const evidence = `checks/check-${index}.test.js`;
      writeFile(repoRoot, evidence, 'test');
      return `| TR-MOD-${index} | Module | Persona | Workflow | Evidence | \`${evidence}\` | QA |`;
    }).join('\n');

    writeFile(
      repoRoot,
      'docs/product/test-traceability.md',
      `| Trace ID | Module | Persona | Critical workflow | Acceptance evidence | Automated checks | Owner |\n|---|---|---|---|---|---|---|\n${rows}`,
    );

    expect(auditProductTraceability(repoRoot)).toEqual([]);
  });

  test('reports missing evidence and insufficient workflow coverage', () => {
    const repoRoot = makeTempRepo();
    writeFile(repoRoot, 'docs/product/prd-template.md', '# PRD Template');
    writeFile(
      repoRoot,
      'docs/product/test-traceability.md',
      '| Trace ID | Automated checks |\n|---|---|\n| TR-SALES-001 | `missing.test.js` |',
    );

    expect(auditProductTraceability(repoRoot)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: expect.stringContaining('at least five') }),
        expect.objectContaining({ reason: expect.stringContaining('missing.test.js') }),
      ]),
    );
  });
});
