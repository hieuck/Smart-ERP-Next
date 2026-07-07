import { Injectable, BadRequestException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { journalEntries, journalEntryLines, chartOfAccounts } from '@smart-erp/database/schema';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { CreateJournalEntryDto } from './dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class JournalEntriesService {
  async create(tenantId: string, userId: string, dto: CreateJournalEntryDto) {
    // Validate balance
    const totalDebit = dto.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException('Journal entry must be balanced');
    }

    // Generate voucher number
    const entryId = uuid();
    const year = new Date(dto.voucherDate).getFullYear();
    const count = await this.getEntryCount(tenantId, year);
    const voucherNumber = `BC${year}${String(count + 1).padStart(6, '0')}`;

    // Create entry
    await db.insert(journalEntries).values({
      id: entryId,
      tenantId,
      voucherNumber,
      voucherDate: new Date(dto.voucherDate),
      description: dto.description,
      totalAmount: totalDebit.toString(),
      createdBy: userId,
    });

    // Create lines
    await db.insert(journalEntryLines).values(
      dto.lines.map((line, index) => ({
        tenantId,
        journalEntryId: entryId,
        accountId: line.accountId,
        debit: (line.debit || 0).toString(),
        credit: (line.credit || 0).toString(),
        lineDescription: line.description || `Line ${index + 1}`,
      }))
    );

    return this.findOne(tenantId, entryId);
  }

  async findAll(
    tenantId: string,
    filters?: { page?: number; limit?: number; isPosted?: boolean; fromDate?: Date; toDate?: Date }
  ) {
    const conditions = [eq(journalEntries.tenantId, tenantId)];

    if (filters?.isPosted !== undefined) {
      conditions.push(eq(journalEntries.isPosted, filters.isPosted));
    }

    if (filters?.fromDate) {
      conditions.push(gte(journalEntries.voucherDate, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(journalEntries.voucherDate, filters.toDate));
    }

    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.voucherDate));

    return {
      items: entries,
      total: entries.length,
      page: filters?.page || 1,
      limit: filters?.limit || 50,
    };
  }

  async findOne(tenantId: string, id: string) {
    const entry = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.id, id)))
      .limit(1);

    if (!entry[0]) return null;

    const lines = await db
      .select({
        id: journalEntryLines.id,
        accountId: journalEntryLines.accountId,
        accountCode: chartOfAccounts.accountCode,
        accountName: chartOfAccounts.accountName,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
        description: journalEntryLines.lineDescription,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(eq(journalEntryLines.journalEntryId, id))
      .orderBy(journalEntryLines.createdAt);

    return {
      ...entry[0],
      lines,
      totalDebit: lines.reduce((sum, l) => sum + parseFloat(l.debit || '0'), 0),
      totalCredit: lines.reduce((sum, l) => sum + parseFloat(l.credit || '0'), 0),
    };
  }

  async post(tenantId: string, userId: string, id: string) {
    const entry = await this.findOne(tenantId, id);
    if (!entry) throw new BadRequestException('Entry not found');
    if (entry.isPosted) throw new BadRequestException('Entry already posted');

    await db
      .update(journalEntries)
      .set({
        isPosted: true,
        approvedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.id, id)));

    // Update account balances would go here
    // For now, just mark as posted

    return { success: true, entryId: id };
  }

  async reverse(tenantId: string, userId: string, id: string, reason?: string) {
    const original = await this.findOne(tenantId, id);
    if (!original) throw new BadRequestException('Entry not found');
    if (!original.isPosted) throw new BadRequestException('Can only reverse posted entries');
    // @ts-ignore
    if (original.isReversed) throw new BadRequestException('Entry already reversed');

    // Create reverse entry
    const reverseId = uuid();
    const year = new Date().getFullYear();
    const count = await this.getEntryCount(tenantId, year);

    await db.insert(journalEntries).values({
      id: reverseId,
      tenantId,
      voucherNumber: `BC${year}${String(count + 1).padStart(6, '0')}`,
      voucherDate: new Date(),
      description: `Reverse journal entry ${original.voucherNumber}${reason ? `: ${reason}` : ''}`,
      totalAmount: original.totalAmount,
      isPosted: true,
      approvedBy: userId,
      createdBy: userId,
    });

    // Create reversed lines (swap debit/credit)
    await db.insert(journalEntryLines).values(
      original.lines.map((line, index) => ({
        tenantId,
        journalEntryId: reverseId,
        accountId: line.accountId,
        debit: line.credit, // Swap!
        credit: line.debit, // Swap!
        lineDescription: line.description || `Reverse line ${index + 1}`,
      }))
    );

    return { success: true, originalEntryId: id, reverseEntryId: reverseId };
  }

  async getTrialBalance(tenantId: string, fromDate?: Date, toDate?: Date) {
    const conditions = [
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.isPosted, true),
    ];

    if (fromDate) conditions.push(gte(journalEntries.voucherDate, fromDate));
    if (toDate) conditions.push(lte(journalEntries.voucherDate, toDate));

    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(...conditions));

    const entryIds = entries.map((e) => e.id);

    if (entryIds.length === 0) {
      return { items: [], totalDebit: 0, totalCredit: 0 };
    }

    const lines = await db
      .select({
        accountId: journalEntryLines.accountId,
        accountCode: chartOfAccounts.accountCode,
        accountName: chartOfAccounts.accountName,
        accountType: chartOfAccounts.accountType,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(inArray(journalEntryLines.journalEntryId, entryIds));

    // Group by account
    const accountBalances = new Map<string, any>();
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      if (!accountBalances.has(line.accountId)) {
        accountBalances.set(line.accountId, {
          accountId: line.accountId,
          accountCode: line.accountCode,
          accountName: line.accountName,
          accountType: line.accountType,
          debit: 0,
          credit: 0,
        });
      }
      const acc = accountBalances.get(line.accountId)!;
      acc.debit += parseFloat(line.debit || '0');
      acc.credit += parseFloat(line.credit || '0');
      totalDebit += parseFloat(line.debit || '0');
      totalCredit += parseFloat(line.credit || '0');
    }

    return {
      items: Array.from(accountBalances.values()),
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  private async getEntryCount(tenantId: string, year: number): Promise<number> {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          // Note: In production, filter by year from voucher date
        )
      );

    return entries.length;
  }
}
