import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateOrderData', () => {
    it('should validate order with valid data', () => {
      const validOrder = {
        code: 'ORD-001',
        customerName: 'John Doe',
        customerPhone: '0901234567',
        total: 100000,
        status: 'pending',
        items: [
          {
            productId: 'prod-123',
            productName: 'Product A',
            quantity: 2,
            price: 50000,
          },
        ],
      };
      expect(() => service.validateOrderData(validOrder)).not.toThrow();
    });

    it('should throw error for invalid order data', () => {
      const invalidOrder = {
        code: '',
        customerName: '',
        total: -100,
        items: [],
      };
      expect(() => service.validateOrderData(invalidOrder)).toThrow();
    });
  });
});
