import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BenchmarkService } from './benchmark.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Controller('admin/benchmarks')
@UseGuards(JwtAuthGuard)
export class BenchmarksController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Get('sync')
  async getSyncBenchmarks(@Req() req: RequestWithUser, @Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.benchmarkService.getStats(req.user.tenantId, hoursNum);
  }

  @Get('sync/timeseries')
  async getSyncTimeseries(@Req() req: RequestWithUser, @Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.benchmarkService.getTimeseries(req.user.tenantId, hoursNum);
  }
}
