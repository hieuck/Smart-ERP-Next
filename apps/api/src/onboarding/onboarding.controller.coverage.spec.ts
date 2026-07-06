import { OnboardingController } from './onboarding.controller';
import { ForbiddenException } from '@nestjs/common';

const TENANT_ID = 'tenant-1';

const makeService = () => ({
  getStatus: jest.fn().mockResolvedValue({ status: 'pending' }),
  setupCompany: jest.fn().mockResolvedValue({ status: 'pending', companyInfo: {} }),
  seedIndustryData: jest.fn().mockResolvedValue({ industry: 'retail' }),
  complete: jest.fn().mockResolvedValue({ status: 'complete' }),
});

describe('OnboardingController coverage', () => {
  let controller: OnboardingController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new OnboardingController(service as any);
  });

  const reqWithTenant = () => ({ user: { tenantId: TENANT_ID } }) as any;
  const reqWithoutTenant = () => ({ user: {} }) as any;

  it('getStatus uses req.user.tenantId', async () => {
    await controller.getStatus.call(controller, reqWithTenant());
    expect(service.getStatus).toHaveBeenCalledWith(TENANT_ID);
  });

  it('setupCompany uses req.user.tenantId', async () => {
    const dto = { name: 'Test Corp', industry: 'retail' as const };
    await controller.setupCompany.call(controller, reqWithTenant(), dto);
    expect(service.setupCompany).toHaveBeenCalledWith(TENANT_ID, dto);
  });

  it('seedIndustryData uses req.user.tenantId', async () => {
    const dto = { industry: 'retail' as const };
    await controller.seedIndustryData.call(controller, reqWithTenant(), dto);
    expect(service.seedIndustryData).toHaveBeenCalledWith(TENANT_ID, 'retail');
  });

  it('complete uses req.user.tenantId', async () => {
    await controller.complete.call(controller, reqWithTenant());
    expect(service.complete).toHaveBeenCalledWith(TENANT_ID);
  });

  it('throws ForbiddenException when tenant context is missing', async () => {
    await expect(controller.getStatus.call(controller, reqWithoutTenant())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.setupCompany.call(controller, reqWithoutTenant(), { name: 'X', industry: 'retail' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.seedIndustryData.call(controller, reqWithoutTenant(), { industry: 'retail' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.complete.call(controller, reqWithoutTenant())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
