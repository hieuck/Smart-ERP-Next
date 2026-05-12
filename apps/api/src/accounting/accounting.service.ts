import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from '@smart-erp/accounting/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

@Injectable()
export class AccountingService {
  async getDashboard(tenantId: string, period?: string) {
    const year = period ? parseInt(period) : new Date().getFullYear();
    const yearStart = new Date(year, 0, 1).toISOString();
    const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString();

    // Get posted entries for the year
    const postedEntries = await db
      .select({
        id: journalEntries.id,
        totalAmount: journalEntries.totalAmount,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.isPosted, true),
          gte(journalEntries.voucherDate, yearStart),
          lte(journalEntries.voucherDate, yearEnd),
        )
      );

    const entryIds = postedEntries.map((e) => e.id);

    let totalRevenue = 0;
    let totalExpense = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let cashBalance = 0;
    let bankBalance = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;

    if (entryIds.length > 0) {
      // Get all lines for posted entries
      const lines = await db
        .select({
          accountId: journalEntryLines.accountId,
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
          accountType: chartOfAccounts.accountType,
          accountCode: chartOfAccounts.accountCode,
        })
        .from(journalEntryLines)
        .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
        .where(
          db.sql`${journalEntryLines.journalEntryId} = ANY(${entryIds})`
        );

      for (const line of lines) {
        const debit = parseFloat(line.debit || '0');
        const credit = parseFloat(line.credit || '0');
        const net = debit - credit;

        switch (line.accountType) {
          case 'revenue':
            totalRevenue += credit - debit; // Revenue increases on credit
            break;
          case 'expense':
            totalExpense += debit - credit; // Expense increases on debit
            break;
          case 'asset':
            totalAssets += net;
            if (line.accountCode === '1111') cashBalance += net;
            if (line.accountCode === '1121') bankBalance += net;
            if (line.accountCode === '1311') accountsReceivable += net;
            break;
          case 'liability':
            totalLiabilities -= net; // Liabilities increase on credit
            if (line.accountCode === '3311') accountsPayable -= net;
            break;
          case 'equity':
            totalEquity -= net; // Equity increases on credit
            break;
        }
      }
    }

    const netIncome = totalRevenue - totalExpense;
    const netAssets = totalAssets - totalLiabilities - totalEquity;

    // Get recent journal entries (last 10)
    const recentEntries = await db
      .select({
        id: journalEntries.id,
        voucherNumber: journalEntries.voucherNumber,
        description: journalEntries.description,
        totalDebit: journalEntries.totalAmount,
        totalCredit: journalEntries.totalAmount,
        voucherDate: journalEntries.voucherDate,
        isPosted: journalEntries.isPosted,
      })
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId))
      .orderBy(desc(journalEntries.voucherDate))
      .limit(10);

    // Build monthly cashflow data
    const monthlyCashflow: { month: string; income: number; expense: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1).toISOString();
      const monthEnd = new Date(year, m + 1, 0, 23, 59, 59).toISOString();

      const monthEntries = await db
        .select({
          totalAmount: journalEntries.totalAmount,
        })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, tenantId),
            eq(journalEntries.isPosted, true),
            gte(journalEntries.voucherDate, monthStart),
            lte(journalEntries.voucherDate, monthEnd),
          )
        );

      const monthTotal = monthEntries.reduce(
        (sum, e) => sum + parseFloat(e.totalAmount || '0'),
        0
      );

      monthlyCashflow.push({
        month: `${m + 1}/T${year}`,
        income: monthTotal,
        expense: 0,
      });
    }

    return {
      totalRevenue,
      totalExpense,
      netIncome,
      totalAssets,
      totalLiabilities,
      equity: totalEquity,
      netAssets,
      cashBalance,
      bankBalance,
      accountsReceivable,
      accountsPayable,
      revenueBreakdown: [{ category: 'Doanh thu', amount: totalRevenue }],
      expenseBreakdown: [{ category: 'Chi phí', amount: totalExpense }],
      monthlyCashflow,
      topExpenses: [],
      revenueTrend: monthlyCashflow.map((m) => ({ date: m.month, amount: m.income })),
      recentJournalEntries: recentEntries.map((e) => ({
        ...e,
        totalDebit: parseFloat(e.totalDebit || '0'),
        totalCredit: parseFloat(e.totalCredit || '0'),
        voucherDate: e.voucherDate.toISOString().split('T')[0],
      })),
    };
  }

  async getReports(tenantId: string, type?: string, period?: string) {
    // Placeholder for advanced reporting
    return { type, period, data: [] };
  }
}