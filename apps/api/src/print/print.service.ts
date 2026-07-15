import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eInvoices, eInvoiceItems, purchaseOrders, purchaseOrderItems } from '@smart-erp/database';
import { eq, and } from 'drizzle-orm';

export interface PrintData {
  title: string;
  templateName: string;
  data: Record<string, any>;
}

@Injectable()
export class PrintService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Escape HTML special characters to prevent stored XSS */
  private h(str: unknown): string {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async renderInvoice(tenantId: string, invoiceId: string): Promise<string> {
    const [invoice] = await this.drizzle.db
      .select()
      .from(eInvoices)
      .where(and(eq(eInvoices.tenantId, tenantId), eq(eInvoices.id, invoiceId)))
      .limit(1);

    if (!invoice) throw new Error('Invoice not found');

    const items = await this.drizzle.db
      .select()
      .from(eInvoiceItems)
      .where(eq(eInvoiceItems.invoiceId, invoiceId));

    const data = { ...invoice, items };
    return this.renderHtml('invoice', data);
  }

  async renderPurchaseOrder(tenantId: string, poId: string): Promise<string> {
    const [po] = await this.drizzle.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, poId)))
      .limit(1);

    if (!po) throw new Error('Purchase order not found');

    const items = await this.drizzle.db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, poId));

    const data = { ...po, items };
    return this.renderHtml('purchase-order', data);
  }

  private renderHtml(type: string, data: any): string {
    const isInvoice = type === 'invoice';
    const title = isInvoice ? 'INVOICE' : 'PURCHASE ORDER';
    const date = data.date || data.orderDate || new Date().toISOString().split('T')[0];
    const items = data.items || data.lineItems || [];
    const total = data.total ?? data.totalAmount ?? 0;

    const buyerName = data.buyerName || data.customerName || data.supplierName || '';
    const buyerAddress = data.buyerAddress || data.customerAddress || data.supplierAddress || '';

    return `<!DOCTYPE html>
<html><head><style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
  h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .buyer-info { margin-bottom: 16px; }
  .total { text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 16px; }
  .footer { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 0.9em; color: #666; }
  @media print { body { margin: 20px; } }
</style></head><body>
  <div class="header">
    <div><h1>${this.h(title)}</h1></div>
    <div><p>Date: ${this.h(date)}</p></div>
  </div>
  ${buyerName ? `<div class="buyer-info"><strong>${isInvoice ? 'Bill To' : 'Supplier'}:</strong> ${this.h(buyerName)}${buyerAddress ? ` &mdash; ${this.h(buyerAddress)}` : ''}</div>` : ''}
  <table>
    <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    ${items.map((item: any) => `
      <tr><td>${this.h(item.name || item.itemName || item.productName)}</td>
      <td>${this.h(item.quantity ?? '')}</td>
      <td>$${this.h(item.unitPrice ?? item.price ?? 0)}</td>
      <td>$${this.h((item.quantity ?? 0) * (item.unitPrice ?? item.price ?? 0))}</td></tr>
    `).join('')}
  </table>
  <div class="total">Total: $${this.h(total)}</div>
  <div class="footer">
    <p>Smart ERP Next — Generated on ${this.h(new Date().toISOString())}</p>
  </div>
</body></html>`;
  }
}
