import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { financeBudgets, financeBudgetLines, financeCashflowForecasts, orders, purchaseOrders } from '@smart-erp/database/schema';
import { eq, and, sql, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class FinanceService {
  /**
   * Generate Cashflow Forecast for the next period
   */
  async generateForecast(tenantId: string, period: string) {
    // 1. Calculate Expected Inflow (Pending Sales Orders / AR)
    const [{ inflow }] = await db
      .select({ inflow: sql<string>`SUM(total)` })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.status, 'confirmed')));

    // 2. Calculate Expected Outflow (Pending Purchase Orders / AP)
    const [{ outflow }] = await db
      .select({ outflow: sql<string>`SUM(total)` })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.status, 'confirmed')));

    const openingBalance = 5000000000; // Mock current bank balance
    const netCashflow = parseFloat(inflow || '0') - parseFloat(outflow || '0');

    const [forecast] = await db.insert(financeCashflowForecasts).values({
      tenantId,
      period,
      openingBalance: openingBalance.toString(),
      expectedInflow: (inflow || '0').toString(),
      expectedOutflow: (outflow || '0').toString(),
      netCashflow: netCashflow.toString(),
    }).returning();

    return forecast;
  }

  async listBudgets(tenantId: string) {
    return db
      .select()
      .from(financeBudgets)
      .where(eq(financeBudgets.tenantId, tenantId))
      .orderBy(desc(financeBudgets.createdAt));
  }

  async getBudgetVariance(tenantId: string, budgetId: string) {
    const lines = await db
      .select()
      .from(financeBudgetLines)
      .where(eq(financeBudgetLines.budgetId, budgetId));

    return lines.map(line => ({
      category: line.category,
      planned: parseFloat(line.plannedAmount),
      actual: parseFloat(line.actualAmount || '0'),
      variance: parseFloat(line.plannedAmount) - parseFloat(line.actualAmount || '0'),
      percentSpent: parseFloat(line.plannedAmount) > 0 
        ? (parseFloat(line.actualAmount || '0') / parseFloat(line.plannedAmount)) * 100 
        : 0
    }));
  }
}
