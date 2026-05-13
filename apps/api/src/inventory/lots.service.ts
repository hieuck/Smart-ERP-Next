import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { productLots } from '@smart-erp/database/schema';
import { eq, and, desc, lte, sql } from '@smart-erp/database/drizzle';

export interface CreateLotDto {
  productId: string;
  lotNumber: string;
  expiryDate?: string;
  quantity: number;
  warehouseId?: string;
  receivedDate?: string;
}

export interface UpdateLotDto {
  expiryDate?: string;
  quantity?: number;
  warehouseId?: string;
}

@Injectable()
export class LotsService {
  async create(tenantId: string, dto: CreateLotDto) {
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
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        quantity: dto.quantity,
        remainingQuantity: dto.quantity,
        warehouseId: dto.warehouseId ?? null,
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : new Date(),
      })
      .returning();
    return lot;
  }

  async findAll(
    tenantId: string,
    query: { productId?: string; warehouseId?: string; includeExpired?: boolean },
  ) {
    const conditions = [eq(productLots.tenantId, tenantId)];

    if (query.productId)
      conditions.push(eq(productLots.productId, query.productId));
    if (query.warehouseId)
      conditions.push(eq(productLots.warehouseId, query.warehouseId));
    if (!query.includeExpired)
      conditions.push(sql`${productLots.expiryDate} >= CURRENT_DATE OR ${productLots.expiryDate} IS NULL`);

    return db
      .select()
      .from(productLots)
      .where(and(...conditions))
      .orderBy(desc(productLots.receivedDate));
  }

  async findOne(tenantId: string, id: string) {
    const [lot] = await db
      .select()
      .from(productLots)
      .where(and(eq(productLots.tenantId, tenantId), eq(productLots.id, id)));
    if (!lot) throw new NotFoundException('Lot not found');
    return lot;
  }

  async update(tenantId: string, id: string, dto: UpdateLotDto) {
    const [lot] = await db
      .update(productLots)
      .set({
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(productLots.tenantId, tenantId), eq(productLots.id, id)))
      .returning();
    if (!lot) throw new NotFoundException('Lot not found');
    return lot;
  }

  async remove(tenantId: string, id: string) {
    const [lot] = await db
      .delete(productLots)
      .where(and(eq(productLots.tenantId, tenantId), eq(productLots.id, id)))
      .returning();
    if (!lot) throw new NotFoundException('Lot not found');
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
          sql`${productLots.expiryDate} <= CURRENT_DATE + INTERVAL '${daysAhead} days'`,
          sql`${productLots.expiryDate} >= CURRENT_DATE`,
        ),
      )
      .orderBy(productLots.expiryDate);
  }
}
