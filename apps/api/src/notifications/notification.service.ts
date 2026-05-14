import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eq, and, desc } from 'drizzle-orm';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
}

export interface SendNotification {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateName?: string;
  subject?: string;
  body: string;
  variables?: Record<string, string>;
  priority?: NotificationPriority;
  scheduledAt?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly templates: Record<string, NotificationTemplate> = {
    order_created: {
      id: 'order_created',
      name: 'Order Created',
      channel: 'email',
      subject: 'New Order: {{orderCode}}',
      body: 'A new order {{orderCode}} has been created by {{customerName}} for {{totalAmount}}.',
      variables: ['orderCode', 'customerName', 'totalAmount'],
    },
    payment_received: {
      id: 'payment_received',
      name: 'Payment Received',
      channel: 'email',
      subject: 'Payment Received: {{orderCode}}',
      body: 'Payment of {{amount}} has been received for order {{orderCode}}.',
      variables: ['orderCode', 'amount'],
    },
    low_stock_alert: {
      id: 'low_stock_alert',
      name: 'Low Stock Alert',
      channel: 'email',
      subject: 'Low Stock: {{productName}}',
      body: 'Product {{productName}} (SKU: {{sku}}) is running low. Current stock: {{currentStock}}.',
      variables: ['productName', 'sku', 'currentStock'],
    },
    approval_required: {
      id: 'approval_required',
      name: 'Approval Required',
      channel: 'email',
      subject: 'Approval Required: {{documentType}}',
      body: 'A {{documentType}} requires your approval. Amount: {{amount}}.',
      variables: ['documentType', 'amount'],
    },
    welcome: {
      id: 'welcome',
      name: 'Welcome',
      channel: 'email',
      subject: 'Welcome to Smart ERP',
      body: 'Welcome {{userName}}! Your account has been created successfully.',
      variables: ['userName'],
    },
  };

  constructor(
    private readonly config: ConfigService,
    private readonly drizzle: DrizzleService,
  ) {}

  /** Send a notification */
  async send(tenantId: string, notification: SendNotification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Resolve template if specified
      let subject = notification.subject;
      let body = notification.body;

      if (notification.templateName && this.templates[notification.templateName]) {
        const template = this.templates[notification.templateName];
        subject = subject || template.subject;
        body = body || template.body;

        // Replace variables
        if (notification.variables) {
          for (const [key, value] of Object.entries(notification.variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject?.replace(regex, value) || '';
            body = body.replace(regex, value);
          }
        }
      }

      // Send based on channel
      let result: { success: boolean; messageId?: string; error?: string };

      switch (notification.channel) {
        case 'email':
          result = await this.sendEmail(notification.recipientEmail!, subject!, body);
          break;
        case 'sms':
          result = await this.sendSMS(notification.recipientPhone!, body);
          break;
        case 'push':
          result = await this.sendPush(notification.recipientId, subject!, body);
          break;
        case 'in_app':
          result = await this.sendInApp(tenantId, notification.recipientId, subject!, body);
          break;
        default:
          result = { success: false, error: 'Unknown channel' };
      }

      // Log notification
      await this.logNotification(tenantId, notification, result);

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /** Send bulk notifications */
  async sendBulk(tenantId: string, notifications: SendNotification[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await this.send(tenantId, notification);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  /** Get notification history */
  async getHistory(tenantId: string, recipientId?: string, limit = 50) {
    return this.drizzle.db.execute(
      sql`
        SELECT * FROM notification_logs
        WHERE tenant_id = ${tenantId}
        ${recipientId ? sql`AND recipient_id = ${recipientId}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `,
    );
  }

  /** Get available templates */
  getTemplates(): NotificationTemplate[] {
    return Object.values(this.templates);
  }

  /** Create custom template */
  async createTemplate(tenantId: string, template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    const id = crypto.randomUUID();
    const newTemplate = { ...template, id };
    // In production, save to database
    return newTemplate;
  }

  // --- Private channel implementations ---

  private async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const provider = this.config.get('EMAIL_PROVIDER') || 'sendgrid';
    const apiKey = this.config.get('EMAIL_API_KEY');

    if (!apiKey) {
      this.logger.warn('Email API key not configured');
      return { success: true, messageId: 'mock-' + Date.now() }; // Mock success in dev
    }

    try {
      if (provider === 'sendgrid') {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.config.get('EMAIL_FROM') || 'noreply@smart-erp.app' },
            subject,
            content: [{ type: 'text/html', value: body }],
          }),
        });

        if (!response.ok) throw new Error(`SendGrid error: ${response.status}`);
        return { success: true, messageId: response.headers.get('X-Message-Id') || undefined };
      }

      return { success: true, messageId: 'mock-' + Date.now() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const provider = this.config.get('SMS_PROVIDER') || 'twilio';
    const apiKey = this.config.get('SMS_API_KEY');

    if (!apiKey) {
      this.logger.warn('SMS API key not configured');
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      if (provider === 'twilio') {
        const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
        const fromNumber = this.config.get('TWILIO_FROM_NUMBER');

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${apiKey}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: fromNumber || '', Body: body }).toString(),
          }
        );

        if (!response.ok) throw new Error(`Twilio error: ${response.status}`);
        const data = await response.json();
        return { success: true, messageId: data.sid };
      }

      return { success: true, messageId: 'mock-' + Date.now() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendPush(userId: string, title: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // In production, use Firebase Cloud Messaging or Expo Push
    this.logger.log(`Push notification to ${userId}: ${title}`);
    return { success: true, messageId: 'push-' + Date.now() };
  }

  private async sendInApp(tenantId: string, userId: string, title: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // In production, save to in-app notifications table and broadcast via WebSocket
    this.logger.log(`In-app notification to ${userId}: ${title}`);
    return { success: true, messageId: 'inapp-' + Date.now() };
  }

  private async logNotification(tenantId: string, notification: SendNotification, result: { success: boolean; messageId?: string; error?: string }) {
    try {
      await this.drizzle.db.execute(
        sql`
          INSERT INTO notification_logs (tenant_id, recipient_id, channel, template_name, subject, body, status, message_id, error, created_at)
          VALUES (${tenantId}, ${notification.recipientId}, ${notification.channel}, ${notification.templateName}, ${notification.subject}, ${notification.body}, ${result.success ? 'sent' : 'failed'}, ${result.messageId}, ${result.error}, NOW())
        `,
      );
    } catch (error: any) {
      this.logger.error(`Failed to log notification: ${error.message}`);
    }
  }
}
