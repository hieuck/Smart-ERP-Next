const mockSecureStore = {
  getItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore, { virtual: true });

describe('mobile api coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
      ok: true,
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('sends auth headers and query params for GET requests', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('tenant-1');
    const { api } = await import('./api');

    await expect(
      api.get('/products', {
        params: { empty: undefined, page: 2, search: 'ca phe' },
      } as any),
    ).resolves.toEqual({ ok: true });

    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.test/products?page=2&search=ca+phe',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'tenant-1',
        }),
      }),
    );
  });

  it('serializes JSON mutation bodies and reports API errors', async () => {
    const { api } = await import('./api');

    await api.post('/orders', { total: 100 });
    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.test/orders',
      expect.objectContaining({
        body: JSON.stringify({ total: 100 }),
        method: 'POST',
      }),
    );

    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ message: 'Bad request' }),
      ok: false,
      status: 400,
    });
    await expect(api.patch('/orders/1', { status: 'paid' })).rejects.toThrow('Bad request');

    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      json: jest.fn().mockRejectedValue(new Error('not json')),
      ok: false,
      status: 503,
    });
    await expect(api.delete('/orders/1')).rejects.toThrow('HTTP 503');

    (global as any).fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
      ok: true,
    });
    await expect(api.post('/ping')).resolves.toEqual({ ok: true });
    await expect(api.patch('/ping')).resolves.toEqual({ ok: true });
    expect((global as any).fetch).toHaveBeenLastCalledWith(
      'https://api.test/ping',
      expect.objectContaining({ body: undefined, method: 'PATCH' }),
    );
  });

  it('uses localhost fallback and HTTP status fallback when no message is returned', async () => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_API_URL;
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({}),
      ok: false,
      status: 418,
    });
    const { api } = await import('./api');

    await expect(api.get('/health')).rejects.toThrow('HTTP 418');
    expect((global as any).fetch).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.any(Object),
    );
  });
});
