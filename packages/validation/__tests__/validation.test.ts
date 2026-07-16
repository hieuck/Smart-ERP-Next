import { z } from 'zod';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  createOrderSchema,
  createLotSchema,
  updateLotSchema,
  lotQuerySchema,
  createLeadSchema,
  updateLeadSchema,
  paginationParamsSchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  purchaseOrderQuerySchema,
  createTenantSchema,
  updateTenantSchema,
} from '../src';

describe('validation schemas', () => {
  describe('customer schema', () => {
    it('should validate correct customer data', () => {
      const data = {
        code: 'C001',
        name: 'Nguyen Van A',
        phone: '0901234567',
        email: 'customer@example.com',
        customerGroup: 'vip' as const,
      };
      const parsed = createCustomerSchema.parse(data);
      expect(parsed.isActive).toBe(true);
      expect(parsed.customerGroup).toBe('vip');
    });

    it('should default isActive and customerGroup', () => {
      const data = {
        code: 'C002',
        name: 'Tran Thi B',
      };
      const parsed = createCustomerSchema.parse(data);
      expect(parsed.isActive).toBe(true);
      expect(parsed.customerGroup).toBe('retail');
    });

    it('should reject empty code/name or invalid phone/email/debtLimit', () => {
      const res1 = createCustomerSchema.safeParse({ code: '', name: 'Nguyen Van A' });
      expect(res1.success).toBe(false);

      const res2 = createCustomerSchema.safeParse({ code: 'C001', name: '', phone: 'abc' });
      expect(res2.success).toBe(false);

      const res3 = createCustomerSchema.safeParse({ code: 'C001', name: 'A', email: 'invalid-email' });
      expect(res3.success).toBe(false);

      const res4 = createCustomerSchema.safeParse({ code: 'C001', name: 'A', debtLimit: -100 });
      expect(res4.success).toBe(false);
    });

    it('should allow optional fields to be null', () => {
      const data = {
        code: 'C003',
        name: 'John',
        phone: null,
        email: null,
        address: null,
        ward: null,
        district: null,
        province: null,
        taxCode: null,
        contactPerson: null,
        notes: null,
      };
      const parsed = createCustomerSchema.parse(data);
      expect(parsed.phone).toBeNull();
    });

    it('should validate partial customer update', () => {
      const res = updateCustomerSchema.safeParse({ name: 'New Name' });
      expect(res.success).toBe(true);
    });
  });

  describe('user schema', () => {
    it('should validate correct user data', () => {
      const data = {
        email: 'user@example.com',
        password: 'securepassword',
        role: 'manager' as const,
      };
      const parsed = createUserSchema.parse(data);
      expect(parsed.role).toBe('manager');
    });

    it('should default role to user', () => {
      const parsed = createUserSchema.parse({ email: 'user@example.com', password: 'securepassword' });
      expect(parsed.role).toBe('user');
    });

    it('should reject invalid email or short password or invalid tenant UUID', () => {
      const res1 = createUserSchema.safeParse({ email: 'invalid', password: '123' });
      expect(res1.success).toBe(false);

      const res2 = createUserSchema.safeParse({ email: 'u@e.com', password: 'password', tenantId: 'not-a-uuid' });
      expect(res2.success).toBe(false);
    });

    it('should validate updateUserSchema', () => {
      const res1 = updateUserSchema.safeParse({ role: 'accountant' as const });
      expect(res1.success).toBe(true);

      const res2 = updateUserSchema.safeParse({ role: 'invalid' });
      expect(res2.success).toBe(false);
    });

    it('should validate loginSchema', () => {
      const res1 = loginSchema.safeParse({ email: 'user@e.com', password: 'securepassword' });
      expect(res1.success).toBe(true);

      const res2 = loginSchema.safeParse({ email: 'user', password: '12' });
      expect(res2.success).toBe(false);
    });
  });

  describe('order schema', () => {
    it('should validate correct order data', () => {
      const data = {
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 5,
            unitPrice: 10000,
            discountPercent: 10,
            taxRate: 5,
          },
        ],
      };
      const parsed = createOrderSchema.parse(data);
      expect(parsed.channel).toBe('pos');
      expect(parsed.items).toHaveLength(1);
    });

    it('should reject order with empty items, invalid uuid, negative quantity or price', () => {
      const res1 = createOrderSchema.safeParse({ items: [] });
      expect(res1.success).toBe(false);

      const res2 = createOrderSchema.safeParse({
        items: [
          {
            productId: 'invalid-uuid',
            quantity: 0,
            unitPrice: -50,
          },
        ],
      });
      expect(res2.success).toBe(false);
    });
  });

  describe('inventory schema', () => {
    it('should validate correct lot data', () => {
      const data = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        lotNumber: 'LOT-2026',
        expiryDate: '2026-12-31',
        quantity: 100,
        warehouseId: '550e8400-e29b-41d4-a716-446655440001',
        receivedDate: '2026-05-20',
      };
      const parsed = createLotSchema.parse(data);
      expect(parsed.lotNumber).toBe('LOT-2026');
    });

    it('should reject invalid lot number, invalid dates, non-positive quantity', () => {
      const res1 = createLotSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        lotNumber: '',
        quantity: -5,
      });
      expect(res1.success).toBe(false);

      const res2 = createLotSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        lotNumber: 'L1',
        expiryDate: 'not-a-date',
        quantity: 10,
      });
      expect(res2.success).toBe(false);
    });

    it('should validate lot query schema', () => {
      const res = lotQuerySchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        includeExpired: true,
      });
      expect(res.success).toBe(true);
    });

    it('should validate partial lot update', () => {
      const res = updateLotSchema.safeParse({ quantity: 50 });
      expect(res.success).toBe(true);
    });
  });

  describe('lead schema', () => {
    it('should validate correct lead data', () => {
      const data = {
        firstName: 'Nguyen',
        lastName: 'A',
        email: 'lead@example.com',
        phone: '0901234567',
        source: 'website' as const,
      };
      const parsed = createLeadSchema.parse(data);
      expect(parsed.source).toBe('website');
      expect(parsed.status).toBe('new');
    });

    it('should reject invalid email, phone, or name', () => {
      const res1 = createLeadSchema.safeParse({ firstName: '', lastName: 'A' });
      expect(res1.success).toBe(false);

      const res2 = createLeadSchema.safeParse({ firstName: 'N', lastName: 'A', email: 'invalid' });
      expect(res2.success).toBe(false);
    });

    it('should validate partial lead update', () => {
      const res = updateLeadSchema.safeParse({ status: 'contacted' as const });
      expect(res.success).toBe(true);
    });
  });

  describe('pagination schema', () => {
    it('should parse and coerce values to integers with defaults', () => {
      const res = paginationParamsSchema.parse({});
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.sortOrder).toBe('asc');

      const resCoerced = paginationParamsSchema.parse({ page: '5', limit: '25', sortOrder: 'desc' });
      expect(resCoerced.page).toBe(5);
      expect(resCoerced.limit).toBe(25);
      expect(resCoerced.sortOrder).toBe('desc');
    });

    it('should restrict limit max to 100', () => {
      const res = paginationParamsSchema.safeParse({ limit: 150 });
      expect(res.success).toBe(false);
    });
  });

  describe('product schema', () => {
    it('should validate product correct data', () => {
      const data = {
        name: 'Product A',
        sku: 'SKU-001',
        price: 150000,
        cost: 100000,
      };
      const parsed = createProductSchema.parse(data);
      expect(parsed.stock).toBe(0);
      expect(parsed.isActive).toBe(true);
    });

    it('should reject non-positive price or negative cost/stock', () => {
      const res1 = createProductSchema.safeParse({ name: 'A', sku: 'S', price: -10 });
      expect(res1.success).toBe(false);

      const res2 = createProductSchema.safeParse({ name: 'A', sku: 'S', price: 10, stock: -5 });
      expect(res2.success).toBe(false);
    });

    it('should validate product query schema', () => {
      const res = productQuerySchema.safeParse({
        search: 'phone',
        minPrice: 50,
        limit: 50,
      });
      expect(res.success).toBe(true);
    });

    it('should validate partial product update', () => {
      const res = updateProductSchema.safeParse({ price: 20000 });
      expect(res.success).toBe(true);
    });
  });

  describe('purchase order schema', () => {
    it('should validate correct purchase order data', () => {
      const data = {
        supplierId: '550e8400-e29b-41d4-a716-446655440000',
        warehouseId: '550e8400-e29b-41d4-a716-446655440001',
        expectedDate: '2026-05-20',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440002',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
      };
      const parsed = createPurchaseOrderSchema.parse(data);
      expect(parsed.items).toHaveLength(1);
    });

    it('should validate purchase order query schema', () => {
      const res = purchaseOrderQuerySchema.safeParse({
        status: 'confirmed' as const,
      });
      expect(res.success).toBe(true);
    });

    it('should validate partial purchase order update', () => {
      const res = updatePurchaseOrderSchema.safeParse({ status: 'cancelled' as const });
      expect(res.success).toBe(true);
    });
  });

  describe('tenant schema', () => {
    it('should validate correct tenant data', () => {
      const data = {
        name: 'Smart ERP Company',
        slug: 'smart-erp',
      };
      const parsed = createTenantSchema.parse(data);
      expect(parsed.slug).toBe('smart-erp');
    });

    it('should reject slug containing capital letters or spaces or invalid characters', () => {
      const res1 = createTenantSchema.safeParse({ name: 'A', slug: 'Smart-ERP' });
      expect(res1.success).toBe(false);

      const res2 = createTenantSchema.safeParse({ name: 'A', slug: 'smart erp' });
      expect(res2.success).toBe(false);

      const res3 = createTenantSchema.safeParse({ name: 'A', slug: 'smart_erp' });
      expect(res3.success).toBe(false);
    });

    it('should validate partial tenant update', () => {
      const res = updateTenantSchema.safeParse({ name: 'New Name' });
      expect(res.success).toBe(true);
    });
  });
});
