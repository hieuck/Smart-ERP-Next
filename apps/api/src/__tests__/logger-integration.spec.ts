import { StructuredLogger } from '../common/logger/logger.service';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs a message with level, message, context, and requestId', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.setContext('TestContext');
    logger.setRequestId('req-123');
    logger.log('test message');

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.level).toBe('log');
    expect(entry.message).toBe('test message');
    expect(entry.requestId).toBe('req-123');
    expect(entry.context).toBe('TestContext');
    expect(entry.timestamp).toBeDefined();
    spy.mockRestore();
  });

  it('logs error with trace in meta', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.setContext('ErrCtx');
    logger.error('something broke', 'stacktrace');

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('something broke');
    expect(entry.meta).toEqual({ trace: 'stacktrace' });
    spy.mockRestore();
  });

  it('logs warn through console.log', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.warn('warning message');
    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.level).toBe('warn');
    spy.mockRestore();
  });

  it('logs debug through console.log', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('debug message');
    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.level).toBe('debug');
    spy.mockRestore();
  });

  it('logs verbose through console.log', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.verbose('verbose message');
    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.level).toBe('verbose');
    spy.mockRestore();
  });

  it('serializes non-string message as JSON', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.log({ key: 'value' });
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.message).toBe(JSON.stringify({ key: 'value' }));
    spy.mockRestore();
  });

  it('uses context passed as parameter over setContext', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.setContext('DefaultCtx');
    logger.log('test', 'OverrideCtx');
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.context).toBe('OverrideCtx');
    spy.mockRestore();
  });

  it('creates unique instances with separate context', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const loggerA = new StructuredLogger();
    const loggerB = new StructuredLogger();
    loggerA.setContext('ContextA');
    loggerB.setContext('ContextB');
    loggerA.log('from a');
    loggerB.log('from b');
    const entryA = JSON.parse(logSpy.mock.calls[0][0]);
    const entryB = JSON.parse(logSpy.mock.calls[1][0]);
    expect(entryA.context).toBe('ContextA');
    expect(entryB.context).toBe('ContextB');
    logSpy.mockRestore();
  });
});
