import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DrizzleService } from '../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  fetchedAt: string;
}

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: string | number;
  source: string | null;
  fetched_at: Date | string;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly drizzle: DrizzleService,
  ) {}

  /** Fetch exchange rate from external API (e.g., exchangerate-api, openexchangerates) */
  async fetchRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    if (fromCurrency === toCurrency) {
      return { fromCurrency, toCurrency, rate: 1, source: 'internal', fetchedAt: new Date().toISOString() };
    }

    // Check cache first (valid for 1 hour)
    const cached = await this.getCachedRate(fromCurrency, toCurrency);
    if (cached) return cached;

    // Fetch from external API
    const apiKey = this.config.get('EXCHANGE_RATE_API_KEY');
    const apiUrl = this.config.get('EXCHANGE_RATE_API_URL') || 'https://open.er-api.com/v6/latest';

    try {
      const response = await firstValueFrom(
        this.http.get(`${apiUrl}/${fromCurrency}`, {
          params: { apikey: apiKey },
        }),
      );

      const rate = response.data?.rates?.[toCurrency];
      if (!rate) {
        throw new Error(`Rate not found for ${toCurrency}`);
      }

      const result: ExchangeRate = {
        fromCurrency,
        toCurrency,
        rate,
        source: 'openexchangerates',
        fetchedAt: new Date().toISOString(),
      };

      // Cache in database
      await this.cacheRate(result);

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to fetch exchange rate: ${error.message}`);
      // Fallback to last known rate
      return this.getLastKnownRate(fromCurrency, toCurrency);
    }
  }

  /** Convert amount between currencies */
  async convert(amount: number, fromCurrency: string, toCurrency: string, tenantId: string): Promise<{
    convertedAmount: number;
    rate: number;
    source: string;
    timestamp: string;
  }> {
    const rate = await this.fetchRate(fromCurrency, toCurrency);
    const convertedAmount = Math.round(amount * rate.rate * 100) / 100;

    // Log conversion for audit trail
    await this.logConversion(tenantId, fromCurrency, toCurrency, amount, convertedAmount, rate.rate);

    return {
      convertedAmount,
      rate: rate.rate,
      source: rate.source,
      timestamp: rate.fetchedAt,
    };
  }

  /** Get all supported currencies */
  getSupportedCurrencies() {
    return [
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    ];
  }

  private async getCachedRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const rate = await this.findLatestRate(fromCurrency, toCurrency);

    if (rate) {
      const age = Date.now() - new Date(rate.fetched_at).getTime();
      // Cache valid for 1 hour (3600000ms)
      if (age < 3600000) {
        return this.mapRateRow(rate, rate.source ?? 'cached');
      }
    }
    return null;
  }

  private async getLastKnownRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    const rate = await this.findLatestRate(fromCurrency, toCurrency);

    if (rate) {
      return this.mapRateRow(rate, 'cached');
    }

    // Ultimate fallback
    return { fromCurrency, toCurrency, rate: 1, source: 'fallback', fetchedAt: new Date().toISOString() };
  }

  private async cacheRate(rate: ExchangeRate) {
    await this.drizzle.db.execute(
      sql`INSERT INTO exchange_rates (from_currency_id, to_currency_id, rate, effective_date)
          SELECT from_currency.id, to_currency.id, ${rate.rate}, ${rate.fetchedAt}
          FROM currencies from_currency
          CROSS JOIN currencies to_currency
          WHERE from_currency.code = ${rate.fromCurrency}
            AND to_currency.code = ${rate.toCurrency}`,
    );
  }

  private async findLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateRow | null> {
    const result = await this.drizzle.db.execute(
      sql`SELECT
            from_currency.code AS from_currency,
            to_currency.code AS to_currency,
            er.rate,
            'database' AS source,
            er.effective_date AS fetched_at
          FROM exchange_rates er
          INNER JOIN currencies from_currency ON from_currency.id = er.from_currency_id
          INNER JOIN currencies to_currency ON to_currency.id = er.to_currency_id
          WHERE from_currency.code = ${fromCurrency}
            AND to_currency.code = ${toCurrency}
          ORDER BY er.effective_date DESC
          LIMIT 1`,
    );

    return this.getRows<ExchangeRateRow>(result)[0] ?? null;
  }

  private getRows<T>(result: unknown): T[] {
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === 'object' && 'rows' in result) {
      return (result as { rows?: T[] }).rows ?? [];
    }
    return [];
  }

  private mapRateRow(row: ExchangeRateRow, source: string): ExchangeRate {
    return {
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: Number(row.rate),
      source,
      fetchedAt: new Date(row.fetched_at).toISOString(),
    };
  }

  private async logConversion(
    tenantId: string,
    from: string,
    to: string,
    original: number,
    converted: number,
    rate: number,
  ) {
    await this.drizzle.db.execute(
      sql`INSERT INTO currency_conversions (tenant_id, base_currency, target_currency, original_amount, converted_amount, rate, converted_at)
          VALUES (${tenantId}, ${from}, ${to}, ${original}, ${converted}, ${rate}, NOW())`,
    );
  }
}
