jest.mock('drizzle-orm', () => ({
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { NotFoundException } from '@nestjs/common';
import { EContractsService } from './e-contracts.service';

const selectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => chain),
  };
  return chain;
};
const writeChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('EContractsService coverage', () => {
  const db = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  };
  const service = new EContractsService({ db } as any);

  beforeEach(() => jest.clearAllMocks());

  it('lists, creates, signs, and rejects missing contracts', async () => {
    db.select.mockReturnValueOnce(selectChain([{ id: 'contract-1' }]));
    const insert = writeChain([{ id: 'contract-2' }]);
    const update = writeChain([{ id: 'contract-2', status: 'signed' }]);
    const missing = writeChain([]);
    db.insert.mockReturnValueOnce(insert);
    db.update.mockReturnValueOnce(update).mockReturnValueOnce(missing);

    await expect(service.getContracts('tenant-1')).resolves.toEqual([{ id: 'contract-1' }]);
    await expect(service.createContract('tenant-1', { title: 'NDA' })).resolves.toEqual({ id: 'contract-2' });
    await expect(service.signContract('tenant-1', 'contract-2', { signature: 'base64' })).resolves.toEqual({
      id: 'contract-2',
      status: 'signed',
    });
    await expect(service.signContract('tenant-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);

    expect(insert.values).toHaveBeenCalledWith({ tenantId: 'tenant-1', title: 'NDA' });
    expect(update.set).toHaveBeenCalledWith({
      signatureData: { signature: 'base64' },
      status: 'signed',
      updatedAt: expect.any(Date),
    });
  });
});
