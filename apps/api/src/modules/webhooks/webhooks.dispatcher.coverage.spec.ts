const mockAxios = {
  post: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  post: mockAxios.post,
}));

jest.mock('@smart-erp/database', () => ({
  webhookSubscriptions: { active: 'webhookSubscriptions.active' },
  webhookDeliveryLogs: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { WebhookDispatcher } from './webhooks.dispatcher';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

const makeInsertChain = () => {
  const chain: any = {
    values: jest.fn(() => Promise.resolve(undefined)),
  };
  return chain;
};

describe('WebhookDispatcher coverage', () => {
  const callbacks: Record<string, (payload: any) => Promise<void>> = {};
  const db = {
    select: jest.fn(),
    insert: jest.fn(() => makeInsertChain()),
  };
  const eventEmitter = {
    on: jest.fn((event, cb) => {
      callbacks[event] = cb;
    }),
  };
  let dispatcher: WebhookDispatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    Object.keys(callbacks).forEach((key) => delete callbacks[key]);
    db.select.mockReset();
    db.insert.mockImplementation(() => makeInsertChain());
    dispatcher = new WebhookDispatcher(db as any, eventEmitter as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to ERP events and logs successful webhook delivery', async () => {
    db.select.mockReturnValueOnce(makeSelectChain([
      { id: 'wh-1', url: 'https://example.test/hook', secret: 'secret', events: ['order.created'] },
      { id: 'wh-2', url: 'https://example.test/stock', events: ['stock.low'] },
    ]));
    mockAxios.post.mockResolvedValueOnce({ status: 202, data: { ok: true } });
    dispatcher.onModuleInit();

    await callbacks['order.created']({ orderId: 'order-1' });

    expect(eventEmitter.on).toHaveBeenCalledWith('order.created', expect.any(Function));
    expect(mockAxios.post).toHaveBeenCalledWith('https://example.test/hook', { orderId: 'order-1' }, expect.objectContaining({
      headers: expect.objectContaining({ 'x-webhook-signature': expect.any(String) }),
      timeout: 5000,
    }));
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: 'wh-1',
      event: 'order.created',
      statusCode: '202',
      responseBody: '{"ok":true}',
      error: null,
      attempt: 1,
    }));
  });

  it('logs failed webhook delivery responses', async () => {
    db.select.mockReturnValueOnce(makeSelectChain([
      { id: 'wh-1', url: 'https://example.test/hook', events: ['payment.received'] },
    ]));
    mockAxios.post.mockRejectedValueOnce({
      message: 'bad gateway',
      response: { status: 502, data: { error: 'bad' } },
    });
    dispatcher.onModuleInit();

    await callbacks['payment.received']({ paymentId: 'pay-1' });

    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: 'wh-1',
      event: 'payment.received',
      statusCode: '502',
      responseBody: '{"error":"bad"}',
      error: 'bad gateway',
    }));

    db.select.mockReturnValueOnce(makeSelectChain([
      { id: 'wh-2', url: 'https://example.test/plain', events: ['stock.adjusted'] },
    ]));
    mockAxios.post.mockRejectedValueOnce(new Error('offline'));
    dispatcher.onModuleInit();

    await callbacks['stock.adjusted']({ productId: 'p1' });

    expect(db.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: 'wh-2',
      event: 'stock.adjusted',
      statusCode: '0',
      responseBody: '',
      error: 'offline',
    }));
  });
});
