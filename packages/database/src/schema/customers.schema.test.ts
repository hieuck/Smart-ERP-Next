import { getTableConfig } from 'drizzle-orm/pg-core';
import { customers } from './customers';

describe('customers schema unique constraints', () => {
  it('enforces code uniqueness per tenant', () => {
    const config = getTableConfig(customers);

    const codeUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'customers_code_tenant_unique'
    );

    expect(codeUnique).toBeDefined();
    expect(codeUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'code']);
  });

  it('enforces email uniqueness per tenant only when email is not null', () => {
    const config = getTableConfig(customers);

    const emailUnique = config.indexes.find(
      (idx) => idx.config.name === 'customers_email_tenant_unique'
    );

    expect(emailUnique).toBeDefined();
    expect(emailUnique!.config.unique).toBe(true);
    expect(emailUnique!.config.columns.map((col) => (col as any).name)).toEqual([
      'tenant_id',
      'email',
    ]);
    expect(emailUnique!.config.where).toBeDefined();
  });

  it('enforces externalId + externalPlatform uniqueness per tenant only when externalId is not null', () => {
    const config = getTableConfig(customers);

    const externalUnique = config.indexes.find(
      (idx) => idx.config.name === 'customers_external_id_tenant_unique'
    );

    expect(externalUnique).toBeDefined();
    expect(externalUnique!.config.unique).toBe(true);
    expect(externalUnique!.config.columns.map((col) => (col as any).name)).toEqual([
      'tenant_id',
      'external_id',
      'external_platform',
    ]);
    expect(externalUnique!.config.where).toBeDefined();
  });
});
