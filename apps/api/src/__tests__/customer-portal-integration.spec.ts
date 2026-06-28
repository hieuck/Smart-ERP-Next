import { CustomerPortalController } from '../customers/customer-portal.controller';

describe('CustomerPortalController', () => {
  const EMPTY_CUSTOMER_ID = '00000000-0000-0000-0000-000000000000';
  const mockService = {
    getOrders: jest.fn(),
    getOrderTracking: jest.fn(),
    getTickets: jest.fn(),
    createTicket: jest.fn(),
    getInvoices: jest.fn(),
  };
  let controller: CustomerPortalController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new (CustomerPortalController as any)(mockService);
  });

  it('getOrders delegates to service with tenantId and customerId', () => {
    const req = { user: { tenantId: 't1', customerId: 'c1' } };
    controller.getOrders(req);
    expect(mockService.getOrders).toHaveBeenCalledWith('t1', 'c1');
  });

  it('getOrders falls back to empty customerId when missing', () => {
    const req = { user: { tenantId: 't1' } };
    controller.getOrders(req);
    expect(mockService.getOrders).toHaveBeenCalledWith('t1', EMPTY_CUSTOMER_ID);
  });

  it('trackOrder delegates to service with tenantId and orderId', () => {
    const req = { user: { tenantId: 't1' } };
    controller.trackOrder(req, 'order-1');
    expect(mockService.getOrderTracking).toHaveBeenCalledWith('t1', 'order-1');
  });

  it('getTickets delegates to service with tenantId and customerId', () => {
    const req = { user: { tenantId: 't1', customerId: 'c1' } };
    controller.getTickets(req);
    expect(mockService.getTickets).toHaveBeenCalledWith('t1', 'c1');
  });

  it('getTickets falls back to empty customerId when missing', () => {
    const req = { user: { tenantId: 't1' } };
    controller.getTickets(req);
    expect(mockService.getTickets).toHaveBeenCalledWith('t1', EMPTY_CUSTOMER_ID);
  });

  it('createTicket delegates to service with tenantId, customerId and body', () => {
    const req = { user: { tenantId: 't1', customerId: 'c1' } };
    const body = { subject: 'Issue', message: 'Help!' };
    controller.createTicket(req, body);
    expect(mockService.createTicket).toHaveBeenCalledWith('t1', 'c1', body);
  });

  it('createTicket falls back to empty customerId when missing', () => {
    const req = { user: { tenantId: 't1' } };
    const body = { subject: 'Issue' };
    controller.createTicket(req, body);
    expect(mockService.createTicket).toHaveBeenCalledWith('t1', EMPTY_CUSTOMER_ID, body);
  });

  it('getInvoices delegates to service with tenantId and customerId', () => {
    const req = { user: { tenantId: 't1', customerId: 'c1' } };
    controller.getInvoices(req);
    expect(mockService.getInvoices).toHaveBeenCalledWith('t1', 'c1');
  });

  it('getInvoices falls back to empty customerId when missing', () => {
    const req = { user: { tenantId: 't1' } };
    controller.getInvoices(req);
    expect(mockService.getInvoices).toHaveBeenCalledWith('t1', EMPTY_CUSTOMER_ID);
  });
});
