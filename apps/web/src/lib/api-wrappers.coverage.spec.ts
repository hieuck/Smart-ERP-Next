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

  it('detects absolute/data/blob schemes case-insensitively and ignores unknown schemes', () => {
    // The scheme check is case-insensitive, so uppercase protocols are still
    // treated as absolute and returned unchanged.
    expect(resolveProductImageUrl('HTTPS://cdn.test/product.png')).toBe('HTTPS://cdn.test/product.png');
    expect(resolveProductImageUrl('DATA:image/png;base64,abc')).toBe('DATA:image/png;base64,abc');
    expect(resolveProductImageUrl('BLOB:http://web.test/id')).toBe('BLOB:http://web.test/id');
    // A value with a colon that doesn't match a recognized scheme is treated
    // as a relative path and returned unchanged, not rewritten.
    expect(resolveProductImageUrl('custom:foo/bar.png')).toBe('custom:foo/bar.png');
  });

  it('passes through the upload API response imageUrl unchanged, even if absolute', async () => {
    // uploadImage no longer post-processes the response with
    // resolveProductImageUrl, so whatever the backend returns (relative or
    // absolute) is returned as-is.
    mockApiClient.post.mockResolvedValueOnce({
      data: {
        filename: 'external.png',
        imageUrl: 'https://cdn.test/external.png',
        mimeType: 'image/png',
        size: 22,
      },
    });

    await expect(productsApi.uploadImage({ name: 'external.png' } as any)).resolves.toEqual({
      filename: 'external.png',
      imageUrl: 'https://cdn.test/external.png',
      mimeType: 'image/png',
      size: 22,
    });
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
