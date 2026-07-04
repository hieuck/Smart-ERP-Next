const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "docs/data-contract-template.md",
  "docs/pii-classification.md",
  "docs/forecast-accuracy-monitoring.md",
];

const REQUIRED_TERMS = {
  "docs/data-contract-template.md": [
    "Contract ID",
    "PII classification",
    "Quality checks",
    "Freshness SLA",
    "Drift",
    "Operational evidence",
  ],
  "docs/pii-classification.md": [
    "Sensitive PII",
    "access controls",
    "Audit requirements",
  ],
  "docs/forecast-accuracy-monitoring.md": ["MAPE", "MAE", "Bias"],
};

function auditDataGovernance(repoRoot = REPO_ROOT) {
  const findings = [];

  for (const relativePath of REQUIRED_FILES) {
    const fullPath = path.join(repoRoot, relativePath);

    if (!fs.existsSync(fullPath)) {
      findings.push(`${relativePath} is missing.`);
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    for (const term of REQUIRED_TERMS[relativePath] || []) {
      if (!content.toLowerCase().includes(term.toLowerCase())) {
        findings.push(`${relativePath} must mention "${term}".`);
      }
    }
  }

  return findings;
}

function main() {
  const findings = auditDataGovernance();
  if (findings.length > 0) {
    console.error("Data governance audit failed.");
    for (const finding of findings) console.error(`- ${finding}`);
    return 1;
  }

  console.log("Data governance audit passed.");
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { REQUIRED_FILES, auditDataGovernance };
