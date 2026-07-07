import { getTableConfig } from 'drizzle-orm/pg-core';
import { products } from './products';

describe('products schema', () => {
  it('enforces SKU uniqueness per tenant, not globally', () => {
    const config = getTableConfig(products);

    const skuUnique = config.uniqueConstraints.find((uc) => {
      const columns = uc.columns.map((col) => col.name);
      return columns.includes('sku');
    });

    expect(skuUnique).toBeDefined();
    expect(skuUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'sku']);

    const globalSkuUnique = config.uniqueConstraints.find((uc) => {
      const columns = uc.columns.map((col) => col.name);
      return columns.length === 1 && columns[0] === 'sku';
    });

    expect(globalSkuUnique).toBeUndefined();

    const skuIndex = config.indexes.find((idx) => idx.config.name === 'products_sku_idx');
    expect(skuIndex).toBeDefined();
    expect(skuIndex!.config.columns.map((col) => col.name)).toEqual(['tenant_id', 'sku']);
  });
});
