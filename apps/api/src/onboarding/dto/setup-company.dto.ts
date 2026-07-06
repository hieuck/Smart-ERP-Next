import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SetupCompanyDto {
  @IsString() @IsNotEmpty() name: string;

  @IsString() @IsOptional() address?: string;

  @IsString() @IsOptional() taxCode?: string;

  @IsString() @IsOptional() phone?: string;

  @IsIn(['retail', 'fnb', 'service'])
  @IsString() @IsNotEmpty()
  industry: 'retail' | 'fnb' | 'service';
}
