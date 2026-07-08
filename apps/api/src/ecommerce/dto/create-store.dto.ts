import { IsString, IsNotEmpty, IsIn, IsObject, IsOptional, IsBoolean } from 'class-validator';

const PLATFORMS = ['shopee', 'lazada', 'tiktokshop', 'amazon', 'ebay', 'woocommerce', 'shopify'] as const;

export class CreateStoreDto {
  @IsString() @IsNotEmpty() @IsIn(PLATFORMS) platform: string;
  @IsString() @IsNotEmpty() name: string;
  @IsObject() configJson: Record<string, any>;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
