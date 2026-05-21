import { ApprovalsController } from '../approvals/approvals.controller';
import { CustomerPortalController } from '../customers/customer-portal.controller';
import { EInvoiceController } from '../e-invoice/e-invoice.controller';
import { AttendanceController } from '../hr/controllers/attendance.controller';
import { HelpdeskController } from '../helpdesk/controllers/helpdesk.controller';
import { InventoryController } from '../inventory/inventory.controller';

describe('operations controller delegation coverage', () => {
  const req = {
    user: {
      customerId: 'customer-1',
      sub: 'user-1',
      tenantId: 'tenant-1',
    },
  };

  it('delegates attendance workflows with parsed dates and defaults', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    const service = {
      approveLeave: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      createLeaveRequest: jest.fn(),
      createShift: jest.fn(),
      getMonthlySummary: jest.fn(),
      getTodayStatus: jest.fn(),
      listLeaveRequests: jest.fn(),
      listRecords: jest.fn(),
      listShifts: jest.fn(),
      rejectLeave: jest.fn(),
    };
    const controller = new AttendanceController(service as any);

    controller.listShifts(req);
    controller.createShift(req, { code: 'DAY', endTime: '17:00', name: 'Day', startTime: '08:00', workHours: 8 });
    controller.checkIn(req, { method: 'app' });
    controller.checkOut(req, { method: 'app' });
    controller.getToday(req);
    controller.getEmployeeToday(req, 'employee-1');
    controller.listRecords(req, 'employee-1', '2026-05-01', '2026-05-21', 'present', '3');
    controller.listRecords(req);
    controller.getMonthlySummary(req, '2026', '5', 'employee-1');
    controller.getMonthlySummary(req);
    controller.createLeave(req, { endDate: '2026-05-22', leaveType: 'annual', startDate: '2026-05-21', totalDays: 2 });
    controller.listLeave(req, 'pending');
    controller.approveLeave(req, 'leave-1');
    controller.rejectLeave(req, 'leave-1', { reason: 'busy' });

    expect(service.listShifts).toHaveBeenCalledWith('tenant-1');
    expect(service.checkIn).toHaveBeenCalledWith('tenant-1', 'user-1', { method: 'app' });
    expect(service.getTodayStatus).toHaveBeenNthCalledWith(1, 'tenant-1', 'user-1');
    expect(service.getTodayStatus).toHaveBeenNthCalledWith(2, 'tenant-1', 'employee-1');
    expect(service.listRecords).toHaveBeenNthCalledWith(1, 'tenant-1', {
      employeeId: 'employee-1',
      endDate: '2026-05-21',
      page: 3,
      startDate: '2026-05-01',
      status: 'present',
    });
    expect(service.listRecords).toHaveBeenNthCalledWith(2, 'tenant-1', {
      employeeId: undefined,
      endDate: undefined,
      page: 1,
      startDate: undefined,
      status: undefined,
    });
    expect(service.getMonthlySummary).toHaveBeenNthCalledWith(1, 'tenant-1', 2026, 5, 'employee-1');
    expect(service.getMonthlySummary).toHaveBeenNthCalledWith(2, 'tenant-1', 2026, 5, undefined);
    expect(service.rejectLeave).toHaveBeenCalledWith('tenant-1', 'leave-1', 'user-1', 'busy');
    jest.useRealTimers();
  });

  it('delegates inventory workflows and parses pagination', () => {
    const service = {
      adjust: jest.fn(),
      consumeReservation: jest.fn(),
      createReservation: jest.fn(),
      getAvailableStock: jest.fn(),
      getLowStock: jest.fn(),
      getReorderSuggestions: jest.fn(),
      getSummary: jest.fn(),
      getTransactions: jest.fn(),
      pushStockToMarketplace: jest.fn(),
      releaseReservation: jest.fn(),
      syncAllStoresStock: jest.fn(),
    };
    const controller = new InventoryController(service as any);

    controller.getTransactions(req, '2', '50', 'product-1', 'IN');
    controller.getTransactions(req);
    controller.adjust(req, { notes: 'count', productId: 'product-1', quantity: 2, reference: 'ADJ-1', type: 'ADJUSTMENT' });
    controller.getLowStock(req);
    controller.getSummary(req);
    controller.getReorderSuggestions(req);
    controller.getAvailableStock(req, 'product-1', 'store-1');
    controller.createReservation(req, { externalOrderId: 'ext-1', productId: 'product-1', quantity: 1, storeId: 'store-1' });
    controller.releaseReservation(req, { externalOrderId: 'ext-1' });
    controller.consumeReservation(req, { externalOrderId: 'ext-1' });
    controller.pushStockToMarketplace(req, 'store-1');
    controller.syncAllStoresStock(req);

    expect(service.getTransactions).toHaveBeenNthCalledWith(1, 'tenant-1', {
      limit: 50,
      page: 2,
      productId: 'product-1',
      type: 'IN',
    });
    expect(service.getTransactions).toHaveBeenNthCalledWith(2, 'tenant-1', {
      limit: undefined,
      page: undefined,
      productId: undefined,
      type: undefined,
    });
    expect(service.adjust).toHaveBeenCalledWith('tenant-1', 'user-1', 'product-1', 2, 'ADJUSTMENT', 'count', 'ADJ-1');
    expect(service.createReservation).toHaveBeenCalledWith('tenant-1', 'store-1', 'ext-1', 'product-1', 1);
  });

  it('delegates approval rules and approval request actions', () => {
    const approvalsService = {
      approveStep: jest.fn(),
      getPendingApprovals: jest.fn(),
      getRequest: jest.fn(),
      rejectStep: jest.fn(),
      submitForApproval: jest.fn(),
    };
    const rulesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const controller = new ApprovalsController(approvalsService as any, rulesService as any);

    controller.createRule('tenant-1', { name: 'PO approval' } as any);
    controller.findAllRules('tenant-1');
    controller.findOneRule('tenant-1', 'rule-1');
    controller.updateRule('tenant-1', 'rule-1', { isActive: false } as any);
    controller.removeRule('tenant-1', 'rule-1');
    controller.submitForApproval('tenant-1', 'user-1', {
      approverIds: ['manager-1'],
      documentAmount: 1000,
      documentId: 'po-1',
      documentType: 'purchase_order',
    });
    controller.approveStep('tenant-1', 'manager-1', 'request-1', { comments: 'ok' });
    controller.rejectStep('tenant-1', 'manager-1', 'request-1', { comments: 'no' });
    controller.getRequest('tenant-1', 'request-1');
    controller.getPending('tenant-1', 'manager-1');

    expect(rulesService.create).toHaveBeenCalledWith('tenant-1', { name: 'PO approval' });
    expect(approvalsService.submitForApproval).toHaveBeenCalledWith(
      'tenant-1',
      'purchase_order',
      'po-1',
      1000,
      'user-1',
      ['manager-1'],
    );
    expect(approvalsService.approveStep).toHaveBeenCalledWith('tenant-1', 'request-1', 'manager-1', 'ok');
    expect(approvalsService.rejectStep).toHaveBeenCalledWith('tenant-1', 'request-1', 'manager-1', 'no');
  });

  it('delegates customer portal and helpdesk actions', () => {
    const portalService = {
      createTicket: jest.fn(),
      getInvoices: jest.fn(),
      getOrderTracking: jest.fn(),
      getOrders: jest.fn(),
      getTickets: jest.fn(),
    };
    const portal = new CustomerPortalController(portalService as any);
    portal.getOrders(req);
    portal.trackOrder(req, 'order-1');
    portal.getTickets({ user: { tenantId: 'tenant-1' } });
    portal.createTicket(req, { title: 'Need help' });
    portal.getInvoices(req);
    const anonymousPortalReq = { user: { tenantId: 'tenant-1' } };
    portal.getOrders(anonymousPortalReq);
    portal.createTicket(anonymousPortalReq, { title: 'Anonymous help' });
    portal.getInvoices(anonymousPortalReq);

    expect(portalService.getOrders).toHaveBeenCalledWith('tenant-1', 'customer-1');
    expect(portalService.getOrders).toHaveBeenLastCalledWith('tenant-1', 'dummy-customer-id');
    expect(portalService.getTickets).toHaveBeenCalledWith('tenant-1', 'dummy-customer-id');
    expect(portalService.createTicket).toHaveBeenCalledWith('tenant-1', 'customer-1', { title: 'Need help' });
    expect(portalService.createTicket).toHaveBeenLastCalledWith('tenant-1', 'dummy-customer-id', { title: 'Anonymous help' });
    expect(portalService.getInvoices).toHaveBeenLastCalledWith('tenant-1', 'dummy-customer-id');

    const helpdeskService = {
      addComment: jest.fn(),
      assignTicket: jest.fn(),
      createTicket: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getComments: jest.fn(),
      getHistory: jest.fn(),
      getStats: jest.fn(),
      updateStatus: jest.fn(),
    };
    const helpdesk = new HelpdeskController(helpdeskService as any);
    helpdesk.createTicket(req, { title: 'Printer' });
    helpdesk.findAll(req, '2', '25', 'open', 'high', '7', '9');
    helpdesk.findAll(req);
    helpdesk.findOne(req, 1);
    helpdesk.updateStatus(req, 1, 'closed');
    helpdesk.assign(req, 1, 7);
    helpdesk.addComment(req, 1, 'Done', true);
    helpdesk.getComments(req, 1);
    helpdesk.getHistory(req, 1);
    helpdesk.getStats(req);

    expect(helpdeskService.findAll).toHaveBeenCalledWith('tenant-1', {
      assigneeId: 7,
      customerId: 9,
      limit: 25,
      page: 2,
      priority: 'high',
      status: 'open',
    });
    expect(helpdeskService.findAll).toHaveBeenLastCalledWith('tenant-1', {
      assigneeId: undefined,
      customerId: undefined,
      limit: undefined,
      page: undefined,
      priority: undefined,
      status: undefined,
    });
    expect(helpdeskService.addComment).toHaveBeenCalledWith('tenant-1', 'user-1', 1, 'Done', true);
  });

  it('delegates e-invoice lifecycle actions and date defaults', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    const service = {
      cancel: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      getStats: jest.fn(),
      issue: jest.fn(),
      list: jest.fn(),
      replace: jest.fn(),
    };
    const controller = new EInvoiceController(service as any);

    controller.create(req, { orderId: 'order-1' } as any);
    controller.issue(req, 'invoice-1');
    controller.cancel(req, 'invoice-1', { reason: 'wrong data' });
    controller.replace(req, 'invoice-1', { orderId: 'order-2' } as any);
    controller.list(req, 'issued', '3');
    controller.list(req);
    controller.findById(req, 'invoice-1');
    controller.getStats(req, '2026', '5');
    controller.getStats(req);

    expect(service.create).toHaveBeenCalledWith('tenant-1', 'user-1', { orderId: 'order-1' });
    expect(service.cancel).toHaveBeenCalledWith('tenant-1', 'invoice-1', 'wrong data');
    expect(service.replace).toHaveBeenCalledWith('tenant-1', 'invoice-1', 'user-1', { orderId: 'order-2' });
    expect(service.list).toHaveBeenNthCalledWith(1, 'tenant-1', { page: 3, status: 'issued' });
    expect(service.list).toHaveBeenNthCalledWith(2, 'tenant-1', { page: 1, status: undefined });
    expect(service.getStats).toHaveBeenNthCalledWith(1, 'tenant-1', 2026, 5);
    expect(service.getStats).toHaveBeenNthCalledWith(2, 'tenant-1', 2026, 5);
    jest.useRealTimers();
  });
});
