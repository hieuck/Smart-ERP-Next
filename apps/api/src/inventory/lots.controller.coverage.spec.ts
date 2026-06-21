import { LotsController } from './lots.controller';

describe('LotsController', () => {
  let svc: any;
  let ctrl: LotsController;

  beforeEach(() => {
    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      getExpiringSoon: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    ctrl = new LotsController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('create delegates to service', async () => {
    svc.create.mockResolvedValue({ id: 'lot1' });
    const body = { lotNumber: 'LOT-001', productId: 'p1' };
    const r = await ctrl.create(req, body);
    expect(svc.create).toHaveBeenCalledWith('t1', 'u1', body);
    expect(r).toEqual({ id: 'lot1' });
  });

  it('findAll delegates to service with filters', async () => {
    svc.findAll.mockResolvedValue([{ id: 'lot1' }]);
    const r = await ctrl.findAll(req, 'p1', 'w1', 'true');
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      productId: 'p1',
      warehouseId: 'w1',
      includeExpired: true,
    });
    expect(r).toEqual([{ id: 'lot1' }]);
  });

  it('findAll delegates to service with no filters', async () => {
    svc.findAll.mockResolvedValue([]);
    const r = await ctrl.findAll(req, undefined, undefined, undefined);
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      productId: undefined,
      warehouseId: undefined,
      includeExpired: false,
    });
    expect(r).toEqual([]);
  });

  it('getExpiringSoon delegates to service with custom days', async () => {
    svc.getExpiringSoon.mockResolvedValue([{ id: 'lot1' }]);
    const r = await ctrl.getExpiringSoon(req, '7');
    expect(svc.getExpiringSoon).toHaveBeenCalledWith('t1', 7);
    expect(r).toEqual([{ id: 'lot1' }]);
  });

  it('getExpiringSoon delegates to service with default days', async () => {
    svc.getExpiringSoon.mockResolvedValue([]);
    const r = await ctrl.getExpiringSoon(req, undefined);
    expect(svc.getExpiringSoon).toHaveBeenCalledWith('t1', 30);
    expect(r).toEqual([]);
  });

  it('findOne delegates to service', async () => {
    svc.findOne.mockResolvedValue({ id: 'lot1' });
    const r = await ctrl.findOne(req, 'lot1');
    expect(svc.findOne).toHaveBeenCalledWith('t1', 'lot1');
    expect(r).toEqual({ id: 'lot1' });
  });

  it('update delegates to service', async () => {
    svc.update.mockResolvedValue({ id: 'lot1' });
    const body = { lotNumber: 'LOT-002' };
    const r = await ctrl.update(req, 'lot1', body);
    expect(svc.update).toHaveBeenCalledWith('t1', 'u1', 'lot1', body);
    expect(r).toEqual({ id: 'lot1' });
  });

  it('remove delegates to service', async () => {
    svc.remove.mockResolvedValue({ id: 'lot1' });
    const r = await ctrl.remove(req, 'lot1');
    expect(svc.remove).toHaveBeenCalledWith('t1', 'u1', 'lot1');
    expect(r).toEqual({ id: 'lot1' });
  });
});
