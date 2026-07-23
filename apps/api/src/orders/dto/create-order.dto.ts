import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  // Catalog product line: provide productId.
  @IsOptional()
  @IsString()
  productId?: string;

  // Custom / service line (e.g. photocopy, printout, ad-hoc item):
  // provide name + unitPrice instead of productId.
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  /** Discount amount for this line (Rs). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  /** Billing person (employee). Defaults to the logged-in user. */
  @IsOptional()
  @IsString()
  cashierId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}
