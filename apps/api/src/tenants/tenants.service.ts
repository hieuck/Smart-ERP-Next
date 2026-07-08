import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ErrorCode } from '../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { tenants } from '@smart-erp/database/schema';
import { eq } from '@smart-erp/database/drizzle';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  async create(createTenantDto: CreateTenantDto) {
    const existing = await db.select().from(tenants).where(eq(tenants.slug, createTenantDto.slug));
    if (existing.length > 0) {
      throw new ConflictException('Slug already exists');
    }
    const [tenant] = await db.insert(tenants).values(createTenantDto).returning();
    return tenant;
  }

  async findAll() {
    return await db.select().from(tenants);
  }

  async findOne(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) throw new NotFoundException({ message: 'Tenant not found', errorCode: ErrorCode.TENANT_NOT_FOUND });
    return tenant;
  }

  async findBySlug(slug: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const [tenant] = await db.update(tenants)
      .set({ ...updateTenantDto, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    if (!tenant) throw new NotFoundException({ message: 'Tenant not found', errorCode: ErrorCode.TENANT_NOT_FOUND });
    return tenant;
  }

  async remove(id: string) {
    const [tenant] = await db.delete(tenants).where(eq(tenants.id, id)).returning();
    if (!tenant) throw new NotFoundException({ message: 'Tenant not found', errorCode: ErrorCode.TENANT_NOT_FOUND });
    return tenant;
  }
}
