import {
  generateAdminPassword,
  logSeedAdminCredentials,
} from './seed-admin-passwords';
import * as bcrypt from 'bcryptjs';

describe('seed-admin-passwords', () => {
  describe('generateAdminPassword', () => {
    it('returns a strong random password and a bcrypt hash', () => {
      const { password, hash } = generateAdminPassword();

      expect(password).toHaveLength(32);
      expect(password).not.toBe('admin123');
      expect(password).not.toBe('demo123456');
      expect(bcrypt.compareSync(password, hash)).toBe(true);
    });

    it('returns a different password on each call', () => {
      const first = generateAdminPassword();
      const second = generateAdminPassword();

      expect(first.password).not.toBe(second.password);
      expect(first.hash).not.toBe(second.hash);
    });
  });

  describe('logSeedAdminCredentials', () => {
    const originalEnv = process.env.NODE_ENV;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('logs credentials in non-production environments', () => {
      process.env.NODE_ENV = 'development';

      logSeedAdminCredentials([
        { email: 'admin@example.com', password: 'secret', role: 'admin' },
      ]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('admin@example.com'),
      );
    });

    it('does not log credentials in production', () => {
      process.env.NODE_ENV = 'production';

      logSeedAdminCredentials([
        { email: 'admin@example.com', password: 'secret', role: 'admin' },
      ]);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
