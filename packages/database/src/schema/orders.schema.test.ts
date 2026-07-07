import { getTableConfig } from 'drizzle-orm/pg-core';
import { orders } from './orders';

describe('orders schema unique constraints', () => {
  it('enforces code uniqueness per tenant', () => {
    const config = getTableConfig(orders);

    const codeUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'orders_tenant_code_unique'
    );

    expect(codeUnique).toBeDefined();
    expect(codeUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);
  });
});
