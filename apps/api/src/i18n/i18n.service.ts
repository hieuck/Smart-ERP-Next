import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

interface Translations {
  [key: string]: string | Translations;
}

@Injectable()
export class I18nService {
  private translations: Map<string, Translations> = new Map();
  private defaultLocale = 'vi';

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations() {
    const candidates = [
      path.resolve(__dirname, 'locales'),
      path.resolve(__dirname, '../../../src/i18n/locales'),
      path.resolve(__dirname, '../../../../src/i18n/locales'),
    ];
    let localesPath = candidates.find(p => fs.existsSync(p));
    if (!localesPath) {
      let currentDir = __dirname;
      for (let i = 0; i < 10; i++) {
        for (const check of ['locales', 'apps/api/src/i18n/locales', 'packages/i18n/src/locales']) {
          const checkPath = path.join(currentDir, check);
          if (fs.existsSync(checkPath)) { localesPath = checkPath; break; }
        }
        if (localesPath) break;
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
      }
    }
    if (!localesPath) {
      throw new Error(`Could not locate locales directory from ${__dirname}`);
    }
    const locales = fs.readdirSync(localesPath).filter(f => f.match(/^(vi|en)$/));
    for (const locale of locales) {
      const filePath = path.join(localesPath, locale, 'common.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        this.translations.set(locale, data);
      }
    }
  }

  t(key: string, locale?: string, params?: Record<string, any>): string {
    const lang = locale || this.defaultLocale;
    const translation = this.getNestedValue(this.translations.get(lang), key);
    if (!translation) {
      const fallback = this.getNestedValue(this.translations.get(this.defaultLocale), key);
      if (!fallback) return key;
      return this.interpolate(fallback, params);
    }
    return this.interpolate(translation, params);
  }

  private getNestedValue(obj: any, path: string): string | undefined {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }

  private interpolate(str: string, params?: Record<string, any>): string {
    if (!params) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
  }

  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }
}
