import { WarehouseTransferController } from './warehouse-transfer.controller';

describe('WarehouseTransferController', () => {
  let svc: any;
  let ctrl: WarehouseTransferController;

  beforeEach(() => {
    svc = { createTransfer: jest.fn(), confirmTransfer: jest.fn(), receiveTransfer: jest.fn(), getTransferById: jest.fn(), listTransfers: jest.fn() };
    ctrl = new WarehouseTransferController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('create delegates to service', async () => {
    svc.createTransfer.mockResolvedValue({ id: 'wt1' });
    const body = { fromWarehouseId: 'w1', toWarehouseId: 'w2', items: [{ productId: 'p1', quantity: 5 }] };
    const r = await ctrl.create(req, body);
    expect(svc.createTransfer).toHaveBeenCalledWith('t1', 'u1', 'w1', 'w2', body.items, undefined);
    expect(r).toEqual({ id: 'wt1' });
  });

  it('confirm delegates to service', async () => {
    svc.confirmTransfer.mockResolvedValue({ id: 'wt1', status: 'confirmed' });
    const r = await ctrl.confirm(req, 'wt1');
    expect(svc.confirmTransfer).toHaveBeenCalledWith('t1', 'wt1');
    expect(r).toEqual({ id: 'wt1', status: 'confirmed' });
  });

  it('receive delegates to service', async () => {
    svc.receiveTransfer.mockResolvedValue({ id: 'wt1', status: 'received' });
    const r = await ctrl.receive(req, 'wt1');
    expect(svc.receiveTransfer).toHaveBeenCalledWith('t1', 'wt1', 'u1');
    expect(r).toEqual({ id: 'wt1', status: 'received' });
  });

  it('getById delegates to service', async () => {
    svc.getTransferById.mockResolvedValue({ id: 'wt1' });
    const r = await ctrl.getById(req, 'wt1');
    expect(svc.getTransferById).toHaveBeenCalledWith('t1', 'wt1');
    expect(r).toEqual({ id: 'wt1' });
  });

  it('list delegates to service', async () => {
    svc.listTransfers.mockResolvedValue([]);
    await ctrl.list(req, '1', '10');
    expect(svc.listTransfers).toHaveBeenCalledWith('t1', 1, 10);
  });
});
