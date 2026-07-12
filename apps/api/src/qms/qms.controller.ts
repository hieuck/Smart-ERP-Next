import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards, Request, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QmsService } from './qms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateInspectionPlanDto, CreateNCRDto, CreateCAPADto, GetQualityReportQueryDto } from './dto';

@ApiTags('QMS')
@Controller('qms')
@UseGuards(JwtAuthGuard)
export class QmsController {
  constructor(private readonly qmsService: QmsService) {}

  // ── Inspection Plans ──
  @ApiOperation({ summary: 'Create inspection plan' })
  @Post('plans')
  async createPlan(@Request() req: any, @Body() body: CreateInspectionPlanDto) {
    return this.qmsService.createPlan(req.user.tenantId, body);
  }

  @ApiOperation({ summary: 'Get inspection plans' })
  @Get('plans')
  async getPlans(@Request() req: any, @Query('productId') productId?: string) {
    return this.qmsService.getPlans(req.user.tenantId, productId);
  }

  // ── Inspections ──
  @ApiOperation({ summary: 'Record inspection result' })
  @Post('inspections')
  async recordInspection(@Request() req: any, @Body() body: any) {
    const { results, ...data } = body;
    return this.qmsService.recordInspection(req.user.tenantId, req.user.sub, { ...data, results });
  }

  @ApiOperation({ summary: 'Get inspections' })
  @Get('inspections')
  async getInspections(@Request() req: any, @Query('referenceType') referenceType?: string, @Query('referenceId') referenceId?: string) {
    return this.qmsService.getInspections(req.user.tenantId, referenceType, referenceId);
  }

  // ── NCR (Non-Conformance Reports) ──
  @ApiOperation({ summary: 'Create Non-Conformance Report' })
  @Post('ncrs')
  async createNCR(@Request() req: any, @Body() body: CreateNCRDto) {
    return this.qmsService.createNCR(req.user.tenantId, req.user.sub, body);
  }

  @ApiOperation({ summary: 'Get NCRs' })
  @Get('ncrs')
  async getNCRs(@Request() req: any, @Query('status') status?: string) {
    return this.qmsService.getNCRs(req.user.tenantId, status);
  }

  // ── CAPA (Corrective/Preventive Actions) ──
  @ApiOperation({ summary: 'Create CAPA' })
  @Post('capas')
  async createCAPA(@Request() req: any, @Body() body: CreateCAPADto) {
    return this.qmsService.createCAPA(req.user.tenantId, req.user.sub, body);
  }

  @ApiOperation({ summary: 'Get CAPAs' })
  @Get('capas')
  async getCAPAs(@Request() req: any, @Query('ncrId') ncrId?: string) {
    return this.qmsService.getCAPAs(req.user.tenantId, ncrId);
  }

  @ApiOperation({ summary: 'Complete CAPA' })
  @Patch('capas/:id/complete')
  async completeCAPA(@Request() req: any, @Param('id') id: string) {
    return this.qmsService.completeCAPA(req.user.tenantId, id, req.user.sub);
  }

  // ── Defect Codes ──
  @ApiOperation({ summary: 'Create defect code' })
  @Post('defect-codes')
  async createDefectCode(@Request() req: any, @Body() body: any) {
    return this.qmsService.createDefectCode(req.user.tenantId, body);
  }

  @ApiOperation({ summary: 'Get defect codes' })
  @Get('defect-codes')
  async getDefectCodes(@Request() req: any) {
    return this.qmsService.getDefectCodes(req.user.tenantId);
  }

  // ── Quality Report ──
  @ApiOperation({ summary: 'Get quality report' })
  @Get('report')
  async getQualityReport(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true })) query: GetQualityReportQueryDto,
  ) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
    return this.qmsService.getQualityReport(req.user.tenantId, startDate, endDate);
  }

  // ── Supplier Quality ──
  @ApiOperation({ summary: 'Get supplier quality score' })
  @Get('suppliers/:supplierId/score')
  async getSupplierScore(@Request() req: any, @Param('supplierId') supplierId: string) {
    return this.qmsService.getSupplierQualityScore(req.user.tenantId, supplierId);
  }

  @ApiOperation({ summary: 'Get supplier quality report' })
  @Get('suppliers/quality-report')
  async getSupplierReport(@Request() req: any) {
    return this.qmsService.getSupplierQualityReport(req.user.tenantId);
  }
}