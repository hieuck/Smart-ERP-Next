import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { crmLeads } from '@smart-erp/database';
import { orders, e_contracts } from '@smart-erp/database';
import { eq, sql, gte, and } from 'drizzle-orm';

const DEFAULT_REVENUE_TARGET = 100_000_000;

@Injectable()
export class AiCopilotService {
  constructor(private readonly drizzle: DrizzleService) {}

  private getRevenueTarget(): number {
    const envTarget = process.env.REVENUE_TARGET;
    if (!envTarget) return DEFAULT_REVENUE_TARGET;

    const parsed = Number(envTarget);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REVENUE_TARGET;

    return parsed;
  }

  async getExecutiveInsights(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Calculate Revenue (use total column)
    const revenueRes = await this.drizzle.db
      .select({ total: sql<number>`sum(${orders.total})` })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, startOfMonth)));
    const revenue = revenueRes[0]?.total || 0;

    // 2. Count CRM Leads
    const leadsRes = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(crmLeads)
      .where(and(eq(crmLeads.tenantId, tenantId), gte(crmLeads.createdAt, startOfMonth)));
    const leadsCount = leadsRes[0]?.count || 0;

    // 3. High-priority leads as a simple metric
    const highPriorityRes = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(crmLeads)
      .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.status, 'new')));
    const highPriority = highPriorityRes[0]?.count || 0;

    // 4. E-Contract Status
    const signedContractsRes = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(e_contracts)
      .where(and(eq(e_contracts.tenantId, tenantId), eq(e_contracts.status, 'signed')));
    const signedCount = signedContractsRes[0]?.count || 0;

    let healthStatus = 'on track';
    const recommendations: string[] = [];

    if (highPriority > 5) {
      healthStatus = 'needs attention';
      recommendations.push('High number of new leads. Review sales pipeline.');
    }
    const revenueTarget = this.getRevenueTarget();
    if (revenue < revenueTarget) {
      recommendations.push('Revenue below target. Push CRM leads conversion.');
    }

    return {
      revenue,
      revenueTarget,
      leadsCount,
      highPriority,
      signedCount,
      healthStatus,
      summary: `System is currently ${healthStatus}.`,
      recommendations,
      generatedAt: now.toISOString(),
    };
  }
}
