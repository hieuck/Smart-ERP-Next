import { ApiKeyService, generateApiKey } from './api-key.service';

jest.mock('@smart-erp/database', () => ({
  db: { insert: jest.fn(), select: jest.fn(), update: jest.fn() },
}));
jest.mock('@smart-erp/database/schema', () => ({ apiKeys: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn((x) => x), and: jest.fn((...args) => args) }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

describe('ApiKeyService usage tracking', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_KEY_HMAC_SECRET = 'test-hmac-secret';
    db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) });
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'k1' }]) }) });
    db.update.mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) });
    service = new ApiKeyService();
  });

  it('rejects key creation when API_KEY_HMAC_SECRET is missing', async () => {
    delete process.env.API_KEY_HMAC_SECRET;
    await expect(service.createKey('t1', 'test', 'u1')).rejects.toThrow('API_KEY_HMAC_SECRET');
  });

  it('records last used timestamp on validation', async () => {
    db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ id: 'k1', tenantId: 't1' }]) }) });
    const result = await service.validateKey('smart_erp_abcdefghijklmnopqrstuvwx');
    expect(result).toEqual({ tenantId: 't1', keyId: 'k1' });
    expect(db.update).toHaveBeenCalled();
  });

  it('returns usage statistics for a key', async () => {
    db.select.mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) });
    const stats = await service.getUsageStats('t1', 'k1');
    expect(stats).toBeDefined();
  });
});
