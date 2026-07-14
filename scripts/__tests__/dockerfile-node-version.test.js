const fs = require('fs');
const path = require('path');

describe('Dockerfile Node version alignment', () => {
  const dockerfile = fs.readFileSync(
    path.resolve(__dirname, '../../Dockerfile'),
    'utf8'
  );

  test('build stage uses the same Node major version as CI (22)', () => {
    expect(dockerfile).toMatch(/^FROM node:22-alpine AS build/m);
  });

  test('runtime stage uses Node binary from the pinned build stage', () => {
    expect(dockerfile).toContain('COPY --from=build /usr/local/bin/node /usr/local/bin/node');
  });

  test('runtime stage does not install unpinned nodejs package from apk', () => {
    expect(dockerfile).not.toMatch(/apk add[^\n]*\bnodejs\b/);
  });

  test('Dockerfile does not use Node 26 build stage', () => {
    expect(dockerfile).not.toMatch(/^FROM node:26-alpine/m);
  });

  test('CI workflow specifies Node version', () => {
    const ci = fs.readFileSync(
      path.resolve(__dirname, '../../.github/workflows/ci.yml'),
      'utf8'
    );
    expect(ci).toContain("NODE_VERSION: '22'");
  });
});
