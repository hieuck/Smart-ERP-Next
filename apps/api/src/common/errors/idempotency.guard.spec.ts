import { ExecutionContext, HttpException } from '@nestjs/common';
import { IdempotencyGuard } from './idempotency.guard';

function createContext(
  method: string,
  url: string,
  key?: string,
  tenantId = 'tenant-1',
  userId = 'user-1',
): ExecutionContext {
  const request = {
    method,
    originalUrl: url,
    url,
    headers: key ? { 'idempotency-key': key } : {},
    user: { tenantId, userId },
  };
  const response = {
    statusCode: 201,
    status: jest.fn().mockReturnThis(),
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

  it('does not collide when different tenants use the same idempotency key', () => {
    const guard = new IdempotencyGuard();

    expect(guard.canActivate(createContext('POST', '/orders', 'same-key', 'tenant-a'))).toBe(true);
    expect(guard.canActivate(createContext('POST', '/orders', 'same-key', 'tenant-b'))).toBe(true);
  });

  it('does not collide when different users in the same tenant use the same idempotency key', () => {
    const guard = new IdempotencyGuard();

    expect(guard.canActivate(createContext('POST', '/orders', 'same-key', 'tenant-a', 'user-a'))).toBe(true);
    expect(guard.canActivate(createContext('POST', '/orders', 'same-key', 'tenant-a', 'user-b'))).toBe(true);
  });

  it('returns the cached response body on replay instead of throwing a generic error', () => {
    const guard = new IdempotencyGuard();
    const firstContext = createContext('POST', '/orders', 'replay-key');

    expect(guard.canActivate(firstContext)).toBe(true);
    (firstContext.switchToHttp().getResponse() as any).json({ id: 'order-1' });

    const replayContext = createContext('POST', '/orders', 'replay-key');
    expect(guard.canActivate(replayContext)).toBe(false);

    const replayResponse = replayContext.switchToHttp().getResponse() as any;
    expect(replayResponse.status).toHaveBeenCalledWith(201);
    expect(replayResponse.json).toHaveBeenCalledWith({ id: 'order-1' });
  });
});
