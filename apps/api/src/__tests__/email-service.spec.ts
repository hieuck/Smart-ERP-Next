jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-msg-id' }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

import { EmailService } from '../email/email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new (EmailService as any)();
    (service as any).transporter = require('nodemailer').createTransport();
  });

  it('can be instantiated', () => {
    expect(service).toBeDefined();
  });

  it('sendMail returns messageId on success', async () => {
    const result = await service.sendMail('test@example.com', 'Subject', '<p>Body</p>');
    expect(result).toHaveProperty('messageId');
  });

  it('sendMail accepts plain text body', async () => {
    const result = await service.sendMail('test@example.com', 'Subject', 'Plain body');
    expect(result).toHaveProperty('messageId');
  });

  it('sendMail returns error for invalid email', async () => {
    const result = await service.sendMail('not-an-email', 'Subject', 'Body');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email address');
  });
});
