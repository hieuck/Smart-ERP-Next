import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { purchaseOrders, suppliers, warehouseTasks } from '@smart-erp/database';
import { eq, and, desc } from 'drizzle-orm';

export interface SupplierPortalPurchaseOrder {
  id: string;
  code: string;
  status: string;
  totalAmount: number;
  expectedDate: string;
  items: { productName: string; quantity: number; unitCost: number }[];
  createdAt: string;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalAmount: number;
  onTimeDeliveryRate: number;
  avgLeadTimeDays: number;
  qualityScore: number;
}

@Injectable()
export class SupplierCollaborationService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Get purchase orders visible to a specific supplier */
  async getSupplierOrders(supplierId: string, tenantId: string) {
    const [supplier] = await this.drizzle.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    if (!supplier) throw new NotFoundException('Supplier not found');

    const orders = await this.drizzle.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.supplierId, supplierId), eq(purchaseOrders.tenantId, tenantId)))
      .orderBy(desc(purchaseOrders.createdAt));

    return orders;
  }

  /** Get supplier performance metrics */
  async getSupplierPerformance(supplierId: string, tenantId: string): Promise<SupplierPerformance | null> {
    const [supplier] = await this.drizzle.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    if (!supplier) return null;

    const orders = await this.drizzle.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.supplierId, supplierId), eq(purchaseOrders.tenantId, tenantId)));

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
    const completedOrders = orders.filter((o) => o.status === 'received');
    const onTimeRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

    return {
      supplierId,
      supplierName: supplier.name,
      totalOrders,
      totalAmount,
      onTimeDeliveryRate: Math.round(onTimeRate),
      avgLeadTimeDays: 5, // Placeholder
      qualityScore: Math.round(onTimeRate * 0.8 + 20), // Placeholder
    };
  }

  /** Confirm delivery by supplier */
  async confirmDelivery(supplierId: string, purchaseOrderId: string, tenantId: string) {
    const [order] = await this.drizzle.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, purchaseOrderId),
          eq(purchaseOrders.supplierId, supplierId),
          eq(purchaseOrders.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!order) throw new NotFoundException('Purchase order not found');

    await this.drizzle.db
      .update(purchaseOrders)
      .set({ status: 'in_transit', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, purchaseOrderId));

    // Automatically create a 'putaway' (receiving) task in WMS
    await this.drizzle.db.insert(warehouseTasks).values({
      tenantId,
      type: 'putaway',
      status: 'pending',
      referenceType: 'purchase_order',
      referenceId: purchaseOrderId,
      priority: 'medium',
    });

    return { ...order, status: 'in_transit' };
  }
}