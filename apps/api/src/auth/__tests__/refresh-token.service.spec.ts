jest.mock('@smart-erp/database', () => {
  const mockDb: any = {};
  mockDb.select = jest.fn();
  mockDb.insert = jest.fn();
  mockDb.update = jest.fn();
  mockDb.delete = jest.fn();
  return { db: mockDb };
});

jest.mock('@smart-erp/database/schema', () => ({
  users: {},
  tenants: {},
  refreshTokens: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((a: any, b: any) => ({ field: a, value: b })),
  and: jest.fn((...args: any[]) => ({ op: 'and', args })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { db as mockDb } from '@smart-erp/database';

function mockChain(overrides: Record<string, any> = {}): any {
  const chain: any = { ...overrides };
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.values = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockResolvedValue([]);
  return chain;
}

describe('AuthService — Refresh Token Flow', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: 'tenant-1',
    role: 'admin',
    name: 'Test User',
  };

  const mockJwtPayload = { sub: mockUser.id, email: mockUser.email, tenantId: mockUser.tenantId, role: mockUser.role };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue(mockJwtPayload),
    decode: jest.fn().mockReturnValue({ ...mockJwtPayload, iat: 1000, exp: 1000 + 15 * 60 }),
  };

  const mockUsersService = { findByEmail: jest.fn() };
  const mockGateway = { broadcast: jest.fn() };
  const mockI18n = { t: jest.fn((_: string) => 'Validation error') };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockReturnValue(mockChain());
    mockDb.insert.mockReturnValue(mockChain());
    mockDb.update.mockReturnValue(mockChain());
    mockDb.delete.mockReturnValue(mockChain());
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
    mockJwtService.verify.mockReturnValue(mockJwtPayload);

    service = new (AuthService as any)(mockUsersService, mockJwtService, mockGateway, mockI18n);
  });

  it('returns both access_token and refresh_token on login', async () => {
    const result = await service.login(mockUser);
    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
    expect(result).toHaveProperty('user');
    expect(result.user).toMatchObject({ id: mockUser.id, email: mockUser.email });
  });

  it('access_token is signed with 15 min expiry', async () => {
    await service.login(mockUser);
    expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ expiresIn: '15m' }));
  });

  it('refresh_token is signed with 7 day expiry', async () => {
    await service.login(mockUser);
    expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ expiresIn: '7d' }));
  });

  it('login stores refresh token hash in database', async () => {
    await service.login(mockUser);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('refresh with valid token returns new access + refresh pair', async () => {
    const selectChain = mockChain();
    selectChain.limit = jest.fn().mockResolvedValue([{ id: 'rt-1', token: 'mocked-hash', userId: mockUser.id, revoked: false }]);
    mockDb.select.mockReturnValue(selectChain);
    mockDb.insert.mockReturnValue(mockChain({ returning: jest.fn().mockResolvedValue([{ id: 'rt-2' }]) }));
    mockDb.update.mockReturnValue(mockChain());
    mockJwtService.sign.mockReturnValue('new-access-token');

    const result = await service.refresh('valid-refresh-token');
    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
  });

  it('revokes old refresh token after rotation', async () => {
    const selectChain = mockChain();
    selectChain.limit = jest.fn().mockResolvedValue([{ id: 'rt-1', token: 'mocked-hash', userId: mockUser.id, revoked: false }]);
    mockDb.select.mockReturnValue(selectChain);
    const updateChain = mockChain();
    mockDb.update.mockReturnValue(updateChain);
    mockDb.insert.mockReturnValue(mockChain({ returning: jest.fn().mockResolvedValue([{ id: 'rt-2' }]) }));
    mockJwtService.sign.mockReturnValue('new-tokens');

    await service.refresh('valid-refresh-token');
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ revoked: true }));
  });

  it('throws UnauthorizedException when refresh token verification fails', async () => {
    mockJwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
    await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when refresh token not found in DB', async () => {
    const emptyChain = mockChain();
    emptyChain.limit = jest.fn().mockResolvedValue([]);
    mockDb.select.mockReturnValue(emptyChain);
    await expect(service.refresh('valid-token-no-db')).rejects.toThrow(UnauthorizedException);
  });

  it('logout revokes all refresh tokens for the user', async () => {
    await service.logout(mockUser.id);
    expect(mockDb.update).toHaveBeenCalled();
  });
});