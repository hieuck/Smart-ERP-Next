import { getTableConfig } from 'drizzle-orm/pg-core';
import { payments } from './payments';

describe('payments schema unique constraints', () => {
  it('enforces code uniqueness per tenant', () => {
    const config = getTableConfig(payments);

    const codeUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'payments_tenant_code_unique'
    );

    expect(codeUnique).toBeDefined();
    expect(codeUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);
  });
});
