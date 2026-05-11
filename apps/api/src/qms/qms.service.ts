import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { eq, and, sql } from '@smart-erp/database/drizzle';

@Injectable()
export class QmsService {
  // Plans
  async createPlan(data: any) {
    const [plan] = await db.insert(qms_inspection_plans).values(data).returning();
    return plan;
  }

  async getPlans(tenantId: string, productId?: string) {
    const conditions = [eq(qms_inspection_plans.tenantId, tenantId)];
    if (productId) conditions.push(eq(qms_inspection_plans.productId, productId));
    const plans = await db.select().from(qms_inspection_plans).where(and(...conditions));
    return plans;
  }

  // Characteristics
  async addCharacteristic(planId: string, data: any) {
    const [char] = await db.insert(qms_inspection_characteristics).values({ ...data, planId }).returning();
    return char;
  }

  // Inspections
  async recordInspection(data: any, results: any[]) {
    const [inspection] = await db.insert(qms_inspections).values(data).returning();
    for (const res of results) {
      await db.insert(qms_inspection_results).values({ ...res, inspectionId: inspection.id });
    }
    return inspection;
  }

  async getInspections(tenantId: string, referenceType?: string, referenceId?: string) {
    const conditions = [eq(qms_inspections.tenantId, tenantId)];
    if (referenceType) conditions.push(eq(qms_inspections.referenceType, referenceType));
    if (referenceId) conditions.push(eq(qms_inspections.referenceId, referenceId));
    const inspections = await db.select().from(qms_inspections).where(and(...conditions)).orderBy(sql`inspection_date DESC`);
    return inspections;
  }

  // Defect codes
  async createDefectCode(data: any) {
    const [code] = await db.insert(qms_defect_codes).values(data).returning();
    return code;
  }

  async getDefectCodes(tenantId: string) {
    const codes = await db.select().from(qms_defect_codes).where(eq(qms_defect_codes.tenantId, tenantId));
    return codes;
  }

  // Quality report
  async getQualityReport(tenantId: string, startDate: Date, endDate: Date) {
    const report = await db.execute(sql`
      SELECT
        COUNT(*) as total_inspections,
        SUM(CASE WHEN verdict = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN verdict = 'fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN verdict = 'conditional' THEN 1 ELSE 0 END) as conditional
      FROM qms_inspections
      WHERE tenant_id = ${tenantId}
        AND inspection_date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    `);
    const rows = report.rows[0] as any;
    return {
      totalInspections: Number(rows.total_inspections),
      passed: Number(rows.passed),
      failed: Number(rows.failed),
      conditional: Number(rows.conditional),
      passRate: rows.total_inspections > 0 ? (rows.passed / rows.total_inspections) * 100 : 0,
    };
  }
}
