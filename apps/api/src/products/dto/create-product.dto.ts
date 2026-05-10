import { IsString, IsNumber, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(100)
  sku: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  cost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
