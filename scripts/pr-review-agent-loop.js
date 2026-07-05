#!/usr/bin/env node
/**
 * PR Review & Repository Agent - event-driven polling loop
 *
 * Chế độ ngủ/kích hoạt:
 *   - Ngủ (sleep) khi không có PR mở hoặc không có sự kiện/thay đổi.
 *   - Thức dậy (wake) khi phát hiện:
 *     + PR mới được mở
 *     + Có commit mới push lên PR
 *     + CI status thay đổi
 *     + Review được request
 *   - Sau khi xử lý xong thì quay lại ngủ.
 *
 * Tiêu chí review trước khi approve/merge:
 *   - Base branch đúng (mặc định main)
 *   - Không conflict
 *   - CI success
 *   - Không có review CHANGES_REQUESTED
 *   - Review decision đạt APPROVED
 *
 * Hành động:
 *   - Request changes nếu CI fail/conflict/thiếu yêu cầu.
 *   - Approve nếu đạt chuẩn.
 *   - Merge nếu AUTO_MERGE=true.
 *   - Xóa branch sau merge.
 *   - Đóng linked issues.
 *
 * Môi trường:
 *   POLL_INTERVAL_MS  - khoảng thời gian ngủ giữa các lần poll (mặc định 60000)
 *   AUTO_MERGE        - "true" để tự động merge PR đạt chuẩn (mặc định false)
 *   BASE_BRANCH       - branch đích (mặc định main)
 *   MAX_ITERATIONS    - giới hạn vòng lặp, không set thì vô hạn
 *   STATE_FILE        - file lưu trạng thái (mặc định scripts/.pr-agent-state.json)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    intervalMs: Number(process.env.POLL_INTERVAL_MS || '60000'),
    autoMerge: process.env.AUTO_MERGE === 'true',
    baseBranch: process.env.BASE_BRANCH || 'main',
    maxIterations: process.env.MAX_ITERATIONS
      ? Number(process.env.MAX_ITERATIONS)
      : Infinity,
    stateFile: process.env.STATE_FILE || null,
    resetState: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--interval-ms' || arg === '-i') {
      args.intervalMs = Number(next);
      i += 1;
    } else if (arg === '--auto-merge') {
      args.autoMerge = true;
    } else if (arg === '--base-branch') {
      args.baseBranch = next;
      i += 1;
    } else if (arg === '--max-iterations' || arg === '-n') {
      args.maxIterations = Number(next);
      i += 1;
    } else if (arg === '--state-file') {
      args.stateFile = next;
      i += 1;
    } else if (arg === '--reset-state') {
      args.resetState = true;
    }
  }

  if (!args.stateFile) {
    args.stateFile = path.join(__dirname, '.pr-agent-state.json');
  }

  return args;
}

const ARGS = parseArgs(process.argv);
const INTERVAL_MS = ARGS.intervalMs;
const AUTO_MERGE = ARGS.autoMerge;
const BASE_BRANCH = ARGS.baseBranch;
const MAX_ITERATIONS = ARGS.maxIterations;
const STATE_FILE = ARGS.stateFile;

function log(level, message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${message}`);
}

function run(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return {
      ok: false,
      output: error.stdout ? error.stdout.toString().trim() : '',
      stderr: error.stderr ? error.stderr.toString().trim() : error.message,
      code: error.status,
    };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log('WARN', `Không đọc được state file: ${e.message}`);
  }
  return {};
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log('WARN', `Không ghi được state file: ${e.message}`);
  }
}

function fetchOpenPRs() {
  const result = run(
    'gh pr list --state open --json ' +
      'number,title,author,headRefName,baseRefName,headRefOid,' +
      'mergeStateStatus,mergeable,reviewDecision,statusCheckRollup,' +
      'reviewRequests,updatedAt,url',
  );
  if (!result.ok) {
    log('ERROR', `Không thể lấy danh sách PR: ${result.stderr}`);
    return [];
  }
  try {
    return JSON.parse(result.output || '[]');
  } catch (e) {
    log('ERROR', `Lỗi parse JSON PR list: ${e.message}`);
    return [];
  }
}

function fetchPRReviews(prNumber) {
  const result = run(`gh pr view ${prNumber} --json reviews`);
  if (!result.ok) {
    log('WARN', `Không thể lấy reviews cho PR #${prNumber}: ${result.stderr}`);
    return [];
  }
  try {
    const parsed = JSON.parse(result.output || '{}');
    return Array.isArray(parsed.reviews) ? parsed.reviews : [];
  } catch (e) {
    log('WARN', `Lỗi parse reviews PR #${prNumber}: ${e.message}`);
    return [];
  }
}

function fetchLinkedIssues(prNumber) {
  const result = run(
    `gh pr view ${prNumber} --json closingIssuesReferences`,
  );
  if (!result.ok) {
    log('WARN', `Không thể lấy linked issues PR #${prNumber}: ${result.stderr}`);
    return [];
  }
  try {
    const parsed = JSON.parse(result.output || '{}');
    const refs = Array.isArray(parsed.closingIssuesReferences)
      ? parsed.closingIssuesReferences
      : [];
    return refs.map((ref) => ref.number).filter(Boolean);
  } catch (e) {
    log('WARN', `Lỗi parse linked issues PR #${prNumber}: ${e.message}`);
    return [];
  }
}

function normalizeReviewRequests(requests) {
  if (!Array.isArray(requests)) return [];
  return requests
    .map((r) => (typeof r === 'string' ? r : r?.login || r?.slug || String(r)))
    .sort();
}

function detectEvents(pr, previous) {
  const events = [];
  if (!previous) {
    events.push('NEW_PR');
    return events;
  }
  if (pr.headRefOid !== previous.headRefOid) {
    events.push('NEW_COMMITS');
  }
  if (pr.statusCheckRollup?.state !== previous.statusCheckRollup?.state) {
    events.push('CI_CHANGED');
  }
  if (pr.mergeStateStatus !== previous.mergeStateStatus) {
    events.push('MERGE_STATUS_CHANGED');
  }
  const prevRequests = normalizeReviewRequests(previous.reviewRequests);
  const currRequests = normalizeReviewRequests(pr.reviewRequests);
  if (JSON.stringify(prevRequests) !== JSON.stringify(currRequests)) {
    events.push('REVIEW_REQUESTED');
  }
  return events;
}

function buildPRSnapshot(pr) {
  return {
    number: pr.number,
    headRefOid: pr.headRefOid,
    mergeStateStatus: pr.mergeStateStatus,
    mergeable: pr.mergeable,
    reviewDecision: pr.reviewDecision,
    statusCheckRollup: pr.statusCheckRollup,
    reviewRequests: pr.reviewRequests,
    updatedAt: pr.updatedAt,
  };
}

function evaluatePR(pr, reviews) {
  const hasChangesRequested = reviews.some(
    (r) => r.state === 'CHANGES_REQUESTED',
  );

  const issues = [];
  if (pr.baseRefName !== BASE_BRANCH) {
    issues.push(`base branch is ${pr.baseRefName}, expected ${BASE_BRANCH}`);
  }
  if (!(pr.mergeStateStatus === 'CLEAN' && pr.mergeable === 'MERGEABLE')) {
    issues.push(`not mergeable (status=${pr.mergeStateStatus}, mergeable=${pr.mergeable})`);
  }
  if (pr.statusCheckRollup?.state !== 'SUCCESS') {
    issues.push(`CI status is ${pr.statusCheckRollup?.state || 'unknown'}`);
  }
  if (hasChangesRequested) {
    issues.push('has CHANGES_REQUESTED reviews');
  }
  if (pr.reviewDecision !== 'APPROVED') {
    issues.push(`review decision is ${pr.reviewDecision || 'none'}`);
  }

  return {
    ready: issues.length === 0,
    issues,
    hasChangesRequested,
  };
}

function escapeForDoubleQuotedShellArg(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function requestChanges(pr, issues) {
  const body =
    `PR chưa đạt yêu cầu để merge:\n` +
    issues.map((i) => `- ${i}`).join('\n');
  log('ACTION', `Request changes on PR #${pr.number}: ${pr.title}`);
  const result = run(
    `gh pr review ${pr.number} --request-changes --body "${escapeForDoubleQuotedShellArg(body)}"`,
  );
  if (!result.ok) {
    log('ERROR', `Request changes PR #${pr.number} thất bại: ${result.stderr}`);
    return false;
  }
  log('SUCCESS', `Đã request changes trên PR #${pr.number}.`);
  return true;
}

function approvePR(pr) {
  log('ACTION', `Approve PR #${pr.number}: ${pr.title}`);
  const result = run(
    `gh pr review ${pr.number} --approve --body "Tất cả tiêu chí đã đạt."`,
  );
  if (!result.ok) {
    log('ERROR', `Approve PR #${pr.number} thất bại: ${result.stderr}`);
    return false;
  }
  log('SUCCESS', `Đã approve PR #${pr.number}.`);
  return true;
}

function mergePR(pr) {
  log('ACTION', `Merge PR #${pr.number}: ${pr.title}`);
  const result = run(
    `gh pr merge ${pr.number} --merge --delete-branch --subject "Merge pull request #${pr.number}: ${pr.title}"`,
  );
  if (!result.ok) {
    log('ERROR', `Merge PR #${pr.number} thất bại: ${result.stderr}`);
    return false;
  }
  log('SUCCESS', `PR #${pr.number} đã merge và branch đã xóa.`);
  return true;
}

function closeLinkedIssues(prNumber, issueNumbers) {
  for (const issueNumber of issueNumbers) {
    log('ACTION', `Đóng issue #${issueNumber} (linked từ PR #${prNumber})`);
    const result = run(
      `gh issue close ${issueNumber} --comment "Đã giải quyết qua PR #${prNumber}."`,
    );
    if (!result.ok) {
      log('WARN', `Không thể đóng issue #${issueNumber}: ${result.stderr}`);
    }
  }
}

async function processPR(pr, previous, state) {
  const events = detectEvents(pr, previous);
  const reviews = fetchPRReviews(pr.number);
  const evaluation = evaluatePR(pr, reviews);

  if (events.length > 0) {
    log('WAKE', `PR #${pr.number} events: ${events.join(', ')}`);
  }

  if (!evaluation.ready) {
    log(
      'INFO',
      `PR #${pr.number} chưa đạt: ${evaluation.issues.join('; ')}`,
    );

    if (events.length > 0 && AUTO_MERGE) {
      requestChanges(pr, evaluation.issues);
    }
    return;
  }

  log('INFO', `PR #${pr.number} đạt tất cả tiêu chí.`);

  if (pr.reviewDecision !== 'APPROVED') {
    if (AUTO_MERGE) {
      approvePR(pr);
    } else {
      log(
        'INFO',
        `AUTO_MERGE=false, bỏ qua approve PR #${pr.number}.`,
      );
      return;
    }
  }

  if (!AUTO_MERGE) {
    log(
      'INFO',
      `AUTO_MERGE=false, bỏ qua merge PR #${pr.number}. Set AUTO_MERGE=true để tự động merge.`,
    );
    return;
  }

  const merged = mergePR(pr);
  if (merged) {
    const linkedIssues = fetchLinkedIssues(pr.number);
    if (linkedIssues.length > 0) {
      closeLinkedIssues(pr.number, linkedIssues);
    }
  }
}

async function processPRs(prs, state) {
  const previousByNumber = state.prs || {};
  let woke = false;

  if (prs.length === 0) {
    if (state.hadOpenPRs) {
      log('WAKE', 'Tất cả PR đã đóng/merge.');
      state.hadOpenPRs = false;
    }
    log('INFO', 'Không có PR nào đang mở. SLEEP.');
    return;
  }

  state.hadOpenPRs = true;

  for (const pr of prs) {
    const previous = previousByNumber[pr.number];
    const events = detectEvents(pr, previous);
    if (events.length > 0) {
      woke = true;
    }

    await processPR(pr, previous, state);

    previousByNumber[pr.number] = buildPRSnapshot(pr);
  }

  // Xóa các PR không còn mở khỏi state
  const openNumbers = new Set(prs.map((p) => p.number));
  for (const num of Object.keys(previousByNumber)) {
    if (!openNumbers.has(Number(num))) {
      delete previousByNumber[num];
    }
  }

  state.prs = previousByNumber;

  if (!woke) {
    log('INFO', 'Không có sự kiện mới. SLEEP.');
  }
}

async function main() {
  log('INFO', 'PR Review & Repository Agent started.');
  log(
    'INFO',
    `Cấu hình: INTERVAL=${INTERVAL_MS}ms, AUTO_MERGE=${AUTO_MERGE}, BASE_BRANCH=${BASE_BRANCH}, MAX_ITERATIONS=${MAX_ITERATIONS === Infinity ? '∞' : MAX_ITERATIONS}, STATE_FILE=${STATE_FILE}`,
  );

  if (ARGS.resetState) {
    try {
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
        log('INFO', `Đã xóa state file: ${STATE_FILE}`);
      }
    } catch (e) {
      log('WARN', `Không thể xóa state file: ${e.message}`);
    }
  }

  const state = loadState();

  let iteration = 0;
  while (iteration < MAX_ITERATIONS) {
    iteration += 1;
    log('INFO', `--- Poll #${iteration} ---`);

    const prs = fetchOpenPRs();
    await processPRs(prs, state);
    saveState(state);

    if (iteration < MAX_ITERATIONS) {
      log('INFO', `Sleep ${INTERVAL_MS}ms...`);
      await sleep(INTERVAL_MS);
    }
  }

  log('INFO', 'Đạt MAX_ITERATIONS. Kết thúc.');
}

main().catch((err) => {
  log('ERROR', `Lỗi không xử lý được: ${err.message}`);
  process.exit(1);
});
