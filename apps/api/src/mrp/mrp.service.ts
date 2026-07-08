import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eq, and, gte, sql } from 'drizzle-orm';
import { products, orders, orderItems, billsOfMaterials, inventoryTransactions, mrpForecasts } from '@smart-erp/database';

export interface MRPResult {
  productId: string;
  productName: string;
  forecastDate: string;
  forecastedDemand: number;
  salesOrderDemand: number;
  netRequirement: number;
  suggestedProduction: number;
  rawMaterialGap: number;
  bomComponents: BOMRequirement[];
}

export interface BOMRequirement {
  componentProductId: string;
  componentProductName: string;
  requiredQuantity: number;
  currentStock: number;
  gap: number;
}

@Injectable()
export class MRPService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Calculate MRP for a product within a date range.
   * Considers forecast demand + confirmed sales orders vs current inventory.
   */
  async calculateMRP(tenantId: string, productId: string, daysAhead: number = 30): Promise<MRPResult> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Get product info
    const productRows = await this.drizzle.db.execute(
      sql`SELECT id, name, current_stock, lead_time_days, safety_stock
          FROM products WHERE tenant_id = ${tenantId} AND id = ${productId} LIMIT 1`
    );
    if (!(productRows as unknown as any[]).length) {
      throw new Error(`Product not found: ${productId}`);
    }
    const product = (productRows as unknown as any[])[0];

    // Get forecast demand
    const forecastRows = await this.drizzle.db.execute(
      sql`SELECT COALESCE(SUM(forecasted_demand), 0) as total_forecast
          FROM mrp_forecasts
          WHERE tenant_id = ${tenantId} AND product_id = ${productId}
            AND forecast_date BETWEEN ${today.toISOString().split('T')[0]} AND ${endDate.toISOString().split('T')[0]}`
    );
    const forecastDemand = Number((forecastRows as unknown as any[])?.[0]?.total_forecast || 0);

    // Get confirmed sales order demand
    const salesOrderRows = await this.drizzle.db.execute(
      sql`SELECT COALESCE(SUM(oi.quantity), 0) as total_orders
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          WHERE o.tenant_id = ${tenantId} AND oi.product_id = ${productId}
            AND o.status IN ('confirmed', 'processing', 'delivered')
            AND o.created_at >= ${today.toISOString()}
            AND o.created_at <= ${endDate.toISOString()}`
    );
    const salesOrderDemand = Number((salesOrderRows as unknown as any[])?.[0]?.total_orders || 0);

    // Total demand
    const totalDemand = forecastDemand + salesOrderDemand;

    // Net requirement = total demand - current stock + safety stock
    const netRequirement = Math.max(0, totalDemand - product.current_stock + (product.safety_stock || 0));

    // Suggested production (account for lead time buffer)
    const leadTimeDays = product.lead_time_days || 7;
    const productionBuffer = Math.ceil(netRequirement * (1 + leadTimeDays / 30));
    const suggestedProduction = Math.max(0, Math.ceil(netRequirement));

    // Calculate raw material gap from BOM
    const bomRows = await this.drizzle.db.execute(
      sql`SELECT cp.id, cp.name as component_name, cp.current_stock,
                 b.quantity * ${suggestedProduction} * (1 + COALESCE(b.wastage_percent, 0) / 100) as required_qty
          FROM bills_of_materials b
          JOIN products cp ON cp.id = b.component_product_id
          WHERE b.tenant_id = ${tenantId} AND b.product_id = ${productId}`
    );
    const bomRowsData = bomRows as unknown as any[];

    const bomComponents: BOMRequirement[] = (bomRowsData || []).map((row: any) => {
      const requiredQty = Number(row.required_qty || 0);
      const currentStock = Number(row.current_stock || 0);
      return {
        componentProductId: row.id,
        componentProductName: row.component_name,
        requiredQuantity: Math.ceil(requiredQty),
        currentStock,
        gap: Math.max(0, Math.ceil(requiredQty) - currentStock),
      };
    });

    const rawMaterialGap = bomComponents.reduce((sum, c) => sum + c.gap, 0);

    // Save MRP forecast
    await this.drizzle.db.insert(mrpForecasts).values({
      tenantId,
      productId,
      forecastDate: today.toISOString().split('T')[0],
      forecastedDemand: forecastDemand,
      salesOrderDemand,
      netRequirement,
      suggestedProduction,
      rawMaterialGap,
    }).onConflictDoUpdate({ target: [mrpForecasts.tenantId, mrpForecasts.productId, mrpForecasts.forecastDate], set: {
      forecastedDemand: forecastDemand,
      salesOrderDemand,
      netRequirement,
      suggestedProduction,
      rawMaterialGap,
    }});

    return {
      productId,
      productName: product.name,
      forecastDate: today.toISOString().split('T')[0],
      forecastedDemand: forecastDemand,
      salesOrderDemand: salesOrderDemand,
      netRequirement,
      suggestedProduction,
      rawMaterialGap,
      bomComponents,
    };
  }

  /**
   * Calculate MRP for multiple products (full MRP run).
   */
  async calculateMRPBatch(tenantId: string, productIds?: string[], daysAhead: number = 30): Promise<MRPResult[]> {
    // Get all active products if no IDs specified
    let productIdsToProcess = productIds;
    if (!productIdsToProcess) {
      const productRows = await this.drizzle.db.execute(
        sql`SELECT id FROM products WHERE tenant_id = ${tenantId} AND is_active = true`
      );
      productIdsToProcess = (productRows as unknown as any[]).map((p: any) => p.id);
    }

    const results: MRPResult[] = [];
    for (const pid of productIdsToProcess) {
      try {
        const result = await this.calculateMRP(tenantId, pid);
        results.push(result);
      } catch (e) {
        console.error(`MRP calculation failed for product ${pid}:`, e);
      }
    }

    // Sort by net requirement (most urgent first)
    results.sort((a, b) => b.netRequirement - a.netRequirement);
    return results;
  }
}