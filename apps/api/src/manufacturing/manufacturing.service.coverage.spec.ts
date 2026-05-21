const mockDb = {
  execute: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({
  products: { id: 'products.id' },
  billsOfMaterials: { productId: 'bom.productId', tenantId: 'bom.tenantId' },
  bomRoutings: {
    id: 'routing.id',
    productId: 'routing.productId',
    tenantId: 'routing.tenantId',
    sequenceOrder: 'routing.sequenceOrder',
  },
  productionOrders: {
    id: 'productionOrders.id',
    tenantId: 'productionOrders.tenantId',
  },
  inventoryTransactions: { id: 'inventoryTransactions.id' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';

const executeQueue: any[] = [];
const selectQueue: any[][] = [];
const insertReturningQueue: any[][] = [];
const updateReturningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
  };
  return chain;
};

describe('ManufacturingService coverage', () => {
  let service: ManufacturingService;

  beforeEach(() => {
    jest.clearAllMocks();
    executeQueue.length = 0;
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    updateReturningQueue.length = 0;
    service = new ManufacturingService({ db: mockDb } as any);

    mockDb.execute.mockImplementation(() => Promise.resolve(executeQueue.shift() ?? []));
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateReturningQueue));
    mockDb.delete.mockImplementation(() => makeWriteChain([]));
  });

  it('maps BOM rows and creates BOM items with stringified optional costs', async () => {
    executeQueue.push([
      {
        id: 'bom-1',
        productId: 'p-finished',
        componentProductId: 'p-raw',
        componentProductName: 'Raw bean',
        quantity: '2.5',
        unitCost: '10000',
        wastagePercent: '5',
      },
      { id: 'bom-2', quantity: null, componentProductName: 'Water' },
    ]);

    await expect(service.getBOM('p-finished', 'tenant-1')).resolves.toEqual([
      expect.objectContaining({ quantity: 2.5, unitCost: 10000, wastagePercent: 5 }),
      expect.objectContaining({ quantity: 0, unitCost: undefined, wastagePercent: undefined }),
    ]);

    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('bom-new');
    const getBomSpy = jest.spyOn(service, 'getBOM').mockResolvedValue([{ id: 'bom-new' }] as any);
    await expect(
      service.addBOMItem('tenant-1', 'p-finished', {
        componentProductId: 'p-raw',
        quantity: 3,
        unitCost: 12000,
        wastagePercent: 2,
      }),
    ).resolves.toEqual([{ id: 'bom-new' }]);

    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bom-new',
        tenantId: 'tenant-1',
        productId: 'p-finished',
        quantity: '3',
        unitCost: '12000',
        wastagePercent: '2',
      }),
    );
    expect(getBomSpy).toHaveBeenCalledWith('p-finished', 'tenant-1');
  });

  it('creates production orders and returns hydrated details', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1716200000000);
    insertReturningQueue.push([{ id: 'mo-1' }]);
    const detailSpy = jest.spyOn(service, 'getProductionOrderById').mockResolvedValue({ id: 'mo-1' } as any);

    await expect(
      service.createProductionOrder('tenant-1', 'user-1', {
        productId: 'p-1',
        quantity: 10,
        startDate: '2026-05-20',
        endDate: '2026-05-21',
      }),
    ).resolves.toEqual({ id: 'mo-1' });

    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        productId: 'p-1',
        quantity: '10',
        status: 'draft',
        createdBy: 'user-1',
      }),
    );
    expect(detailSpy).toHaveBeenCalledWith('tenant-1', 'mo-1');
  });

  it('starts production after checking and consuming materials', async () => {
    selectQueue.push([{ id: 'mo-1', productId: 'finished', quantity: '4', status: 'draft', orderCode: 'MO-1' }]);
    executeQueue.push([{ current_stock: 20 }], []);
    jest.spyOn(service, 'getBOM').mockResolvedValue([
      { componentProductId: 'raw-1', componentProductName: 'Raw bean', quantity: 2, wastagePercent: 10 },
    ] as any);
    const detailSpy = jest.spyOn(service, 'getProductionOrderById').mockResolvedValue({ id: 'mo-1', status: 'in_progress' } as any);

    await expect(service.startProduction('tenant-1', 'mo-1', 'user-1')).resolves.toMatchObject({
      status: 'in_progress',
    });

    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'raw-1',
        type: 'production_consumption',
        quantity: 9,
        previousStock: 20,
        newStock: 11,
      }),
    );
    expect(mockDb.update.mock.results[0].value.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress' }),
    );
    expect(detailSpy).toHaveBeenCalledWith('tenant-1', 'mo-1');
  });

  it('rejects invalid production starts', async () => {
    selectQueue.push([], [{ id: 'mo-1', status: 'completed' }], [{ id: 'mo-2', productId: 'finished', quantity: 5, status: 'draft' }]);
    await expect(service.startProduction('tenant-1', 'missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.startProduction('tenant-1', 'mo-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);

    jest.spyOn(service, 'getBOM').mockResolvedValue([
      { componentProductId: 'raw-1', componentProductName: 'Raw bean', quantity: 2 },
    ] as any);
    executeQueue.push([{ current_stock: 1 }]);
    await expect(service.startProduction('tenant-1', 'mo-2', 'user-1')).rejects.toThrow('Insufficient materials');
  });

  it('completes production and records finished goods inventory', async () => {
    selectQueue.push([{ id: 'mo-1', product_id: 'finished', quantity: '6', orderCode: 'MO-1' }]);
    executeQueue.push([{ current_stock: 10 }], []);
    const detailSpy = jest.spyOn(service, 'getProductionOrderById').mockResolvedValue({ id: 'mo-1', status: 'completed' } as any);

    await expect(service.completeProduction('tenant-1', 'mo-1', 'user-1')).resolves.toMatchObject({
      status: 'completed',
    });

    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'finished',
        type: 'production_output',
        quantity: 6,
        previousStock: 10,
        newStock: 16,
      }),
    );
    expect(detailSpy).toHaveBeenCalledWith('tenant-1', 'mo-1');
  });

  it('reports progress, loads details, lists orders, and handles quality checkpoints', async () => {
    updateReturningQueue.push([{ id: 'mo-1' }]);
    await expect(
      service.reportProductionProgress('tenant-1', 'mo-1', { quantityProduced: 3, quantityScrap: 1 }),
    ).resolves.toMatchObject({ status: 'success', orderId: 'mo-1', reportedQty: 3, scrapQty: 1 });

    executeQueue.push([{ id: 'mo-1', product_id: 'finished', quantity: 2 }]);
    jest.spyOn(service, 'getBOM').mockResolvedValueOnce([{ id: 'bom-1' }] as any);
    await expect(service.getProductionOrderById('tenant-1', 'mo-1')).resolves.toMatchObject({
      id: 'mo-1',
      bomItems: [{ id: 'bom-1' }],
    });

    executeQueue.push([]);
    await expect(service.getProductionOrderById('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);

    executeQueue.push([{ id: 'mo-2' }]);
    await expect(service.listProductionOrders('tenant-1', 'draft', 10, 2)).resolves.toEqual([{ id: 'mo-2' }]);

    selectQueue.push([{ id: 'mo-1' }]);
    await expect(service.getQCCheckpoints('mo-1', 'tenant-1')).resolves.toHaveLength(3);
    await expect(service.updateQCCheckpoint('mo-1', 'qc-1', 'passed', 'OK')).resolves.toMatchObject({
      id: 'qc-1',
      status: 'passed',
      notes: 'OK',
    });
  });

  it('calculates material cost, variance, routing, and full production cost', async () => {
    jest.spyOn(service, 'getBOM').mockResolvedValue([
      { componentProductName: 'Raw bean', quantity: 2, wastagePercent: 5, unitCost: 10000 },
      { componentProductName: 'Packaging', quantity: 1, unitCost: 1000 },
    ] as any);

    await expect(service.calculateProductionCost('tenant-1', 'finished', 10)).resolves.toMatchObject({
      totalMaterialCost: 220000,
      totalLaborCost: 33000,
      totalOverheadCost: 25300,
      unitCost: 27830,
      materialBreakdown: [
        expect.objectContaining({ component: 'Raw bean', quantity: 21, subtotal: 210000 }),
        expect.objectContaining({ component: 'Packaging', quantity: 10, subtotal: 10000 }),
      ],
    });

    jest.spyOn(service, 'getProductionOrderById').mockResolvedValue({
      id: 'mo-1',
      orderCode: 'MO-1',
      productId: 'finished',
      productName: 'Finished Good',
      quantity: 10,
      status: 'completed',
    } as any);
    jest.spyOn(service, 'calculateProductionCost').mockResolvedValue({
      totalMaterialCost: 1000,
      totalLaborCost: 150,
      totalOverheadCost: 115,
      totalCost: 1265,
      unitCost: 127,
      quantity: 10,
      materialBreakdown: [],
    } as any);
    executeQueue.push([{ actual_cost: '1250' }]);

    await expect(service.calculateVarianceAnalysis('tenant-1', 'mo-1')).resolves.toMatchObject({
      materialVariance: 250,
      materialVariancePercent: 25,
      isOverBudget: true,
    });

    selectQueue.push([{ operationName: 'Roast', workCenter: 'Line 1', setupTimeMinutes: '30', cycleTimeMinutes: '3', laborCostPerHour: '120000', overheadCostPerHour: '50000' }]);
    await expect(service.getRoutingSteps('finished', 'tenant-1')).resolves.toHaveLength(1);

    insertReturningQueue.push([{ id: 'step-1' }]);
    await expect(
      service.addRoutingStep('tenant-1', {
        productId: 'finished',
        operationName: 'Pack',
        sequenceOrder: 2,
        cycleTimeMinutes: 1,
        requiresQC: true,
      }),
    ).resolves.toEqual({ id: 'step-1' });

    await expect(service.removeRoutingStep('tenant-1', 'step-1')).resolves.toEqual({ deleted: true });

    jest.spyOn(service, 'calculateProductionCost').mockResolvedValue({ totalMaterialCost: 1000 } as any);
    jest.spyOn(service, 'getRoutingSteps').mockResolvedValue([
      {
        operationName: 'Pack',
        workCenter: 'Line 2',
        setupTimeMinutes: '10',
        cycleTimeMinutes: '2',
        laborCostPerHour: '60',
        overheadCostPerHour: '30',
      },
    ] as any);

    await expect(service.calculateFullProductionCost('tenant-1', 'finished', 5)).resolves.toMatchObject({
      totalLaborFromRouting: 20,
      totalOverheadFromRouting: 10,
      totalTimeMinutes: 20,
      grandTotal: 1030,
      unitCostFull: 206,
    });
  });

  it('covers manufacturing defaults and fallback branches', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('bom-optional');
    jest.spyOn(service, 'getBOM').mockResolvedValueOnce([{ id: 'bom-optional' }] as any);
    await expect(service.addBOMItem('tenant-1', 'finished', {
      componentProductId: 'raw-optional',
      quantity: 1,
    })).resolves.toEqual([{ id: 'bom-optional' }]);
    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      unitCost: undefined,
      wastagePercent: undefined,
    }));

    insertReturningQueue.push([{ id: 'mo-default-dates' }]);
    jest.spyOn(service, 'getProductionOrderById').mockResolvedValueOnce({ id: 'mo-default-dates' } as any);
    await expect(service.createProductionOrder('tenant-1', 'user-1', {
      productId: 'finished',
      quantity: 1,
    })).resolves.toEqual({ id: 'mo-default-dates' });
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      endDate: undefined,
    }));

    jest.restoreAllMocks();
    service = new ManufacturingService({ db: mockDb } as any);
    mockDb.execute.mockImplementation(() => Promise.resolve(executeQueue.shift() ?? []));
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateReturningQueue));

    selectQueue.push([{ id: 'mo-zero', productId: 'finished', quantity: '4', status: 'draft', orderCode: 'MO-ZERO' }]);
    executeQueue.push([], []);
    jest.spyOn(service, 'getBOM').mockResolvedValueOnce([
      { componentProductId: 'raw-zero', componentProductName: 'Raw zero', quantity: 0 },
    ] as any);
    jest.spyOn(service, 'getProductionOrderById').mockResolvedValueOnce({ id: 'mo-zero', status: 'in_progress' } as any);
    await expect(service.startProduction('tenant-1', 'mo-zero', 'user-1')).resolves.toMatchObject({ status: 'in_progress' });

    selectQueue.push([{ id: 'mo-output', product_id: 'finished', quantity: '3', orderCode: 'MO-OUTPUT' }]);
    executeQueue.push([], []);
    jest.spyOn(service, 'getProductionOrderById').mockResolvedValueOnce({ id: 'mo-output', status: 'completed' } as any);
    await expect(service.completeProduction('tenant-1', 'mo-output', 'user-1')).resolves.toMatchObject({ status: 'completed' });

    updateReturningQueue.push([{ id: 'mo-progress' }]);
    await expect(service.reportProductionProgress('tenant-1', 'mo-progress', { quantityProduced: 2 })).resolves.toMatchObject({
      scrapQty: 0,
    });

    executeQueue.push([{ id: 'mo-list' }]);
    await expect(service.listProductionOrders('tenant-1')).resolves.toEqual([{ id: 'mo-list' }]);
  });

  it('covers zero-cost variance and routing fallback branches', async () => {
    jest.spyOn(service, 'getBOM').mockResolvedValueOnce([
      { componentProductName: 'No cost component', quantity: 2 },
    ] as any);
    await expect(service.calculateProductionCost('tenant-1', 'finished', 0)).resolves.toMatchObject({
      totalMaterialCost: 0,
      unitCost: 0,
      materialBreakdown: [expect.objectContaining({ unitCost: undefined, subtotal: 0 })],
    });

    jest.spyOn(service, 'getProductionOrderById').mockResolvedValueOnce(null as any);
    await expect(service.calculateVarianceAnalysis('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);

    jest.spyOn(service, 'getProductionOrderById').mockResolvedValueOnce({
      id: 'mo-under',
      orderCode: 'MO-UNDER',
      productId: 'finished',
      productName: 'Finished',
      quantity: 2,
      status: 'completed',
    } as any);
    jest.spyOn(service, 'calculateProductionCost').mockResolvedValueOnce({
      totalMaterialCost: 0,
      totalCost: 0,
      unitCost: 0,
      quantity: 2,
      materialBreakdown: [],
    } as any);
    executeQueue.push([]);
    await expect(service.calculateVarianceAnalysis('tenant-1', 'mo-under')).resolves.toMatchObject({
      actualMaterialCost: 0,
      materialVariancePercent: 0,
      isOverBudget: false,
    });

    insertReturningQueue.push([{ id: 'step-fallback' }]);
    await expect(service.addRoutingStep('tenant-1', {
      productId: 'finished',
      operationName: 'Inspect',
      sequenceOrder: 3,
      cycleTimeMinutes: 0,
    })).resolves.toEqual({ id: 'step-fallback' });
    expect(mockDb.insert.mock.results[mockDb.insert.mock.results.length - 1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      setupTimeMinutes: '0',
      laborCostPerHour: '0',
      overheadCostPerHour: '0',
      requiresQC: false,
    }));

    jest.spyOn(service, 'calculateProductionCost').mockResolvedValueOnce({ totalMaterialCost: 0 } as any);
    jest.spyOn(service, 'getRoutingSteps').mockResolvedValueOnce([
      { operationName: 'Inspect', workCenter: 'QC' },
    ] as any);
    await expect(service.calculateFullProductionCost('tenant-1', 'finished', 0)).resolves.toMatchObject({
      totalLaborFromRouting: 0,
      totalOverheadFromRouting: 0,
      grandTotal: 0,
      unitCostFull: 0,
    });
  });
});
