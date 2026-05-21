const mockApiClient = {
  delete: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
};

jest.mock('./api-client', () => ({ apiClient: mockApiClient }));

import { customersApi } from './api-customers';
import { leadsApi } from './api-crm';
import { ordersApi } from './api-orders';
import { productsApi } from './api-products';

describe('web api wrapper coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.get.mockResolvedValue({ data: { ok: true } });
    mockApiClient.post.mockResolvedValue({ data: { id: 'created' } });
    mockApiClient.patch.mockResolvedValue({ data: { id: 'updated' } });
    mockApiClient.delete.mockResolvedValue({ data: { id: 'deleted' } });
  });

  it('maps product API methods to backend endpoints and unwraps response data', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { items: [{ id: 'product-1' }] } });

    await expect(productsApi.getAll({ page: 2, search: 'coffee' })).resolves.toEqual({
      items: [{ id: 'product-1' }],
    });
    await productsApi.getById('product-1');
    await productsApi.getBySku('SKU-1');
    await productsApi.create({ name: 'Coffee' });
    await productsApi.update('product-1', { name: 'Tea' });
    await expect(productsApi.delete('product-1')).resolves.toBeUndefined();
    await productsApi.adjustStock('product-1', 2);
    await productsApi.adjustStock('product-1', 3, 'OUT', 'sold');
    await productsApi.getTransactions('product-1');

    expect(mockApiClient.get).toHaveBeenNthCalledWith(1, '/products', { params: { page: 2, search: 'coffee' } });
    expect(mockApiClient.get).toHaveBeenCalledWith('/products/product-1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/products/sku/SKU-1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/products', { name: 'Coffee' });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/products/product-1', { name: 'Tea' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/products/product-1');
    expect(mockApiClient.patch).toHaveBeenCalledWith('/products/product-1/stock', {
      notes: undefined,
      quantity: 2,
      type: 'ADJUSTMENT',
    });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/products/product-1/stock', {
      notes: 'sold',
      quantity: 3,
      type: 'OUT',
    });
    expect(mockApiClient.get).toHaveBeenCalledWith('/products/product-1/transactions');
  });

  it('maps lead, customer, and order wrapper methods', async () => {
    await leadsApi.getAll({ page: 1, status: 'new' });
    await leadsApi.getOne('lead-1');
    await leadsApi.create({ firstName: 'An', lastName: 'Nguyen' });
    await leadsApi.update('lead-1', { status: 'qualified' });
    await leadsApi.delete('lead-1');
    await leadsApi.getStats();
    await leadsApi.getNextBestAction('lead-1');
    await leadsApi.convertToCustomer('lead-1', { company: 'ABC' });

    await customersApi.getAll({ group: 'vip', page: 2 });
    await customersApi.getOne('customer-1');
    await customersApi.create({ name: 'Retail buyer' } as any);
    await customersApi.update('customer-1', { phone: '090' } as any);
    await customersApi.delete('customer-1');

    await ordersApi.getAll({ status: 'paid' });
    await ordersApi.getOne('order-1');
    await ordersApi.create({ total: 1000 });
    await ordersApi.updateStatus('order-1', 'cancelled', 'duplicate');

    expect(mockApiClient.get).toHaveBeenCalledWith('/crm/leads', { params: { page: 1, status: 'new' } });
    expect(mockApiClient.get).toHaveBeenCalledWith('/crm/leads/lead-1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/crm/leads', { firstName: 'An', lastName: 'Nguyen' });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/crm/leads/lead-1', { status: 'qualified' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/crm/leads/lead-1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/crm/leads/stats');
    expect(mockApiClient.get).toHaveBeenCalledWith('/crm/next-best-action/lead/lead-1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/crm/leads/lead-1/convert', {
      customerData: { company: 'ABC' },
    });
    expect(mockApiClient.get).toHaveBeenCalledWith('/customers', { params: { group: 'vip', page: 2 } });
    expect(mockApiClient.get).toHaveBeenCalledWith('/customers/customer-1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/customers', { name: 'Retail buyer' });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/customers/customer-1', { phone: '090' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/customers/customer-1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders', { params: { status: 'paid' } });
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders/order-1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/orders', { total: 1000 });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/orders/order-1/status', {
      cancelReason: 'duplicate',
      status: 'cancelled',
    });
  });
});
