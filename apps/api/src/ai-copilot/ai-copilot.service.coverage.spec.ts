jest.mock('@smart-erp/database', () => ({
  crmLeads: { tenantId: 'crmLeads.tenantId', createdAt: 'crmLeads.createdAt', status: 'crmLeads.status' },
  orders: { tenantId: 'orders.tenantId', createdAt: 'orders.createdAt', total: 'orders.total' },
  e_contracts: { tenantId: 'e_contracts.tenantId', status: 'e_contracts.status' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { AiCopilotService } from './ai-copilot.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

describe('AiCopilotService coverage', () => {
  const selectQueue: any[][] = [];
  const drizzle = {
    db: {
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
    },
  };
  let service: AiCopilotService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    service = new AiCopilotService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flags executive insights that need attention', async () => {
    selectQueue.push([{ total: 50000000 }], [{ count: 12 }], [{ count: 6 }], [{ count: 3 }]);

    await expect(service.getExecutiveInsights('tenant-1')).resolves.toEqual({
      revenue: 50000000,
      leadsCount: 12,
      highPriority: 6,
      signedCount: 3,
      healthStatus: 'needs attention',
      summary: 'System is currently needs attention.',
      recommendations: [
        'High number of new leads. Review sales pipeline.',
        'Revenue below target. Push CRM leads conversion.',
      ],
      generatedAt: '2026-05-21T00:00:00.000Z',
    });
  });

  it('keeps health on track with zero defaults', async () => {
    selectQueue.push([], [], [], []);

    await expect(service.getExecutiveInsights('tenant-1')).resolves.toMatchObject({
      revenue: 0,
      leadsCount: 0,
      highPriority: 0,
      signedCount: 0,
      healthStatus: 'on track',
      recommendations: ['Revenue below target. Push CRM leads conversion.'],
    });
  });
});
