import { RateLimitHeadersInterceptor } from './rate-limit-headers.interceptor';
import { of } from 'rxjs';

describe('RateLimitHeadersInterceptor', () => {
  let interceptor: RateLimitHeadersInterceptor;

  beforeEach(() => {
    interceptor = new RateLimitHeadersInterceptor();
  });

  it('adds X-RateLimit headers to the response', (done) => {
    const responseMock = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };
    const context = {
      switchToHttp: () => ({
        getResponse: () => responseMock,
        getRequest: () => ({}),
      }),
    } as any;

    interceptor.intercept(context, { handle: () => of({ data: 'test' }) }).subscribe({
      complete: () => {
        expect(responseMock.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
        expect(responseMock.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
        expect(responseMock.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
        done();
      },
    });
  });

  it('sets remaining count lower than limit', (done) => {
    const responseMock = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };
    const context = {
      switchToHttp: () => ({
        getResponse: () => responseMock,
        getRequest: () => ({}),
      }),
    } as any;

    interceptor.intercept(context, { handle: () => of({}) }).subscribe({
      complete: () => {
        const limit = responseMock.setHeader.mock.calls.find((c: string[]) => c[0] === 'X-RateLimit-Limit')[1];
        const remaining = responseMock.setHeader.mock.calls.find((c: string[]) => c[0] === 'X-RateLimit-Remaining')[1];
        expect(remaining).toBeLessThanOrEqual(limit);
        done();
      },
    });
  });
});
