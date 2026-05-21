const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  serviceTickets: {
    id: 'serviceTickets.id',
    tenantId: 'serviceTickets.tenantId',
    status: 'serviceTickets.status',
    priority: 'serviceTickets.priority',
    assignedTechnicianId: 'serviceTickets.assignedTechnicianId',
    customerId: 'serviceTickets.customerId',
    createdAt: 'serviceTickets.createdAt',
  },
  ticketHistory: {
    ticketId: 'ticketHistory.ticketId',
    tenantId: 'ticketHistory.tenantId',
    createdAt: 'ticketHistory.createdAt',
  },
  ticketComments: {
    ticketId: 'ticketComments.ticketId',
    tenantId: 'ticketComments.tenantId',
    createdAt: 'ticketComments.createdAt',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { HelpdeskService } from './helpdesk.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];
const schemaMock = jest.requireMock('@smart-erp/database/schema') as any;

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
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

describe('HelpdeskService coverage', () => {
  let service: HelpdeskService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new HelpdeskService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates tickets with generated numbers and history entries', async () => {
    selectQueue.push([{ count: 41 }]);
    returningQueue.push([{ id: 1, ticketNumber: 'TKT-000042', status: 'open' }]);

    await expect(service.createTicket('tenant-1', 'user-1', {
      subject: 'Cannot print invoice',
      status: 'open',
      priority: 'urgent',
    })).resolves.toEqual({ id: 1, ticketNumber: 'TKT-000042', status: 'open' });
    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    selectQueue.push([{ count: 0 }]);
    returningQueue.push([{ id: 2, ticketNumber: 'TKT-000001', title: 'Support ticket' }]);
    await expect(service.createTicket('tenant-1', 'user-1', {})).resolves.toEqual({
      id: 2,
      ticketNumber: 'TKT-000001',
      title: 'Support ticket',
    });
  });

  it('lists filtered tickets and loads single tickets with not-found handling', async () => {
    selectQueue.push([{ count: 205 }], [{ id: 1, subject: 'Printer' }]);

    await expect(service.findAll('tenant-1', {
      page: 3,
      limit: 500,
      status: 'open',
      priority: 'urgent',
      assigneeId: 7,
      customerId: 9,
    })).resolves.toEqual({
      items: [{ id: 1, subject: 'Printer' }],
      total: 205,
      page: 3,
      limit: 100,
      totalPages: 3,
    });
    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAll('tenant-1', {})).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    selectQueue.push([], [{ id: 1, status: 'open' }]);
    await expect(service.findOne('tenant-1', 404)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 1)).resolves.toEqual({ id: 1, status: 'open' });
  });

  it('updates status, assigns tickets, comments, history, and stats', async () => {
    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce({ id: 1, status: 'open', assigneeId: null } as any)
      .mockResolvedValueOnce({ id: 1, status: 'resolved', assigneeId: null } as any)
      .mockResolvedValueOnce({ id: 1, status: 'in_progress', assigneeId: null } as any)
      .mockResolvedValueOnce({ id: 1, status: 'in_progress' } as any)
      .mockResolvedValueOnce({ id: 1, status: 'in_progress' } as any);
    returningQueue.push(
      [{ id: 1, status: 'resolved' }],
      [{ id: 1, status: 'closed' }],
      [{ id: 1, assigneeId: 8 }],
      [{ id: 10, content: 'Please retry print' }],
      [{ id: 11, content: 'Visible reply', isInternal: false }],
    );

    await expect(service.updateStatus('tenant-1', 'user-1', 1, 'resolved')).resolves.toEqual({
      id: 1,
      status: 'resolved',
    });
    await expect(service.updateStatus('tenant-1', 'user-1', 1, 'closed')).resolves.toEqual({
      id: 1,
      status: 'closed',
    });
    await expect(service.assignTicket('tenant-1', 'user-1', 1, 8)).resolves.toEqual({
      id: 1,
      assigneeId: 8,
    });
    await expect(service.addComment('tenant-1', 'user-1', 1, 'Please retry print', true)).resolves.toEqual({
      id: 10,
      content: 'Please retry print',
    });
    await expect(service.addComment('tenant-1', 'user-1', 1, 'Visible reply')).resolves.toEqual({
      id: 11,
      content: 'Visible reply',
      isInternal: false,
    });

    selectQueue.push([{ id: 10 }], [{ id: 20 }], [
      { status: 'open', priority: 'urgent' },
      { status: 'in_progress', priority: 'normal' },
      { status: 'resolved', priority: 'urgent' },
      { status: 'closed', priority: 'urgent' },
    ]);
    await expect(service.getComments('tenant-1', 1)).resolves.toEqual([{ id: 10 }]);
    await expect(service.getHistory('tenant-1', 1)).resolves.toEqual([{ id: 20 }]);
    await expect(service.getStats('tenant-1')).resolves.toEqual({
      total: 4,
      open: 1,
      inProgress: 1,
      resolved: 1,
      closed: 1,
      urgent: 2,
    });
  });

  it('falls back safely when optional comment and history tables are unavailable', async () => {
    const ticketComments = schemaMock.ticketComments;
    const ticketHistory = schemaMock.ticketHistory;
    schemaMock.ticketComments = undefined;
    schemaMock.ticketHistory = undefined;
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1, status: 'open' } as any);

    try {
      await expect(service.addComment('tenant-1', 'user-1', 1, 'Local note', true)).resolves.toEqual({
        ticketId: 1,
        authorId: 'user-1',
        content: 'Local note',
        isInternal: true,
      });
      await expect(service.getComments('tenant-1', 1)).resolves.toEqual([]);
      await expect(service.getHistory('tenant-1', 1)).resolves.toEqual([]);
    } finally {
      schemaMock.ticketComments = ticketComments;
      schemaMock.ticketHistory = ticketHistory;
    }
  });
});
