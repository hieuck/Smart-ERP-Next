import { OnboardingService } from './onboarding.service';
import { BadRequestException } from '@nestjs/common';

const TENANT_ID = 'tenant-1';

const makeDb = () => {
  const returning = jest.fn().mockResolvedValue([]);
  const whereUpdate = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where: whereUpdate });
  const update = jest.fn().mockReturnValue({ set });
  const values = jest.fn().mockReturnValue({ returning });
  const insert = jest.fn().mockReturnValue({ values });
  const limit = jest.fn().mockResolvedValue([]);
  const whereSelect = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where: whereSelect });
  const select = jest.fn().mockReturnValue({ from });

  return {
    update,
    insert,
    select,
    _limit: limit,
  };
};

describe('OnboardingService persistence', () => {
  let service: OnboardingService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    db = makeDb();
    service = new OnboardingService({ db } as any);
  });

  it('setupCompany persists company info to the tenant record', async () => {
    db.update().set().where().returning.mockResolvedValueOnce([{
      id: TENANT_ID,
      name: 'Acme',
      onboardingStatus: 'pending',
    }]);

    const dto = { name: 'Acme', address: '123', taxCode: 'TAX', phone: '555', industry: 'retail' as const };
    const result = await service.setupCompany(TENANT_ID, dto);

    expect(result.status).toBe('pending');
    expect(result.companyInfo).toEqual(dto);
    expect(db.update).toHaveBeenCalled();
  });

  it('getStatus reads onboarding status from database', async () => {
    db._limit.mockResolvedValueOnce([{ onboardingStatus: 'pending' }]);

    const result = await service.getStatus(TENANT_ID);

    expect(result.status).toBe('pending');
  });

  it('complete updates status to complete when company info exists', async () => {
    db._limit.mockResolvedValueOnce([{
      id: TENANT_ID,
      name: 'Acme',
      industry: 'retail',
    }]);
    db.update().set().where().returning.mockResolvedValueOnce([{ onboardingStatus: 'complete' }]);

    const result = await service.complete(TENANT_ID);

    expect(result.status).toBe('complete');
  });

  it('complete throws when no persisted company info exists', async () => {
    db._limit.mockResolvedValueOnce([]);

    await expect(service.complete(TENANT_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('seedIndustryData is idempotent when onboarding is complete', async () => {
    db._limit.mockResolvedValueOnce([{ onboardingStatus: 'complete' }]);

    const result = await service.seedIndustryData(TENANT_ID, 'retail');

    expect(result).toEqual({ seeded: false, reason: 'onboarding-already-complete' });
  });
});
