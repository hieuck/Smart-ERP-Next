jest.mock('uuid', () => ({
  v4: () => 'generated-request-id',
}));

import { RequestIdMiddleware, RequestWithId } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  const validRequestId = '550e8400-e29b-41d4-a716-446655440000';

  it('keeps a valid incoming UUID request id and forwards it to the response', () => {
    const middleware = new RequestIdMiddleware();
    const req: any = { headers: { 'x-request-id': validRequestId } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res as any, next);

    expect((req as RequestWithId).requestId).toBe(validRequestId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', validRequestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a request id when the caller does not provide one', () => {
    const middleware = new RequestIdMiddleware();
    const req: any = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res as any, next);

    expect((req as RequestWithId).requestId).toBe('generated-request-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'generated-request-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new request id when the header is not a valid UUID', () => {
    const middleware = new RequestIdMiddleware();
    const req: any = { headers: { 'x-request-id': 'req-123' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res as any, next);

    expect((req as RequestWithId).requestId).toBe('generated-request-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'generated-request-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new request id when the header exceeds the maximum length', () => {
    const middleware = new RequestIdMiddleware();
    const longRequestId = validRequestId + 'a'.repeat(200);
    const req: any = { headers: { 'x-request-id': longRequestId } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res as any, next);

    expect((req as RequestWithId).requestId).toBe('generated-request-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'generated-request-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new request id when the header contains CRLF control characters', () => {
    const middleware = new RequestIdMiddleware();
    const req: any = { headers: { 'x-request-id': '550e8400-e29b-41d4-a716-446655440000\r\nX-Injected: yes' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res as any, next);

    expect((req as RequestWithId).requestId).toBe('generated-request-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'generated-request-id');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
