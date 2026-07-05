const { spawnSync } = require('node:child_process');
const path = require('node:path');

function buildTurboEnv(cwd = process.cwd()) {
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') || 'PATH';
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const shimDir = path.join(cwd, 'scripts', 'shims');
  const binDir = path.join(cwd, 'node_modules', '.bin');
  const currentPath = process.env[pathKey] || '';

  return {
    ...process.env,
    [pathKey]: [shimDir, binDir, currentPath].filter(Boolean).join(pathSeparator),
  };
}

function runTurbo(args = process.argv.slice(2), cwd = process.cwd()) {
  let result;
  try {
    result = spawnSync('turbo', args, {
      cwd,
      env: buildTurboEnv(cwd),
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
  } catch {
    return 1;
  }

  const status = result.status ?? 1;
  if (status !== 127 && status !== 3221225781) {
    return status;
  }

  const task = args[0];
  const fallback = spawnSync('pnpm', ['-r', 'run', task], {
    cwd,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  return fallback.status ?? 1;
}

if (require.main === module) {
  process.exit(runTurbo());
}

module.exports = {
  buildTurboEnv,
  runTurbo,
};
