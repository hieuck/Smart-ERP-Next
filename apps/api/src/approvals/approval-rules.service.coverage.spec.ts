jest.mock('@smart-erp/database', () => ({
  approvalRules: {
    tenantId: 'approvalRules.tenantId',
    id: 'approvalRules.id',
    priority: 'approvalRules.priority',
    documentType: 'approvalRules.documentType',
    isActive: 'approvalRules.isActive',
    minAmount: 'approvalRules.minAmount',
    maxAmount: 'approvalRules.maxAmount',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { ApprovalRulesService } from './approval-rules.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('ApprovalRulesService coverage', () => {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const drizzle = {
    db: {
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      insert: jest.fn(() => makeWriteChain(returningQueue)),
      update: jest.fn(() => makeWriteChain(returningQueue)),
      delete: jest.fn(() => makeWriteChain(returningQueue)),
    },
  };
  let service: ApprovalRulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    service = new ApprovalRulesService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates and lists approval rules', async () => {
    returningQueue.push([{ id: 'rule-1', priority: '2' }]);
    await expect(service.create('tenant-1', {
      name: 'High PO',
      documentType: 'purchase_order',
      minAmount: 100,
      maxAmount: 1000,
      priority: 2,
    } as any)).resolves.toEqual({ id: 'rule-1', priority: '2' });
    expect(drizzle.db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      minAmount: '100',
      maxAmount: '1000',
      priority: '2',
      isActive: 'true',
    }));

    returningQueue.push([{ id: 'rule-default', priority: '1' }]);
    await expect(service.create('tenant-1', {
      name: 'Default priority',
      documentType: 'sales_order',
    } as any)).resolves.toEqual({ id: 'rule-default', priority: '1' });
    expect(drizzle.db.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      priority: '1',
      isActive: 'true',
    }));

    selectQueue.push([{ id: 'rule-1' }]);
    await expect(service.findAll('tenant-1')).resolves.toEqual([{ id: 'rule-1' }]);
  });

  it('finds, updates, deletes, and matches approval rules', async () => {
    selectQueue.push([], [{ id: 'rule-1' }], [{ id: 'match-1' }], []);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'rule-1')).resolves.toEqual({ id: 'rule-1' });

    returningQueue.push([], [{ id: 'rule-1', priority: '3' }]);
    await expect(service.update('tenant-1', 'missing', { priority: 1 } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-1', 'rule-1', { minAmount: 10, maxAmount: 20, priority: 3, isActive: false } as any)).resolves.toEqual({ id: 'rule-1', priority: '3' });
    await expect(service.remove('tenant-1', 'rule-1')).resolves.toBeUndefined();
    await expect(service.findMatchingRule('tenant-1', 'purchase_order', 100)).resolves.toEqual({ id: 'match-1' });
    await expect(service.findMatchingRule('tenant-1', 'purchase_order', undefined as any)).resolves.toBeNull();
  });
});
