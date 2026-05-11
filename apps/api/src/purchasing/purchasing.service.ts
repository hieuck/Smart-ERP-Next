import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { db } from '@smart-erp/database';
import {
  purchaseOrders, purchaseOrderItems, products, inventoryTransactions,
} from '@smart-erp/database/schema';
import { eq, and, ilike, sql, desc } from '@smart-erp/database/drizzle';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchasingService {
  private async generateCode(tenantId: string): Promise<string> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.tenantId, tenantId));
    return `PN-${(count + 1).toString().padStart(6, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Purchase order must have at least 1 product');
    }

    const productIds = dto.items.map((i) => i.productId);
    const productList = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), sql`id = ANY(${productIds})`));
    const productMap = new Map(productList.map((p) => [p.id, p]));

    let subtotal = 0;
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Sản phẩm ${item.productId} không tồn tại`);
      const lineTotal = item.orderedQty * item.unitCost;
      subtotal += lineTotal;
      return {
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        unit: product.unit ?? 'piece',
        orderedQty: item.orderedQty,
        receivedQty: 0,
        unitCost: item.unitCost.toString(),
        taxRate: (item.taxRate ?? 0).toString(),
        lineTotal: lineTotal.toString(),
        batchNumber: item.batchNumber ?? null,
        expiryDate: null,
        notes: item.notes ?? null,
      };
    });

    const code = await this.generateCode(tenantId);
    const [po] = await db
      .insert(purchaseOrders)
      .values({
        tenantId,
        code,
        supplierId: dto.supplierId ?? null,
        warehouseId: dto.warehouseId ?? null,
        createdBy: userId,
        status: 'draft',
        subtotal: subtotal.toString(),
        discountAmount: '0',
        taxAmount: '0',
        total: subtotal.toString(),
        paidAmount: '0',
        paymentStatus: 'unpaid',
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes ?? null,
      })
      .returning();

    await db.insert(purchaseOrderItems).values(
      itemsData.map((item) => ({ ...item, purchaseOrderId: po.id }))
    );

    return { ...po, items: itemsData };
  }

  async findAll(
    tenantId: string,
    query: { page?: number; limit?: number; search?: string; status?: string }
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(purchaseOrders.tenantId, tenantId)];
    if (query.search) conditions.push(ilike(purchaseOrders.code, `%${query.search}%`));
    if (query.status) conditions.push(eq(purchaseOrders.status, query.status));

    const where = and(...conditions);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseOrders)
      .where(where);

    const items = await db
      .select()
      .from(purchaseOrders)
      .where(where)
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, id)));
    if (!po) throw new NotFoundException('Không tìm thấy đơn nhập hàng');

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    return { ...po, items };
  }

  /** Confirm PO — status: draft → confirmed */
  async confirm(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'confirmed');
  }

  /** Receive goods — update receivedQty, update stock, mark received */
  async receive(
    tenantId: string,
    id: string,
    userId: string,
    receivedItems: { itemId: string; receivedQty: number }[]
  ) {
    const po = await this.findOne(tenantId, id);
    if (!['confirmed', 'partial_received'].includes(po.status)) {
      throw new BadRequestException('Chỉ có thể nhận hàng khi đơn ở trạng thái đã xác nhận');
    }

    for (const recv of receivedItems) {
      const item = po.items.find((i: any) => i.id === recv.itemId);
      if (!item) continue;

      const newReceivedQty = (item as any).receivedQty + recv.receivedQty;
      if (newReceivedQty > (item as any).orderedQty) {
        throw new ConflictException(
          `Số lượng nhận vượt quá số lượng đặt cho sản phẩm ${(item as any).productName}`
        );
      }

      // Update received qty on item
      await db
        .update(purchaseOrderItems)
        .set({ receivedQty: newReceivedQty })
        .where(eq(purchaseOrderItems.id, recv.itemId));

      // Update product stock
      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.id, (item as any).productId)));

      if (product) {
        const newStock = product.stock + recv.receivedQty;
        await db
          .update(products)
          .set({ stock: newStock, updatedAt: new Date() })
          .where(eq(products.id, product.id));

        await db.insert(inventoryTransactions).values({
          tenantId,
          productId: product.id,
          type: 'IN',
          quantity: recv.receivedQty,
          previousStock: product.stock,
          newStock,
          reference: po.code,
          notes: `Nhập hàng từ đơn ${po.code}`,
          createdBy: userId,
        });
      }
    }

    // Check if fully received
    const updatedItems = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    const allReceived = updatedItems.every((i) => i.receivedQty >= i.orderedQty);
    const anyReceived = updatedItems.some((i) => i.receivedQty > 0);
    const newStatus = allReceived ? 'received' : anyReceived ? 'partial_received' : po.status;

    const [updated] = await db
      .update(purchaseOrders)
      .set({
        status: newStatus,
        receivedAt: allReceived ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, id)))
      .returning();

    return { ...updated, items: updatedItems };
  }

  async cancel(tenantId: string, id: string) {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, id)));
    if (!po) throw new NotFoundException('Không tìm thấy đơn nhập hàng');
    if (po.status === 'received') {
      throw new BadRequestException('Không thể hủy đơn đã nhận hàng');
    }
    return this.updateStatus(tenantId, id, 'cancelled');
  }

  private async updateStatus(tenantId: string, id: string, status: string) {
    const [updated] = await db
      .update(purchaseOrders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, id)))
      .returning();
    if (!updated) throw new NotFoundException('Không tìm thấy đơn nhập hàng');
    return updated;
  }
}
