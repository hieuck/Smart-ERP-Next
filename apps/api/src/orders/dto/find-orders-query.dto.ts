import { IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from '../../common/dto/pagination-params.dto';

export class FindOrdersQueryDto extends PaginationParamsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}
