import { SetMetadata } from '@nestjs/common';
import { AUDIT_LOG_KEY } from '../interceptors/audit-log.interceptor';

export const AuditLog = (action: string, resource: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, resource });
