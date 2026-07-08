import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
  }),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
  });

  it.each(['', 'a@b', '@example.com', 'user@', 'user@domain', 'a,b@example.com', 'a@example.com;b@example.com'])(
    'rejects invalid email address "%s"',
    async (to) => {
      const result = await service.sendMail(to, 'subject', '<p>hi</p>');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    },
  );

  it('accepts a valid email address and sends mail', async () => {
    const result = await service.sendMail('user@example.com', 'subject', '<p>hi</p>');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-1');
  });

  it('rejects a subject longer than 998 characters', async () => {
    const longSubject = 'a'.repeat(999);
    const result = await service.sendMail('user@example.com', longSubject, '<p>hi</p>');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Subject too long');
  });

  it('rejects an HTML body larger than 5 MB', async () => {
    const hugeHtml = 'a'.repeat(5 * 1024 * 1024 + 1);
    const result = await service.sendMail('user@example.com', 'subject', hugeHtml);
    expect(result.success).toBe(false);
    expect(result.error).toBe('HTML body too large');
  });
});
