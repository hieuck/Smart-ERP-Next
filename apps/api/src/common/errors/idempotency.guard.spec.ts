import { ExecutionContext, HttpException } from '@nestjs/common';
import { IdempotencyGuard } from './idempotency.guard';

function createContext(method: string, url: string, key?: string): ExecutionContext {
  const request = {
    method,
    originalUrl: url,
    url,
    headers: key ? { 'idempotency-key': key } : {},
  };
  const response = {
    statusCode: 201,
    json: jest.fn(),
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('IdempotencyGuard', () => {
  it('allows non-mutating requests without an idempotency key', () => {
    const guard = new IdempotencyGuard();

    expect(guard.canActivate(createContext('GET', '/orders'))).toBe(true);
  });

  it('rejects replayed mutating requests for the same method and route scope', () => {
    const guard = new IdempotencyGuard();

    expect(guard.canActivate(createContext('POST', '/orders', 'same-key'))).toBe(true);
    expect(() => guard.canActivate(createContext('POST', '/orders', 'same-key'))).toThrow(HttpException);
  });

  it('does not collide when different routes reuse the same idempotency key', () => {
    const guard = new IdempotencyGuard();

    expect(guard.canActivate(createContext('POST', '/orders', 'same-key'))).toBe(true);
    expect(guard.canActivate(createContext('POST', '/payments', 'same-key'))).toBe(true);
  });

  it('allows a key to be reused after the idempotency window expires', () => {
    let now = 1_000;
    const guard = new IdempotencyGuard({ ttlMs: 100, now: () => now });

    expect(guard.canActivate(createContext('POST', '/orders', 'expires-key'))).toBe(true);
    now = 1_101;

    expect(guard.canActivate(createContext('POST', '/orders', 'expires-key'))).toBe(true);
  });

  it('evicts the oldest scoped key when max records is reached', () => {
    const guard = new IdempotencyGuard({ ttlMs: 60_000, maxRecords: 1, now: () => 1_000 });

    expect(guard.canActivate(createContext('POST', '/orders', 'old-key'))).toBe(true);
    expect(guard.canActivate(createContext('POST', '/orders', 'new-key'))).toBe(true);

    expect(guard.canActivate(createContext('POST', '/orders', 'old-key'))).toBe(true);
  });
});
