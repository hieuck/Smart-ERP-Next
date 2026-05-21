const mockDb = {
  select: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  crmLeads: {
    id: 'crmLeads.id',
    tenantId: 'crmLeads.tenantId',
  },
  crmOpportunities: {},
  customers: {},
  orders: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
}));

import { NextBestActionService } from './next-best-action.service';

const selectQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('NextBestActionService coverage', () => {
  let service: NextBestActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.execute.mockResolvedValue({ rows: [{}] });
    service = new NextBestActionService();
  });

  it('throws when the requested lead does not exist', async () => {
    selectQueue.push([]);

    await expect(service.getNextBestAction('lead-missing', 'tenant-1')).rejects.toThrow('Lead not found');
  });

  it('recommends call for stale referral leads', async () => {
    selectQueue.push([{ id: 'lead-1', source: 'referral', industry: 'retail' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 0, email_clicks: 0, website_visits: 0, days_since_last_contact: 30 }],
    });

    await expect(service.getNextBestAction('lead-1', 'tenant-1')).resolves.toEqual({
      action: 'call',
      priority: expect.any(Number),
      reason: 'No contact for 30 days. Source: referral.',
    });
  });

  it('falls back to empty activity metrics when activity rows are missing', async () => {
    selectQueue.push([{ id: 'lead-empty', source: 'website', industry: undefined }]);
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    await expect(service.getNextBestAction('lead-empty', 'tenant-1')).resolves.toEqual({
      action: 'call',
      priority: expect.any(Number),
      reason: 'No contact for 999 days. Source: website.',
    });
  });

  it('recommends email for high email engagement', async () => {
    selectQueue.push([{ id: 'lead-2', source: 'website', industry: 'retail' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 5, email_clicks: 2, website_visits: 0, days_since_last_contact: 4 }],
    });

    await expect(service.getNextBestAction('lead-2', 'tenant-1')).resolves.toEqual({
      action: 'email',
      priority: expect.any(Number),
      reason: 'High email engagement (opens: 5, clicks: 2).',
    });
  });

  it('recommends meeting for high web activity in manufacturing', async () => {
    selectQueue.push([{ id: 'lead-3', source: 'website', industry: 'manufacturing' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 0, email_clicks: 0, website_visits: 7, days_since_last_contact: 5 }],
    });

    await expect(service.getNextBestAction('lead-3', 'tenant-1')).resolves.toEqual({
      action: 'meeting',
      priority: expect.any(Number),
      reason: 'High website activity (7 visits) and industry: manufacturing.',
    });
  });

  it('scores trade-show wholesale leads and recent web-only activity', async () => {
    selectQueue.push([{ id: 'lead-7', source: 'trade_show', industry: 'wholesale' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 0, email_clicks: 0, website_visits: 1, days_since_last_contact: 1 }],
    });

    await expect(service.getNextBestAction('lead-7', 'tenant-1')).resolves.toEqual({
      action: 'meeting',
      priority: expect.any(Number),
      reason: 'High website activity (1 visits) and industry: wholesale.',
    });
  });

  it('recommends proposal for combined email and web interest signals', async () => {
    selectQueue.push([{ id: 'lead-5', source: 'website', industry: 'retail' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 5, email_clicks: 2, website_visits: 7, days_since_last_contact: 4 }],
    });

    await expect(service.getNextBestAction('lead-5', 'tenant-1')).resolves.toEqual({
      action: 'proposal',
      priority: expect.any(Number),
      reason: 'Strong interest signals (email + web activity). Ready for proposal.',
    });
  });

  it('recommends follow-up when the lead is warm but not recently active', async () => {
    selectQueue.push([{ id: 'lead-6', source: 'website', industry: 'retail' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 0, email_clicks: 0, website_visits: 0, days_since_last_contact: 10 }],
    });

    await expect(service.getNextBestAction('lead-6', 'tenant-1')).resolves.toEqual({
      action: 'follow_up',
      priority: expect.any(Number),
      reason: 'Scheduled follow‑up recommended.',
    });
  });

  it('recommends follow-up for recently active leads without dominant signals', async () => {
    selectQueue.push([{ id: 'lead-4', source: 'website', industry: 'retail' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ email_opens: 1, email_clicks: 0, website_visits: 0, days_since_last_contact: 1 }],
    });

    await expect(service.getNextBestAction('lead-4', 'tenant-1')).resolves.toEqual({
      action: 'follow_up',
      priority: expect.any(Number),
      reason: 'Scheduled follow‑up recommended.',
    });
  });
});
