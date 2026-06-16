import { Test, TestingModule } from '@nestjs/testing';
import { RbacService } from './rbac.service';
import { DrizzleService } from '../drizzle/drizzle.service';

const mockDrizzle = { db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() } };

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RbacService, { provide: DrizzleService, useValue: mockDrizzle }],
    }).compile();
    service = module.get<RbacService>(RbacService);
  });

  it('lists all permission modules', () => {
    const modules = service.getAllPermissions();
    expect(modules.length).toBeGreaterThan(0);
    expect(modules[0]).toHaveProperty('module');
    expect(modules[0]).toHaveProperty('permissions');
  });

  it('getAllPermissions returns structured permissions', () => {
    const modules = service.getAllPermissions();
    const customers = modules.find(m => m.module === 'Customers');
    expect(customers).toBeDefined();
    expect(customers!.permissions.some(p => p.key === 'customers.read')).toBe(true);
  });

  it('createRole returns role with ID', async () => {
    const role = await service.createRole('t1', 'Custom', ['products.read']);
    expect(role.id).toBeTruthy();
    expect(role.name).toBe('Custom');
    expect(role.isSystem).toBe(false);
  });

  it('assignRole and removeRole resolve without error', async () => {
    await expect(service.assignRole('t1', 'u1', 'r1')).resolves.toBeUndefined();
    await expect(service.removeRole('t1', 'u1', 'r1')).resolves.toBeUndefined();
  });
});
