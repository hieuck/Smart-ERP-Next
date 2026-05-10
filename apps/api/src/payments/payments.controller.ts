import {
  Controller, Get, Post, Body, Param,
  Query, UseGuards, Request, ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('method') method?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.paymentsService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type,
      method,
      from,
      to,
    });
  }

  @Get('summary')
  getSummary(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.paymentsService.getSummary(req.user.tenantId, from, to);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(req.user.tenantId, id);
  }
}
