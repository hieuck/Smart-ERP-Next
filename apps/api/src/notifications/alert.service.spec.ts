import { AlertService } from './alert.service';

describe('AlertService', () => {
  let service: AlertService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as any;
    service = new AlertService();
  });

  describe('sendSlack', () => {
    it('sends a message to Slack webhook', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
      await service.sendSlack('API is down');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('skips sending when webhook URL is not configured', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      await service.sendSlack('test alert');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('sends an email via configured endpoint', async () => {
      process.env.ALERT_EMAIL_TO = 'ops@company.com';
      await service.sendEmail('High CPU', 'CPU at 95% for 5 minutes');
      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('ops@company.com');
      expect(body.subject).toBe('High CPU');
    });

    it('skips when email config is missing', async () => {
      delete process.env.ALERT_EMAIL_TO;
      await service.sendEmail('test', 'body');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('sendPagerDuty', () => {
    it('sends a PagerDuty alert when key is configured', async () => {
      process.env.PAGERDUTY_KEY = 'pd-key-123';
      await service.sendPagerDuty('CRITICAL: DB down', 'Database unreachable');
      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.routing_key).toBe('pd-key-123');
      expect(body.event_action).toBe('trigger');
    });
  });
});
