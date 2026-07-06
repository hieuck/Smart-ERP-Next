import { IsIn, IsString } from 'class-validator';

export class SeedIndustryDto {
  @IsString()
  @IsIn(['retail', 'fnb', 'service'])
  industry: 'retail' | 'fnb' | 'service';
}
