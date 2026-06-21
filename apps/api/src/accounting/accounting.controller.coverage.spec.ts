import { AccountingController } from './accounting.controller';

describe('AccountingController', () => {
  let svc: any;
  let ctrl: AccountingController;

  beforeEach(() => {
    svc = {
      getDashboard: jest.fn(),
      getReports: jest.fn(),
    };
    ctrl = new AccountingController(svc);
  });

  const req = { user: { tenantId: 't1' } };

  it('getDashboard delegates to service', async () => {
    svc.getDashboard.mockResolvedValue({ revenue: 1000 });
    const r = await ctrl.getDashboard(req, '2024-01');
    expect(svc.getDashboard).toHaveBeenCalledWith('t1', '2024-01');
    expect(r).toEqual({ revenue: 1000 });
  });

  it('getDashboard calls service with undefined period', async () => {
    svc.getDashboard.mockResolvedValue({});
    await ctrl.getDashboard(req);
    expect(svc.getDashboard).toHaveBeenCalledWith('t1', undefined);
  });

  it('getReports delegates to service', async () => {
    svc.getReports.mockResolvedValue({ data: [] });
    const r = await ctrl.getReports(req, 'pnl', '2024-01');
    expect(svc.getReports).toHaveBeenCalledWith('t1', 'pnl', '2024-01');
    expect(r).toEqual({ data: [] });
  });

  it('getReports calls service with undefined params', async () => {
    svc.getReports.mockResolvedValue({});
    await ctrl.getReports(req);
    expect(svc.getReports).toHaveBeenCalledWith('t1', undefined, undefined);
  });
});
