import 'reflect-metadata';
import { ParseUUIDPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InventoryController } from './inventory.controller';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationActionDto } from './dto/reservation-action.dto';

describe('InventoryController coverage', () => {
  const inventoryService = {
    adjust: jest.fn().mockResolvedValue({}),
    createReservation: jest.fn().mockResolvedValue({}),
    releaseReservation: jest.fn().mockResolvedValue({}),
    consumeReservation: jest.fn().mockResolvedValue({}),
    getAvailableStock: jest.fn().mockResolvedValue(0),
    pushStockToMarketplace: jest.fn().mockResolvedValue({}),
    getTransactions: jest.fn().mockResolvedValue({}),
    getLowStock: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({}),
    getReorderSuggestions: jest.fn().mockResolvedValue([]),
    syncAllStoresStock: jest.fn().mockResolvedValue([]),
  };

  const controller = new InventoryController(inventoryService as any);
  const req = { user: { tenantId: 'tenant-1', sub: 'user-1' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AdjustInventoryDto', () => {
    it('rejects negative quantity', async () => {
      const dto = plainToInstance(AdjustInventoryDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: -1000,
        type: 'IN',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'quantity')).toBe(true);
    });

    it('rejects invalid product id', async () => {
      const dto = plainToInstance(AdjustInventoryDto, {
        productId: 'not-a-uuid',
        quantity: 10,
        type: 'IN',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'productId')).toBe(true);
    });

    it('accepts valid payload', async () => {
      const dto = plainToInstance(AdjustInventoryDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 10,
        type: 'IN',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid type', async () => {
      const dto = plainToInstance(AdjustInventoryDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 10,
        type: 'INVALID',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'type')).toBe(true);
    });
  });

  describe('CreateReservationDto', () => {
    it('rejects invalid storeId', async () => {
      const dto = plainToInstance(CreateReservationDto, {
        storeId: 'bad',
        externalOrderId: 'order-1',
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 1,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'storeId')).toBe(true);
    });

    it('rejects quantity less than 1', async () => {
      const dto = plainToInstance(CreateReservationDto, {
        storeId: '550e8400-e29b-41d4-a716-446655440000',
        externalOrderId: 'order-1',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 0,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'quantity')).toBe(true);
    });

    it('accepts valid reservation payload', async () => {
      const dto = plainToInstance(CreateReservationDto, {
        storeId: '550e8400-e29b-41d4-a716-446655440000',
        externalOrderId: 'order-1',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('ReservationActionDto', () => {
    it('rejects missing externalOrderId', async () => {
      const dto = plainToInstance(ReservationActionDto, {});
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'externalOrderId')).toBe(true);
    });

    it('accepts valid release payload', async () => {
      const dto = plainToInstance(ReservationActionDto, { externalOrderId: 'order-1' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('ParseUUIDPipe on path parameters', () => {
    it('rejects invalid productId parameter', async () => {
      const pipe = new ParseUUIDPipe();
      await expect(pipe.transform('not-a-uuid', { type: 'param', metatype: String } as any)).rejects.toBeDefined();
    });

    it('accepts valid productId parameter', async () => {
      const pipe = new ParseUUIDPipe();
      const id = '550e8400-e29b-41d4-a716-446655440000';
      await expect(pipe.transform(id, { type: 'param', metatype: String } as any)).resolves.toBe(id);
    });
  });

  describe('controller delegation', () => {
    it('getTransactions delegates to service', async () => {
      await controller.getTransactions(req, '2', '50', 'p1', 'IN');
      expect(inventoryService.getTransactions).toHaveBeenCalledWith('tenant-1', {
        page: 2,
        limit: 50,
        productId: 'p1',
        type: 'IN',
      });
    });

    it('getLowStock delegates to service', async () => {
      await controller.getLowStock(req);
      expect(inventoryService.getLowStock).toHaveBeenCalledWith('tenant-1');
    });

    it('getSummary delegates to service', async () => {
      await controller.getSummary(req);
      expect(inventoryService.getSummary).toHaveBeenCalledWith('tenant-1');
    });

    it('getReorderSuggestions delegates to service', async () => {
      await controller.getReorderSuggestions(req);
      expect(inventoryService.getReorderSuggestions).toHaveBeenCalledWith('tenant-1');
    });

    it('adjust delegates to service', async () => {
      await controller.adjust(req, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 10,
        type: 'IN',
      });
      expect(inventoryService.adjust).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        '550e8400-e29b-41d4-a716-446655440000',
        10,
        'IN',
        undefined,
        undefined,
      );
    });

    it('createReservation delegates to service', async () => {
      await controller.createReservation(req, {
        storeId: '550e8400-e29b-41d4-a716-446655440000',
        externalOrderId: 'order-1',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 5,
      });
      expect(inventoryService.createReservation).toHaveBeenCalledWith(
        'tenant-1',
        '550e8400-e29b-41d4-a716-446655440000',
        'order-1',
        '550e8400-e29b-41d4-a716-446655440001',
        5,
      );
    });

    it('releaseReservation delegates to service', async () => {
      await controller.releaseReservation(req, { externalOrderId: 'order-1' });
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith('tenant-1', 'order-1');
    });

    it('consumeReservation delegates to service', async () => {
      await controller.consumeReservation(req, { externalOrderId: 'order-1' });
      expect(inventoryService.consumeReservation).toHaveBeenCalledWith('tenant-1', 'order-1');
    });

    it('getAvailableStock delegates with parsed productId', async () => {
      await controller.getAvailableStock(req, '550e8400-e29b-41d4-a716-446655440000', 'store-1');
      expect(inventoryService.getAvailableStock).toHaveBeenCalledWith('tenant-1', '550e8400-e29b-41d4-a716-446655440000', 'store-1');
    });

    it('pushStockToMarketplace delegates with parsed storeId', async () => {
      await controller.pushStockToMarketplace(req, '550e8400-e29b-41d4-a716-446655440000');
      expect(inventoryService.pushStockToMarketplace).toHaveBeenCalledWith('tenant-1', '550e8400-e29b-41d4-a716-446655440000');
    });

    it('syncAllStoresStock delegates to service', async () => {
      await controller.syncAllStoresStock(req);
      expect(inventoryService.syncAllStoresStock).toHaveBeenCalledWith('tenant-1');
    });
  });
});
