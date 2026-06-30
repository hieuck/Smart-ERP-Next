import { SlowQueryLoggerInterceptor } from './slow-query-logger.interceptor';
import { of, delay } from 'rxjs';

describe('SlowQueryLoggerInterceptor', () => {
  let interceptor: SlowQueryLoggerInterceptor;
  let mockLogger: { warn: jest.Mock };

  beforeEach(() => {
    mockLogger = { warn: jest.fn() };
    interceptor = new SlowQueryLoggerInterceptor();
    (interceptor as any).logger = mockLogger;
  });

  it('passes through the response without modification', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/api/test', method: 'GET' }),
      }),
    } as any;

    interceptor.intercept(context, { handle: () => of({ data: 'test' }) }).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('warns on requests taking longer than 1s threshold', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/api/slow', method: 'POST' }),
      }),
    } as any;

    // Mock Date.now to simulate time passing beyond threshold
    const origNow = Date.now;
    let callCount = 0;
    Date.now = jest.fn(() => {
      callCount++;
      return callCount === 1 ? 0 : 1500; // 1.5s elapsed
    });

    interceptor.intercept(context, { handle: () => of({}) }).subscribe({
      complete: () => {
        Date.now = origNow;
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Slow request'),
        );
        done();
      },
    });
  });
});
