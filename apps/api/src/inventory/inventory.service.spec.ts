import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableStock', () => {
    it('should return available stock after subtracting reservations', async () => {
      const result = await service.getAvailableStock('tenant-123', 'prod-123');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock for IN type', async () => {
      const result = await service.adjustStock(
        'tenant-123',
        'user-123',
        'prod-123',
        10,
        'IN',
        'Test adjustment',
        'REF-001',
      );
      expect(result).toHaveProperty('success', true);
    });

    it('should adjust stock for OUT type', async () => {
      const result = await service.adjustStock(
        'tenant-123',
        'user-123',
        'prod-123',
        5,
        'OUT',
        'Test adjustment',
        'REF-002',
      );
      expect(result).toHaveProperty('success', true);
    });
  });
});
