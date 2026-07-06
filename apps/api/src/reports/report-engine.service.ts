import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { reportTemplates, ReportTemplate } from '@smart-erp/database';
import { eq, and, sql } from 'drizzle-orm';

const FORBIDDEN_KEYWORDS = [
  'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate',
  'grant', 'revoke', 'execute', 'call', 'copy', 'merge', 'replace',
  'into', 'from information_schema', 'from pg_',
];

const FORBIDDEN_TABLES = [
  'users', 'api_keys', 'refresh_tokens', 'passwords', 'secrets',
  'tenants', 'approval_requests', 'approval_chain_items',
];

function validateReportSql(querySql: string): void {
  if (typeof querySql !== 'string' || !querySql.trim()) {
    throw new BadRequestException('querySql must be a non-empty string');
  }

  const normalized = querySql.replace(/\s+/g, ' ').trim().toLowerCase();

  // Only allow read-only SELECT statements
  if (!normalized.startsWith('select')) {
    throw new ForbiddenException('Report SQL must be a SELECT statement');
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (normalized.includes(keyword)) {
      throw new ForbiddenException(`Forbidden SQL keyword or pattern: ${keyword}`);
    }
  }

  for (const table of FORBIDDEN_TABLES) {
    const regex = new RegExp(`\\b${table}\\b`, 'i');
    if (regex.test(querySql)) {
      throw new ForbiddenException(`Access to table "${table}" is not allowed in report SQL`);
    }
  }
}

@Injectable()
export class ReportEngineService {
  constructor(private drizzle: DrizzleService) {}

  async createTemplate(tenantId: string, data: any): Promise<ReportTemplate> {
    validateReportSql(data.querySql);

    const [template] = await this.drizzle.db
      .insert(reportTemplates)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        querySql: data.querySql,
        parameters: data.parameters,
        outputSchema: data.outputSchema,
        isSystem: data.isSystem || false,
      })
      .returning();
    return template;
  }

  async getAllTemplates(tenantId: string): Promise<ReportTemplate[]> {
    return this.drizzle.db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.tenantId, tenantId));
  }

  async getTemplate(tenantId: string, id: string): Promise<ReportTemplate> {
    const [template] = await this.drizzle.db
      .select()
      .from(reportTemplates)
      .where(and(eq(reportTemplates.tenantId, tenantId), eq(reportTemplates.id, id)))
      .limit(1);
    if (!template) throw new BadRequestException('Template not found');
    return template;
  }

  async runTemplate(tenantId: string, templateId: string, parameters: Record<string, any>): Promise<any[]> {
    const template = await this.getTemplate(tenantId, templateId);
    validateReportSql(template.querySql);

    // Validate parameters — reject non-primitive values
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new BadRequestException(`Invalid parameter type for ${key}`);
      }
    }

    // Replace placeholders in SQL with parameterized values.
    // Parameters are validated primitives; tenantId is the authenticated tenant.
    let sqlQuery = template.querySql;
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = new RegExp(`:${key}\\b`, 'g');
      const escaped = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
      sqlQuery = sqlQuery.replace(placeholder, String(escaped));
    }
    sqlQuery = sqlQuery.replace(/:tenantId/g, `'${tenantId}'`);

    const result = await this.drizzle.db.execute(sql.raw(sqlQuery));
    return result.rows;
  }

  // Predefined revenue report example (SQL for PostgreSQL)
  static getRevenueReportSql(): string {
    return `
      SELECT
        date_trunc('month', o.created_at) as month,
        COUNT(o.id) as order_count,
        SUM(o.total) as total_revenue,
        SUM(o.tax_amount) as total_tax,
        AVG(o.total) as avg_order_value
      FROM orders o
      WHERE o.tenant_id = :tenantId
        AND o.status != 'cancelled'
        AND o.created_at BETWEEN :startDate AND :endDate
      GROUP BY month
      ORDER BY month ASC
    `;
  }
}
