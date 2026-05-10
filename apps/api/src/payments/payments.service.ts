import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { payments } from '@smart-erp/database/schema';
import { eq, and, ilike, sql, desc, gte, lte } from 'drizzle-orm';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private async generateCode(tenantId: string, type: string): Promise<string> {
    const prefix = type === 'receipt' ? 'PT' : 'PC';
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.type, type)));
    return `${prefix}-${(count + 1).toString().padStart(6, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: CreatePaymentDto) {
    const code = await this.generateCode(tenantId, dto.type);
    const [payment] = await db
      .insert(payments)
      .values({
        tenantId,
        code,
        type: dto.type,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
        partyType: dto.partyType ?? null,
        partyId: dto.partyId ?? null,
        partyName: dto.partyName ?? null,
        amount: dto.amount.toString(),
        method: dto.method,
        bankAccount: dto.bankAccount ?? null,
        transactionRef: dto.transactionRef ?? null,
        status: 'completed',
        notes: dto.notes ?? null,
        createdBy: userId,
        paidAt: new Date(),
      })
      .returning();
    return payment;
  }

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      type?: string;
      method?: string;
      from?: string;
      to?: string;
    }
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(payments.tenantId, tenantId)];
    if (query.type) conditions.push(eq(payments.type, query.type));
    if (query.method) conditions.push(eq(payments.method, query.method));
    if (query.from) conditions.push(gte(payments.paidAt, new Date(query.from)));
    if (query.to) conditions.push(lte(payments.paidAt, new Date(query.to)));

    const where = and(...conditions);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(where);

    const items = await db
      .select()
      .from(payments)
      .where(where)
      .orderBy(desc(payments.paidAt))
      .limit(limit)
      .offset(offset);

    return { items, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.id, id)));
    if (!payment) throw new NotFoundException('Không tìm thấy phiếu thu/chi');
    return payment;
  }

  async getSummary(tenantId: string, from?: string, to?: string) {
    const conditions = [eq(payments.tenantId, tenantId), eq(payments.status, 'completed')];
    if (from) conditions.push(gte(payments.paidAt, new Date(from)));
    if (to) conditions.push(lte(payments.paidAt, new Date(to)));

    const rows = await db.execute(
      sql`
        SELECT
          type,
          SUM(amount)::numeric AS total,
          COUNT(*)::int AS count
        FROM payments
        WHERE tenant_id = ${tenantId}
          AND status = 'completed'
          ${from ? sql`AND paid_at >= ${new Date(from)}` : sql``}
          ${to ? sql`AND paid_at <= ${new Date(to)}` : sql``}
        GROUP BY type
      `
    );

    const summary = { receipt: 0, payment: 0, receiptCount: 0, paymentCount: 0 };
    for (const row of rows.rows as any[]) {
      if (row.type === 'receipt') {
        summary.receipt = parseFloat(row.total ?? '0');
        summary.receiptCount = row.count;
      } else {
        summary.payment = parseFloat(row.total ?? '0');
        summary.paymentCount = row.count;
      }
    }
    summary['balance'] = summary.receipt - summary.payment;
    return summary;
  }
}
