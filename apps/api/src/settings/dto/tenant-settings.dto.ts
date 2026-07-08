import { IsString, IsOptional, IsObject, IsIn, IsBoolean } from 'class-validator';

export class CompanyInfoDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() taxCode?: string;
  @IsString() @IsOptional() website?: string;
}

export class GeneralSettingsDto {
  @IsString() @IsOptional() language?: string;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() timezone?: string;
  @IsString() @IsOptional() dateFormat?: string;
}

export class NotificationSettingsDto {
  @IsBoolean() @IsOptional() lowStockAlert?: boolean;
  @IsBoolean() @IsOptional() newOrderAlert?: boolean;
  @IsBoolean() @IsOptional() paymentAlert?: boolean;
  @IsBoolean() @IsOptional() emailNotifications?: boolean;
  @IsBoolean() @IsOptional() browserNotifications?: boolean;
}

export class AppearanceSettingsDto {
  @IsString() @IsOptional() theme?: string;
  @IsString() @IsOptional() primaryColor?: string;
}

export class UpdateTenantSettingsDto {
  @IsOptional() @IsObject() company?: CompanyInfoDto;
  @IsOptional() @IsObject() general?: GeneralSettingsDto;
  @IsOptional() @IsObject() notifications?: NotificationSettingsDto;
  @IsOptional() @IsObject() appearance?: AppearanceSettingsDto;
}
