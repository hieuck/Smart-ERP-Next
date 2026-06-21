import { TransfersController } from './transfers.controller';

describe('TransfersController', () => {
  let svc: any;
  let ctrl: TransfersController;

  beforeEach(() => {
    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      approve: jest.fn(),
      ship: jest.fn(),
      receive: jest.fn(),
      cancel: jest.fn(),
    };
    ctrl = new TransfersController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('create delegates to service', async () => {
    svc.create.mockResolvedValue({ id: 'tr1' });
    const body = { fromWarehouseId: 'w1', toWarehouseId: 'w2', items: [] };
    const r = await ctrl.create(req, body);
    expect(svc.create).toHaveBeenCalledWith('t1', 'u1', body);
    expect(r).toEqual({ id: 'tr1' });
  });

  it('findAll delegates to service with filters', async () => {
    svc.findAll.mockResolvedValue([{ id: 'tr1' }]);
    const r = await ctrl.findAll(req, 'pending', 'w1', 'w2');
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      status: 'pending',
      fromWarehouseId: 'w1',
      toWarehouseId: 'w2',
    });
    expect(r).toEqual([{ id: 'tr1' }]);
  });

  it('findAll delegates to service with no filters', async () => {
    svc.findAll.mockResolvedValue([]);
    const r = await ctrl.findAll(req, undefined, undefined, undefined);
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      status: undefined,
      fromWarehouseId: undefined,
      toWarehouseId: undefined,
    });
    expect(r).toEqual([]);
  });

  it('findOne delegates to service', async () => {
    svc.findOne.mockResolvedValue({ id: 'tr1' });
    const r = await ctrl.findOne(req, 'tr1');
    expect(svc.findOne).toHaveBeenCalledWith('t1', 'tr1');
    expect(r).toEqual({ id: 'tr1' });
  });

  it('approve delegates to service', async () => {
    svc.approve.mockResolvedValue({ id: 'tr1', status: 'approved' });
    const r = await ctrl.approve(req, 'tr1');
    expect(svc.approve).toHaveBeenCalledWith('t1', 'u1', 'tr1');
    expect(r).toEqual({ id: 'tr1', status: 'approved' });
  });

  it('ship delegates to service', async () => {
    svc.ship.mockResolvedValue({ id: 'tr1', status: 'shipped' });
    const body = { items: [{ itemId: 'i1', quantityShipped: 5 }] };
    const r = await ctrl.ship(req, 'tr1', body);
    expect(svc.ship).toHaveBeenCalledWith('t1', 'u1', 'tr1', body.items);
    expect(r).toEqual({ id: 'tr1', status: 'shipped' });
  });

  it('receive delegates to service', async () => {
    svc.receive.mockResolvedValue({ id: 'tr1', status: 'received' });
    const body = { items: [{ itemId: 'i1', quantityReceived: 5 }] };
    const r = await ctrl.receive(req, 'tr1', body);
    expect(svc.receive).toHaveBeenCalledWith('t1', 'u1', 'tr1', body.items);
    expect(r).toEqual({ id: 'tr1', status: 'received' });
  });

  it('cancel delegates to service', async () => {
    svc.cancel.mockResolvedValue({ id: 'tr1', status: 'cancelled' });
    const r = await ctrl.cancel(req, 'tr1');
    expect(svc.cancel).toHaveBeenCalledWith('t1', 'u1', 'tr1');
    expect(r).toEqual({ id: 'tr1', status: 'cancelled' });
  });
});
