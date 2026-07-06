#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.env.AUDIT_ENCODING_ROOT
  ? path.resolve(process.env.AUDIT_ENCODING_ROOT)
  : path.join(__dirname, '..');

const IGNORED_SUFFIXES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  '.tsbuildinfo',
];
const IGNORED_SEGMENTS = new Set([
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'build',
  '.next',
  '.next-dev',
  '.turbo',
  'tmp',
  'logs',
  'playwright-report',
  'test-results',
]);

// Patterns that strongly indicate UTF-8 was mis-decoded as Latin-1/Windows-1252.
// Constructed from escaped code points so the source file itself never contains
// the mis-decoded byte sequences it is trying to detect.
const MOJIBAKE_PATTERN = new RegExp(
  '(?:[' +
    '\\u00c2\\u00c3\\u00c4\\u00c5\\u00c6\\u00c7\\u00c8\\u00c9\\u00ca' +
  '][\\u0080-\\u00bf]|\\u00e2[\\u0080-\\u00bf]{1,2}|\\ufffd)'
);

const BOM_PATTERNS = [
  { id: 'utf8-bom', bytes: [0xef, 0xbb, 0xbf] },
  { id: 'utf16le-bom', bytes: [0xff, 0xfe] },
  { id: 'utf16be-bom', bytes: [0xfe, 0xff] },
  { id: 'utf32le-bom', bytes: [0xff, 0xfe, 0x00, 0x00] },
  { id: 'utf32be-bom', bytes: [0x00, 0x00, 0xfe, 0xff] },
];

function isIgnored(file) {
  const normalized = file.split(path.sep).join('/');
  if (IGNORED_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return true;
  return normalized.split('/').some((segment) => IGNORED_SEGMENTS.has(segment));
}

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot });
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((file) => !isIgnored(file));
}

function gitAttributesFor(files) {
  if (files.length === 0) return new Map();

  const output = execFileSync('git', ['check-attr', 'text', '--stdin'], {
    cwd: repoRoot,
    input: files.join('\0'),
  })
    .toString('utf8')
    .split('\0');

  const attrs = new Map();
  for (const line of output) {
    const match = line.match(/^(.+): text: (.+)$/);
    if (match) {
      const [, file, value] = match;
      attrs.set(file, value);
    }
  }

  return attrs;
}

function startsWithBom(buffer) {
  for (const { id, bytes } of BOM_PATTERNS) {
    if (bytes.every((byte, index) => buffer[index] === byte)) {
      return id;
    }
  }
  return null;
}

function isValidUtf8(buffer) {
  // Node's Buffer.toString('utf8') silently replaces invalid sequences with
  // U+FFFD. We detect invalid UTF-8 by checking whether the round-trip is lossless.
  const decoded = buffer.toString('utf8');
  const reencoded = Buffer.from(decoded, 'utf8');
  return buffer.equals(reencoded);
}

function containsCrlf(buffer) {
  return buffer.includes('\r\n');
}

function containsMojibake(text) {
  return MOJIBAKE_PATTERN.test(text);
}

function classifyFile(file, buffer, textAttrs) {
  const textAttr = textAttrs.get(file);

  // If git explicitly says text, trust it.
  if (textAttr === 'set' || textAttr === 'auto') {
    return { isText: true, reason: 'text-attr' };
  }

  // Respect explicit binary declaration in .gitattributes.
  if (textAttr === 'unspecified' || textAttr === 'unset') {
    return { isText: false, reason: 'binary-attr' };
  }

  // Heuristic: files with NUL bytes are binary.
  if (buffer.includes(0x00)) {
    return { isText: false, reason: 'nul-byte' };
  }

  // Fallback: assume text for common source/extensions.
  const textExtensions = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|css|scss|html|xml|svg|sh|ps1|sql|txt|env|example|gitignore|gitattributes|editorconfig)$/i;
  if (textExtensions.test(file)) {
    return { isText: true, reason: 'extension-heuristic' };
  }

  // Final fallback: treat as text if it looks mostly printable ASCII/UTF-8.
  const nonPrintable = buffer.filter((b) => b < 0x09 || (b > 0x0d && b < 0x20) || b === 0x7f).length;
  if (nonPrintable === 0) {
    return { isText: true, reason: 'printable-heuristic' };
  }

  return { isText: false, reason: 'binary-heuristic' };
}

function auditFiles(files) {
  const textAttrs = gitAttributesFor(files);
  const findings = [];

  for (const file of files) {
    const absolute = path.join(repoRoot, file);
    let buffer;
    try {
      buffer = fs.readFileSync(absolute);
    } catch (error) {
      if (error.code === 'EISDIR') continue;
      findings.push({ file, line: null, type: 'read-error', message: error.message });
      continue;
    }

    // BOM is a definitive encoding marker and must be flagged regardless of
    // whether the rest of the file looks like text.
    const bomId = startsWithBom(buffer);
    if (bomId) {
      findings.push({ file, line: 1, type: 'bom', message: bomId });
      continue;
    }

    const { isText } = classifyFile(file, buffer, textAttrs);
    if (!isText) continue;

    if (!isValidUtf8(buffer)) {
      findings.push({ file, line: null, type: 'invalid-utf8', message: 'invalid UTF-8 byte sequence' });
      continue;
    }

    const text = buffer.toString('utf8');

    if (containsCrlf(buffer)) {
      const lines = text.split(/\r?\n/);
      const firstCrlfLine = lines.findIndex((line) => line.endsWith('\r')) + 1;
      findings.push({
        file,
        line: firstCrlfLine > 0 ? firstCrlfLine : 1,
        type: 'crlf',
        message: 'CRLF line ending detected; repository requires LF',
      });
    }

    if (containsMojibake(text)) {
      const lines = text.split(/\r?\n/);
      const mojibakeLine = lines.findIndex((line) => MOJIBAKE_PATTERN.test(line)) + 1;
      findings.push({
        file,
        line: mojibakeLine > 0 ? mojibakeLine : 1,
        type: 'mojibake',
        message: 'suspected mojibake (UTF-8 mis-decoded)',
      });
    }
  }

  return findings;
}

function resolveFilesFromArgs(args) {
  if (args.length === 0) {
    return trackedFiles();
  }

  // Pre-commit mode: arguments are absolute or relative paths to staged files.
  return args
    .map((arg) => {
      const resolved = path.resolve(arg);
      return path.relative(repoRoot, resolved);
    })
    .filter((file) => !isIgnored(file));
}

function main(args = process.argv.slice(2)) {
  const files = resolveFilesFromArgs(args);
  const findings = auditFiles(files);

  if (findings.length > 0) {
    console.error('Encoding audit failed.');
    for (const finding of findings) {
      const line = finding.line ? `:${finding.line}` : '';
      console.error(`- ${finding.file}${line} (${finding.type}): ${finding.message}`);
    }
    return 1;
  }

  console.log('Encoding audit passed.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  auditFiles,
  classifyFile,
  containsCrlf,
  containsMojibake,
  gitAttributesFor,
  isValidUtf8,
  resolveFilesFromArgs,
  startsWithBom,
  trackedFiles,
};
