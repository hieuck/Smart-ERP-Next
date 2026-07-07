import { RbacService } from './rbac.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled) => Promise.resolve(rows).then(onFulfilled)),
  };
  return chain;
};

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  users: {
    id: 'users.id',
    role: 'users.role',
    tenantId: 'users.tenantId',
  },
}));
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...args) => ({ op: 'and', args })),
}));

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'staff' }]));
    service = new RbacService({ db: mockDb } as any);
  });

  it('queries the actual user role from the database', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'admin' }]));

    const result = await (service as any).getUserRole('tenant-1', 'user-1');

    expect(result).toBe('admin');
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('falls back to staff when user is not found in the database', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([]));

    const result = await (service as any).getUserRole('tenant-1', 'missing-user');

    expect(result).toBe('staff');
  });

  it('grants admin permissions when user role is admin', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'admin' }]));

    await expect(service.hasPermission('tenant-1', 'user-1', 'users:delete')).resolves.toBe(true);
  });

  it('denies elevated permissions when user role is staff', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'staff' }]));

    await expect(service.hasPermission('tenant-1', 'user-1', 'orders:create')).resolves.toBe(true);
    await expect(service.hasPermission('tenant-1', 'user-1', 'users:delete')).resolves.toBe(false);
  });

  it('grants permissions assigned to the default staff role', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'staff' }]));

    await expect(service.hasPermission('tenant-1', 'user-1', 'orders:create')).resolves.toBe(true);
    await expect(service.hasPermission('tenant-1', 'user-1', 'reports:export')).resolves.toBe(false);
  });

  it('deduplicates permissions across user roles', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'staff' }]));

    const permissions = await service.getUserPermissions('tenant-1', 'user-1');

    expect(permissions).toEqual(expect.arrayContaining(['customers:view', 'orders:create', 'inventory:view']));
    expect(new Set(permissions).size).toBe(permissions.length);
  });

  it('returns default system roles for a user', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'staff' }]));

    const roles = await service.getUserRoles('tenant-1', 'user-1');

    expect(roles).toEqual([
      expect.objectContaining({
        id: 'role-staff',
        name: 'staff',
        isSystem: true,
      }),
    ]);
  });

  it('falls back to manager permissions for unknown user roles', async () => {
    mockDb.select.mockImplementation(() => makeSelectChain([{ role: 'contractor' }]));

    const roles = await service.getUserRoles('tenant-1', 'user-1');

    expect(roles).toEqual([
      expect.objectContaining({
        id: 'role-contractor',
        name: 'contractor',
        permissions: expect.arrayContaining(['customers:view', 'products:create']),
      }),
    ]);
    expect(roles[0].permissions).not.toContain('inventory:adjust');
  });

  it('creates custom roles without persisting to the database placeholder', async () => {
    const role = await service.createRole('tenant-1', {
      name: 'Store Auditor',
      permissions: ['reports:view'],
      description: 'Read-only audit role',
    });

    expect(role.id).toEqual(expect.any(String));
    expect(role).toMatchObject({
      name: 'Store Auditor',
      description: 'Read-only audit role',
      permissions: ['reports:view'],
      isSystem: false,
    });
  });

  it('lists permissions grouped by module', () => {
    const modules = service.getAllPermissions();

    expect(modules.map((module) => module.module)).toEqual(['Customers', 'Products', 'Orders', 'Inventory', 'Reports']);
    expect(modules.find((module) => module.module === 'Orders')?.permissions).toEqual(
      expect.arrayContaining([
        { key: 'orders.read', label: 'View Orders' },
        { key: 'orders.approve', label: 'Approve Orders' },
      ]),
    );
  });

  it('keeps role assignment placeholders callable', async () => {
    await expect(service.assignRole('tenant-1', 'user-1', 'role-staff')).resolves.toBeUndefined();
    await expect(service.removeRole('tenant-1', 'user-1', 'role-staff')).resolves.toBeUndefined();
  });
});
