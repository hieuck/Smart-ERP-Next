import * as accounting from '../src';
import * as chartOfAccounts from '../src/chart-of-accounts';
import * as currencyConversion from '../src/currency-conversion';
import * as depreciation from '../src/depreciation';
import * as financialReports from '../src/financial-reports';
import * as journalEntry from '../src/journal-entry';
import * as taxDeclaration from '../src/tax-declaration';
import * as vat from '../src/vat';
import * as voucherTypes from '../src/voucher-types';
import { getTableConfig } from 'drizzle-orm/pg-core';

const isDrizzleTable = (value: unknown) =>
  !!value &&
  typeof value === 'object' &&
  Object.getOwnPropertySymbols(value).some((symbol) => String(symbol) === 'Symbol(drizzle:IsDrizzleTable)' && (value as any)[symbol]);

describe('accounting package exports', () => {
  it('keeps domain schemas available from their package entrypoints', () => {
    expect(accounting).toEqual(expect.objectContaining({ chartOfAccountSchema: expect.any(Object) }));
    expect(chartOfAccounts).toEqual(expect.objectContaining({ chartOfAccounts: expect.any(Object) }));
    expect(currencyConversion).toEqual(expect.objectContaining({ currencies: expect.any(Object) }));
    expect(depreciation).toEqual(expect.objectContaining({ fixedAssets: expect.any(Object) }));
    expect(financialReports).toEqual(expect.objectContaining({ financialReports: expect.any(Object) }));
    expect(journalEntry).toEqual(expect.objectContaining({ journalEntries: expect.any(Object) }));
    expect(taxDeclaration).toEqual(expect.objectContaining({ taxDeclarations: expect.any(Object) }));
    expect(vat).toEqual(expect.objectContaining({ vatRates: expect.any(Object), vatDeclarations: expect.any(Object) }));
    expect(voucherTypes).toEqual(expect.objectContaining({ voucherTypes: expect.any(Object) }));
  });

  it('materializes accounting table foreign key references', () => {
    const modules = [
      accounting,
      chartOfAccounts,
      currencyConversion,
      depreciation,
      financialReports,
      journalEntry,
      taxDeclaration,
      vat,
      voucherTypes,
    ];
    const tables = Array.from(new Set(modules.flatMap((module) => Object.values(module).filter(isDrizzleTable))));

    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      const config = getTableConfig(table as any);
      expect(config.columns.length).toBeGreaterThan(0);
      for (const foreignKey of config.foreignKeys) {
        expect(foreignKey.reference().foreignColumns.length).toBeGreaterThan(0);
      }
    }
  });
});
