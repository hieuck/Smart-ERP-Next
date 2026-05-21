import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { orders, products, customers } from '@smart-erp/database/schema';
import { eq, and, gte, sql, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class InsightsService {
  async getDashboardInsights(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);

    // Today's orders
    const todayOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, todayStart)));

    const todayRevenue = todayOrders.reduce(
      (s, o) => s + parseFloat(o.total as string),
      0
    );

    // Yesterday's revenue for trend
    const yesterdayOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          gte(orders.createdAt, yesterdayStart),
          sql`created_at < ${todayStart}`
        )
      );
    const yesterdayRevenue = yesterdayOrders.reduce(
      (s, o) => s + parseFloat(o.total as string),
      0
    );

    // Total customers
    const [{ customerCount }] = await db
      .select({ customerCount: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    // Low stock products
    const [{ lowStockCount }] = await db
      .select({ lowStockCount: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          sql`stock <= min_stock`
        )
      );

    // Weekly revenue chart (last 7 days)
    const weeklyOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, weekStart)));

    const revenueByDay = new Map<string, number>();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      revenueByDay.set(key, 0);
    }
    for (const o of weeklyOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (revenueByDay.has(key)) {
        revenueByDay.set(key, revenueByDay.get(key)! + parseFloat(o.total as string));
      }
    }
    const revenueChart = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({
      date: dayNames[new Date(date).getDay()],
      revenue,
    }));

    // Recent orders (last 5)
    const recentOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // Top products by order count (simplified — count order_items)
    const topProductsRaw = await db.execute(
      sql`
        SELECT oi.product_id, oi.product_name, oi.product_sku,
               SUM(oi.quantity)::int AS sold,
               SUM(oi.line_total)::numeric AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = ${tenantId}
          AND o.created_at >= ${weekStart}
        GROUP BY oi.product_id, oi.product_name, oi.product_sku
        ORDER BY sold DESC
        LIMIT 5
      `
    );

    // Rule-based insights
    const insights: { type: string; severity: string; message: string }[] = [];
    const revenueTrend =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;

    if (revenueTrend > 20) {
      insights.push({
        type: 'growth',
        severity: 'info',
        message: `📈 Revenue increased by ${revenueTrend.toFixed(1)}% compared to yesterday.`,
      });
    } else if (revenueTrend < -20) {
      insights.push({
        type: 'warning',
        severity: 'medium',
        message: `⚠️ Revenue decreased by ${Math.abs(revenueTrend).toFixed(1)}% compared to yesterday.`,
      });
    }

    if (lowStockCount > 0) {
      insights.push({
        type: 'alert',
        severity: 'high',
        message: `🔴 ${lowStockCount} products are running low. Restock needed.`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'info',
        severity: 'low',
        message: '✅ All metrics are stable. Keep up the good work!',
      });
    }

    return {
      todayRevenue,
      todayOrders: todayOrders.length,
      totalCustomers: customerCount,
      lowStockCount,
      revenueChart,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        code: o.code,
        customerName: 'Customer',
        total: parseFloat(o.total as string),
        status: o.status,
        createdAt: o.createdAt,
      })),
      topProducts: (topProductsRaw.rows as any[]).map((r) => ({
        id: r.product_id,
        name: r.product_name,
        sku: r.product_sku,
        sold: r.sold,
        revenue: parseFloat(r.revenue),
      })),
      insights,
      metrics: {
        todayRevenue,
        yesterdayRevenue,
        revenueTrend: parseFloat(revenueTrend.toFixed(1)),
        predictedNextMonth: await this.predictNextMonthRevenue(tenantId),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async predictNextMonthRevenue(tenantId: string) {
    const now = new Date();
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const historicalOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, last3Months)));

    const monthlyRevenue = new Map<number, number>();
    for (const o of historicalOrders) {
      const month = new Date(o.createdAt).getMonth();
      monthlyRevenue.set(month, (monthlyRevenue.get(month) ?? 0) + parseFloat(o.total as string));
    }

    const revenues = Array.from(monthlyRevenue.values());
    if (revenues.length < 2) return 0;

    // Simple Linear Regression / Trend analysis
    const sumX = revenues.reduce((a, _, i) => a + i, 0);
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = revenues.reduce((a, b, i) => a + b * i, 0);
    const sumX2 = revenues.reduce((a, _, i) => a + i * i, 0);
    const n = revenues.length;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next month (index n)
    const prediction = slope * n + intercept;
    return Math.max(0, parseFloat(prediction.toFixed(2)));
  }
}
