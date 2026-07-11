import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

describe('TenantsController authorization', () => {
  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';

  const service = {
    create: jest.fn(),
    findAllForTenant: jest.fn(),
    findOneForTenant: jest.fn(),
    updateForTenant: jest.fn(),
    removeForTenant: jest.fn(),
  };

  const controller = new TenantsController(service as unknown as TenantsService);

  const req = (tenantId: string, role = 'staff') => ({
    user: { tenantId, role, sub: 'user-1', email: 'user@test.com' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findAll returns only the caller tenant', async () => {
    service.findAllForTenant.mockResolvedValue([{ id: tenantA, name: 'A' }]);

    await expect(controller.findAll(req(tenantA) as any)).resolves.toEqual([
      { id: tenantA, name: 'A' },
    ]);
    expect(service.findAllForTenant).toHaveBeenCalledWith(tenantA);
  });

  it('findOne rejects access to another tenant', async () => {
    service.findOneForTenant.mockRejectedValue(
      new ForbiddenException('Tenant access denied'),
    );

    await expect(
      controller.findOne(req(tenantA) as any, tenantB),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findOneForTenant).toHaveBeenCalledWith(tenantA, tenantB);
  });

  it('update rejects non-admin callers', () => {
    expect(() =>
      controller.update(req(tenantA, 'staff') as any, tenantA, { name: 'New' }),
    ).toThrow(ForbiddenException);
    expect(service.updateForTenant).not.toHaveBeenCalled();
  });

  it('update allows admin for own tenant', async () => {
    service.updateForTenant.mockResolvedValue({ id: tenantA, name: 'New' });

    await expect(
      controller.update(req(tenantA, 'admin') as any, tenantA, { name: 'New' }),
    ).resolves.toEqual({ id: tenantA, name: 'New' });
    expect(service.updateForTenant).toHaveBeenCalledWith(tenantA, tenantA, {
      name: 'New',
    });
  });

  it('remove rejects non-admin callers', () => {
    expect(() =>
      controller.remove(req(tenantA, 'staff') as any, tenantA),
    ).toThrow(ForbiddenException);
    expect(service.removeForTenant).not.toHaveBeenCalled();
  });

  it('create rejects non-admin callers', () => {
    expect(() =>
      controller.create(req(tenantA, 'staff') as any, {
        name: 'X',
        slug: 'x',
      }),
    ).toThrow(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('findOne propagates not found for own tenant', async () => {
    service.findOneForTenant.mockRejectedValue(
      new NotFoundException('Tenant not found'),
    );

    await expect(
      controller.findOne(req(tenantA) as any, tenantA),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
