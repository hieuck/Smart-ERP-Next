const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'audit-encoding.js');

function runAudit(args = [], cwd = repoRoot) {
  return spawnSync('node', [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, AUDIT_ENCODING_ROOT: cwd },
  });
}

function mojibakeString(text) {
  // Simulate UTF-8 bytes mis-decoded as Latin-1/Windows-1252.
  return Buffer.from(text, 'utf8').toString('latin1');
}

function createTempRepo(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-encoding-'));
  fs.mkdirSync(path.join(tmp, '.git'), { recursive: true });

  const gitAttributes = [
    '* text=auto eol=lf',
    '*.ts text eol=lf',
    '*.json text eol=lf',
    '*.md text eol=lf',
    '*.png binary',
    '*.jpg binary',
  ].join('\n');
  fs.writeFileSync(path.join(tmp, '.gitattributes'), gitAttributes, 'utf8');

  for (const [file, content] of Object.entries(files)) {
    const fullPath = path.join(tmp, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(fullPath, content);
    } else {
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }

  spawnSync('git', ['init', '--quiet'], { cwd: tmp });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmp });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tmp });
  spawnSync('git', ['add', '.'], { cwd: tmp });
  spawnSync('git', ['commit', '-m', 'initial', '--quiet'], { cwd: tmp });

  return tmp;
}

describe('encoding audit', () => {
  describe('tracked files', () => {
    it('passes on the current repository', () => {
      const result = runAudit();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Encoding audit passed');
    });
  });

  describe('invalid UTF-8', () => {
    it('fails when a text file contains invalid UTF-8 bytes', () => {
      const tmp = createTempRepo({
        'valid.ts': '// clean unicode: tiếng Việt\n',
        'invalid.ts': Buffer.from([0x80, 0x81, 0x82, 0x0a]),
      });

      const result = runAudit([], tmp);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('invalid.ts');
      expect(result.stdout + result.stderr).toContain('invalid-utf8');
    });
  });

  describe('BOM detection', () => {
    it('fails when a text file starts with a UTF-8 BOM', () => {
      const tmp = createTempRepo({
        'bom.ts': Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('const x = 1;\n', 'utf8')]),
      });

      const result = runAudit([], tmp);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('bom.ts');
      expect(result.stdout + result.stderr).toContain('utf8-bom');
    });

    it('fails when a text file starts with a UTF-16 LE BOM', () => {
      const tmp = createTempRepo({
        'utf16le.ts': Buffer.from([0xff, 0xfe, 0x2f, 0x00, 0x2f, 0x00]),
      });

      const result = runAudit([], tmp);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('utf16le.ts');
    });
  });

  describe('mojibake detection', () => {
    it('fails when Vietnamese text is mojibaked (UTF-8 interpreted as Latin-1)', () => {
      const tmp = createTempRepo({
        'mojibake.ts': `const label = '${mojibakeString('Hãy thử lại')}';\n`,
      });

      const result = runAudit([], tmp);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('mojibake.ts');
      expect(result.stdout + result.stderr).toContain('mojibake');
    });

    it('passes on correctly encoded Vietnamese text', () => {
      const tmp = createTempRepo({
        'clean.ts': "const label = 'Hãy thử lại';\n",
      });

      const result = runAudit([], tmp);
      expect(result.status).toBe(0);
    });
  });

  describe('line ending enforcement', () => {
    it('fails when a tracked text file uses CRLF', () => {
      const tmp = createTempRepo({
        'crlf.ts': 'const x = 1;\r\n',
      });

      const result = runAudit([], tmp);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('crlf.ts');
      expect(result.stdout + result.stderr).toContain('crlf');
    });

    it('passes when a tracked text file uses LF', () => {
      const tmp = createTempRepo({
        'lf.ts': 'const x = 1;\n',
      });

      const result = runAudit([], tmp);
      expect(result.status).toBe(0);
    });
  });

  describe('binary files', () => {
    it('ignores binary files declared in .gitattributes', () => {
      const tmp = createTempRepo({
        'image.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      });

      const result = runAudit([], tmp);
      expect(result.status).toBe(0);
    });
  });

  describe('staged files mode', () => {
    it('only audits files passed via CLI args', () => {
      const tmp = createTempRepo({
        'clean.ts': "const ok = 'tiếng Việt';\n",
        'dirty.md': `const bad = '${mojibakeString('Hãy thử')}';\n`,
      });

      const result = runAudit([path.join(tmp, 'clean.ts')], tmp);
      expect(result.status).toBe(0);
    });
  });
});
