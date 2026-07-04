import { of, lastValueFrom } from 'rxjs';
import { ResponseFormatInterceptor } from './response-format.interceptor';

describe('ResponseFormatInterceptor', () => {
  let interceptor: ResponseFormatInterceptor;

  beforeEach(() => {
    interceptor = new ResponseFormatInterceptor();
  });

  function mockContext(url: string, headersSent = false) {
    const setHeader = jest.fn();
    const request = { originalUrl: url, requestId: 'req-123' };
    const response = { headersSent, setHeader };
    return {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
      response,
      setHeader,
      request,
    };
  }

  it('wraps non-auth JSON responses and sets safe JSON headers', async () => {
    const ctx = mockContext('/api/v1/products') as any;
    const handler = { handle: () => of({ id: 1 }) };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ success: true, data: { id: 1 }, requestId: 'req-123' });
    expect(ctx.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    expect(ctx.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('does not wrap auth endpoints but still sets safe JSON headers', async () => {
    const ctx = mockContext('/auth/login') as any;
    const handler = { handle: () => of({ access_token: 'token' }) };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ access_token: 'token' });
    expect(ctx.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    expect(ctx.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('does not set headers when response is already sent', async () => {
    const ctx = mockContext('/api/v1/products', true) as any;
    const handler = { handle: () => of({ id: 2 }) };

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ success: true, data: { id: 2 }, requestId: 'req-123' });
    expect(ctx.setHeader).not.toHaveBeenCalled();
  });

  it('tolerates a response object without setHeader', async () => {
    const request = { originalUrl: '/api/v1/products', requestId: 'req-456' };
    const response = {};
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as any;
    const handler = { handle: () => of({ id: 3 }) };

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ success: true, data: { id: 3 }, requestId: 'req-456' });
  });
});
