import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import {
  inventoryTransactions,
  NewInventoryTransaction,
  warehouseTransfers,
  NewWarehouseTransfer,
} from '@smart-erp/database';
import { eq, and } from 'drizzle-orm';

export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';

@Injectable()
export class WarehouseTransferService {
  constructor(private readonly drizzle: DrizzleService) {}

  async createTransfer(
    tenantId: string,
    userId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    items: { productId: string; quantity: number }[],
    notes?: string,
  ) {
    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Source and destination warehouse must be different');
    }
    if (!items.length) {
      throw new BadRequestException('Transfer must have at least one item');
    }

    const transfer: NewWarehouseTransfer = {
      tenantId,
      fromWarehouseId,
      toWarehouseId,
      status: 'draft',
      notes,
      createdBy: userId,
    };

    const [result] = await this.drizzle.db.insert(warehouseTransfers).values(transfer).returning();
    return result;
  }

  async confirmTransfer(tenantId: string, transferId: string) {
    const [transfer] = await this.drizzle.db
      .select()
      .from(warehouseTransfers)
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, transferId)))
      .limit(1);

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'draft') throw new BadRequestException('Only draft transfers can be confirmed');

    await this.drizzle.db
      .update(warehouseTransfers)
      .set({ status: 'in_transit' })
      .where(eq(warehouseTransfers.id, transferId));

    return { ...transfer, status: 'in_transit' };
  }

  async receiveTransfer(tenantId: string, transferId: string, userId: string) {
    const [transfer] = await this.drizzle.db
      .select()
      .from(warehouseTransfers)
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, transferId)))
      .limit(1);

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'in_transit') throw new BadRequestException('Only in-transit transfers can be received');

    await this.drizzle.db
      .update(warehouseTransfers)
      .set({ status: 'received' })
      .where(eq(warehouseTransfers.id, transferId));

    return { ...transfer, status: 'received' };
  }

  async getTransferById(tenantId: string, transferId: string) {
    const [transfer] = await this.drizzle.db
      .select()
      .from(warehouseTransfers)
      .where(and(eq(warehouseTransfers.tenantId, tenantId), eq(warehouseTransfers.id, transferId)))
      .limit(1);

    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }

  async listTransfers(tenantId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const items = await this.drizzle.db
      .select()
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.tenantId, tenantId))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.drizzle.db
      .select({ count: inventoryTransactions })
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.tenantId, tenantId));

    return {
      items,
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }
}