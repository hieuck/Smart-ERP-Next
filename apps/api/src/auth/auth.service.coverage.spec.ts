import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

const mockUsersService = { findByEmail: jest.fn(), create: jest.fn() };
const mockNotificationsGateway = { sendNotification: jest.fn() };
const mockI18n = { t: jest.fn((k: string) => k) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    const jwtService = new JwtService({ secret: 'test' });
    service = new AuthService(mockUsersService as any, jwtService as any, mockNotificationsGateway as any, mockI18n as any);
  });

  afterEach(() => { jest.clearAllTimers(); });

  it('rejects when user not found', async () => {
    mockUsersService.findByEmail.mockResolvedValue(null);
    await expect(service.validateUser('x@x.com', 'pw')).resolves.toBeNull();
  });

  it('rejects wrong password', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('pw', 10);
    mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com', passwordHash: hash });
    await expect(service.validateUser('a@a.com', 'wrong')).resolves.toBeNull();
  });

  it('strips password from valid user', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('ok', 10);
    mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com', passwordHash: hash });
    const r = await service.validateUser('a@a.com', 'ok');
    expect(r.passwordHash).toBeUndefined();
  });
});
