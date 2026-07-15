import { NotFoundException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { XeroController } from './xero.controller';

describe('XeroController', () => {
  let svc: any;
  let ctrl: XeroController;

  beforeEach(() => {
    svc = {
      saveConnection: jest.fn(),
      getConnection: jest.fn(),
      syncCustomers: jest.fn(),
      syncInvoices: jest.fn(),
    };
    ctrl = new XeroController(svc);
  });

  const user = { tenantId: 't1' };

  it('connect delegates to service', async () => {
    svc.saveConnection.mockResolvedValue(undefined);
    const body = { accessToken: 'abc' };
    const r = await ctrl.connect(user, body);
    expect(svc.saveConnection).toHaveBeenCalledWith('t1', body);
    expect(r).toEqual({ message: 'Xero connection saved' });
  });

  it('status returns disconnected when no connection', async () => {
    svc.getConnection.mockResolvedValue(null);
    const r = await ctrl.status(user);
    expect(svc.getConnection).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ connected: false, lastSync: undefined });
  });

  it('status returns connected info', async () => {
    svc.getConnection.mockResolvedValue({ id: 'c1', lastSyncAt: '2024-06-01T00:00:00Z' });
    const r = await ctrl.status(user);
    expect(r).toEqual({ connected: true, lastSync: '2024-06-01T00:00:00Z' });
  });

  it('sync throws when no connection', async () => {
    svc.getConnection.mockResolvedValue(null);
    await expect(ctrl.sync(user, { type: 'invoices' })).rejects.toThrow(NotFoundException);
  });

  it('sync syncs customers', async () => {
    const conn = { id: 'c1', token: 'abc' };
    svc.getConnection.mockResolvedValue(conn);
    svc.syncCustomers.mockResolvedValue(undefined);
    const r = await ctrl.sync(user, { type: 'customers' });
    expect(svc.syncCustomers).toHaveBeenCalledWith('c1', conn);
    expect(r).toEqual({ message: 'Synced customers' });
  });

  it('sync syncs invoices', async () => {
    const conn = { id: 'c1', token: 'abc' };
    svc.getConnection.mockResolvedValue(conn);
    svc.syncInvoices.mockResolvedValue(undefined);
    const r = await ctrl.sync(user, { type: 'invoices' });
    expect(svc.syncInvoices).toHaveBeenCalledWith('c1', conn);
    expect(r).toEqual({ message: 'Synced invoices' });
  });
});
