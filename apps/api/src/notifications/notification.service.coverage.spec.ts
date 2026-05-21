jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { NotificationService } from './notification.service';

describe('NotificationService coverage', () => {
  const config = { get: jest.fn() };
  const db = { execute: jest.fn() };
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    config.get.mockReturnValue(undefined);
    db.execute.mockResolvedValue([]);
    service = new NotificationService(config as any, { db } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it('sends templated email, sms, push, and in-app notifications and records bulk counts', async () => {
    const email = await service.send('tenant-1', {
      recipientId: 'user-1',
      recipientEmail: 'buyer@example.com',
      channel: 'email',
      templateName: 'order_created',
      body: '',
      variables: {
        orderCode: 'SO-001',
        customerName: 'Cong ty ABC',
        totalAmount: '1000000',
      },
    });
    expect(email).toEqual({ success: true, messageId: 'mock-1770000000000' });

    const sms = await service.send('tenant-1', {
      recipientId: 'user-2',
      recipientPhone: '+84900000000',
      channel: 'sms',
      body: 'Thanh toan thanh cong',
    });
    const push = await service.send('tenant-1', {
      recipientId: 'user-3',
      channel: 'push',
      subject: 'Can duyet',
      body: 'Don hang can duyet',
    });
    const inApp = await service.send('tenant-1', {
      recipientId: 'user-4',
      channel: 'in_app',
      subject: 'Thong bao',
      body: 'Da dong bo',
    });

    expect([sms.success, push.success, inApp.success]).toEqual([true, true, true]);
    expect(db.execute).toHaveBeenCalledTimes(4);

    jest.spyOn(service, 'send')
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'bad channel' });

    await expect(service.sendBulk('tenant-1', [
      { recipientId: 'ok', channel: 'push', subject: 'Ok', body: 'Ok' },
      { recipientId: 'bad', channel: 'push', subject: 'Bad', body: 'Bad' },
    ])).resolves.toEqual({ sent: 1, failed: 1 });
  });

  it('handles provider success and failure branches', async () => {
    config.get.mockImplementation((key: string) => ({
      EMAIL_PROVIDER: 'sendgrid',
      EMAIL_API_KEY: 'email-key',
      EMAIL_FROM: 'no-reply@example.com',
      SMS_PROVIDER: 'twilio',
      SMS_API_KEY: 'sms-key',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_FROM_NUMBER: '+84000000000',
    } as Record<string, string>)[key]);

    (global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: jest.fn(() => 'sendgrid-message') },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ sid: 'twilio-message' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(service.send('tenant-1', {
      recipientId: 'user-1',
      recipientEmail: 'buyer@example.com',
      channel: 'email',
      subject: 'Invoice',
      body: 'Paid',
    })).resolves.toEqual({ success: true, messageId: 'sendgrid-message' });
    await expect(service.send('tenant-1', {
      recipientId: 'user-2',
      recipientPhone: '+84900000000',
      channel: 'sms',
      body: 'OTP',
    })).resolves.toEqual({ success: true, messageId: 'twilio-message' });
    await expect(service.send('tenant-1', {
      recipientId: 'user-3',
      recipientEmail: 'buyer@example.com',
      channel: 'email',
      subject: 'Retry',
      body: 'Retry',
    })).resolves.toEqual({ success: false, error: 'SendGrid error: 503' });

    config.get.mockImplementation((key: string) => ({
      EMAIL_PROVIDER: 'sendgrid',
      EMAIL_API_KEY: 'email-key',
    } as Record<string, string>)[key]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: jest.fn(() => null) },
    });
    await expect(service.send('tenant-1', {
      recipientId: 'user-4',
      recipientEmail: 'buyer@example.com',
      channel: 'email',
      subject: 'Default From',
      body: 'No message id',
    })).resolves.toEqual({ success: true, messageId: undefined });
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[3][1].body).from.email).toBe('noreply@smart-erp.app');
  });

  it('falls back for non-primary providers and reports SMS provider failures', async () => {
    config.get.mockImplementation((key: string) => ({
      EMAIL_PROVIDER: 'mailgun',
      EMAIL_API_KEY: 'email-key',
      SMS_PROVIDER: 'nexmo',
      SMS_API_KEY: 'sms-key',
    } as Record<string, string>)[key]);

    await expect(service.send('tenant-1', {
      recipientId: 'user-1',
      recipientEmail: 'buyer@example.com',
      channel: 'email',
      subject: 'Mailgun',
      body: 'Fallback',
    })).resolves.toEqual({ success: true, messageId: 'mock-1770000000000' });

    await expect(service.send('tenant-1', {
      recipientId: 'user-2',
      recipientPhone: '+84900000000',
      channel: 'sms',
      body: 'Fallback',
    })).resolves.toEqual({ success: true, messageId: 'mock-1770000000000' });

    config.get.mockImplementation((key: string) => ({
      SMS_PROVIDER: 'twilio',
      SMS_API_KEY: 'sms-key',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_FROM_NUMBER: '+84000000000',
    } as Record<string, string>)[key]);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(service.send('tenant-1', {
      recipientId: 'user-3',
      recipientPhone: '+84900000001',
      channel: 'sms',
      body: 'Fail',
    })).resolves.toEqual({ success: false, error: 'Twilio error: 500' });

    config.get.mockImplementation((key: string) => ({
      SMS_PROVIDER: 'twilio',
      SMS_API_KEY: 'sms-key',
      TWILIO_ACCOUNT_SID: 'AC123',
    } as Record<string, string>)[key]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ sid: 'twilio-no-from' }),
    });
    await expect(service.send('tenant-1', {
      recipientId: 'user-4',
      recipientPhone: '+84900000002',
      channel: 'sms',
      body: 'No from number',
    })).resolves.toEqual({ success: true, messageId: 'twilio-no-from' });
    expect((global.fetch as jest.Mock).mock.calls[1][1].body).toContain('From=');
  });

  it('returns templates/history and isolates logging or channel errors', async () => {
    expect(service.getTemplates().map((template) => template.id)).toContain('low_stock_alert');
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('template-1');
    await expect(service.createTemplate('tenant-1', {
      name: 'Custom',
      channel: 'email',
      subject: 'Hi {{name}}',
      body: 'Welcome {{name}}',
      variables: ['name'],
    })).resolves.toMatchObject({ id: 'template-1', name: 'Custom' });

    db.execute.mockResolvedValueOnce([{ id: 'log-1' }]);
    await expect(service.getHistory('tenant-1', 'user-1', 5)).resolves.toEqual([{ id: 'log-1' }]);
    db.execute.mockResolvedValueOnce([{ id: 'log-default' }]);
    await expect(service.getHistory('tenant-1')).resolves.toEqual([{ id: 'log-default' }]);

    db.execute.mockRejectedValueOnce(new Error('log failed'));
    await expect(service.send('tenant-1', {
      recipientId: 'user-1',
      channel: 'unknown' as any,
      body: 'No channel',
    })).resolves.toEqual({ success: false, error: 'Unknown channel' });

    (service as any).templates.no_subject = {
      id: 'no_subject',
      name: 'No Subject',
      channel: 'in_app',
      body: 'Hello {{name}}',
      variables: ['name'],
    };
    await expect(service.send('tenant-1', {
      recipientId: 'user-2',
      channel: 'in_app',
      templateName: 'no_subject',
      body: '',
      variables: { name: 'Lan' },
    })).resolves.toEqual({ success: true, messageId: 'inapp-1770000000000' });

    jest.spyOn(service as any, 'sendPush').mockRejectedValueOnce(new Error('push offline'));
    await expect(service.send('tenant-1', {
      recipientId: 'user-1',
      channel: 'push',
      subject: 'Offline',
      body: 'Push offline',
    })).resolves.toEqual({ success: false, error: 'push offline' });
  });
});
