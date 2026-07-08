import { getTableConfig } from 'drizzle-orm/pg-core';
import { maintenanceOrders } from './maintenance';

describe('maintenance schema', () => {
  it('scopes orderNumber uniqueness by tenant', () => {
    const config = getTableConfig(maintenanceOrders);

    const orderNumberUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'maintenance_orders_tenant_order_number_unique',
    );

    expect(orderNumberUnique).toBeDefined();
    expect(orderNumberUnique?.columns.map((col) => col.name)).toEqual(['tenant_id', 'order_number']);
  });
});
