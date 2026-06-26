import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { StructuredLogger } from '../logger/logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger();
  constructor() { this.logger.setContext('HTTP'); }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const requestId = request.requestId || 'unknown';
    this.logger.setRequestId(requestId);
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;
        this.logger.log(`← ${method} ${url} ${statusCode} ${duration}ms`);
      }),
    );
  }
}
