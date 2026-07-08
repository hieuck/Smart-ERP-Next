import { getTableConfig } from 'drizzle-orm/pg-core';
import { mrpForecasts } from './mrp';

describe('mrp schema', () => {
  it('uses camelCase TypeScript keys with snake_case column names', () => {
    const config = getTableConfig(mrpForecasts);
    const names = config.columns.map((c) => c.name);

    expect(names).toContain('tenant_id');
    expect(names).toContain('product_id');
    expect(names).toContain('forecast_date');
    expect(names).toContain('forecasted_demand');
    expect(names).toContain('sales_order_demand');
    expect(names).toContain('net_requirement');
    expect(names).toContain('suggested_production');
    expect(names).toContain('raw_material_gap');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
  });

  it('has indexes on tenantId, productId, and (tenantId, productId, forecastDate)', () => {
    const config = getTableConfig(mrpForecasts);
    const indexNames = config.indexes.map((i: any) => i.config?.name ?? i.name);

    expect(indexNames).toContain('mrp_forecasts_tenant_idx');
    expect(indexNames).toContain('mrp_forecasts_product_idx');
    expect(indexNames).toContain('mrp_forecasts_tenant_product_date_idx');
  });

  it('enforces unique constraint on (tenantId, productId, forecastDate)', () => {
    const config = getTableConfig(mrpForecasts);
    const uniqueConstraint = config.uniqueConstraints.find(
      (uc) => uc.name === 'mrp_forecasts_tenant_product_date_unique'
    );

    expect(uniqueConstraint).toBeDefined();
    expect(uniqueConstraint!.columns.map((col) => col.name)).toEqual([
      'tenant_id',
      'product_id',
      'forecast_date',
    ]);
  });
});
