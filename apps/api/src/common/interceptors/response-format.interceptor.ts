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
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse> {
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

    setSafeJsonHeaders(response);

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId,
      })),
    );
  }
}
