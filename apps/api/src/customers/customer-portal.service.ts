// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { customers, orders, serviceTickets, eInvoices, payments } from '@smart-erp/database/schema';
import { eq, and, desc, sql } from '@smart-erp/database/drizzle';

@Injectable()
export class CustomerPortalService {
  /** Get customer's orders */
  async getOrders(tenantId: string, customerId: string) {
    return db
      .select({
        id: orders.id,
        code: orders.code,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.customerId, customerId)))
      .orderBy(desc(orders.createdAt))
      .limit(50);
  }

  /** Get customer's support tickets */
  async getTickets(tenantId: string, customerId: string) {
    return db
      .select()
      .from(serviceTickets)
      .where(and(eq(serviceTickets.tenantId, tenantId), eq(serviceTickets.customerId, customerId)))
      .orderBy(desc(serviceTickets.createdAt))
      .limit(50);
  }

  /** Create support ticket (Self-service) */
  async createTicket(tenantId: string, customerId: string, data: any) {
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const [ticket] = await db
      .insert(serviceTickets)
      .values({
        ...data,
        tenantId,
        customerId,
        ticketNumber,
        status: 'open',
      })
      .returning();
    return ticket;
  }

  /** Get order tracking details (Real-time) */
  async getOrderTracking(tenantId: string, orderId: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found');

    // Simulate tracking steps based on status
    const steps = [
      { step: 'Order Placed', completed: true, date: (order as any).createdAt },
      { step: 'Processing', completed: ['processing', 'shipping', 'completed'].includes((order as any).status) },
      { step: 'Shipping', completed: ['shipping', 'completed'].includes((order as any).status) },
      { step: 'Delivered', completed: (order as any).status === 'completed' },
    ];

    return {
      orderCode: (order as any).orderCode,
      status: (order as any).status,
      steps,
    };
  }

  async getInvoices(tenantId: string, customerId: string) {
    return db
      .select()
      .from(eInvoices)
      .where(and(eq(eInvoices.tenantId, tenantId), eq(eInvoices.customerId, customerId)))
      .orderBy(desc(eInvoices.createdAt));
  }
}
