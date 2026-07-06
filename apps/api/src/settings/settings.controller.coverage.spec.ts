import { ForbiddenException } from '@nestjs/common';
import { SettingsController } from './settings.controller';

const TENANT_ID = 'tenant-1';

const makeService = () => ({
  getRegisterSettings: jest.fn().mockReturnValue({ tenantId: TENANT_ID }),
  getDefaultCurrency: jest.fn().mockResolvedValue({ currency: 'VND' }),
  setDefaultCurrency: jest.fn().mockResolvedValue({ currency: 'USD' }),
});

describe('SettingsController coverage', () => {
  let controller: SettingsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new SettingsController(service as any);
  });

  const reqWithTenant = () => ({ user: { tenantId: TENANT_ID } }) as any;
  const reqWithoutTenant = () => ({ user: {} }) as any;
  const reqWithTenantHeader = () => ({ tenantId: 'attacker-tenant', user: { tenantId: TENANT_ID } }) as any;

  it('getRegisterSettings uses req.user.tenantId and ignores req.tenantId', async () => {
    await controller.getRegisterSettings(reqWithTenantHeader());
    expect(service.getRegisterSettings).toHaveBeenCalledWith(TENANT_ID);
  });

  it('getDefaultCurrency uses req.user.tenantId and ignores req.tenantId', async () => {
    await controller.getDefaultCurrency(reqWithTenantHeader());
    expect(service.getDefaultCurrency).toHaveBeenCalledWith(TENANT_ID);
  });

  it('setDefaultCurrency uses req.user.tenantId and ignores req.tenantId', async () => {
    await controller.setDefaultCurrency(reqWithTenantHeader(), { currency: 'USD' });
    expect(service.setDefaultCurrency).toHaveBeenCalledWith(TENANT_ID, 'USD');
  });

  it('throws ForbiddenException when tenant context is missing', async () => {
    await expect(controller.getRegisterSettings(reqWithoutTenant())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getDefaultCurrency(reqWithoutTenant())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.setDefaultCurrency(reqWithoutTenant(), { currency: 'USD' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
