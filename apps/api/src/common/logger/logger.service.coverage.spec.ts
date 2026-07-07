import { StructuredLogger } from './logger.service';

jest.mock('fs', () => ({
  appendFile: jest.fn(),
  appendFileSync: jest.fn(),
}));

const { appendFile, appendFileSync } = jest.requireMock('fs') as {
  appendFile: jest.Mock;
  appendFileSync: jest.Mock;
};

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new StructuredLogger();
    logger.setLogFile('/tmp/app.log');
  });

  it('writes log entries asynchronously', () => {
    logger.log('hello');
    expect(appendFile).toHaveBeenCalled();
    expect(appendFileSync).not.toHaveBeenCalled();
    expect(appendFile.mock.calls[0][0]).toBe('/tmp/app.log');
  });

  it('writes error log entries asynchronously', () => {
    logger.error('oops', 'trace-1');
    expect(appendFile).toHaveBeenCalled();
    expect(appendFileSync).not.toHaveBeenCalled();
  });

  it('does not write when no log file is configured', () => {
    const noFileLogger = new StructuredLogger();
    noFileLogger.log('hello');
    expect(appendFile).not.toHaveBeenCalled();
    expect(appendFileSync).not.toHaveBeenCalled();
  });
});
