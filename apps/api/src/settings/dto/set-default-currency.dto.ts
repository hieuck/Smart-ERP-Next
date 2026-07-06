import { IsNotEmpty, IsString, Length } from 'class-validator';

export class SetDefaultCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  currency!: string;
}
