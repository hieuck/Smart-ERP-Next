import { getTableConfig } from 'drizzle-orm/pg-core';
import { inventoryReorderSuggestions } from './scm';

describe('inventory reorder suggestions schema constraints', () => {
  it('prevents multiple active reorder suggestions for the same product within a tenant', () => {
    const config = getTableConfig(inventoryReorderSuggestions);

    const activeUnique = config.indexes.find(
      (idx) => idx.config.name === 'scm_reorder_active_unique'
    );

    expect(activeUnique).toBeDefined();
    expect(activeUnique!.config.unique).toBe(true);
    expect(activeUnique!.config.columns.map((col) => (col as any).name)).toEqual([
      'tenant_id',
      'product_id',
    ]);
    expect(activeUnique!.config.where).toBeDefined();
  });
});
