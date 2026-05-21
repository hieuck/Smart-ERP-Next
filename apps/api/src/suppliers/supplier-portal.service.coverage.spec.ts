const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  purchaseOrders: {
    code: 'purchaseOrders.code',
    createdAt: 'purchaseOrders.createdAt',
    id: 'purchaseOrders.id',
    status: 'purchaseOrders.status',
    supplierId: 'purchaseOrders.supplierId',
    tenantId: 'purchaseOrders.tenantId',
    total: 'purchaseOrders.total',
  },
  suppliers: {},
  warehouseTasks: {},
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { SupplierPortalService } from './supplier-portal.service';

const makeSelectChain = (rows: any[], terminal: 'orderBy' | 'limit' = 'orderBy') => {
  const chain: any = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => chain),
  };
  if (terminal === 'limit') chain.orderBy = jest.fn(() => chain);
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve()),
  };
  return chain;
};

describe('SupplierPortalService coverage', () => {
  const service = new SupplierPortalService();

  beforeEach(() => jest.clearAllMocks());

  it('lists supplier purchase orders', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([{ id: 'po-1' }]));

    await expect(service.getPurchaseOrders('tenant-1', 'supplier-1')).resolves.toEqual([{ id: 'po-1' }]);
  });

  it('confirms shipments and creates receiving warehouse tasks', async () => {
    const updateChain = makeWriteChain();
    const insertChain = makeWriteChain();
    mockDb.select.mockReturnValueOnce(makeSelectChain([{ id: 'po-1' }], 'limit'));
    mockDb.update.mockReturnValueOnce(updateChain);
    mockDb.insert.mockReturnValueOnce(insertChain);

    await expect(
      service.confirmShipment('tenant-1', 'supplier-1', 'po-1', {
        deliveryDate: '2026-05-22',
        trackingNumber: 'TRACK-1',
      }),
    ).resolves.toEqual({ success: true, message: 'Shipment confirmed and warehouse task created.' });

    expect(updateChain.set).toHaveBeenCalledWith({ status: 'shipping', updatedAt: expect.any(Date) });
    expect(insertChain.values).toHaveBeenCalledWith({
      priority: 'medium',
      referenceId: 'po-1',
      referenceType: 'purchase_order',
      status: 'pending',
      tenantId: 'tenant-1',
      type: 'putaway',
    });
  });

  it('rejects shipment confirmation for missing purchase orders and accepts quotations', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([], 'limit'));

    await expect(
      service.confirmShipment('tenant-1', 'supplier-1', 'missing', { deliveryDate: '2026-05-22' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.submitQuotation('tenant-1', 'supplier-1', 'rfq-1', { total: 100 })).resolves.toEqual({
      rfqId: 'rfq-1',
      status: 'submitted',
      success: true,
      supplierId: 'supplier-1',
    });
  });
});
