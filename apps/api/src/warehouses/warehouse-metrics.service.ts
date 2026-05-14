import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { products, inventoryTransactions, warehouses } from '@smart-erp/database';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class WarehouseMetricsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getWarehouseStats(tenantId: string, warehouseId: string) {
    const [warehouse] = await this.drizzle.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, warehouseId))
      .limit(1);

    if (!warehouse) return null;

    const totalProductsResult = await this.drizzle.db
      .select({ count: sql<number>`count(distinct ${inventoryTransactions.productId})` })
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.warehouseId, warehouseId));

    const inTransitResult = await this.drizzle.db.execute(
      sql`SELECT count(*) as count FROM warehouse_transfers WHERE tenant_id = ${tenantId} AND (from_warehouse_id = ${warehouseId} OR to_warehouse_id = ${warehouseId}) AND status = 'in_transit'`,
    );

    return {
      warehouseId,
      warehouseName: warehouse.name,
      totalProducts: totalProductsResult[0]?.count ?? 0,
      transfersInTransit: (inTransitResult as any)[0]?.count ?? 0,
    };
  }

  async getAllWarehouseMetrics(tenantId: string) {
    const allWarehouses = await this.drizzle.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.tenantId, tenantId));

    const metrics = await Promise.all(
      allWarehouses.map(async (wh) => {
        return this.getWarehouseStats(tenantId, wh.id);
      }),
    );

    return metrics.filter(Boolean);
  }
}