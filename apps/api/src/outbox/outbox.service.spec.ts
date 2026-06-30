import { OutboxService } from './outbox.service';

jest.mock('@smart-erp/database', () => ({
  db: { insert: jest.fn(), select: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));
jest.mock('@smart-erp/database/schema', () => ({ outboxEvents: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn((x) => x), and: jest.fn((...args) => args), lte: jest.fn((x) => x) }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

describe('OutboxService', () => {
  let service: OutboxService;

  const queryResult = (data: any[]) => {
    const prom = Promise.resolve(data) as any;
    prom.limit = jest.fn().mockResolvedValue(data);
    return prom;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'evt-1' }]) }) });
    const where = jest.fn().mockReturnValue(queryResult([]));
    db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where }) });
    db.update.mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) });
    db.delete.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
    service = new OutboxService();
  });

  describe('emit', () => {
    it('inserts an event into the outbox table', async () => {
      await service.emit('order.created', { orderId: 'o-1' }, 'tenant-1');
      expect(db.insert).toHaveBeenCalled();
      const valuesFn = (db.insert as jest.Mock).mock.results[0].value.values;
      const actualValues = valuesFn.mock.calls[0][0];
      expect(actualValues.eventType).toBe('order.created');
      expect(actualValues.payload).toEqual({ orderId: 'o-1' });
      expect(actualValues.tenantId).toBe('tenant-1');
      expect(actualValues.status).toBe('pending');
    });

    it('returns the event id', async () => {
      const id = await service.emit('order.created', {}, 't1');
      expect(id).toBe('evt-1');
    });
  });

  describe('processPending', () => {
    it('does nothing when no pending events', async () => {
      const processed = await service.processPending(async () => {});
      expect(processed).toBe(0);
    });

    it('processes pending events and marks them done', async () => {
      const events = [{ id: 'e1', eventType: 'order.created', payload: { orderId: 'o-1' }, tenantId: 't1', status: 'pending' }];
      db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue(queryResult(events)) }) });

      const handler = jest.fn().mockResolvedValue(undefined);
      const processed = await service.processPending(handler);

      expect(processed).toBe(1);
      expect(handler).toHaveBeenCalledWith({
        id: 'e1',
        eventType: 'order.created',
        payload: { orderId: 'o-1' },
        tenantId: 't1',
      });
      expect(db.update).toHaveBeenCalled();
    });

    it('marks events as failed when handler throws', async () => {
      const events = [{ id: 'e2', eventType: 'order.created', payload: {}, tenantId: 't1', status: 'pending' }];
      db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue(queryResult(events)) }) });

      const handler = jest.fn().mockRejectedValue(new Error('handler failed'));
      const processed = await service.processPending(handler);

      expect(processed).toBe(1);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('deletes processed events older than the specified age', async () => {
      const oldEvents = [{ id: 'old-1' }];
      db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue(queryResult(oldEvents)) }) });
      await service.cleanup(7);
      expect(db.select).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
