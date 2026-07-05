const fs = require('fs');
const path = require('path');
const { main } = require('../audit-version-ssot');

jest.mock('fs');

describe('audit-version-ssot', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  function mockFiles(versions, controllerSource) {
    const fileMap = {
      [path.join(process.cwd(), 'package.json')]: JSON.stringify({ version: versions.root }),
      [path.join(process.cwd(), 'apps', 'api', 'package.json')]: JSON.stringify({ version: versions.api }),
      [path.join(process.cwd(), 'apps', 'web', 'package.json')]: JSON.stringify({ version: versions.web }),
      [path.join(process.cwd(), 'apps', 'api', 'src', 'app.controller.ts')]: controllerSource,
    };
    fs.readFileSync.mockImplementation((file) => {
      if (fileMap[file] === undefined) {
        throw new Error(`Unexpected read: ${file}`);
      }
      return fileMap[file];
    });
  }

  it('passes when all package versions match the root version', () => {
    mockFiles(
      { root: '1.0.0', api: '1.0.0', web: '1.0.0' },
      "version: process.env.npm_package_version || 'unknown'",
    );

    expect(main()).toBe('1.0.0');
  });

  it('fails when a package version diverges from root', () => {
    mockFiles(
      { root: '1.0.0', api: '0.1.0', web: '1.0.0' },
      "version: process.env.npm_package_version || 'unknown'",
    );

    expect(() => main()).toThrow('0.1.0');
    expect(() => main()).toThrow('expected 1.0.0');
  });

  it('fails when app.controller.ts still hardcodes a semantic version', () => {
    mockFiles(
      { root: '1.0.0', api: '1.0.0', web: '1.0.0' },
      "version: '0.3.0'",
    );

    expect(() => main()).toThrow('hardcoded version');
    expect(() => main()).toThrow("version: '0.3.0'");
  });
});
