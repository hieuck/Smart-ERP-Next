import {
  SUPPORTED_LOCALES,
  LOCALIZATION_PROFILES,
  getLocalizationProfile,
} from '../src/localization';

describe('localization', () => {
  it('supports vi and en locales', () => {
    expect(SUPPORTED_LOCALES).toContain('vi');
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES.length).toBe(2);
  });

  it('getLocalizationProfile returns vi profile by default', () => {
    const profile = getLocalizationProfile();
    expect(profile.locale).toBe('vi');
    expect(profile.defaultCurrency).toBe('VND');
  });

  it('getLocalizationProfile returns en profile', () => {
    const profile = getLocalizationProfile('en');
    expect(profile.locale).toBe('en');
    expect(profile.defaultCurrency).toBe('USD');
    expect(profile.dateFormat).toBe('MM/dd/yyyy');
  });

  it('vi profile has Vietnamese payment methods', () => {
    const vi = LOCALIZATION_PROFILES.vi;
    expect(vi.paymentMethods).toContain('momo');
    expect(vi.paymentMethods).toContain('vnpay');
    expect(vi.taxCodeLabel).toBe('Mã số thuế');
  });
});
