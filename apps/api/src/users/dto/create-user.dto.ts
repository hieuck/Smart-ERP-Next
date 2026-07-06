import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['user', 'admin', 'manager'])
  role?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
