import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { fixedAssets, fixedAssetDepreciationLogs } from '@smart-erp/database/schema';
import { eq, and, sql, desc, lt, or, isNull } from '@smart-erp/database/drizzle';

@Injectable()
export class FixedAssetsService {
  async create(tenantId: string, dto: any) {
    const [asset] = await db
      .insert(fixedAssets)
      .values({ ...dto, tenantId })
      .returning();
    return asset;
  }

  async findAll(tenantId: string, query: { page?: number; limit?: number; category?: string; status?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(fixedAssets.tenantId, tenantId)];
    if (query.category) conditions.push(eq(fixedAssets.category, query.category));
    if (query.status) conditions.push(eq(fixedAssets.status, query.status));

    const where = and(...conditions);

    const items = await db
      .select()
      .from(fixedAssets)
      .where(where)
      .orderBy(desc(fixedAssets.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const [asset] = await db
      .select()
      .from(fixedAssets)
      .where(and(eq(fixedAssets.tenantId, tenantId), eq(fixedAssets.id, id)));

    if (!asset) throw new NotFoundException({ message: 'Fixed asset not found', errorCode: ErrorCode.FIXED_ASSET_NOT_FOUND });
    return asset;
  }

  /**
   * Run depreciation for all assets that haven't been depreciated this month
   */
  async runMonthlyDepreciation(tenantId: string) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Find active assets not depreciated this month
    const assetsToDepreciate = await db
      .select()
      .from(fixedAssets)
      .where(
        and(
          eq(fixedAssets.tenantId, tenantId),
          eq(fixedAssets.status, 'active'),
          or(
            isNull(fixedAssets.lastDepreciationDate),
            lt(fixedAssets.lastDepreciationDate, firstDayOfMonth)
          )
        )
      );

    const logs = [];
    for (const asset of assetsToDepreciate) {
      const purchaseCost = parseFloat(asset.purchaseCost);
      const residualValue = parseFloat(asset.residualValue);
      const usefulLifeMonths = asset.usefulLifeMonths;

      if (usefulLifeMonths <= 0) continue;

      const monthlyAmount = (purchaseCost - residualValue) / usefulLifeMonths;
      
      // Update asset accumulated depreciation
      await db
        .update(fixedAssets)
        .set({
          accumulatedDepreciation: (parseFloat(asset.accumulatedDepreciation) + monthlyAmount).toString(),
          lastDepreciationDate: today,
          updatedAt: today,
        })
        .where(eq(fixedAssets.id, asset.id));

      // Create log
      const [log] = await db
        .insert(fixedAssetDepreciationLogs)
        .values({
          tenantId,
          assetId: asset.id,
          amount: monthlyAmount.toString(),
          depreciationDate: today,
          notes: `Monthly depreciation for ${today.getMonth() + 1}/${today.getFullYear()}`,
        })
        .returning();
      
      logs.push(log);
    }

    return { processed: logs.length, logs };
  }

  async dispose(tenantId: string, id: string) {
    const [asset] = await db
      .update(fixedAssets)
      .set({ status: 'disposed', updatedAt: new Date() })
      .where(and(eq(fixedAssets.tenantId, tenantId), eq(fixedAssets.id, id)))
      .returning();

    if (!asset) throw new NotFoundException({ message: 'Fixed asset not found', errorCode: ErrorCode.FIXED_ASSET_NOT_FOUND });
    return asset;
  }
}