import { IsDateString } from 'class-validator';

export class GetQualityReportQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
