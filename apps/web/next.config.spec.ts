import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('next.config.mjs', () => {
  it('does not list the non-existent @smart-erp/ui package in transpilePackages', () => {
    const configPath = path.join(__dirname, 'next.config.mjs');
    const contents = readFileSync(configPath, 'utf-8');

    const match = contents.match(/transpilePackages:\s*\[([\s\S]*?)\]/);
    expect(match).toBeTruthy();

    const packages = match![1]
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    expect(packages).not.toContain("'@smart-erp/ui'");
  });
});
