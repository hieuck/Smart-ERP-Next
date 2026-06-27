import { ProductsService } from '../products/products.service';

jest.mock('@smart-erp/database', () => ({ db: { select: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ products: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn(), and: jest.fn() }));

describe('Barcode Print — Product Label Data', () => {
  let service: ProductsService;

  beforeEach(() => {
    service = new (ProductsService as any)();
  });

  it('service should have findByBarcode method', () => {
    expect(typeof service.findByBarcode).toBe('function');
  });

  it('findByBarcode throws NotFoundException for unknown code', async () => {
    const mockDb = require('@smart-erp/database').db;
    const mockChain: any = { from: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockDb.select.mockReturnValue(mockChain);
    await expect(service.findByBarcode('t1', 'invalid-code')).rejects.toThrow();
  });
});
