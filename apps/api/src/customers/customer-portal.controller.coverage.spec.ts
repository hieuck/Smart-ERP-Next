import { ForbiddenException, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
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

  it('getOrders rejects when customerId is missing', () => {
    expect(() => controller.getOrders({ user: { tenantId: 't1', sub: 'u1' } })).toThrow(ForbiddenException);
  });

  it('trackOrder delegates to service with tenantId and order id', () => {
    service.getOrderTracking.mockReturnValue({ steps: [] });
    const result = controller.trackOrder(req, '00000000-0000-0000-0000-000000000001');
    expect(service.getOrderTracking).toHaveBeenCalledWith('t1', '00000000-0000-0000-0000-000000000001');
    expect(result).toEqual({ steps: [] });
  });

  it('trackOrder rejects non-UUID order ids via ParseUUIDPipe', async () => {
    const pipe = new ParseUUIDPipe({ version: '4' });
    let thrown: Error | null = null;
    try {
      await pipe.transform('not-a-uuid', { type: 'param', metatype: String, data: 'id' } as any);
    } catch (err) {
      thrown = err as Error;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    expect(thrown?.message).toContain('Validation failed');
  });

  it('getTickets delegates to service with tenantId and customerId', () => {
    service.getTickets.mockReturnValue([{ id: 'tkt1' }]);
    const result = controller.getTickets(req);
    expect(service.getTickets).toHaveBeenCalledWith('t1', 'c1');
    expect(result).toEqual([{ id: 'tkt1' }]);
  });

  it('getTickets rejects when customerId is missing', () => {
    expect(() => controller.getTickets({ user: { tenantId: 't1', sub: 'u1' } })).toThrow(ForbiddenException);
  });

  it('createTicket delegates to service with tenantId, customerId and body', () => {
    const body = { subject: 'Help', message: 'Broken' };
    service.createTicket.mockReturnValue({ id: 'tkt1' });
    const result = controller.createTicket(req, body);
    expect(service.createTicket).toHaveBeenCalledWith('t1', 'c1', body);
    expect(result).toEqual({ id: 'tkt1' });
  });

  it('createTicket rejects when customerId is missing', () => {
    expect(() => controller.createTicket({ user: { tenantId: 't1', sub: 'u1' } }, { subject: 'Help', message: 'Broken' }))
      .toThrow(ForbiddenException);
  });

  it('getInvoices delegates to service with tenantId and customerId', () => {
    service.getInvoices.mockReturnValue([{ id: 'inv1' }]);
    const result = controller.getInvoices(req);
    expect(service.getInvoices).toHaveBeenCalledWith('t1', 'c1');
    expect(result).toEqual([{ id: 'inv1' }]);
  });

  it('getInvoices rejects when customerId is missing', () => {
    expect(() => controller.getInvoices({ user: { tenantId: 't1', sub: 'u1' } })).toThrow(ForbiddenException);
  });
});
