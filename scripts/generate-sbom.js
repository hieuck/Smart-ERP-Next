/**
 * SBOM (Software Bill of Materials) Generator
 *
 * Generates a CycloneDX-compatible SBOM from pnpm-lock.yaml.
 * Usage: node scripts/generate-sbom.js [output-path]
 *
 * Output: JSON file with all direct and transitive dependencies
 */

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { parse } = require('yaml');

const outputPath = process.argv[2] || join(__dirname, '..', 'sbom.json');

function generate() {
  const lockPath = join(__dirname, '..', 'pnpm-lock.yaml');
  const lockData = readFileSync(lockPath, 'utf8');
  const lock = parse(lockData);

  const packages = Object.entries(lock.packages || {}).map(([spec, info]) => ({
    name: spec.split('@')[0] || spec,
    version: (info as any).version,
    resolved: (info as any).resolution?.integrity,
    license: (info as any).license,
  }));

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'SmartERP', name: 'sbom-generator', version: '1.0.0' }],
      component: {
        name: 'smart-erp-next',
        version: process.env.npm_package_version || '1.0.0',
        type: 'application',
      },
    },
    components: packages.map((p) => ({
      type: 'library',
      name: p.name,
      version: p.version,
      hashes: p.resolved ? [{ alg: 'SHA-512', content: p.resolved }] : undefined,
    })),
  };

  writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
  console.log(`SBOM generated: ${outputPath} (${packages.length} components)`);
}

generate();
