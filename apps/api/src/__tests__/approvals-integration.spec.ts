jest.mock('drizzle-orm', () => ({
  eq: jest.fn((f: any, v: any) => ({ op: 'eq', field: f, value: v })),
  and: jest.fn((...c: any[]) => ({ op: 'and', conditions: c })),
  desc: jest.fn((f: any) => ({ op: 'desc', field: f })),
  sql: jest.fn((strings: TemplateStringsArray) => ({ op: 'sql', strings })),
}));

jest.mock('@smart-erp/database', () => ({
  approvalRequests: {},
  approvalChainItems: {},
  approvalRules: {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalRulesService } from '../approvals/approval-rules.service';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let mockDb: { select: jest.Mock; insert: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let mockRulesService: { findMatchingRule: jest.Mock };
  let mockNotifications: { notifyNewApproval: jest.Mock; notifyApprovalDecision: jest.Mock };

  const tenantId = 't1';
  const requestId = 'req-1';
  const approverId = 'approver-1';

  const mockRequest = {
    id: requestId,
    tenantId,
    documentId: 'doc-1',
    documentType: 'purchase_order',
    documentAmount: 10_000_000,
    requestedBy: 'user-1',
    status: 'pending',
    currentStepIndex: '0',
    ruleId: null,
    createdAt: new Date('2025-01-01'),
  };

  const mockChainItems = [
    { id: 'item-1', requestId, stepIndex: 0, approverId: 'approver-1', status: 'pending', comments: null, respondedAt: null },
    { id: 'item-2', requestId, stepIndex: 1, approverId: 'approver-2', status: 'pending', comments: null, respondedAt: null },
  ];

  function chainBuilder(result: any) {
    const chain: any = {};
    chain.from = jest.fn().mockReturnThis();
    chain.where = jest.fn().mockReturnThis();
    chain.innerJoin = jest.fn().mockReturnThis();
    chain.orderBy = jest.fn().mockImplementation(function (this: any) { return this; });
    chain.limit = jest.fn().mockReturnThis();
    chain.groupBy = jest.fn().mockReturnThis();
    chain.then = (resolve: (...args: any[]) => any) => resolve(result);
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
    return chain;
  }

  beforeEach(() => {
    mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
    mockRulesService = { findMatchingRule: jest.fn() };
    mockNotifications = { notifyNewApproval: jest.fn(), notifyApprovalDecision: jest.fn() };
    const mockDrizzleService = { db: mockDb };
    service = new (ApprovalsService as any)(mockDrizzleService, mockRulesService, mockNotifications);
  });

  describe('submitForApproval', () => {
    it('throws BadRequestException when document already has a pending request', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([mockRequest]));

      await expect(
        service.submitForApproval(tenantId, 'purchase_order', 'doc-1', 10_000_000, 'user-1', ['approver-1']),
      ).rejects.toThrow(BadRequestException);
    });

    it('auto-approves when amount <= 5,000,000 and no approvers', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));
      mockRulesService.findMatchingRule.mockResolvedValue(null);
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...mockRequest, status: 'approved' }]),
        }),
      });

      const result = await service.submitForApproval(tenantId, 'purchase_order', 'doc-2', 5_000_000, 'user-1', []);

      expect(result.status).toBe('approved');
      expect(mockNotifications.notifyNewApproval).not.toHaveBeenCalled();
    });

    it('auto-approves when amount < 5,000,000 and no approvers', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));
      mockRulesService.findMatchingRule.mockResolvedValue(null);
      const insertValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...mockRequest, status: 'approved' }]),
      });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: insertValues });

      const result = await service.submitForApproval(tenantId, 'purchase_order', 'doc-3', 4_999_999, 'user-1', []);

      expect(result.status).toBe('approved');
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' }),
      );
    });

    it('creates pending request with chain items and notifies for manual approval', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));
      mockRulesService.findMatchingRule.mockResolvedValue(null);
      const insertRequest = { ...mockRequest, status: 'pending' };
      (mockDb.insert as jest.Mock)
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([insertRequest]),
          }),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockResolvedValue(undefined),
        });

      const result = await service.submitForApproval(
        tenantId, 'purchase_order', 'doc-4', 10_000_000, 'user-1', ['approver-1', 'approver-2'],
      );

      expect(result.status).toBe('pending');
      expect(mockNotifications.notifyNewApproval).toHaveBeenCalledWith(
        tenantId, requestId, expect.stringContaining('10,000,000'),
      );
    });

    it('passes matching rule id when rule is found', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));
      mockRulesService.findMatchingRule.mockResolvedValue({ id: 'rule-1' });
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...mockRequest, ruleId: 'rule-1' }]),
        }),
      });

      const result = await service.submitForApproval(
        tenantId, 'purchase_order', 'doc-5', 10_000_000, 'user-1', ['approver-1'],
      );

      expect(result.ruleId).toBe('rule-1');
    });
  });

  describe('approveStep', () => {
    it('throws BadRequestException when request is not pending', async () => {
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([{ ...mockRequest, status: 'approved' }]));

      await expect(service.approveStep(tenantId, requestId, approverId))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no more approval steps', async () => {
      const overIndexRequest = { ...mockRequest, currentStepIndex: '5' };
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([overIndexRequest]))
        .mockReturnValueOnce(chainBuilder(mockChainItems));

      await expect(service.approveStep(tenantId, requestId, approverId))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when caller is not the current approver', async () => {
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([mockRequest]))
        .mockReturnValueOnce(chainBuilder(mockChainItems));

      await expect(service.approveStep(tenantId, requestId, 'wrong-approver'))
        .rejects.toThrow(BadRequestException);
    });

    it('approves final step and marks request as approved', async () => {
      const finalStepChainItems = [{ ...mockChainItems[0], stepIndex: 0 }];
      const requestAtFinalStep = { ...mockRequest, currentStepIndex: '0' };
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([requestAtFinalStep]))
        .mockReturnValueOnce(chainBuilder(finalStepChainItems));

      const setMock = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
      (mockDb.update as jest.Mock)
        .mockReturnValueOnce({ set: setMock })
        .mockReturnValueOnce({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) });

      await service.approveStep(tenantId, requestId, approverId);

      expect(mockNotifications.notifyApprovalDecision).toHaveBeenCalledWith(
        tenantId, requestId, 'approved', 'Request approved',
      );
    });

    it('approves step and moves to next step when more remain', async () => {
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([mockRequest]))
        .mockReturnValueOnce(chainBuilder(mockChainItems));

      const capturedWhere: any[] = [];
      const whereMock = jest.fn().mockImplementation((condition) => {
        capturedWhere.push(condition);
        return Promise.resolve(undefined);
      });

      (mockDb.update as jest.Mock)
        .mockReturnValueOnce({ set: jest.fn().mockReturnValue({ where: whereMock }) })
        .mockReturnValueOnce({ set: jest.fn().mockReturnValue({ where: whereMock }) })
        .mockReturnValueOnce({ set: jest.fn().mockReturnValue({ where: whereMock }) });

      await service.approveStep(tenantId, requestId, approverId);

      expect(mockNotifications.notifyApprovalDecision).not.toHaveBeenCalled();
      // The last approvalRequests update must filter by tenantId + requestId
      expect(capturedWhere.length).toBeGreaterThanOrEqual(1);
      const lastWhere = capturedWhere[capturedWhere.length - 1];
      expect(lastWhere).toEqual(
        expect.objectContaining({
          op: 'and',
          conditions: expect.arrayContaining([
            expect.objectContaining({ op: 'eq', value: tenantId }),
            expect.objectContaining({ op: 'eq', value: requestId }),
          ]),
        }),
      );
    });
  });

  describe('rejectStep', () => {
    it('throws BadRequestException when request is not pending', async () => {
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([{ ...mockRequest, status: 'approved' }]));

      await expect(service.rejectStep(tenantId, requestId, approverId, 'Not needed'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when caller is not the current approver', async () => {
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([mockRequest]))
        .mockReturnValueOnce(chainBuilder(mockChainItems));

      await expect(service.rejectStep(tenantId, requestId, 'wrong-approver', 'No'))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects step and marks request as rejected', async () => {
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chainBuilder([mockRequest]))
        .mockReturnValueOnce(chainBuilder(mockChainItems));

      const capturedWhere: any[] = [];
      const whereMock = jest.fn().mockImplementation((condition) => {
        capturedWhere.push(condition);
        return Promise.resolve(undefined);
      });

      (mockDb.update as jest.Mock)
        .mockReturnValueOnce({ set: jest.fn().mockReturnValue({ where: whereMock }) })
        .mockReturnValueOnce({ set: jest.fn().mockReturnValue({ where: whereMock }) });

      await service.rejectStep(tenantId, requestId, approverId, 'Not approved');

      expect(mockNotifications.notifyApprovalDecision).toHaveBeenCalledWith(
        tenantId, requestId, 'rejected', 'Request rejected',
      );
      // The approvalRequests update must filter by tenantId + requestId
      expect(capturedWhere.length).toBeGreaterThanOrEqual(1);
      const lastWhere = capturedWhere[capturedWhere.length - 1];
      expect(lastWhere).toEqual(
        expect.objectContaining({
          op: 'and',
          conditions: expect.arrayContaining([
            expect.objectContaining({ op: 'eq', value: tenantId }),
            expect.objectContaining({ op: 'eq', value: requestId }),
          ]),
        }),
      );
    });
  });

  describe('getPendingApprovals', () => {
    it('returns pending approvals for an approver', async () => {
      const pending = [
        { id: requestId, documentType: 'purchase_order', documentId: 'doc-1', status: 'pending', requestedBy: 'user-1', createdAt: new Date() },
      ];
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder(pending));

      const result = await service.getPendingApprovals(tenantId, approverId);

      expect(result).toEqual(pending);
    });

    it('returns empty array when no pending approvals', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));

      const result = await service.getPendingApprovals(tenantId, approverId);

      expect(result).toEqual([]);
    });
  });

  describe('getRequest', () => {
    it('returns request when found', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([mockRequest]));

      const result = await service.getRequest(tenantId, requestId);

      expect(result).toEqual(mockRequest);
    });

    it('throws NotFoundException when request not found', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));

      await expect(service.getRequest(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('ApprovalRulesService', () => {
  let service: ApprovalRulesService;
  let mockDb: { select: jest.Mock; insert: jest.Mock; update: jest.Mock; delete: jest.Mock };

  const tenantId = 't1';
  const ruleId = 'rule-1';

  const mockRule = {
    id: ruleId,
    tenantId,
    name: 'High Value PO',
    description: 'Approval for high value POs',
    documentType: 'purchase_order',
    minAmount: '10000000',
    maxAmount: null,
    priority: '1',
    isActive: 'true',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  function chainBuilder(result: any) {
    const chain: any = {};
    chain.from = jest.fn().mockReturnThis();
    chain.where = jest.fn().mockReturnThis();
    chain.orderBy = jest.fn().mockImplementation(function (this: any) { return this; });
    chain.limit = jest.fn().mockReturnThis();
    chain.then = (resolve: (...args: any[]) => any) => resolve(result);
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
  }

  beforeEach(() => {
    mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const mockDrizzleService = { db: mockDb };
    service = new (ApprovalRulesService as any)(mockDrizzleService);
  });

  describe('create', () => {
    it('creates and returns a rule', async () => {
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockRule]),
        }),
      });

      const result = await service.create(tenantId, {
        name: 'High Value PO',
        documentType: 'purchase_order',
        minAmount: 10_000_000,
      });

      expect(result).toEqual(mockRule);
    });
  });

  describe('findAll', () => {
    it('returns rules list ordered by priority desc', async () => {
      const rules = [mockRule, { ...mockRule, id: 'rule-2', priority: '2' }];
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder(rules));

      const result = await service.findAll(tenantId);

      expect(result).toEqual(rules);
    });

    it('returns empty array when no rules', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));

      const result = await service.findAll(tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns a rule when found', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([mockRule]));

      const result = await service.findOne(tenantId, ruleId);

      expect(result).toEqual(mockRule);
    });

    it('throws NotFoundException when rule not found', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));

      await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns the rule', async () => {
      const updated = { ...mockRule, name: 'Updated Name' };
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      const result = await service.update(tenantId, ruleId, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('throws NotFoundException when rule to update is not found', async () => {
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.update(tenantId, 'nonexistent', { name: 'N/A' })).rejects.toThrow(NotFoundException);
    });

    it('converts numeric fields to strings', async () => {
      let capturedSet: any;
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn((s: any) => {
          capturedSet = s;
          return { where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([mockRule]) }) };
        }),
      });

      await service.update(tenantId, ruleId, { minAmount: 5_000_000, priority: 2, isActive: false });

      expect(capturedSet.minAmount).toBe('5000000');
      expect(capturedSet.priority).toBe('2');
      expect(capturedSet.isActive).toBe('false');
    });
  });

  describe('remove', () => {
    it('deletes the rule', async () => {
      const whereMock = jest.fn().mockResolvedValue(undefined);
      (mockDb.delete as jest.Mock).mockReturnValue({ where: whereMock });

      await service.remove(tenantId, ruleId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe('findMatchingRule', () => {
    it('returns matching rule when found', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([mockRule]));

      const result = await service.findMatchingRule(tenantId, 'purchase_order', 15_000_000);

      expect(result).toEqual(mockRule);
    });

    it('returns null when no rule matches', async () => {
      (mockDb.select as jest.Mock).mockReturnValue(chainBuilder([]));

      const result = await service.findMatchingRule(tenantId, 'invoice', 1_000);

      expect(result).toBeNull();
    });
  });
});
