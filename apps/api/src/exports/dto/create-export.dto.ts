import { IsEnum, IsArray, ArrayNotEmpty, IsString, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExportFormat } from '../export.enums';

export class CreateExportDto {
  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  entities: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
