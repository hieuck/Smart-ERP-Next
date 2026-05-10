import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { warehouses } from '@smart-erp/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface CreateWarehouseDto {
  code: string;
  name: string;
  address?: string;
  isDefault?: boolean;
}

@Injectable()
export class WarehousesService {
  async create(tenantId: string, dto: CreateWarehouseDto) {
    const existing = await db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.code, dto.code)));
    if (existing.length > 0) throw new ConflictException('Mã kho đã tồn tại');

    // If this is the first warehouse or isDefault=true, ensure only one default
    if (dto.isDefault) {
      await db
        .update(warehouses)
        .set({ isDefault: false })
        .where(eq(warehouses.tenantId, tenantId));
    }

    const [warehouse] = await db
      .insert(warehouses)
      .values({ ...dto, tenantId })
      .returning();
    return warehouse;
  }

  async findAll(tenantId: string) {
    return db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.isActive, true)))
      .orderBy(warehouses.name);
  }

  async findOne(tenantId: string, id: string) {
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.id, id)));
    if (!warehouse) throw new NotFoundException('Không tìm thấy kho');
    return warehouse;
  }

  async findDefault(tenantId: string) {
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.isDefault, true)));
    return warehouse ?? null;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateWarehouseDto>) {
    if (dto.isDefault) {
      await db
        .update(warehouses)
        .set({ isDefault: false })
        .where(eq(warehouses.tenantId, tenantId));
    }
    const [warehouse] = await db
      .update(warehouses)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.id, id)))
      .returning();
    if (!warehouse) throw new NotFoundException('Không tìm thấy kho');
    return warehouse;
  }

  async remove(tenantId: string, id: string) {
    const [warehouse] = await db
      .delete(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.id, id)))
      .returning();
    if (!warehouse) throw new NotFoundException('Không tìm thấy kho');
    return warehouse;
  }
}
