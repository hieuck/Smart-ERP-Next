import { Test, TestingModule } from '@nestjs/testing';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  let service: AccountingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountingService],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return accounting dashboard data', async () => {
      const result = await service.getDashboard('tenant-123', '2026');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalExpense');
      expect(result).toHaveProperty('netIncome');
      expect(result).toHaveProperty('cashBalance');
      expect(result).toHaveProperty('bankBalance');
    });
  });

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin correctly', () => {
      const margin = service['calculateProfitMargin'](1000000, 700000);
      expect(margin).toBeCloseTo(30, 1);
    });

    it('should return 0 when revenue is 0', () => {
      const margin = service['calculateProfitMargin'](0, 100000);
      expect(margin).toBe(0);
    });
  });
});
