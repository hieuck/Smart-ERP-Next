import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@smart-erp/database';
import { orders, orderItems, products } from '@smart-erp/database/schema';
import { eq, and, ilike, sql, desc, inArray } from '@smart-erp/database/drizzle';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ActivityService } from '../modules/activity/activity.service';

function escapeXml(unsafe: string): string {
  const map: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  };
  return unsafe.replace(/[<>&'"]/g, (c) => map[c]);
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly notifications: NotificationsGateway,
    private readonly activityService: ActivityService,
  ) {}

  validateOrderData(order: any) {
    if (!order.code) throw new BadRequestException('Order code is required');
    if (!order.customerName) throw new BadRequestException('Customer name is required');
    if (order.total < 0) throw new BadRequestException('Total must be positive');
    if (!order.items?.length) throw new BadRequestException('Order must have at least 1 item');
  }

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
      .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));
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
        paymentStatus: debtAmount <= 0 ? 'paid' : 'unpaid',
        paymentMethod: dto.paymentMethod ?? null,
        shippingAddress: dto.shippingAddress ?? null,
        notes: dto.notes ?? null,
        confirmedAt: new Date(),
      })
      .returning();

    await db.insert(orderItems).values(
      itemsData.map((item) => ({ ...item, orderId: order.id }))
    );

    // Activity log
    await this.activityService.log(tenantId, userId, 'created', 'order', order.id, {
      code: order.code,
      total: order.total,
      channel: order.channel,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });

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
    if (!order) throw new NotFoundException('Order not found');

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    return { ...order, items };
  }

  async generateEInvoiceXml(tenantId: string, id: string): Promise<string> {
    const order = await this.findOne(tenantId, id);
    const companyName = 'Smart ERP Next';
    const taxCode = '0123456789';
    const date = new Date().toISOString().slice(0,10);
    const total = parseFloat(order.total);
    const vatRate = 10; // 10% VAT
    const vatAmount = total * vatRate / 100;
    const totalWithVat = total + vatAmount;

    // Simple Vietnamese e-invoice XML (mock)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://www.gdt.gov.vn/invoice" version="2.0.1">
  <Header>
    <InvNo>${order.code}</InvNo>
    <InvDate>${date}</InvDate>
    <SupplierName>${companyName}</SupplierName>
    <SupplierTaxCode>${taxCode}</SupplierTaxCode>
    <BuyerName>${(order as any).customerName || 'Walk-in Customer'}</BuyerName>
    <BuyerAddress>${order.shippingAddress || ''}</BuyerAddress>
  </Header>
  <Details>
    ${order.items.map((item, idx) => `
    <Item>
      <LineNumber>${idx+1}</LineNumber>
      <ItemName>${escapeXml(item.productName)}</ItemName>
      <Quantity>${item.quantity}</Quantity>
      <Unit>${item.unit}</Unit>
      <UnitPrice>${parseFloat(item.unitPrice)}</UnitPrice>
      <Amount>${parseFloat(item.lineTotal)}</Amount>
    </Item>
    `).join('')}
  </Details>
  <Summary>
    <TotalAmount>${total}</TotalAmount>
    <VATRate>${vatRate}</VATRate>
    <VATAmount>${vatAmount}</VATAmount>
    <TotalAmountWithVAT>${totalWithVat}</TotalAmountWithVAT>
    <PaymentMethod>${order.paymentMethod || 'Cash'}</PaymentMethod>
  </Summary>
</Invoice>`;
    return xml;
  }

  async updateStatus(tenantId: string, userId: string, id: string, status: string, cancelReason?: string) {
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
    if (!order) throw new NotFoundException('Order not found');

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

    await this.activityService.log(tenantId, userId, 'updated', 'order', updated.id, {
      code: updated.code,
      fromStatus: order.status,
      toStatus: updated.status,
      cancelReason: status === 'cancelled' ? cancelReason : undefined,
    });

    this.notifications.broadcastToTenant(tenantId, 'order.status_changed', {
      id: updated.id,
      code: updated.code,
      status: updated.status,
    });

    return updated;
  }
}
