import {
  Controller, Get, Post, Body, Param, Put, Delete,
  UseGuards, Request, ParseUUIDPipe, Query,
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { ExchangeRateDto, UpdateExchangeRateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('currencies')
@UseGuards(JwtAuthGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateCurrencyDto) {
    return this.currenciesService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.currenciesService.findAll(req.user.tenantId);
  }

  @Get('base')
  getBase(@Request() req: any) {
    return this.currenciesService.getBaseCurrency(req.user.tenantId);
  }

  @Get('convert')
  convert(
    @Request() req: any,
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
    @Query('amount') amount: number,
    @Query('atDate') atDate?: string,
  ) {
    return this.currenciesService.convertAmount(
      req.user.tenantId,
      parseFloat(amount.toString()) || 0,
      fromCurrency,
      toCurrency,
      atDate
    );
  }

  @Get('rates')
  getExchangeRates(@Request() req: any, @Query('base') base?: string) {
    return this.currenciesService.getExchangeRates(req.user.tenantId, base);
  }

  @Get('rates/:from/:to')
  getExchangeRate(
    @Request() req: any,
    @Param('from') fromCurrency: string,
    @Param('to') toCurrency: string,
    @Query('atDate') atDate?: string
  ) {
    return this.currenciesService.getExchangeRate(
      req.user.tenantId,
      fromCurrency,
      toCurrency,
      atDate
    );
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.currenciesService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCurrencyDto>
  ) {
    return this.currenciesService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.currenciesService.remove(req.user.tenantId, id);
  }

  // Exchange Rate endpoints
  @Post('rates')
  createExchangeRate(@Request() req: any, @Body() dto: ExchangeRateDto) {
    return this.currenciesService.createExchangeRate(req.user.tenantId, dto);
  }

  @Put('rates/:id')
  updateExchangeRate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExchangeRateDto
  ) {
    return this.currenciesService.updateExchangeRate(req.user.tenantId, id, dto);
  }

  @Delete('rates/:id')
  removeExchangeRate(@Request() req: any, @Param('id') id: string) {
    return this.currenciesService.removeExchangeRate(req.user.tenantId, id);
  }
}
