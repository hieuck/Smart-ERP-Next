import { EcommerceController } from './ecommerce.controller';

describe('EcommerceController', () => {
  let svc: any;
  let ctrl: EcommerceController;

  beforeEach(() => {
    svc = { getStores: jest.fn(), createStore: jest.fn(), syncAllStores: jest.fn(), getSyncLogs: jest.fn() };
    ctrl = new EcommerceController(svc);
  });

  it('getStores delegates to service', async () => {
    svc.getStores.mockResolvedValue([]);
    const r = await ctrl.getStores({ tenantId: 't1' });
    expect(svc.getStores).toHaveBeenCalledWith('t1');
    expect(r).toEqual([]);
  });

  it('createStore delegates to service', async () => {
    svc.createStore.mockResolvedValue({ id: 's1' });
    const r = await ctrl.createStore({ tenantId: 't1' }, { name: 'Test' });
    expect(svc.createStore).toHaveBeenCalledWith('t1', { name: 'Test' });
    expect(r).toEqual({ id: 's1' });
  });

  it('syncAll delegates to service', async () => {
    svc.syncAllStores.mockResolvedValue([]);
    await ctrl.syncAll({ tenantId: 't1' });
    expect(svc.syncAllStores).toHaveBeenCalledWith('t1');
  });

  it('syncStore delegates to service', async () => {
    svc.syncAllStores.mockResolvedValue([]);
    await ctrl.syncStore('s1', { tenantId: 't1' });
    expect(svc.syncAllStores).toHaveBeenCalledWith('t1', 's1');
  });

  it('getSyncLogs delegates to service', async () => {
    svc.getSyncLogs.mockResolvedValue([]);
    await ctrl.getSyncLogs({ tenantId: 't1' }, 's1');
    expect(svc.getSyncLogs).toHaveBeenCalledWith('t1', 's1');
  });
});
