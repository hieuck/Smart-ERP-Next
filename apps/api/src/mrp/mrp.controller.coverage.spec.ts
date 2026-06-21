import { MRPController } from './mrp.controller';

describe('MRPController', () => {
  let controller: MRPController;
  let mockService: Record<string, jest.Mock>;

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  beforeEach(() => {
    mockService = {
      calculateMRP: jest.fn(),
      calculateMRPBatch: jest.fn(),
    };
    controller = new MRPController(mockService as any);
  });

  it('calculateMRP delegates to service.calculateMRP with default daysAhead', async () => {
    mockService.calculateMRP.mockResolvedValue('mrp-result');
    const result = await controller.calculateMRP(req, 'pid-1');
    expect(mockService.calculateMRP).toHaveBeenCalledWith('t1', 'pid-1', 30);
    expect(result).toBe('mrp-result');
  });

  it('calculateMRP passes provided daysAhead', async () => {
    mockService.calculateMRP.mockResolvedValue('mrp-result');
    const result = await controller.calculateMRP(req, 'pid-1', 60);
    expect(mockService.calculateMRP).toHaveBeenCalledWith('t1', 'pid-1', 60);
    expect(result).toBe('mrp-result');
  });

  it('calculateMRPBatch delegates to service.calculateMRPBatch with default daysAhead', async () => {
    mockService.calculateMRPBatch.mockResolvedValue('batch-result');
    const result = await controller.calculateMRPBatch(req);
    expect(mockService.calculateMRPBatch).toHaveBeenCalledWith('t1', undefined, 30);
    expect(result).toBe('batch-result');
  });

  it('calculateMRPBatch passes provided daysAhead', async () => {
    mockService.calculateMRPBatch.mockResolvedValue('batch-result');
    const result = await controller.calculateMRPBatch(req, 45);
    expect(mockService.calculateMRPBatch).toHaveBeenCalledWith('t1', undefined, 45);
    expect(result).toBe('batch-result');
  });
});
