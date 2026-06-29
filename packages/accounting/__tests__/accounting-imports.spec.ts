import { describe, it, expect } from '@jest/globals';

describe('accounting package module resolution', () => {
  it('exports chart-of-accounts symbols via index', () => {
    const mod = require('../src/index');
    expect(mod.ACCOUNT_TYPES).toBeDefined();
    expect(mod.ACCOUNT_TYPES.ASSET).toBe('asset');
    expect(mod.DEFAULT_ACCOUNTS).toBeDefined();
    expect(Array.isArray(mod.DEFAULT_ACCOUNTS.ASSET)).toBe(true);
  });

  it('exports chart-of-accounts sub-modules individually', () => {
    const types = require('../src/chart-of-accounts/types');
    expect(types.ACCOUNT_TYPES).toBeDefined();
    expect(types.DEFAULT_ACCOUNTS).toBeDefined();

    const schema = require('../src/chart-of-accounts/schema');
    expect(schema.chartOfAccounts).toBeDefined();

    const validation = require('../src/chart-of-accounts/validation');
    expect(validation.chartOfAccountSchema).toBeDefined();
  });

  it('loads all sub-modules without error', () => {
    expect(() => require('../src/voucher-types')).not.toThrow();
    expect(() => require('../src/vat')).not.toThrow();
    expect(() => require('../src/journal-entry')).not.toThrow();
    expect(() => require('../src/financial-reports')).not.toThrow();
    expect(() => require('../src/tax-declaration')).not.toThrow();
    expect(() => require('../src/depreciation')).not.toThrow();
    expect(() => require('../src/currency-conversion')).not.toThrow();
  });

  // This test verifies the module can be loaded via CJS require()
  // as it would be at runtime from node apps/api/dist/apps/api/src/main.js.
  // In Docker (hoisted linker), require('@smart-erp/accounting') resolves
  // to package.json main: ./dist/src/index.js which re-exports these files.
  // Only runs when dist is built (not always available in CI unit test phase).
  it('compiles to dist output that can be required', () => {
    const fs = require('node:fs');
    const distPath = require('node:path').join(__dirname, '..', 'dist', 'src', 'index.js');
    if (!fs.existsSync(distPath)) return; // skip if not built yet
    const mod = require('../dist/src/index');
    expect(mod.ACCOUNT_TYPES).toBeDefined();
    expect(mod.DEFAULT_ACCOUNTS).toBeDefined();
  });
});
