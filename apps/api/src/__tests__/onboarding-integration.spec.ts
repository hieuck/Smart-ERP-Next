jest.mock('drizzle-orm', () => ({
  eq: jest.fn((f: any, v: any) => ({ op: 'eq', field: f, value: v })),
}));

import { createMockDb, createMockDrizzleService } from './db.mock';

const mockDb = createMockDb();

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  products: {},
  productCategories: {},
  warehouses: {},
  employees: {},
  projects: {},
  projectTasks: {},
}));

import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from '../onboarding/onboarding.service';

describe('OnboardingService (integration)', () => {
  let service: OnboardingService;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    mockDb._reset();
    const mockDrizzleService = createMockDrizzleService(mockDb);
    service = new OnboardingService(mockDrizzleService as any);
  });

  afterEach(() => {
    (service as any).onboardingState.clear();
  });

  describe('getStatus', () => {
    it('returns pending for new tenant', async () => {
      const result = await service.getStatus(TENANT_ID);
      expect(result.status).toBe('pending');
    });
  });

  describe('setupCompany', () => {
    it('saves company info and returns status', async () => {
      const dto = {
        name: 'Test Corp',
        address: '123 Main St',
        taxCode: 'TAX001',
        phone: '123456789',
        industry: 'retail',
      };

      const result = await service.setupCompany(TENANT_ID, dto);

      expect(result.status).toBe('pending');
      expect(result.companyInfo).toEqual(dto);
    });
  });

  describe('seedIndustryData', () => {
    it('seeds 20 products for retail industry', async () => {
      mockDb._queueSequence([
        [{ id: 'cat-1' }, { id: 'cat-2' }, { id: 'cat-3' }, { id: 'cat-4' }, { id: 'cat-5' }],
        Array.from({ length: 20 }, (_, i) => ({ id: `prod-${i + 1}` })),
        [{ id: 'wh-1' }],
        [{ id: 'emp-1' }],
      ]);

      const result = await service.seedIndustryData(TENANT_ID, 'retail');

      expect(result.industry).toBe('retail');
      expect(result.products).toBe(20);
      expect(result.categories).toBe(5);
      expect(result.warehouses).toBe(1);
      expect(result.employees).toBe(1);
    });

    it('seeds 10 items for fnb industry', async () => {
      mockDb._queueSequence([
        [{ id: 'cat-1' }],
        Array.from({ length: 10 }, (_, i) => ({ id: `item-${i + 1}` })),
        [{ id: 'wh-1' }],
      ]);

      const result = await service.seedIndustryData(TENANT_ID, 'fnb');

      expect(result.industry).toBe('fnb');
      expect(result.menuItems).toBe(10);
    });

    it('seeds 5 services for service industry', async () => {
      mockDb._queueSequence([
        Array.from({ length: 5 }, (_, i) => ({ id: `svc-${i + 1}` })),
        [{ id: 'emp-1' }],
        [{ id: 'proj-1' }],
      ]);

      const result = await service.seedIndustryData(TENANT_ID, 'service');

      expect(result.industry).toBe('service');
      expect(result.services).toBe(5);
      expect(result.employees).toBe(1);
      expect(result.projectTemplates).toBe(1);
    });

    it('throws BadRequestException for invalid industry', async () => {
      await expect(service.seedIndustryData(TENANT_ID, 'invalid' as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('marks onboarding as complete', async () => {
      await service.setupCompany(TENANT_ID, { name: 'Test Corp', industry: 'retail' });

      const result = await service.complete(TENANT_ID);

      expect(result.status).toBe('complete');
    });

    it('throws BadRequestException if company not set up first', async () => {
      await expect(service.complete(TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('full flow', () => {
    it('setup -> seed -> complete -> status = complete', async () => {
      const initialStatus = await service.getStatus(TENANT_ID);
      expect(initialStatus.status).toBe('pending');

      await service.setupCompany(TENANT_ID, { name: 'Full Corp', industry: 'retail' });

      mockDb._queueSequence([
        [{ id: 'cat-1' }, { id: 'cat-2' }, { id: 'cat-3' }, { id: 'cat-4' }, { id: 'cat-5' }],
        Array.from({ length: 20 }, (_, i) => ({ id: `prod-${i + 1}` })),
        [{ id: 'wh-1' }],
        [{ id: 'emp-1' }],
      ]);
      await service.seedIndustryData(TENANT_ID, 'retail');

      const completeResult = await service.complete(TENANT_ID);
      expect(completeResult.status).toBe('complete');

      const finalStatus = await service.getStatus(TENANT_ID);
      expect(finalStatus.status).toBe('complete');
    });
  });
});
