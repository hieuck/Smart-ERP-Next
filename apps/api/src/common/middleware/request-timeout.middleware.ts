import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const DEFAULT_TIMEOUT = 30_000;

function resolveTimeout(envValue: string | undefined): number {
  if (envValue === undefined || envValue.trim() === '') {
    return DEFAULT_TIMEOUT;
  }

  const parsed = Number(envValue);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    Logger.warn(
      `REQUEST_TIMEOUT value "${envValue}" is not a positive integer; falling back to ${DEFAULT_TIMEOUT}ms`,
      RequestTimeoutMiddleware.name,
    );
    return DEFAULT_TIMEOUT;
  }

  return parsed;
}

@Injectable()
export class RequestTimeoutMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const timeout = resolveTimeout(process.env.REQUEST_TIMEOUT);

    res.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          data: null,
          error: 'Request timeout',
          errorCode: 'REQUEST_TIMEOUT',
        });
      }
    });
    next();
  }
}
