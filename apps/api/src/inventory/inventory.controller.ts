import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { QueryAdjustmentsDto } from './dto/query-adjustments.dto';
import { InventoryService } from './inventory.service';

@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  lowStock() {
    return this.inventoryService.lowStock();
  }

  @Get('adjustments')
  adjustments(@Query() query: QueryAdjustmentsDto) {
    return this.inventoryService.adjustments(query.productId);
  }

  @Post('adjust')
  adjust(
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.adjust(dto, user.id);
  }
}
