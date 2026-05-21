jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { NotFoundException } from '@nestjs/common';
import { FieldServiceService } from './field-service.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => chain),
  };
  return chain;
};

const makeWriteChain = (rows: any[] = []) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('FieldServiceService coverage', () => {
  const db = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  };
  const service = new FieldServiceService({ db } as any);

  beforeEach(() => jest.clearAllMocks());

  it('lists tickets with optional technician filtering and creates tickets', async () => {
    const allTickets = makeSelectChain([{ id: 'ticket-1' }]);
    const techTickets = makeSelectChain([{ id: 'ticket-2' }]);
    const insertChain = makeWriteChain([{ id: 'ticket-3' }]);
    db.select.mockReturnValueOnce(allTickets).mockReturnValueOnce(techTickets);
    db.insert.mockReturnValueOnce(insertChain);

    await expect(service.getTickets('tenant-1')).resolves.toEqual([{ id: 'ticket-1' }]);
    await expect(service.getTickets('tenant-1', 'tech-1')).resolves.toEqual([{ id: 'ticket-2' }]);
    await expect(service.createTicket('tenant-1', { title: 'Repair printer' })).resolves.toEqual({ id: 'ticket-3' });

    expect(insertChain.values).toHaveBeenCalledWith({ tenantId: 'tenant-1', title: 'Repair printer' });
  });

  it('checks in and completes tickets or rejects missing tickets', async () => {
    const checkInChain = makeWriteChain([{ id: 'ticket-1', status: 'in_progress' }]);
    const completeChain = makeWriteChain([{ id: 'ticket-1', status: 'completed' }]);
    const missingChain = makeWriteChain([]);
    const missingCompleteChain = makeWriteChain([]);
    db.update
      .mockReturnValueOnce(checkInChain)
      .mockReturnValueOnce(completeChain)
      .mockReturnValueOnce(missingChain)
      .mockReturnValueOnce(missingCompleteChain);

    await expect(service.checkIn('tenant-1', 'ticket-1', { lat: 10, lng: 106 })).resolves.toEqual({
      id: 'ticket-1',
      status: 'in_progress',
    });
    expect(checkInChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ checkInLocation: { lat: 10, lng: 106 }, status: 'in_progress' }),
    );

    await expect(
      service.completeTicket('tenant-1', 'ticket-1', { report: 'Fixed', signatureUrl: 'sig.png' }),
    ).resolves.toEqual({ id: 'ticket-1', status: 'completed' });
    expect(completeChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ customerSignatureUrl: 'sig.png', serviceReport: 'Fixed', status: 'completed' }),
    );

    await expect(service.checkIn('tenant-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.completeTicket('tenant-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
