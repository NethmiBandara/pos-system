import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentMethod, UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreditService } from './credit.service';

class SettleCreditDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}

@Controller('credit')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get()
  outstanding() {
    return this.creditService.outstanding();
  }

  @Get('settled')
  settled() {
    return this.creditService.settled();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleCreditDto) {
    return this.creditService.settle(id, dto.method);
  }
}
