import { SupplierPortalController } from './supplier-portal.controller';

describe('SupplierPortalController coverage', () => {
  const req = { user: { sub: 'u1', tenantId: 't1', supplierId: 'supp-1' } };
  const service = {
    getPurchaseOrders: jest.fn(),
    confirmShipment: jest.fn(),
    submitQuotation: jest.fn(),
  };
  const ctrl = new SupplierPortalController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getOrders delegates to service', () => {
    ctrl.getOrders(req);
    expect(service.getPurchaseOrders).toHaveBeenCalledWith('t1', 'supp-1');
  });

  it('confirmShipment delegates to service', () => {
    const body = { tracking: 'TRACK123' };
    ctrl.confirmShipment(req, 'order-1', body);
    expect(service.confirmShipment).toHaveBeenCalledWith('t1', 'supp-1', 'order-1', body);
  });

  it('submitQuote delegates to service', () => {
    const body = { amount: 1000 };
    ctrl.submitQuote(req, 'rfq-1', body);
    expect(service.submitQuotation).toHaveBeenCalledWith('t1', 'supp-1', 'rfq-1', body);
  });
});
