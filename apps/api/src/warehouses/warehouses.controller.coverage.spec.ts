import { WarehousesController } from './warehouses.controller';

describe('WarehousesController', () => {
  let svc: any;
  let ctrl: WarehousesController;

  beforeEach(() => {
    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      findDefault: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    ctrl = new WarehousesController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('create delegates to service', async () => {
    svc.create.mockResolvedValue({ id: 'w1' });
    const body = { code: 'WH1', name: 'Warehouse 1' };
    const r = await ctrl.create(req, body);
    expect(svc.create).toHaveBeenCalledWith('t1', body);
    expect(r).toEqual({ id: 'w1' });
  });

  it('findAll delegates to service', async () => {
    svc.findAll.mockResolvedValue([{ id: 'w1' }]);
    const r = await ctrl.findAll(req);
    expect(svc.findAll).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ id: 'w1' }]);
  });

  it('findDefault delegates to service', async () => {
    svc.findDefault.mockResolvedValue({ id: 'w1', isDefault: true });
    const r = await ctrl.findDefault(req);
    expect(svc.findDefault).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ id: 'w1', isDefault: true });
  });

  it('findOne delegates to service', async () => {
    svc.findOne.mockResolvedValue({ id: 'w1' });
    const r = await ctrl.findOne(req, 'w1');
    expect(svc.findOne).toHaveBeenCalledWith('t1', 'w1');
    expect(r).toEqual({ id: 'w1' });
  });

  it('update delegates to service', async () => {
    svc.update.mockResolvedValue({ id: 'w1', name: 'Updated' });
    const body = { name: 'Updated' };
    const r = await ctrl.update(req, 'w1', body);
    expect(svc.update).toHaveBeenCalledWith('t1', 'w1', body);
    expect(r).toEqual({ id: 'w1', name: 'Updated' });
  });

  it('remove delegates to service', async () => {
    svc.remove.mockResolvedValue({ id: 'w1' });
    const r = await ctrl.remove(req, 'w1');
    expect(svc.remove).toHaveBeenCalledWith('t1', 'w1');
    expect(r).toEqual({ id: 'w1' });
  });
});
