import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from '../services/fixed-assets.service';

describe('FixedAssetsController', () => {
  let service: FixedAssetsService;
  let controller: FixedAssetsController;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      runMonthlyDepreciation: jest.fn(),
      dispose: jest.fn(),
    } as unknown as FixedAssetsService;
    controller = new FixedAssetsController(service);
  });

  it('findAll passes validated query to service', async () => {
    const req = { user: { tenantId: 't1' } };
    const query = { page: 2, limit: 10, category: 'electronics', status: 'active' };
    (service.findAll as jest.Mock).mockResolvedValue({ items: [], page: 2, limit: 10 });

    const result = await controller.findAll(req, query as any);

    expect(service.findAll).toHaveBeenCalledWith('t1', query);
    expect(result).toEqual({ items: [], page: 2, limit: 10 });
  });

  it('findAll defaults page and limit when omitted', async () => {
    const req = { user: { tenantId: 't1' } };
    (service.findAll as jest.Mock).mockResolvedValue({ items: [], page: 1, limit: 20 });

    await controller.findAll(req, {} as any);

    expect(service.findAll).toHaveBeenCalledWith('t1', {});
  });

  it('create passes validated DTO to service', async () => {
    const req = { user: { tenantId: 't1' } };
    const dto = {
      name: 'Laptop',
      category: 'electronics',
      status: 'active',
      purchaseCost: '1000',
      residualValue: '100',
      usefulLifeMonths: 36,
      purchaseDate: '2025-01-01',
    };
    (service.create as jest.Mock).mockResolvedValue(dto);

    const result = await controller.create(req, dto as any);

    expect(service.create).toHaveBeenCalledWith('t1', dto);
    expect(result).toEqual(dto);
  });

  it('findOne passes UUID id to service', async () => {
    const req = { user: { tenantId: 't1' } };
    const id = '00000000-0000-0000-0000-000000000001';
    (service.findOne as jest.Mock).mockResolvedValue({ id });

    const result = await controller.findOne(req, id);

    expect(service.findOne).toHaveBeenCalledWith('t1', id);
    expect(result).toEqual({ id });
  });

  it('dispose passes UUID id to service', async () => {
    const req = { user: { tenantId: 't1' } };
    const id = '00000000-0000-0000-0000-000000000001';
    (service.dispose as jest.Mock).mockResolvedValue({ id, status: 'disposed' });

    const result = await controller.dispose(req, id);

    expect(service.dispose).toHaveBeenCalledWith('t1', id);
    expect(result).toEqual({ id, status: 'disposed' });
  });
});
