import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { tenants } from '@smart-erp/database/schema';
import { eq } from '@smart-erp/database/drizzle';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  private assertTenantAccess(callerTenantId: string, targetTenantId: string): void {
    if (callerTenantId !== targetTenantId) {
      throw new ForbiddenException('Tenant access denied');
    }
  }

  async create(createTenantDto: CreateTenantDto) {
    const existing = await db.select().from(tenants).where(eq(tenants.slug, createTenantDto.slug));
    if (existing.length > 0) {
      throw new ConflictException('Slug already exists');
    }
    const [tenant] = await db.insert(tenants).values(createTenantDto).returning();
    return tenant;
  }

  /** @deprecated Use findAllForTenant for authenticated API access */
  async findAll() {
    return await db.select().from(tenants);
  }

  async findAllForTenant(tenantId: string) {
    const tenant = await this.findOneForTenant(tenantId, tenantId);
    return [tenant];
  }

  /** @deprecated Use findOneForTenant for authenticated API access */
  async findOne(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) throw new NotFoundException({ message: 'Tenant not found', errorCode: ErrorCode.TENANT_NOT_FOUND });
    return tenant;
  }

  async findOneForTenant(callerTenantId: string, targetTenantId: string) {
    this.assertTenantAccess(callerTenantId, targetTenantId);
    return this.findOne(targetTenantId);
  }

  async findBySlug(slug: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  /** @deprecated Use updateForTenant for authenticated API access */
  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const [tenant] = await db.update(tenants)
      .set({ ...updateTenantDto, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    if (!tenant) throw new NotFoundException({ message: 'Tenant not found', errorCode: ErrorCode.TENANT_NOT_FOUND });
    return tenant;
  }

  async updateForTenant(callerTenantId: string, targetTenantId: string, updateTenantDto: UpdateTenantDto) {
    this.assertTenantAccess(callerTenantId, targetTenantId);
    return this.update(targetTenantId, updateTenantDto);
  }

  /** @deprecated Use removeForTenant for authenticated API access */
  async remove(id: string) {
    const [tenant] = await db.delete(tenants).where(eq(tenants.id, id)).returning();
    if (!tenant) throw new NotFoundException({ message: 'Tenant not found', errorCode: ErrorCode.TENANT_NOT_FOUND });
    return tenant;
  }

  async removeForTenant(callerTenantId: string, targetTenantId: string) {
    this.assertTenantAccess(callerTenantId, targetTenantId);
    return this.remove(targetTenantId);
  }
}
