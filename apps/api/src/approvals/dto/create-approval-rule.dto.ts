import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApprovalRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['purchase_order', 'sales_order', 'invoice', 'payment'] })
  @IsString()
  documentType: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number;

  @ApiProperty({ default: 1, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  priority?: number;
}
