import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { customers, orders } from '@smart-erp/database/schema';
import { and, eq, sql, desc } from '@smart-erp/database/drizzle';
import { subDays, differenceInDays } from 'date-fns';

interface CustomerMetrics {
  customerId: string;
  totalSpent: number;
  avgOrderValue: number;
  frequency: number;        // orders per month (last 12 months)
  recencyDays: number;
}

@Injectable()
export class ClvService {
  /**
   * Compute CLV for all customers of a tenant.
   * Simple model: CLV = (avgOrderValue * frequency * 12) * survival factor based on recency.
   * Survival factor: 1 if recency < 30 days, else decays.
   */
  async computeAndStore(tenantId: string): Promise<void> {
    const metrics = await this.computeMetrics(tenantId);
    const runDate = new Date().toISOString().slice(0, 10);

    for (const m of metrics) {
      let predictedClv = m.avgOrderValue * m.frequency * 12; // annual value
      let segment = 'low';
      // adjust for recency (risk)
      let recencyFactor = Math.max(0, 1 - m.recencyDays / 365);
      predictedClv = predictedClv * recencyFactor;

      // segmentation
      if (predictedClv > 10_000_000) segment = 'vip';
      else if (predictedClv > 3_000_000) segment = 'high';
      else if (predictedClv > 1_000_000) segment = 'medium';
      else if (m.recencyDays > 90) segment = 'at_risk';
      else segment = 'low';

      // compute confidence based on stable purchase history (simplified)
      const confidence = Math.min(100, Math.round((m.frequency / 2) * 20));

      await db.execute(sql`
        INSERT INTO customer_lifetime_values (tenant_id, customer_id, run_date, total_spent, avg_order_value, purchase_frequency, recency_days, predicted_clv, segment, confidence_score)
        VALUES (${tenantId}, ${m.customerId}, ${runDate}, ${m.totalSpent}, ${m.avgOrderValue}, ${m.frequency}, ${m.recencyDays}, ${predictedClv}, ${segment}, ${confidence})
        ON CONFLICT (tenant_id, customer_id, run_date) DO UPDATE
        SET predicted_clv = ${predictedClv}, segment = ${segment}, confidence_score = ${confidence}
      `);
    }
  }

  private async computeMetrics(tenantId: string): Promise<CustomerMetrics[]> {
    // get all customers of tenant
    const customerRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    if (customerRows.length === 0) return [];

    const customerIds = customerRows.map(r => r.id);
    const oneYearAgo = subDays(new Date(), 365);

    const metrics: CustomerMetrics[] = [];
    for (const cid of customerIds) {
      // aggregate orders in last 12 months
      const agg = await db.execute(sql`
        SELECT
          COALESCE(SUM(total), 0) as total_spent,
          COALESCE(AVG(total), 0) as avg_order_value,
          COALESCE(COUNT(*), 0) as order_count,
          COALESCE(MAX(created_at), '1970-01-01') as last_order_date
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND customer_id = ${cid}
          AND created_at >= ${oneYearAgo.toISOString()}
      `);
      const row = agg.rows[0] as any;
      const orderCount = Number(row.order_count);
      const totalSpent = parseFloat(row.total_spent);
      const avgOrderVal = orderCount > 0 ? totalSpent / orderCount : 0;
      const frequency = orderCount > 0 ? orderCount / 12 : 0;
      const lastOrder = new Date(row.last_order_date);
      const recencyDays = orderCount > 0 ? differenceInDays(new Date(), lastOrder) : 365;
      metrics.push({
        customerId: cid,
        totalSpent,
        avgOrderValue: avgOrderVal,
        frequency,
        recencyDays,
      });
    }
    return metrics;
  }

  async getLatestPredictions(tenantId: string, segment?: string) {
    const latestRun = await db.execute(sql`
      SELECT run_date FROM customer_lifetime_values
      WHERE tenant_id = ${tenantId}
      ORDER BY run_date DESC
      LIMIT 1
    `);
    if (latestRun.rows.length === 0) return [];
    const runDate = latestRun.rows[0].run_date;

    let query = sql`
      SELECT c.name, c.email, c.phone, clv.*
      FROM customer_lifetime_values clv
      JOIN customers c ON c.id = clv.customer_id
      WHERE clv.tenant_id = ${tenantId} AND clv.run_date = ${runDate}
    `;
    if (segment) {
      query = sql`${query} AND clv.segment = ${segment}`;
    }
    query = sql`${query} ORDER BY clv.predicted_clv DESC`;
    const rows = await db.execute(query);
    return rows.rows;
  }

  async getSegmentationSummary(tenantId: string) {
    const latestRun = await db.execute(sql`
      SELECT run_date FROM customer_lifetime_values
      WHERE tenant_id = ${tenantId}
      ORDER BY run_date DESC
      LIMIT 1
    `);
    if (latestRun.rows.length === 0) return null;
    const runDate = latestRun.rows[0].run_date;

    const summary = await db.execute(sql`
      SELECT
        segment,
        COUNT(*) as count,
        SUM(predicted_clv) as total_clv,
        AVG(predicted_clv) as avg_clv
      FROM customer_lifetime_values
      WHERE tenant_id = ${tenantId} AND run_date = ${runDate}
      GROUP BY segment
      ORDER BY avg_clv DESC
    `);
    return summary.rows;
  }
}
