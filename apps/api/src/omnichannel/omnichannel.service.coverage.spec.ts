jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { OmnichannelService } from './omnichannel.service';

const selectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};
const insertChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    values: jest.fn(() => chain),
  };
  return chain;
};

describe('OmnichannelService coverage', () => {
  const db = {
    insert: jest.fn(),
    select: jest.fn(),
  };
  const service = new OmnichannelService({ db } as any);

  beforeEach(() => jest.clearAllMocks());

  it('loads messages and stores outbound/inbound messages', async () => {
    db.select.mockReturnValueOnce(selectChain([{ id: 'msg-1' }])).mockReturnValueOnce(selectChain([{ id: 'msg-2' }]));
    db.insert
      .mockReturnValueOnce(insertChain([{ id: 'outbound' }]))
      .mockReturnValueOnce(insertChain([{ id: 'inbound' }]));

    await expect(service.getMessages('tenant-1')).resolves.toEqual([{ id: 'msg-1' }]);
    await expect(service.getMessages('tenant-1', 'zalo-1')).resolves.toEqual([{ id: 'msg-2' }]);
    await expect(
      service.sendMessage('tenant-1', {
        content: 'Hi',
        customerId: 'customer-1',
        externalUserId: 'zalo-1',
        platform: 'zalo',
      }),
    ).resolves.toEqual({ id: 'outbound' });
    await expect(
      service.receiveWebhookMessage('tenant-1', { fromId: 'fb-1', platform: 'facebook', text: 'Hello' }),
    ).resolves.toEqual({ id: 'inbound' });

    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'outbound', status: 'sent' }),
    );
    expect(db.insert.mock.results[1].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'inbound', status: 'delivered' }),
    );
  });
});
