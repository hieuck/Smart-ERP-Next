const mockSocket = {
  connected: false,
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
};
const mockIo = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({ io: mockIo }));

describe('web socket coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSocket.connected = false;
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test';
  });

  it('initializes notification sockets and joins tenant rooms on connect', async () => {
    const { closeSocket, disconnectSocket, getSocket, initSocket } = await import('./socket');

    const socket = initSocket('user-1', 'tenant-1') as any;
    expect(socket).toBe(mockSocket);
    expect(mockIo).toHaveBeenCalledWith('https://api.test/notifications', {
      auth: { tenantId: 'tenant-1', userId: 'user-1' },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });

    const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
    connectHandler();
    expect(mockSocket.emit).toHaveBeenCalledWith('join', { room: 'tenant:tenant-1' });

    expect(getSocket()).toBe(mockSocket);
    mockSocket.connected = true;
    expect(initSocket('user-2')).toBe(mockSocket);

    closeSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBeNull();

    initSocket('user-3');
    disconnectSocket();
    expect(getSocket()).toBeNull();
  });

  it('logs socket connection errors', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { initSocket } = await import('./socket');

    initSocket('user-1');
    const errorHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect_error')?.[1];
    errorHandler({ message: 'offline' });

    expect(warn).toHaveBeenCalledWith('Socket connection error:', 'offline');
    warn.mockRestore();
  });

  it('uses the local API URL fallback when the environment URL is absent', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { closeSocket, initSocket } = await import('./socket');

    initSocket('user-1');

    expect(mockIo).toHaveBeenCalledWith('http://localhost:3000/notifications', expect.objectContaining({
      auth: { tenantId: undefined, userId: 'user-1' },
    }));
    closeSocket();
  });
});
