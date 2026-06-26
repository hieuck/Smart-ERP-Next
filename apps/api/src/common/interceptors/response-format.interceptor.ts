import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  requestId?: string;
}

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.requestId;

    // Skip wrapping for auth endpoints (login/register/refresh already return compatible format)
    const path = request.route?.path || request.url || '';
    if (path.startsWith('/auth/') || path.startsWith('/api/auth/')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId,
      })),
    );
  }
}
