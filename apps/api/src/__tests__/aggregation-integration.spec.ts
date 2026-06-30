import { AggregationService } from '../analytics/aggregation.service';

jest.mock('@smart-erp/database', () => ({ db: { select: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ orders: {}, orderItems: {}, products: {}, customers: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn((x) => x), and: jest.fn((...args) => args), gte: jest.fn((x) => x), lte: jest.fn((x) => x), sql: jest.fn((s) => s) }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

const queryResult = (data: any[]) => {
  const chain: Record<string, any> = {};
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.groupBy = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue(data);
  chain.then = (resolve: (v: any) => void) => resolve(data);
  return { from: jest.fn().mockReturnValue(chain) };
};

describe('AggregationService integration', () => {
  let service: AggregationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AggregationService();
  });

  it('returns daily revenue data', async () => {
    db.select.mockReturnValue(queryResult([{ date: '2026-06-30', revenue: '1500000' }]));
    const result = await service.dailyRevenue('t1', 7);
    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(1500000);
  });

  it('returns empty for days with no revenue', async () => {
    db.select.mockReturnValue(queryResult([]));
    const result = await service.dailyRevenue('t1', 7);
    expect(result).toEqual([]);
  });

  it('returns top products', async () => {
    db.select.mockReturnValue(queryResult([{ productId: 'p1', name: 'Widget', totalSold: 10, revenue: '500000' }]));
    const result = await service.topProducts('t1', 5);
    expect(result).toHaveLength(1);
    expect(result[0].totalSold).toBe(10);
  });

  it('returns order stats by status', async () => {
    db.select.mockReturnValue(queryResult([{ status: 'confirmed', count: 5 }]));
    const result = await service.orderStats('t1', '2026-06-01', '2026-06-30');
    expect(result).toHaveLength(1);
  });
});
