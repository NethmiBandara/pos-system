import { InventoryReason } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

export class AdjustInventoryDto {
  @IsString()
  productId!: string;

  @IsInt()
  @NotEquals(0)
  delta!: number;

  @IsEnum(InventoryReason)
  reason!: InventoryReason;

  @IsOptional()
  @IsString()
  note?: string;
}
