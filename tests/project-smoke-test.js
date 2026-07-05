#!/usr/bin/env node

/**
 * Project Structure Smoke Test for Smart ERP Next
 *
 * This script validates the basic project structure and configuration
 * without requiring the application to be running.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Smart ERP Next - Project Structure Smoke Test\n');

let passed = 0;
let failed = 0;
let warnings = 0;

function test(name, testFn, isWarning = false) {
  try {
    testFn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    if (isWarning) {
      console.log(`⚠️  ${name}: ${error.message}`);
      warnings++;
    } else {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }
}

// Test 1: Monorepo structure
test('Monorepo root structure', () => {
  const rootFiles = ['package.json', 'pnpm-lock.yaml', 'turbo.json'];
  rootFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing root file: ${file}`);
    }
  });
});

// Test 2: Apps directory structure
test('Apps directory structure', () => {
  const apps = ['api', 'web'];
  apps.forEach(app => {
    const appDir = `apps/${app}`;
    if (!fs.existsSync(appDir)) {
      throw new Error(`Missing app directory: ${appDir}`);
    }

    // Check for src directory in each app
    const srcDir = `${appDir}/src`;
    if (!fs.existsSync(srcDir)) {
      throw new Error(`Missing src directory in ${appDir}`);
    }
  });
});

// Test 3: Packages directory structure
test('Packages directory structure', () => {
  const packages = ['database', 'shared', 'types', 'utils', 'validation', 'sync', 'accounting'];
  packages.forEach(pkg => {
    const pkgDir = `packages/${pkg}`;
    if (!fs.existsSync(pkgDir)) {
      throw new Error(`Missing package directory: ${pkgDir}`);
    }
  });
});

// Test 4: API specific structure
test('API structure', () => {
  const apiFiles = [
    'apps/api/src/app.module.ts',
    'apps/api/src/main.ts',
    'apps/api/tsconfig.json',
    'apps/api/package.json'
  ];

  apiFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing API file: ${file}`);
    }
  });
});

// Test 5: Web specific structure
test('Web structure', () => {
  const webFiles = [
    'apps/web/package.json',
    'apps/web/next.config.mjs'
  ];

  webFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing Web file: ${file}`);
    }
  });
});

// Test 6: Database package structure
test('Database package structure', () => {
  const dbFiles = [
    'packages/database/src/index.ts',
    'packages/database/src/schema/index.ts',
    'packages/database/package.json'
  ];

  dbFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing database file: ${file}`);
    }
  });
});

// Test 7: Web i18n locale files
test('Web i18n locale files', () => {
  const i18nFiles = [
    'apps/web/src/lib/locales/vi/common.json',
    'apps/web/src/lib/locales/en/common.json'
  ];

  i18nFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing i18n file: ${file}`);
    }
  });
});

// Test 8: Configuration files
test('Configuration files', () => {
  const requiredConfigFiles = [
    '.gitignore',
    'jest.config.js'
  ];

  requiredConfigFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing required config file: ${file}`);
    }
  });

  // Check for TypeScript config
  const tsConfigs = ['tsconfig.json', 'packages/config-typescript/base.json'];
  const hasTsConfig = tsConfigs.some(config => fs.existsSync(config));
  if (!hasTsConfig) {
    console.log('⚠️  TypeScript configuration not found (checking packages/config-typescript)');
  }

  // Optional config files (warnings only)
  const optionalConfigFiles = ['.prettierrc', '.prettierrc.json', '.prettierrc.js'];
  const hasPrettierConfig = optionalConfigFiles.some(config => fs.existsSync(config));
  if (!hasPrettierConfig) {
    console.log('⚠️  Prettier configuration not found (optional)');
  }

  // Check for ESLint config in any common location
  const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc'];
  const hasEslintConfig = eslintConfigs.some(config => fs.existsSync(config));

  if (!hasEslintConfig) {
    // Check if ESLint config exists in app directories
    const appEslintConfigs = [
      'apps/web/.eslintrc.json',
      'apps/api/.eslintrc.js'
    ];

    const hasAppEslintConfig = appEslintConfigs.some(config => fs.existsSync(config));
    if (!hasAppEslintConfig) {
      console.log('⚠️  ESLint configuration not found (optional)');
    }
  }
}, true);

// Test 9: Documentation files
test('Documentation files', () => {
  const docsFiles = [
    'README.md',
    'CLAUDE.md'
  ];

  docsFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`⚠️  Missing documentation: ${file} (warning)`);
      warnings++;
    }
  });
}, true);

// Test 10: Test files exist
test('Test infrastructure', () => {
  const testFiles = [
    'playwright.config.ts',
    'tests/',
    'apps/api/jest.config.js'
  ];

  testFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing test file/directory: ${file}`);
    }
  });
});

// Test 11: Package.json scripts
test('Package.json scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'build', 'test', 'lint'];

  requiredScripts.forEach(script => {
    if (!packageJson.scripts || !packageJson.scripts[script]) {
      throw new Error(`Missing script in package.json: ${script}`);
    }
  });
});

// Test 12: UTF-8 encoding check for Vietnamese files
test('Vietnamese encoding check', () => {
  // Check a sample Vietnamese file
  const viFile = 'packages/i18n/src/locales/vi/common.json';
  if (fs.existsSync(viFile)) {
    const content = fs.readFileSync(viFile, 'utf8');
    // Check for common Vietnamese characters
    const vietnameseChars = ['á', 'à', 'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ', 'đ', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ', 'í', 'ì', 'ỉ', 'ĩ', 'ị', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'];

    let found = false;
    for (const char of vietnameseChars) {
      if (content.includes(char)) {
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('⚠️  No Vietnamese characters found in i18n file (may be empty)');
      warnings++;
    }
  }
}, true);

console.log('\n📊 Test Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\n🚨 Critical issues found! Please fix the failed tests above.');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Some warnings found. Review the warnings above.');
  process.exit(0);
} else {
  console.log('\n🎉 All tests passed! Project structure is valid.');
  process.exit(0);
}