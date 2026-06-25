import { ERP_MODULES, getCoreModules, getOfflineFirstModules } from '../src/modules';

describe('modules', () => {
  it('ERP_MODULES contains all 16 modules', () => {
    expect(ERP_MODULES.length).toBe(16);
  });

  it('getCoreModules returns only core maturity modules', () => {
    const core = getCoreModules();
    expect(core.every(m => m.maturity === 'core')).toBe(true);
    expect(core.some(m => m.id === 'dashboard')).toBe(true);
    expect(core.some(m => m.id === 'pos')).toBe(true);
  });

  it('getOfflineFirstModules returns modules with offlineFirst flag', () => {
    const offline = getOfflineFirstModules();
    expect(offline.every(m => m.offlineFirst)).toBe(true);
    expect(offline.some(m => m.id === 'pos')).toBe(true);
    expect(offline.some(m => m.id === 'orders')).toBe(true);
  });

  it('offlineFirst excludes accounting and settings', () => {
    const offline = getOfflineFirstModules();
    expect(offline.some(m => m.id === 'accounting')).toBe(false);
    expect(offline.some(m => m.id === 'settings')).toBe(false);
  });
});
