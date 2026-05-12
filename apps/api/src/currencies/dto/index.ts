import { IsString, IsNumber, IsOptional, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExchangeRateDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  fromCurrency: string;

  @ApiProperty({ example: 'VND' })
  @IsString()
  toCurrency: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @IsPositive()
  rate: number;

  @ApiProperty({ example: '2026-05-13T00:00:00Z' })
  @IsOptional()
  effectiveFrom?: string;

  @ApiProperty({ example: '2026-05-20T00:00:00Z' })
  @IsOptional()
  effectiveTo?: string;
}

export class UpdateExchangeRateDto {
  @ApiProperty({ example: 25200 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  rate?: number;

  @ApiProperty({ example: '2026-05-13T00:00:00Z' })
  @IsOptional()
  effectiveFrom?: string;

  @ApiProperty({ example: '2026-05-20T00:00:00Z' })
  @IsOptional()
  effectiveTo?: string;
}