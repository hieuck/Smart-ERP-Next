import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { StructuredLogger } from '../logger/logger.service';
import { LokiLoggerService } from '../logger/loki-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger();
  private readonly loki = new LokiLoggerService();

  constructor() { this.logger.setContext('HTTP'); }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const requestId = request.requestId || 'unknown';
    const service = 'api';
    this.logger.setRequestId(requestId);
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);
    this.loki.log('info', service, `→ ${method} ${url}`, { requestId });

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;
        this.logger.log(`← ${method} ${url} ${statusCode} ${duration}ms`);
        this.loki.log('info', service, `← ${method} ${url} ${statusCode} ${duration}ms`, { requestId, statusCode, duration });
      }),
    );
  }
}
