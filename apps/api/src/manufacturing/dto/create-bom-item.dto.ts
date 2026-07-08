import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBomItemDto {
  @ApiProperty({ description: 'Product ID containing this component' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Component product ID' })
  @IsString()
  @IsNotEmpty()
  componentProductId: string;

  @ApiProperty({ description: 'Quantity of component required' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit cost of the component' })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Wastage percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wastagePercent?: number;
}

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'Product ID to manufacture' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity to produce' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Planned start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Planned end date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class UpdateQCCheckpointDto {
  @ApiProperty({
    description: 'Status of the checkpoint',
    enum: ['pending', 'passed', 'failed'],
  })
  @IsString()
  status: 'pending' | 'passed' | 'failed';

  @ApiPropertyOptional({ description: 'Notes about the QC checkpoint' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CalculateCostDto {
  @ApiProperty({ description: 'Product ID to calculate cost for' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity to produce' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ReportProgressDto {
  @ApiProperty({ description: 'Quantity produced so far' })
  @IsInt()
  @Min(0)
  quantityProduced: number;

  @ApiPropertyOptional({ description: 'Quantity scrapped' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityScrap?: number;

  @ApiPropertyOptional({ description: 'Notes about progress' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddRoutingStepDto {
  @ApiProperty({ description: 'Product ID this routing step belongs to' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Name of the operation' })
  @IsString()
  @IsNotEmpty()
  operationName: string;

  @ApiPropertyOptional({ description: 'Description of the operation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Sequence order of the operation' })
  @IsInt()
  @Min(0)
  sequenceOrder: number;

  @ApiPropertyOptional({ description: 'Work center name' })
  @IsOptional()
  @IsString()
  workCenter?: string;

  @ApiPropertyOptional({ description: 'Setup time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  setupTimeMinutes?: number;

  @ApiProperty({ description: 'Cycle time in minutes' })
  @IsInt()
  @Min(0)
  cycleTimeMinutes: number;

  @ApiPropertyOptional({ description: 'Labor cost per hour' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCostPerHour?: number;

  @ApiPropertyOptional({ description: 'Overhead cost per hour' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overheadCostPerHour?: number;

  @ApiPropertyOptional({ description: 'Whether this step requires QC' })
  @IsOptional()
  @IsBoolean()
  requiresQC?: boolean;
}