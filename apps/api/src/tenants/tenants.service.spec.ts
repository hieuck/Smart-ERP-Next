import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';

jest.mock('@smart-erp/database', () => {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
  };
  return {
    db: {
      select: jest.fn(() => chain),
      insert: jest.fn(() => chain),
      update: jest.fn(() => chain),
      delete: jest.fn(() => chain),
    },
  };
});

import { db } from '@smart-erp/database';

describe('TenantsService tenant scoping', () => {
  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';
  let service: TenantsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantsService();
  });

  it('findOneForTenant rejects cross-tenant access', async () => {
    await expect(service.findOneForTenant(tenantA, tenantB)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('findAllForTenant returns only the caller tenant', async () => {
    const chain = (db.select as jest.Mock)().where().returning;
    (db.select as jest.Mock)().where.mockReturnValueOnce({
      returning: jest.fn().mockResolvedValue([{ id: tenantA, name: 'Tenant A' }]),
    });
    (db.select as jest.Mock).mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: tenantA, name: 'Tenant A' }]),
      }),
    });

    const result = await service.findAllForTenant(tenantA);
    expect(result).toEqual([{ id: tenantA, name: 'Tenant A' }]);
    void chain;
  });

  it('updateForTenant rejects cross-tenant access', async () => {
    await expect(
      service.updateForTenant(tenantA, tenantB, { name: 'Hacked' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removeForTenant rejects cross-tenant access', async () => {
    await expect(service.removeForTenant(tenantA, tenantB)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('findOneForTenant propagates not found for own tenant', async () => {
    (db.select as jest.Mock).mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(service.findOneForTenant(tenantA, tenantA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
