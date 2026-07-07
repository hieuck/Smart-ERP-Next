jest.mock('@smart-erp/database', () => ({
  leads: { tenantId: 'leads.tenantId', id: 'leads.id', createdAt: 'leads.createdAt' },
  crmPipelines: { tenantId: 'crmPipelines.tenantId' },
  crmStages: { pipelineId: 'crmStages.pipelineId', sequence: 'crmStages.sequence' },
  crmDeals: { tenantId: 'crmDeals.tenantId', stageId: 'crmDeals.stageId', createdAt: 'crmDeals.createdAt', id: 'crmDeals.id' },
  orders: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  asc: jest.fn((field) => ({ op: 'asc', field })),
}));

import { NotFoundException } from '@nestjs/common';
import { CrmService } from './crm.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
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

describe('CrmService coverage', () => {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const drizzle = {
    db: {
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      insert: jest.fn(() => makeWriteChain(returningQueue)),
      update: jest.fn(() => makeWriteChain(returningQueue)),
    },
  };
  let service: CrmService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    service = new CrmService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads pipelines with ordered stages and deals by stage', async () => {
    selectQueue.push([{ id: 'pipe-1', name: 'Sales' }], [{ id: 'stage-1' }], [{ id: 'deal-1' }]);

    await expect(service.getPipelines('tenant-1')).resolves.toEqual([
      { id: 'pipe-1', name: 'Sales', stages: [{ id: 'stage-1' }] },
    ]);
    await expect(service.getDealsByStage('tenant-1', 'stage-1')).resolves.toEqual([{ id: 'deal-1' }]);
  });

  it('creates and moves deals while alerting on high value deals', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    returningQueue.push(
      [{ id: 'deal-1', amount: '0' }],
      [{ id: 'deal-default', amount: '0' }],
      [{ id: 'deal-1', amount: '2000000000', stageId: 'stage-2' }],
    );

    await expect(service.createDeal('tenant-1', { title: 'Big deal', amount: 100 })).resolves.toEqual({ id: 'deal-1', amount: '0' });
    await expect(service.createDeal('tenant-1', { title: 'No amount' })).resolves.toEqual({ id: 'deal-default', amount: '0' });
    await expect(service.updateDealStage('tenant-1', 'deal-1', 'stage-2')).resolves.toEqual({ id: 'deal-1', amount: '2000000000', stageId: 'stage-2' });
    expect(logSpy).toHaveBeenCalledWith('High value deal alert!');
  });

  it('handles leads and converts won deals into sales orders', async () => {
    selectQueue.push([{ id: 'lead-1' }], [{ id: 'deal-1', leadId: 'lead-1', amount: '1200' }]);
    returningQueue.push(
      [{ id: 'lead-2' }],
      [],
      [{ id: 'lead-1', status: 'qualified' }],
      [{ id: 'order-1' }],
    );

    await expect(service.getLeads('tenant-1')).resolves.toEqual([{ id: 'lead-1' }]);
    await expect(service.createLead('tenant-1', { name: 'Lead' })).resolves.toEqual({ id: 'lead-2' });
    await expect(service.updateLeadStatus('tenant-1', 'missing', 'lost')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateLeadStatus('tenant-1', 'lead-1', 'qualified')).resolves.toEqual({ id: 'lead-1', status: 'qualified' });
    await expect(service.convertToOrder('tenant-1', 'deal-1')).resolves.toEqual({ id: 'order-1' });

    expect(drizzle.db.update).toHaveBeenCalledTimes(3);
  });

  it('rejects missing deals during order conversion', async () => {
    selectQueue.push([]);

    await expect(service.convertToOrder('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateLeadStatus filters by tenantId', async () => {
    returningQueue.push([{ id: 'lead-1', status: 'qualified' }]);

    await service.updateLeadStatus('tenant-1', 'lead-1', 'qualified');

    const updateCall = drizzle.db.update.mock.results[0].value;
    expect(updateCall.where).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'and',
        conditions: expect.arrayContaining([
          expect.objectContaining({ op: 'eq', field: 'leads.id', value: 'lead-1' }),
          expect.objectContaining({ op: 'eq', field: 'leads.tenantId', value: 'tenant-1' }),
        ]),
      }),
    );
  });
});
