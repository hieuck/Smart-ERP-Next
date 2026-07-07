const fs = require('fs');
const path = require('path');

const localesDir = path.resolve(__dirname, '..', 'apps', 'api', 'src', 'i18n', 'locales');

if (!fs.existsSync(localesDir)) {
  console.error(`Locales directory not found: ${localesDir}`);
  process.exit(1);
}

let failed = false;
for (const entry of fs.readdirSync(localesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const filePath = path.join(localesDir, entry.name, 'common.json');
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Invalid JSON in ${filePath}: ${message}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('All API locale JSON files are valid.');
