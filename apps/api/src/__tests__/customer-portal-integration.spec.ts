import { CustomerPortalController } from '../customers/customer-portal.controller';
import { ForbiddenException } from '@nestjs/common';

describe('CustomerPortalController', () => {
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

  it('getOrders rejects when customerId is missing', () => {
    const req = { user: { tenantId: 't1' } };
    expect(() => controller.getOrders(req)).toThrow(ForbiddenException);
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

  it('getTickets rejects when customerId is missing', () => {
    const req = { user: { tenantId: 't1' } };
    expect(() => controller.getTickets(req)).toThrow(ForbiddenException);
  });

  it('createTicket delegates to service with tenantId, customerId and body', () => {
    const req = { user: { tenantId: 't1', customerId: 'c1' } };
    const body = { subject: 'Issue', message: 'Help!' };
    controller.createTicket(req, body);
    expect(mockService.createTicket).toHaveBeenCalledWith('t1', 'c1', body);
  });

  it('createTicket rejects when customerId is missing', () => {
    const req = { user: { tenantId: 't1' } };
    const body = { subject: 'Issue', message: 'Help!' };
    expect(() => controller.createTicket(req, body)).toThrow(ForbiddenException);
  });

  it('getInvoices delegates to service with tenantId and customerId', () => {
    const req = { user: { tenantId: 't1', customerId: 'c1' } };
    controller.getInvoices(req);
    expect(mockService.getInvoices).toHaveBeenCalledWith('t1', 'c1');
  });

  it('getInvoices rejects when customerId is missing', () => {
    const req = { user: { tenantId: 't1' } };
    expect(() => controller.getInvoices(req)).toThrow(ForbiddenException);
  });
});
