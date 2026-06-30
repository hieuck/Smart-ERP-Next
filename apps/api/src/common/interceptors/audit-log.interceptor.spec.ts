import { AuditLogInterceptor, AUDIT_LOG_KEY } from './audit-log.interceptor';
import { of, throwError } from 'rxjs';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let mockActivityService: { log: jest.Mock };

  let handlerFn: () => void;

  const makeContext = (method: string, url: string, body = {}) => {
    handlerFn = () => {};
    Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'test_action', resource: 'test_resource' }, handlerFn);
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url, user: { sub: 'user-1', tenantId: 'tenant-1' }, body }),
      }),
      getHandler: () => handlerFn,
      getClass: () => class {},
    } as any;
  };

  beforeEach(() => {
    mockActivityService = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditLogInterceptor(mockActivityService as any);
  });

  it('logs the request with proper parameters', (done) => {
    interceptor.intercept(
      makeContext('POST', '/api/test', { key: 'val' }),
      { handle: () => of({ id: 'entity-1' }) },
    ).subscribe({
      complete: () => {
        expect(mockActivityService.log).toHaveBeenCalledWith(
          'tenant-1', 'user-1', 'test_action', 'test_resource', 'entity-1',
          expect.objectContaining({ method: 'POST', url: '/api/test' }),
        );
        done();
      },
    });
  });

  it('passes response through without modification', (done) => {
    interceptor.intercept(
      makeContext('GET', '/api/test'),
      { handle: () => of({ data: 'hello' }) },
    ).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'hello' });
        done();
      },
    });
  });

  it('skips logging when no audit metadata is present', (done) => {
    const noopHandler = () => {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'DELETE', url: '/api/x', user: { sub: 'u1', tenantId: 't1' } }),
      }),
      getHandler: () => noopHandler,
      getClass: () => class {},
    } as any;
    handlerFn = noopHandler;

    interceptor.intercept(context, { handle: () => of({ done: true }) }).subscribe({
      complete: () => {
        expect(mockActivityService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('logs on error without rethrowing different error', (done) => {
    interceptor.intercept(
      makeContext('POST', '/api/test'),
      { handle: () => throwError(() => new Error('fail')) },
    ).subscribe({
      error: (err) => {
        expect(mockActivityService.log).toHaveBeenCalled();
        expect(err.message).toBe('fail');
        done();
      },
    });
  });
});
