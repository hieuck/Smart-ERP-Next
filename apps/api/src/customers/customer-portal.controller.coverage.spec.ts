import { CustomerPortalController } from './customer-portal.controller';

describe('CustomerPortalController', () => {
  let service: any;
  let controller: CustomerPortalController;

  const req = { user: { tenantId: 't1', sub: 'u1', customerId: 'c1' } };

  beforeEach(() => {
    service = {
      getOrders: jest.fn(),
      getOrderTracking: jest.fn(),
      getTickets: jest.fn(),
      createTicket: jest.fn(),
      getInvoices: jest.fn(),
    };
    controller = new CustomerPortalController(service);
  });

  it('getOrders delegates to service with tenantId and customerId', () => {
    service.getOrders.mockReturnValue([{ id: 'o1' }]);
    const result = controller.getOrders(req);
    expect(service.getOrders).toHaveBeenCalledWith('t1', 'c1');
    expect(result).toEqual([{ id: 'o1' }]);
  });

  it('getOrders uses empty UUID when customerId missing', () => {
    const reqNoCustomer = { user: { tenantId: 't1', sub: 'u1' } };
    service.getOrders.mockReturnValue([]);
    controller.getOrders(reqNoCustomer);
    expect(service.getOrders).toHaveBeenCalledWith('t1', '00000000-0000-0000-0000-000000000000');
  });

  it('trackOrder delegates to service with tenantId and order id', () => {
    service.getOrderTracking.mockReturnValue({ steps: [] });
    const result = controller.trackOrder(req, 'order-1');
    expect(service.getOrderTracking).toHaveBeenCalledWith('t1', 'order-1');
    expect(result).toEqual({ steps: [] });
  });

  it('getTickets delegates to service with tenantId and customerId', () => {
    service.getTickets.mockReturnValue([{ id: 'tkt1' }]);
    const result = controller.getTickets(req);
    expect(service.getTickets).toHaveBeenCalledWith('t1', 'c1');
    expect(result).toEqual([{ id: 'tkt1' }]);
  });

  it('getTickets uses empty UUID when customerId missing', () => {
    const reqNoCustomer = { user: { tenantId: 't1', sub: 'u1' } };
    service.getTickets.mockReturnValue([]);
    controller.getTickets(reqNoCustomer);
    expect(service.getTickets).toHaveBeenCalledWith('t1', '00000000-0000-0000-0000-000000000000');
  });

  it('createTicket delegates to service with tenantId, customerId and body', () => {
    const body = { subject: 'Help', message: 'Broken' };
    service.createTicket.mockReturnValue({ id: 'tkt1' });
    const result = controller.createTicket(req, body);
    expect(service.createTicket).toHaveBeenCalledWith('t1', 'c1', body);
    expect(result).toEqual({ id: 'tkt1' });
  });

  it('createTicket uses empty UUID when customerId missing', () => {
    const reqNoCustomer = { user: { tenantId: 't1', sub: 'u1' } };
    service.createTicket.mockReturnValue({});
    controller.createTicket(reqNoCustomer, {});
    expect(service.createTicket).toHaveBeenCalledWith('t1', '00000000-0000-0000-0000-000000000000', {});
  });

  it('getInvoices delegates to service with tenantId and customerId', () => {
    service.getInvoices.mockReturnValue([{ id: 'inv1' }]);
    const result = controller.getInvoices(req);
    expect(service.getInvoices).toHaveBeenCalledWith('t1', 'c1');
    expect(result).toEqual([{ id: 'inv1' }]);
  });

  it('getInvoices uses empty UUID when customerId missing', () => {
    const reqNoCustomer = { user: { tenantId: 't1', sub: 'u1' } };
    service.getInvoices.mockReturnValue([]);
    controller.getInvoices(reqNoCustomer);
    expect(service.getInvoices).toHaveBeenCalledWith('t1', '00000000-0000-0000-0000-000000000000');
  });
});
