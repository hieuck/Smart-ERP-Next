import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const SLOW_THRESHOLD_MS = 1000;

@Injectable()
export class SlowQueryLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SlowQueryLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > SLOW_THRESHOLD_MS) {
          this.logger.warn(`Slow request: ${request.method} ${request.url} (${duration}ms)`);
        }
      }),
    );
  }
}
