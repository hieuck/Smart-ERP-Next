import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SetupCompanyDto {
  @IsString() @IsNotEmpty() name: string;

  @IsString() @IsOptional() address?: string;

  @IsString() @IsOptional() taxCode?: string;

  @IsString() @IsOptional() phone?: string;

  @IsString() @IsNotEmpty() industry: 'retail' | 'fnb' | 'service';
}
