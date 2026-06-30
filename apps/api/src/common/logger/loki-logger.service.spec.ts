import { LokiLoggerService } from './loki-logger.service';

describe('LokiLoggerService', () => {
  let service: LokiLoggerService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as any;
    service = new LokiLoggerService();
    (service as any).lokiUrl = 'http://loki:3100/loki/api/v1/push';
  });

  describe('log', () => {
    it('sends a log entry to Loki', async () => {
      await service.log('info', 'test-service', 'User login', { userId: 'u1' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://loki:3100/loki/api/v1/push',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('includes correct log level label', async () => {
      await service.log('error', 'api', 'DB connection failed', { db: 'postgres' });
      const callArg = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArg.streams[0].stream.level).toBe('error');
      expect(callArg.streams[0].stream.service).toBe('api');
    });

    it('includes log message and metadata in values', async () => {
      await service.log('warn', 'api', 'Slow query detected', { duration: '5s' });
      const callArg = JSON.parse(mockFetch.mock.calls[0][1].body);
      const logLine = callArg.streams[0].values[0][1];
      expect(logLine).toContain('Slow query detected');
      expect(logLine).toContain('5s');
    });
  });

  describe('error', () => {
    it('sends error level logs to Loki', async () => {
      await service.error('api', 'Unhandled rejection', { stack: 'Error' });
      const callArg = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArg.streams[0].stream.level).toBe('error');
    });

    it('does not throw when Loki is unreachable', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      await expect(service.error('api', 'test error', {})).resolves.toBeUndefined();
    });
  });
});
