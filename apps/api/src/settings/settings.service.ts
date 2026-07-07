import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { tenants } from '@smart-erp/database/schema';
import { eq } from 'drizzle-orm';
import { SUPPORTED_CURRENCIES } from './supported-currencies';

@Injectable()
export class SettingsService {
  async getDefaultCurrency(tenantId: string): Promise<{ currency: string }> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) throw new NotFoundException('Tenant not found');
    return { currency: tenant.defaultCurrency ?? 'VND' };
  }

  async setDefaultCurrency(tenantId: string, currency: string): Promise<{ currency: string }> {
    const normalizedCurrency = currency?.toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency as any)) {
      throw new BadRequestException(`Unsupported currency code: ${currency}`);
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) throw new NotFoundException('Tenant not found');

    const [updated] = await db
      .update(tenants)
      .set({ defaultCurrency: normalizedCurrency })
      .where(eq(tenants.id, tenantId))
      .returning();

    return { currency: updated.defaultCurrency ?? normalizedCurrency };
  }

  getRegisterSettings(tenantId?: string) {
    return {
      tenantId,
      companyName: '',
      tenantName: '',
      adminName: '',
    };
  }
}
