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

import { MRPService } from './mrp.service';

const makeInsertChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    onConflictDoUpdate: jest.fn(() => Promise.resolve(undefined)),
  };
  return chain;
};

describe('MRPService coverage', () => {
  const insertChain = makeInsertChain();
  const drizzle = {
    db: {
      execute: jest.fn(),
      insert: jest.fn(() => insertChain),
    },
  };
  let service: MRPService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    service = new MRPService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects missing products before calculating requirements', async () => {
    drizzle.db.execute.mockResolvedValueOnce([]);

    await expect(service.calculateMRP('tenant-1', 'missing')).rejects.toThrow('Product not found: missing');
    expect(drizzle.db.insert).not.toHaveBeenCalled();
  });

  it('calculates demand, BOM gaps, and upserts the forecast snapshot', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([{ id: 'product-1', name: 'Finished Good', current_stock: 5, lead_time_days: 14, safety_stock: 2 }])
      .mockResolvedValueOnce([{ total_forecast: '10' }])
      .mockResolvedValueOnce([{ total_orders: '7' }])
      .mockResolvedValueOnce([
        { id: 'component-1', component_name: 'Box', current_stock: '3', required_qty: '28.8' },
        { id: 'component-2', component_name: 'Label', current_stock: '20', required_qty: '12' },
      ]);

    await expect(service.calculateMRP('tenant-1', 'product-1', 10)).resolves.toEqual({
      productId: 'product-1',
      productName: 'Finished Good',
      forecastDate: '2026-05-21',
      forecastedDemand: 10,
      salesOrderDemand: 7,
      netRequirement: 14,
      suggestedProduction: 14,
      rawMaterialGap: 26,
      bomComponents: [
        { componentProductId: 'component-1', componentProductName: 'Box', requiredQuantity: 29, currentStock: 3, gap: 26 },
        { componentProductId: 'component-2', componentProductName: 'Label', requiredQuantity: 12, currentStock: 20, gap: 0 },
      ],
    });

    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      productId: 'product-1',
      forecastDate: '2026-05-21',
      forecastedDemand: 10,
      salesOrderDemand: 7,
      netRequirement: 14,
      suggestedProduction: 14,
      rawMaterialGap: 26,
    }));
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('calculates zero requirements with default lead time, no demand, and no BOM rows', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([{ id: 'product-2', name: 'No demand item', current_stock: 100, lead_time_days: null, safety_stock: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null);

    await expect(service.calculateMRP('tenant-1', 'product-2')).resolves.toEqual({
      productId: 'product-2',
      productName: 'No demand item',
      forecastDate: '2026-05-21',
      forecastedDemand: 0,
      salesOrderDemand: 0,
      netRequirement: 0,
      suggestedProduction: 0,
      rawMaterialGap: 0,
      bomComponents: [],
    });
  });

  it('normalizes empty BOM component quantities and stock to zero', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([{ id: 'product-3', name: 'Fallback BOM item', current_stock: 0, lead_time_days: 0, safety_stock: 0 }])
      .mockResolvedValueOnce([{ total_forecast: '1' }])
      .mockResolvedValueOnce([{ total_orders: null }])
      .mockResolvedValueOnce([{ id: 'component-empty', component_name: 'Empty Component', required_qty: null, current_stock: undefined }]);

    await expect(service.calculateMRP('tenant-1', 'product-3')).resolves.toMatchObject({
      productId: 'product-3',
      forecastedDemand: 1,
      salesOrderDemand: 0,
      netRequirement: 1,
      bomComponents: [
        { componentProductId: 'component-empty', componentProductName: 'Empty Component', requiredQuantity: 0, currentStock: 0, gap: 0 },
      ],
    });
  });

  it('runs batch MRP for explicit and active product sets while skipping failed products', async () => {
    jest.spyOn(service, 'calculateMRP')
      .mockResolvedValueOnce({ productId: 'b', productName: 'B', forecastDate: '2026-05-21', forecastedDemand: 0, salesOrderDemand: 0, netRequirement: 2, suggestedProduction: 2, rawMaterialGap: 0, bomComponents: [] })
      .mockResolvedValueOnce({ productId: 'a', productName: 'A', forecastDate: '2026-05-21', forecastedDemand: 0, salesOrderDemand: 0, netRequirement: 5, suggestedProduction: 5, rawMaterialGap: 0, bomComponents: [] })
      .mockRejectedValueOnce(new Error('bad product'))
      .mockResolvedValueOnce({ productId: 'active-2', productName: 'Active', forecastDate: '2026-05-21', forecastedDemand: 0, salesOrderDemand: 0, netRequirement: 1, suggestedProduction: 1, rawMaterialGap: 0, bomComponents: [] });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    drizzle.db.execute.mockResolvedValueOnce([{ id: 'active-1' }, { id: 'active-2' }]);

    await expect(service.calculateMRPBatch('tenant-1', ['b', 'a'])).resolves.toEqual([
      expect.objectContaining({ productId: 'a', netRequirement: 5 }),
      expect.objectContaining({ productId: 'b', netRequirement: 2 }),
    ]);
    await expect(service.calculateMRPBatch('tenant-1')).resolves.toEqual([
      expect.objectContaining({ productId: 'active-2' }),
    ]);
    expect(errorSpy).toHaveBeenCalledWith('MRP calculation failed for product active-1:', expect.any(Error));
  });
});
