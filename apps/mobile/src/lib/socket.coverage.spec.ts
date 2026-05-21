const mockSocket = { connected: false };
const mockIo = jest.fn(() => mockSocket);
const mockSecureStore = { getItemAsync: jest.fn() };
const mockSetSocket = jest.fn();
const mockUseEffect = jest.fn((callback: () => void) => callback());
const mockUseState = jest.fn(() => [null, mockSetSocket]);

jest.mock('socket.io-client', () => ({ io: mockIo }), { virtual: true });
jest.mock('expo-secure-store', () => mockSecureStore, { virtual: true });
jest.mock('react', () => ({ useEffect: mockUseEffect, useState: mockUseState }));

describe('mobile socket coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSocket.connected = false;
    mockSecureStore.getItemAsync.mockResolvedValue('token-1');
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
  });

  it('creates authenticated sockets and reuses connected instances', async () => {
    const { getSocket } = await import('./socket');

    await expect(getSocket()).resolves.toBe(mockSocket);
    expect(mockIo).toHaveBeenCalledWith('https://api.test', {
      auth: { token: 'token-1' },
      transports: ['websocket'],
    });

    mockSocket.connected = true;
    await expect(getSocket()).resolves.toBe(mockSocket);
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it('updates hook state after socket resolution', async () => {
    const { useSocket } = await import('./socket');

    expect(useSocket()).toEqual({ socket: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSetSocket).toHaveBeenCalledWith(mockSocket);
  });
});
