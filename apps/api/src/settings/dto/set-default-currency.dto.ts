import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../supported-currencies';

export class SetDefaultCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;
}
