jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { WarehouseMetricsService } from './warehouse-metrics.service';

const selectChain = (rows: any[], terminal: 'limit' | 'where' = 'where') => {
  const chain: any = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => (terminal === 'where' ? Promise.resolve(rows) : chain)),
  };
  return chain;
};

describe('WarehouseMetricsService coverage', () => {
  const db = {
    execute: jest.fn(),
    select: jest.fn(),
  };
  const service = new WarehouseMetricsService({ db } as any);

  beforeEach(() => jest.clearAllMocks());

  it('returns null for missing warehouses and computes warehouse stats', async () => {
    db.select
      .mockReturnValueOnce(selectChain([], 'limit'))
      .mockReturnValueOnce(selectChain([{ id: 'wh-1', name: 'Main' }], 'limit'))
      .mockReturnValueOnce(selectChain([{ count: 12 }]));
    db.execute.mockResolvedValueOnce([{ count: 2 }]);

    await expect(service.getWarehouseStats('tenant-1', 'missing')).resolves.toBeNull();
    await expect(service.getWarehouseStats('tenant-1', 'wh-1')).resolves.toEqual({
      totalProducts: 12,
      transfersInTransit: 2,
      warehouseId: 'wh-1',
      warehouseName: 'Main',
    });

    db.select
      .mockReturnValueOnce(selectChain([{ id: 'wh-2', name: 'Empty' }], 'limit'))
      .mockReturnValueOnce(selectChain([]));
    db.execute.mockResolvedValueOnce([]);
    await expect(service.getWarehouseStats('tenant-1', 'wh-2')).resolves.toEqual({
      totalProducts: 0,
      transfersInTransit: 0,
      warehouseId: 'wh-2',
      warehouseName: 'Empty',
    });
  });

  it('loads all warehouse metrics and filters missing stats', async () => {
    jest.spyOn(service, 'getWarehouseStats')
      .mockResolvedValueOnce({ warehouseId: 'wh-1' } as any)
      .mockResolvedValueOnce(null);
    db.select.mockReturnValueOnce(selectChain([{ id: 'wh-1' }, { id: 'missing' }]));

    await expect(service.getAllWarehouseMetrics('tenant-1')).resolves.toEqual([{ warehouseId: 'wh-1' }]);
  });
});
