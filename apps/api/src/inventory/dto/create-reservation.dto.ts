import { IsUUID, IsInt, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  storeId!: string;

  @IsString()
  externalOrderId!: string;

  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
