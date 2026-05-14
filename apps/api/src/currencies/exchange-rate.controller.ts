import { Controller, Get, Query, UseGuards, Request, Post, Body } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('currencies')
@UseGuards(JwtAuthGuard)
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get('rate')
  async getRate(@Request() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.service.fetchRate(from || 'VND', to || 'USD');
  }

  @Post('convert')
  async convert(@Request() req: any, @Body() body: {
    amount: number;
    from: string;
    to: string;
  }) {
    return this.service.convert(body.amount, body.from, body.to, req.user.tenantId);
  }

  @Get('supported')
  getSupported() {
    return this.service.getSupportedCurrencies();
  }
}