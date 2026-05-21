jest.mock('@smart-erp/database', () => ({
  approvalRequests: {
    id: 'approvalRequests.id',
    tenantId: 'approvalRequests.tenantId',
    documentId: 'approvalRequests.documentId',
    documentType: 'approvalRequests.documentType',
    status: 'approvalRequests.status',
    requestedBy: 'approvalRequests.requestedBy',
    createdAt: 'approvalRequests.createdAt',
  },
  approvalChainItems: {
    id: 'approvalChainItems.id',
    requestId: 'approvalChainItems.requestId',
    approverId: 'approvalChainItems.approverId',
    status: 'approvalChainItems.status',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';

const selectQueue: any[][] = [];
const insertQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn((callback?: unknown) => {
      if (typeof callback === 'function') {
        callback({ stepIndex: 'approvalChainItems.stepIndex' });
      }
      return chain;
    }),
    limit: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(insertQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('ApprovalsService coverage', () => {
  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  const rulesService = { findMatchingRule: jest.fn() };
  const notificationsGateway = {
    notifyNewApproval: jest.fn(),
    notifyApprovalDecision: jest.fn(),
  };
  let service: ApprovalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    insertQueue.length = 0;
    db.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    db.insert.mockImplementation(() => makeWriteChain());
    db.update.mockImplementation(() => makeWriteChain());
    rulesService.findMatchingRule.mockResolvedValue({ id: 'rule-1' });
    service = new ApprovalsService({ db } as any, rulesService as any, notificationsGateway as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('submits approvals with duplicate, auto-approved, and chained approver flows', async () => {
    selectQueue.push([{ id: 'existing' }]);
    await expect(service.submitForApproval('tenant-1', 'purchase_order', 'po-1', 10000000, 'user-1', []))
      .rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([]);
    insertQueue.push([{ id: 'approval-auto', status: 'approved' }]);
    await expect(service.submitForApproval('tenant-1', 'purchase_order', 'po-2', 1000000, 'user-1', []))
      .resolves.toEqual({ id: 'approval-auto', status: 'approved' });
    expect(notificationsGateway.notifyNewApproval).not.toHaveBeenCalled();

    selectQueue.push([]);
    insertQueue.push([{ id: 'approval-1', status: 'pending' }]);
    await expect(service.submitForApproval('tenant-1', 'purchase_order', 'po-3', 10000000, 'user-1', ['manager-1', 'cfo-1']))
      .resolves.toEqual({ id: 'approval-1', status: 'pending' });
    expect(notificationsGateway.notifyNewApproval).toHaveBeenCalledWith(
      'tenant-1',
      'approval-1',
      expect.stringContaining('purchase_order'),
    );
    expect(db.insert).toHaveBeenCalled();
  });

  it('approves steps through invalid and final/next-step branches', async () => {
    jest.spyOn(service, 'getRequest')
      .mockResolvedValueOnce({ id: 'approval-1', status: 'approved' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '2' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '0' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '0' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '0' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending' } as any);

    await expect(service.approveStep('tenant-1', 'approval-1', 'manager-1')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'step-1', approverId: 'manager-1' }]);
    await expect(service.approveStep('tenant-1', 'approval-1', 'manager-1')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'step-1', approverId: 'cfo-1' }]);
    await expect(service.approveStep('tenant-1', 'approval-1', 'manager-1')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'step-1', approverId: 'manager-1' }]);
    await expect(service.approveStep('tenant-1', 'approval-1', 'manager-1', 'OK')).resolves.toBeUndefined();
    expect(notificationsGateway.notifyApprovalDecision).toHaveBeenCalledWith(
      'tenant-1',
      'approval-1',
      'approved',
      'Request approved',
    );

    selectQueue.push([{ id: 'step-1', approverId: 'manager-1' }, { id: 'step-2', approverId: 'cfo-1' }]);
    await expect(service.approveStep('tenant-1', 'approval-1', 'manager-1')).resolves.toBeUndefined();

    selectQueue.push([{ id: 'step-default', approverId: 'manager-1' }]);
    await expect(service.approveStep('tenant-1', 'approval-1', 'manager-1')).resolves.toBeUndefined();
  });

  it('rejects approval steps and notifies requesters', async () => {
    jest.spyOn(service, 'getRequest')
      .mockResolvedValueOnce({ id: 'approval-1', status: 'approved' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '3' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '0' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending', currentStepIndex: '0' } as any)
      .mockResolvedValueOnce({ id: 'approval-1', status: 'pending' } as any);

    await expect(service.rejectStep('tenant-1', 'approval-1', 'manager-1', 'No')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'step-1', approverId: 'manager-1' }]);
    await expect(service.rejectStep('tenant-1', 'approval-1', 'manager-1', 'No')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'step-1', approverId: 'cfo-1' }]);
    await expect(service.rejectStep('tenant-1', 'approval-1', 'manager-1', 'No')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'step-1', approverId: 'manager-1' }]);
    await expect(service.rejectStep('tenant-1', 'approval-1', 'manager-1', 'Budget exceeded')).resolves.toBeUndefined();
    selectQueue.push([{ id: 'step-default', approverId: 'manager-1' }]);
    await expect(service.rejectStep('tenant-1', 'approval-1', 'manager-1', 'Default index')).resolves.toBeUndefined();
    expect(notificationsGateway.notifyApprovalDecision).toHaveBeenCalledWith(
      'tenant-1',
      'approval-1',
      'rejected',
      'Request rejected',
    );
  });

  it('lists pending approvals and loads requests with not-found handling', async () => {
    selectQueue.push([{ id: 'pending-1', documentType: 'purchase_order' }]);
    await expect(service.getPendingApprovals('tenant-1', 'manager-1')).resolves.toEqual([
      { id: 'pending-1', documentType: 'purchase_order' },
    ]);

    selectQueue.push([], [{ id: 'approval-1', status: 'pending' }]);
    await expect(service.getRequest('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getRequest('tenant-1', 'approval-1')).resolves.toEqual({
      id: 'approval-1',
      status: 'pending',
    });
  });
});
