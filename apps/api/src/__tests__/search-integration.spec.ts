jest.mock('@smart-erp/database', () => {
  const db: any = () => db;
  const chainFn = jest.fn(() => db);

  db.select = chainFn;
  db.from = chainFn;
  db.where = chainFn;
  db.orderBy = chainFn;
  db.limit = chainFn;
  db.offset = chainFn;
  db.insert = chainFn;
  db.values = chainFn;
  db.update = chainFn;
  db.set = chainFn;
  db.delete = chainFn;
  db.execute = jest.fn();
  db.returning = jest.fn();
  db.then = jest.fn();
  db.innerJoin = chainFn;
  db.leftJoin = chainFn;
  db.groupBy = chainFn;

  return { db };
});
jest.mock('@smart-erp/database/schema', () => ({
  customers: {}, products: {}, orders: {}, suppliers: {}, payments: {},
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  ilike: jest.fn(),
  sql: jest.fn(),
  desc: jest.fn(),
}));

import { db } from '@smart-erp/database';
import { SearchService } from '../search/search.service';

describe('SearchService (direct instantiation)', () => {
  let service: SearchService;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).execute.mockResolvedValue({ rows: [] });
    service = new SearchService({ db } as any);
  });

  describe('search', () => {
    it('returns empty array for empty query', async () => {
      const result = await service.search(TENANT_ID, '');

      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace query', async () => {
      const result = await service.search(TENANT_ID, '   ');

      expect(result).toEqual([]);
    });

    it('searches across all entities and returns combined results', async () => {
      (db as any).execute
        .mockResolvedValueOnce({ rows: [{ id: 'c-1', name: 'Acme Corp', code: 'CUS-001', phone: '09000001', email: 'acme@test.com' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'p-1', name: 'Widget', sku: 'SKU-001' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'o-1', code: 'ORD-001', status: 'confirmed', total: '50000' }] })
        .mockResolvedValueOnce({ rows: [{ id: 's-1', name: 'Supplier X', code: 'SUP-001' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.search(TENANT_ID, 'Acme', 20);

      expect(result).toHaveLength(4);
      expect(result.filter((r) => r.type === 'customer')).toHaveLength(1);
      expect(result.filter((r) => r.type === 'product')).toHaveLength(1);
      expect(result.filter((r) => r.type === 'order')).toHaveLength(1);
      expect(result.filter((r) => r.type === 'supplier')).toHaveLength(1);
    });

    it('returns results sorted by score descending', async () => {
      (db as any).execute
        .mockResolvedValueOnce({ rows: [{ id: 'c-1', name: 'Alpha Corp', code: 'ALPHA', phone: '09000001', email: 'alpha@test.com' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 's-1', name: 'Beta Supplies', code: 'BETA' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.search(TENANT_ID, 'Alpha', 20);

      expect(result[0].type).toBe('customer');
      expect(result[0].title).toBe('Alpha Corp');
    });

    it('limits results to specified limit', async () => {
      (db as any).execute
        .mockResolvedValueOnce({ rows: Array.from({ length: 10 }, (_, i) => ({ id: `c-${i}`, name: `Customer ${i}`, code: `CUS-${i}`, phone: '09000000', email: 'test@test.com' })) })
        .mockResolvedValueOnce({ rows: Array.from({ length: 10 }, (_, i) => ({ id: `p-${i}`, name: `Product ${i}`, sku: `SKU-${i}` })) })
        .mockResolvedValueOnce({ rows: Array.from({ length: 10 }, (_, i) => ({ id: `o-${i}`, code: `ORD-${i}`, status: 'draft', total: '1000' })) })
        .mockResolvedValueOnce({ rows: Array.from({ length: 10 }, (_, i) => ({ id: `s-${i}`, name: `Supplier ${i}`, code: `SUP-${i}` })) })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.search(TENANT_ID, 'test', 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('autocomplete', () => {
    it('returns titles from search results', async () => {
      (db as any).execute
        .mockResolvedValueOnce({ rows: [{ id: 'c-1', name: 'Acme Corp', code: 'CUS-001', phone: '', email: '' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.autocomplete(TENANT_ID, 'Acme');

      expect(result).toEqual(['Acme Corp']);
    });

    it('returns empty array for empty query', async () => {
      const result = await service.autocomplete(TENANT_ID, '');

      expect(result).toEqual([]);
    });
  });
});
