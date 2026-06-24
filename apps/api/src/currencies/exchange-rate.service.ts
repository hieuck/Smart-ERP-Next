import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DrizzleService } from '../drizzle/drizzle.service';
import { currencies, exchangeRates } from '@smart-erp/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  fetchedAt: string;
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
    const [rate] = await this.drizzle.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          // @ts-ignore
          eq(exchangeRates.baseCurrency, fromCurrency),
          // @ts-ignore
          eq(exchangeRates.targetCurrency, toCurrency),
        ),
      )
      // @ts-ignore
      .orderBy(desc(exchangeRates.fetchedAt))
      .limit(1);

    if (rate) {
      // @ts-ignore
      const age = Date.now() - new Date(rate.fetchedAt).getTime();
      // Cache valid for 1 hour (3600000ms)
      if (age < 3600000) {
        return {
          // @ts-ignore
          fromCurrency: rate.baseCurrency,
          // @ts-ignore
          toCurrency: rate.targetCurrency,
          rate: Number(rate.rate),
          // @ts-ignore
          source: rate.source,
          // @ts-ignore
          fetchedAt: rate.fetchedAt,
        };
      }
    }
    return null;
  }

  private async getLastKnownRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    const [rate] = await this.drizzle.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          // @ts-ignore
          eq(exchangeRates.baseCurrency, fromCurrency),
          // @ts-ignore
          eq(exchangeRates.targetCurrency, toCurrency),
        ),
      )
      // @ts-ignore
      .orderBy(desc(exchangeRates.fetchedAt))
      .limit(1);

    if (rate) {
      return {
        // @ts-ignore
        fromCurrency: rate.baseCurrency,
        // @ts-ignore
        toCurrency: rate.targetCurrency,
        rate: Number(rate.rate),
        source: 'cached',
        // @ts-ignore
        fetchedAt: rate.fetchedAt,
      };
    }

    // Ultimate fallback
    return { fromCurrency, toCurrency, rate: 1, source: 'fallback', fetchedAt: new Date().toISOString() };
  }

  private async cacheRate(rate: ExchangeRate) {
    await this.drizzle.db.insert(exchangeRates).values({
      baseCurrency: rate.fromCurrency,
      targetCurrency: rate.toCurrency,
      rate: rate.rate,
      source: rate.source,
      fetchedAt: rate.fetchedAt,
    } as any);
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