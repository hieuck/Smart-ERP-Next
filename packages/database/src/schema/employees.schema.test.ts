import { getTableConfig } from 'drizzle-orm/pg-core';
import { employees } from './employees';

describe('employees schema unique constraints', () => {
  it('enforces code uniqueness per tenant', () => {
    const config = getTableConfig(employees);

    const codeUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'employees_tenant_code_unique'
    );

    expect(codeUnique).toBeDefined();
    expect(codeUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);
  });
});
