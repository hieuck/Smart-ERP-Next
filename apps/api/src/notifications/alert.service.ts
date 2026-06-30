import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertService {
  async sendSlack(message: string) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  }

  async sendEmail(subject: string, body: string) {
    const to = process.env.ALERT_EMAIL_TO;
    if (!to) return;
    const apiUrl = process.env.ALERT_EMAIL_API || 'http://localhost:3456/api/email/send';
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    });
  }

  async sendPagerDuty(title: string, detail: string) {
    const routingKey = process.env.PAGERDUTY_KEY;
    if (!routingKey) return;
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        payload: { summary: title, source: 'smart-erp-next', severity: 'critical', detail },
      }),
    });
  }
}
