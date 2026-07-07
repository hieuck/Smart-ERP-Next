import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { StructuredLogger } from '../logger/logger.service';
import { of, throwError } from 'rxjs';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let mockLoki: { log: jest.Mock; error: jest.Mock };
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLoki = { log: jest.fn().mockResolvedValue(undefined), error: jest.fn().mockResolvedValue(undefined) };
    interceptor = new RequestLoggingInterceptor();
    (interceptor as any).loki = mockLoki;
    errorSpy = jest.spyOn(StructuredLogger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs request and response to Loki', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/health', requestId: 'req-1' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as any;

    interceptor.intercept(context, { handle: () => of({}) }).subscribe({
      complete: () => {
        expect(mockLoki.log).toHaveBeenCalledTimes(2);
        done();
      },
    });
  });

  it('includes status code in response log', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/api/orders', requestId: 'req-2' }),
        getResponse: () => ({ statusCode: 201 }),
      }),
    } as any;

    interceptor.intercept(context, { handle: () => of({}) }).subscribe({
      next: () => {
        expect(mockLoki.log).toHaveBeenCalledTimes(2);
        done();
      },
    });
  });

  it('logs failed requests with Loki error and rethrows the original error', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/orders/1', requestId: 'req-3' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as any;

    const error = new Error('Not found');
    (error as any).status = 404;

    interceptor.intercept(context, { handle: () => throwError(() => error) }).subscribe({
      error: (err) => {
        expect(err.message).toBe('Not found');
        expect(mockLoki.error).toHaveBeenCalledWith(
          'api',
          expect.stringContaining('GET /api/orders/1 404'),
          expect.objectContaining({ requestId: 'req-3', statusCode: 404 }),
        );
        expect(errorSpy.mock.calls[0][0]).toContain('GET /api/orders/1 404');
        done();
      },
    });
  });
});
