const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const GAPS_FILE = "GAPS.md";

function section(content, startHeading, endHeading) {
  const start = content.indexOf(startHeading);
  if (start === -1) return "";
  const end = endHeading
    ? content.indexOf(endHeading, start + startHeading.length)
    : -1;
  return content.slice(start, end === -1 ? content.length : end);
}

function countGapRows(markdown) {
  // Count rows that look like a Gap | Priority | Fix table row,
  // ignoring header rows and section dividers.
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .filter((line) => !/^\|\s*(Gap|Item|Role area|ID)\s*\|/.test(line))
    .filter((line) => /^\|[^|]+\|\s*(High|Medium|Low|Critical|\*\*High\*\*|None)\s*\|/.test(line)).length;
}

function extractSummaryCounts(content) {
  const match = content.match(/Completed:\s*(\d+)\s*\|\s*Remaining:\s*(\d+)/);
  if (!match) return null;
  return { completed: Number(match[1]), remaining: Number(match[2]) };
}

function auditGaps(repoRoot = REPO_ROOT) {
  const content = fs.readFileSync(path.join(repoRoot, GAPS_FILE), "utf8");
  const findings = [];
  const counts = extractSummaryCounts(content);

  if (!counts) {
    findings.push('Summary line must include "Completed: N | Remaining: N".');
    return findings;
  }

  const completedSection = section(content, "## Completed", "## Remaining");
  const completedRows = countGapRows(completedSection);
  if (counts.completed !== completedRows) {
    findings.push(
      `Completed summary says ${counts.completed}, but Completed table has ${completedRows} gap rows.`,
    );
  }

  const remainingSection = section(
    content,
    "## Remaining",
    "## Team Role Assessment Addendum",
  );
  const remainingRows = countGapRows(remainingSection);
  if (counts.remaining !== remainingRows) {
    findings.push(
      `Remaining summary says ${counts.remaining}, but Remaining table has ${remainingRows} gap rows.`,
    );
  }

  if (/\bstaging infrastructure,\s*staging infrastructure\b/i.test(content)) {
    findings.push(
      'Team Role Assessment Addendum repeats "staging infrastructure".',
    );
  }

  if (
    remainingRows > 0 &&
    !/blocked on infrastructure|blocked by infrastructure|blocked on hạ tầng|blocked by hạ tầng/i.test(
      remainingSection,
    )
  ) {
    findings.push(
      "Remaining infrastructure gaps must clearly say they are blocked on infrastructure.",
    );
  }

  return findings;
}

function main() {
  const findings = auditGaps();
  if (findings.length > 0) {
    console.error("Gaps audit failed.");
    for (const finding of findings) console.error(`- ${GAPS_FILE}: ${finding}`);
    return 1;
  }

  console.log("Gaps audit passed.");
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { auditGaps, countGapRows, extractSummaryCounts };
