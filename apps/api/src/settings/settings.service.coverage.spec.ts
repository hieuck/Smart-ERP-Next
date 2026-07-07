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

  describe('setDefaultCurrency', () => {
    beforeEach(() => {
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'tenant-1', defaultCurrency: 'VND' }]),
          }),
        }),
      });
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
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      await expect(service.setDefaultCurrency('missing-tenant', 'USD')).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
