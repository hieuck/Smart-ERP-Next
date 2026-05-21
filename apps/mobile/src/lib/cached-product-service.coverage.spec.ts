const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};
const mockApi = {
  get: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage, { virtual: true });
jest.mock('./api', () => ({ api: mockApi }));

import { getProducts } from './cached-product-service';

describe('cached mobile product service coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns fresh products and stores them in cache', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { items: [{ id: 'product-1' }] } });

    await expect(getProducts(2, 'coffee', 50)).resolves.toEqual([{ id: 'product-1' }]);

    expect(mockApi.get).toHaveBeenCalledWith('/products', {
      params: { limit: 50, page: 2, search: 'coffee' },
    });
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'cached_products_2_coffee_50',
      JSON.stringify({ data: [{ id: 'product-1' }], timestamp: 1770000000000 }),
    );
  });

  it('falls back to fresh cache only when network fetch fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('offline'));
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ data: [{ id: 'cached-product' }], timestamp: 1770000000000 - 1000 }),
    );

    await expect(getProducts()).resolves.toEqual([{ id: 'cached-product' }]);

    mockApi.get.mockRejectedValueOnce(new Error('offline'));
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ data: [{ id: 'old-product' }], timestamp: 1770000000000 - 11 * 60 * 1000 }),
    );

    await expect(getProducts()).rejects.toThrow('offline');
  });
});
