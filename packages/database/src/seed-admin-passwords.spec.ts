import {
  generateAdminPassword,
  logSeedAdminCredentials,
} from './seed-admin-passwords';
import * as bcrypt from 'bcryptjs';

describe('seed-admin-passwords', () => {
  describe('generateAdminPassword', () => {
    it('returns a strong random password and a bcrypt hash', () => {
      const { password, hash } = generateAdminPassword();

      // 32 random bytes encoded as base64url => 43 characters.
      expect(password).toHaveLength(43);
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
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerSpy = jest.fn();
    });

    it('logs credentials in non-production environments', () => {
      logSeedAdminCredentials(
        [{ email: 'admin@example.com', password: 'secret', role: 'admin' }],
        { nodeEnv: 'development', logger: loggerSpy },
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('admin@example.com'),
      );
    });

    it('does not log credentials in production', () => {
      logSeedAdminCredentials(
        [{ email: 'admin@example.com', password: 'secret', role: 'admin' }],
        { nodeEnv: 'production', logger: loggerSpy },
      );

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('does not log anything when the credentials list is empty', () => {
      logSeedAdminCredentials([], { nodeEnv: 'development', logger: loggerSpy });
      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });
});
