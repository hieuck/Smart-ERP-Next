const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

describe('Trivy container image scan policy', () => {
  const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');

  test('ci.yml exists and is valid YAML', () => {
    expect(fs.existsSync(ciPath)).toBe(true);
    const content = fs.readFileSync(ciPath, 'utf8');
    const parsed = YAML.parse(content);
    expect(parsed).toHaveProperty('jobs');
  });

  test('container image Trivy scan uses exit-code 1 for HIGH/CRITICAL', () => {
    const content = fs.readFileSync(ciPath, 'utf8');
    const parsed = YAML.parse(content);

    const containerImageScanJob = Object.values(parsed.jobs).find(
      (job) =>
        typeof job === 'object' &&
        job.steps &&
        job.steps.some(
          (step) => step.name && step.name.includes('Run Trivy container image scan')
        )
    );

    expect(containerImageScanJob).toBeDefined();

    const scanStep = containerImageScanJob.steps.find(
      (step) => step.name && step.name.includes('Run Trivy container image scan')
    );

    expect(scanStep).toBeDefined();
    expect(scanStep.with['exit-code']).toBe('1');
    expect(scanStep.with['ignore-unfixed']).toBe(true);
    expect(scanStep['continue-on-error']).toBe(true);

    const enforceStep = containerImageScanJob.steps.find(
      (step) => step.name && step.name.includes('Enforce Trivy container image gate')
    );

    expect(enforceStep).toBeDefined();
    expect(enforceStep.run).toContain('exit 1');
  });
});
