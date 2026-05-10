import {
  IsString, IsOptional, IsUUID, IsNumber, IsIn, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsIn(['receipt', 'payment'])
  type: string; // receipt = phiếu thu, payment = phiếu chi

  @IsOptional()
  @IsIn(['order', 'purchase_order', 'manual'])
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsIn(['customer', 'supplier', 'employee', 'other'])
  partyType?: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(['cash', 'bank_transfer', 'card', 'momo', 'vnpay', 'zalopay', 'credit'])
  method: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
