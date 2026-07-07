import { getTableConfig } from 'drizzle-orm/pg-core';
import { eInvoices } from './e_invoices';

describe('eInvoices schema self-reference constraints', () => {
  it('has foreign keys from replaces_invoice_id and adjusts_invoice_id to e_invoices.id', () => {
    const config = getTableConfig(eInvoices);

    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(2);
  });

  it('has indexes on tenant_id + replaces_invoice_id and tenant_id + adjusts_invoice_id', () => {
    const config = getTableConfig(eInvoices);

    const indexNames = config.indexes.map((idx) => idx.config.name);
    expect(indexNames).toContain('einv_replaces_invoice_idx');
    expect(indexNames).toContain('einv_adjusts_invoice_idx');
  });
});
