import { ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ManufacturingController } from './manufacturing.controller';
import { AddRoutingStepDto, ReportProgressDto, UpdateQCCheckpointDto } from './dto';

describe('ManufacturingController', () => {
  const mockService = {
    getBOM: jest.fn().mockResolvedValue([]),
    addBOMItem: jest.fn().mockResolvedValue({ id: 'bom-1' }),
    listProductionOrders: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    createProductionOrder: jest.fn().mockResolvedValue({ id: 'po-1' }),
    startProduction: jest.fn().mockResolvedValue({ id: 'po-1' }),
    completeProduction: jest.fn().mockResolvedValue({ id: 'po-1' }),
    reportProductionProgress: jest.fn().mockResolvedValue({ id: 'po-1' }),
    getProductionOrderById: jest.fn().mockResolvedValue({ id: 'po-1' }),
    getQCCheckpoints: jest.fn().mockResolvedValue([]),
    updateQCCheckpoint: jest.fn().mockResolvedValue({ id: 'cp-1' }),
    calculateProductionCost: jest.fn().mockResolvedValue({ totalCost: 0 }),
    calculateVarianceAnalysis: jest.fn().mockResolvedValue({}),
    getRoutingSteps: jest.fn().mockResolvedValue([]),
    addRoutingStep: jest.fn().mockResolvedValue({ id: 'rs-1' }),
    removeRoutingStep: jest.fn().mockResolvedValue({ id: 'rs-1' }),
  };
  const controller = new ManufacturingController(mockService as any);
  const req = { user: { tenantId: 'tenant-1', sub: 'user-1' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ParseUUIDPipe usage on path parameters', () => {
    const pipe = new ParseUUIDPipe();

    it('throws BadRequestException for non-UUID productId', async () => {
      await expect(pipe.transform('not-a-uuid', { type: 'param', metatype: String, data: 'productId' })).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid UUID productId', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await expect(pipe.transform(uuid, { type: 'param', metatype: String, data: 'productId' })).resolves.toBe(uuid);
    });
  });

  describe('DTO validation', () => {
    function extractErrors(errors: ValidationError[]): string[] {
      return errors.flatMap(e => Object.values(e.constraints || {}));
    }

    it('ReportProgressDto rejects negative quantities', async () => {
      const dto = plainToInstance(ReportProgressDto, { quantityProduced: -1, quantityScrap: -1, notes: 'ok' });
      const errors = extractErrors(await validate(dto));
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/quantityProduced|quantityScrap/)]));
    });

    it('ReportProgressDto accepts valid input', async () => {
      const dto = plainToInstance(ReportProgressDto, { quantityProduced: 5, quantityScrap: 1, notes: 'halfway' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('AddRoutingStepDto rejects invalid values', async () => {
      const dto = plainToInstance(AddRoutingStepDto, {
        productId: '',
        operationName: '',
        sequenceOrder: -1,
        cycleTimeMinutes: -5,
      });
      const errors = extractErrors(await validate(dto));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('AddRoutingStepDto accepts valid input', async () => {
      const dto = plainToInstance(AddRoutingStepDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        operationName: 'Cutting',
        sequenceOrder: 1,
        cycleTimeMinutes: 10,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Controller method behavior', () => {
    it('getBOM calls service with productId and tenantId', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await controller.getBOM(req as any, uuid);
      expect(mockService.getBOM).toHaveBeenCalledWith(uuid, 'tenant-1');
    });

    it('startOrder calls service with tenantId and order id', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await controller.startOrder(req as any, uuid);
      expect(mockService.startProduction).toHaveBeenCalledWith('tenant-1', uuid, 'user-1');
    });

    it('updateQCCheckpoint passes tenantId to service', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const checkpointId = '660e8400-e29b-41d4-a716-446655440000';
      const body: UpdateQCCheckpointDto = { status: 'passed', notes: 'ok' };
      await controller.updateQCCheckpoint(req as any, orderId, checkpointId, body);
      expect(mockService.updateQCCheckpoint).toHaveBeenCalledWith(orderId, checkpointId, 'passed', 'ok', 'tenant-1');
    });

    it('reportProgress passes DTO to service', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const body: ReportProgressDto = { quantityProduced: 5, quantityScrap: 1, notes: 'ok' };
      await controller.reportProgress(req as any, orderId, body);
      expect(mockService.reportProductionProgress).toHaveBeenCalledWith('tenant-1', orderId, body);
    });

    it('addRoutingStep passes DTO to service', async () => {
      const body: AddRoutingStepDto = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        operationName: 'Cutting',
        sequenceOrder: 1,
        cycleTimeMinutes: 10,
      };
      await controller.addRoutingStep(req as any, body);
      expect(mockService.addRoutingStep).toHaveBeenCalledWith('tenant-1', body);
    });
  });
});
