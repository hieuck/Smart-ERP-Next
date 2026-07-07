import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Optional } from '@nestjs/common';
import { ErrorCode } from './error-codes';

interface IdempotencyRecord {
  statusCode: number;
  body: any;
  createdAt: number;
}

interface IdempotencyGuardOptions {
  ttlMs?: number;
  maxRecords?: number;
  now?: () => number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_RECORDS = 10_000;

@Injectable()
export class IdempotencyGuard implements CanActivate {
  private store = new Map<string, IdempotencyRecord>();
  private readonly ttlMs: number;
  private readonly maxRecords: number;
  private readonly now: () => number;

  constructor(@Optional() options: IdempotencyGuardOptions = {}) {
    this.ttlMs = options.ttlMs ?? IdempotencyGuard.parsePositiveInt(
      process.env.IDEMPOTENCY_TTL_MS,
      DEFAULT_TTL_MS,
      'IDEMPOTENCY_TTL_MS',
    );
    this.maxRecords = options.maxRecords ?? IdempotencyGuard.parsePositiveInt(
      process.env.IDEMPOTENCY_MAX_RECORDS,
      DEFAULT_MAX_RECORDS,
      'IDEMPOTENCY_MAX_RECORDS',
    );
    this.now = options.now ?? Date.now;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.method !== 'POST' && request.method !== 'PATCH') {
      return true;
    }

    const key = request.headers['idempotency-key'];
    if (!key) return true;

    this.pruneExpiredRecords();

    const user = request.user ?? {};
    const tenantId = user.tenantId ?? '';
    const userId = user.userId ?? user.id ?? '';
    const scope = `${tenantId}:${userId}:${request.method}:${request.originalUrl || request.url || request.path || ''}:${key}`;
    const existing = this.store.get(scope);
    if (existing) {
      if (existing.statusCode) {
        response.status(existing.statusCode).json(existing.body);
        return false;
      }
      throw new HttpException(
        { success: false, data: null, error: ErrorCode.IDEMPOTENCY_REPLAY },
        HttpStatus.CONFLICT,
      );
    }

    this.evictOldestRecordIfNeeded();

    const createdAt = this.now();
    this.store.set(scope, { statusCode: 0, body: null, createdAt });
    const originalJson = response.json.bind(response);
    response.json = (body: any) => {
      this.store.set(scope, { statusCode: response.statusCode, body, createdAt });
      originalJson(body);
    };

    return true;
  }

  private pruneExpiredRecords() {
    const expiresBefore = this.now() - this.ttlMs;

    for (const [scope, record] of this.store.entries()) {
      if (record.createdAt <= expiresBefore) {
        this.store.delete(scope);
      }
    }
  }

  private evictOldestRecordIfNeeded() {
    if (this.store.size < this.maxRecords) return;

    const oldestScope = this.store.keys().next().value;
    if (oldestScope) {
      this.store.delete(oldestScope);
    }
  }

  private static parsePositiveInt(
    value: string | undefined,
    defaultValue: number,
    name: string,
  ): number {
    if (!value) return defaultValue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      console.warn(`Invalid ${name} "${value}", using default ${defaultValue}`);
      return defaultValue;
    }
    return parsed;
  }
}
