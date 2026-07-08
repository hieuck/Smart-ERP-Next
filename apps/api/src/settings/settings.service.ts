import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { tenants } from '@smart-erp/database/schema';
import { eq } from 'drizzle-orm';
import { SUPPORTED_CURRENCIES } from './supported-currencies';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';

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

  async getTenantSettings(tenantId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings as Record<string, any>) || {};
    return {
      company: {
        name: tenant.name ?? '',
        address: tenant.address ?? '',
        phone: tenant.phone ?? '',
        email: '',
        taxCode: tenant.taxCode ?? '',
        website: '',
        ...settings.company,
      },
      general: {
        language: 'vi',
        currency: tenant.defaultCurrency ?? 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
        ...settings.general,
      },
      notifications: {
        lowStockAlert: true,
        newOrderAlert: true,
        paymentAlert: true,
        emailNotifications: false,
        browserNotifications: true,
        ...settings.notifications,
      },
      appearance: {
        theme: 'system',
        primaryColor: '#3b82f6',
        ...settings.appearance,
      },
    };
  }

  async updateTenantSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) throw new NotFoundException('Tenant not found');

    const existingSettings = (tenant.settings as Record<string, any>) || {};
    const mergedSettings = {
      ...existingSettings,
      ...(dto.company ? { company: { ...existingSettings.company, ...dto.company } } : {}),
      ...(dto.general ? { general: { ...existingSettings.general, ...dto.general } } : {}),
      ...(dto.notifications ? { notifications: { ...existingSettings.notifications, ...dto.notifications } } : {}),
      ...(dto.appearance ? { appearance: { ...existingSettings.appearance, ...dto.appearance } } : {}),
    };

    const [updated] = await db
      .update(tenants)
      .set({
        name: dto.company?.name ?? tenant.name,
        address: dto.company?.address ?? tenant.address,
        phone: dto.company?.phone ?? tenant.phone,
        taxCode: dto.company?.taxCode ?? tenant.taxCode,
        defaultCurrency: dto.general?.currency?.toUpperCase() ?? tenant.defaultCurrency,
        settings: mergedSettings,
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    return this.getTenantSettings(tenantId);
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
