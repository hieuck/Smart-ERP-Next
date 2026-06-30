import { Injectable } from '@nestjs/common';

interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

@Injectable()
export class LokiLoggerService {
  private readonly lokiUrl: string;

  constructor() {
    this.lokiUrl = process.env.LOKI_URL || 'http://loki:3100/loki/api/v1/push';
  }

  async log(level: string, service: string, message: string, meta: Record<string, any> = {}) {
    await this.push([{
      stream: { level, service },
      values: [[String(Date.now() * 1_000_000), JSON.stringify({ message, ...meta })]],
    }]);
  }

  async error(service: string, message: string, meta: Record<string, any> = {}) {
    await this.log('error', service, message, meta);
  }

  private async push(streams: LokiStream[]) {
    try {
      await fetch(this.lokiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streams }),
      });
    } catch {
      // silently fail — don't crash the app if Loki is down
    }
  }
}
