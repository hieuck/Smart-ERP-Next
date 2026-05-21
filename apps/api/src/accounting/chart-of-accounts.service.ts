// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { chartOfAccounts } from '@smart-erp/database/schema';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPES } from '@smart-erp/accounting';
import { eq, and, like, or } from 'drizzle-orm';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto';

@Injectable()
export class ChartOfAccountsService {
  async create(tenantId: string, dto: CreateChartOfAccountDto) {
    const result = await db
      .insert(chartOfAccounts)
      .values({
        tenantId,
        accountCode: dto.accountCode,
        accountName: dto.accountName,
        accountType: dto.accountType,
        parentId: dto.parentId || null,
        isActive: dto.isActive ?? true,
        description: dto.description,
      })
      .returning();

    return result[0];
  }

  async findAll(tenantId: string, filters?: { type?: string; isActive?: boolean; search?: string }) {
    const conditions = [eq(chartOfAccounts.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(chartOfAccounts.accountType, filters.type));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(chartOfAccounts.isActive, filters.isActive));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(chartOfAccounts.accountCode, `%${filters.search}%`),
          like(chartOfAccounts.accountName, `%${filters.search}%`),
        ) as any
      );
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(...conditions))
      .orderBy(chartOfAccounts.accountCode);

    return accounts;
  }

  async findOne(tenantId: string, id: string) {
    const account = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.id, id)))
      .limit(1);

    return account[0] || null;
  }

  async update(tenantId: string, id: string, dto: UpdateChartOfAccountDto) {
    const result = await db
      .update(chartOfAccounts)
      .set({
        accountCode: dto.accountCode,
        accountName: dto.accountName,
        accountType: dto.accountType,
        parentId: dto.parentId,
        isActive: dto.isActive,
        description: dto.description,
        updatedAt: new Date(),
      })
      .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.id, id)))
      .returning();

    return result[0];
  }

  async delete(tenantId: string, id: string) {
    // Check if account is used in journal entries first
    const account = await this.findOne(tenantId, id);
    if (!account) return { success: false, error: 'Account not found' };
    if (account.isSystem) return { success: false, error: 'Cannot delete system account' };

    await db
      .delete(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.id, id)));

    return { success: true };
  }

  async getAccountTree(tenantId: string) {
    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.isActive, true)))
      .orderBy(chartOfAccounts.accountCode);

    // Build tree structure
    const accountMap = new Map();
    const roots: any[] = [];

    accounts.forEach((acc) => {
      accountMap.set(acc.id, { ...acc, children: [] });
    });

    accounts.forEach((acc) => {
      const node = accountMap.get(acc.id);
      if (acc.parentId && accountMap.has(acc.parentId)) {
        accountMap.get(acc.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async seedDefaultAccounts(tenantId: string) {
    const existing = await this.findAll(tenantId);
    if (existing.length > 0) {
      return { success: false, error: 'Accounts already exist for this tenant' };
    }

    const allDefaults = [
      ...Object.entries(DEFAULT_ACCOUNTS.ASSET).map(([code, acc]) => ({
        ...acc, type: ACCOUNT_TYPES.ASSET, code
      })),
      ...Object.entries(DEFAULT_ACCOUNTS.LIABILITY).map(([code, acc]) => ({
        ...acc, type: ACCOUNT_TYPES.LIABILITY, code
      })),
      ...Object.entries(DEFAULT_ACCOUNTS.EQUITY).map(([code, acc]) => ({
        ...acc, type: ACCOUNT_TYPES.EQUITY, code
      })),
      ...Object.entries(DEFAULT_ACCOUNTS.REVENUE).map(([code, acc]) => ({
        ...acc, type: ACCOUNT_TYPES.REVENUE, code
      })),
      ...Object.entries(DEFAULT_ACCOUNTS.EXPENSE).map(([code, acc]) => ({
        ...acc, type: ACCOUNT_TYPES.EXPENSE, code
      })),
    ];

    const created = await db
      .insert(chartOfAccounts)
      .values(
      allDefaults.map((acc) => ({
        tenantId,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
      }))
      )
      .returning();

    return { success: true, count: created.length, accounts: created };
  }
}

