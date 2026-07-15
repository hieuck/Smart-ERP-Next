import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { DrizzleService } from '../drizzle/drizzle.service';
import { ExportFormat } from './export.enums';
import * as schema from '@smart-erp/database/schema';
import { and, eq, gte, lt } from '@smart-erp/database/drizzle';

export interface ExportJob {
  id: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  format: ExportFormat;
  entities: string[]; // e.g. ['customers', 'products', 'orders']
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class DataExportService {
  private readonly entityMapping: Record<string, any> = {
    products: schema.products,
    customers: schema.customers,
    orders: schema.orders,
    inventory: schema.inventoryTransactions,
    payments: schema.payments,
    accounting: schema.journalEntries,
    suppliers: schema.suppliers,
    crm: schema.crmLeads,
  };

  private readonly jobs = new Map<string, ExportJob>();
  private readonly buffers = new Map<string, Buffer>();

  constructor(private readonly drizzle: DrizzleService) {}

  /** Export data in the requested format */
  async exportData(
    tenantId: string,
    format: ExportFormat,
    entities: string[],
    filters?: { dateFrom?: string; dateTo?: string },
  ) {
    const collected: Record<string, any[]> = {};
    let totalCount = 0;

    for (const entity of entities) {
      const table = this.entityMapping[entity];
      if (!table) {
        throw new Error(`Unknown entity: ${entity}`);
      }
      const conditions = [eq(table.tenantId, tenantId)];
      if (filters?.dateFrom) {
        conditions.push(gte(table.createdAt, filters.dateFrom));
      }
      if (filters?.dateTo) {
        // Include the full calendar day by extending the upper bound to end-of-day.
        conditions.push(lt(table.createdAt, this.endOfDayIso(filters.dateTo)));
      }
      const data = await this.drizzle.db.select().from(table).where(and(...conditions));
      collected[entity] = data;
      totalCount += data.length;
    }

    if (format === ExportFormat.CSV) {
      let csv = '';
      for (const entity of entities) {
        const rows = collected[entity];
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          csv += headers.join(',') + '\n';
          for (const row of rows) {
            csv += headers.map((h) => this.escapeCsvField(row[h])).join(',') + '\n';
          }
        }
      }
      return {
        data: csv,
        format: 'csv',
        filename: `export-${Date.now()}.csv`,
        mimeType: 'text/csv',
        entityCount: totalCount,
      };
    }

    return {
      data: JSON.stringify(collected),
      format: 'json',
      filename: `export-${Date.now()}.json`,
      mimeType: 'application/json',
      entityCount: totalCount,
    };
  }

  private escapeCsvField(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /** Convert a date-only string (YYYY-MM-DD) into an end-of-day ISO timestamp. */
  private endOfDayIso(date: string): string {
    return new Date(`${date}T23:59:59.999Z`).toISOString();
  }

  /** Create a new export job */
  async createExportJob(
    tenantId: string,
    format: ExportFormat,
    entities: string[],
    filters?: { dateFrom?: string; dateTo?: string },
  ) {
    const job: ExportJob = {
      id: crypto.randomUUID(),
      tenantId,
      format,
      entities,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
    };

    this.jobs.set(job.id, job);
    return { ...job };
  }

  /** Get export status */
  async getExportStatus(tenantId: string, jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.tenantId !== tenantId) {
      throw new NotFoundException('Export job not found');
    }
    return { ...job };
  }

  /** Download export file */
  async getExportFile(tenantId: string, jobId: string): Promise<Buffer> {
    const job = this.jobs.get(jobId);
    if (!job || job.tenantId !== tenantId) {
      throw new NotFoundException('Export job not found');
    }

    if (job.status === 'completed') {
      const buffer = this.buffers.get(jobId);
      if (buffer) {
        return buffer;
      }
    }

    const payload = await this.exportData(job.tenantId, job.format, job.entities, {
      dateFrom: job.dateFrom,
      dateTo: job.dateTo,
    });

    const buffer = Buffer.from(payload.data);

    job.status = 'completed';
    job.fileSize = buffer.length;
    job.completedAt = new Date().toISOString();
    this.buffers.set(jobId, buffer);

    return buffer;
  }

  /** List available entities for export */
  getExportableEntities() {
    return [
      { key: 'customers', label: 'Customers' },
      { key: 'products', label: 'Products' },
      { key: 'orders', label: 'Orders' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'payments', label: 'Payments' },
      { key: 'accounting', label: 'Accounting' },
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'crm', label: 'CRM' },
    ];
  }
}