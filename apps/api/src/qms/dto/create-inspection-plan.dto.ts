import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsEnum } from 'class-validator';

export class CreateInspectionPlanDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Plan name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Sampling rule: AQL level', default: 1.0 })
  @IsOptional()
  @IsString()
  samplingRule?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  isActive?: boolean;
}

export class CreateNCRDto {
  @ApiProperty({ description: 'Production order ID' })
  @IsString()
  @IsNotEmpty()
  productionOrderId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Defect code' })
  @IsString()
  @IsNotEmpty()
  defectCode: string;

  @ApiProperty({ description: 'Description of the non-conformance' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Severity: low, medium, high, critical' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class CreateCAPADto {
  @ApiProperty({ description: 'NCR ID this CAPA addresses' })
  @IsString()
  @IsNotEmpty()
  ncrId: string;

  @ApiProperty({ description: 'CAPA type: corrective or preventive' })
  @IsEnum(['corrective', 'preventive'])
  type: 'corrective' | 'preventive';

  @ApiProperty({ description: 'Action description' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @IsString()
  targetDate?: string;
}