import { MRPController } from './mrp.controller';
import { MRPService } from './mrp.service';

describe('MRPController', () => {
  let service: MRPService;
  let controller: MRPController;

  beforeEach(() => {
    service = {
      calculateMRP: jest.fn(),
      calculateMRPBatch: jest.fn(),
    } as unknown as MRPService;
    controller = new MRPController(service);
  });

  it('calculateMRP passes valid UUID and daysAhead to service', async () => {
    const req = { user: { tenantId: 't1' } };
    const productId = '00000000-0000-0000-0000-000000000001';
    (service.calculateMRP as jest.Mock).mockResolvedValue({ productId } as any);

    const result = await controller.calculateMRP(req, productId, { daysAhead: 60 } as any);

    expect(service.calculateMRP).toHaveBeenCalledWith('t1', productId, 60);
    expect(result).toEqual({ productId });
  });

  it('calculateMRP defaults daysAhead to 30 when omitted', async () => {
    const req = { user: { tenantId: 't1' } };
    const productId = '00000000-0000-0000-0000-000000000001';
    (service.calculateMRP as jest.Mock).mockResolvedValue({ productId } as any);

    await controller.calculateMRP(req, productId, {} as any);

    expect(service.calculateMRP).toHaveBeenCalledWith('t1', productId, 30);
  });

  it('calculateMRPBatch passes tenant and daysAhead to service', async () => {
    const req = { user: { tenantId: 't1' } };
    (service.calculateMRPBatch as jest.Mock).mockResolvedValue({ processed: 5 } as any);

    const result = await controller.calculateMRPBatch(req, { daysAhead: 90 } as any);

    expect(service.calculateMRPBatch).toHaveBeenCalledWith('t1', undefined, 90);
    expect(result).toEqual({ processed: 5 });
  });
});
