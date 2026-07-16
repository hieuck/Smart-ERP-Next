import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'http';
import { pool } from '@smart-erp/database';

const SHUTDOWN_TIMEOUT = 30000;

@Injectable()
export class GracefulShutdownService {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private server?: Server;
  private notifyClients?: () => Promise<void>;

  setNotifyClients(fn: () => Promise<void>) {
    this.notifyClients = fn;
  }

  registerShutdown(server: Server) {
    this.server = server;

    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  private async shutdown(signal: string) {
    this.logger.log(`Received ${signal}, shutting down gracefully...`);

    // Notify WebSocket clients
    if (this.notifyClients) {
      await this.notifyClients();
    }

    const timer = setTimeout(() => {
      this.logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);
    timer.unref();

    this.server?.close(async () => {
      clearTimeout(timer);
      this.logger.log('Server closed');
      try {
        await pool.end();
        this.logger.log('Database pool closed');
      } catch (e) {
        this.logger.error('Failed to close database pool: ' + (e as any).message);
      }
      this.logger.log('Exiting');
      process.exit(0);
    });
  }
}
