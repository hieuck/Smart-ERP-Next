import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('PWA manifest', () => {
  it('exists in apps/web/public and contains required PWA fields', () => {
    const manifestPath = path.join(__dirname, 'public', 'manifest.json');
    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
