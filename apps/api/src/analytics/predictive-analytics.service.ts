import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { customers, orders } from '@smart-erp/database';
import { eq, sql, desc } from 'drizzle-orm';

export interface CustomerCLV {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  clvScore: number; // 1-100
  churnRisk: 'low' | 'medium' | 'high';
}

export interface SalesTrend {
  period: string;
  revenue: number;
  ordersCount: number;
  growthRate: number;
}

@Injectable()
export class PredictiveAnalyticsService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Calculate Customer Lifetime Value (CLV) score for all customers.
   * Score is based on: total revenue, order frequency, average order value.
   */
  async calculateCLVScores(tenantId: string): Promise<CustomerCLV[]> {
    const customerStats = await this.drizzle.db.execute(
      sql`
        SELECT
          c.id as customer_id,
          c.name as customer_name,
          COALESCE(SUM(o.total), 0) as total_revenue,
          COUNT(o.id) as order_count,
          COALESCE(AVG(o.total), 0) as avg_order_value
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id AND o.tenant_id = ${tenantId}
        WHERE c.tenant_id = ${tenantId}
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
        LIMIT 50
      `,
    );

    const stats = customerStats as Array<{
      customer_id: string;
      customer_name: string;
      total_revenue: number;
      order_count: number;
      avg_order_value: number;
    }>;

    // Calculate CLV score (1-100) based on revenue percentile
    const maxRevenue = Math.max(...stats.map((s) => s.total_revenue), 1);
    const results: CustomerCLV[] = stats.map((s) => {
      const clvScore = Math.min(100, Math.round((s.total_revenue / maxRevenue) * 100));
      const churnRisk = s.order_count <= 1 ? 'high' : s.order_count <= 3 ? 'medium' : 'low';

      return {
        customerId: s.customer_id,
        customerName: s.customer_name,
        totalRevenue: Number(s.total_revenue),
        orderCount: s.order_count,
        avgOrderValue: Number(s.avg_order_value),
        clvScore,
        churnRisk,
      };
    });

    return results;
  }

  /**
   * Get weekly sales trend for the past 12 weeks.
   */
  async getSalesTrend(tenantId: string, weeks = 12): Promise<SalesTrend[]> {
    const trend = await this.drizzle.db.execute(
      sql`
        SELECT
          DATE_TRUNC('week', created_at) as period,
          SUM(total) as revenue,
          COUNT(*) as orders_count
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND created_at >= NOW() - INTERVAL '${sql.raw(`${weeks} weeks`)}'
          AND status != 'cancelled'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY period ASC
      `,
    );

    const data = trend as Array<{
      period: string;
      revenue: number;
      orders_count: number;
    }>;

    // Calculate growth rate between periods
    return data.map((d, idx) => ({
      period: d.period,
      revenue: Number(d.revenue),
      ordersCount: Number(d.orders_count),
      growthRate:
        idx > 0 ? Number((((d.revenue - (data[idx - 1]?.revenue ?? 0)) / (data[idx - 1]?.revenue ?? 1)) * 100).toFixed(1)) : 0,
    }));
  }

  /**
   * Get top at-risk customers (high churn risk).
   */
  async getAtRiskCustomers(tenantId: string): Promise<CustomerCLV[]> {
    const clvScores = await this.calculateCLVScores(tenantId);
    return clvScores.filter((c) => c.churnRisk !== 'low').slice(0, 10);
  }
}