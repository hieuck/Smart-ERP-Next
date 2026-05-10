import { IsInt, Min, IsOptional, IsPositive } from 'class-validator';

export class UpdateReorderPointDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  reorderQuantity?: number;
}
