import {
  ERP_MODULES,
  getCoreModules,
  getOfflineFirstModules,
} from '../src/modules';
import {
  getLocalizationProfile,
  LOCALIZATION_PROFILES,
  SUPPORTED_LOCALES,
} from '../src/localization';
import {
  getPlatform,
  NATIVE_PLATFORMS,
} from '../src/platforms';
import { DIFFERENTIATION_PILLARS } from '../src/positioning';
import { formatDate, formatNumber, formatVND } from '../src/utils/formatters';

describe('shared ERP catalog metadata', () => {
  it('keeps platform definitions addressable by id and package name', () => {
    expect(NATIVE_PLATFORMS).toHaveLength(5);
    expect(getPlatform('web')).toMatchObject({
      packageName: '@smart-erp/web',
      runtime: 'Next.js App Router',
    });
    expect(getPlatform('desktop')?.nativeSurface).toContain('Windows');
    expect(getPlatform('api')?.responsibility).toContain('Tenant-scoped');
    expect(getPlatform('docs')?.packageName).toBe('@smart-erp/docs');
  });

  it('groups modules by maturity and offline-first behavior', () => {
    const coreIds = getCoreModules().map((module) => module.id);
    const offlineIds = getOfflineFirstModules().map((module) => module.id);

    expect(coreIds).toEqual(expect.arrayContaining(['dashboard', 'pos', 'products', 'inventory', 'accounting']));
    expect(coreIds).not.toContain('hrm');
    expect(offlineIds).toEqual(expect.arrayContaining(['pos', 'orders', 'customers', 'purchasing']));
    expect(offlineIds).not.toContain('dashboard');
    expect(ERP_MODULES.every((module) => module.i18nKey.startsWith('nav.'))).toBe(true);
  });

  it('captures Vietnam-first localization defaults', () => {
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'en']);
    expect(getLocalizationProfile()).toBe(LOCALIZATION_PROFILES.vi);
    expect(getLocalizationProfile('vi')).toMatchObject({
      defaultCurrency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      taxCodeLabel: 'Mã số thuế',
    });
    expect(getLocalizationProfile('en')).toMatchObject({
      defaultCurrency: 'USD',
      timezone: 'UTC',
      taxCodeLabel: 'Tax code',
    });
  });

  it('documents product positioning against local ERP competitors', () => {
    expect(DIFFERENTIATION_PILLARS.map((pillar) => pillar.id)).toEqual([
      'native-everywhere',
      'offline-first',
      'vietnam-first-localization',
      'tenant-safe-realtime',
    ]);
    expect(DIFFERENTIATION_PILLARS.find((pillar) => pillar.id === 'offline-first')?.beats).toEqual(
      expect.arrayContaining(['KiotViet', 'Nhanhvn', 'MISA'])
    );
  });
});

describe('shared display formatters', () => {
  it('formats Vietnamese currency and numbers consistently', () => {
    expect(formatVND(1234567)).toBe('1.234.567 ₫');
    expect(formatNumber(1234567.89)).toBe('1.234.567,89');
  });

  it('formats Date instances and ISO date strings', () => {
    expect(formatDate(new Date('2026-05-20T00:00:00.000Z'), 'en-US')).toBe('5/20/2026');
    expect(formatDate('2026-05-20T00:00:00.000Z', 'en-US')).toBe('5/20/2026');
    expect(formatDate('2026-05-20T00:00:00.000Z')).toBe('20/5/2026');
  });
});
