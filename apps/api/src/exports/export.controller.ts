import { Controller, Get, Post, Param, Body, Res, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { DataExportService } from './data-export.service';
import { ExportFormat } from './export.enums';
import { CreateExportDto } from './dto/create-export.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('exports')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly service: DataExportService) {}

  @Get('entities')
  getExportableEntities() {
    return this.service.getExportableEntities();
  }

  @Post()
  async createExport(@Request() req: any, @Body() body: CreateExportDto) {
    return this.service.createExportJob(req.user.tenantId, body.format, body.entities, {
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
    });
  }

  @Get(':id/status')
  getExportStatus(@Request() req: any, @Param('id') id: string) {
    return this.service.getExportStatus(req.user.tenantId, id);
  }

  @Get(':id/download')
  async downloadExport(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getExportFile(req.user.tenantId, id);
    const job = await this.service.getExportStatus(req.user.tenantId, id);
    const contentType = job.format === ExportFormat.CSV ? 'text/csv' : 'application/json';
    const ext = job.format === ExportFormat.CSV ? 'csv' : 'json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="export-${id}.${ext}"`);
    res.send(buffer);
  }
}