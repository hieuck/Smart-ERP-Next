import { GracefulShutdownService } from './graceful-shutdown.service';

describe('GracefulShutdownService', () => {
  let service: GracefulShutdownService;
  let mockServer: { close: jest.Mock };
  let mockLogger: { log: jest.Mock; error: jest.Mock };
  let originalExit: typeof process.exit;

  beforeEach(() => {
    originalExit = process.exit;
    process.exit = jest.fn() as any;
    mockServer = { close: jest.fn((cb) => cb()) };
    mockLogger = { log: jest.fn(), error: jest.fn() };
    service = new GracefulShutdownService();
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('closes the HTTP server on SIGTERM', () => {
    service.registerShutdown(mockServer as any);
    process.emit('SIGTERM');
    expect(mockServer.close).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith('Received SIGTERM, shutting down gracefully...');
  });

  it('closes the HTTP server on SIGINT', () => {
    service.registerShutdown(mockServer as any);
    process.emit('SIGINT');
    expect(mockServer.close).toHaveBeenCalled();
  });

  it('forces exit after timeout', () => {
    jest.useFakeTimers();
    mockServer.close = jest.fn();
    service = new GracefulShutdownService();
    (service as any).logger = mockLogger;
    service.registerShutdown(mockServer as any);
    process.emit('SIGTERM');
    jest.advanceTimersByTime(31000);
    expect(mockLogger.error).toHaveBeenCalledWith('Forced shutdown after timeout');
    jest.useRealTimers();
  });
});
