import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { suppliers, purchaseOrders, warehouseTasks } from '@smart-erp/database/schema';
import { eq, and, sql, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class SupplierPortalService {
  /** Get supplier's active purchase orders */
  async getPurchaseOrders(tenantId: string, supplierId: string) {
    return db
      .select({
        id: purchaseOrders.id,
        code: purchaseOrders.orderCode,
        status: purchaseOrders.status,
        total: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.supplierId, supplierId)))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  /** Supplier confirms shipment (ASN) */
  async confirmShipment(tenantId: string, supplierId: string, poId: string, data: { deliveryDate: string; trackingNumber?: string }) {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.supplierId, supplierId)))
      .limit(1);

    if (!po) throw new NotFoundException('Purchase Order not found');

    // Update PO status to 'shipping' or similar
    await db.update(purchaseOrders)
      .set({ 
        status: 'shipping', 
        updatedAt: new Date() 
      })
      .where(eq(purchaseOrders.id, poId));

    // Automatically create a 'receiving' task in WMS
    await db.insert(warehouseTasks).values({
      tenantId,
      type: 'putaway',
      status: 'pending',
      referenceType: 'purchase_order',
      referenceId: poId,
      priority: 'medium',
    });

    return { success: true, message: 'Shipment confirmed and warehouse task created.' };
  }

  /** Supplier submits a quotation for an RFQ */
  async submitQuotation(tenantId: string, supplierId: string, rfqId: string, quoteData: any) {
    // In a full implementation, this would save to a 'supplier_quotations' table
    return { success: true, rfqId, supplierId, status: 'submitted' };
  }
}
