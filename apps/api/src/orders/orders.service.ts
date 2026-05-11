import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@smart-erp/database';
import { orders, orderItems, products } from '@smart-erp/database/schema';
import { eq, and, ilike, sql, desc } from '@smart-erp/database/drizzle';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class OrdersService {
  constructor(private readonly notifications: NotificationsGateway) {}

  private async generateCode(tenantId: string): Promise<string> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.tenantId, tenantId));
    return `DH-${(count + 1).toString().padStart(6, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must have at least 1 product');
    }

    // Fetch products for snapshot
    const productIds = dto.items.map((i) => i.productId);
    const productList = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), sql`id = ANY(${productIds})`));
    const productMap = new Map(productList.map((p) => [p.id, p]));

    let subtotal = 0;
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
      const lineDiscount = item.discountAmount ?? 0;
      const lineTotal = item.quantity * item.unitPrice - lineDiscount;
      subtotal += lineTotal;
      return {
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        unit: product.unit ?? 'piece',
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        discountAmount: lineDiscount.toString(),
        discountPercent: (item.discountPercent ?? 0).toString(),
        taxRate: (item.taxRate ?? 0).toString(),
        lineTotal: lineTotal.toString(),
        notes: item.notes ?? null,
        batchNumber: item.batchNumber ?? null,
        expiryDate: null,
        serialNumbers: null,
      };
    });

    const discountAmount = dto.discountAmount ?? 0;
    const shippingFee = dto.shippingFee ?? 0;
    const total = Math.max(0, subtotal - discountAmount + shippingFee);
    const paidAmount = dto.paymentMethod && dto.paymentMethod !== 'credit' ? total : 0;
    const debtAmount = total - paidAmount;
    const code = await this.generateCode(tenantId);

    const [order] = await db
      .insert(orders)
      .values({
        tenantId,
        code,
        customerId: dto.customerId ?? null,
        warehouseId: dto.warehouseId ?? null,
        assignedTo: userId,
        channel: dto.channel ?? 'pos',
        status: 'confirmed',
        subtotal: subtotal.toString(),
        discountAmount: discountAmount.toString(),
        discountPercent: (dto.discountPercent ?? 0).toString(),
        taxAmount: '0',
        shippingFee: shippingFee.toString(),
        total: total.toString(),
        paidAmount: paidAmount.toString(),
        debtAmount: debtAmount.toString(),
        paymentStatus: debtAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        paymentMethod: dto.paymentMethod ?? null,
        shippingAddress: dto.shippingAddress ?? null,
        notes: dto.notes ?? null,
        confirmedAt: new Date(),
      })
      .returning();

    await db.insert(orderItems).values(
      itemsData.map((item) => ({ ...item, orderId: order.id }))
    );

    // Real-time notification
    this.notifications.broadcastToTenant(tenantId, 'order.created', {
      id: order.id,
      code: order.code,
      total: order.total,
      channel: order.channel,
      createdAt: order.createdAt,
    });

    return { ...order, items: itemsData };
  }

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      paymentStatus?: string;
      channel?: string;
    }
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.tenantId, tenantId)];
    if (query.search) conditions.push(ilike(orders.code, `%${query.search}%`));
    if (query.status) conditions.push(eq(orders.status, query.status));
    if (query.paymentStatus) conditions.push(eq(orders.paymentStatus, query.paymentStatus));
    if (query.channel) conditions.push(eq(orders.channel, query.channel));

    const where = and(...conditions);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(where);

    const items = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, id)));
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    return { ...order, items };
  }

  async updateStatus(tenantId: string, id: string, status: string, cancelReason?: string) {
    const validTransitions: Record<string, string[]> = {
      draft: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
    };

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, id)));
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${status}"`
      );
    }

    const updateData: Record<string, any> = { status, updatedAt: new Date() };
    if (status === 'confirmed') updateData.confirmedAt = new Date();
    if (status === 'shipped') updateData.shippedAt = new Date();
    if (status === 'delivered') updateData.deliveredAt = new Date();
    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = cancelReason ?? null;
    }

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, id)))
      .returning();

    this.notifications.broadcastToTenant(tenantId, 'order.status_changed', {
      id: updated.id,
      code: updated.code,
      status: updated.status,
    });

    return updated;
  }
}
