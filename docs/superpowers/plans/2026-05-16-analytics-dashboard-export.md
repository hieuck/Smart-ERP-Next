# Analytics Dashboard Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel and PDF export functionality to the analytics dashboard reports, allowing users to export KPIs, charts, and data tables.

**Architecture:** Extend existing analytics dashboard API endpoints to support export formats, reuse the existing export service infrastructure, and add export buttons to the frontend analytics dashboard page.

**Tech Stack:** NestJS (API), Drizzle ORM, Next.js (frontend), ExcelJS (for Excel export), PDFKit (for PDF export), react-i18next (i18n)

---

### Task 1: Add Excel and PDF export endpoints to Analytics Dashboard Controller

**Files:**
- Modify: `apps/api/src/analytics-dashboard/analytics-dashboard.controller.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsDashboardController } from './analytics-dashboard.controller';
import { AnalyticsDashboardService } from './analytics-dashboard.service';

describe('AnalyticsDashboardController', () => {
  let controller: AnalyticsDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsDashboardController],
      providers: [
        {
          provide: AnalyticsDashboardService,
          useValue: {
            exportKPIs: jest.fn(),
            exportRevenueChart: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsDashboardController>(AnalyticsDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should export KPI data in Excel format', async () => {
    // Arrange
    const mockResult = { buffer: Buffer.from('test'), filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    (controller['service'].exportKPIs as jest.Mock).mockResolvedValue(mockResult);
    
    // Act
    const result = await controller.exportKPIs({ user: { tenantId: 'test' } }, { format: 'excel', period: 'month' }, { setHeader: jest.fn(), send: jest.fn() } as any);
    
    // Assert
    expect(controller['service'].exportKPIs).toHaveBeenCalledWith('test', 'excel', 'month');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.controller.spec.ts`
Expected: FAIL with "exportKPIs method not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Controller, Get, Query, UseGuards, Request, Post, Body, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Response } from 'express';
import { ExportFormat } from '../exports/export.enums';

@ApiTags('Analytics Dashboard')
@Controller('analytics-dashboard')
@UseGuards(JwtAuthGuard)
export class AnalyticsDashboardController {
  constructor(private readonly service: AnalyticsDashboardService) {}

  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'quarter'] })
  @Get('kpis')
  async getKPIs(@Request() req: any, @Query('period') period?: string) {
    return this.service.getKPIs(req.user.tenantId, period as any || 'month');
  }

  @ApiOperation({ summary: 'Get revenue chart data' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @Get('revenue-chart')
  async getRevenueChart(@Request() req: any, @Query('days') days?: number) {
    return this.service.getRevenueChart(req.user.tenantId, days || 30);
  }

  @ApiOperation({ summary: 'Get top products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('top-products')
  async getTopProducts(@Request() req: any, @Query('limit') limit?: number) {
    return this.service.getTopProducts(req.user.tenantId, limit || 10);
  }

  @ApiOperation({ summary: 'Get AI-powered insights and anomaly detection' })
  @Get('ai-insights')
  async getAIInsights(@Request() req: any) {
    return this.service.getAIInsights(req.user.tenantId);
  }

  // NEW EXPORT ENDPOINTS
  @ApiOperation({ summary: 'Export KPIs data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['excel', 'pdf'] },
        period: { type: 'string', enum: ['today', 'week', 'month', 'quarter'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns the exported file' })
  @Post('export/kpis')
  async exportKPIs(
    @Request() req: any,
    @Body() body: { format: ExportFormat; period?: string },
    @Res() res: Response
  ) {
    const { buffer, filename, contentType } = await this.service.exportKPIs(
      req.user.tenantId,
      body.format,
      body.period || 'month'
    );
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @ApiOperation({ summary: 'Export revenue chart data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['excel', 'pdf'] },
        days: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns the exported file' })
  @Post('export/revenue-chart')
  async exportRevenueChart(
    @Request() req: any,
    @Body() body: { format: ExportFormat; days?: number },
    @Res() res: Response
  ) {
    const { buffer, filename, contentType } = await this.service.exportRevenueChart(
      req.user.tenantId,
      body.format,
      body.days || 30
    );
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/analytics-dashboard/analytics-dashboard.controller.ts
git commit -m "feat(analytics-dashboard): add export endpoints for KPIs and revenue chart"
```

### Task 2: Implement export service methods in Analytics Dashboard Service

**Files:**
- Modify: `apps/api/src/analytics-dashboard/analytics-dashboard.service.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { DrizzleService } from '../drizzle/drizzle.service';

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;
  let drizzleService: DrizzleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        {
          provide: DrizzleService,
          useValue: {
            db: {
              execute: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
    drizzleService = module.get<DrizzleService>(DrizzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should export KPIs to Excel format', async () => {
    // Arrange
    const mockKPIs = {
      totalRevenue: 1000000,
      totalOrders: 50,
      avgOrderValue: 20000,
      totalCustomers: 100,
      lowStockCount: 5,
      productionInProgress: 10,
      qualityPassRate: 95,
      periodComparison: {
        revenueChange: 10,
        ordersChange: 5,
        customersChange: 2,
      },
    };
    
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ revenue: 1000000, orders: 50 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ revenue: 900000, orders: 45 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 100 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 5 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 10 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 20, passed: 19 }]);
    
    // Act
    const result = await service.exportKPIs('test-tenant', 'excel', 'month');
    
    // Assert
    expect(result).toHaveProperty('buffer');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('contentType');
    expect(result.filename).toContain('kpis');
    expect(result.filename).toEndWith('.xlsx');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.service.spec.ts`
Expected: FAIL with "exportKPIs method not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

@Injectable()
export class AnalyticsDashboardService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getKPIs(tenantId: string, period: 'today' | 'week' | 'month' | 'quarter' = 'month'): Promise<any> {
    // existing implementation...
  }

  async getRevenueChart(tenantId: string, days: number = 30) {
    // existing implementation...
  }

  async getTopProducts(tenantId: string, limit: number = 10) {
    // existing implementation...
  }

  private getPeriodDates(period: string) {
    // existing implementation...
  }

  // NEW EXPORT METHODS
  async exportKPIs(tenantId: string, format: 'excel' | 'pdf', period: 'today' | 'week' | 'month' | 'quarter' = 'month') {
    const kpis = await this.getKPIs(tenantId, period);
    
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('KPIs');
      
      // Add headers
      worksheet.addRow(['Metric', 'Value']);
      
      // Add KPI data
      worksheet.addRow(['Total Revenue', kpis.totalRevenue]);
      worksheet.addRow(['Total Orders', kpis.totalOrders]);
      worksheet.addRow(['Average Order Value', kpis.avgOrderValue]);
      worksheet.addRow(['Total Customers', kpis.totalCustomers]);
      worksheet.addRow(['Low Stock Count', kpis.lowStockCount]);
      worksheet.addRow(['Production In Progress', kpis.productionInProgress]);
      worksheet.addRow(['Quality Pass Rate (%)', kpis.qualityPassRate]);
      worksheet.addRow(['Revenue Change (%)', kpis.periodComparison.revenueChange]);
      worksheet.addRow(['Orders Change (%)', kpis.periodComparison.ordersChange]);
      worksheet.addRow(['Customers Change (%)', kpis.periodComparison.customersChange]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `kpis-${period}-${new Date().toISOString().slice(0,10)}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } else if (format === 'pdf') {
      const buffer = await this.createPDFKPIs(kpis, period);
      return {
        buffer,
        filename: `kpis-${period}-${new Date().toISOString().slice(0,10)}.pdf`,
        contentType: 'application/pdf'
      };
    }
  }

  async exportRevenueChart(tenantId: string, format: 'excel' | 'pdf', days: number = 30) {
    const chartData = await this.getRevenueChart(tenantId, days);
    
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Revenue Chart');
      
      // Add headers
      worksheet.addRow(['Date', 'Revenue', 'Orders']);
      
      // Add chart data
      for (const row of chartData as any[]) {
        worksheet.addRow([row.date, row.revenue, row.orders]);
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `revenue-chart-${days}days-${new Date().toISOString().slice(0,10)}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } else if (format === 'pdf') {
      const buffer = await this.createPDFRevenueChart(chartData as any[], days);
      return {
        buffer,
        filename: `revenue-chart-${days}days-${new Date().toISOString().slice(0,10)}.pdf`,
        contentType: 'application/pdf'
      };
    }
  }

  private async createPDFKPIs(kpis: any, period: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      
      doc.fontSize(20).text('KPIs Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Period: ${period}`, { align: 'center' });
      doc.moveDown();
      
      const kpiData = [
        ['Total Revenue', kpis.totalRevenue.toLocaleString()],
        ['Total Orders', kpis.totalOrders.toLocaleString()],
        ['Average Order Value', kpis.avgOrderValue.toLocaleString()],
        ['Total Customers', kpis.totalCustomers.toLocaleString()],
        ['Low Stock Count', kpis.lowStockCount.toLocaleString()],
        ['Production In Progress', kpis.productionInProgress.toLocaleString()],
        ['Quality Pass Rate (%)', kpis.qualityPassRate.toFixed(2)],
        ['Revenue Change (%)', kpis.periodComparison.revenueChange.toFixed(2)],
        ['Orders Change (%)', kpis.periodComparison.ordersChange.toFixed(2)],
        ['Customers Change (%)', kpis.periodComparison.customersChange.toFixed(2)],
      ];
      
      kpiData.forEach(([label, value]) => {
        doc.fontSize(12).text(`${label}: ${value}`);
        doc.moveDown(0.5);
      });
      
      doc.end();
    });
  }

  private async createPDFRevenueChart(data: any[], days: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      
      doc.fontSize(20).text('Revenue Chart Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Last ${days} days`, { align: 'center' });
      doc.moveDown();
      
      // Table header
      doc.fontSize(12).text('Date', 50, doc.y);
      doc.text('Revenue', 200, doc.y);
      doc.text('Orders', 350, doc.y);
      doc.moveDown();
      
      // Table rows
      for (const row of data) {
        doc.fontSize(10).text(row.date.toString(), 50, doc.y);
        doc.text(row.revenue.toLocaleString(), 200, doc.y);
        doc.text(row.orders.toLocaleString(), 350, doc.y);
        doc.moveDown();
      }
      
      doc.end();
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/analytics-dashboard/analytics-dashboard.service.ts
git commit -m "feat(analytics-dashboard): implement export service methods for KPIs and revenue chart"
```

### Task 2: Implement export service methods in Analytics Dashboard Service

**Files:**
- Modify: `apps/api/src/analytics-dashboard/analytics-dashboard.service.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { DrizzleService } from '../drizzle/drizzle.service';

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;
  let drizzleService: DrizzleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        {
          provide: DrizzleService,
          useValue: {
            db: {
              execute: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
    drizzleService = module.get<DrizzleService>(DrizzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should export KPIs to Excel format', async () => {
    // Arrange
    const mockKPIs = {
      totalRevenue: 1000000,
      totalOrders: 50,
      avgOrderValue: 20000,
      totalCustomers: 100,
      lowStockCount: 5,
      productionInProgress: 10,
      qualityPassRate: 95,
      periodComparison: {
        revenueChange: 10,
        ordersChange: 5,
        customersChange: 2,
      },
    };
    
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ revenue: 1000000, orders: 50 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ revenue: 900000, orders: 45 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 100 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 5 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 10 }]);
    (drizzleService.db.execute as jest.Mock).mockResolvedValueOnce([{ total: 20, passed: 19 }]);
    
    // Act
    const result = await service.exportKPIs('test-tenant', 'excel', 'month');
    
    // Assert
    expect(result).toHaveProperty('buffer');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('contentType');
    expect(result.filename).toContain('kpis');
    expect(result.filename).toEndWith('.xlsx');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.service.spec.ts`
Expected: FAIL with "exportKPIs method not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

@Injectable()
export class AnalyticsDashboardService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getKPIs(tenantId: string, period: 'today' | 'week' | 'month' | 'quarter' = 'month'): Promise<any> {
    // existing implementation...
  }

  async getRevenueChart(tenantId: string, days: number = 30) {
    // existing implementation...
  }

  async getTopProducts(tenantId: string, limit: number = 10) {
    // existing implementation...
  }

  private getPeriodDates(period: string) {
    // existing implementation...
  }

  // NEW EXPORT METHODS
  async exportKPIs(tenantId: string, format: 'excel' | 'pdf', period: 'today' | 'week' | 'month' | 'quarter' = 'month') {
    const kpis = await this.getKPIs(tenantId, period);
    
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('KPIs');
      
      // Add headers
      worksheet.addRow(['Metric', 'Value']);
      
      // Add KPI data
      worksheet.addRow(['Total Revenue', kpis.totalRevenue]);
      worksheet.addRow(['Total Orders', kpis.totalOrders]);
      worksheet.addRow(['Average Order Value', kpis.avgOrderValue]);
      worksheet.addRow(['Total Customers', kpis.totalCustomers]);
      worksheet.addRow(['Low Stock Count', kpis.lowStockCount]);
      worksheet.addRow(['Production In Progress', kpis.productionInProgress]);
      worksheet.addRow(['Quality Pass Rate (%)', kpis.qualityPassRate]);
      worksheet.addRow(['Revenue Change (%)', kpis.periodComparison.revenueChange]);
      worksheet.addRow(['Orders Change (%)', kpis.periodComparison.ordersChange]);
      worksheet.addRow(['Customers Change (%)', kpis.periodComparison.customersChange]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `kpis-${period}-${new Date().toISOString().slice(0,10)}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } else if (format === 'pdf') {
      const buffer = await this.createPDFKPIs(kpis, period);
      return {
        buffer,
        filename: `kpis-${period}-${new Date().toISOString().slice(0,10)}.pdf`,
        contentType: 'application/pdf'
      };
    }
  }

  async exportRevenueChart(tenantId: string, format: 'excel' | 'pdf', days: number = 30) {
    const chartData = await this.getRevenueChart(tenantId, days);
    
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Revenue Chart');
      
      // Add headers
      worksheet.addRow(['Date', 'Revenue', 'Orders']);
      
      // Add chart data
      for (const row of chartData as any[]) {
        worksheet.addRow([row.date, row.revenue, row.orders]);
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `revenue-chart-${days}days-${new Date().toISOString().slice(0,10)}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } else if (format === 'pdf') {
      const buffer = await this.createPDFRevenueChart(chartData as any[], days);
      return {
        buffer,
        filename: `revenue-chart-${days}days-${new Date().toISOString().slice(0,10)}.pdf`,
        contentType: 'application/pdf'
      };
    }
  }

  private async createPDFKPIs(kpis: any, period: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      
      doc.fontSize(20).text('KPIs Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Period: ${period}`, { align: 'center' });
      doc.moveDown();
      
      const kpiData = [
        ['Total Revenue', kpis.totalRevenue.toLocaleString()],
        ['Total Orders', kpis.totalOrders.toLocaleString()],
        ['Average Order Value', kpis.avgOrderValue.toLocaleString()],
        ['Total Customers', kpis.totalCustomers.toLocaleString()],
        ['Low Stock Count', kpis.lowStockCount.toLocaleString()],
        ['Production In Progress', kpis.productionInProgress.toLocaleString()],
        ['Quality Pass Rate (%)', kpis.qualityPassRate.toFixed(2)],
        ['Revenue Change (%)', kpis.periodComparison.revenueChange.toFixed(2)],
        ['Orders Change (%)', kpis.periodComparison.ordersChange.toFixed(2)],
        ['Customers Change (%)', kpis.periodComparison.customersChange.toFixed(2)],
      ];
      
      kpiData.forEach(([label, value]) => {
        doc.fontSize(12).text(`${label}: ${value}`);
        doc.moveDown(0.5);
      });
      
      doc.end();
    });
  }

  private async createPDFRevenueChart(data: any[], days: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      
      doc.fontSize(20).text('Revenue Chart Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Last ${days} days`, { align: 'center' });
      doc.moveDown();
      
      // Table header
      doc.fontSize(12).text('Date', 50, doc.y);
      doc.text('Revenue', 200, doc.y);
      doc.text('Orders', 350, doc.y);
      doc.moveDown();
      
      // Table rows
      for (const row of data) {
        doc.fontSize(10).text(row.date.toString(), 50, doc.y);
        doc.text(row.revenue.toLocaleString(), 200, doc.y);
        doc.text(row.orders.toLocaleString(), 350, doc.y);
        doc.moveDown();
      }
      
      doc.end();
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/analytics-dashboard/analytics-dashboard.service.ts
git commit -m "feat(analytics-dashboard): implement export service methods for KPIs and revenue chart"
```

### Task 1: Add Excel and PDF export endpoints to Analytics Dashboard Controller

**Files:**
- Modify: `apps/api/src/analytics-dashboard/analytics-dashboard.controller.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsDashboardController } from './analytics-dashboard.controller';
import { AnalyticsDashboardService } from './analytics-dashboard.service';

describe('AnalyticsDashboardController', () => {
  let controller: AnalyticsDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsDashboardController],
      providers: [
        {
          provide: AnalyticsDashboardService,
          useValue: {
            exportData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsDashboardController>(AnalyticsDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should export KPI data in Excel format', async () => {
    // Arrange
    const mockResult = { buffer: Buffer.from('test'), filename: 'test.xlsx' };
    (controller['service'].exportData as jest.Mock).mockResolvedValue(mockResult);
    
    // Act
    const result = await controller.exportKPIs({ user: { tenantId: 'test' } }, 'excel');
    
    // Assert
    expect(result).toEqual(mockResult);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.controller.spec.ts`
Expected: FAIL with "exportKPIs method not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Controller, Get, Query, UseGuards, Request, Post, Body, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Response } from 'express';
import { ExportFormat } from '../exports/export.enums';

@ApiTags('Analytics Dashboard')
@Controller('analytics-dashboard')
@UseGuards(JwtAuthGuard)
export class AnalyticsDashboardController {
  constructor(private readonly service: AnalyticsDashboardService) {}

  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'quarter'] })
  @Get('kpis')
  async getKPIs(@Request() req: any, @Query('period') period?: string) {
    return this.service.getKPIs(req.user.tenantId, period as any || 'month');
  }

  @ApiOperation({ summary: 'Get revenue chart data' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @Get('revenue-chart')
  async getRevenueChart(@Request() req: any, @Query('days') days?: number) {
    return this.service.getRevenueChart(req.user.tenantId, days || 30);
  }

  @ApiOperation({ summary: 'Get top products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('top-products')
  async getTopProducts(@Request() req: any, @Query('limit') limit?: number) {
    return this.service.getTopProducts(req.user.tenantId, limit || 10);
  }

  @ApiOperation({ summary: 'Get AI-powered insights and anomaly detection' })
  @Get('ai-insights')
  async getAIInsights(@Request() req: any) {
    return this.service.getAIInsights(req.user.tenantId);
  }

  // NEW EXPORT ENDPOINTS
  @ApiOperation({ summary: 'Export KPIs data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['excel', 'pdf'] },
        period: { type: 'string', enum: ['today', 'week', 'month', 'quarter'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns the exported file' })
  @Post('export/kpis')
  async exportKPIs(
    @Request() req: any,
    @Body() body: { format: ExportFormat; period?: string },
    @Res() res: Response
  ) {
    const { buffer, filename, contentType } = await this.service.exportKPIs(
      req.user.tenantId,
      body.format,
      body.period || 'month'
    );
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @ApiOperation({ summary: 'Export revenue chart data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['excel', 'pdf'] },
        days: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns the exported file' })
  @Post('export/revenue-chart')
  async exportRevenueChart(
    @Request() req: any,
    @Body() body: { format: ExportFormat; days?: number },
    @Res() res: Response
  ) {
    const { buffer, filename, contentType } = await this.service.exportRevenueChart(
      req.user.tenantId,
      body.format,
      body.days || 30
    );
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- apps/api/src/analytics-dashboard/analytics-dashboard.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/analytics-dashboard/analytics-dashboard.controller.ts
git commit -m "feat(analytics-dashboard): add export endpoints for KPIs and revenue chart"
```