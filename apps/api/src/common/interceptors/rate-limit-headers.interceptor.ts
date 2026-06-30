import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const DEFAULT_LIMIT = 200;

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  private requestCounts = new Map<string, { count: number; resetAt: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();
    const key = request.ip || 'global';
    const now = Date.now();

    let record = this.requestCounts.get(key);
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + 60_000 };
      this.requestCounts.set(key, record);
    }
    record.count++;

    const remaining = Math.max(0, DEFAULT_LIMIT - record.count);

    response.setHeader('X-RateLimit-Limit', DEFAULT_LIMIT);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    return next.handle();
  }
}
