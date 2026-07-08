import { IsString, IsNotEmpty, IsNumber, IsIn, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFixedAssetDto {
  @ApiProperty({ description: 'Asset name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Asset category' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Asset status', enum: ['active', 'disposed'] })
  @IsString()
  @IsIn(['active', 'disposed'])
  status!: 'active' | 'disposed';

  @ApiProperty({ description: 'Purchase cost as a numeric string' })
  @IsString()
  @IsNotEmpty()
  purchaseCost!: string;

  @ApiProperty({ description: 'Residual value as a numeric string' })
  @IsString()
  @IsNotEmpty()
  residualValue!: string;

  @ApiProperty({ description: 'Useful life in months' })
  @IsNumber()
  @Min(1)
  usefulLifeMonths!: number;

  @ApiProperty({ description: 'Purchase date (ISO 8601)' })
  @IsDateString()
  purchaseDate!: string;
}
