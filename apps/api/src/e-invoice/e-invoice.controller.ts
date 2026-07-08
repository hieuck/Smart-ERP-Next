import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EInvoiceService, CreateEInvoiceDto } from './e-invoice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('E-Invoice')
@Controller('e-invoice')
@UseGuards(JwtAuthGuard)
export class EInvoiceController {
  constructor(private readonly service: EInvoiceService) {}

  @ApiOperation({ summary: 'Tao hoa don dien tu (draft)' })
  @Post()
  create(@Request() req: any, @Body() dto: CreateEInvoiceDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Phat hanh hoa don dien tu' })
  @Patch(':id/issue')
  issue(@Request() req: any, @Param('id') id: string) {
    return this.service.issue(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Huy hoa don dien tu' })
  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.cancel(req.user.tenantId, id, body.reason);
  }

  @ApiOperation({ summary: 'Thay the hoa don dien tu' })
  @Post(':id/replace')
  replace(@Request() req: any, @Param('id') id: string, @Body() dto: CreateEInvoiceDto) {
    return this.service.replace(req.user.tenantId, id, req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Danh sach hoa don dien tu' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @Get()
  list(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.service.list(req.user.tenantId, {
      status,
      page: page ? Number(page) : 1,
    });
  }

  @ApiOperation({ summary: 'Thong ke hoa don theo thang' })
  @Get('stats/monthly')
  getStats(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.service.getStats(
      req.user.tenantId,
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }

  @ApiOperation({ summary: 'Chi tiet hoa don' })
  @Get(':id')
  findById(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(req.user.tenantId, id);
  }
}
