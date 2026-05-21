const mockDb = {
  delete: jest.fn(),
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  tenants: {
    id: 'tenants.id',
    slug: 'tenants.slug',
  },
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

const makeWriteChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('TenantsService coverage', () => {
  const service = new TenantsService();

  beforeEach(() => jest.clearAllMocks());

  it('creates tenants only when slug is unique', async () => {
    const insertChain = makeWriteChain([{ id: 'tenant-1' }]);
    mockDb.select.mockReturnValueOnce(makeSelectChain([])).mockReturnValueOnce(makeSelectChain([{ id: 'existing' }]));
    mockDb.insert.mockReturnValueOnce(insertChain);

    await expect(service.create({ name: 'Acme', slug: 'acme' } as any)).resolves.toEqual({ id: 'tenant-1' });
    expect(insertChain.values).toHaveBeenCalledWith({ name: 'Acme', slug: 'acme' });
    await expect(service.create({ name: 'Acme', slug: 'acme' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds tenants by id or slug and rejects missing ids', async () => {
    const allChain = {
      from: jest.fn(() => Promise.resolve([{ id: 'tenant-1' }])),
    };
    mockDb.select
      .mockReturnValueOnce(allChain)
      .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-1' }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-2' }]));

    await expect(service.findAll()).resolves.toEqual([{ id: 'tenant-1' }]);
    await expect(service.findOne('tenant-1')).resolves.toEqual({ id: 'tenant-1' });
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findBySlug('beta')).resolves.toEqual({ id: 'tenant-2' });
  });

  it('updates and removes tenants or rejects missing targets', async () => {
    const updateChain = makeWriteChain([{ id: 'tenant-1', name: 'Updated' }]);
    const missingUpdateChain = makeWriteChain([]);
    const deleteChain = makeWriteChain([{ id: 'tenant-1' }]);
    const missingDeleteChain = makeWriteChain([]);
    mockDb.update.mockReturnValueOnce(updateChain).mockReturnValueOnce(missingUpdateChain);
    mockDb.delete.mockReturnValueOnce(deleteChain).mockReturnValueOnce(missingDeleteChain);

    await expect(service.update('tenant-1', { name: 'Updated' } as any)).resolves.toEqual({
      id: 'tenant-1',
      name: 'Updated',
    });
    expect(updateChain.set).toHaveBeenCalledWith({ name: 'Updated', updatedAt: expect.any(Date) });
    await expect(service.update('missing', { name: 'Nope' } as any)).rejects.toBeInstanceOf(NotFoundException);

    await expect(service.remove('tenant-1')).resolves.toEqual({ id: 'tenant-1' });
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
