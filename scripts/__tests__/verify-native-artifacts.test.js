const {
  findNativeArtifacts,
  getRequiredArtifacts,
  isInstallableArtifact,
  isTruthyEnv,
  main,
} = require('../verify-native-artifacts');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('native artifact verifier', () => {
  it('requires iOS artifacts by default', () => {
    const platforms = getRequiredArtifacts({}).map((artifact) => artifact.platform);

    expect(platforms).toEqual(['android', 'ios', 'windows']);
  });

  it('allows iOS artifact checks to be intentionally skipped', () => {
    const platforms = getRequiredArtifacts({ SKIP_IOS_ARTIFACT: '1' }).map((artifact) => artifact.platform);

    expect(platforms).toEqual(['android', 'windows']);
  });

  it('skips all native artifacts when SKIP_NATIVE_ARTIFACTS is truthy', () => {
    const artifacts = getRequiredArtifacts({ SKIP_NATIVE_ARTIFACTS: 'true' });

    expect(artifacts).toHaveLength(0);
  });

  it('accepts common truthy environment values', () => {
    expect(isTruthyEnv('1')).toBe(true);
    expect(isTruthyEnv('true')).toBe(true);
    expect(isTruthyEnv('yes')).toBe(true);
    expect(isTruthyEnv('on')).toBe(true);
    expect(isTruthyEnv('0')).toBe(false);
  });

  it('rejects placeholder files even when the extension matches', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-artifact-'));
    const fakeIpa = path.join(tempDir, 'fake.ipa');
    fs.writeFileSync(fakeIpa, 'not a real ipa');

    expect(isInstallableArtifact(fakeIpa, getRequiredArtifacts({})[1])).toBe(false);
  });

  it('accepts installable-looking archives with a valid zip signature', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-artifact-'));
    const ipa = path.join(tempDir, 'app.ipa');
    const payload = Buffer.alloc(2048);
    payload[0] = 0x50;
    payload[1] = 0x4b;
    fs.writeFileSync(ipa, payload);

    expect(isInstallableArtifact(ipa, getRequiredArtifacts({})[1])).toBe(true);
  });

  it('returns empty matches for all platforms when search roots do not exist', () => {
    const artifacts = findNativeArtifacts({});
    for (const artifact of artifacts) {
      expect(artifact.matches).toHaveLength(0);
    }
  });

  it('exits 0 when SKIP_NATIVE_ARTIFACTS disables the gate', () => {
    const original = process.env.SKIP_NATIVE_ARTIFACTS;
    process.env.SKIP_NATIVE_ARTIFACTS = 'true';
    try {
      expect(main()).toBe(0);
    } finally {
      if (original === undefined) {
        delete process.env.SKIP_NATIVE_ARTIFACTS;
      } else {
        process.env.SKIP_NATIVE_ARTIFACTS = original;
      }
    }
  });
});
