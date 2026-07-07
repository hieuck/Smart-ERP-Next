import { IsString, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApprovalRequestDto {
  @ApiProperty({ enum: ['purchase_order', 'sales_order', 'invoice', 'payment'] })
  @IsString()
  documentType: string;

  @ApiProperty()
  @IsString()
  documentId: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  documentAmount: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  approverIds: string[];
}
