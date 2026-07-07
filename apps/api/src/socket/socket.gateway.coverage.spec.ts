import { Logger, UnauthorizedException } from '@nestjs/common';
import { GATEWAY_OPTIONS } from '@nestjs/websockets/constants';
import { SocketGateway } from './socket.gateway';

const makeClient = (authHeader?: string, query: Record<string, unknown> = {}) => ({
  id: 'socket-1',
  handshake: {
    headers: authHeader ? { authorization: authHeader } : {},
    query,
  },
  data: {},
  join: jest.fn(),
  disconnect: jest.fn(),
});

describe('SocketGateway coverage', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn(() => 'secret'),
  };
  let gateway: SocketGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    gateway = new SocketGateway(jwtService as any, configService as any);
    gateway.server = { to: jest.fn(() => ({ emit: jest.fn() })) } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates sockets from bearer headers and joins tenant/user rooms', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-1', tenantId: 'tenant-1' });
    const client = makeClient('Bearer token-1');

    await gateway.handleConnection(client as any);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-1', { secret: 'secret' });
    expect(client.data.user).toEqual({ sub: 'user-1', tenantId: 'tenant-1' });
    expect(client.join).toHaveBeenCalledWith('tenant:tenant-1');
    expect(client.join).toHaveBeenCalledWith('user:user-1');
  });

  it('supports query tokens and disconnects unauthorized sockets', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-2', tenantId: 'tenant-2' });
    const queryClient = makeClient(undefined, { token: 'query-token' });
    await gateway.handleConnection(queryClient as any);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-token', { secret: 'secret' });

    jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-3', tenantId: 'tenant-3' });
    const fallbackClient = makeClient('Token ignored', { token: 'fallback-token' });
    await gateway.handleConnection(fallbackClient as any);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('fallback-token', { secret: 'secret' });

    jwtService.verifyAsync.mockRejectedValueOnce(new UnauthorizedException('bad'));
    const badClient = makeClient();
    await gateway.handleConnection(badClient as any);
    expect(badClient.disconnect).toHaveBeenCalled();
  });

  it('handles ping, disconnect logs, and tenant/user emissions', () => {
    const client = makeClient();
    expect(gateway.handlePing(client as any)).toBe('pong');
    gateway.handleDisconnect(client as any);

    gateway.emitActivity('tenant-1', { type: 'created', entity: 'order' } as any);
    gateway.emitNotification('user-1', { type: 'info', title: 'Hi', body: 'Body' });

    expect(gateway.server.to).toHaveBeenCalledWith('tenant:tenant-1');
    expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
  });

  it('allows websocket CORS origins through the configured callback', () => {
    const options = Reflect.getMetadata(GATEWAY_OPTIONS, SocketGateway);
    const callback = jest.fn();

    options.cors.origin('https://erp.test', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  describe('production CORS origin validation', () => {
    const ORIGIN_NODE_ENV = process.env.NODE_ENV;
    const ORIGIN_CORS_ORIGINS = process.env.CORS_ORIGINS;

    afterEach(() => {
      process.env.NODE_ENV = ORIGIN_NODE_ENV;
      process.env.CORS_ORIGINS = ORIGIN_CORS_ORIGINS;
    });

    it('rejects unknown origins in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGINS = 'https://app.example.com';
      const options = Reflect.getMetadata(GATEWAY_OPTIONS, SocketGateway);
      const callback = jest.fn();

      options.cors.origin('https://evil.example.com', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('allows configured origins in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGINS = 'https://app.example.com,https://admin.example.com';
      const options = Reflect.getMetadata(GATEWAY_OPTIONS, SocketGateway);
      const callback = jest.fn();

      options.cors.origin('https://admin.example.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('allows any origin in non-production environments', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ORIGINS = '';
      const options = Reflect.getMetadata(GATEWAY_OPTIONS, SocketGateway);
      const callback = jest.fn();

      options.cors.origin('https://anything.test', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
});
