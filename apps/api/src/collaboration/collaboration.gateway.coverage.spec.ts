import { CollaborationGateway } from './collaboration.gateway';

const makeServer = () => {
  const room = { emit: jest.fn() };
  return {
    room,
    server: {
      to: jest.fn(() => room),
    },
  };
};

const makeClient = (auth: Record<string, unknown>, id = 'socket-1') => {
  const target = { emit: jest.fn() };
  return {
    id,
    handshake: { auth },
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    to: jest.fn(() => target),
    target,
  };
};

describe('CollaborationGateway coverage', () => {
  let gateway: CollaborationGateway;
  let serverHarness: ReturnType<typeof makeServer>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T08:00:00.000Z'));
    serverHarness = makeServer();
    gateway = new CollaborationGateway();
    gateway.server = serverHarness.server as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('disconnects sockets missing identity and announces valid presence', () => {
    const invalid = makeClient({ tenantId: 'tenant-1' });
    gateway.handleConnection(invalid as any);
    expect(invalid.disconnect).toHaveBeenCalled();

    const client = makeClient({ tenantId: 'tenant-1', userId: 'user-1', userName: 'Lan' });
    gateway.handleConnection(client as any);

    expect(client.join).toHaveBeenCalledWith('tenant:tenant-1');
    expect(serverHarness.server.to).toHaveBeenCalledWith('tenant:tenant-1');
    expect(serverHarness.room.emit).toHaveBeenCalledWith('presence:update', {
      type: 'joined',
      user: expect.objectContaining({
        userId: 'user-1',
        userName: 'Lan',
        status: 'online',
      }),
    });
    expect(client.emit).toHaveBeenCalledWith('presence:list', [
      expect.objectContaining({ userId: 'user-1' }),
    ]);
  });

  it('tracks multi-socket disconnects before broadcasting a departure', () => {
    const auth = { tenantId: 'tenant-1', userId: 'user-1', userName: 'Lan' };
    const first = makeClient(auth, 'socket-1');
    const second = makeClient(auth, 'socket-2');
    gateway.handleConnection(first as any);
    gateway.handleConnection(second as any);

    serverHarness.room.emit.mockClear();
    gateway.handleDisconnect(first as any);
    expect(serverHarness.room.emit).not.toHaveBeenCalledWith('presence:update', expect.objectContaining({ type: 'left' }));

    gateway.handleDisconnect(second as any);
    expect(serverHarness.room.emit).toHaveBeenCalledWith('presence:update', {
      type: 'left',
      userId: 'user-1',
    });

    serverHarness.room.emit.mockClear();
    gateway.handleDisconnect(makeClient({ tenantId: 'tenant-1' }) as any);
    expect(serverHarness.room.emit).not.toHaveBeenCalled();

    gateway.handleDisconnect(makeClient({ tenantId: 'tenant-1', userId: 'user-orphan' }, 'socket-orphan') as any);
    expect(serverHarness.room.emit).toHaveBeenCalledWith('presence:update', {
      type: 'left',
      userId: 'user-orphan',
    });
  });

  it('broadcasts status, cursor, view, and activity events', () => {
    const client = makeClient({ tenantId: 'tenant-1', userId: 'user-1', userName: 'Lan' });
    gateway.handleConnection(client as any);

    gateway.handleStatusUpdate(client as any, { status: 'busy' });
    expect(serverHarness.room.emit).toHaveBeenCalledWith('presence:update', {
      type: 'status',
      userId: 'user-1',
      status: 'busy',
    });

    gateway.handleCursorMove(client as any, { x: 10, y: 20, view: 'pos' });
    expect(client.to).toHaveBeenCalledWith('tenant:tenant-1');
    expect(client.target.emit).toHaveBeenCalledWith('cursor:update', expect.objectContaining({
      userId: 'user-1',
      x: 10,
      y: 20,
      color: expect.stringMatching(/^#/),
    }));

    gateway.handleViewJoin(client as any, { view: 'orders' });
    expect(client.join).toHaveBeenCalledWith('view:orders');
    expect(client.target.emit).toHaveBeenCalledWith('view:userJoined', {
      userId: 'user-1',
      userName: 'Lan',
    });

    gateway.handleActivity(client as any, {
      action: 'created',
      entityType: 'order',
      entityId: 'order-1',
      message: 'Created order',
    });
    expect(serverHarness.room.emit).toHaveBeenCalledWith('activity:new', expect.objectContaining({
      userId: 'user-1',
      userName: 'Lan',
      action: 'created',
      entityType: 'order',
      entityId: 'order-1',
      timestamp: '2026-05-21T08:00:00.000Z',
    }));
  });
});
