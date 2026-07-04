import { Injectable, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { products } from '@smart-erp/database/schema';
import * as XLSX from '@stackline/xlsx';
import { randomUUID } from 'crypto';

export interface ImportRow {
  rowNumber: number;
  errors: string[];
  data: Record<string, any>;
}

export interface ImportPreview {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  columns: string[];
  rows: ImportRow[];
  createdAt: string;
}

@Injectable()
export class ImportService {
  private batches = new Map<string, ImportPreview>();

  constructor(private readonly drizzle: DrizzleService) {}

  async previewProducts(tenantId: string, buffer: Buffer, filename: string): Promise<ImportPreview> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file has no sheets');

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

    if (jsonData.length === 0) throw new BadRequestException('No data found in file');

    const rows: ImportRow[] = jsonData.map((row: any, index: number) => {
      const errors: string[] = [];
      const data: Record<string, any> = {
        name: row.name || row.Name || row.Ten || row['Tên sản phẩm'] || row['Tên'] || '',
        sku: row.sku || row.SKU || row.Ma || row['Mã'] || '',
        price: parseFloat(row.price || row.Price || row.Gia || row['Giá'] || '0') || 0,
        cost: parseFloat(row.cost || row.Cost || row.GiaVon || row['Giá vốn'] || '0') || 0,
        stock: parseInt(row.stock || row.Stock || row.Ton || row['Tồn kho'] || '0', 10) || 0,
        unit: row.unit || row.Unit || row.DonVi || row['Đơn vị'] || 'piece',
        category: row.category || row.Category || row.DanhMuc || row['Danh mục'] || '',
        description: row.description || row.Description || row.MoTa || row['Mô tả'] || '',
        minStock: parseInt(row.minStock || row.MinStock || row.TonToiThieu || row['Tồn tối thiểu'] || '0', 10) || 0,
        barcode: row.barcode || row.Barcode || row.MaVach || row['Mã vạch'] || '',
      };

      if (!data.name) errors.push('Missing product name');
      if (!data.sku) errors.push('Missing SKU');
      if (data.price <= 0) errors.push('Price must be > 0');

      return { rowNumber: index + 2, errors, data };
    });

    const validRows = rows.filter(r => r.errors.length === 0);
    const errorRows = rows.filter(r => r.errors.length > 0);

    const preview: ImportPreview = {
      batchId: randomUUID(),
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: errorRows.length,
      columns: Object.keys(jsonData[0] || {}),
      rows,
      createdAt: new Date().toISOString(),
    };

    this.batches.set(preview.batchId, preview);
    return preview;
  }

  async confirmImport(tenantId: string, batchId: string): Promise<{ imported: number; errors: number }> {
    const preview = this.batches.get(batchId);
    if (!preview) throw new BadRequestException('Batch not found or expired');

    const validRows = preview.rows.filter(r => r.errors.length === 0);
    let imported = 0;

    for (const row of validRows) {
      await this.drizzle.db.insert(products).values({
        tenantId,
        name: row.data.name,
        sku: row.data.sku,
        price: row.data.price.toString(),
        cost: row.data.cost?.toString() || '0',
        stock: row.data.stock,
        unit: row.data.unit,
        category: row.data.category || null,
        description: row.data.description || null,
        minStock: row.data.minStock,
        isActive: true,
      });
      imported++;
    }

    this.batches.delete(batchId);
    return { imported, errors: preview.errorRows };
  }

  getPreview(batchId: string): ImportPreview | undefined {
    return this.batches.get(batchId);
  }
}
