import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from '../../tenants/tenants.service';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantsService: TenantsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantSlug = req.headers['x-tenant-id'] as string ||
                        req.query.tenant as string ||
                        req.body?.tenantId;

    if (tenantSlug) {
      const tenant = await this.tenantsService.findBySlug(tenantSlug);
      if (tenant) {
        req.tenantId = tenant.id;
      }
    }
    next();
  }
}
