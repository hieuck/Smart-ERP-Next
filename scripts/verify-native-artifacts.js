const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SEARCH_ROOTS = [
  'artifacts',
  'dist',
  'apps/mobile',
  'apps/desktop/src-tauri/target/release/bundle',
].map((relativePath) => path.join(REPO_ROOT, relativePath));

const REQUIRED_ARTIFACTS = [
  {
    platform: 'android',
    extensions: ['.apk', '.aab'],
    signatures: {
      '.aab': [[0x50, 0x4b]],
      '.apk': [[0x50, 0x4b]],
    },
  },
  {
    platform: 'ios',
    extensions: ['.ipa'],
    signatures: {
      '.ipa': [[0x50, 0x4b]],
    },
  },
  {
    platform: 'windows',
    extensions: ['.msi', '.exe'],
    signatures: {
      '.exe': [[0x4d, 0x5a]],
      '.msi': [[0xd0, 0xcf, 0x11, 0xe0]],
    },
  },
];

const MIN_ARTIFACT_BYTES = 1024;

function isTruthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function getRequiredArtifacts(env = process.env) {
  if (isTruthyEnv(env.SKIP_NATIVE_ARTIFACTS)) {
    return [];
  }

  const skipIos = isTruthyEnv(env.SKIP_IOS_ARTIFACT);
  const skipAndroid = isTruthyEnv(env.SKIP_ANDROID_ARTIFACT);
  const skipWindows = isTruthyEnv(env.SKIP_WINDOWS_ARTIFACT);
  return REQUIRED_ARTIFACTS.filter(
    (artifact) =>
      !(skipIos && artifact.platform === 'ios') &&
      !(skipAndroid && artifact.platform === 'android') &&
      !(skipWindows && artifact.platform === 'windows'),
  );
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function hasSignature(filePath, signaturesByExtension) {
  const extension = path.extname(filePath).toLowerCase();
  const signatures = signaturesByExtension[extension] || [];
  if (signatures.length === 0) return false;

  const maxSignatureLength = Math.max(...signatures.map((signature) => signature.length));
  const file = fs.openSync(filePath, 'r');

  try {
    const header = Buffer.alloc(maxSignatureLength);
    const bytesRead = fs.readSync(file, header, 0, maxSignatureLength, 0);

    return signatures.some((signature) => {
      if (bytesRead < signature.length) return false;
      return signature.every((byte, index) => header[index] === byte);
    });
  } finally {
    fs.closeSync(file);
  }
}

function isInstallableArtifact(filePath, requirement) {
  if (!fs.existsSync(filePath)) return false;

  const stats = fs.statSync(filePath);
  if (!stats.isFile() || stats.size < MIN_ARTIFACT_BYTES) return false;

  const extension = path.extname(filePath).toLowerCase();
  if (!requirement.extensions.includes(extension)) return false;

  return hasSignature(filePath, requirement.signatures);
}

function findNativeArtifacts(env = process.env) {
  const files = SEARCH_ROOTS.flatMap((root) => walkFiles(root));

  return getRequiredArtifacts(env).map((requirement) => {
    const candidates = files.filter((filePath) => {
      const extension = path.extname(filePath).toLowerCase();
      return requirement.extensions.includes(extension);
    });
    const matches = candidates.filter((filePath) => isInstallableArtifact(filePath, requirement));

    return {
      ...requirement,
      candidates,
      matches,
    };
  });
}

function main() {
  if (isTruthyEnv(process.env.SKIP_NATIVE_ARTIFACTS)) {
    console.log('Native artifact gate skipped by SKIP_NATIVE_ARTIFACTS.');
    return 0;
  }

  const artifacts = findNativeArtifacts();
  const missing = artifacts.filter((artifact) => artifact.matches.length === 0);
  const skipIos = isTruthyEnv(process.env.SKIP_IOS_ARTIFACT);

  if (missing.length > 0) {
    console.error('Native artifact gate failed.');
    console.error('Release certification requires generated installable artifacts, not only source tests.');
    for (const artifact of missing) {
      console.error(`- Missing ${artifact.platform}: ${artifact.extensions.join(' or ')}`);
    }
    return 1;
  }

  console.log('Native artifacts verified:');
  for (const artifact of artifacts) {
    console.log(`- ${artifact.platform}: ${artifact.matches[0]}`);
  }
  if (skipIos) {
    console.log('- ios: skipped by SKIP_IOS_ARTIFACT');
  }
  if (isTruthyEnv(process.env.SKIP_ANDROID_ARTIFACT)) {
    console.log('- android: skipped by SKIP_ANDROID_ARTIFACT');
  }

  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  findNativeArtifacts,
  getRequiredArtifacts,
  hasSignature,
  isInstallableArtifact,
  isTruthyEnv,
  main,
};
