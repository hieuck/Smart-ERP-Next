import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.leadsService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      source,
      assignedToId,
    });
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.leadsService.getStats(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.remove(req.user.tenantId, id);
  }

  @Post(':id/convert')
  convertToCustomer(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: { customerData?: Partial<CreateLeadDto> },
  ) {
    return this.leadsService.convertToCustomer(
      req.user.tenantId,
      id,
      body?.customerData,
    );
  }
}