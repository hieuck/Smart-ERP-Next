const helmetMiddleware = jest.fn();
const helmet = jest.fn(() => helmetMiddleware);

jest.mock('helmet', () => helmet);

import { SecurityMiddleware } from './security.middleware';

describe('SecurityMiddleware coverage', () => {
  const res = { setHeader: jest.fn() };
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies helmet and custom no-cache/security headers', () => {
    helmetMiddleware.mockImplementationOnce((_req, _res, callback) => callback());
    const middleware = new SecurityMiddleware();

    middleware.use({} as any, res as any, next);

    expect(helmet).toHaveBeenCalledWith(expect.objectContaining({ contentSecurityPolicy: expect.any(Object) }));
    expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards helmet errors', () => {
    const err = new Error('helmet failed');
    helmetMiddleware.mockImplementationOnce((_req, _res, callback) => callback(err));
    const middleware = new SecurityMiddleware();

    middleware.use({} as any, res as any, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
