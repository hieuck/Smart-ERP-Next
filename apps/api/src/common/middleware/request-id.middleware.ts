import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const MAX_REQUEST_ID_LENGTH = 128;

// RFC 4122 UUID regex (versions 1-5) without importing the ESM uuid validator.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidRequestId(value: string): boolean {
  return value.length <= MAX_REQUEST_ID_LENGTH && UUID_REGEX.test(value);
}

export interface RequestWithId extends Request {
  requestId: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers['x-request-id'] as string | undefined;
    const requestId = raw && isValidRequestId(raw) ? raw : uuidv4();
    (req as RequestWithId).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
