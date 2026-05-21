// @ts-nocheck
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { currencies as currenciesTable, exchangeRates } from '@smart-erp/database/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { ExchangeRateDto, UpdateExchangeRateDto, CreateCurrencyDto } from './dto';

@Injectable()
export class CurrenciesService {
  async create(tenantId: string, data: CreateCurrencyDto) {
    const existing = await db
      .select()
      .from(currenciesTable)
      .where(
        and(
          eq(currenciesTable.tenantId, tenantId),
          eq(currenciesTable.code, data.code)
        )
      )
      .limit(1);

    if (existing.length) {
      throw new ConflictException('Currency code already exists for this tenant');
    }

    const newCurrency = await db
      .insert(currenciesTable)
      .values({
        tenantId,
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: data.decimalPlaces?.toString() ?? '2',
        isBaseCurrency: data.isBaseCurrency ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newCurrency[0];
  }

  async findAll(tenantId: string) {
    return await db
      .select()
      .from(currenciesTable)
      .where(eq(currenciesTable.tenantId, tenantId));
  }

  async findOne(tenantId: string, id: string) {
    const [currency] = await db
      .select()
      .from(currenciesTable)
      .where(and(eq(currenciesTable.tenantId, tenantId), eq(currenciesTable.id, id)))
      .limit(1);
    if (!currency) throw new NotFoundException('Currency not found');
    return currency;
  }

  async getBaseCurrency(tenantId: string) {
    const [base] = await db
      .select()
      .from(currenciesTable)
      .where(
        and(
          eq(currenciesTable.tenantId, tenantId),
          eq(currenciesTable.isBaseCurrency, true)
        )
      )
      .limit(1);
    return base;
  }

  async update(tenantId: string, id: string, data: Partial<CreateCurrencyDto>) {
    const existing = await this.findOne(tenantId, id);
    if (!existing) throw new NotFoundException();

    const [updated] = await db
      .update(currenciesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(currenciesTable.tenantId, tenantId), eq(currenciesTable.id, id)))
      .returning();
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    if (existing.isBaseCurrency) {
      throw new ConflictException('Cannot delete the base currency of the tenant');
    }
    await db
      .delete(currenciesTable)
      .where(and(eq(currenciesTable.tenantId, tenantId), eq(currenciesTable.id, id)));
    return { success: true };
  }

  // Exchange Rate Management
  async createExchangeRate(tenantId: string, dto: ExchangeRateDto) {
    // Validate currencies exist
    const [fromCurrency, toCurrency] = await Promise.all([
      db.select().from(currenciesTable).where(and(eq(currenciesTable.tenantId, tenantId), eq(currenciesTable.code, dto.fromCurrency))).limit(1),
      db.select().from(currenciesTable).where(and(eq(currenciesTable.tenantId, tenantId), eq(currenciesTable.code, dto.toCurrency))).limit(1),
    ]);

    if (!fromCurrency[0] || !toCurrency[0]) {
      throw new NotFoundException('One or both currencies not found');
    }

    // Validate date range if provided
    if (dto.effectiveFrom && dto.effectiveTo) {
      if (new Date(dto.effectiveFrom) > new Date(dto.effectiveTo)) {
        throw new ConflictException('Effective from date must be before effective to date');
      }
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const [rate] = await db
      .insert(exchangeRates)
      .values({
        fromCurrencyId: fromCurrency[0].id,
        toCurrencyId: toCurrency[0].id,
        rate: dto.rate.toString(),
        effectiveDate: effectiveFrom,
      })
      .returning();

    return rate;
  }

  async getExchangeRate(tenantId: string, fromCurrency: string, toCurrency: string, atDate?: string) {
    // Resolve currency IDs
    const fromRes = await db.select().from(currenciesTable).where(eq(currenciesTable.code, fromCurrency)).limit(1);
    const toRes = await db.select().from(currenciesTable).where(eq(currenciesTable.code, toCurrency)).limit(1);

    if (!fromRes[0] || !toRes[0]) {
      throw new NotFoundException('Currency not found');
    }

    const fromId = fromRes[0].id;
    const toId = toRes[0].id;

    const conditions = [
      eq(exchangeRates.fromCurrencyId, fromId),
      eq(exchangeRates.toCurrencyId, toId),
    ];

    if (atDate) {
      const date = new Date(atDate);
      conditions.push(lte(exchangeRates.effectiveDate, date));
    } else {
      conditions.push(lte(exchangeRates.effectiveDate, new Date()));
    }

    const rate = await db
      .select()
      .from(exchangeRates)
      .where(and(...conditions))
      .orderBy(desc(exchangeRates.createdAt))
      .limit(1);

    if (!rate.length) {
      throw new NotFoundException('Exchange rate not found');
    }

    return rate[0];
  }

  async getExchangeRates(tenantId: string, baseCurrency: string = 'VND') {
    const baseRes = await db.select().from(currenciesTable).where(eq(currenciesTable.code, baseCurrency)).limit(1);
    if (!baseRes[0]) {
      throw new NotFoundException('Base currency not found');
    }

    const baseId = baseRes[0].id;

    const rates = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.toCurrencyId, baseId),
          lte(exchangeRates.effectiveDate, new Date()),
        )
      )
      .orderBy(desc(exchangeRates.createdAt));

    // De-duplicate by fromCurrencyId, keep latest
    const seen = new Map();
    for (const rate of rates) {
      if (!seen.has(rate.fromCurrencyId)) {
        seen.set(rate.fromCurrencyId, rate);
      }
    }

    return Array.from(seen.values());
  }

  async updateExchangeRate(tenantId: string, id: string, dto: UpdateExchangeRateDto) {
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.id, id))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundException('Exchange rate not found');
    }

    const updates: any = {};
    if (dto.rate !== undefined) updates.rate = dto.rate.toString();
    if (dto.effectiveFrom) updates.effectiveDate = new Date(dto.effectiveFrom);

    const [updated] = await db
      .update(exchangeRates)
      .set(updates)
      .where(eq(exchangeRates.id, id))
      .returning();

    return updated;
  }

  async removeExchangeRate(tenantId: string, id: string) {
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.id, id))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundException('Exchange rate not found');
    }

    await db
      .delete(exchangeRates)
      .where(eq(exchangeRates.id, id));

    return { success: true };
  }

  async convertAmount(tenantId: string, amount: number, fromCurrency: string, toCurrency: string, atDate?: string) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rateRecord = await this.getExchangeRate(tenantId, fromCurrency, toCurrency, atDate);
    const rate = parseFloat(rateRecord.rate);
    return amount * rate;
  }
}
