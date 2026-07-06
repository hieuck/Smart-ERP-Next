import { ForbiddenException } from '@nestjs/common';
import { TenantMiddleware, TenantRequest } from './tenant.middleware';
import { DrizzleService } from '../drizzle/drizzle.service';
import { Response, NextFunction } from 'express';

jest.mock('drizzle-orm', () => ({
  sql: jest.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      query: {
        sql: strings.join('?'),
        params: values,
      },
    }),
  ),
}));

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let drizzle: DrizzleService;
  let executeMock: jest.Mock;

  const createRequest = (tenantId: string, user?: TenantRequest['user']) => {
    return {
      headers: { 'x-tenant-id': tenantId },
      user,
    } as unknown as TenantRequest;
  };

  const createResponse = () => ({}) as unknown as Response;

  beforeEach(() => {
    executeMock = jest.fn().mockResolvedValue({ rows: [] });
    drizzle = {
      db: { execute: executeMock },
    } as unknown as DrizzleService;
    middleware = new TenantMiddleware(drizzle);
  });

  describe('tenant RLS context', () => {
    it('resets any stale tenant context before setting the current tenant', async () => {
      const req = createRequest('tenant-1');
      const res = createResponse();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(executeMock).toHaveBeenCalledTimes(2);

      const first = sqlQuery(executeMock.mock.calls[0][0]);
      expect(first.sql).toContain('SET app.current_tenant_id =');
      expect(first.params).toEqual(['']);

      const second = sqlQuery(executeMock.mock.calls[1][0]);
      expect(second.sql).toContain('SET app.current_tenant_id =');
      expect(second.params).toEqual(['tenant-1']);
    });

    it('does not leak stale tenant context between requests', async () => {
      // Simulate connection reused with old tenant context
      executeMock.mockClear();

      const req = createRequest('tenant-2');
      const res = createResponse();
      const next = jest.fn();

      await middleware.use(req, res, next);

      const setStatements = executeMock.mock.calls
        .map((call) => sqlQuery(call[0]))
        .filter((q) => q.sql.includes('SET app.current_tenant_id'))
        .map((q) => q.params[0]);

      expect(setStatements).toEqual(['', 'tenant-2']);
    });
  });

  describe('tenant validation', () => {
    it('throws ForbiddenException when X-Tenant-ID header is missing', async () => {
      const req = { headers: {}, user: undefined } as unknown as TenantRequest;
      const res = createResponse();
      const next = jest.fn();

      await expect(middleware.use(req, res, next)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

function sqlQuery(value: unknown): { sql: string; params: unknown[] } {
  return (value as any)?.query ?? { sql: String(value), params: [] };
}
