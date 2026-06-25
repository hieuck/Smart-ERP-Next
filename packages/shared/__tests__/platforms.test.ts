import { NATIVE_PLATFORMS, getPlatform } from '../src/platforms';

describe('platforms', () => {
  it('NATIVE_PLATFORMS contains all 5 platforms', () => {
    expect(NATIVE_PLATFORMS.length).toBe(5);
  });

  it('getPlatform returns correct platform by id', () => {
    const api = getPlatform('api');
    expect(api?.packageName).toBe('@smart-erp/api');
    expect(api?.runtime).toContain('NestJS');
  });

  it('getPlatform returns undefined for unknown id', () => {
    expect(getPlatform('unknown' as any)).toBeUndefined();
  });

  it('mobile platform is defined', () => {
    const mobile = getPlatform('mobile');
    expect(mobile?.runtime).toContain('Expo');
  });
});
