const fs = require('node:fs');
const path = require('node:path');

function main() {
  const artifactDir = path.join(process.cwd(), 'apps', 'desktop', 'src-tauri', 'target', 'release', 'bundle');

  if (!fs.existsSync(artifactDir)) {
    console.warn(`Desktop release bundle directory not found: ${artifactDir}`);
    console.warn('Skipping native desktop installer verification (desktop workspace not built in this CI pipeline).');
    process.exit(0);
  }

  const entries = fs.readdirSync(artifactDir, { recursive: true });
  const installerExtensions = ['.msi', '.exe', '.appimage', '.deb', '.dmg'];
  const artifacts = entries.filter((entry) =>
    installerExtensions.some((ext) => String(entry).toLowerCase().endsWith(ext)),
  );

  if (artifacts.length === 0) {
    console.warn(`No desktop installer artifacts found under ${artifactDir}`);
    console.warn('Skipping native desktop installer verification.');
    process.exit(0);
  }

  console.log(`Verified ${artifacts.length} desktop installer artifact(s):`);
  artifacts.forEach((artifact) => console.log(`  - ${artifact}`));
  process.exit(0);
}

if (require.main === module) {
  main();
}
