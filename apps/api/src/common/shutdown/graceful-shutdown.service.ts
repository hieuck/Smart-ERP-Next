import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'http';

const SHUTDOWN_TIMEOUT = 30000;

@Injectable()
export class GracefulShutdownService {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private server?: Server;

  registerShutdown(server: Server) {
    this.server = server;

    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  private shutdown(signal: string) {
    this.logger.log(`Received ${signal}, shutting down gracefully...`);

    const timer = setTimeout(() => {
      this.logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);
    timer.unref();

    this.server?.close(() => {
      clearTimeout(timer);
      this.logger.log('Server closed, exiting');
      process.exit(0);
    });
  }
}
