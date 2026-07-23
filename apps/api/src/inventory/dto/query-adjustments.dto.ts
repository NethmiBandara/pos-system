import { IsOptional, IsString } from 'class-validator';

export class QueryAdjustmentsDto {
  @IsOptional()
  @IsString()
  productId?: string;
}
