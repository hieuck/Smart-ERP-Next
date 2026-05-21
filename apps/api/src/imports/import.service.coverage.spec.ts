jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ImportService, FieldMapping } from './import.service';

describe('ImportService coverage', () => {
  const db = { execute: jest.fn() };
  let service: ImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.execute.mockResolvedValue([]);
    service = new ImportService({ db } as any);
  });

  const customerMapping: FieldMapping[] = [
    { sourceColumn: 'code', targetField: 'code', required: true },
    { sourceColumn: 'name', targetField: 'name', required: true },
    { sourceColumn: 'phone', targetField: 'phone' },
    { sourceColumn: 'active', targetField: 'active', transform: 'boolean' },
  ];

  it('imports new customers, updates existing customers, and skips invalid rows', async () => {
    db.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'customer-2' }])
      .mockResolvedValueOnce([]);

    await expect(service.importCustomers('tenant-1', 'user-1', [
      { code: 'C001', name: 'Cong ty A', phone: '0900', active: 'yes' },
      { code: 'C002', name: 'Cong ty B', active: '0' },
      { code: '', name: 'Bi loi' },
    ], customerMapping)).resolves.toEqual({
      total: 3,
      imported: 1,
      updated: 1,
      skipped: 1,
      errors: [{ row: 4, field: 'code', message: 'Required field is empty' }],
    });
    expect(db.execute).toHaveBeenCalledTimes(4);
  });

  it('reports customer persistence errors without stopping later rows', async () => {
    db.execute
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('customer insert failed'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.importCustomers('tenant-1', 'user-1', [
      { code: 'C001', name: 'Cong ty A' },
      { code: 'C002', name: 'Cong ty B' },
    ], customerMapping)).resolves.toEqual({
      total: 2,
      imported: 1,
      updated: 0,
      skipped: 1,
      errors: [{ row: 2, field: 'general', message: 'customer insert failed' }],
    });
  });

  it('imports products, updates existing products, and reports persistence errors', async () => {
    const productMapping = service.getImportTemplate('products');
    db.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'product-2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('database offline'));

    await expect(service.importProducts('tenant-1', 'user-1', [
      { name: 'Ao thun', sku: 'SKU-1', barcode: '111', price: '100000', cost: '50000', stock: '8' },
      { name: 'Quan jean', sku: 'SKU-2', price: '250000', cost: '120000', stock: '3' },
      { name: 'Giay', sku: 'SKU-3', price: '300000' },
    ], productMapping)).resolves.toEqual({
      total: 3,
      imported: 1,
      updated: 1,
      skipped: 1,
      errors: [{ row: 4, field: 'general', message: 'database offline' }],
    });
  });

  it('skips products with missing required fields before hitting persistence', async () => {
    const productMapping = service.getImportTemplate('products');

    await expect(service.importProducts('tenant-1', 'user-1', [
      { name: '', sku: 'SKU-1', price: '100000' },
    ], productMapping)).resolves.toEqual({
      total: 1,
      imported: 0,
      updated: 0,
      skipped: 1,
      errors: [{ row: 2, field: 'name', message: 'Required field is empty' }],
    });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('returns templates and validates required, number, and date fields', async () => {
    expect(service.getImportTemplate('customers').map((field) => field.targetField)).toContain('taxCode');
    expect(service.getImportTemplate('orders').map((field) => field.targetField)).toEqual([
      'customerCode',
      'productSku',
      'quantity',
      'unitPrice',
      'orderDate',
    ]);
    expect(service.getImportTemplate('unknown' as any)).toEqual([]);

    await expect(service.validateImport('orders', [
      { customerCode: '', productSku: 'SKU-1', quantity: 'abc', unitPrice: '1000', orderDate: 'not-a-date' },
      { customerCode: 'C001', productSku: 'SKU-2', quantity: '2', unitPrice: 'bad', orderDate: '2026-05-21' },
    ], service.getImportTemplate('orders'))).resolves.toEqual({
      valid: false,
      errors: [
        { row: 2, field: 'customerCode', message: 'Required field is empty' },
        { row: 2, field: 'quantity', message: 'Invalid number format' },
        { row: 2, field: 'orderDate', message: 'Invalid date format' },
        { row: 3, field: 'unitPrice', message: 'Invalid number format' },
      ],
    });

    await expect(service.validateImport('customers', [
      { code: 'C001', name: 'Cong ty A' },
    ], service.getImportTemplate('customers'))).resolves.toEqual({ valid: true, errors: [] });
  });

  it('transforms date values while importing products', async () => {
    const productMapping: FieldMapping[] = [
      { sourceColumn: 'name', targetField: 'name', required: true },
      { sourceColumn: 'sku', targetField: 'sku', required: true },
      { sourceColumn: 'availableAt', targetField: 'price', transform: 'date' },
    ];
    db.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(service.importProducts('tenant-1', 'user-1', [
      { name: 'Ao khoac', sku: 'SKU-DATE', availableAt: '2026-05-21T00:00:00.000Z' },
    ], productMapping)).resolves.toMatchObject({ imported: 1, errors: [] });

    const insertSql = db.execute.mock.calls[1][0];
    expect(insertSql.values).toContain('2026-05-21T00:00:00.000Z');
  });

  it('falls back invalid numeric transform values to zero', () => {
    expect((service as any).transformValue('abc', 'number')).toBe(0);
    expect((service as any).transformValue('0', 'number')).toBe(0);
  });
});
