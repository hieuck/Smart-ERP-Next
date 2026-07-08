import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID, IsNumberString, IsInt, Min, Max } from 'class-validator';

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
const DEAL_STATUSES = ['open', 'won', 'lost'] as const;

export class CreateLeadDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() source?: string;
  @IsString() @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @IsNumberString() @IsOptional() estimatedValue?: string;
  @IsInt() @Min(0) @Max(100) @IsOptional() score?: number;
  @IsUUID() @IsOptional() assignedTo?: string;
}

export class UpdateLeadStatusDto {
  @IsString() @IsNotEmpty() @IsIn(LEAD_STATUSES) status: string;
}

export class CreateDealDto {
  @IsString() @IsNotEmpty() title: string;
  @IsUUID() @IsOptional() leadId?: string;
  @IsUUID() @IsOptional() stageId?: string;
  @IsNumberString() @IsOptional() amount?: string;
  @IsString() @IsOptional() currency?: string;
  @IsUUID() @IsOptional() assignedTo?: string;
}

export class UpdateDealStageDto {
  @IsUUID() @IsNotEmpty() stageId: string;
}
