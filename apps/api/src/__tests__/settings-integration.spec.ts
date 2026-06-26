import { SettingsService } from '../settings/settings.service';

describe('SettingsService (direct instantiation)', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService();
  });

  describe('getRegisterSettings', () => {
    it('returns default settings with tenantId', () => {
      const result = service.getRegisterSettings('tenant-1');

      expect(result).toEqual({
        tenantId: 'tenant-1',
        companyName: '',
        tenantName: '',
        adminName: '',
      });
    });

    it('returns settings with undefined tenantId when omitted', () => {
      const result = service.getRegisterSettings();

      expect(result.tenantId).toBeUndefined();
    });

    it('returns correct shape', () => {
      const result = service.getRegisterSettings();

      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('companyName');
      expect(result).toHaveProperty('tenantName');
      expect(result).toHaveProperty('adminName');
    });
  });
});
