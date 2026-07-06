import { ProductsService } from './products.service';
import { ActivityService } from '../modules/activity/activity.service';

describe('ProductsService coverage', () => {
  let service: ProductsService;
  let activityService: ActivityService;

  beforeEach(() => {
    activityService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as ActivityService;
    service = new ProductsService(activityService);
  });

  describe('importFromCsv', () => {
    it('parses CSV fields containing commas when wrapped in quotes', async () => {
      service.findBySku = jest.fn().mockResolvedValue(null);
      service.create = jest.fn().mockResolvedValue({ id: 'p1' });

      const csv = [
        'sku,name,price,description,category,unit,cost,stock,minstock,isactive',
        'SKU-001,"Smart LED, 10W",150000,"High quality, energy saving LED",Electronics,pcs,100000,50,10,true',
      ].join('\n');

      const result = await service.importFromCsv('tenant-1', Buffer.from(csv));

      expect(result.errors).toEqual([]);
      expect(service.create).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          sku: 'SKU-001',
          name: 'Smart LED, 10W',
          price: 150000,
          description: 'High quality, energy saving LED',
          category: 'Electronics',
          unit: 'pcs',
          cost: 100000,
          stock: 50,
          minStock: 10,
          isActive: true,
        }),
      );
    });

    it('handles escaped quotes inside quoted fields', async () => {
      service.findBySku = jest.fn().mockResolvedValue(null);
      service.create = jest.fn().mockResolvedValue({ id: 'p2' });

      const csv = [
        'sku,name,price',
        'SKU-002,"Monitor 27"" curved, 4K",5000000',
      ].join('\n');

      const result = await service.importFromCsv('tenant-1', Buffer.from(csv));

      expect(result.errors).toEqual([]);
      expect(service.create).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          sku: 'SKU-002',
          name: 'Monitor 27" curved, 4K',
          price: 5000000,
        }),
      );
    });

    it('rejects CSV without required headers', async () => {
      const csv = 'name,price\nWidget,1000';

      await expect(
        service.importFromCsv('tenant-1', Buffer.from(csv)),
      ).rejects.toThrow('Missing column: sku');
    });
  });
});
