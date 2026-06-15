const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

function readWorkflow(name) {
  return fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', name), 'utf8');
}

function readWorkflowNames() {
  return fs
    .readdirSync(path.join(__dirname, '..', '..', '.github', 'workflows'))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
}

describe('GitHub workflow definitions', () => {
  it('keeps the release workflow valid YAML', () => {
    const workflow = readWorkflow('release.yml');
    const doc = YAML.parseDocument(workflow, { prettyErrors: true });

    expect(doc.errors).toEqual([]);
  });

  it('does not bypass release coverage or quality gate failures', () => {
    const workflow = readWorkflow('release.yml');

    expect(workflow).toContain('pnpm qa:release');
    expect(workflow).toContain('SKIP_IOS_ARTIFACT: ${{');
    expect(workflow).not.toMatch(/\|\|\s*echo/i);
    expect(workflow).not.toContain('continuing release build');
  });

  it('builds native artifacts before certifying a release', () => {
    const workflow = readWorkflow('release.yml');
    const doc = YAML.parse(workflow);

    expect(doc.jobs['mobile-native-artifacts']).toBeDefined();
    expect(doc.jobs['windows-native-artifacts']).toBeDefined();
    expect(doc.jobs['certify-release'].needs).toEqual([
      'mobile-native-artifacts',
      'windows-native-artifacts',
    ]);
    expect(workflow).toContain('EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}');
    expect(workflow).toContain('EAS_PROJECT_ID: ${{ secrets.EAS_PROJECT_ID }}');
    expect(workflow).toContain("SKIP_IOS_SIGNING: ${{ secrets.EAS_IOS_CREDENTIALS_READY == '' && 'true' || '' }}");
    expect(workflow).toContain('ASC_API_KEY_ID: ${{ secrets.ASC_API_KEY_ID }}');
    expect(workflow).toContain('pnpm verify:ios-release-prereqs');
    expect(workflow).toContain('eas build --platform android');
    expect(workflow).toContain('eas build --platform ios');
    expect(workflow).toContain('if: ${{ secrets.EXPO_TOKEN != \'\' }}');
    expect(workflow).toContain('node scripts/download-eas-artifacts.js');
    expect(workflow).toContain('pnpm --filter @smart-erp/desktop windows:build');
    expect(workflow).toContain('actions/download-artifact@v4');
    expect(workflow).toContain("pattern: '*-native-artifacts'");
  });

  it('runs CI on the default branch and uses the project E2E command', () => {
    const workflow = readWorkflow('ci.yml');
    const doc = YAML.parse(workflow);

    expect(doc.on.push.branches).toContain('main');
    expect(doc.on.pull_request.branches).toContain('main');
    expect(workflow).toContain('pnpm test:e2e');
    expect(workflow).not.toContain('npx playwright test');
  });

  it('provisions the API E2E database before running API E2E tests', () => {
    const workflow = readWorkflow('ci.yml');
    const doc = YAML.parse(workflow);
    const job = doc.jobs['test-and-build'];
    const steps = job.steps;
    const apiE2EStepIndex = steps.findIndex((step) => step.name === 'Run API E2E tests');
    const webE2EStepIndex = steps.findIndex((step) => step.name === 'Run web E2E tests');
    const migrateStepIndex = steps.findIndex((step) => step.name === 'Apply database migrations');
    const migrateStep = steps[migrateStepIndex];
    const apiE2EStep = steps[apiE2EStepIndex];
    const webE2EStep = steps[webE2EStepIndex];

    expect(job.services?.postgres).toBeDefined();
    expect(job.env?.DATABASE_URL).toBeUndefined();
    expect(migrateStepIndex).toBeGreaterThan(-1);
    expect(apiE2EStepIndex).toBeGreaterThan(migrateStepIndex);
    expect(migrateStep.env?.DATABASE_URL).toMatch(/^postgresql:\/\/postgres:postgres@localhost:5432\//);
    expect(apiE2EStep.env?.DATABASE_URL).toMatch(/^postgresql:\/\/postgres:postgres@localhost:5432\//);
    expect(webE2EStep.env?.DATABASE_URL).toMatch(/^postgresql:\/\/postgres:postgres@localhost:5432\//);
    expect(webE2EStep.env?.PORT).toBe('3001');
    expect(webE2EStep.env?.NEXT_PUBLIC_API_URL).toBe('http://localhost:3456');
    expect(migrateStep.run).toContain('drizzle-kit migrate');
    expect(apiE2EStep.run).toBe('pnpm test:api:e2e');
  });

  it('uses packageManager as the single pnpm version source', () => {
    for (const workflowName of readWorkflowNames()) {
      const doc = YAML.parse(readWorkflow(workflowName));

      for (const job of Object.values(doc.jobs)) {
        for (const step of job.steps) {
          if (step.uses?.startsWith('pnpm/action-setup@')) {
            expect(step.with?.version).toBeUndefined();
          }
        }
      }
    }
  });

  it('uses a Node version compatible with workspace dependencies', () => {
    for (const workflowName of readWorkflowNames()) {
      const doc = YAML.parse(readWorkflow(workflowName));

      for (const job of Object.values(doc.jobs)) {
        for (const step of job.steps) {
          if (step.uses?.startsWith('actions/setup-node@')) {
            expect(String(step.with?.['node-version'])).toBe('22');
          }
        }
      }
    }
  });
});
