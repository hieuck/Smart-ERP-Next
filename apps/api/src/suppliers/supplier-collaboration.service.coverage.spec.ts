jest.mock('@smart-erp/database', () => ({
  purchaseOrders: { supplierId: 'purchaseOrders.supplierId', tenantId: 'purchaseOrders.tenantId', createdAt: 'purchaseOrders.createdAt', id: 'purchaseOrders.id' },
  suppliers: { id: 'suppliers.id', tenantId: 'suppliers.tenantId' },
  warehouseTasks: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { NotFoundException } from '@nestjs/common';
import { SupplierCollaborationService } from './supplier-collaboration.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => Promise.resolve(undefined)),
    set: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(undefined)),
  };
  return chain;
};

describe('SupplierCollaborationService coverage', () => {
  const selectQueue: any[][] = [];
  const drizzle = {
    db: {
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      update: jest.fn(() => makeWriteChain()),
      insert: jest.fn(() => makeWriteChain()),
    },
  };
  let service: SupplierCollaborationService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    service = new SupplierCollaborationService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads supplier portal orders after verifying supplier tenancy', async () => {
    selectQueue.push([], [{ id: 'supplier-1' }], [{ id: 'po-1' }]);

    await expect(service.getSupplierOrders('missing', 'tenant-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getSupplierOrders('supplier-1', 'tenant-1')).resolves.toEqual([{ id: 'po-1' }]);
  });

  it('computes supplier performance and returns null for missing suppliers', async () => {
    selectQueue.push([], [{ id: 'supplier-1', name: 'ACME' }], [
      { id: 'po-1', total: '100', status: 'received' },
      { id: 'po-2', total: '200', status: 'draft' },
    ]);

    await expect(service.getSupplierPerformance('missing', 'tenant-1')).resolves.toBeNull();
    await expect(service.getSupplierPerformance('supplier-1', 'tenant-1')).resolves.toEqual({
      supplierId: 'supplier-1',
      supplierName: 'ACME',
      totalOrders: 2,
      totalAmount: 300,
      onTimeDeliveryRate: 50,
      avgLeadTimeDays: 5,
      qualityScore: 60,
    });

    selectQueue.push([{ id: 'supplier-2', name: 'No Orders' }], []);
    await expect(service.getSupplierPerformance('supplier-2', 'tenant-1')).resolves.toEqual({
      supplierId: 'supplier-2',
      supplierName: 'No Orders',
      totalOrders: 0,
      totalAmount: 0,
      onTimeDeliveryRate: 0,
      avgLeadTimeDays: 5,
      qualityScore: 20,
    });

    selectQueue.push([{ id: 'supplier-3', name: 'Null Totals' }], [
      { id: 'po-3', total: null, status: 'draft' },
    ]);
    await expect(service.getSupplierPerformance('supplier-3', 'tenant-1')).resolves.toEqual({
      supplierId: 'supplier-3',
      supplierName: 'Null Totals',
      totalOrders: 1,
      totalAmount: 0,
      onTimeDeliveryRate: 0,
      avgLeadTimeDays: 5,
      qualityScore: 20,
    });
  });

  it('confirms delivery and creates a WMS putaway task', async () => {
    selectQueue.push([], [{ id: 'po-1', status: 'confirmed' }]);

    await expect(service.confirmDelivery('supplier-1', 'missing', 'tenant-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.confirmDelivery('supplier-1', 'po-1', 'tenant-1')).resolves.toEqual({
      id: 'po-1',
      status: 'in_transit',
    });
    expect(drizzle.db.update).toHaveBeenCalledTimes(1);
    expect(drizzle.db.insert).toHaveBeenCalledTimes(1);
  });
});
