import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateCustomerData', () => {
    it('should validate customer with valid data', () => {
      const validCustomer = {
        code: 'CUS-001',
        name: 'John Doe',
        phone: '0901234567',
        email: 'john@example.com',
        taxCode: '0123456789',
      };
      expect(() => service.validateCustomerData(validCustomer)).not.toThrow();
    });

    it('should throw error for invalid email', () => {
      const invalidCustomer = {
        code: 'CUS-001',
        name: 'John Doe',
        email: 'invalid-email',
      };
      expect(() => service.validateCustomerData(invalidCustomer)).toThrow();
    });
  });
});
