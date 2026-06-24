import { AuthController } from './auth.controller';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let authService: any;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      validateUser: jest.fn(),
      login: jest.fn(),
    };
    controller = new AuthController(authService);
  });

  describe('register', () => {
    it('delegates to authService.register with all fields', async () => {
      const dto = { email: 'test@test.com', password: 'password123', name: 'Test', tenantId: 't1', companyName: 'Acme' };
      authService.register.mockResolvedValue({ access_token: 'tok' });

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith('test@test.com', 'password123', 'Test', 't1', 'Acme');
      expect(result).toEqual({ access_token: 'tok' });
    });

    it('delegates to authService.register with optional fields omitted', async () => {
      const dto = { email: 'a@b.com', password: 'pass1234', name: 'A', tenantId: undefined, companyName: undefined };
      authService.register.mockResolvedValue({ access_token: 'tok' });

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith('a@b.com', 'pass1234', 'A', undefined, undefined);
      expect(result).toEqual({ access_token: 'tok' });
    });
  });

  describe('login', () => {
    it('validates user and returns login result', async () => {
      const dto = { email: 'a@b.com', password: 'pass' };
      const user = { id: 'u1', email: 'a@b.com' };
      authService.validateUser.mockResolvedValue(user);
      authService.login.mockResolvedValue({ access_token: 'tok', user });

      const result = await controller.login(dto);

      expect(authService.validateUser).toHaveBeenCalledWith('a@b.com', 'pass');
      expect(authService.login).toHaveBeenCalledWith(user);
      expect(result).toEqual({ access_token: 'tok', user });
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith('a@b.com', 'wrong');
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns req.user', () => {
      const req = { user: { tenantId: 't1', sub: 'u1', email: 'a@b.com' } };
      const result = controller.getProfile(req);
      expect(result).toEqual(req.user);
    });
  });
});
