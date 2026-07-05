#!/usr/bin/env node
// Audit that version is a Single Source of Truth (SSOT) across the monorepo.
// The root package.json is the SSOT; all public-facing apps must use it.

const fs = require('fs');
const path = require('path');

const packages = [
  { name: 'root', relative: 'package.json' },
  { name: 'apps/api', relative: path.join('apps', 'api', 'package.json') },
  { name: 'apps/web', relative: path.join('apps', 'web', 'package.json') },
];

function readVersion(base, relative) {
  const file = path.join(base, relative);
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  if (!json.version) {
    throw new Error(`Missing version in ${relative}`);
  }
  return json.version;
}

function main(base = process.cwd()) {
  const versions = packages.map((p) => ({
    ...p,
    version: readVersion(base, p.relative),
  }));

  const rootVersion = versions.find((v) => v.name === 'root').version;
  const mismatches = versions.filter((v) => v.version !== rootVersion);

  if (mismatches.length > 0) {
    const lines = ['Version SSOT mismatch detected:'];
    for (const m of mismatches) {
      lines.push(`  ${m.name}: ${m.version} (expected ${rootVersion})`);
    }
    throw new Error(lines.join('\n'));
  }

  const appController = fs.readFileSync(
    path.join(base, 'apps', 'api', 'src', 'app.controller.ts'),
    'utf8',
  );
  const hardcodedVersionMatch = appController.match(
    /version:\s*['"]\d+\.\d+\.\d+['"]/,
  );
  if (hardcodedVersionMatch) {
    throw new Error(
      `apps/api/src/app.controller.ts still contains a hardcoded version: ${hardcodedVersionMatch[0]}`,
    );
  }

  return rootVersion;
}

if (require.main === module) {
  try {
    const version = main();
    console.log(`Version SSOT OK: ${version}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { main, readVersion, packages };
