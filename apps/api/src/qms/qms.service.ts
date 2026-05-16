import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { qmsInspectionPlans, qmsInspections, qmsNcrs, products } from '@smart-erp/database/schema';
import { eq, and, sql, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class QmsService {
  /** Create a new inspection plan */
  async createPlan(tenantId: string, data: any) {
    const [plan] = await db
      .insert(qmsInspectionPlans)
      .values({
        ...data,
        tenantId,
      })
      .returning();
    return plan;
  }

  /** Record a quality inspection result */
  async recordInspection(tenantId: string, userId: string, data: any) {
    const [inspection] = await db
      .insert(qmsInspections)
      .values({
        ...data,
        tenantId,
        inspectedBy: userId,
        inspectionDate: new Date(),
      })
      .returning();
      
    // Auto-create NCR if inspection fails
    if (data.verdict === 'fail') {
      await this.createNCR(tenantId, userId, {
        productId: data.productId || null,
        defectCode: 'INSP-FAIL',
        description: `Failed inspection: ${data.notes || 'No notes'}`,
        severity: 'high',
      });
    }

    return inspection;
  }

  async createNCR(tenantId: string, userId: string, data: any) {
    const code = `NCR-${Date.now().toString(36).toUpperCase()}`;
    const [ncr] = await db
      .insert(qmsNcrs)
      .values({
        ...data,
        tenantId,
        code,
        reportedBy: userId,
        reportedAt: new Date(),
      })
      .returning();
    return ncr;
  }

  async getInspections(tenantId: string) {
    return db
      .select()
      .from(qmsInspections)
      .where(eq(qmsInspections.tenantId, tenantId))
      .orderBy(desc(qmsInspections.inspectionDate));
  }

  async getSupplierQualityReport(tenantId: string) {
    // Advanced analytic query to rank suppliers by quality performance
    // For demo, returning structured mock based on the analytical logic
    return [
      { supplierId: 'Công ty Samsung Vina', totalInspections: 120, passRate: 99.2, grade: 'A', score: 98, openNCRs: 0, criticalNCRs: 0 },
      { supplierId: 'LG Display VN', totalInspections: 85, passRate: 94.5, grade: 'B', score: 88, openNCRs: 1, criticalNCRs: 0 },
      { supplierId: 'Foxconn Vietnam', totalInspections: 200, passRate: 82.1, grade: 'C', score: 75, openNCRs: 4, criticalNCRs: 1 },
    ];
  }
}