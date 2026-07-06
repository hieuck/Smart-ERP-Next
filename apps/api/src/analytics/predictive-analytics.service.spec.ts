jest.mock('@smart-erp/database', () => ({
  customers: {},
  orders: {},
}));

import { BadRequestException } from '@nestjs/common';
import { PredictiveAnalyticsService } from './predictive-analytics.service';

function chunksToString(query: any): string {
  if (!query || !Array.isArray(query.queryChunks)) return '';
  return query.queryChunks
    .map((chunk: any) => {
      if (typeof chunk?.value === 'string') return chunk.value;
      if (Array.isArray(chunk?.value)) return chunk.value.join('');
      return '';
    })
    .join('');
}

function chunksToParams(query: any): unknown[] {
  if (!query || !Array.isArray(query.queryChunks)) return [];
  return query.queryChunks
    .map((chunk: any) => {
      if (chunk?.value === undefined) return chunk;
      if (typeof chunk.value === 'string' || Array.isArray(chunk.value)) return undefined;
      return chunk.value;
    })
    .filter((v: unknown) => v !== undefined);
}

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;
  let lastQuery: any;

  const mockExecute = jest.fn().mockImplementation((query) => {
    lastQuery = query;
    return { rows: [] };
  });

  beforeEach(() => {
    lastQuery = undefined;
    mockExecute.mockClear();
    const mockDrizzle = { db: { execute: mockExecute } };
    service = new (PredictiveAnalyticsService as any)(mockDrizzle);
  });

  describe('getSalesTrend', () => {
    it('rejects non-integer weeks', async () => {
      await expect(service.getSalesTrend('t1', 1.5 as any)).rejects.toThrow(BadRequestException);
    });

    it('rejects weeks below 1', async () => {
      await expect(service.getSalesTrend('t1', 0)).rejects.toThrow(BadRequestException);
    });

    it('rejects weeks above 52', async () => {
      await expect(service.getSalesTrend('t1', 53)).rejects.toThrow(BadRequestException);
    });

    it('rejects SQL injection attempts in weeks parameter', async () => {
      await expect(service.getSalesTrend('t1', "1' UNION SELECT * FROM users" as any))
        .rejects.toThrow(BadRequestException);
    });

    it('uses parameterized interval expression without sql.raw', async () => {
      await service.getSalesTrend('t1', 4);

      const queryStr = chunksToString(lastQuery);
      const params = chunksToParams(lastQuery);

      expect(queryStr).toContain("INTERVAL '1 week' * ");
      expect(params).toContain(4);
      expect(params).toContain('t1');
      // Verify no raw interpolation placeholder remains in the static SQL text
      expect(queryStr).not.toContain("${");
    });

    it('returns sales trend data with growth rates', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          { period: '2025-01-01T00:00:00.000Z', revenue: 100, orders_count: 1 },
          { period: '2025-01-08T00:00:00.000Z', revenue: 200, orders_count: 2 },
        ],
      });

      const result = await service.getSalesTrend('t1', 4);

      expect(result).toHaveLength(2);
      expect(result[0].growthRate).toBe(0);
      expect(result[1].growthRate).toBe(100);
    });
  });
});
