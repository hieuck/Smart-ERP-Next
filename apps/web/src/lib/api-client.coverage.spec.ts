const mockRequestHandlers: any[] = [];
const mockResponseHandlers: any[] = [];

const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn((handler) => mockRequestHandlers.push(handler)),
    },
    response: {
      use: jest.fn((success, error) => mockResponseHandlers.push({ success, error })),
    },
  },
};

const mockAxios = {
  create: jest.fn(() => mockApi),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  create: mockAxios.create,
}));

import { apiClient, authApi, usersApi } from './api-client';

describe('api-client coverage', () => {
  beforeEach(() => {
    mockApi.post.mockClear();
    mockApi.get.mockClear();
    mockApi.patch.mockClear();
    mockApi.delete.mockClear();
  });

  afterEach(() => {
    delete (global as any).localStorage;
    delete (global as any).window;
    delete (global as any).document;
  });

  it('configures the axios client and attaches auth tokens to requests', () => {
    expect(apiClient).toBe(mockApi);
    expect(mockAxios.create).toHaveBeenCalledWith({
      baseURL: '',
      headers: { 'Content-Type': 'application/json' },
    });

    const requestHandler = mockRequestHandlers[0];
    expect(requestHandler({ headers: {} })).toEqual({ headers: {} });

    (global as any).localStorage = { getItem: jest.fn().mockReturnValue('token-1') };
    expect(requestHandler({ headers: {} })).toEqual({ headers: { Authorization: 'Bearer token-1' } });
  });

  it('handles 401 responses by clearing browser auth state only when a token exists', async () => {
    expect(mockResponseHandlers[0].success({ data: { ok: true } })).toEqual({ data: { ok: true } });

    const responseHandler = mockResponseHandlers[0].error;
    const removeItem = jest.fn();
    (global as any).localStorage = {
      getItem: jest.fn().mockReturnValueOnce(null).mockReturnValue('token-1'),
      removeItem,
    };
    (global as any).window = { location: { pathname: '/orders', href: '/orders' } };
    (global as any).document = { cookie: '' };

    await expect(responseHandler({ response: { status: 401 } })).rejects.toEqual({ response: { status: 401 } });
    expect(removeItem).not.toHaveBeenCalled();

    await expect(responseHandler({ response: { status: 401 } })).rejects.toEqual({ response: { status: 401 } });
    expect(removeItem).toHaveBeenCalledWith('access_token');
    expect(removeItem).toHaveBeenCalledWith('user');
    expect((global as any).document.cookie).toBe('access_token=; Path=/; Max-Age=0; SameSite=Lax');
    expect((global as any).window.location.href).toBe('/login');
  });

  it('wraps auth and user HTTP endpoints', () => {
    authApi.login('a@test.com', 'secret');
    authApi.register({ email: 'a@test.com', password: 'secret', name: 'A' });
    usersApi.getAll('lan');
    usersApi.getAll();
    usersApi.getStats();
    usersApi.getOne('user-1');
    usersApi.create({ email: 'a@test.com' });
    usersApi.update('user-1', { name: 'A' });
    usersApi.delete('user-1');

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { email: 'a@test.com', password: 'secret' });
    expect(mockApi.post).toHaveBeenCalledWith('/auth/register', { email: 'a@test.com', password: 'secret', name: 'A' });
    expect(mockApi.get).toHaveBeenCalledWith('/users', { params: { search: 'lan' } });
    expect(mockApi.get).toHaveBeenCalledWith('/users', { params: undefined });
    expect(mockApi.get).toHaveBeenCalledWith('/users/stats');
    expect(mockApi.get).toHaveBeenCalledWith('/users/user-1');
    expect(mockApi.post).toHaveBeenCalledWith('/users', { email: 'a@test.com' });
    expect(mockApi.patch).toHaveBeenCalledWith('/users/user-1', { name: 'A' });
    expect(mockApi.delete).toHaveBeenCalledWith('/users/user-1');
  });
});
