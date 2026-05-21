const mockDb = {
  execute: jest.fn(),
  insert: jest.fn(),
  select: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  leadScoringRules: { event: 'event', isActive: 'active', tenantId: 'tenant' },
  leads: {},
  marketingCampaigns: { createdAt: 'createdAt', tenantId: 'tenantId' },
  marketingSegments: { tenantId: 'tenantId' },
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { MarketingService } from './marketing.service';

const selectChain = (rows: any[], terminal: 'limit' | 'orderBy' | 'where' = 'where') => {
  const chain: any = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => (terminal === 'where' ? Promise.resolve(rows) : chain)),
  };
  return chain;
};
const insertChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    values: jest.fn(() => chain),
  };
  return chain;
};

describe('MarketingService coverage', () => {
  const service = new MarketingService();

  beforeEach(() => jest.clearAllMocks());

  it('processes scoring events only when an active rule exists', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ points: 10 }], 'limit')).mockReturnValueOnce(selectChain([], 'limit'));

    await expect(service.processEvent('tenant-1', 'lead-1', 'email.opened')).resolves.toEqual({ success: true });
    await expect(service.processEvent('tenant-1', 'lead-1', 'missing')).resolves.toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('lists campaign performance, segments, and creates campaigns', async () => {
    const insert = insertChain([{ id: 'campaign-1' }]);
    mockDb.select
      .mockReturnValueOnce(selectChain([{ id: 'campaign-1' }], 'orderBy'))
      .mockReturnValueOnce(selectChain([{ id: 'segment-1' }]));
    mockDb.insert.mockReturnValueOnce(insert);

    await expect(service.getCampaignPerformance('tenant-1')).resolves.toEqual([{ id: 'campaign-1' }]);
    await expect(service.getSegments('tenant-1')).resolves.toEqual([{ id: 'segment-1' }]);
    await expect(service.createCampaign('tenant-1', { name: 'Launch' })).resolves.toEqual({ id: 'campaign-1' });
    expect(insert.values).toHaveBeenCalledWith({ name: 'Launch', tenantId: 'tenant-1' });
  });
});
