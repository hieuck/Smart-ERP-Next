import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware coverage', () => {
  let middleware: RateLimitMiddleware;
  const res = { setHeader: jest.fn() };
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    middleware = new RateLimitMiddleware();
  });

  afterEach(() => {
    clearInterval((middleware as any).cleanupInterval);
    jest.useRealTimers();
  });

  it('allows requests under the limit and identifies clients by API key or IP', () => {
    middleware.use({ headers: { 'x-api-key': 'key-1' }, ip: '1.1.1.1' } as any, res as any, next);
    middleware.use({ headers: {}, ip: '2.2.2.2' } as any, res as any, next);
    middleware.use({ headers: {}, connection: { remoteAddress: '3.3.3.3' } } as any, res as any, next);
    middleware.use({ headers: {} } as any, res as any, next);

    expect(next).toHaveBeenCalledTimes(4);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
  });

  it('blocks clients after exceeding the limit and preserves retry headers', () => {
    const req = { headers: { 'x-api-key': 'key-1' }, ip: '1.1.1.1' } as any;
    for (let index = 0; index < 100; index++) {
      middleware.use(req, res as any, next);
    }

    expect(() => middleware.use(req, res as any, next)).toThrow(HttpException);
    try {
      middleware.use(req, res as any, next);
    } catch (error: any) {
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toContain('try again later');
    }
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 900);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');

    jest.advanceTimersByTime(15 * 60 * 1000 + 1);
    middleware.use(req, res as any, next);
    expect(next).toHaveBeenCalledTimes(101);
  });

  it('resets request windows and cleans stale entries', () => {
    const req = { headers: {}, ip: '4.4.4.4' } as any;
    middleware.use(req, res as any, next);
    jest.advanceTimersByTime(61 * 1000);
    middleware.use(req, res as any, next);

    expect(next).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(20 * 60 * 1000);
    jest.runOnlyPendingTimers();
    expect((middleware as any).requests.size).toBe(0);
  });
});
