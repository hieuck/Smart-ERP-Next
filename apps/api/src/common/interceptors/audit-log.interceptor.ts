import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, from, switchMap, catchError } from 'rxjs';
import { ActivityService } from '../../modules/activity/activity.service';

export const AUDIT_LOG_KEY = 'audit_log';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditConfig = Reflect.getMetadata(AUDIT_LOG_KEY, context.getHandler());
    if (!auditConfig) return next.handle();

    const request = context.switchToHttp().getRequest();
    const { action, resource } = auditConfig;
    const userId = request.user?.sub ?? request.user?.userId;
    const tenantId = request.user?.tenantId;

    return next.handle().pipe(
      switchMap((response: any) => {
        const entityId = response?.id ?? response?.data?.id ?? '';
        return from(this.activityService.log(tenantId, userId, action, resource, entityId, {
          method: request.method,
          url: request.url,
          body: request.body,
        }).then(() => response).catch((err) => {
          this.logger.warn('audit-log write failed (success path)', err);
          return response;
        }));
      }),
      catchError(async (err) => {
        try {
          await this.activityService.log(tenantId, userId, action, resource, '', {
            method: request.method,
            url: request.url,
            body: request.body,
            error: true,
          });
        } catch (logErr) {
          this.logger.error('audit-log write failed (error path)', logErr);
        }
        throw err;
      }),
    );
  }
}
