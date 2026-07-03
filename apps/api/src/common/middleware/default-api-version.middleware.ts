import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { API_VERSION_HEADER, API_CURRENT_VERSION } from '../api-versioning';

/**
 * Ensures every incoming request carries the configured API version header.
 *
 * NestJS header versioning does not fall back to `defaultVersion` when the
 * version header is absent, which causes all versioned routes to return 404
 * for clients that do not send `X-API-Version` (e.g. CI health checks and
 * legacy E2E tests). This middleware injects the current default version so
 * those requests are routed correctly while still allowing explicit versions
 * to override it.
 */
@Injectable()
export class DefaultApiVersionMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const headerName = API_VERSION_HEADER.toLowerCase();
    if (!req.headers[headerName]) {
      req.headers[headerName] = API_CURRENT_VERSION;
    }
    next();
  }
}
