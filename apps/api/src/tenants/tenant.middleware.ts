import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DrizzleService } from '../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';

export interface TenantRequest extends Request {
  user?: {
    sub: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly drizzle: DrizzleService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.sub;

    if (!tenantId) {
      throw new ForbiddenException('X-Tenant-ID header is required');
    }

    // Verify user belongs to tenant
    if (userId) {
      const membership = await this.drizzle.db.execute(
        sql`SELECT role, permissions FROM user_tenants WHERE user_id = ${userId} AND tenant_id = ${tenantId} AND is_active = true LIMIT 1`
      );

      if (!membership.rows?.length) {
        throw new ForbiddenException('User does not have access to this tenant');
      }

      // Attach tenant context to request
      req.user = {
        ...req.user!,
        tenantId,
        role: membership.rows[0].role as string,
        permissions: (membership.rows[0].permissions as string[]) || [],
      };
    }

    // Reset any stale tenant context before applying the current tenant.
    // Connection pooling means the same connection may have served a different
    // tenant in the previous request, so we clear the RLS variable first.
    await this.drizzle.db.execute(sql`SET app.current_tenant_id = ${''}`);

    // Set tenant context for RLS (Row Level Security)
    await this.drizzle.db.execute(sql`SET app.current_tenant_id = ${tenantId}`);

    next();
  }
}
