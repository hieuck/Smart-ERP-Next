import { of, lastValueFrom } from 'rxjs';
import { ResponseFormatInterceptor } from './response-format.interceptor';

function createExecutionContext(responseOverrides: Record<string, unknown> = {}) {
  const setHeader = jest.fn();
  const response = {
    headersSent: false,
    setHeader,
    getHeader: jest.fn((name: string) => responseOverrides[name]),
    ...responseOverrides,
  };
  const request = { requestId: 'req-1', originalUrl: '/invoices/123/xml' };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };
}

describe('ResponseFormatInterceptor', () => {
  let interceptor: ResponseFormatInterceptor;

  beforeEach(() => {
    interceptor = new ResponseFormatInterceptor();
  });

  it('wraps JSON responses and sets JSON content-type when no content-type is set', async () => {
    const ctx = createExecutionContext() as any;
    const handler = { handle: () => of({ id: '1' }) };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ success: true, data: { id: '1' }, requestId: 'req-1' });
    expect(ctx.switchToHttp().getResponse().setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(ctx.switchToHttp().getResponse().setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('does not override an existing content-type', async () => {
    const ctx = createExecutionContext({ 'content-type': 'application/xml' }) as any;
    const handler = { handle: () => of('<invoice/>') };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual('<invoice/>');
    expect(ctx.switchToHttp().getResponse().setHeader).not.toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
  });

  it('skips wrapping for Buffer responses', async () => {
    const ctx = createExecutionContext() as any;
    const handler = { handle: () => of(Buffer.from('pdf-bytes')) };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(ctx.switchToHttp().getResponse().setHeader).not.toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
  });

  it('skips wrapping for string responses that look like XML', async () => {
    const ctx = createExecutionContext() as any;
    const handler = { handle: () => of('<?xml version="1.0"?><invoice/>') };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(result).toBe('<?xml version="1.0"?><invoice/>');
    expect(ctx.switchToHttp().getResponse().setHeader).not.toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
  });

  it('skips wrapping for auth endpoints while still setting safe JSON headers', async () => {
    const request = { requestId: 'req-2', originalUrl: '/auth/login' };
    const setHeader = jest.fn();
    const response = { headersSent: false, setHeader };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as any;
    const handler = { handle: () => of({ access_token: 'token' }) };

    const result$ = interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ access_token: 'token' });
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });
});
