import { Injectable, BadRequestException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { orders, orderItems } from '@smart-erp/database/schema';
import { eq, and, gte, sql, desc } from '@smart-erp/database/drizzle';

const MAX_FORECAST_DAYS = 365;

function sanitizeDays(days: number): number {
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < 1) {
    throw new BadRequestException('days must be a positive integer');
  }
  return Math.min(days, MAX_FORECAST_DAYS);
}

@Injectable()
export class ForecastService {
  async getDemandForecast(tenantId: string, productId: string, days = 30) {
    days = sanitizeDays(days);
    // Fetch last 90 days of sales for this product
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const rows = await db
      .select({
        date: sql`DATE(${orders.createdAt})`,
        quantity: sql`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orderItems.productId, productId),
          gte(orders.createdAt, startDate),
          eq(orders.status, 'delivered'),
        ),
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // If not enough data, fallback to simple average
    const dailySales = rows.map(r => Number(r.quantity));
    if (dailySales.length < 7) {
      const avg = dailySales.reduce((a,b)=>a+b,0)/Math.max(dailySales.length,1);
      const forecast = Array(days).fill(Math.round(avg));
      return { forecast, reorderRecommendation: null };
    }

    // Simple exponential smoothing
    const alpha = 0.3;
    let lastForecast = dailySales[dailySales.length-1];
    const forecast = [];
    for (let i = 0; i < days; i++) {
      lastForecast = alpha * dailySales[dailySales.length-1] + (1-alpha) * lastForecast;
      forecast.push(Math.max(0, Math.round(lastForecast)));
    }

    // Reorder recommendation: use average of last 7 days * lead time (default 7 days)
    const recentAvg = dailySales.slice(-7).reduce((a,b)=>a+b,0)/7;
    const leadTimeDays = 7;
    const reorderQty = Math.ceil(recentAvg * leadTimeDays);
    const recommended = reorderQty > 0 ? reorderQty : null;

    return { forecast, reorderRecommendation: recommended };
  }
}


