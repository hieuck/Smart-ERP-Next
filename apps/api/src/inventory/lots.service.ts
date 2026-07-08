import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { productLots } from '@smart-erp/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ActivityService } from '../modules/activity/activity.service';

@Injectable()
export class LotsService {
  constructor(private readonly activityService: ActivityService) {}

  async create(tenantId: string, userId: string, dto: any) {
    const existing = await db
      .select()
      .from(productLots)
      .where(
        and(
          eq(productLots.tenantId, tenantId),
          eq(productLots.lotNumber, dto.lotNumber),
        ),
      );
    if (existing.length > 0)
      throw new ConflictException('Lot number already exists');

    const [lot] = await db
      .insert(productLots)
      .values({
          tenantId,
          productId: dto.productId,
          lotNumber: dto.lotNumber,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate).toISOString() : null,
          quantity: dto.quantity,
          remainingQuantity: dto.quantity,
          warehouseId: dto.warehouseId ?? null,
          receivedDate: dto.receivedDate ? new Date(dto.receivedDate).toISOString() : new Date().toISOString(),
        })
      .returning();

    await this.activityService.log(tenantId, userId, 'created', 'lot', lot.id, {
        lotNumber: lot.lotNumber,
        quantity: lot.quantity,
      });

    return lot;
  }

  async findAll(tenantId: string, query: { productId?: string; warehouseId?: string; includeExpired?: boolean }) {
    const conditions = [eq(productLots.tenantId, tenantId)];

    if (query.productId)
      conditions.push(eq(productLots.productId, query.productId));
    if (query.warehouseId)
      conditions.push(eq(productLots.warehouseId, query.warehouseId));
    if (!query.includeExpired) {
      conditions.push(
        sql`${productLots.expiryDate} >= CURRENT_DATE OR ${productLots.expiryDate} IS NULL`
      );
    }

    return db
      .select()
      .from(productLots)
      .where(and(...conditions))
      .orderBy(productLots.expiryDate);
  }

  async findOne(tenantId: string, id: string) {
    const [lot] = await db
      .select()
      .from(productLots)
      .where(
        and(
          eq(productLots.tenantId, tenantId),
          eq(productLots.id, id),
        ),
      );
    if (!lot) throw new NotFoundException({ message: 'Lot not found', errorCode: ErrorCode.LOT_NOT_FOUND });
    return lot;
  }

  async update(tenantId: string, userId: string, id: string, dto: any) {
    const [lot] = await db
      .update(productLots)
      .set({
          ...dto,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate).toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        })
      .where(
        and(
          eq(productLots.tenantId, tenantId),
          eq(productLots.id, id),
        ),
      )
      .returning();
    if (!lot) throw new NotFoundException({ message: 'Lot not found', errorCode: ErrorCode.LOT_NOT_FOUND });

    await this.activityService.log(tenantId, userId, 'updated', 'lot', lot.id, {
        lotNumber: lot.lotNumber,
        changes: dto,
      });

    return lot;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const [lot] = await db
      .delete(productLots)
      .where(
        and(
          eq(productLots.tenantId, tenantId),
          eq(productLots.id, id),
        ),
      )
      .returning();
    if (!lot) throw new NotFoundException({ message: 'Lot not found', errorCode: ErrorCode.LOT_NOT_FOUND });

    await this.activityService.log(tenantId, userId, 'deleted', 'lot', lot.id, {
        lotNumber: lot.lotNumber,
      });

    return lot;
  }

  async getExpiringSoon(tenantId: string, daysAhead = 30) {
    return db
      .select()
      .from(productLots)
      .where(
        and(
          eq(productLots.tenantId, tenantId),
          eq(productLots.isActive, true),
          sql`${productLots.expiryDate} <= CURRENT_DATE + ${daysAhead} * INTERVAL '1 day'`,
          sql`${productLots.expiryDate} >= CURRENT_DATE`
        )
      )
      .orderBy(productLots.expiryDate);
  }
}

