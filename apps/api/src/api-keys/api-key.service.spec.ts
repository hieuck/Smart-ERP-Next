import { ApiKeyService, generateApiKey } from './api-key.service';

jest.mock('@smart-erp/database', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('@smart-erp/database/schema', () => ({ apiKeys: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn((x) => x), and: jest.fn((...args) => args) }));

const { db } = jest.requireMock('@smart-erp/database') as any;

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'key-1', createdAt: new Date() }]) }) });
    db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) });
    db.update.mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) });
    service = new ApiKeyService();
  });

  describe('generateApiKey', () => {
    it('returns a key in the format smart_erp_xxxxxxxxxxxxxxxx', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^smart_erp_[a-z0-9]{24}$/);
    });

    it('generates unique keys on successive calls', () => {
      const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
      expect(keys.size).toBe(100);
    });
  });

  describe('createKey', () => {
    it('creates a key for a tenant and returns the masked key', async () => {
      const result = await service.createKey('tenant-1', 'Integration App', 'user-1');
      expect(result.name).toBe('Integration App');
      expect(result.maskedKey).toMatch(/^smart_erp_[a-z0-9]+\*+$/);
    });
  });

  describe('validateKey', () => {
    it('returns null for invalid key format', async () => {
      const result = await service.validateKey('invalid-key');
      expect(result).toBeNull();
    });

    it('returns null when key not found in database', async () => {
      const result = await service.validateKey('smart_erp_abcdefghijklmnopqrstuvwx');
      expect(result).toBeNull();
    });
  });
});
