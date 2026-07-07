import { I18nService } from './i18n.service';

describe('I18nService', () => {
  const service = new I18nService();

  it('loads supported locales from the shared i18n package', () => {
    expect(service.getAvailableLocales().sort()).toEqual(['en', 'pt', 'ru', 'vi']);
  });

  it('translates nested keys and falls back to Vietnamese', () => {
    expect(service.t('actions.save', 'en')).toBe('Save');
    expect(service.t('actions.save', 'vi')).toBe('Lưu');
    expect(service.t('actions.save')).toBe('Lưu');
    expect(service.t('actions.save', 'missing-locale')).toBe('Lưu');
  });

  it('returns the key when no translation exists', () => {
    expect(service.t('missing.translation.key', 'en')).toBe('missing.translation.key');
  });

  it('interpolates known params and preserves missing params', () => {
    expect(service.t('validation.required', 'en', { field: 'Email' })).toBe('Email is required');
    expect(service.t('validation.required', 'en', {})).toBe('{{field}} is required');
    expect(service.t('validation.required', 'en')).toBe('{{field}} is required');
  });

  it('discovers locales by walking parent directories when fixed candidates are absent', async () => {
    jest.resetModules();
    const existsSync = jest.fn((filePath: string) => {
      if (filePath.endsWith('common.json')) return true;
      return existsSync.mock.calls.length === 4;
    });
    jest.doMock('fs', () => ({
      existsSync,
      readdirSync: jest.fn(() => ['vi', 'en', 'README.md']),
      readFileSync: jest.fn((filePath: string) => JSON.stringify(
        filePath.includes('\\en\\') || filePath.includes('/en/')
          ? { actions: { save: 'Save' } }
          : { actions: { save: 'Luu' } },
      )),
    }));
    const { I18nService: MockedI18nService } = await import('./i18n.service');

    const mockedService = new MockedI18nService();

    expect(mockedService.getAvailableLocales().sort()).toEqual(['en', 'vi']);
    expect(mockedService.t('actions.save', 'en')).toBe('Save');
    jest.dontMock('fs');
  });

  it('throws a clear error when the locales directory cannot be located', async () => {
    jest.resetModules();
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => false),
      readdirSync: jest.fn(),
      readFileSync: jest.fn(),
    }));
    const { I18nService: MockedI18nService } = await import('./i18n.service');

    expect(() => new MockedI18nService()).toThrow('Could not locate locales directory');
    jest.dontMock('fs');
  });

  it('skips malformed locale files and logs a warning without crashing', async () => {
    jest.resetModules();
    jest.doMock('fs', () => ({
      existsSync: jest.fn((filePath: string) =>
        filePath.endsWith('common.json') || filePath.endsWith('locales'),
      ),
      readdirSync: jest.fn(() => ['vi', 'en']),
      readFileSync: jest.fn((filePath: string) => {
        if (filePath.includes('\\en\\') || filePath.includes('/en/')) {
          return '{ invalid json }';
        }
        return JSON.stringify({ actions: { save: 'Luu' } });
      }),
    }));
    const warnMock = jest.fn();
    jest.doMock('@nestjs/common', () => {
      class MockedLogger {
        constructor(private readonly context?: string) {}
        warn(message: string) {
          warnMock(message);
        }
      }
      return {
        Injectable: () => () => undefined,
        Logger: MockedLogger,
      };
    });
    const { I18nService: MockedI18nService } = await import('./i18n.service');

    const mockedService = new MockedI18nService();

    expect(mockedService.getAvailableLocales()).toEqual(['vi']);
    expect(mockedService.t('actions.save', 'en')).toBe('Luu');
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(expect.stringContaining('common.json'));
    expect(warnMock).toHaveBeenCalledWith(expect.stringContaining('Failed to parse locale file'));
    jest.dontMock('@nestjs/common');
    jest.dontMock('fs');
  });
});
