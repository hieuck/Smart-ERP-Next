const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_TASKS = new Set([
  'build',
  'clean',
  'dev',
  'dev:desktop',
  'lint',
  'type-check',
  'test',
  'test:e2e',
  'start:prod',
]);

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

function resolveTurboBinary(cwd = process.cwd()) {
  const binName = process.platform === 'win32' ? 'turbo.cmd' : 'turbo';
  const localBin = path.join(cwd, 'node_modules', '.bin', binName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return 'turbo';
}

function validateTask(args) {
  if (args.length === 0) {
    return { ok: false, reason: 'No task provided' };
  }
  const task = args[0];
  if (!ALLOWED_TASKS.has(task)) {
    return { ok: false, reason: `Disallowed task: ${task}` };
  }
  return { ok: true, task };
}

function spawnWithBinary(binary, args, cwd) {
  const options = {
    cwd,
    env: buildTurboEnv(cwd),
    shell: false,
    stdio: 'inherit',
  };

  if (process.platform === 'win32') {
    // On Windows, .cmd batch files cannot be spawned directly with shell:false.
    // Invoke cmd.exe with the resolved binary path and arguments passed as an
    // array so Node handles quoting; combined with task allow-listing this
    // prevents shell injection while still letting the batch wrapper run.
    return spawnSync('cmd.exe', ['/c', binary, ...args], options);
  }

  return spawnSync(binary, args, options);
}

function spawnPnpm(task, cwd) {
  const options = {
    cwd,
    env: buildTurboEnv(cwd),
    shell: false,
    stdio: 'inherit',
  };

  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/c', 'pnpm', '-r', 'run', task], options);
  }

  return spawnSync('pnpm', ['-r', 'run', task], options);
}

function runTurbo(args = process.argv.slice(2), cwd = process.cwd()) {
  const validation = validateTask(args);
  if (!validation.ok) {
    process.stderr.write(`run-turbo: ${validation.reason}\n`);
    return 1;
  }
  const task = validation.task;

  let result;
  try {
    result = spawnWithBinary(resolveTurboBinary(cwd), args, cwd);
  } catch {
    result = { status: 3221225781 };
  }

  const status = result.status ?? 1;
  if (status !== 127 && status !== 3221225781) {
    return status;
  }

  const fallback = spawnPnpm(task, cwd);
  return fallback.status ?? 1;
}

if (require.main === module) {
  process.exit(runTurbo());
}

module.exports = {
  buildTurboEnv,
  resolveTurboBinary,
  runTurbo,
};
