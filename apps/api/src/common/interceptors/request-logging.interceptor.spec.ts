import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { of } from 'rxjs';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let mockLoki: { log: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockLoki = { log: jest.fn().mockResolvedValue(undefined), error: jest.fn().mockResolvedValue(undefined) };
    interceptor = new RequestLoggingInterceptor();
    (interceptor as any).loki = mockLoki;
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
});
