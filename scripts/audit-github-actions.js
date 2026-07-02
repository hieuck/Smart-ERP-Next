const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const REPO_ROOT = path.resolve(__dirname, "..");
const WORKFLOW_DIR = path.join(REPO_ROOT, ".github", "workflows");

function readWorkflow(name) {
  const filePath = path.join(WORKFLOW_DIR, name);
  return YAML.parse(fs.readFileSync(filePath, "utf8"));
}

function listWorkflowFiles() {
  return fs
    .readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
}

function collectUses(node, file, findings, pathParts = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) =>
      collectUses(item, file, findings, [...pathParts, String(index)]),
    );
    return;
  }

  if (!node || typeof node !== "object") return;

  if (typeof node.uses === "string" && /@master$|@main$/.test(node.uses)) {
    findings.push({
      file,
      reason: `mutable action ref is forbidden: ${node.uses} at ${pathParts.join(".")}`,
    });
  }

  for (const [key, value] of Object.entries(node)) {
    collectUses(value, file, findings, [...pathParts, key]);
  }
}

function findStep(workflow, jobName, stepName) {
  return workflow.jobs?.[jobName]?.steps?.find(
    (step) => step.name === stepName,
  );
}

function assert(condition, findings, file, reason) {
  if (!condition) findings.push({ file, reason });
}

function auditGithubActions() {
  const findings = [];

  for (const file of listWorkflowFiles()) {
    collectUses(readWorkflow(file), file, findings);
  }

  const ci = readWorkflow("ci.yml");
  assert(
    ci.permissions?.["security-events"] === "write",
    findings,
    "ci.yml",
    "CI must grant security-events: write for SARIF upload",
  );

  const trivy = findStep(
    ci,
    "test-and-build",
    "Run Trivy vulnerability scanner",
  );
  assert(
    trivy?.id === "trivy",
    findings,
    "ci.yml",
    "Trivy step must have id: trivy so its outcome can be enforced after SARIF upload",
  );
  assert(
    trivy?.uses === "aquasecurity/trivy-action@v0.35.0",
    findings,
    "ci.yml",
    "Trivy action must be pinned to v0.35.0",
  );
  assert(
    trivy?.["continue-on-error"] === true,
    findings,
    "ci.yml",
    "Trivy scan should continue-on-error so SARIF can upload before failing the job",
  );

  const uploadSarif = findStep(
    ci,
    "test-and-build",
    "Upload Trivy SARIF report",
  );
  assert(
    uploadSarif?.uses === "github/codeql-action/upload-sarif@v4",
    findings,
    "ci.yml",
    "Trivy SARIF must upload through CodeQL upload-sarif v4",
  );
  assert(
    uploadSarif?.if === "always()",
    findings,
    "ci.yml",
    "Trivy SARIF upload must run with if: always()",
  );

  const enforceTrivy = findStep(
    ci,
    "test-and-build",
    "Enforce Trivy vulnerability gate",
  );
  assert(
    Boolean(enforceTrivy),
    findings,
    "ci.yml",
    "CI must fail after SARIF upload when Trivy finds HIGH/CRITICAL issues",
  );
  assert(
    enforceTrivy?.if === "steps.trivy.outcome == 'failure'",
    findings,
    "ci.yml",
    "Trivy enforcement must depend on steps.trivy.outcome",
  );

  const codeql = readWorkflow("codeql.yml");
  assert(
    codeql.permissions?.["security-events"] === "write",
    findings,
    "codeql.yml",
    "CodeQL must grant security-events: write",
  );
  assert(
    findStep(codeql, "analyze", "Initialize CodeQL")?.uses ===
      "github/codeql-action/init@v4",
    findings,
    "codeql.yml",
    "CodeQL init must use v4",
  );
  assert(
    findStep(codeql, "analyze", "Perform CodeQL analysis")?.uses ===
      "github/codeql-action/analyze@v4",
    findings,
    "codeql.yml",
    "CodeQL analyze must use v4",
  );

  const staging = readWorkflow("deploy-staging.yml");
  for (const stepName of [
    "Validate staging configuration",
    "Log in to GitHub Container Registry",
    "Set up Docker Buildx",
    "Build and push staging image",
    "Deploy to staging",
  ]) {
    const step = findStep(staging, "build-and-deploy", stepName);
    assert(
      step?.if === "vars.STAGING_ENABLED == 'true'",
      findings,
      "deploy-staging.yml",
      `${stepName} must be gated by STAGING_ENABLED`,
    );
  }

  return findings;
}

function main() {
  const findings = auditGithubActions();
  if (findings.length > 0) {
    console.error("GitHub Actions audit failed.");
    for (const finding of findings)
      console.error(`- ${finding.file}: ${finding.reason}`);
    return 1;
  }

  console.log("GitHub Actions audit passed.");
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { auditGithubActions };
