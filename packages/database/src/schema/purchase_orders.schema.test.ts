import { getTableConfig } from 'drizzle-orm/pg-core';
import { purchaseOrders } from './purchase_orders';

describe('purchaseOrders schema unique constraints', () => {
  it('enforces code uniqueness per tenant', () => {
    const config = getTableConfig(purchaseOrders);

    const codeUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'po_tenant_code_unique'
    );

    expect(codeUnique).toBeDefined();
    expect(codeUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);
  });
});
