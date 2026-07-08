import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { warehouseTransfers, warehouseTransferItems } from '@smart-erp/database/schema';
import { eq, and, desc } from '@smart-erp/database/drizzle';
import { randomBytes } from 'crypto';
import { ActivityService } from '../modules/activity/activity.service';

export interface CreateTransferDto {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  items: { productId: string; lotId?: string; quantityRequested: number }[];
}

@Injectable()
export class TransfersService {
  constructor(private readonly activityService: ActivityService) {}

  private generateCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(2).toString('hex').toUpperCase();
    return `TRF-${timestamp}-${random}`;
  }

  async create(tenantId: string, userId: string, dto: CreateTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId)
      throw new BadRequestException('Cannot transfer to the same warehouse');

    const [transfer] = await db
      .insert(warehouseTransfers)
      .values({
        tenantId,
        transferCode: this.generateCode(),
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        status: 'draft',
        notes: dto.notes ?? null,
        requestedBy: userId,
      })
      .returning();

    for (const item of dto.items) {
      await db.insert(warehouseTransferItems).values({
        transferId: transfer.id,
        productId: item.productId,
        lotId: item.lotId ?? null,
        quantityRequested: item.quantityRequested,
      });
    }

    await this.activityService.log(tenantId, userId, 'created', 'transfer', transfer.id, {
      transferCode: transfer.transferCode,
      fromWarehouseId: dto.fromWarehouseId,
      toWarehouseId: dto.toWarehouseId,
      itemsCount: dto.items.length,
    });

    return this.findOne(tenantId, transfer.id);
  }

  async findAll(
    tenantId: string,
    query: { status?: string; fromWarehouseId?: string; toWarehouseId?: string },
  ) {
    const conditions = [eq(warehouseTransfers.tenantId, tenantId)];
    if (query.status) conditions.push(eq(warehouseTransfers.status, query.status));
    if (query.fromWarehouseId)
      conditions.push(eq(warehouseTransfers.fromWarehouseId, query.fromWarehouseId));
    if (query.toWarehouseId)
      conditions.push(eq(warehouseTransfers.toWarehouseId, query.toWarehouseId));

    return db
      .select()
      .from(warehouseTransfers)
      .where(and(...conditions))
      .orderBy(desc(warehouseTransfers.createdAt));
  }

  async findOne(tenantId: string, id: string) {
    const [transfer] = await db
      .select()
      .from(warehouseTransfers)
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, id)));
    if (!transfer) throw new NotFoundException({ message: 'Transfer not found', errorCode: ErrorCode.TRANSFER_NOT_FOUND });

    const items = await db
      .select()
      .from(warehouseTransferItems)
      .where(eq(warehouseTransferItems.transferId, id));

    return { ...transfer, items };
  }

  async approve(tenantId: string, userId: string, id: string) {
    const transfer = await this.findOne(tenantId, id);
    if (transfer.status !== 'draft')
      throw new BadRequestException('Can only approve draft transfers');

    const [updated] = await db
      .update(warehouseTransfers)
      .set({ status: 'approved', approvedBy: userId, updatedAt: new Date() })
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, id)))
      .returning();

    await this.activityService.log(tenantId, userId, 'approved', 'transfer', id, {
      transferCode: transfer.transferCode,
    });

    return updated;
  }

  async ship(tenantId: string, userId: string, id: string, shippedItems: { itemId: string; quantityShipped: number }[]) {
    const transfer = await this.findOne(tenantId, id);
    if (transfer.status !== 'approved')
      throw new BadRequestException('Can only ship approved transfers');

    for (const shipped of shippedItems) {
      await db
        .update(warehouseTransferItems)
        .set({ quantityShipped: shipped.quantityShipped })
        .where(eq(warehouseTransferItems.id, shipped.itemId));
    }

    const [updated] = await db
      .update(warehouseTransfers)
      .set({ status: 'shipped', shippedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, id)))
      .returning();

    await this.activityService.log(tenantId, userId, 'updated', 'transfer', id, {
      action: 'shipped',
      transferCode: transfer.transferCode,
    });

    return updated;
  }

  async receive(tenantId: string, userId: string, id: string, receivedItems: { itemId: string; quantityReceived: number }[]) {
    const transfer = await this.findOne(tenantId, id);
    if (transfer.status !== 'shipped')
      throw new BadRequestException('Can only receive shipped transfers');

    for (const received of receivedItems) {
      await db
        .update(warehouseTransferItems)
        .set({ quantityReceived: received.quantityReceived })
        .where(eq(warehouseTransferItems.id, received.itemId));
    }

    const [updated] = await db
      .update(warehouseTransfers)
      .set({ status: 'received', receivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, id)))
      .returning();

    await this.activityService.log(tenantId, userId, 'completed', 'transfer', id, {
      transferCode: transfer.transferCode,
    });

    return updated;
  }

  async cancel(tenantId: string, userId: string, id: string) {
    const transfer = await this.findOne(tenantId, id);
    if (['received', 'cancelled'].includes(transfer.status))
      throw new BadRequestException('Cannot cancel this transfer');

    const [updated] = await db
      .update(warehouseTransfers)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, id)))
      .returning();

    await this.activityService.log(tenantId, userId, 'cancelled', 'transfer', id, {
      transferCode: transfer.transferCode,
    });

    return updated;
  }
}