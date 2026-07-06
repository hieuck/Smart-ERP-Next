import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('@smart-erp/database', () => ({ db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ users: {}, tenants: {}, refreshTokens: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn((x) => x), and: jest.fn((...args) => args) }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

const mockQuery = (data: any[]) => {
  const chain: Record<string, any> = {};
  chain.limit = jest.fn().mockResolvedValue(data);
  chain.where = jest.fn().mockReturnValue(chain);
  return { from: jest.fn().mockReturnValue(chain) };
};

describe('Auth Flow Integration', () => {
  let authService: AuthService;
  let mockJwtService: { sign: jest.Mock; verify: jest.Mock };
  let mockGateway: { broadcastToTenant: jest.Mock };
  let mockI18n: { t: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockJwtService = {
      sign: jest.fn(() => 'signed-jwt-token'),
      verify: jest.fn(() => ({ sub: 'user-1', email: 'test@test.com', tenantId: 't1', role: 'user' })),
    };
    mockGateway = { broadcastToTenant: jest.fn() };
    mockI18n = { t: jest.fn((k: string) => k) };

    authService = new AuthService(
      { findByEmail: jest.fn() } as any,
      mockJwtService as any,
      mockGateway as any,
      mockI18n as any,
    );
  });

  describe('register → login → refresh → logout flow', () => {
    it('registers a new user and returns tokens', async () => {
      (authService as any).usersService.findByEmail.mockResolvedValue(null);
      db.select.mockReturnValue(mockQuery([]));
      db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'u1', email: 'new@test.com', name: 'Test', tenantId: 't1', role: 'admin' }]) }) });

      const result = await authService.register('new@test.com', 'password123', 'Test User', 't1');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe('new@test.com');
    });

    it('rejects duplicate email registration', async () => {
      (authService as any).usersService.findByEmail.mockResolvedValue({ id: 'existing', email: 'dup@test.com' });

      await expect(authService.register('dup@test.com', 'password123'))
        .rejects.toThrow('Email already in use');
    });

    it('validates user credentials and logs in', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      (authService as any).usersService.findByEmail.mockResolvedValue({
        id: 'user-1', email: 'user@test.com', passwordHash, tenantId: 't1', role: 'user',
      });

      const user = await authService.validateUser('user@test.com', 'correct-password');
      expect(user).not.toBeNull();
      expect(user.email).toBe('user@test.com');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('rejects invalid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      (authService as any).usersService.findByEmail.mockResolvedValue({
        id: 'user-1', email: 'user@test.com', passwordHash, tenantId: 't1', role: 'user',
      });

      const user = await authService.validateUser('user@test.com', 'wrong-password');
      expect(user).toBeNull();
    });

    it('returns null for non-existent user', async () => {
      (authService as any).usersService.findByEmail.mockResolvedValue(null);
      const user = await authService.validateUser('nonexistent@test.com', 'any');
      expect(user).toBeNull();
    });

    it('refreshes token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token-value';
      const storedHash = await bcrypt.hash(refreshToken, 10);
      db.select.mockReturnValue(mockQuery([{ id: 'rt-1', token: storedHash, revoked: false }]));
      db.update.mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) });
      db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'new-rt' }]) }) });
      (authService as any).usersService.findByEmail.mockResolvedValue({
        id: 'user-1', email: 'user@test.com', tenantId: 't1', role: 'user',
      });
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', email: 'user@test.com', tenantId: 't1', role: 'user' });

      const result = await authService.refresh(refreshToken);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('rejects revoked refresh token', async () => {
      db.select.mockReturnValue(mockQuery([]));

      await expect(authService.refresh('revoked-token'))
        .rejects.toThrow('Refresh token not found or revoked');
    });

    it('revokes all refresh tokens on logout', async () => {
      db.update.mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) });
      await authService.logout('user-1');
      expect(db.update).toHaveBeenCalled();
    });
  });
});
