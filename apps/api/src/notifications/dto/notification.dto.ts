import { IsString, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  relatedDocumentType?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  relatedDocumentId?: string;
}

export class MarkReadDto {
  @ApiProperty()
  @IsUUID()
  notificationId: string;
}
