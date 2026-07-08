import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map, tap } from 'rxjs';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  requestId?: string;
}

function setSafeJsonHeaders(response: any): void {
  if (!response || typeof response.setHeader !== 'function' || response.headersSent) {
    return;
  }
  // Respect content types already set by controllers (e.g., XML, CSV, PDF).
  const existing = response.getHeader?.('Content-Type') || response.getHeader?.('content-type');
  if (!existing) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function shouldSkipWrapping(data: unknown): boolean {
  // Buffers, streams, dates, and non-object payloads should not be wrapped.
  if (data === null || typeof data !== 'object') {
    return true;
  }
  if (Array.isArray(data) || data instanceof Date) {
    return true;
  }
  if (typeof (data as any).pipe === 'function' || Buffer.isBuffer(data)) {
    return true;
  }
  return false;
}

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse | unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const requestId = request.requestId;

    // Skip wrapping for auth endpoints — frontend login flow expects raw { access_token }
    const url = request.originalUrl || request.url || '';
    if (url.startsWith('/auth/') || url.startsWith('/api/auth/')) {
      return next.handle().pipe(
        tap(() => setSafeJsonHeaders(response)),
      );
    }

    return next.handle().pipe(
      map((data) => {
        if (shouldSkipWrapping(data)) {
          return data;
        }
        setSafeJsonHeaders(response);
        return {
          success: true,
          data,
          requestId,
        };
      }),
    );
  }
}
