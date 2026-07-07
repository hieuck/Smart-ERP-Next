import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
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
      catchError((err) => {
        const statusCode = err?.status ?? err?.statusCode ?? 500;
        const duration = Date.now() - now;
        this.logger.error(`← ${method} ${url} ${statusCode} ${duration}ms`);
        this.loki.error(service, `← ${method} ${url} ${statusCode} ${duration}ms`, {
          requestId,
          statusCode,
          duration,
          error: err?.message ?? String(err),
        });
        return throwError(() => err);
      }),
    );
  }
}
