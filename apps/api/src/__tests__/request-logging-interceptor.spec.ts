import { of } from 'rxjs';
import { RequestLoggingInterceptor } from '../common/interceptors/request-logging.interceptor';

const createContext = (request: any, response?: any) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response || { statusCode: 200 },
    }),
  }) as any;

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;

  beforeEach(() => {
    interceptor = new RequestLoggingInterceptor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs incoming and outgoing request', (done) => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const request = { method: 'GET', url: '/test', requestId: 'req-1' };
    const response = { statusCode: 200 };

    interceptor
      .intercept(createContext(request, response), { handle: () => of({}) } as any)
      .subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledTimes(2);
          const incoming = JSON.parse(logSpy.mock.calls[0][0]);
          expect(incoming.message).toContain('→ GET /test');
          expect(incoming.requestId).toBe('req-1');
          expect(incoming.context).toBe('HTTP');

          const outgoing = JSON.parse(logSpy.mock.calls[1][0]);
          expect(outgoing.message).toContain('← GET /test 200');
          expect(outgoing.message).toContain('ms');
          expect(outgoing.requestId).toBe('req-1');

          logSpy.mockRestore();
          done();
        },
      });
  });

  it('uses "unknown" requestId when not present', (done) => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const request = { method: 'POST', url: '/api/data' };
    const response = { statusCode: 201 };

    interceptor
      .intercept(createContext(request, response), { handle: () => of({}) } as any)
      .subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledTimes(2);
          const incoming = JSON.parse(logSpy.mock.calls[0][0]);
          expect(incoming.requestId).toBe('unknown');
          logSpy.mockRestore();
          done();
        },
      });
  });

  it('logs error responses via error handler', (done) => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const request = { method: 'DELETE', url: '/test/1', requestId: 'req-2' };
    const response = { statusCode: 404 };

    interceptor
      .intercept(createContext(request, response), { handle: () => of({}) } as any)
      .subscribe({
        complete: () => {
          const outgoing = JSON.parse(logSpy.mock.calls[1][0]);
          expect(outgoing.message).toContain('← DELETE /test/1 404');
          logSpy.mockRestore();
          done();
        },
      });
  });
});
