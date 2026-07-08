import { getTableConfig } from 'drizzle-orm/pg-core';
import { ecommerceChannelInventory } from './ecommerce_stores';
import fs from 'node:fs';
import path from 'node:path';

function latestMigrationSql() {
  const drizzleDir = path.join(__dirname, '..', '..', 'drizzle');
  const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));
  files.sort();
  return fs.readFileSync(path.join(drizzleDir, files[files.length - 1]), 'utf8');
}

describe('ecommerce channel inventory schema', () => {
  it('has a foreign key from productId to products.id', () => {
    const sql = latestMigrationSql();
    expect(sql).toContain('ecommerce_channel_inventory_product_id_products_id_fk');
    expect(sql).toContain('FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")');
  });

  it('has a unique constraint on (tenantId, storeId, productId, externalProductId)', () => {
    const config = getTableConfig(ecommerceChannelInventory);

    const uniqueConstraint = config.uniqueConstraints.find(
      (uc) => uc.name === 'ecom_inv_tenant_store_product_ext_unique'
    );

    expect(uniqueConstraint).toBeDefined();
    expect(uniqueConstraint?.columns.map((col) => col.name)).toEqual([
      'tenant_id',
      'store_id',
      'product_id',
      'external_product_id',
    ]);
  });

  it('uses integer columns for stock quantities', () => {
    const config = getTableConfig(ecommerceChannelInventory);

    const platformStock = config.columns.find((c) => c.name === 'platform_stock');
    const localStock = config.columns.find((c) => c.name === 'local_stock');

    expect(platformStock?.columnType).toBe('PgInteger');
    expect(localStock?.columnType).toBe('PgInteger');
  });
});
