import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';

jest.mock('@smart-erp/database', () => ({ db: { select: jest.fn(), update: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ tenants: {} }));
jest.mock('drizzle-orm', () => ({ eq: jest.fn((x) => x) }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettingsService();
  });

  it('getRegisterSettings returns default values', () => {
    const result = service.getRegisterSettings();
    expect(result.companyName).toBe('');
    expect(result.tenantName).toBe('');
    expect(result.adminName).toBe('');
  });

  it('getRegisterSettings passes tenantId through', () => {
    const result = service.getRegisterSettings('tenant-123');
    expect(result.tenantId).toBe('tenant-123');
  });

  it('getRegisterSettings handles undefined tenantId', () => {
    const result = service.getRegisterSettings();
    expect(result.tenantId).toBeUndefined();
  });

  const mockTenantRow = (overrides: any = {}) => ({
    id: 'tenant-1',
    name: 'Smart ERP',
    slug: 'smart-erp',
    defaultCurrency: 'VND',
    address: null,
    taxCode: null,
    phone: null,
    industry: null,
    onboardingStatus: 'pending',
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const mockSelectReturns = (rows: any[]) => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(rows),
        }),
      }),
    });
  };

  describe('setDefaultCurrency', () => {
    beforeEach(() => {
      mockSelectReturns([{ id: 'tenant-1', defaultCurrency: 'VND' }]);
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ defaultCurrency: 'USD' }]),
          }),
        }),
      });
    });

    it('accepts a supported currency code and updates the tenant', async () => {
      const result = await service.setDefaultCurrency('tenant-1', 'USD');
      expect(result.currency).toBe('USD');
      expect(db.update).toHaveBeenCalled();
    });

    it('rejects an unsupported currency code with BadRequestException', async () => {
      await expect(service.setDefaultCurrency('tenant-1', 'XYZ')).rejects.toBeInstanceOf(BadRequestException);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockSelectReturns([]);
      await expect(service.setDefaultCurrency('missing-tenant', 'USD')).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('getTenantSettings', () => {
    it('returns merged tenant settings', async () => {
      mockSelectReturns([
        mockTenantRow({
          name: 'Acme',
          defaultCurrency: 'USD',
          settings: { general: { language: 'en' }, notifications: { lowStockAlert: false } },
        }),
      ]);

      const result = await service.getTenantSettings('tenant-1');

      expect(result.company.name).toBe('Acme');
      expect(result.general.currency).toBe('USD');
      expect(result.general.language).toBe('en');
      expect(result.notifications.lowStockAlert).toBe(false);
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockSelectReturns([]);
      await expect(service.getTenantSettings('missing-tenant')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateTenantSettings', () => {
    beforeEach(() => {
      mockSelectReturns([
        mockTenantRow({
          name: 'Acme Corp',
          defaultCurrency: 'USD',
          settings: { general: { language: 'en' } },
        }),
      ]);
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{}]),
          }),
        }),
      });
    });

    it('merges and persists company and general settings', async () => {
      const dto = { company: { name: 'Acme Corp' }, general: { language: 'en', currency: 'USD' } };
      const result = await service.updateTenantSettings('tenant-1', dto);

      expect(result.company.name).toBe('Acme Corp');
      expect(result.general.language).toBe('en');
      expect(result.general.currency).toBe('USD');
      expect(db.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockSelectReturns([]);
      await expect(service.updateTenantSettings('missing-tenant', {})).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
