import { IsString } from 'class-validator';

export class ReservationActionDto {
  @IsString()
  externalOrderId!: string;
}
