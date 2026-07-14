const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

describe('Release workflow', () => {
  const releaseWorkflowPath = path.resolve(
    __dirname,
    '../../.github/workflows/release.yml'
  );

  test('release.yml exists and is valid YAML', () => {
    expect(fs.existsSync(releaseWorkflowPath)).toBe(true);
    const content = fs.readFileSync(releaseWorkflowPath, 'utf8');
    const parsed = YAML.parse(content);
    expect(parsed).toHaveProperty('jobs');
  });

  test('release workflow runs qa:release before publishing', () => {
    const content = fs.readFileSync(releaseWorkflowPath, 'utf8');
    const parsed = YAML.parse(content);

    const hasQaReleaseJob = Object.values(parsed.jobs).some(
      (job) =>
        typeof job === 'object' &&
        job.steps &&
        job.steps.some(
          (step) =>
            step.run &&
            (step.run.includes('pnpm qa:release') ||
              step.run.includes('quality-gate.js release'))
        )
    );
    expect(hasQaReleaseJob).toBe(true);

    const dockerJob = parsed.jobs['docker-images'];
    expect(dockerJob).toBeDefined();
    expect(dockerJob.needs).toContain('qa-release');

    const createReleaseJob = parsed.jobs['create-release'];
    expect(createReleaseJob).toBeDefined();
    expect(createReleaseJob.needs).toContain('qa-release');
  });
});
