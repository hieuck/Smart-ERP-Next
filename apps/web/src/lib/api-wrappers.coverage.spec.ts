const mockApiClient = {
  delete: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
};

jest.mock('./api-client', () => ({ API_BASE_URL: 'http://api.test', apiClient: mockApiClient }));

import { customersApi } from './api-customers';
import { leadsApi } from './api-crm';
import { ordersApi } from './api-orders';
import { productsApi, resolveProductImageUrl } from './api-products';

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
    mockApiClient.post.mockResolvedValueOnce({
      data: {
        filename: 'product.png',
        imageUrl: '/uploads/products/tenant/product.png',
        mimeType: 'image/png',
        size: 11,
      },
    });
    await expect(productsApi.uploadImage({ name: 'product.png' } as any)).resolves.toEqual({
      filename: 'product.png',
      imageUrl: '/uploads/products/tenant/product.png',
      mimeType: 'image/png',
      size: 11,
    });
    await productsApi.update('product-1', { name: 'Tea' });
    await expect(productsApi.delete('product-1')).resolves.toBeUndefined();
    await productsApi.adjustStock('product-1', 2);
    await productsApi.adjustStock('product-1', 3, 'OUT', 'sold');
    await productsApi.getTransactions('product-1');

    expect(mockApiClient.get).toHaveBeenNthCalledWith(1, '/products', { params: { page: 2, search: 'coffee' } });
    expect(mockApiClient.get).toHaveBeenCalledWith('/products/product-1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/products/sku/SKU-1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/products', { name: 'Coffee' });
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/products/upload-image',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
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

  it('keeps product image URLs relative for same-origin rewrite and preserves external/empty values', () => {
    // Relative upload paths should stay relative so next.config.js rewrites
    // proxy them through the web origin (avoids cross-origin API issues).
    expect(resolveProductImageUrl('/uploads/products/tenant/product.png')).toBe(
      '/uploads/products/tenant/product.png',
    );
    expect(resolveProductImageUrl('products/local.png')).toBe('products/local.png');
    // Absolute/data/blob URLs are passed through unchanged.
    expect(resolveProductImageUrl('https://cdn.test/product.png')).toBe('https://cdn.test/product.png');
    expect(resolveProductImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(resolveProductImageUrl('blob:http://web.test/id')).toBe('blob:http://web.test/id');
    expect(resolveProductImageUrl('')).toBe('');
    expect(resolveProductImageUrl(null)).toBe('');
  });

  it('maps lead, customer, and order wrapper methods', async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/customers') {
        return Promise.resolve({ data: { items: [{ id: 'customer-1' }], total: 1, page: 2, limit: 20, totalPages: 1 } });
      }
      if (url === '/customers/customer-1') {
        return Promise.resolve({ data: { id: 'customer-1', name: 'Retail buyer' } });
      }
      if (url === '/orders') {
        return Promise.resolve({ data: { items: [{ id: 'order-1' }], total: 1, page: 1, limit: 20, totalPages: 1 } });
      }
      if (url === '/orders/order-1') {
        return Promise.resolve({ data: { id: 'order-1' } });
      }
      return Promise.resolve({ data: { ok: true } });
    });
    mockApiClient.post.mockImplementation((url: string, data?: unknown) => {
      if (url === '/customers') {
        return Promise.resolve({ data: { id: 'customer-new', name: 'Retail buyer' } });
      }
      if (url === '/orders') {
        return Promise.resolve({ data: { id: 'order-new', total: '1000' } });
      }
      return Promise.resolve({ data: { id: 'created' } });
    });
    mockApiClient.patch.mockImplementation((url: string) => {
      if (url === '/customers/customer-1') {
        return Promise.resolve({ data: { id: 'customer-1', phone: '090' } });
      }
      if (url === '/orders/order-1/status') {
        return Promise.resolve({ data: { id: 'order-1', status: 'cancelled' } });
      }
      return Promise.resolve({ data: { id: 'updated' } });
    });
    mockApiClient.delete.mockResolvedValue({ data: undefined });

    await leadsApi.getAll({ page: 1, status: 'new' });
    await leadsApi.getOne('lead-1');
    await leadsApi.create({ firstName: 'An', lastName: 'Nguyen' });
    await leadsApi.update('lead-1', { status: 'qualified' });
    await leadsApi.delete('lead-1');
    await leadsApi.getStats();
    await leadsApi.getNextBestAction('lead-1');
    await leadsApi.convertToCustomer('lead-1', { company: 'ABC' });

    await expect(customersApi.getAll({ group: 'vip', page: 2 })).resolves.toEqual({
      items: [{ id: 'customer-1' }],
      total: 1,
      page: 2,
      limit: 20,
      totalPages: 1,
    });
    await expect(customersApi.getOne('customer-1')).resolves.toEqual({ id: 'customer-1', name: 'Retail buyer' });
    await expect(customersApi.create({ name: 'Retail buyer' } as any)).resolves.toEqual({ id: 'customer-new', name: 'Retail buyer' });
    await expect(customersApi.update('customer-1', { phone: '090' } as any)).resolves.toEqual({ id: 'customer-1', phone: '090' });
    await expect(customersApi.delete('customer-1')).resolves.toBeUndefined();

    await expect(ordersApi.getAll({ status: 'paid' })).resolves.toEqual({
      items: [{ id: 'order-1' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    await expect(ordersApi.getOne('order-1')).resolves.toEqual({ id: 'order-1' });
    await expect(
      ordersApi.create({
        customerId: 'customer-1',
        channel: 'pos',
        paymentMethod: 'cash',
        items: [{ productId: 'product-1', quantity: 2, unitPrice: 500 }],
      }),
    ).resolves.toEqual({ id: 'order-new', total: '1000' });
    await expect(ordersApi.updateStatus('order-1', 'cancelled', 'duplicate')).resolves.toEqual({ id: 'order-1', status: 'cancelled' });

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
    expect(mockApiClient.post).toHaveBeenCalledWith('/orders', {
      customerId: 'customer-1',
      channel: 'pos',
      paymentMethod: 'cash',
      items: [{ productId: 'product-1', quantity: 2, unitPrice: 500 }],
    });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/orders/order-1/status', {
      cancelReason: 'duplicate',
      status: 'cancelled',
    });
  });
});
