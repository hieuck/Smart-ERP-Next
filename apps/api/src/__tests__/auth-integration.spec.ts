import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('@smart-erp/database', () => ({ db: { select: jest.fn(), insert: jest.fn(() => ({ values: jest.fn() })), execute: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ users: {}, tenants: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn(), sql: jest.fn() }));

describe('AuthService Integration (unit, with bcrypt)', () => {
  let authService: AuthService;
  const mockUsersService = { findByEmail: jest.fn() };
  const mockJwtService = { sign: jest.fn(() => 'signed-jwt') };
  const mockGateway = { broadcast: jest.fn() };
  const mockI18n = { t: jest.fn((k: string) => k) };

  const testUser = {
    id: 'uid-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: bcrypt.hashSync('pass123', 10),
    tenantId: 'tenant-1',
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new (AuthService as any)(
      mockUsersService,
      mockJwtService,
      mockGateway,
      mockI18n,
    );
  });

  it('validateUser returns user without passwordHash for valid credentials', async () => {
    mockUsersService.findByEmail.mockResolvedValue(testUser);
    const result = await authService.validateUser('test@example.com', 'pass123');
    expect(result).toBeDefined();
    expect(result.passwordHash).toBeUndefined();
    expect(result.email).toBe('test@example.com');
  });

  it('validateUser returns null for wrong password', async () => {
    mockUsersService.findByEmail.mockResolvedValue(testUser);
    const result = await authService.validateUser('test@example.com', 'wrong');
    expect(result).toBeNull();
  });

  it('validateUser returns null for unknown email', async () => {
    mockUsersService.findByEmail.mockResolvedValue(null);
    const result = await authService.validateUser('nobody@example.com', 'pass123');
    expect(result).toBeNull();
  });

  it('login returns access_token, refresh_token, and user', async () => {
    const user = { id: 'uid-1', email: 'test@example.com', name: 'Test', tenantId: 't1', role: 'user' };
    const result = await authService.login(user);
    expect(result.access_token).toBe('signed-jwt');
    expect(result.refresh_token).toBe('signed-jwt');
    expect(result.user.email).toBe('test@example.com');
  });

  it('register throws ConflictException for duplicate email', async () => {
    mockUsersService.findByEmail.mockResolvedValue(testUser);
    await expect(authService.register('test@example.com', 'pass123'))
      .rejects.toThrow('Email already in use');
  });
});