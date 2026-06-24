import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eInvoices, eInvoiceItems } from '@smart-erp/database';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface CreateEInvoiceDto {
  orderId?: string;
  customerId?: string;
  buyerName: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  invoiceSeries: string;
  invoiceTemplate?: string;
  vatRate?: number;
  currency?: string;
  provider?: string;
  notes?: string;
  lineItems: Array<{
    itemName: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    discountRate?: number;
    vatRate?: number;
  }>;
}

@Injectable()
export class EInvoiceService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Create draft e-invoice */
  async create(tenantId: string, userId: string, dto: CreateEInvoiceDto) {
    const vatRate = dto.vatRate ?? 10;

    // Calculate line items
    let subtotal = 0;
    let vatAmount = 0;
    const processedItems = dto.lineItems.map((item, idx) => {
      const lineVatRate = item.vatRate ?? vatRate;
      const discountRate = item.discountRate ?? 0;
      const lineSubtotal = item.quantity * item.unitPrice * (1 - discountRate / 100);
      const lineVat = lineSubtotal * (lineVatRate / 100);
      subtotal += lineSubtotal;
      vatAmount += lineVat;
      return {
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountRate: String(discountRate),
        subtotal: String(Math.round(lineSubtotal)),
        vatRate: String(lineVatRate),
        vatAmount: String(Math.round(lineVat)),
        totalAmount: String(Math.round(lineSubtotal + lineVat)),
        sequenceOrder: idx + 1,
      };
    });

    const totalAmount = Math.round(subtotal + vatAmount);

    const [invoice] = await this.drizzle.db
      .insert(eInvoices)
      .values({
        tenantId,
        orderId: dto.orderId,
        customerId: dto.customerId,
        createdBy: userId,
        invoiceSeries: dto.invoiceSeries,
        invoiceTemplate: dto.invoiceTemplate || '01GTKT0/001',
        buyerName: dto.buyerName,
        buyerTaxCode: dto.buyerTaxCode,
        buyerAddress: dto.buyerAddress,
        buyerEmail: dto.buyerEmail,
        buyerPhone: dto.buyerPhone,
        subtotal: String(Math.round(subtotal)),
        vatRate: String(vatRate),
        vatAmount: String(Math.round(vatAmount)),
        totalAmount: String(totalAmount),
        currency: dto.currency || 'VND',
        provider: dto.provider || 'vnpt',
        notes: dto.notes,
        status: 'draft',
        lineItems: processedItems,
      })
      .returning();

    // Insert line items to normalized table
    if (processedItems.length > 0) {
      await this.drizzle.db.insert(eInvoiceItems).values(
        processedItems.map(item => ({
          tenantId,
          invoiceId: invoice.id,
          ...item,
        }))
      );
    }

    return invoice;
  }

  /** Issue (phat hanh) e-invoice — call provider API */
  async issue(tenantId: string, invoiceId: string) {
    const [invoice] = await this.drizzle.db
      .select()
      .from(eInvoices)
      .where(and(eq(eInvoices.tenantId, tenantId), eq(eInvoices.id, invoiceId)))
      .limit(1);

    if (!invoice) throw new NotFoundException('E-Invoice not found');
    if (invoice.status !== 'draft' && invoice.status !== 'signed') {
      throw new BadRequestException(`Cannot issue invoice in status: ${invoice.status}`);
    }

    // Mock: generate invoice number (in production, call VNPT/Viettel API)
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);
    const lookupCode = `${invoiceNumber}-${Date.now().toString(36).toUpperCase()}`;
    const qrCode = `https://hoadondientu.gdt.gov.vn/tra-cuu?ma=${lookupCode}`;

    const [updated] = await this.drizzle.db
      .update(eInvoices)
      .set({
        status: 'issued',
        invoiceNumber,
        issuedAt: new Date(),
        lookupCode,
        qrCode,
        viewUrl: `${invoice.provider === 'vnpt' ? 'https://vinvoice.viettel.vn' : 'https://einvoice.vnpt.vn'}/view/${lookupCode}`,
        pdfUrl: `${invoice.provider === 'vnpt' ? 'https://vinvoice.viettel.vn' : 'https://einvoice.vnpt.vn'}/pdf/${lookupCode}`,
        updatedAt: new Date(),
      })
      .where(eq(eInvoices.id, invoiceId))
      .returning();

    return updated;
  }

  /** Cancel (huy) e-invoice */
  async cancel(tenantId: string, invoiceId: string, reason: string) {
    const [invoice] = await this.drizzle.db
      .select()
      .from(eInvoices)
      .where(and(eq(eInvoices.tenantId, tenantId), eq(eInvoices.id, invoiceId)))
      .limit(1);

    if (!invoice) throw new NotFoundException('E-Invoice not found');
    if (!['issued'].includes(invoice.status)) {
      throw new BadRequestException('Only issued invoices can be cancelled');
    }
    if (!reason?.trim()) {
      throw new BadRequestException('Cancellation reason is required');
    }

    const [updated] = await this.drizzle.db
      .update(eInvoices)
      .set({ status: 'cancelled', cancellationReason: reason, updatedAt: new Date() })
      .where(eq(eInvoices.id, invoiceId))
      .returning();

    return updated;
  }

  /** Replace (thay the) e-invoice */
  async replace(tenantId: string, originalInvoiceId: string, userId: string, dto: CreateEInvoiceDto) {
    const [original] = await this.drizzle.db
      .select()
      .from(eInvoices)
      .where(and(eq(eInvoices.tenantId, tenantId), eq(eInvoices.id, originalInvoiceId)))
      .limit(1);

    if (!original) throw new NotFoundException('Original invoice not found');
    if (!['issued', 'adjusted'].includes(original.status)) {
      throw new BadRequestException('Only issued invoices can be replaced');
    }

    // Create new invoice
    const newInvoice = await this.create(tenantId, userId, dto);

    // Link and mark original
    await this.drizzle.db
      .update(eInvoices)
      .set({ status: 'replaced', updatedAt: new Date() })
      .where(eq(eInvoices.id, originalInvoiceId));

    // Set replacement reference
    await this.drizzle.db
      .update(eInvoices)
      .set({ replacesInvoiceId: originalInvoiceId, updatedAt: new Date() })
      .where(eq(eInvoices.id, newInvoice.id));

    return newInvoice;
  }

  /** List invoices with pagination */
  async list(tenantId: string, filters: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;

    let query = sql`
      SELECT e.*, c.name as customer_name
      FROM e_invoices e
      LEFT JOIN customers c ON c.id = e.customer_id
      WHERE e.tenant_id = ${tenantId}
    `;

    if (status) query = sql`${query} AND e.status = ${status}`;
    query = sql`${query} ORDER BY e.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const rows = await this.drizzle.db.execute(query);
    return { items: rows, page, limit };
  }

  /** Get invoice detail with line items */
  async findById(tenantId: string, invoiceId: string) {
    const [invoice] = await this.drizzle.db
      .select()
      .from(eInvoices)
      .where(and(eq(eInvoices.tenantId, tenantId), eq(eInvoices.id, invoiceId)))
      .limit(1);

    if (!invoice) throw new NotFoundException('E-Invoice not found');

    const items = await this.drizzle.db
      .select()
      .from(eInvoiceItems)
      .where(eq(eInvoiceItems.invoiceId, invoiceId))
      .orderBy(eInvoiceItems.sequenceOrder);

    return { ...invoice, items };
  }

  /** Get monthly summary stats */
  async getStats(tenantId: string, year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const result = await this.drizzle.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'issued')::int  AS issued_count,
        COUNT(*) FILTER (WHERE status = 'draft')::int   AS draft_count,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
        SUM(total_amount::numeric) FILTER (WHERE status = 'issued') AS total_revenue,
        SUM(vat_amount::numeric)   FILTER (WHERE status = 'issued') AS total_vat
      FROM e_invoices
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${start}::date
        AND created_at <  ${end}::date
    `);

    return (result as any[])[0] || {};
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const result = await this.drizzle.db.execute(sql`
      SELECT COUNT(*) + 1 AS next_num
      FROM e_invoices
      WHERE tenant_id = ${tenantId} AND status != 'draft'
    `);
    const nextNum = Number((result as any[])[0]?.next_num || 1);
    return String(nextNum).padStart(7, '0');
  }
}
