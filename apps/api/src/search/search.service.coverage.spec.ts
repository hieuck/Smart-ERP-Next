jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ strings, values })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
}));

import { SearchService } from './search.service';

describe('SearchService coverage', () => {
  const db = { execute: jest.fn() };
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService({ db } as any);
  });

  it('returns empty results for blank query', async () => {
    await expect(service.search('tenant-1', '   ')).resolves.toEqual([]);
    await expect(service.autocomplete('tenant-1', '   ')).resolves.toEqual([]);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('searches across entities, ranks by score, formats money, and returns URLs', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ id: 'customer-1', name: 'ABC Mart', code: 'ABC', phone: '0900', email: 'abc@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Ao ABC', sku: 'SKU-ABC', barcode: 'BAR-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', code: 'SO-ABC', status: 'paid', total: '125000' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'supplier-1', name: 'Supplier ABC', code: 'SUP-ABC' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'payment-1', code: 'PT-ABC', amount: '50000' }] });

    const results = await service.search('tenant-1', 'ABC', 5);

    expect(results).toHaveLength(5);
    expect(results[0]).toMatchObject({
      type: 'customer',
      title: 'ABC Mart',
      url: '/customers/customer-1',
    });
    expect(results.map((result) => result.score)).toEqual([...results.map((result) => result.score)].sort((a, b) => b - a));
    expect(results.some((result) => result.description?.includes('₫'))).toBe(true);
  });

  it('uses search results for autocomplete suggestions', async () => {
    jest.spyOn(service, 'search').mockResolvedValueOnce([
      { id: '1', type: 'customer', title: 'ABC Mart', metadata: {}, score: 100 },
      { id: '2', type: 'product', title: 'ABC Shirt', metadata: {}, score: 80 },
    ]);

    await expect(service.autocomplete('tenant-1', 'ABC', 1)).resolves.toEqual(['ABC Mart']);
  });

  it('handles sparse records and fuzzy-score fallback branches', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ id: 'customer-2', name: 'Alpha', code: null, phone: null, email: 'alpha@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'product-2', name: 'Beta', sku: 'SKU-1', barcode: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const results = await service.search('tenant-1', 'az', 10);

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ description: 'null • ', type: 'customer' }),
      expect.objectContaining({ description: 'SKU: SKU-1', type: 'product' }),
    ]));
    expect((service as any).calculateScore('', '', 'Beta')).toBeGreaterThanOrEqual(0);
  });
});
