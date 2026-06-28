import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@smart-erp.app';
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<SendMailResult> {
    if (!to || !to.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send email' };
    }
  }
}
