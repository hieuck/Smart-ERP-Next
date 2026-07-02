const { spawnSync } = require('node:child_process');
const path = require('node:path');

const COMMON_GATES = [
  {
    id: 'lint',
    name: 'Lint all workspaces',
    command: 'pnpm',
    args: ['lint'],
  },
  {
    id: 'i18n-runtime',
    name: 'Audit runtime i18n keys and encoding',
    command: 'pnpm',
    args: ['audit:i18n'],
  },
  {
    id: 'i18n-parity',
    name: 'Audit Vietnamese/English locale parity',
    command: 'pnpm',
    args: ['audit:i18n-parity'],
  },
  {
    id: 'secret-audit',
    name: 'Audit tracked files for high-confidence secrets',
    command: 'pnpm',
    args: ['audit:secrets'],
  },
  {
    id: 'product-traceability',
    name: 'Audit Product/QA traceability matrix',
    command: 'pnpm',
    args: ['audit:product-traceability'],
  },
  {
    id: 'team-role-readiness',
    name: 'Audit real-team role readiness coverage',
    command: 'pnpm',
    args: ['audit:team-roles'],
  },
  {
    id: 'flaky-test-policy',
    name: 'Audit focused tests and flaky quarantine ownership',
    command: 'pnpm',
    args: ['audit:flaky-tests'],
  },
  {
    id: 'type-check',
    name: 'Type-check all workspaces',
    command: 'pnpm',
    args: ['type-check'],
  },
];

const RELEASE_ONLY_GATES = [
  {
    id: 'web-build',
    name: 'Build web MVP',
    command: 'pnpm',
    args: ['--filter', '@smart-erp/web', 'build'],
  },
  {
    id: 'web-production-build',
    name: 'Verify web production build artifact',
    command: 'pnpm',
    args: ['verify:web-production'],
  },
  {
    id: 'desktop-build',
    name: 'Build or verify native Windows desktop installer',
    command: 'node',
    args: ['scripts/ensure-desktop-release-artifact.js'],
  },
  {
    id: 'mobile-type-check',
    name: 'Type-check mobile native code',
    command: 'pnpm',
    args: ['--filter', '@smart-erp/mobile', 'type-check'],
  },
  {
    id: 'e2e-assertion-audit',
    name: 'Audit E2E tests for fake-pass assertions',
    command: 'pnpm',
    args: ['audit:e2e-assertions'],
  },
  {
    id: 'api-e2e',
    name: 'Run API end-to-end tests',
    command: 'pnpm',
    args: ['test:api:e2e'],
  },
  {
    id: 'release-runtime-smoke',
    name: 'Smoke test register, product image upload, and product creation against runtime API',
    command: 'pnpm',
    args: ['smoke:release-runtime'],
  },
  {
    id: 'web-e2e',
    name: 'Run Playwright end-user web flows',
    command: 'pnpm',
    args: ['test:e2e'],
  },
  {
    id: 'native-artifact-manifest',
    name: 'Verify native artifacts exist for Android, iOS, and Windows',
    command: 'pnpm',
    args: ['verify:native-artifacts'],
  },
];

function buildGatePlan(mode = 'commit') {
  if (mode === 'commit') {
    return {
      mode,
      certifiesRelease: false,
      gates: COMMON_GATES,
    };
  }

  if (mode === 'release') {
    const skipSmoke = ['1', 'true', 'yes', 'on'].includes(String(process.env.SKIP_RELEASE_SMOKE || '').toLowerCase());
    const gates = skipSmoke
      ? [...COMMON_GATES, ...RELEASE_ONLY_GATES.filter((g) => g.id !== 'release-runtime-smoke')]
      : [...COMMON_GATES, ...RELEASE_ONLY_GATES];
    return {
      mode,
      certifiesRelease: true,
      gates,
    };
  }

  throw new Error(`Unknown quality gate mode: ${mode}`);
}

function findMissingGateIds(plan, results) {
  return plan.gates
    .filter((gate) => results.get(gate.id)?.status !== 'passed')
    .map((gate) => gate.id);
}

function formatSuccessMessage(plan) {
  if (!plan.certifiesRelease) {
    return [
      'Commit quality gate passed.',
      'Day khong phai release certification: khong duoc claim 100% san sang phat hanh neu chua chay pnpm qa:release.',
    ].join('\n');
  }

  if (['1', 'true', 'yes', 'on'].includes(String(process.env.SKIP_IOS_ARTIFACT || '').toLowerCase())) {
    return [
      'Release quality gate passed with iOS artifact intentionally skipped.',
      'Chi duoc claim release-ready cho web, API, Android, va Windows; iOS .ipa van la deferred release item.',
    ].join('\n');
  }

  return [
    'Release quality gate passed.',
    'Co the claim release-ready vi tat ca gate unit, build, e2e, native artifact da co evidence pass.',
  ].join('\n');
}

function resolveGateCommand(gate) {
  return {
    command: gate.command,
    args: gate.args,
    display: `${gate.command} ${gate.args.join(' ')}`,
    shell: process.platform === 'win32',
  };
}

function buildGateEnv(cwd = process.cwd()) {
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') || 'PATH';
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const shimDir = path.join(cwd, 'scripts', 'shims');
  const currentPath = process.env[pathKey] || '';

  return {
    ...process.env,
    [pathKey]: [shimDir, currentPath].filter(Boolean).join(pathSeparator),
  };
}

function runGate(gate, cwd = process.cwd()) {
  console.log(`\n[quality-gate] ${gate.id}: ${gate.name}`);
  const resolved = resolveGateCommand(gate);
  console.log(`[quality-gate] $ ${resolved.display}`);

  const result = spawnSync(resolved.command, resolved.args, {
    cwd,
    env: buildGateEnv(cwd),
    shell: resolved.shell,
    stdio: 'inherit',
  });

  return {
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
  };
}

function runPlan(mode = 'commit', cwd = process.cwd()) {
  const plan = buildGatePlan(mode);
  const results = new Map();

  console.log('=================================================');
  console.log(`Smart ERP Next quality gate: ${plan.mode}`);
  console.log('=================================================');

  for (const gate of plan.gates) {
    const result = runGate(gate, cwd);
    results.set(gate.id, result);

    if (result.status !== 'passed') {
      console.error(`\n[quality-gate] FAILED: ${gate.id} exited with ${result.exitCode}`);
      console.error('[quality-gate] Khong duoc claim 100% hoan thanh khi gate nay chua pass.');
      return 1;
    }
  }

  const missingGateIds = findMissingGateIds(plan, results);
  if (missingGateIds.length > 0) {
    console.error(`[quality-gate] Missing passing evidence: ${missingGateIds.join(', ')}`);
    return 1;
  }

  console.log('\n' + formatSuccessMessage(plan));
  return 0;
}

if (require.main === module) {
  const mode = process.argv[2] || 'commit';
  process.exit(runPlan(mode));
}

module.exports = {
  buildGatePlan,
  buildGateEnv,
  findMissingGateIds,
  formatSuccessMessage,
  resolveGateCommand,
  runGate,
  runPlan,
};
