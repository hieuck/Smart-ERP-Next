jest.mock('@smart-erp/database', () => {
  const db: any = () => db;
  const chainFn = jest.fn(() => db);

  db.select = chainFn;
  db.from = chainFn;
  db.where = chainFn;
  db.orderBy = chainFn;
  db.insert = chainFn;
  db.values = chainFn;
  db.update = chainFn;
  db.set = chainFn;
  db.delete = chainFn;
  db.execute = jest.fn();
  db.returning = jest.fn();
  db.then = jest.fn();
  db.innerJoin = chainFn;
  db.leftJoin = chainFn;
  db.groupBy = chainFn;

  return { db };
});
jest.mock('@smart-erp/database/schema', () => ({ users: {}, tenants: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn(), and: jest.fn(), or: jest.fn(), ilike: jest.fn(), sql: jest.fn() }));

import { db } from '@smart-erp/database';
import { UsersService } from '../users/users.service';

describe('UsersService (direct instantiation)', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    service = new UsersService();
  });

  describe('create', () => {
    it('throws BadRequestException when tenantId is missing', async () => {
      await expect(service.create({ email: 'test@test.com', password: 'secret123' } as any))
        .rejects.toThrow('tenantId is required');
    });

    it('throws ConflictException when email already exists', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([{ id: '1' }]));
      await expect(service.create({ email: 'dup@test.com', tenantId: 't1', password: 'secret123' } as any))
        .rejects.toThrow('Email already in use');
    });

    it('rejects supplied passwordHash', async () => {
      await expect(
        service.create({ email: 'new@test.com', tenantId: 't1', password: 'secret123', passwordHash: 'known-hash' } as any),
      ).rejects.toThrow('passwordHash is not allowed');
    });

    it('creates and returns a new user', async () => {
      const dto = { email: 'new@test.com', name: 'New User', tenantId: 't1', password: 'secret123' } as any;
      const expected = { id: 'uid-1', email: 'new@test.com', name: 'New User', tenantId: 't1', role: 'user' };
      (db as any).returning.mockResolvedValue([expected]);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect((db as any).insert.mock.results[0].value.values).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
    });
  });

  describe('findAll', () => {
    it('returns users scoped to tenantId', async () => {
      const users = [
        { id: '1', email: 'a@t.com', name: 'A', role: 'user', tenantId: 't1', createdAt: new Date(), updatedAt: new Date() },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(users));

      const result = await service.findAll('t1');
      expect(result).toEqual(users);
    });

    it('filters by search term', async () => {
      const users = [
        { id: '1', email: 'match@t.com', name: 'Matching', role: 'user', tenantId: 't1', createdAt: new Date(), updatedAt: new Date() },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(users));

      const result = await service.findAll('t1', 'match');
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('returns a user by id within tenant', async () => {
      const user = { id: '1', email: 'a@t.com', name: 'A', role: 'user', tenantId: 't1', createdAt: new Date(), updatedAt: new Date() };
      (db as any).then.mockImplementation((resolve: any) => resolve([user]));

      const result = await service.findOne('t1', '1');
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when not found', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));
      await expect(service.findOne('t1', 'missing')).rejects.toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('returns a user when found', async () => {
      const user = { id: '1', email: 'a@t.com', name: 'A' };
      (db as any).then.mockImplementation((resolve: any) => resolve([user]));

      const result = await service.findByEmail('a@t.com');
      expect(result).toEqual(user);
    });

    it('returns undefined when not found', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));
      const result = await service.findByEmail('no@t.com');
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates and returns the user', async () => {
      const updated = { id: '1', email: 'a@t.com', name: 'Updated', tenantId: 't1', role: 'user' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.update('t1', '1', { name: 'Updated' } as any);
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when user not found', async () => {
      (db as any).returning.mockResolvedValue([]);
      await expect(service.update('t1', 'missing', { name: 'Nope' } as any))
        .rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('updates and returns the profile', async () => {
      const updated = { id: '1', email: 'a@t.com', name: 'Changed', tenantId: 't1', role: 'user' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.updateProfile('t1', '1', { name: 'Changed' } as any);
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when user not found', async () => {
      (db as any).returning.mockResolvedValue([]);
      await expect(service.updateProfile('t1', 'missing', { name: 'Nope' } as any))
        .rejects.toThrow('User not found');
    });
  });

  describe('remove', () => {
    it('removes and returns the deleted user', async () => {
      const deleted = { id: '1', email: 'gone@t.com', tenantId: 't1' };
      (db as any).returning.mockResolvedValue([deleted]);

      const result = await service.remove('t1', '1');
      expect(result).toEqual(deleted);
    });

    it('throws NotFoundException when user not found', async () => {
      (db as any).returning.mockResolvedValue([]);
      await expect(service.remove('t1', 'missing')).rejects.toThrow('User not found');
    });
  });

  describe('getStats', () => {
    it('returns total and byRole breakdown', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([{ total: 5 }]));
      (db as any).execute.mockResolvedValue({
        rows: [
          { role: 'user', count: 3 },
          { role: 'admin', count: 2 },
        ],
      });

      const result = await service.getStats('t1');
      expect(result).toEqual({ total: 5, byRole: { user: 3, admin: 2 } });
    });
  });
});
