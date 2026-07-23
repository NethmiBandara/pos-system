import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { DateRangeDto } from './dto/date-range.dto';
import { ReportsService } from './reports.service';

@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reportsService.dashboard();
  }

  @Get('sales')
  sales(@Query() query: DateRangeDto) {
    return this.reportsService.sales(query);
  }
}
