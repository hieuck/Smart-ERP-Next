const fs = require('node:fs');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function hasAscApiKey(env = process.env) {
  return Boolean(
    env.ASC_API_KEY_ID &&
      env.ASC_API_KEY_ISSUER_ID &&
      env.ASC_API_KEY_PATH &&
      fs.existsSync(env.ASC_API_KEY_PATH),
  );
}

function findIosPrereqFindings(env = process.env) {
  const missing = [];
  const warnings = [];

  const skipSigning = isTruthy(env.SKIP_IOS_SIGNING);

  if (!skipSigning) {
    if (!env.EXPO_TOKEN) missing.push('EXPO_TOKEN');

    const projectId = env.EAS_PROJECT_ID || env.EXPO_PROJECT_ID;
    if (!projectId) {
      missing.push('EAS_PROJECT_ID');
    } else if (!UUID_PATTERN.test(projectId)) {
      missing.push('EAS_PROJECT_ID must be a UUID');
    }

    const hasSigningProof =
      isTruthy(env.EAS_IOS_CREDENTIALS_READY) ||
      hasAscApiKey(env) ||
      Boolean(env.APPLE_ID && env.EXPO_APPLE_APP_SPECIFIC_PASSWORD);

    if (!hasSigningProof) {
      missing.push('iOS signing credentials');
      warnings.push(
        'Set EAS_IOS_CREDENTIALS_READY=true when Apple signing is already configured in EAS, or provide ASC_API_KEY_ID/ASC_API_KEY_ISSUER_ID/ASC_API_KEY_PATH, or APPLE_ID/EXPO_APPLE_APP_SPECIFIC_PASSWORD.',
      );
    }
  }

  return { missing, warnings };
}

function main() {
  const findings = findIosPrereqFindings();

  if (findings.missing.length > 0) {
    console.error('iOS release preflight failed.');
    console.error('Release-ready certification requires a real EAS iOS build that can produce an installable .ipa.');
    for (const item of findings.missing) {
      console.error(`- Missing ${item}`);
    }
    for (const warning of findings.warnings) {
      console.error(`- ${warning}`);
    }
    return 1;
  }

  console.log('iOS release preflight passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  findIosPrereqFindings,
  hasAscApiKey,
  isTruthy,
  main,
};
