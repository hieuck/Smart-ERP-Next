import { SupplierCollaborationController } from './supplier-collaboration.controller';

describe('SupplierCollaborationController coverage', () => {
  const req = { user: { sub: 'u1', tenantId: 't1' } };
  const service = {
    getSupplierOrders: jest.fn(),
    getSupplierPerformance: jest.fn(),
    confirmDelivery: jest.fn(),
  };
  const ctrl = new SupplierCollaborationController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMyOrders delegates to service', async () => {
    service.getSupplierOrders.mockResolvedValue([]);
    const result = await ctrl.getMyOrders(req);
    expect(service.getSupplierOrders).toHaveBeenCalledWith('u1', 't1');
    expect(result).toEqual([]);
  });

  it('getMyPerformance delegates to service', async () => {
    service.getSupplierPerformance.mockResolvedValue({ rating: 4.5 });
    const result = await ctrl.getMyPerformance(req);
    expect(service.getSupplierPerformance).toHaveBeenCalledWith('u1', 't1');
    expect(result).toEqual({ rating: 4.5 });
  });

  it('confirmDelivery delegates to service', async () => {
    service.confirmDelivery.mockResolvedValue({ success: true });
    const result = await ctrl.confirmDelivery(req, 'order-1');
    expect(service.confirmDelivery).toHaveBeenCalledWith('u1', 'order-1', 't1');
    expect(result).toEqual({ success: true });
  });
});
