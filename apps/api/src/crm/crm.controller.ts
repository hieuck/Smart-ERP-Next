import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateLeadDto, UpdateLeadStatusDto, CreateDealDto, UpdateDealStageDto } from './dto/crm.dto';

@ApiTags('CRM')
@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly service: CrmService) {}

  @ApiOperation({ summary: 'List all leads' })
  @Get('legacy-leads')
  getLeads(@Request() req: any) {
    return this.service.getLeads(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Create a new lead' })
  @Post('legacy-leads')
  createLead(@Request() req: any, @Body() body: CreateLeadDto) {
    return this.service.createLead(req.user.tenantId, body);
  }

  @ApiOperation({ summary: 'Update lead status in pipeline' })
  @Patch('legacy-leads/:id/status')
  updateLeadStatus(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLeadStatusDto,
  ) {
    return this.service.updateLeadStatus(req.user.tenantId, id, body.status);
  }

  @ApiOperation({ summary: 'List all sales pipelines and stages' })
  @Get('pipelines')
  getPipelines(@Request() req: any) {
    return this.service.getPipelines(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Create a new deal' })
  @Post('deals')
  createDeal(@Request() req: any, @Body() body: CreateDealDto) {
    return this.service.createDeal(req.user.tenantId, body);
  }

  @ApiOperation({ summary: 'Update deal stage (Drag & Drop)' })
  @Patch('deals/:id/stage')
  updateDealStage(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDealStageDto,
  ) {
    return this.service.updateDealStage(req.user.tenantId, id, body.stageId);
  }

  @ApiOperation({ summary: 'Close the loop: Convert Won Deal to Sales Order' })
  @Post('deals/:id/convert')
  convertToOrder(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.convertToOrder(req.user.tenantId, id);
  }
}
