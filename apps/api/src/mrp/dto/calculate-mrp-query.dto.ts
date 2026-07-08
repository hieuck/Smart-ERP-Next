import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateMRPQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to look ahead (1-365)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  daysAhead?: number;
}
