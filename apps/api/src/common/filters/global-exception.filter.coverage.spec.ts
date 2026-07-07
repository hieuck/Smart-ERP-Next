import { GlobalExceptionFilter } from './global-exception.filter';
import { HttpException, Logger } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let errorSpy: jest.SpyInstance;

  const makeHost = (exception: any) => ({
    switchToHttp: () => ({
      getResponse: () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }),
      getRequest: () => ({
        requestId: 'req-1',
        url: '/api/test',
        method: 'GET',
      }),
    }),
  } as any);

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs unknown errors with stack trace and request context', () => {
    const exception = new Error('boom');
    const host = makeHost(exception);
    filter.catch(exception, host);
    expect(errorSpy).toHaveBeenCalled();
    const [message, trace, context] = errorSpy.mock.calls[0];
    expect(message).toContain('GET /api/test');
    expect(trace).toContain('boom');
    expect(context).toBe('GlobalExceptionFilter');
  });

  it('logs HttpException errors without exposing sensitive internals', () => {
    const exception = new HttpException('Not allowed', 403);
    const host = makeHost(exception);
    filter.catch(exception, host);
    expect(errorSpy).toHaveBeenCalled();
    const [message] = errorSpy.mock.calls[0];
    expect(message).toContain('GET /api/test 403');
  });
});
