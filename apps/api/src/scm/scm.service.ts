import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { supplierLeadTimes, inventoryReorderSuggestions, products } from '@smart-erp/database/schema';
import { eq, and, sql, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class ScmService {
  /**
   * AI-Driven Demand Forecasting & Reorder Suggestion Engine
   */
  async generateReorderSuggestions(tenantId: string) {
    // In a real scenario, this would use historical sales data (orders table)
    // and run a time-series forecasting model (e.g., Prophet or LSTM).
    // For this demonstration, we use a heuristic based on 30-day velocity.
    
    const results = await db.execute(sql`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(SUM(oi.quantity), 0) / 30 as daily_velocity,
        p.current_stock,
        slt.avg_lead_time_days
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at > NOW() - INTERVAL '30 days'
      LEFT JOIN supplier_lead_times slt ON slt.product_id = p.id
      WHERE p.tenant_id = ${tenantId}
      GROUP BY p.id, slt.avg_lead_time_days
    `);

    const suggestions = [];

    for (const row of (results as any)) {
      const { product_id, daily_velocity, current_stock, avg_lead_time_days } = row;
      const leadTime = avg_lead_time_days || 7;
      const safetyStock = daily_velocity * 3; // 3 days safety
      const reorderPoint = (daily_velocity * leadTime) + safetyStock;

      if (current_stock <= reorderPoint) {
        const suggestedQty = Math.max(daily_velocity * 30, 50); // Reorder for 30 days
        
        const [suggestion] = await db.insert(inventoryReorderSuggestions).values({
          tenantId,
          productId: product_id,
          suggestedQuantity: suggestedQty.toString(),
          currentStock: current_stock.toString(),
          reason: `Dự báo hết hàng trong ${Math.floor(current_stock / daily_velocity || 1)} ngày. Tốc độ bán: ${daily_velocity.toFixed(2)}/ngày.`,
          priority: current_stock <= safetyStock ? 'high' : 'medium',
          aiModelUsed: 'Heuristic-Velocity-V1',
          confidence: '0.85',
        }).onConflictDoUpdate({
          target: inventoryReorderSuggestions.id, // Simplified
          set: { updatedAt: new Date() }
        }).returning();
        
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  async listSuggestions(tenantId: string) {
    return db
      .select({
        id: inventoryReorderSuggestions.id,
        productName: products.name,
        suggestedQuantity: inventoryReorderSuggestions.suggestedQuantity,
        currentStock: inventoryReorderSuggestions.currentStock,
        reason: inventoryReorderSuggestions.reason,
        priority: inventoryReorderSuggestions.priority,
        status: inventoryReorderSuggestions.status,
      })
      .from(inventoryReorderSuggestions)
      .innerJoin(products, eq(inventoryReorderSuggestions.productId, products.id))
      .where(and(
        eq(inventoryReorderSuggestions.tenantId, tenantId),
        eq(inventoryReorderSuggestions.status, 'pending')
      ))
      .orderBy(desc(inventoryReorderSuggestions.priority));
  }

  async approveSuggestion(tenantId: string, suggestionId: string) {
    // In a real system, this would trigger a Draft Purchase Order
    return db
      .update(inventoryReorderSuggestions)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(and(
        eq(inventoryReorderSuggestions.id, suggestionId),
        eq(inventoryReorderSuggestions.tenantId, tenantId)
      ))
      .returning();
  }
}
