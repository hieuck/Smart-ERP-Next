import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

export interface FieldMapping {
  sourceColumn: string;
  targetField: string;
  required?: boolean;
  transform?: 'string' | 'number' | 'date' | 'boolean';
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /** Import customers from CSV/Excel data */
  async importCustomers(tenantId: string, userId: string, rows: Record<string, string>[], mapping: FieldMapping[]): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        // Map fields
        const data: Record<string, any> = {};
        for (const field of mapping) {
          const value = row[field.sourceColumn];
          if (field.required && !value) {
            result.errors.push({ row: rowNum, field: field.targetField, message: 'Required field is empty' });
            continue;
          }
          data[field.targetField] = this.transformValue(value, field.transform);
        }

        if (result.errors.some((e) => e.row === rowNum)) {
          result.skipped++;
          continue;
        }

        // Check if customer exists by code
        const existing = await this.drizzle.db.execute(
          sql`SELECT id FROM customers WHERE tenant_id = ${tenantId} AND code = ${data.code} LIMIT 1`
        );

        if ((existing as any[])?.length) {
          // Update existing
          await this.drizzle.db.execute(
            sql`UPDATE customers SET name = ${data.name}, phone = ${data.phone}, email = ${data.email}, address = ${data.address}, updated_at = NOW() WHERE id = ${(existing as any[])[0].id}`
          );
          result.updated++;
        } else {
          // Create new
          await this.drizzle.db.execute(
            sql`INSERT INTO customers (id, tenant_id, code, name, phone, email, address, created_by, created_at, updated_at) VALUES (gen_random_uuid(), ${tenantId}, ${data.code}, ${data.name}, ${data.phone}, ${data.email}, ${data.address}, ${userId}, NOW(), NOW())`
          );
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({ row: rowNum, field: 'general', message: error.message });
        result.skipped++;
      }
    }

    return result;
  }

  /** Import products from CSV/Excel data */
  async importProducts(tenantId: string, userId: string, rows: Record<string, string>[], mapping: FieldMapping[]): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const data: Record<string, any> = {};
        for (const field of mapping) {
          const value = row[field.sourceColumn];
          if (field.required && !value) {
            result.errors.push({ row: rowNum, field: field.targetField, message: 'Required field is empty' });
            continue;
          }
          data[field.targetField] = this.transformValue(value, field.transform);
        }

        if (result.errors.some((e) => e.row === rowNum)) {
          result.skipped++;
          continue;
        }

        const existing = await this.drizzle.db.execute(
          sql`SELECT id FROM products WHERE tenant_id = ${tenantId} AND sku = ${data.sku} LIMIT 1`
        );

        if ((existing as any[])?.length) {
          await this.drizzle.db.execute(
            sql`UPDATE products SET name = ${data.name}, price = ${data.price}, cost = ${data.cost}, stock = ${data.stock}, updated_at = NOW() WHERE id = ${(existing as any[])[0].id}`
          );
          result.updated++;
        } else {
          await this.drizzle.db.execute(
            sql`INSERT INTO products (id, tenant_id, name, sku, barcode, price, cost, stock, created_by, created_at, updated_at) VALUES (gen_random_uuid(), ${tenantId}, ${data.name}, ${data.sku}, ${data.barcode}, ${data.price}, ${data.cost}, ${data.stock}, ${userId}, NOW(), NOW())`
          );
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push({ row: rowNum, field: 'general', message: error.message });
        result.skipped++;
      }
    }

    return result;
  }

  /** Get import template (column definitions) for an entity */
  getImportTemplate(entity: 'customers' | 'products' | 'orders'): FieldMapping[] {
    const templates: Record<string, FieldMapping[]> = {
      customers: [
        { sourceColumn: 'code', targetField: 'code', required: true },
        { sourceColumn: 'name', targetField: 'name', required: true },
        { sourceColumn: 'phone', targetField: 'phone' },
        { sourceColumn: 'email', targetField: 'email' },
        { sourceColumn: 'address', targetField: 'address' },
        { sourceColumn: 'taxCode', targetField: 'taxCode' },
        { sourceColumn: 'customerGroup', targetField: 'customerGroup' },
      ],
      products: [
        { sourceColumn: 'name', targetField: 'name', required: true },
        { sourceColumn: 'sku', targetField: 'sku', required: true },
        { sourceColumn: 'barcode', targetField: 'barcode' },
        { sourceColumn: 'price', targetField: 'price', required: true, transform: 'number' },
        { sourceColumn: 'cost', targetField: 'cost', transform: 'number' },
        { sourceColumn: 'stock', targetField: 'stock', transform: 'number' },
        { sourceColumn: 'category', targetField: 'category' },
        { sourceColumn: 'unit', targetField: 'unit' },
      ],
      orders: [
        { sourceColumn: 'customerCode', targetField: 'customerCode', required: true },
        { sourceColumn: 'productSku', targetField: 'productSku', required: true },
        { sourceColumn: 'quantity', targetField: 'quantity', required: true, transform: 'number' },
        { sourceColumn: 'unitPrice', targetField: 'unitPrice', required: true, transform: 'number' },
        { sourceColumn: 'orderDate', targetField: 'orderDate', transform: 'date' },
      ],
    };

    return templates[entity] || [];
  }

  /** Validate import data without saving */
  async validateImport(entity: 'customers' | 'products' | 'orders', rows: Record<string, string>[], mapping: FieldMapping[]): Promise<{ valid: boolean; errors: { row: number; field: string; message: string }[] }> {
    const errors: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      for (const field of mapping) {
        const value = row[field.sourceColumn];
        if (field.required && !value) {
          errors.push({ row: rowNum, field: field.targetField, message: 'Required field is empty' });
        }
        if (value && field.transform === 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({ row: rowNum, field: field.targetField, message: 'Invalid number format' });
          }
        }
        if (value && field.transform === 'date') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({ row: rowNum, field: field.targetField, message: 'Invalid date format' });
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private transformValue(value: string, transform?: string): any {
    if (!value) return null;
    switch (transform) {
      case 'number': return Number(value) || 0;
      case 'date': return new Date(value).toISOString();
      case 'boolean': return ['true', '1', 'yes'].includes(value.toLowerCase());
      default: return value;
    }
  }
}
