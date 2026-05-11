import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { suppliers } from '@smart-erp/database/schema';
import { eq, and, ilike, or, sql } from '@smart-erp/database/drizzle';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  async create(tenantId: string, dto: CreateSupplierDto) {
    const existing = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.code, dto.code)));
    if (existing.length > 0) throw new ConflictException('Supplier code already exists');

    const [supplier] = await db
      .insert(suppliers)
      .values({ ...dto, tenantId })
      .returning();
    return supplier;
  }

  async findAll(
    tenantId: string,
    query: { page?: number; limit?: number; search?: string; isActive?: boolean }
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(suppliers.tenantId, tenantId)];
    if (query.search) {
      conditions.push(
        or(
          ilike(suppliers.name, `%${query.search}%`),
          ilike(suppliers.phone, `%${query.search}%`),
          ilike(suppliers.code, `%${query.search}%`)
        )!
      );
    }
    if (query.isActive !== undefined) conditions.push(eq(suppliers.isActive, query.isActive));

    const where = and(...conditions);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(suppliers)
      .where(where);

    const items = await db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(suppliers.name)
      .limit(limit)
      .offset(offset);

    return { items, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, id)));
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, id)))
      .returning();
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async remove(tenantId: string, id: string) {
    const [supplier] = await db
      .delete(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, id)))
      .returning();
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }
}
