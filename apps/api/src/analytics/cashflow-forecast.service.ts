import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { orders, payments } from '@smart-erp/database/schema';
import { and, eq, sql } from '@smart-erp/database/drizzle';

interface DailyCashFlow {
  date: string;
  net: number;
}

@Injectable()
export class CashflowForecastService {
  /**
   * Simple exponential smoothing forecast for next N days.
   * @param data Array of net cash values (most recent last)
   * @param days Number of days to forecast
   * @param alpha Smoothing factor (0.1-0.3 recommended)
   */
  private exponentialSmoothing(data: number[], days: number, alpha = 0.2): number[] {
    if (data.length === 0) return new Array(days).fill(0);
    let forecast = data[data.length - 1];
    const forecasts: number[] = [];
    for (let i = 0; i < days; i++) {
      forecast = alpha * data[data.length - 1] + (1 - alpha) * forecast;
      forecasts.push(Math.max(0, forecast));
    }
    return forecasts;
  }

  async getHistoricalDailyNet(tenantId: string, daysBack = 90): Promise<DailyCashFlow[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    // Daily revenue from orders (paid)
    const revenueRows = await db.execute(sql`
      SELECT DATE(created_at) as date, SUM(total) as revenue
      FROM orders
      WHERE tenant_id = ${tenantId}
        AND status = 'delivered'
        AND created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
    `);

    // Daily expenses from payments (outflow)
    const expenseRows = await db.execute(sql`
      SELECT DATE(paid_at) as date, SUM(amount) as expense
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND type = 'payment'
        AND paid_at >= ${startDate.toISOString()}
      GROUP BY DATE(paid_at)
    `);

    const revMap = new Map<string, number>();
    for (const row of revenueRows.rows as any[]) {
      revMap.set(row.date, parseFloat(row.revenue));
    }
    const expMap = new Map<string, number>();
    for (const row of expenseRows.rows as any[]) {
      expMap.set(row.date, parseFloat(row.expense));
    }

    const result: DailyCashFlow[] = [];
    const current = new Date(startDate);
    const end = new Date();
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const revenue = revMap.get(dateStr) || 0;
      const expense = expMap.get(dateStr) || 0;
      result.push({ date: dateStr, net: revenue - expense });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  async forecast(tenantId: string, days = 30): Promise<{ dates: string[]; values: number[]; historical: DailyCashFlow[] }> {
    const historical = await this.getHistoricalDailyNet(tenantId);
    const netValues = historical.map(h => h.net);
    const forecastValues = this.exponentialSmoothing(netValues, days);

    const dates: string[] = [];
    const lastDate = historical.length > 0 ? new Date(historical[historical.length - 1].date) : new Date();
    for (let i = 1; i <= days; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    return { dates, values: forecastValues, historical };
  }
}
