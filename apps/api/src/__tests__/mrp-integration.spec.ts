jest.mock('@smart-erp/database', () => ({
  products: {},
  orders: {},
  orderItems: {},
  billsOfMaterials: {},
  inventoryTransactions: {},
  mrpForecasts: {
    tenantId: 'mrpForecasts.tenant_id',
    productId: 'mrpForecasts.product_id',
    forecastDate: 'mrpForecasts.forecast_date',
  },
}));

import { MRPService, MRPResult } from '../mrp/mrp.service';

const makeInsertChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    onConflictDoUpdate: jest.fn(() => Promise.resolve(undefined)),
  };
  return chain;
};

describe('MRPService Integration', () => {
  let mockDb: { execute: jest.Mock; insert: jest.Mock };
  let insertChain: ReturnType<typeof makeInsertChain>;
  let service: MRPService;

  beforeEach(() => {
    insertChain = makeInsertChain();
    mockDb = {
      execute: jest.fn(),
      insert: jest.fn(() => insertChain),
    };
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    service = new MRPService({ db: mockDb } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateMRP', () => {
    it('computes net requirement from forecast + sales orders minus stock plus safety stock', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p1', name: 'Widget', current_stock: 10, lead_time_days: 7, safety_stock: 5 }])
        .mockResolvedValueOnce([{ total_forecast: '20' }])
        .mockResolvedValueOnce([{ total_orders: '15' }])
        .mockResolvedValueOnce([]);

      const result = await service.calculateMRP('t1', 'p1', 30);

      // netRequirement = max(0, 20 + 15 - 10 + 5) = 30
      expect(result.netRequirement).toBe(30);
      expect(result.suggestedProduction).toBe(30);
    });

    it('returns zero net requirement when stock comfortably exceeds demand', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p2', name: 'Overstock', current_stock: 100, lead_time_days: 3, safety_stock: 0 }])
        .mockResolvedValueOnce([{ total_forecast: '10' }])
        .mockResolvedValueOnce([{ total_orders: '5' }])
        .mockResolvedValueOnce([]);

      const result = await service.calculateMRP('t1', 'p2');

      expect(result.netRequirement).toBe(0);
      expect(result.suggestedProduction).toBe(0);
    });

    it('includes safety stock in net requirement calculation', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p3', name: 'Safety', current_stock: 15, lead_time_days: 7, safety_stock: 10 }])
        .mockResolvedValueOnce([{ total_forecast: '10' }])
        .mockResolvedValueOnce([{ total_orders: '0' }])
        .mockResolvedValueOnce([]);

      const result = await service.calculateMRP('t1', 'p3');

      // netRequirement = max(0, 10 + 0 - 15 + 10) = 5
      expect(result.netRequirement).toBe(5);
    });

    it('explodes BOM with wastage into component requirements and computes raw material gap', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p4', name: 'Assembly', current_stock: 5, lead_time_days: 7, safety_stock: 0 }])
        .mockResolvedValueOnce([{ total_forecast: '10' }])
        .mockResolvedValueOnce([{ total_orders: '0' }])
        .mockResolvedValueOnce([
          { id: 'c1', component_name: 'Part A', current_stock: '2', required_qty: '5.4' },
          { id: 'c2', component_name: 'Part B', current_stock: '10', required_qty: '3.0' },
        ]);

      const result = await service.calculateMRP('t1', 'p4');

      expect(result.netRequirement).toBe(5);
      expect(result.bomComponents).toHaveLength(2);
      expect(result.bomComponents[0]).toEqual({
        componentProductId: 'c1',
        componentProductName: 'Part A',
        requiredQuantity: 6,
        currentStock: 2,
        gap: 4,
      });
      expect(result.bomComponents[1]).toEqual({
        componentProductId: 'c2',
        componentProductName: 'Part B',
        requiredQuantity: 3,
        currentStock: 10,
        gap: 0,
      });
      expect(result.rawMaterialGap).toBe(4);
    });

    it('throws when product is not found and does not insert forecast', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      await expect(service.calculateMRP('t1', 'nonexistent'))
        .rejects.toThrow('Product not found: nonexistent');
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('handles null forecast and sales order results gracefully', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p5', name: 'Null data', current_stock: 5, lead_time_days: 7, safety_stock: 2 }])
        .mockResolvedValueOnce([{ total_forecast: null }])
        .mockResolvedValueOnce([{ total_orders: null }])
        .mockResolvedValueOnce(null);

      const result = await service.calculateMRP('t1', 'p5');

      expect(result.forecastedDemand).toBe(0);
      expect(result.salesOrderDemand).toBe(0);
      expect(result.netRequirement).toBe(0);
      expect(result.bomComponents).toEqual([]);
    });

    it('saves forecast snapshot via upsert with correct computed values', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p6', name: 'Audit', current_stock: 20, lead_time_days: 5, safety_stock: 3 }])
        .mockResolvedValueOnce([{ total_forecast: '30' }])
        .mockResolvedValueOnce([{ total_orders: '10' }])
        .mockResolvedValueOnce([]);

      await service.calculateMRP('t1', 'p6');

      expect(insertChain.values).toHaveBeenCalledWith({
        tenantId: 't1',
        productId: 'p6',
        forecastDate: '2026-05-21',
        forecastedDemand: 30,
        salesOrderDemand: 10,
        netRequirement: 23,
        suggestedProduction: 23,
        rawMaterialGap: 0,
      });
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalledWith({
        target: ['mrpForecasts.tenant_id', 'mrpForecasts.product_id', 'mrpForecasts.forecast_date'],
        set: {
          forecastedDemand: 30,
          salesOrderDemand: 10,
          netRequirement: 23,
          suggestedProduction: 23,
          rawMaterialGap: 0,
        },
      });
    });

    it('applies default lead_time_days of 7 when field is null', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p7', name: 'No lead time', current_stock: 0, lead_time_days: null, safety_stock: 0 }])
        .mockResolvedValueOnce([{ total_forecast: '5' }])
        .mockResolvedValueOnce([{ total_orders: '0' }])
        .mockResolvedValueOnce([]);

      const result = await service.calculateMRP('t1', 'p7');

      expect(result.netRequirement).toBe(5);
      expect(result.suggestedProduction).toBe(5);
    });
  });

  describe('calculateMRPBatch', () => {
    it('returns results sorted by net requirement descending (most urgent first)', async () => {
      jest.spyOn(service as any, 'calculateMRP')
        .mockResolvedValueOnce({ productId: 'low', netRequirement: 3 } as MRPResult)
        .mockResolvedValueOnce({ productId: 'high', netRequirement: 10 } as MRPResult)
        .mockResolvedValueOnce({ productId: 'mid', netRequirement: 5 } as MRPResult);

      const results = await service.calculateMRPBatch('t1', ['low', 'high', 'mid']);

      expect(results.map(r => r.productId)).toEqual(['high', 'mid', 'low']);
    });

    it('auto-fetches active products from database when no productIds given', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 'auto-1' }, { id: 'auto-2' }]);
      jest.spyOn(service as any, 'calculateMRP')
        .mockResolvedValue({ productId: 'auto-1', netRequirement: 1 } as MRPResult);

      await service.calculateMRPBatch('t1');

      expect(mockDb.execute).toHaveBeenCalledWith(expect.objectContaining({}));
      expect(service['calculateMRP']).toHaveBeenCalledTimes(2);
    });

    it('continues processing remaining products when one fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(service as any, 'calculateMRP')
        .mockResolvedValueOnce({ productId: 'good', netRequirement: 5 } as MRPResult)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ productId: 'also-good', netRequirement: 3 } as MRPResult);

      const results = await service.calculateMRPBatch('t1', ['good', 'bad', 'also-good']);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.productId)).toEqual(['good', 'also-good']);
      errorSpy.mockRestore();
    });

    it('returns empty array when no products are active in database', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      const results = await service.calculateMRPBatch('t1');

      expect(results).toEqual([]);
    });

    it('returns empty array when all products in batch fail', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(service as any, 'calculateMRP')
        .mockRejectedValue(new Error('fail'));

      const results = await service.calculateMRPBatch('t1', ['f1', 'f2']);

      expect(results).toEqual([]);
      errorSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('pipeline: forecast demand flows through stock offset to BOM explosion and raw material gap', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'pipe-1', name: 'Pipeline Product', current_stock: 2, lead_time_days: 7, safety_stock: 3 }])
        .mockResolvedValueOnce([{ total_forecast: '50' }])
        .mockResolvedValueOnce([{ total_orders: '25' }])
        .mockResolvedValueOnce([
          { id: 'raw-1', component_name: 'Raw Material', current_stock: '10', required_qty: '80' },
        ]);

      const result = await service.calculateMRP('t1', 'pipe-1');

      // netReq = max(0, 50 + 25 - 2 + 3) = 76
      // suggestedProd = ceil(76) = 76
      // raw-1: req = ceil(80) = 80, gap = 80 - 10 = 70
      expect(result.netRequirement).toBe(76);
      expect(result.suggestedProduction).toBe(76);
      expect(result.bomComponents).toHaveLength(1);
      expect(result.bomComponents[0].requiredQuantity).toBe(80);
      expect(result.bomComponents[0].gap).toBe(70);
      expect(result.rawMaterialGap).toBe(70);
    });

    it('calculateMRPBatch delegates to calculateMRP for each product with correct arguments', async () => {
      const mrpSpy = jest.spyOn(service as any, 'calculateMRP')
        .mockResolvedValue({ productId: 'x', netRequirement: 1 } as MRPResult);

      await service.calculateMRPBatch('t1', ['x', 'y', 'z']);

      expect(mrpSpy).toHaveBeenCalledTimes(3);
      expect(mrpSpy).toHaveBeenCalledWith('t1', 'x');
      expect(mrpSpy).toHaveBeenCalledWith('t1', 'y');
      expect(mrpSpy).toHaveBeenCalledWith('t1', 'z');
    });

    it('forecast rows outside the date window are excluded by SQL WHERE clause', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ id: 'p-date', name: 'Date Filter', current_stock: 100, lead_time_days: 7, safety_stock: 0 }])
        .mockResolvedValueOnce([{ total_forecast: '8' }])
        .mockResolvedValueOnce([{ total_orders: '0' }])
        .mockResolvedValueOnce([]);

      const result = await service.calculateMRP('t1', 'p-date', 30);

      expect(result.forecastedDemand).toBe(8);
    });

    it('batch sorts automatically fetched products by urgency', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 'low' }, { id: 'high' }, { id: 'mid' }]);
      jest.spyOn(service as any, 'calculateMRP')
        .mockResolvedValueOnce({ productId: 'low', netRequirement: 3 } as MRPResult)
        .mockResolvedValueOnce({ productId: 'high', netRequirement: 100 } as MRPResult)
        .mockResolvedValueOnce({ productId: 'mid', netRequirement: 50 } as MRPResult);

      const results = await service.calculateMRPBatch('t1');

      expect(results.map(r => r.productId)).toEqual(['high', 'mid', 'low']);
    });
  });
});
