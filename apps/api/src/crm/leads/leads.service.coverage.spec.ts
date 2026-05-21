const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  crmLeads: {
    id: 'crmLeads.id',
    tenantId: 'crmLeads.tenantId',
    firstName: 'crmLeads.firstName',
    lastName: 'crmLeads.lastName',
    email: 'crmLeads.email',
    company: 'crmLeads.company',
    status: 'crmLeads.status',
    source: 'crmLeads.source',
    assignedToId: 'crmLeads.assignedToId',
    createdAt: 'crmLeads.createdAt',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    groupBy: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('LeadsService coverage', () => {
  const activityService = { log: jest.fn() };
  const notificationsGateway = { broadcastToTenant: jest.fn() };
  let service: LeadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    activityService.log.mockResolvedValue(undefined);
    service = new LeadsService(activityService as any, notificationsGateway as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const leadDto = {
    firstName: 'An',
    lastName: 'Nguyen',
    email: 'an@example.com',
    phone: '0900000000',
    company: 'ABC',
    source: 'website',
    status: 'new',
    leadScore: 75,
    industry: 'retail',
    description: 'Interested',
    assignedToId: 'sales-1',
  };

  it('creates leads with defaults, activity logs, and tenant notifications', async () => {
    returningQueue.push([{ id: 'lead-1', firstName: 'An', lastName: 'Nguyen' }]);

    await expect(service.create('tenant-1', 'user-1', leadDto as any)).resolves.toEqual({
      id: 'lead-1',
      firstName: 'An',
      lastName: 'Nguyen',
    });
    expect(activityService.log).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'created',
      'lead',
      'lead-1',
      { name: 'An Nguyen', company: 'ABC' },
    );
    expect(notificationsGateway.broadcastToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'lead.created',
      expect.objectContaining({ leadId: 'lead-1', name: 'An Nguyen' }),
    );

    returningQueue.push([{ id: 'lead-2', firstName: 'Binh', lastName: 'Tran' }]);
    await expect(service.create('tenant-1', 'user-1', {
      firstName: 'Binh',
      lastName: 'Tran',
    } as any)).resolves.toEqual({ id: 'lead-2', firstName: 'Binh', lastName: 'Tran' });
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      leadScore: '0',
      source: 'other',
      status: 'new',
    }));
  });

  it('paginates filtered lead lists and handles findOne misses', async () => {
    selectQueue.push([{ count: 205 }], [{ id: 'lead-1' }]);
    await expect(service.findAll('tenant-1', {
      page: 3,
      limit: 500,
      search: 'ABC',
      status: 'new',
      source: 'website',
      assignedToId: 'sales-1',
    })).resolves.toEqual({
      items: [{ id: 'lead-1' }],
      total: 205,
      page: 3,
      limit: 100,
      totalPages: 3,
    });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAll('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    selectQueue.push([], [{ id: 'lead-1', firstName: 'An' }]);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'lead-1')).resolves.toEqual({ id: 'lead-1', firstName: 'An' });
  });

  it('updates and removes leads with activity logs', async () => {
    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce({ id: 'lead-1', firstName: 'An', lastName: 'Nguyen' } as any)
      .mockResolvedValueOnce({ id: 'lead-1', firstName: 'An', lastName: 'Nguyen' } as any);
    returningQueue.push([{ id: 'lead-1', leadScore: '90' }]);

    await expect(service.update('tenant-1', 'lead-1', {
      leadScore: 90,
      status: 'qualified',
    } as any)).resolves.toEqual({ id: 'lead-1', leadScore: '90' });
    expect(activityService.log).toHaveBeenCalledWith(
      'tenant-1',
      '',
      'updated',
      'lead',
      'lead-1',
      { changes: ['leadScore', 'status'] },
    );

    await expect(service.remove('tenant-1', 'lead-1')).resolves.toEqual({ success: true });
    expect(activityService.log).toHaveBeenCalledWith(
      'tenant-1',
      '',
      'deleted',
      'lead',
      'lead-1',
      { name: 'An Nguyen' },
    );
  });

  it('computes lead stats and converts leads once', async () => {
    selectQueue.push(
      [{ status: 'won', count: 2 }, { status: 'new', count: 3 }],
      [{ status: 'new', count: 0 }],
    );

    await expect(service.getStats('tenant-1')).resolves.toEqual({
      total: 5,
      byStatus: [{ status: 'won', count: 2 }, { status: 'new', count: 3 }],
      winRate: 40,
    });
    await expect(service.getStats('tenant-1')).resolves.toEqual({
      total: 0,
      byStatus: [{ status: 'new', count: 0 }],
      winRate: 0,
    });

    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce({ id: 'lead-1', status: 'won', firstName: 'An', lastName: 'Nguyen' } as any)
      .mockResolvedValueOnce({ id: 'lead-2', status: 'qualified', firstName: 'Binh', lastName: 'Tran' } as any);
    await expect(service.convertToCustomer('tenant-1', 'lead-1')).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'lead-2', status: 'won' }]);
    await expect(service.convertToCustomer('tenant-1', 'lead-2')).resolves.toEqual({ id: 'lead-2', status: 'won' });
    expect(notificationsGateway.broadcastToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'lead.converted',
      { leadId: 'lead-2', name: 'Binh Tran' },
    );
  });
});
