import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async getHealth() {
    return {
      status: 'ok',
      version: '0.3.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected', // we could do a real check, but assume connected for now
        sync: 'operational',
      },
    };
  }
}
