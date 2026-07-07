import { getTableConfig } from 'drizzle-orm/pg-core';
import { employees } from './employees';

describe('employees schema', () => {
  it('enforces employee code uniqueness per tenant', () => {
    const config = getTableConfig(employees);

    const codeUnique = config.uniqueConstraints.find((uc) => {
      const columns = uc.columns.map((col) => col.name);
      return columns.includes('code');
    });

    expect(codeUnique).toBeDefined();
    expect(codeUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);

    const codeIndex = config.indexes.find((idx) => idx.config.name === 'employees_code_idx');
    expect(codeIndex).toBeDefined();
    expect(codeIndex!.config.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);
  });
});
