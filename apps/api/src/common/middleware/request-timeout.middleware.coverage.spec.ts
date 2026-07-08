import { RequestTimeoutMiddleware, DEFAULT_TIMEOUT } from './request-timeout.middleware';

function createMockRes(timeoutSetter: jest.Mock) {
  return {
    setTimeout: timeoutSetter,
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as import('express').Response;
}

describe('RequestTimeoutMiddleware', () => {
  const originalEnv = process.env.REQUEST_TIMEOUT;

  beforeEach(() => {
    delete process.env.REQUEST_TIMEOUT;
  });

  afterAll(() => {
    process.env.REQUEST_TIMEOUT = originalEnv;
  });

  it('uses DEFAULT_TIMEOUT when env is unset', () => {
    const setter = jest.fn();
    const middleware = new RequestTimeoutMiddleware();

    middleware.use({} as any, createMockRes(setter), jest.fn());

    expect(setter).toHaveBeenCalledWith(DEFAULT_TIMEOUT, expect.any(Function));
  });

  it('uses the env value when it is a positive integer', () => {
    process.env.REQUEST_TIMEOUT = '15000';
    const setter = jest.fn();
    const middleware = new RequestTimeoutMiddleware();

    middleware.use({} as any, createMockRes(setter), jest.fn());

    expect(setter).toHaveBeenCalledWith(15000, expect.any(Function));
  });

  it.each(['abc', '12.5', '0', '-5000', '', 'NaN', 'Infinity'])('falls back to DEFAULT_TIMEOUT for invalid value %s', (value) => {
    process.env.REQUEST_TIMEOUT = value;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const setter = jest.fn();
    const middleware = new RequestTimeoutMiddleware();

    middleware.use({} as any, createMockRes(setter), jest.fn());

    expect(setter).toHaveBeenCalledWith(DEFAULT_TIMEOUT, expect.any(Function));
    warnSpy.mockRestore();
  });

  it('returns 408 when timeout fires before response is sent', () => {
    const setter = jest.fn();
    const res = createMockRes(setter) as any;
    const middleware = new RequestTimeoutMiddleware();

    middleware.use({} as any, res, jest.fn());
    const handler = setter.mock.calls[0][1] as () => void;
    handler();

    expect(res.status).toHaveBeenCalledWith(408);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: 'Request timeout',
      errorCode: 'REQUEST_TIMEOUT',
    });
  });

  it('does not send 408 when headers are already sent', () => {
    const setter = jest.fn();
    const res = createMockRes(setter) as any;
    res.headersSent = true;
    const middleware = new RequestTimeoutMiddleware();

    middleware.use({} as any, res, jest.fn());
    const handler = setter.mock.calls[0][1] as () => void;
    handler();

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
