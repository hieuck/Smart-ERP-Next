const mockNext = jest.fn(() => ({ type: 'next' }));
const mockRedirect = jest.fn((url: URL) => ({ type: 'redirect', url: url.toString() }));

jest.mock('next/server', () => ({
  NextResponse: {
    next: mockNext,
    redirect: mockRedirect,
  },
}));

import { config, middleware } from './middleware';

const request = (pathname: string, token?: string) =>
  ({
    cookies: {
      get: jest.fn(() => (token ? { value: token } : undefined)),
    },
    nextUrl: { pathname },
    url: `https://erp.test${pathname}`,
  }) as any;

describe('web middleware coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips static assets and public routes', () => {
    expect(middleware(request('/_next/static/app.js'))).toEqual({ type: 'next' });
    expect(middleware(request('/login'))).toEqual({ type: 'next' });
    expect(middleware(request('/mvp/demo'))).toEqual({ type: 'next' });
  });

  it('redirects unauthenticated protected routes to login with source path', () => {
    expect(middleware(request('/orders'))).toEqual({
      type: 'redirect',
      url: 'https://erp.test/login?from=%2Forders',
    });
  });

  it('redirects authenticated users away from auth pages and allows protected routes', () => {
    expect(middleware(request('/login', 'token-1'))).toEqual({
      type: 'redirect',
      url: 'https://erp.test/dashboard',
    });
    expect(middleware(request('/orders', 'token-1'))).toEqual({ type: 'next' });
    expect(config.matcher).toHaveLength(1);
  });
});
